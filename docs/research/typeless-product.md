# Typeless product research and replication scope

Research date: 2026-09-17. Scope: public-source research only. No Typeless installation, account login, native-app inspection, benchmark, or firsthand dictation test was performed. The proposed product must launch on macOS and Windows together; mobile is reference material, not launch scope.

## Evidence interpretation

**Documented** means the vendor currently documents a behavior, not that we verified execution. **Claimed** means marketing or privacy language without independent validation. **Reported** means another person's experience, with its date and limitations. **Proposed** means our design decision, not an existing Typeless feature. Source IDs resolve to direct links and access dates in the evidence ledger.

Typeless is a polished-writing input workflow, not just a transcript viewer. Its current official desktop guide explicitly describes a toggle: focus a field, press the shortcut, wait for a sound or Voice bar, speak, press again, and receive output in the original field. The documented defaults are **Fn on macOS and Right Alt on Windows**. [T01]

The user's requested first-tap/second-tap behavior therefore matches current documentation. Hold-to-talk appears in experience reports, but the reviewed current official guide does not establish whether both modes coexist or the release in which behavior changed. Do not silently implement hold-to-talk as the default. Do not promise universal Windows Fn support: no reviewed vendor source establishes it. [T01, I03]

## Feature, evidence, and replication matrix

All replication entries are proposals. P0 means both desktop platforms' initial usable release; P1 means a subsequent enhancement after the core acceptance gates pass.

| Capability | Typeless evidence and confidence | Replicate or improve | Acceptance focus |
|---|---|---|---|
| Global toggle dictation | Documented start/stop shortcut and original-field delivery. [T01] | P0: macOS Fn; Windows configurable observable key with Right Alt default. Preserve two-tap semantics on both. | One tap starts, release does not stop, next tap finalizes exactly once. |
| Hold-to-talk | Older user report describes hold/release and also toggle; official current guide only specifies toggle. [I03, T01] | Optional later mode, clearly distinct from toggle. | No accidental finalization from key repeat or mixed gestures. |
| Capture feedback | Interaction sound and Voice bar are documented. [T01] | P0: visible recording timer, input level, stop/cancel, and distinct processing/failure states. | Never display recording when microphone capture failed. |
| Cross-app insertion | Vendor says Accessibility enables macOS insertion; all-app claims are not compatibility tests. [T02] | P0: original-target tracking, safe insertion and manual-copy fallback. | Focus changes never send content to a different recipient; no auto-send. |
| Cleanup | Claimed removal of fillers/repetition, interpretation of self-correction, list formatting. [T03] | P0: conservative cleanup with raw transcript recovery. | Keep facts, qualifiers, negation, numbers, identifiers, and intended final correction. |
| Tone and structure | Vendor claims style adaptation by app and writing habit. [T03] | P0: selectable cleanup strength; P1: editable per-app profiles. | A chat stays a chat; a list is not turned into an essay. |
| Language switching | Vendor claims automatic detection and mixed-language support for 100+ languages. [T03] Regional variants documented separately. [T01] | P0: Chinese/English mixed speech tests; explicit input-language override and regional output preferences. | Preserve English technical terms inside Chinese sentences. Do not inherit a 100-language promise from another product. |
| Dictionary | Manual additions, CSV import, search/edit/delete, and correction-derived Auto-added entries are documented. [T04] | P0: editable terms and scoped replacements; P1: reviewable correction suggestions and CSV import/export. | Terms remain visible and deletable; unrelated words are not globally replaced. |
| Personalization | Documented abstract writing-pattern learning, progress report and disabling control. [T05] | P0: explicit preferences; P1: visible suggested memories with provenance, scope, expiry and approval. | Disabling learning stops new proposals; deleting memory stops its future use. |
| Custom instructions | No free-form global instruction editor was verified in reviewed official guides. | Proposed P0 improvement: editable global and per-app instructions, with preview and reset. | Instructions change style without authorizing invented facts or executable actions. |
| Translation | Separate mode, multiple target languages, Voice-bar target picker documented. [T06] | P1: explicit translation mode and fixed target, never silent translation during dictation. | Output language follows mode; names/numbers remain faithful. |
| Voice editing | Desktop Ask anything can replace selected editable text; questions on selected text preserve the selection. [T07] | P1: selection-bound editing with before/after preview and undo. | Replacement cannot affect a changed selection or wrong window. |
| General assistant | Official guide offers web answers in a pop-up and opening search-result pages. [T07] | Defer beyond dictation scope. | Avoid making arbitrary spoken text an action command. |
| History/retry | Filters, copy, feedback and retry using the same audio are documented. [T04] Retention-period deletion appears in troubleshooting. [T08] | P0: local raw/final text and failed-job recovery under explicit retention; expose audio retention separately. | Retry does not double-insert; disabling history is honored. |
| Duration limit | Vendor guide specifies nine minutes, warning at eight, then History saving. [T09] | P0: show a provider-aware cap and warning; do not assume MiMo shares this limit. | Audio at the limit is recoverable and never silently discarded. |
| Microphone/settings | Input selection, test meter, custom/multiple shortcuts, sound and mute options documented. [T10] | P0: device selection, test meter, shortcut test, launch behavior and permission status. | Device removal and hotkey conflicts yield actionable errors. |
| Quiet speech | Whisper mode appears on the pricing page; no measured quality established. [T11] | P1 evaluation target, not a launch accuracy promise. | Evaluate actual microphones/noise with consented test samples. |
| Privacy | Cloud processing, local history by default, optional history sync and feedback exceptions documented. [T12, T13] | P0: transparent provider destinations, separate context/history/memory controls, no background content capture. | Payload inspection and deletion tests substantiate our own claims. |

