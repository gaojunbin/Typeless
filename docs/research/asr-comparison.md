# ASR selection for Chinese dictation

Research/access date: **2026-09-17**. Documentation research only: no adapter changes, paid API calls, or acceptance testing. macOS and Windows share this backend-selection decision. This memo synthesizes [Chinese providers](chinese-asr-providers.md), [international providers](global-asr-providers.md), and [Typeless disclosure](typeless-asr-disclosure.md).

## Recommendation

Keep **MiMo as the baseline**, then compare **Qwen-Audio-3.0-ASR-Flash and Fun-ASR** on the user's Chinese recordings. Add **Gemini 3.5 Transcribe** for multilingual/features evaluation; consider Groq Whisper Turbo for cost only if Chinese quality passes. Azure standard is a useful control; MAI-Transcribe-2 is a separate preview candidate. These are our evaluation priorities, not proven accuracy rankings.

For 10 hours, Beijing short-file Qwen/Fun costs only CNY 2.92 more than domestic MiMo before cleanup (CNY 29.20 at 100 hours). Actual Chinese correction effort and stop-to-final latency matter more than that small difference. The current start/stop app should initially compare completed-audio APIs; live partial results require separate adapters and measurement.

## What commercial Typeless discloses

| Evidence | Confidence and limit |
| --- | --- |
| Official Data Controls: cloud transcription; OpenAI named among LLM partners | Confirmed statement, **not an ASR-model attribution**. |
| Secondary screenshot lists OpenAI/Groq/Gemini as AI & ML subprocessors | Lead only: live Trust Center retrieval failed. Generic supplier categories cannot distinguish speech from cleanup. |
| PyPI `typeless-sdk` claims official status and branded model aliases | Affiliation and desktop applicability unconfirmed; aliases do not reveal underlying models. |
| Investor interview notes, forum guesses, similarly named GitHub projects | No verified underlying-ASR disclosure found; unrelated clones are not commercial-product evidence. |

