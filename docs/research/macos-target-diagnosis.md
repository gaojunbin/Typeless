# macOS dictation target diagnosis

> Historical investigation, superseded by the [0.1.2 copy-first decision](dictation-redesign.md#current-decision-record-anywhere-copy-first). The target-capture requirements, source references, and proposed fixes below describe an earlier implementation. Current recording does not require a captured or editable target; results are copied and optionally pasted into the current foreground application.

Date and official-source access: 2026-09-18. Scope: read-only source inspection and official documentation research. No target application was modified, no permissions were granted, no audio was recorded, no external insertion was attempted, and no credentials, transcripts, or history were read. This report does not establish the user's exact failing application or live AX state. File references describe the source inspected on this date.

## Finding

The reported warning, `No safe original text target is available. Copy the result and paste it manually.`, is produced **before any native insertion request** at `src/core/session.ts:137–138`. It means the session has no captured target, its captured `canInsert` is false, its captured secure flag is true, or the session is practice-only. It is not the native `target_changed` error and does not, by itself, demonstrate that focus was lost during transcription.

For the reported global Fn flow, practice mode defaults to false (`electron/main.ts:31`, `src/core/session.ts:40`). A secure target detected at capture stops the session before microphone capture (`session.ts:57`). Therefore, a normal Fn session that successfully reaches transcription and then this exact warning principally narrows to **capture failure** or **capture-time eligibility rejection**. The existing implementation loses the reason for both cases. The Home screen's local practice option must not be mistaken for the global Fn session's mode.

## Actual path and loss of evidence

| Stage | Source | Behavior and implication |
| --- | --- | --- |
| Recognize Fn | `native/macos/Main.swift:25–47`; `TapRecognizer.swift:10–17` | Listen-only flags/key event tap recognizes an isolated Fn release under two seconds. Chords cancel the candidate. It does not suppress the original OS key event. |
| Begin session | `electron/main.ts:31`; `src/core/session.ts:34–61` | Emits `arming`, requests the original target, then starts capture. Session ID and generation guard late capture responses correctly. |
| Display feedback | `electron/main.ts:129–136` | Arming already makes the overlay visible before the asynchronous target request completes. It uses `showInactive`; the overlay is configured nonfocusable (`main.ts:107`). This ordering is worth removing as a variable, but there is no evidence here that this panel actually steals focus. |
| Find target | `native/macos/Target.swift:19–27,65–79` | Requires helper AX trust and the system-wide focused AX element. No application-specific retry, Chromium accessibility activation, or editable-ancestor resolution exists. |
| Hide native details | `Target.swift:19–21,67`; `electron/native-client.ts:129–144`; `src/core/session.ts:54` | All AX attribute errors become nil. Missing trust and missing focused element share `target_unavailable`. The client preserves a native error code in an Error string, but Sessions catches every capture error and discards it. Helper unavailable and five-second timeout collapse into the same missing target. |
| Classify target | `Target.swift:54–57,79` | Requires exact `AXTextField`/`AXTextArea`, enabled=true, a CFRange selected-text range, not secure, not a terminal, and not the helper parent PID. Only a boolean is returned; rejection reasons are not retained. |
| Process and insert | `src/core/session.ts:108–110,135–146` | Auto-insertion is attempted only when enabled, nonpractice, and without cleanup warning. The generic target warning occurs before `host.insert`. |
| Native validation | `Target.swift:85–94` | Once reached, checks opaque saved token, expiry, epoch, focused element, foreground PID, selection, optional window and secure state. These failures have different messages. |
| Native insertion | `Target.swift:108–133`; `electron/main.ts:70–95` | Direct AX selected-text write first; guarded Cmd+V only on `clipboard_required`. Both dispatch without Return. Main only stages an empty/plain-text clipboard, then conditionally restores its own marker/text after 1.2 seconds. |

Apple documents distinct AX attribute error codes, including unsupported attributes and inability to complete a request. Flattening these into nil prevents distinguishing absent capability from a transient AX failure. [Apple AXUIElementCopyAttributeValue](https://developer.apple.com/documentation/applicationservices/1462085-axuielementcopyattributevalue?changes=_5)

## Capture-time branches that fit the warning

| Branch | Proven implementation behavior | User-specific status |
| --- | --- | --- |
| Accessibility not granted to the effective helper process | `AXIsProcessTrusted()` false makes capture fail; recording still proceeds because Sessions discards the failure. | Possible; not checked against the running user's helper. Fn detection and microphone access do not establish AX trust. |
| Focused AX element absent or query fails | A failed system-wide focus query, wrong value type, or helper timeout leaves no target. There is no bounded retry. | Possible, including a lazy or temporarily unavailable accessibility tree. |
| Valid target rejected as unsupported | Nonmatching role, missing/false enabled, or missing/non-CFRange selected range yields `canInsert=false`. | Concrete compatibility restriction; whether the user's editor meets it is unknown. |
| Parent app or terminal | Matching parent PID or a bundle identifier containing one of six terminal-name substrings yields `canInsert=false`. | Deliberate policy. Bundle/PID was not collected from the user's target. |
| Secure field | Global secure-event-input state or a secure role/subrole blocks recording at capture. | Does not fit successful same-session ASR unless the warning was invoked in another flow. |
| Practice | Explicit practice sessions intentionally have no external target. | Does not fit the normal Fn callback, which supplies no practice flag. |

App identification uses `AXUIElementGetPid` without checking its return code, then `NSRunningApplication`; unknown names become `Unknown application` (`Target.swift:68–79`). The code does not compare the captured PID with the frontmost application until insertion. A future capture diagnostic should distinguish PID failure or mismatch rather than silently classify them.

## Chromium, Electron, and conversation editors

Electron officially documents that its accessibility tree is activated by assistive technology and can be enabled by third-party software using `AXManualAccessibility` on the application's AX element. This is a documented **Electron vendor integration**, not a universal Apple AX attribute contract. The current helper does not implement it. A target-scoped activation attempt followed by a bounded focus-query retry is therefore a justified compatibility repair to evaluate. It must not activate every running application or read page content. [Electron accessibility](https://www.electronjs.org/docs/latest/tutorial/accessibility)

Chromium's official technical overview explains lazy accessibility activation and describes `AXEnhancedUserInterface` as a macOS detection mechanism. This overview uses historical terminology; it supports the existence of lazy activation but does not establish a guaranteed attribute location or behavior for every current Chrome-derived product. Treat this as a Chromium-specific adapter to verify against supported versions, not an undocumented Apple-wide workaround. No activation was performed during this diagnosis. [Chromium accessibility technical documentation](https://www.chromium.org/developers/design-documents/accessibility/)

It would also be incorrect to claim that all contenteditable editors lack AX selection support. Chromium maintains contenteditable selection tests, and an official 2024 revert describes a regression that exposed editable fields as `AXGroup` instead of `AXTextArea`, affecting Gmail and third-party integrations. This historical incident establishes that role mapping is a real compatibility boundary, **not that the regression remains in today's user's app**. [Chromium revert and rationale](https://chromium.googlesource.com/chromium/src/+/00d7b19fabc77cc092af87b77b3f2708984b465c)

The present helper conflates three questions: whether a field is editable, whether its selection can be safely bound, and whether AX text can be written. Direct AX writability is already separated into `writable()`, but **both direct write and guarded paste still require `editable()` with the same narrow role and CFRange checks**. Consequently, clipboard fallback cannot rescue a field rejected at capture. Simply deleting the checks or accepting every AXGroup would risk pasting into an unrelated or noneditable control.

## Later blockers to test separately

These are real restrictions but are not the source of the exact reported warning:

- `Target.swift:101–116` treats unsupported marked-range queries as unknown. With a non-keyboard-layout input source, unknown composition produces `ime_unknown`, even when the selected Chinese input method is idle. This is conservative but can block ordinary Chinese dictation in applications that do not expose that attribute. Selecting Pinyin is not evidence of active composition; an app adapter needs a tested composition signal, with uncertainty reported honestly.
- `Target.swift:35–46,89` increments a global epoch when PID, AX-element hash or selected-range signature changes. A temporary failed AX query becomes `none` and invalidates the target even after recovery. This can cause a later `target_changed` false negative. Do not fix it by accepting a new recipient at completion; distinguish unobservable state from an observed focus/selection change.
- `Target.swift:52` uses the global secure-event-input flag, which does not identify which field requested it. It deliberately errs toward rejection. Do not disable secure-field protection to solve ordinary editor compatibility.
- Readonly AX selected-text targets reach paste fallback only if all eligibility and IME checks passed. Rich clipboard content then causes a different manual-copy message (`electron/main.ts:77`); event-posting permission can also fail separately (`Target.swift:119`).
- The Fn tap is listen-only. An OS action bound to the same physical key is not suppressed; conflict is a test case, not a diagnosed setting in this user session.

## Recommended bounded repair

1. **Preserve a structured capture result before doing paid work.** Return sanitized reason codes such as `accessibility_denied`, `focus_unavailable`, `ax_timeout`, `pid_unavailable`, `unsupported_role`, `selection_unavailable`, `protected_target`, `terminal_target`, and `self_target`, plus method capabilities. Preserve AX error codes. Show a concise copy-only/permission explanation before recording if direct insertion cannot be supported; do not let success at ASR imply insertion readiness. Diagnostics must exclude AXValue, selected text, window titles, URLs and transcript content.
2. **Bind the original target before exposing the panel.** Snapshot the original frontmost PID, query its focus, and, for supported Chromium/Electron targets, request documented vendor accessibility activation with a short bounded retry. Cancel the attempt if foreground PID/window changes. Resolve only the focused node and bounded editable ancestors within that same target; never scan unrelated windows or choose the first textbox in a page.
3. **Separate insertion tiers.** Tier A: same-target direct selected-text write. Tier B: same-target guarded paste when an editor is demonstrably editable but direct AX write is unavailable. A tested adapter may bind a vendor text-marker selection instead of demanding CFRange everywhere. Preserve original PID/window/editor identity and a meaningful selection/composition check. Unknown editor identity or unobservable selection/composition without an adequate alternative remains copy-only. No blanket AXGroup acceptance, focus forcing, new-recipient capture at completion, or unguarded global paste.
4. **Keep transaction safety.** Preserve session/generation checks, helper-owned token, expiry, secure checks, clipboard ownership restoration, single dispatch and no automatic Return. For transient AX failure, use a bounded retry while refusing to insert until the original binding is re-established; an actual observed focus/selection change still invalidates the session. A successful API dispatch is not verified visible text.
5. **Treat the compact overlay as feedback, not the destination.** Capture/readiness failures need a concise actionable state, but successful Fn dictation should remain in the original editor. The current overlay's size/content are reviewed independently in `dictation-implementation-gap.md`; changing its size alone cannot fix this target eligibility failure.

## Required acceptance evidence before claiming repair

Use synthetic local text and mocked provider output first. Actual cross-app insertion should use scoped disposable test fields; it was not performed in this read-only investigation. The existing session unit test mocks `captureTarget` as insertable (`tests/core-session.test.ts:12`), so it cannot prove native editor compatibility.

| Scenario | Required observation |
| --- | --- |
| TextEdit and native plain text field | Fn captures original editor; text inserted once at caret; no Enter or app activation. |
| Chrome input, textarea, nested contenteditable; Electron conversation editor | Test fresh/lazy AX state and existing AX state; record noncontent capability reasons; direct or guarded-paste tier succeeds in supported cases. |
| Chromium role/selection unavailable | Explicit unsupported/readiness reason, no silent successful-recording promise and no arbitrary ancestor/other-field paste. |
| Chinese input method idle versus active composition | Idle supported adapter inserts correctly; active composition safely blocks; no input-source change. |
| Accessibility denied but shortcut available | Pre-recording distinction between working shortcut and unavailable insertion; explicit user permission flow only. |
| Focus changes to another chat/field and back; caret selection changes | Original binding invalidated; no insertion into a new recipient and no silent retargeting. |
| Transient AX timeout | Bounded same-target recovery or explicit copy-only result, never blind insertion. |
| Password, terminal, Typeless itself | Protected/unsupported behavior stays explicit and does not become eligible through fallback. |
| Plain-text versus rich clipboard; user copies during processing | Supported staging restores only its own unchanged clipboard; rich/user-replaced contents preserved. |
| Fn mapped to an OS action; cancellation during capture | No incorrect recipient capture or stale completion; any shortcut conflict explained without changing settings automatically. |

No runtime insertion acceptance is claimed in this report. The strongest current conclusion is a proven diagnostic-loss and compatibility-design defect, with several bounded candidate triggers; the exact target-specific trigger remains unknown until sanitized capture-stage evidence is collected.