## Desktop interaction and platform parity

| Action | Documented macOS default | Documented Windows default | Proposal |
|---|---|---|---|
| Dictate start/finish | Fn | Right Alt | Same toggle state machine on both platforms. [T01] |
| Translate start | Fn + Left Shift | Right Alt + Right Shift | Separate explicit mode, optional P1. [T06] |
| Ask anything start | Fn + Space | Right Alt + Space | Selection editing before general assistant work. [T07] |
| Finish Translate / Ask anything | Main dictation shortcut | Main dictation shortcut | Consistent finish gesture. [T06, T07] |

Custom shortcut recording and extra shortcuts for external keyboards are documented. [T10] This does not prove every hardware Fn key can be observed on Windows. Make the Windows key-detection test part of onboarding; the architecture report must establish hardware and OS limits independently.

The vendor documents macOS Accessibility and Microphone authorization, account sign-in via Google/Apple/email, microphone testing, and guided feature examples. [T02] Windows microphone troubleshooting includes permission, input-selection and exclusive-device conflicts. [T14] These are product support observations, not proof of the internal insertion implementation on either platform.

**Product-model inference:** The documented desktop flow is a global shortcut and overlay operating on another app's existing text field. This supports reproducing the experience with a native desktop dictation helper; it does not establish that Typeless implements a registered OS input method. The mobile keyboard should not be used as evidence of a desktop IME architecture. [T01, T02]

Proposed onboarding: explain the cloud audio/text path; enter ASR and cleanup provider configuration; validate connectivity; check native permissions; test microphone; record and test a supported shortcut; run a harmless self-correction example in an internal practice field; demonstrate recovery; let users choose history and memory behavior. No account or cloud sync is needed for the initial bring-your-own-key product.

Settings should have one configuration surface with General, Shortcuts, Audio, Providers, Languages, Writing, Dictionary, Memory, and Privacy views. Their storage should remain one configuration entry point rather than unrelated files. Use the user's preferred light visual style. The Typeless settings guide also documents UI language, appearance, login launch, Dock visibility, interaction sounds and muting other audio; these are conveniences, not prerequisites to core transcription quality. [T10]

## What personalization does and does not establish

Typeless says it learns general writing patterns, exposes a progress report, and can stop learning and return to non-personalized phrasing. [T05] This does **not** document unrestricted autobiographical memory, a user-editable prompt database, per-memory approval, or the storage implementation. Dictionary correction learning is separately documented. [T04]

Our improvement should separate three concepts: dictionary terms for recognition, explicit writing preferences for output, and optional correction-derived suggestions. Every suggested rule needs a human-readable example, source session, scope and delete control. Keep pending suggestions from changing output until accepted. Never treat names or facts from arbitrary dictation as permanent knowledge automatically. A progress percentage is less useful than showing exactly what will influence the next result.

## Privacy evidence and unresolved tensions

The current Data Controls page says audio/context are processed in the cloud and discarded after response, partners have zero-retention arrangements, ordinary dictation is not used for training, and history is local unless optional sync is enabled. This is vendor policy, not an audit we performed. [T12]

The privacy policy dated August 25, 2026 explicitly allows stored history text when sync is enabled and content sharing through feedback/corrections with consent. Disabling sync is said to remove that cloud text. [T13] Consequently, a blanket statement that Typeless never stores any content would omit important exceptions. The personalization guide's broad no-content-storage wording should be read alongside the newer, more specific policy. [T05, T13]