The defensible answer is **unknown underlying ASR**, not “probably Whisper.” Polished final text cannot identify the speech model: context and rewriting also affect output. [Official Data Controls](https://www.typeless.com/data-controls), [SDK lead](https://pypi.org/project/typeless-sdk/), [full evidence ledger](typeless-asr-disclosure.md)

## Comparable cost scenarios

ASR only, mono, excluding cleanup, taxes, storage, retries, free quotas and commitments. Multiply billable-hour rate by 10/100; request rounding can increase actual cost. No currency conversion. **E** = token-based estimate; **P** = temporary promotion; **R?** = minimum/fractional rounding not established. “Global” below identifies an international service/account, not guaranteed data residency or mainland availability.

### CNY: domestic MiMo and Alibaba mainland account / Beijing

| Exact model/SKU | Mode | CNY/h | 10h | 100h | Billing flag |
| --- | --- | ---: | ---: | ---: | --- |
| `mimo-v2.5-asr` | Completed audio | 0.50 | 5.00 | 50.00 | Seconds; R? |
| `qwen-audio-3.0-asr-flash` | Short-file HTTP | 0.792 | 7.92 | 79.20 | Duration; R? |
| `qwen-audio-3.0-asr-flash-streaming` | Live WebSocket | 1.188 | 11.88 | 118.80 | Duration; R? |
| `qwen3-asr-flash` | Short-file HTTP | 0.792 | 7.92 | 79.20 | Duration; R? |
| `fun-asr-flash-2026-06-15` | Short-file HTTP | 0.792 | 7.92 | 79.20 | Duration; R? |
| `fun-asr-realtime` | Live WebSocket | 1.188 | 11.88 | 118.80 | Duration; R? |
| `paraformer-realtime-v2` | Live WebSocket | 0.864 | 8.64 | 86.40 | Duration; R? |
| `paraformer-v2` | Async file job | 0.288 | 2.88 | 28.80 | Duration; R? |

Alibaba rates derive from CNY 0.00022/0.00033/0.00024/0.00008 per second respectively. Trials and monthly allowances are excluded; these are ordinary metered rates. Older Paraformer product billing rules must not be transferred to these SKUs. [Alibaba mainland pricing](https://help.aliyun.com/en/model-studio/model-pricing), [MiMo pricing](https://mimo.mi.com/docs/zh-CN/price/pay-as-you-go)

### USD: international accounts

| Exact model/SKU | Account/region; mode | USD/h | 10h | 100h | Flag |
| --- | --- | ---: | ---: | ---: | --- |
| `mimo-v2.5-asr` | Overseas price; completed audio | .074 | .74 | 7.40 | R? |
| `qwen-audio-3.0-asr-flash` | Singapore; short-file | .126 | 1.26 | 12.60 | R? |
| `qwen-audio-3.0-asr-flash-streaming` | Singapore; live | .324 | 3.24 | 32.40 | R? |
| `gemini-3.5-transcribe` | Gemini API; file | ~.30 | ~3.00 | ~30.00 | E |
| `gemini-3.5-transcribe-live` | Gemini API; live | ~.54 | ~5.40 | ~54.00 | E |
| `chirp_3`, V2 standard | GCP; recognition | .96 | 9.60 | 96.00 | 1s round-up |
| `chirp_3`, V2 dynamic batch | GCP; offline | .18 | 1.80 | 18.00 | 1s round-up |
| Azure S1 Speech To Text | East US; real-time | 1.00 | 10.00 | 100.00 | 1s units |
| Azure Fast Transcription | East US; completed file | .36 | 3.60 | 36.00 | 1s units |
| Azure S1 Speech to Text Batch | East US; offline | .18 | 1.80 | 18.00 | 1s units |
| `MAI-Transcribe-2` | Supported Azure regions; Fast preview | .10 | 1.00 | 10.00 | P |
| `gpt-transcribe` | OpenAI; file | .27 | 2.70 | 27.00 | Duration; R? |
| `gpt-4o-transcribe` | OpenAI; file | ~.36 | ~3.60 | ~36.00 | E |
| `gpt-4o-mini-transcribe` | OpenAI; file | ~.18 | ~1.80 | ~18.00 | E |
| `whisper-1` | OpenAI; file | .36 | 3.60 | 36.00 | R? |
| `whisper-large-v3` | Groq; file | .111 | 1.11 | 11.10 | 10s minimum |
| `whisper-large-v3-turbo` | Groq; file | .04 | .40 | 4.00 | 10s minimum |

Singapore international-account prices are not converted Beijing prices. Qwen3/Fun short-file and live counterparts share the listed Singapore rates; confirm the selected snapshot and account eligibility. MiMo overseas pricing does not specify residency. [Alibaba international schedule](https://www.alibabacloud.com/help/en/model-studio/model-pricing)

Gemini bills **tokens**, not fixed audio duration: file $2/million audio-input plus $12/million text-output tokens; live $3.50 plus $21. Google's estimates assume 25 audio tokens/second and **175 output tokens/minute**. Exact arithmetic gives $0.306/file-hour and $0.5355/live-hour; the table uses Google's rounded estimates. Chinese output changes the bill. [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing?hl=en)

Cloud V2 uses $0.016/min standard or $0.003/min dynamic batch, billing each processed channel. Dynamic batch can take up to 24 hours; it is unsuitable for interactive stop-to-text. [Cloud pricing](https://cloud.google.com/speech-to-text/pricing), [batch strategy](https://docs.cloud.google.com/speech-to-text/docs/reference/rest/v2/projects.locations.recognizers/batchRecognize)

Azure base numbers were checked against East US consumption meters in the public Retail Prices API because the web price page rendered placeholders. MAI's $0.10/hour is promotional through **2026-12-31**, not a long-term commitment; post-promotion pricing remains unresolved. Do not automatically add an unrelated enhanced-feature meter. [Retail API](https://prices.azure.com/api/retail/prices?$filter=armRegionName%20eq%20%27eastus%27%20and%20productName%20eq%20%27Azure%20Speech%27), [Azure pricing](https://azure.microsoft.com/en-us/pricing/details/speech/), [MAI announcement](https://microsoft.ai/news/mai-transcribe-2-is-the-fastest-most-accurate-and-cheapest-speech-recognition-model-in-the-world/)

OpenAI's current `gpt-transcribe` model page specifies audio-duration billing at $0.0045/minute; its minimum/rounding rules remain unestablished. GPT-4o estimates and Whisper duration pricing are separate from this model and live SKUs. Groq's 10-second minimum can materially inflate short-utterance costs: uniform five-second clips would double its effective cost per recorded hour. [OpenAI model pricing](https://developers.openai.com/api/docs/models/gpt-transcribe), [OpenAI pricing](https://developers.openai.com/api/docs/pricing), [Groq speech billing](https://console.groq.com/docs/speech-to-text)

## Chinese quality: evidence, not a universal ranking

GigaSpeechBench's **same Vertical Chinese CER** table reports:

| Published model label | CER, lower is better |
| --- | ---: |
| FUNASR-REALTIME | 3.12% |
| AZURE | 5.92% |
| QWEN3-ASR-FLASH | 6.20% |
| CHIRP-3 | 9.38% |

This is a difficult-domain benchmark, not everyday microphone acceptance. Its multi-organization authors include Alibaba; generic hosted labels do not fully pin snapshots. It omits MiMo and the new Qwen-Audio-3.0, Gemini 3.5 Transcribe and MAI-Transcribe-2. It cannot rank those new choices. [Leaderboard](https://raw.githubusercontent.com/SpeechColab/GigaSpeechBench/main/README.md), [paper/affiliations](https://arxiv.org/html/2606.28884v1)

The Qwen-Audio-3.0 report's controlled API panel changes ordering between Qwen and Fun across AISHELL and FLEURS Chinese sets. This is vendor-authored evidence and does not prove every Flash/Streaming SKU matches the family row. Do not mix its literature-summary panel with its API panel, or equate open-weight Qwen/FunASR results with hosted endpoints. [Technical report, Table 1](https://arxiv.org/html/2609.07549v1)

Language lists, multilingual average WER and marketing demonstrations do not establish this user's Mandarin-English switching, names, punctuation or dialect accuracy. No unified current-model Chinese comparison was found.

## Integration priorities and Google distinction

1. **Preserve MiMo** and raw/final separation. Its text response streaming follows a complete audio upload; it is not microphone-frame streaming. [MiMo API](https://mimo.mi.com/docs/en-US/api/audio/Speech-Recognition)
2. **Add Alibaba as a distinct adapter**, beginning with current Qwen-Audio-3.0 Flash and Fun Flash. DashScope multimodal requests differ from the existing provider protocol; vocabulary/context controls differ by snapshot. Streaming is a later path. [ASR matrix](https://help.aliyun.com/zh/model-studio/asr-model), [HTTP reference](https://help.aliyun.com/zh/model-studio/fun-asr-flash-recorded-speech-recognition-http-api)
3. **Evaluate Gemini Transcribe before assuming Google means Chirp.** Gemini uses API-key BYOK, Interactions for files and Live API for audio frames, with Mandarin/Cantonese support, code-switching, vocabulary and optional cleanup. Keep its smart mode separate from verbatim recognition; likewise verify the exact hosted controls for any Qwen native-polishing feature before integration. Cloud STT V2 uses GCP recognizers, IAM/OAuth and separate regional/model constraints. Its synchronous one-minute limit also needs handling for our 120-second maximum. [Gemini guide](https://ai.google.dev/gemini-api/docs/transcribe), [Chirp 3](https://docs.cloud.google.com/speech-to-text/docs/models/chirp-3), [Cloud quotas](https://docs.cloud.google.com/speech-to-text/docs/quotas)
4. **Keep Azure preview separate from standard Speech.** MAI uses Fast `enhancedMode`; standard continuous language identification does not detect switches within one sentence. Model/region eligibility requires checking. [MAI](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/mai-transcribe), [standard LID](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-identification)

## Future A/B: 30 minutes, 180 samples

Prepare six strata of **30 clips / five audio minutes each**: ordinary Mandarin; user-relevant accents/dialect; Mandarin-English switching; names/numbers/code terms; spoken corrections/negation; noise/quiet speech/silence. Vary lengths while preserving 1,800 total seconds. This is an audio-corpus duration, not a promise that annotation and testing take 30 minutes.

Use consented, byte-identical mono recordings and human verbatim references. Freeze model IDs, region, settings and terminology lists; randomize request order. First compare ASR alone, then apply identical cleanup to each result. Evaluate native cleanup separately. Keep Typeless as a final-output comparator if raw ASR is unavailable.

Score normalized and literal CER, English-token errors, entity/number recall, punctuation, meaning changes, silence hallucinations, and blind correction time. Measure stop-to-final p50/p95, failures, billed units and actual cost; report each stratum and paired uncertainty. Select a default only after reviewing accuracy/latency/cost tradeoffs. Retain all failures, avoid silent provider fallback, and verify billing minimums, cancellation and data-handling terms before execution. **This experiment has not been run.**
