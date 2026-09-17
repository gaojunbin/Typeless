# Typeless desktop dictation flow: evidence and requested behavior

Research date: 2026-09-18. Public official documentation and an official embedded demonstration were inspected. No vendor application was installed or exercised; no account, microphone, permission change, real text insertion, or paid service was used. This document refines the interaction scope in `typeless-product.md`; its earlier proposal for a recording timer and multiple always-visible controls is not a fidelity requirement.

## Current documented workflow

The current [Dictate guide](https://www.typeless.com/help/quickstart/dictate) specifies: focus the destination text field, tap the shortcut once, wait for the interaction sound or Voice bar, speak, and tap again. The result appears where dictation began. Defaults are Fn on macOS and Right Alt on Windows. This is toggle behavior, not a documented hold-to-talk default.

The [installation guide](https://www.typeless.com/help/installation-and-setup) associates macOS Accessibility permission with inserting text into the active field. The [FAQ](https://www.typeless.com/help/faqs) describes shortcut use without switching applications. Neither establishes the native window class, activation policy, focus API, target identity checks, clipboard mechanism, or behavior after the user changes focus. Automatic insertion is not automatic message submission.

Historical qualification: [macOS v0.9.0 release guidance, December 24, 2025](https://www.typeless.com/help/release-notes/macos/personalized-smarter) describes holding the hotkey for selected-text commands. That older, different workflow does not override current Dictate instructions or establish whether both gestures coexist today. Current [Settings guidance](https://www.typeless.com/help/quickstart/settings) documents configurable shortcuts and interaction sounds, but no hold/toggle mode selector was established by this review.

## Official visual evidence

The Dictate guide directly embeds [desktop-dictate-polished-writing.mp4](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-dictate-polished-writing.mp4). Its [poster](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-dictate-polished-writing--poster.webp) is also public. Downloaded video metadata: 1440 × 960, 30 fps, 6.524 seconds. This is a vendor demonstration, visibly edited with explanatory blue speech text; it is not our firsthand native-app test or a latency benchmark. Treat the blue speech block as demonstration presentation, not verified runtime UI.

| Exact extracted timestamp | Visible demonstration state |
|---|---|
| 0.0 s | Empty Notes field; no Voice bar. |
| 2.0 s | Bottom-center black capsule: left cross, central white waveform, right check. Notes remains visible behind it. |
| 4.4 s | Capsule still has controls; waveform is nearly flat. |
| 5.0 s | Shorter capsule shows “Thinking”; the background sweeps from black to gray. |
| 6.2 s | Formatted text and caret appear in Notes; capsule is gone. No result card is shown. |

Estimated video-frame geometry at 2.0 s: capsule approximately 160 × 48 pixels, centered near x=720, lower edge approximately 12 pixels above the frame bottom. At 5.0 s it is approximately 128 × 48. These are image measurements, **not native points or implementation dimensions**; scale factor and editing transformations are unknown. No processing-duration guarantee follows from this accelerated example.

## Minimal interaction contract

The right column is the user's requested implementation, not a claim about the vendor.

| State | Evidence boundary | Requested implementation |
|---|---|---|
| Idle | Official workflow starts in the destination field. | No floating card or bar. Do not open or focus the application window. |
| Starting | Guide says to wait for sound/bar before speaking; exact readiness delay is unspecified. | Preserve target focus; do not claim recording until capture is ready. |
| Recording | Small bottom-center waveform capsule is demonstrated; it also contains cross/check controls. | Tiny waveform only. Omit text, timer, status card and extra buttons in normal flow. |
| Processing after the second tap | Demonstration has a compact “Thinking” capsule with an animated sweep. | Replace waveform with loading animation only; omit status text. This intentionally simplifies the demonstrated vendor design. |
| Successful insertion | Guide promises original-field delivery; demonstration removes the bar after output appears. | Insert automatically into the original valid target, then hide the bar. No copy/confirm step, result card or automatic Send/Enter. |
| Error or unsafe target | Exact vendor overlay behavior is not established. | Keep recovery separate from the normal waveform/loading flow; preserve recoverable text and avoid insertion into a different destination. Recovery presentation remains a product decision. |

Focus preservation and non-activation are implementation requirements inferred from the user's desired uninterrupted workflow, not proof that the vendor uses any particular OS API. Successful insertion must be verified in an actual target field; an internal ready state, copied clipboard text, or hidden overlay does not establish delivery.

## Recovery evidence and unresolved details

The official [missing-transcript article](https://www.typeless.com/help/troubleshooting/missing-transcript) mentions accidentally closing a card and retrieving recent output from History. It does not identify the circumstances that create that card, so it does not justify showing one after every successful dictation. The [History guide](https://www.typeless.com/help/quickstart/history-and-dictionary) documents copying transcripts and retrying failed requests with the same audio. These are recovery paths, not the documented ordinary start/stop loop.

Public material reviewed here does not resolve: exact bar show/hide thresholds; cancellation semantics; failure overlay layout; unsupported editors; focus changes during processing; target-window closure; cursor/selection changes; multiple displays; Spaces/full-screen placement; permissions lost mid-session; clipboard restoration; native activation behavior; or insertion acknowledgment. The visual sample does not isolate separate ASR and rewriting phases. None of these should be represented as verified vendor internals.

## Local evidence artifacts and reproduction

Artifacts are under `.local/research-typeless/` and are research outputs, not shipping assets:

- `desktop-dictate.mp4`: downloaded official demonstration.
- `frame-0.0.png`, `frame-1.2.png`, `frame-1.4.png`, `frame-2.0.png`, `frame-4.2.png`, `frame-4.4.png`, `frame-4.6.png`, `frame-5.0.png`, `frame-6.0.png`, `frame-6.2.png`: timestamped full frames.
- `bar-contact.png`: enlarged bottom crop sampled at 5 fps; use for animation shape, not exact transition timing because the fps filter selects neighboring frames.
- `dictate-contact.png`: 1 fps overview; same sampling qualification.
- `dictate.html` and `home.html`: public page HTML used to locate the embedded official asset.

Example exact-frame extraction, from the project directory:

```sh
ffmpeg -y -v error -ss 5.0 -i .local/research-typeless/desktop-dictate.mp4 -frames:v 1 .local/research-typeless/frame-5.0.png
```

The command takes the downloaded official video and writes the selected image. Asset timestamps locate evidence in the demonstration; they are not measured real-world performance.
