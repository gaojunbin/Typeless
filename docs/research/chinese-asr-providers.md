# Chinese ASR provider shortlist

Research and source access date: **2026-09-17**. Documentation research only: no paid requests, credentials, microphone recordings, or implementation changes. Prices below concern ASR alone; the separate transcript-cleanup model costs extra.

## Decision for Typeless

Keep MiMo as the inexpensive initial provider for recording-then-transcribing. Evaluate **Qwen-Audio-3.0-ASR-Flash** next for Chinese terminology and dialect coverage, and its **Streaming** sibling when live partial transcripts become a requirement. **Fun-ASR-Realtime** deserves the same evaluation because there is useful public Chinese benchmark evidence. Retain Paraformer as a budget baseline, and Qwen3-ASR-Flash as a compatibility/control baseline. This is a five-family shortlist, not an accuracy ranking.

The latest official Alibaba catalog already includes Qwen-Audio-3.0-ASR, so a comparison limited to Qwen3-ASR would miss the current generation. Newness alone does not establish higher accuracy. See the [current team project page](https://qwenaudio.github.io/qwen-audio-3.0-asr/) and official capability matrix below.

For 100 audio hours, the mainland list-price difference between MiMo and Qwen/Fun short-file recognition is only CNY 29.20. An evaluation should therefore prioritize correction effort and response time, not just hourly price. This is our cost interpretation, not a measured quality conclusion.

## Price normalization

Calculation: `hourly price = price per second × 3,600`; monthly examples multiply that rate by 10 or 100 billable audio hours. They exclude free quotas, promotions, taxes where applicable, storage/egress, retries, and cleanup. Whole-hour examples do not establish how thousands of fractional-second requests are rounded.

### Mainland account, Beijing deployment, CNY

All Alibaba rows below use the [mainland price schedule](https://help.aliyun.com/en/model-studio/model-pricing). No prepaid package or volume tier is required for these listed pay-as-you-go rates.

| Model | Workflow | CNY/second | CNY/hour | 10 hours | 100 hours |
| --- | --- | ---: | ---: | ---: | ---: |
| `qwen-audio-3.0-asr-flash` | Short-file HTTP | 0.00022 | 0.792 | 7.92 | 79.20 |
| `qwen-audio-3.0-asr-flash-streaming` | Live audio WebSocket | 0.00033 | 1.188 | 11.88 | 118.80 |
| `qwen3-asr-flash` | Short-file HTTP | 0.00022 | 0.792 | 7.92 | 79.20 |
| `qwen3-asr-flash-realtime` | Live audio WebSocket | 0.00033 | 1.188 | 11.88 | 118.80 |
| `fun-asr-flash-2026-06-15` | Short-file HTTP | 0.00022 | 0.792 | 7.92 | 79.20 |
| `fun-asr-realtime` | Live audio WebSocket | 0.00033 | 1.188 | 11.88 | 118.80 |
| `paraformer-realtime-v2` | Live audio WebSocket | 0.00024 | 0.864 | 8.64 | 86.40 |
| `paraformer-v2` | Asynchronous file job | 0.00008 | 0.288 | 2.88 | 28.80 |

Alibaba bills input audio duration; output is free. Qwen/Fun listed trials provide 10 hours valid for 90 days under the stated activation conditions. Paraformer lists a monthly 10-hour allowance. These are excluded from comparisons. The inspected schedule does not establish fractional-second rounding or a per-request minimum; verify billing records before forecasting very short utterances. Do not apply older Intelligent Speech Interaction `paraformer-1` billing rules to Model Studio `paraformer-v2`.

### International account, Singapore deployment, USD

Use the [international price schedule](https://www.alibabacloud.com/help/en/model-studio/model-pricing), not a currency conversion from Beijing. The current Singapore rows are:

| Models | Workflow | USD/second | USD/hour | 10 hours | 100 hours |
| --- | --- | ---: | ---: | ---: | ---: |
| Qwen-Audio-3.0 Flash; Qwen3 Flash; Fun-ASR Flash | Short-file HTTP | 0.000035 | 0.126 | 1.26 | 12.60 |
| Qwen-Audio-3.0 Streaming; Qwen3 Realtime; Fun-ASR Realtime | Live audio WebSocket | 0.00009 | 0.324 | 3.24 | 32.40 |

These are standard metered prices with no package prerequisite. The international schedule lists a Singapore 10-hour trial with 90-day validity, excluded here. Mainland-account Singapore pricing is separately denominated in CNY: do not infer equivalent account eligibility, discounts, currency, or quota from an endpoint region alone. The mainland page's Virginia Qwen3 row has a currency inconsistency with the international page; it is excluded from this comparison. Paraformer Singapore availability/pricing was not established by these rows.

### Xiaomi MiMo, domestic versus overseas

The [MiMo price page](https://mimo.mi.com/docs/zh-CN/price/pay-as-you-go), updated August 6, lists:

| Model/account price region | Hour | 10 hours | 100 hours |
| --- | ---: | ---: | ---: |
| `mimo-v2.5-asr`, domestic | CNY 0.50 | CNY 5.00 | CNY 50.00 |
| `mimo-v2.5-asr`, overseas | USD 0.074 | USD 0.74 | USD 7.40 |

Metering is accurate to seconds and converted to hours. This is ordinary API-key balance billing, separate from Token Plan subscriptions. No ASR volume tier or package requirement is stated. Fractional-second rounding and a per-request minimum are not specified. The page's limited free offer concerns TTS, not ASR. “Overseas price” does not itself prove a particular processing/data-residency region.

## Capabilities and integration fit

The following catalog summary is based on the [official ASR model matrix](https://help.aliyun.com/zh/model-studio/asr-model). Language coverage is documented support, not a guaranteed error rate.

| Family | Chinese fit and input constraints |
| --- | --- |
| Qwen-Audio-3.0-ASR | Mandarin, eight major dialect groups and regional accents; multilingual. Flash accepts URL/Base64, up to 5 minutes; Streaming accepts binary audio. |
| Qwen3-ASR | Mandarin, Sichuan, Hokkien, Wu, Cantonese and English among supported languages. Flash: 5 minutes/10 MB. Realtime: PCM/Opus, 8/16 kHz. |
| Fun-ASR | Main versions cover Mandarin, regional accents, dialect groups and English. Flash accepts URL/Base64, up to 5 minutes. Realtime accepts binary audio; version-specific language support differs. |
| Paraformer v2 | Mandarin, multiple regional varieties and English. Realtime is WebSocket; file transcription accepts a public URL. Use v2 capability lists, not v1/8-kHz telephone assumptions. |

For Typeless's current 60-second default/120-second maximum recording, short-file APIs are architecturally suitable. The 2-GB catalog ceiling for newer Flash models is not a recommendation to submit enormous Base64 requests: independently enforce transport and application limits.

**Qwen-Audio-3.0 and Fun-ASR Flash:** the [HTTP reference](https://help.aliyun.com/zh/model-studio/fun-asr-flash-recorded-speech-recognition-http-api) defines a DashScope multimodal-generation request and direct recognition response. This is a different adapter from OpenAI multipart transcription. The newer Qwen endpoint supports prompt context and recognition controls. Use an explicit protocol profile; changing only the model name in the existing MiMo adapter is insufficient.

**Qwen3 Flash:** its [API reference](https://help.aliyun.com/zh/model-studio/qwen-asr-api-reference) supports OpenAI-compatible chat-completions with audio input and an optional system context containing background text/entity vocabulary. This context is not an unrestricted role instruction and is not the same as a weighted hotword API. Its base model alias need not select the newest dated snapshot: pin an exact supported snapshot during evaluation and record the returned model.

**Terminology:** [Alibaba's accuracy-enhancement guide](https://help.aliyun.com/zh/model-studio/improve-asr-accuracy) documents inline weighted vocabulary for the Qwen-Audio-3.0 variants, with up to 2,000 entries; selected Fun/Paraformer variants use precompiled vocabularies. Context support differs by model/version. The guide describes recent-turn context limits and literal term matching; semantically related prose without the actual target word has limited value. Start with small task-specific lists and evaluate false substitutions as well as recall. Catalog and enhancement pages differ in the level of detail for Fun-ASR-Flash hotwords; confirm the chosen snapshot's request schema instead of assuming parity.

**MiMo:** [its ASR API](https://mimo.mi.com/docs/en-US/api/audio/Speech-Recognition) remains `POST https://api.xiaomimimo.com/v1/chat/completions` using a Base64 WAV/MP3 audio part, model `mimo-v2.5-asr`, and `asr_options.language=auto|zh|en`. `stream=true` streams response text after submitting a complete audio payload; it is not live microphone-frame ingestion. No weighted hotword parameter is documented. The [model repository](https://github.com/XiaomiMiMo/MiMo-V2.5-ASR) claims dialect, code-switching, noise and terminology robustness; treat these as developer claims. Our existing adapter's batch-after-stop behavior matches this protocol.

The [technical report, Section 4.3](https://arxiv.org/html/2609.07549v1), describes native polishing as part of Message ASR. Therefore, measure verbatim recognition separately from formatted/polished output, and confirm the exact hosted control before integration. Do not unknowingly apply native polishing and Typeless cleanup twice or label a rewritten result as raw transcription. This is a proposed integration safeguard, not a tested API behavior.

**Code-switching:** a language list alone does not prove accurate mixed Chinese/English phrases. MiMo explicitly claims this capability, while Qwen/Fun multilingual recognition and vocabulary controls make them useful test candidates. Include mixed clauses, English product names, acronyms and numbers in the same recordings. Do not advertise support-list breadth as a measured code-switching result.

**Long-file jobs:** Qwen/Fun Filetrans and Paraformer file APIs add job submission/polling and public-file hosting concerns. Paraformer's CNY 0.288/hour is not its live-input price. Low file-job cost should not be presented as equivalent to responsive Fn dictation; short-file HTTP recognition is also distinct from live partial transcription.

## What the public benchmarks establish

The [Qwen-Audio-3.0 report, Table 1 Panel B](https://arxiv.org/html/2609.07549v1), uses its authors' common API evaluation pipeline. Chinese CER values include:

| Test set | Qwen-Audio-3.0-ASR | Fun-ASR-Flash |
| --- | ---: | ---: |
| AISHELL-1 | 1.03% | 0.76% |
| AISHELL-2 | 2.02% | 1.93% |
| FLEURS-zh | 2.08% | 5.52% |

Even within one evaluation, the ordering changes by dataset. This is vendor-authored evidence, not independent product acceptance. Panel A aggregates previously reported results and should not be treated as the same controlled API comparison. The paper names the model family; it does not establish that every current Flash/Streaming SKU and decoding mode reproduces that row. Hosted aliases, preprocessing, segmentation and scoring details matter.

[GigaSpeechBench's public leaderboard](https://raw.githubusercontent.com/SpeechColab/GigaSpeechBench/main/README.md) includes a common Vertical Chinese CER comparison of Fun-ASR-Realtime, open-weight Qwen3-ASR-1.7B and hosted Qwen3-ASR-Flash. That table is not its hotword B-CER subset. It does not measure the new Qwen-Audio-3.0-ASR, and it omits MiMo. Its multi-organization author group includes Alibaba, and displayed model labels do not fully pin current hosted snapshots. These limits prevent a current MiMo-versus-Qwen-Audio-3.0 ranking; see the parent research comparison for the compact numerical table.

The [Qwen3-ASR technical report](https://arxiv.org/abs/2601.21337) concerns the released model family, including open-weight models and forced alignment. Open-weight Qwen3-ASR-1.7B scores and local throughput do not transfer automatically to `qwen3-asr-flash`, to Qwen-Audio-3.0, or to a hosted service's network latency. Likewise, FunASR the open-source toolkit, a downloadable Fun-ASR checkpoint, and `fun-asr-realtime` the managed endpoint are separate evaluation targets. Self-hosting requires a hardware/operations cost model; “free weights” is not a hosted hourly price.

No inspected source proves a universal winner across Mandarin, dialects, noisy microphones, mixed language and personal terminology. No accuracy or latency measurement was performed in this research.

## Evaluation and unresolved checks

Run an opt-in, fixed-corpus comparison before changing the default: identical PCM recordings, exact model IDs/account regions, a held-out terminology list, normalized Chinese CER plus English-token errors, raw and cleaned outputs scored separately, and stop-to-final p50/p95 latency. Include silence, short utterances, accents, mixed language, names and corrections. Record invoice duration/rounding, failed-request charges and cancellation behavior; cancellation does not prove a provider stopped work or avoided billing.

Use the same user-approved corpus for every vendor; never silently transmit audio or context to a fallback provider. Preserve the current separation between ASR and cleanup credentials. Access to a region/account, data handling/retention, actual rate limits, individual billing minimums, and the target user's dialect quality remain account- or experiment-level checks.

ByteDance and Tencent remain possible later candidates, but this bounded shortlist does not assign them prices or accuracy rankings without a matched current product, region and billing regime. Their labels inside a paper are not sufficient to select a production SKU.
