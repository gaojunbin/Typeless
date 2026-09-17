import AppKit
import ApplicationServices

final class PasteRequests {
    static let shared = PasteRequests()
    private let lock = NSLock()
    private var states: [String: String] = [:]

    func cancel(_ id: String) {
        lock.lock(); defer { lock.unlock() }
        if states[id] == nil { states[id] = "cancelled" }
    }
    func check(_ id: String, deadline: Double, consume: Bool = false) throws {
        lock.lock(); defer { lock.unlock() }
        guard UUID(uuidString: id) != nil, deadline.isFinite, deadline <= Date().timeIntervalSince1970 * 1000 + 10000 else { throw HelperError("invalid_request", "A valid paste request is required.") }
        guard Date().timeIntervalSince1970 * 1000 <= deadline else { throw HelperError("request_expired", "The paste request expired before dispatch.") }
        if let state = states[id] { throw HelperError(state, state == "cancelled" ? "Paste was cancelled before dispatch." : "This paste request has already been dispatched.") }
        if consume { states[id] = "already_dispatched" }
    }
}

func currentContext() -> [String: Any] {
    // Context labels never inspect an editor and do not require Accessibility.
    return ["appName": NSWorkspace.shared.frontmostApplication?.localizedName ?? ""]
}

func pasteText(_ params: [String: Any]) throws -> [String: Any] {
    guard let id = params["requestId"] as? String, let deadline = params["deadlineMs"] as? Double,
          let text = params["text"] as? String, !text.isEmpty,
          let owner = params["clipboardOwner"] as? String, !owner.isEmpty else {
        throw HelperError("invalid_request", "Text and clipboard ownership are required for paste.")
    }
    try PasteRequests.shared.check(id, deadline: deadline)
    guard CGPreflightPostEventAccess() else { throw HelperError("permission_required", "Accessibility permission is required to send the paste shortcut.") }
    guard let down = CGEvent(keyboardEventSource: nil, virtualKey: 9, keyDown: true),
          let up = CGEvent(keyboardEventSource: nil, virtualKey: 9, keyDown: false) else {
        throw HelperError("event_unavailable", "The paste shortcut could not be created.")
    }
    let pasteboard = NSPasteboard.general
    guard let data = pasteboard.data(forType: NSPasteboard.PasteboardType("dev.typeless.owner")),
          String(data: data, encoding: .utf8) == owner, pasteboard.string(forType: .string) == text else {
        throw HelperError("clipboard_changed", "The clipboard changed before paste and was left untouched.")
    }
    try PasteRequests.shared.check(id, deadline: deadline, consume: true)
    down.flags = .maskCommand; up.flags = .maskCommand
    down.post(tap: .cgSessionEventTap); up.post(tap: .cgSessionEventTap)
    return ["status": "dispatched"]
}

func runPasteSelfTest() -> Bool {
    let requests = PasteRequests()
    let deadline = Date().timeIntervalSince1970 * 1000 + 5000
    let cancelled = UUID().uuidString
    requests.cancel(cancelled)
    do { try requests.check(cancelled, deadline: deadline); return false } catch let error as HelperError { if error.code != "cancelled" { return false } } catch { return false }
    let sent = UUID().uuidString
    do { try requests.check(sent, deadline: deadline, consume: true) } catch { return false }
    do { try requests.check(sent, deadline: deadline); return false } catch let error as HelperError { if error.code != "already_dispatched" { return false } } catch { return false }
    do { try requests.check(UUID().uuidString, deadline: 0); return false } catch let error as HelperError { return error.code == "request_expired" } catch { return false }
}
