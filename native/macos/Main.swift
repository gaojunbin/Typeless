import AppKit
import ApplicationServices

struct HelperError: Error {
    let code: String
    let message: String
    init(_ code: String, _ message: String) { self.code = code; self.message = message }
}
func emit(_ value: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]), let string = String(data: data, encoding: .utf8) else { return }
    FileHandle.standardOutput.write(Data((string + "\n").utf8))
}
final class ShortcutMonitor {
    var binding = "fn"
    private var tap: CFMachPort?
    private var source: CFRunLoopSource?
    private var recognizer = TapRecognizer()
    private(set) var reason = "starting"
    private(set) var fnTransitions = 0
    private(set) var activations = 0
    private var previousFn = false
    private var staleReconciles = 0
    private let restartOnStale = ProcessInfo.processInfo.environment["TYPELESS_HELPER_RESTART_ON_STALE"] == "1"
    private static let staleReasons = ["tap_creation_failed", "tap_disabled", "runloop_source_failed"]
    var enabled: Bool {
        guard let tap, let source else { return false }
        return CFMachPortIsValid(tap) && CFRunLoopSourceIsValid(source) && CGEvent.tapIsEnabled(tap: tap)
    }
    private func clear() {
        recognizer.reset(); previousFn = false
        if let source { CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes); CFRunLoopSourceInvalidate(source) }
        if let tap { CGEvent.tapEnable(tap: tap, enable: false); CFMachPortInvalidate(tap) }
        source = nil; tap = nil
    }
    func configure(_ value: String) {
        binding = value; recognizer.reset(); previousFn = false
        reconcile()
    }
    func reconcile() {
        applyTapState()
        trackStaleTap()
    }
    /// A tap that keeps failing while this process is authorized is stale: only a fresh process recovers it.
    private func trackStaleTap() {
        let authorized = CGPreflightListenEventAccess() || AXIsProcessTrusted()
        guard authorized, ShortcutMonitor.staleReasons.contains(reason) else { staleReconciles = 0; return }
        staleReconciles += 1
        guard staleReconciles >= 3, restartOnStale else { return }
        emit(["event": "stale", "params": ["reason": reason]])
        exit(3)
    }
    private func applyTapState() {
        guard binding == "fn" else { clear(); reason = "disabled"; return }
        guard CGPreflightListenEventAccess() || AXIsProcessTrusted() else { clear(); reason = "input_monitoring_denied"; return }
        if enabled { reason = "ready"; return }
        if let tap, let source, CFMachPortIsValid(tap), CFRunLoopSourceIsValid(source) {
            recognizer.reset(); previousFn = false
            CGEvent.tapEnable(tap: tap, enable: true)
            if enabled { reason = "ready"; return }
        }
        clear()
        let mask = (1 << CGEventType.flagsChanged.rawValue) | (1 << CGEventType.keyDown.rawValue) | (1 << CGEventType.keyUp.rawValue)
        guard let created = CGEvent.tapCreate(tap: .cgSessionEventTap, place: .headInsertEventTap, options: .listenOnly, eventsOfInterest: CGEventMask(mask), callback: { _, type, event, pointer in
            guard let pointer else { return Unmanaged.passUnretained(event) }
            Unmanaged<ShortcutMonitor>.fromOpaque(pointer).takeUnretainedValue().handle(type, event)
            return Unmanaged.passUnretained(event)
        }, userInfo: Unmanaged.passUnretained(self).toOpaque()) else { reason = "tap_creation_failed"; return }
        guard let runSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, created, 0) else {
            CFMachPortInvalidate(created); reason = "runloop_source_failed"; return
        }
        tap = created; source = runSource
        CFRunLoopAddSource(CFRunLoopGetMain(), runSource, .commonModes)
        CGEvent.tapEnable(tap: created, enable: true)
        reason = enabled ? "ready" : "tap_disabled"
    }
    func status() -> [String: Any] {
        reconcile()
        return ["platform": "darwin", "accessibility": AXIsProcessTrusted(), "inputMonitoring": CGPreflightListenEventAccess(),
                "shortcutAvailable": binding == "fn" && enabled, "binding": binding, "tapEnabled": enabled, "shortcutReason": reason,
                "fnTransitions": fnTransitions, "shortcutActivations": activations, "helperPid": ProcessInfo.processInfo.processIdentifier]
    }
    #if NATIVE_TESTS
    func healthSelfTest() -> [String: Any] {
        guard CGPreflightListenEventAccess() || AXIsProcessTrusted() else { return ["selfTest": "tap-recovery", "status": "blocked", "reason": "input_monitoring_denied"] }
        reconcile()
        guard enabled, let initial = tap else { return ["selfTest": "tap-recovery", "status": "failed", "reason": reason] }
        CGEvent.tapEnable(tap: initial, enable: false)
        let disabledDetected = !enabled
        reconcile()
        let recoveredDisabled = enabled
        if let tap { CFMachPortInvalidate(tap) }
        let invalidDetected = !enabled
        reconcile()
        let recreated = enabled
        configure("disabled")
        let bindingDisabled = !enabled
        configure("fn")
        let bindingRecovered = enabled
        clear()
        return ["selfTest": "tap-recovery", "passed": disabledDetected && recoveredDisabled && invalidDetected && recreated && bindingDisabled && bindingRecovered,
                "disabledDetected": disabledDetected, "recoveredDisabled": recoveredDisabled, "invalidDetected": invalidDetected,
                "recreated": recreated, "bindingDisabled": bindingDisabled, "bindingRecovered": bindingRecovered, "postedEvents": 0]
    }
    #endif
    func handle(_ type: CGEventType, _ event: CGEvent) {
        if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
            recognizer.reset(); previousFn = false; reason = "tap_disabled"
            // Reconcile outside the callback so a failed port can be replaced safely.
            DispatchQueue.main.async { self.reconcile() }
            return
        }
        guard binding == "fn" else { return }
        let kind: ShortcutEvent
        switch type { case .flagsChanged: kind = .flagsChanged; case .keyDown: kind = .keyDown; case .keyUp: kind = .keyUp; default: return }
        let code = event.getIntegerValueField(.keyboardEventKeycode)
        let fn = event.flags.contains(.maskSecondaryFn)
        if code == 0x3F && fn != previousFn { fnTransitions += 1; previousFn = fn }
        let other = !event.flags.intersection([.maskCommand, .maskControl, .maskAlternate, .maskShift]).isEmpty
        if recognizer.observe(type: kind, keyCode: code, fn: fn, otherModifier: other,
                              repeatKey: type == .keyDown && event.getIntegerValueField(.keyboardEventAutorepeat) != 0, time: ProcessInfo.processInfo.systemUptime) {
            activations += 1
            emit(["event": "shortcut", "params": ["action": "toggle"]])
        }
    }
}
@main
struct NativeHelper {
    static func main() {
        if CommandLine.arguments.contains("--self-test") {
            let passed = runTapSelfTest() && runPasteSelfTest()
            emit(["selfTest": "shortcut-and-paste-policy", "passed": passed])
            exit(passed ? 0 : 1)
        }
        let application = NSApplication.shared
        application.setActivationPolicy(.prohibited)
        let shortcuts = ShortcutMonitor()
        #if NATIVE_TESTS
        if CommandLine.arguments.contains("--self-test-tap-recovery") {
            let result = shortcuts.healthSelfTest()
            emit(result)
            exit(result["passed"] as? Bool == true ? 0 : 2)
        }
        #endif
        shortcuts.reconcile()
        let healthTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { _ in shortcuts.reconcile() }
        RunLoop.main.add(healthTimer, forMode: .common)
        emit(["event": "ready", "params": ["platform": "darwin"]])
        DispatchQueue.global(qos: .utility).async {
            while let line = readLine() {
                guard line.utf8.count < 1_000_000, let data = line.data(using: .utf8), let request = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { continue }
                if request["method"] as? String == "cancelPaste",
                   let params = request["params"] as? [String: Any], let requestID = params["requestId"] as? String {
                    PasteRequests.shared.cancel(requestID)
                }
                DispatchQueue.main.async {
                    let id = request["id"] ?? NSNull()
                    let params = request["params"] as? [String: Any] ?? [:]
                    do {
                        var result: [String: Any] = [:]
                        switch request["method"] as? String {
                        case "status": result = shortcuts.status()
                        case "requestPermissions":
                            let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
                            _ = AXIsProcessTrustedWithOptions(options)
                            _ = CGRequestListenEventAccess()
                            result = shortcuts.status()
                        case "configureShortcut":
                            guard let binding = params["binding"] as? String, ["fn", "disabled"].contains(binding) else { throw HelperError("unsupported_shortcut", "Use Fn or a shortcut registered by the application.") }
                            shortcuts.configure(binding)
                            result = ["binding": binding, "available": binding == "disabled" || shortcuts.enabled]
                        case "context": result = currentContext()
                        case "cancelPaste": result = ["cancelled": true]
                        case "pasteText": result = try pasteText(params)
                        case "stop": emit(["id": id, "result": ["stopped": true]]); exit(0)
                        default: throw HelperError("unknown_method", "Unknown native method.")
                        }
                        emit(["id": id, "result": result])
                    } catch let error as HelperError { emit(["id": id, "error": ["code": error.code, "message": error.message]]) }
                    catch { emit(["id": id, "error": ["code": "native_error", "message": "The native operation failed."]]) }
                }
            }
            DispatchQueue.main.async { exit(0) }
        }
        application.run()
    }
}