History can retry the same audio, yet the public guides reviewed do not specify that local audio's retention, encryption or deletion lifecycle. [T04] Older missing-transcript guidance says all transcripts are local, while the current policy allows optional sync. [T08, T13] Treat this as documentation that needs version/context reconciliation, not evidence of policy violation.

For our product, BYOK is not equivalent to local processing or zero retention. The selected ASR and text providers determine external handling. Show each destination and exactly which audio/text/context fields leave the device. Default to no raw audio retention after completion, history off or explicitly chosen during setup, no sync, and opt-in minimal context. Failed-job retention must have a visible expiry and delete action.

## Independent experience reports

| Source | What was actually reported | Evidence limits and design implication |
|---|---|---|
| JR Raphael, Computerworld, January 28, 2026 [I01] | Hands-on Android examples show list/email formatting, self-correction and filler cleanup. The author highlights the absence of a normal typing keyboard and the need to switch back for manual edits. | Specific examples and screenshots are stronger than generic endorsements, but are not controlled benchmarks or desktop tests. Later article update favors another Android product. Keep manual editing/recovery easy. |
| Leo Labs, March 30, 2026 [I02] | Author reports 40 days of use, Chinese/English mixing and dictionary learning, with screenshots and a sample output. Also raises concerns about locally retained context. | Personal workflow, no controlled baseline. Do not adopt their database/implementation assertions as technical evidence. Use the privacy concern to justify inspecting our own payloads and retention. |
| Naoyuki Kubo, February 7 article with June/July 2026 updates [I03] | Reports useful long-form composition and selected-text questions; describes both hold/release and tap/tap Fn usage. Reports interference while using another dictation tool. | Referral incentive disclosed; chronology mixes older and newer usage. Hotkey coexistence and both gestures require hands-on validation; do not infer a universal conflict. |

These sources support testing priorities, not claims that we personally confirmed latency, accuracy, confidentiality or reliability. Competitor-authored SEO comparisons and unverified mirror domains were not used to establish technical behavior. The official linked domain is `www.typeless.com`; similarly named sites are not assumed to be the vendor.

## Platforms, cost and release evidence

On 2026-09-17, the official downloads page offers macOS, Windows, iOS and Android. [T15] The official pricing page lists Free at 8,000 words/week; Pro at USD 12/member/month billed yearly (USD 144/year) or USD 30 monthly; Enterprise uses sales-led pricing. Pro adds unlimited words, enhanced accuracy, priority access, history cloud sync and team capabilities. These are vendor plan distinctions, not measured accuracy tiers. Taxes, local-store differences and promotions are unverified. [T11]

The public macOS and Windows release-note URLs were opened, but the retrieved pages contained headings without dated release entries. No current desktop version, latest change date, supported minimum OS, or exact feature-release chronology can be responsibly inferred from those results. [T16, T17] Treat these as follow-up verification items, not as absent product features. Do not reuse older review quotas or trial terms as current pricing.

## Proposed replication priorities and hands-on validation backlog

1. Deliver the whole dependable loop on **both** desktop platforms: toggle, capture, MiMo ASR, configurable cleanup, target-safe insertion, fallback and cancellation.
2. Prove semantic preservation before stronger rewriting: negation, numbers, acronyms, Chinese/English mixing, explicit self-correction and quoted instructions.
3. Expose dictionary, writing instructions and memory as inspectable controls; improve transparency rather than reproducing an opaque personalization score.
4. Add translation and selection editing after reliable dictation; keep general web actions outside the initial scope.
5. Validate actual Typeless behavior only in a separately authorized hands-on phase: hold/toggle coexistence, focus changes, unsupported fields, clipboard effects, current Windows behavior, local audio/history controls, memory reset/export and current versions.

### Behavior fixtures for the proposed product

The following are original test-design examples, not Typeless benchmark results.

| Input or situation | Required output or behavior |
|---|---|
| “Book it for Tuesday, sorry, Thursday.” | Keep Thursday; remove the superseded day. |
| “We should not deploy today.” | Preserve negation even under aggressive cleanup. |
| “The price is fifteen, no, fifty dollars.” | Keep the final amount without guessing another currency. |
| “Tell them exactly: um, I am not sure.” | Preserve explicitly quoted wording rather than treating every filler as removable. |
| Chinese sentence containing `Codex`, a project acronym and a file path | Preserve the technical tokens; avoid translating or correcting identifiers without evidence. |
| “First check the logs, second restart the worker.” | Produce a short ordered list when structure is clear. |
| Quiet speech followed by a long thinking pause | Keep the session under user control; do not finalize merely because the user pauses. |
| User switches from a private message to a public channel during processing | Hold the result for explicit recovery rather than inserting into the new destination. |
| Text processor times out after successful recognition | Preserve the raw transcript and offer a visible retry or use-raw action. |
| Dictionary correction is proposed from an ambiguous edit | Keep it pending and show its scope; do not silently learn a global rule. |

