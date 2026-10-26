import CoreAudio
import Foundation

// Mute access to output devices, behind a protocol so the policy self-test never touches real hardware.
protocol AudioOutput {
    func defaultDevice() -> AudioObjectID?
    func canSetMute(_ device: AudioObjectID, _ element: AudioObjectPropertyElement) -> Bool
    func isMuted(_ device: AudioObjectID, _ element: AudioObjectPropertyElement) -> Bool?
    func setMute(_ device: AudioObjectID, _ element: AudioObjectPropertyElement, _ muted: Bool) -> Bool
}

struct CoreAudioOutput: AudioOutput {
    func defaultDevice() -> AudioObjectID? {
        var address = AudioObjectPropertyAddress(mSelector: kAudioHardwarePropertyDefaultOutputDevice, mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
        var device = kAudioObjectUnknown, size = UInt32(MemoryLayout<AudioObjectID>.size)
        guard AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, &device) == noErr, device != kAudioObjectUnknown else { return nil }
        return device
    }
    private func mute(_ element: AudioObjectPropertyElement) -> AudioObjectPropertyAddress {
        AudioObjectPropertyAddress(mSelector: kAudioDevicePropertyMute, mScope: kAudioDevicePropertyScopeOutput, mElement: element)
    }
    func canSetMute(_ device: AudioObjectID, _ element: AudioObjectPropertyElement) -> Bool {
        var address = mute(element), settable: DarwinBoolean = false
        return AudioObjectHasProperty(device, &address) && AudioObjectIsPropertySettable(device, &address, &settable) == noErr && settable.boolValue
    }
    func isMuted(_ device: AudioObjectID, _ element: AudioObjectPropertyElement) -> Bool? {
        var address = mute(element), value: UInt32 = 0, size = UInt32(MemoryLayout<UInt32>.size)
        return AudioObjectGetPropertyData(device, &address, 0, nil, &size, &value) == noErr ? value != 0 : nil
    }
    func setMute(_ device: AudioObjectID, _ element: AudioObjectPropertyElement, _ muted: Bool) -> Bool {
        var address = mute(element), value: UInt32 = muted ? 1 : 0
        return AudioObjectSetPropertyData(device, &address, 0, nil, UInt32(MemoryLayout<UInt32>.size), &value) == noErr
    }
}

// Holds at most one mute this helper applied. Requests run on the main queue while exit paths run on the stdin
// reader thread or a signal source, so the hold sits behind one lock.
final class OutputMute {
    static let shared = OutputMute(CoreAudioOutput())
    private let output: AudioOutput
    private let lock = NSLock()
    private var held: (device: AudioObjectID, elements: [AudioObjectPropertyElement])?
    private var closed = false

    init(_ output: AudioOutput) { self.output = output }

    func mute() -> [String: Any] {
        lock.lock(); defer { lock.unlock() }
        if held != nil { return ["muted": true] }
        guard !closed else { return ["muted": false, "reason": "failed"] }
        guard let device = output.defaultDevice() else { return ["muted": false, "reason": "no_device"] }
        // Devices without a main mute control may still offer one per channel.
        let main = kAudioObjectPropertyElementMain
        let elements: [AudioObjectPropertyElement] = output.canSetMute(device, main) ? [main] : [1, 2].filter { output.canSetMute(device, $0) }
        guard !elements.isEmpty else { return ["muted": false, "reason": "unsupported"] }
        // An unreadable state could not be checked again at restore, so it is never muted.
        let states = elements.map { output.isMuted(device, $0) }
        guard !states.contains(nil) else { return ["muted": false, "reason": "failed"] }
        // Only elements muted here are held, so restore never unmutes one that was already muted.
        let targets = zip(elements, states).filter { $0.1 == false }.map(\.0)
        guard !targets.isEmpty else { return ["muted": false, "reason": "already_muted"] }
        var applied: [AudioObjectPropertyElement] = []
        for element in targets {
            guard output.setMute(device, element, true) else {
                applied.forEach { _ = output.setMute(device, $0, false) }
                return ["muted": false, "reason": "failed"]
            }
            applied.append(element)
        }
        held = (device, targets)
        return ["muted": true]
    }

    func restore() -> [String: Any] {
        lock.lock(); defer { lock.unlock() }
        return ["restored": unmuteHeld()]
    }

    // Exit paths also refuse later mutes, so a request queued behind the exit cannot leave the output muted.
    func close() {
        lock.lock(); defer { lock.unlock() }
        closed = true
        _ = unmuteHeld()
    }

    // A user who unmuted during the recording keeps that choice; a vanished device reads as not muted.
    private func unmuteHeld() -> Bool {
        guard let hold = held else { return false }
        held = nil
        guard hold.elements.allSatisfy({ output.isMuted(hold.device, $0) == true }) else { return false }
        return hold.elements.map { output.setMute(hold.device, $0, false) }.allSatisfy { $0 }
    }
}

private var terminationSources: [DispatchSourceSignal] = []

// SIGTERM is how the client retires a hung helper, so the handler never waits on the main queue and gives the
// restore one second. _exit skips atexit handlers, which could block behind a stuck main thread.
func restoreOutputOnTermination() {
    // Writing to a client that has gone away fails instead of killing the helper before it restores.
    signal(SIGPIPE, SIG_IGN)
    for number in [SIGTERM, SIGINT, SIGHUP] {
        signal(number, SIG_IGN)
        let source = DispatchSource.makeSignalSource(signal: number, queue: .global(qos: .userInitiated))
        source.setEventHandler {
            let restored = DispatchSemaphore(value: 0)
            DispatchQueue.global(qos: .userInitiated).async { OutputMute.shared.close(); restored.signal() }
            _ = restored.wait(timeout: .now() + 1)
            _exit(128 + number)
        }
        source.resume()
        terminationSources.append(source)
    }
}

