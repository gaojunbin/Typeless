import Foundation

enum ShortcutEvent { case flagsChanged, keyDown, keyUp }

struct TapRecognizer {
    private var held = false
    private var candidate = false
    private var began: TimeInterval = 0
    private var lastToggle: TimeInterval = -.infinity

    mutating func reset() { held = false; candidate = false }

    mutating func observe(type: ShortcutEvent, keyCode: Int64, fn: Bool, otherModifier: Bool, repeatKey: Bool = false, time: TimeInterval) -> Bool {
        // Apple defines kVK_Function as 0x3F. Other keys can carry secondaryFn
        // flags; those flags alone must not turn an arrow/F-key into an Fn tap.
        guard keyCode == 0x3F else {
            if held && type != .keyUp { candidate = false }
            return false
        }
        if repeatKey { return false }
        if fn && !held { candidate = !otherModifier; began = time }
        if otherModifier { candidate = false }
        let toggled = !fn && held && candidate && time - began >= 0 && time - began < 2 && time - lastToggle >= 0.25
        held = fn
        if !fn { candidate = false }
        if toggled { lastToggle = time }
        return toggled
    }
}

func runTapSelfTest() -> Bool {
    var tap = TapRecognizer()
    func event(_ type: ShortcutEvent, _ key: Int64, _ fn: Bool, _ time: Double, _ modifiers: Bool = false, _ repeated: Bool = false) -> Bool {
        tap.observe(type: type, keyCode: key, fn: fn, otherModifier: modifiers, repeatKey: repeated, time: time)
    }
    guard !event(.flagsChanged, 63, true, 0), event(.flagsChanged, 63, false, 0.1) else { return false }
    // Duplicate up and rapid double-tap must not immediately stop a new session.
    guard !event(.keyUp, 63, false, 0.11), !event(.flagsChanged, 63, true, 0.15), !event(.flagsChanged, 63, false, 0.2) else { return false }
    // Keyboard-style Fn events use the same flag transition and release rule.
    guard !event(.keyDown, 63, true, 1), !event(.keyDown, 63, true, 1.1, false, true), event(.keyUp, 63, false, 1.2) else { return false }
    guard !event(.flagsChanged, 63, true, 2), !event(.keyDown, 0, true, 2.1), !event(.flagsChanged, 63, false, 2.2) else { return false }
    guard !event(.flagsChanged, 63, true, 3), !event(.flagsChanged, 56, true, 3.1, true), !event(.flagsChanged, 63, false, 3.2) else { return false }
    guard !event(.flagsChanged, 63, true, 4, true), !event(.flagsChanged, 63, false, 4.1) else { return false }
    guard !event(.keyDown, 123, true, 5), !event(.keyUp, 123, false, 5.1) else { return false }
    guard !event(.flagsChanged, 63, true, 6), !event(.flagsChanged, 63, false, 8.1) else { return false }
    guard !event(.flagsChanged, 63, true, 9) else { return false }
    tap.reset()
    guard !event(.flagsChanged, 63, false, 9.1), !event(.flagsChanged, 63, true, 10), event(.flagsChanged, 63, false, 10.1) else { return false }
    return true
}