### Unverified questions that affect fidelity

- Does the current desktop version support both hold-to-talk and toggle, and how does it distinguish them?
- What exact minimum OS and CPU requirements apply to the current macOS and Windows downloads?
- Can Windows Fn be selected on any supported keyboards, and which hardware cannot expose it?
- What happens if the original target closes, becomes read-only, or changes selection while processing?
- Is insertion transactional and undoable in browser editors, terminals and rich-text applications?
- Does desktop History allow raw-versus-cleaned comparison, bulk export and immediate deletion?
- Where is retry audio retained, for how long, and is it removed when history is disabled?
- Can users reset/export personalization, inspect individual learned rules or control collection per app?
- Are application-specific tones editable or only inferred?
- What does “enhanced accuracy” change technically, and how is it measured?

The reviewed public material does not answer these sufficiently. They are validation questions, not missing-feature claims.

## Evidence ledger

Every source below was accessed on **2026-09-17**. Publication dates are stated only when visible; an access date does not establish when a feature shipped.

| ID | Direct source | Type / evidence scope |
|---|---|---|
| T01 | [Dictate guide](https://www.typeless.com/help/quickstart/dictate) | Official workflow, shortcuts and regional variants. |
| T02 | [Installation and setup](https://www.typeless.com/help/installation-and-setup) | Official macOS onboarding and permission purpose. |
| T03 | [Product homepage](https://www.typeless.com/) | Vendor cleanup, formatting, language and tone claims. |
| T04 | [History and Dictionary](https://www.typeless.com/help/quickstart/history-and-dictionary) | Official history/retry and dictionary operations. |
| T05 | [Personalization](https://www.typeless.com/help/quickstart/personalization) | Vendor explanation and disable control; no internal architecture proof. |
| T06 | [Translate guide](https://www.typeless.com/help/quickstart/translate) | Official translation modes and desktop shortcuts. |
| T07 | [Ask anything guide](https://www.typeless.com/help/quickstart/ask-anything) | Official desktop editing, answers and search actions. |
| T08 | [Missing transcript](https://www.typeless.com/help/troubleshooting/missing-transcript) | Official retention-period recovery; broad local-only wording predates or omits sync context. |
| T09 | [Dictation limit](https://www.typeless.com/help/troubleshooting/dictation-limit) | Official nine-minute cap and countdown. |
| T10 | [Settings](https://www.typeless.com/help/quickstart/settings) | Official shortcuts, microphone and app behavior controls. |
| T11 | [Pricing](https://www.typeless.com/pricing) | Current vendor plans, USD amounts and advertised tier differences. |
| T12 | [Data Controls](https://www.typeless.com/data-controls) | Vendor data-handling commitments, updated August 25, 2026. |
| T13 | [Privacy Policy](https://www.typeless.com/privacy) | Vendor policy, updated August 25, 2026; sync/feedback exceptions. |
| T14 | [Microphone unavailable](https://www.typeless.com/help/troubleshooting/microphone-unavailable) | Official Windows/macOS microphone troubleshooting. |
| T15 | [Downloads](https://www.typeless.com/downloads) | Official platform availability; no binary downloaded. |
| T16 | [macOS release notes](https://www.typeless.com/help/release-notes/macos) | Official page opened; dated entries unavailable in retrieved content. |
| T17 | [Windows release notes](https://www.typeless.com/help/release-notes/windows) | Official page opened; dated entries unavailable in retrieved content. |
| I01 | [Computerworld hands-on Android review](https://www.computerworld.com/article/4122901/android-voice-typing-supertool.html) | January 28, 2026, journalist's experience; not our test. |
| I02 | [Leo Labs usage account](https://leolabs.me/blog/typeless-deep-dive/en/) | March 30, 2026, personal experience; technical/privacy assertions not independently verified. |
| I03 | [Naoyuki Kubo experience report](https://note.com/naoyukikubo/n/n8494c0c147de?hl=en) | February 7, 2026 with June/July updates; firsthand account with referral incentive. |