// Mute state per device and element for the self-test; a missing entry behaves like a vanished device.
final class FakeAudioOutput: AudioOutput {
    var device: AudioObjectID?
    var state: [AudioObjectID: [AudioObjectPropertyElement: Bool]]
    private let settable: Set<AudioObjectPropertyElement>, failing: Set<AudioObjectPropertyElement>
    private(set) var calls = 0, written: [AudioObjectID] = []
    init(_ state: [AudioObjectID: [AudioObjectPropertyElement: Bool]], device: AudioObjectID? = 1,
         settable: Set<AudioObjectPropertyElement> = [kAudioObjectPropertyElementMain], failing: Set<AudioObjectPropertyElement> = []) {
        self.state = state; self.device = device; self.settable = settable; self.failing = failing
    }
    func defaultDevice() -> AudioObjectID? { calls += 1; return device }
    func canSetMute(_ device: AudioObjectID, _ element: AudioObjectPropertyElement) -> Bool { calls += 1; return settable.contains(element) }
    func isMuted(_ device: AudioObjectID, _ element: AudioObjectPropertyElement) -> Bool? { calls += 1; return state[device]?[element] }
    func setMute(_ device: AudioObjectID, _ element: AudioObjectPropertyElement, _ muted: Bool) -> Bool {
        calls += 1
        guard state[device]?[element] != nil, !failing.contains(element) else { return false }
        state[device]?[element] = muted; written.append(device)
        return true
    }
}

func runMuteSelfTest() -> Bool {
    let main = kAudioObjectPropertyElementMain
    let held: [String: Any] = ["muted": true], restored: [String: Any] = ["restored": true], unchanged: [String: Any] = ["restored": false]
    func refused(_ reason: String) -> [String: Any] { ["muted": false, "reason": reason] }
    func same(_ result: [String: Any], _ expected: [String: Any]) -> Bool { NSDictionary(dictionary: result).isEqual(to: expected) }
    // An unmuted device is muted and held, a second mute reads nothing, and restore unmutes it once.
    var output = FakeAudioOutput([1: [main: false]])
    var policy = OutputMute(output)
    guard same(policy.mute(), held), output.state[1]?[main] == true else { return false }
    let calls = output.calls
    guard same(policy.mute(), held), output.calls == calls, same(policy.restore(), restored), output.state[1]?[main] == false,
          same(policy.restore(), unchanged) else { return false }
    // An already muted device is not held, so restore leaves it muted.
    output = FakeAudioOutput([1: [main: true]]); policy = OutputMute(output)
    guard same(policy.mute(), refused("already_muted")), same(policy.restore(), unchanged), output.state[1]?[main] == true, output.written.isEmpty else { return false }
    guard same(OutputMute(FakeAudioOutput([1: [main: false]], settable: [])).mute(), refused("unsupported")),
          same(OutputMute(FakeAudioOutput([:], device: nil)).mute(), refused("no_device")) else { return false }
    // A failed set holds nothing, and channels muted before the failure are unmuted again.
    output = FakeAudioOutput([1: [main: false]], failing: [main]); policy = OutputMute(output)
    guard same(policy.mute(), refused("failed")), output.state[1]?[main] == false, same(policy.restore(), unchanged) else { return false }
    output = FakeAudioOutput([1: [1: false, 2: false]], settable: [1, 2], failing: [2]); policy = OutputMute(output)
    guard same(policy.mute(), refused("failed")), output.state[1] == [1: false, 2: false], same(policy.restore(), unchanged) else { return false }
    // The user unmuted during the recording: restore keeps that and writes nothing.
    output = FakeAudioOutput([1: [main: false]]); policy = OutputMute(output)
    guard same(policy.mute(), held) else { return false }
    output.state[1]?[main] = false
    let writes = output.written.count
    guard same(policy.restore(), unchanged), output.written.count == writes else { return false }
    // Restore targets the held device after the default changed; a device that vanished is left as it is.
    output = FakeAudioOutput([1: [main: false], 2: [main: false]]); policy = OutputMute(output)
    guard same(policy.mute(), held) else { return false }
    output.device = 2
    guard same(policy.restore(), restored), output.state[1]?[main] == false, !output.written.contains(2),
          same(policy.mute(), held), output.state[2]?[main] == true else { return false }
    output.state[2] = nil
    guard same(policy.restore(), unchanged) else { return false }
    // Without a main mute control the channels are used, and only channels muted here are restored.
    output = FakeAudioOutput([1: [1: false, 2: false]], settable: [1, 2]); policy = OutputMute(output)
    guard same(policy.mute(), held), output.state[1] == [1: true, 2: true], same(policy.restore(), restored), output.state[1] == [1: false, 2: false] else { return false }
    output = FakeAudioOutput([1: [1: true, 2: false]], settable: [1, 2]); policy = OutputMute(output)
    guard same(policy.mute(), held), output.state[1] == [1: true, 2: true], same(policy.restore(), restored), output.state[1] == [1: true, 2: false] else { return false }
    // Closing for exit restores the hold and refuses later mutes.
    output = FakeAudioOutput([1: [main: false]]); policy = OutputMute(output)
    guard same(policy.mute(), held) else { return false }
    policy.close()
    return output.state[1]?[main] == false && same(policy.mute(), refused("failed")) && output.state[1]?[main] == false
}
