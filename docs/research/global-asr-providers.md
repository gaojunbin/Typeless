# International ASR providers for Chinese dictation

Research date: 2026-09-17. Official documentation and public research only; no paid requests, credentials, audio uploads, or product changes. Prices are USD, excluding tax, cleanup LLM calls, storage, networking, retries, and negotiated discounts. No exchange-rate conversion is used. This is a selection memo, not a runtime acceptance report.

## Recommendation

Evaluate Google **Gemini 3.5 Transcribe** as the first Google BYOK candidate, and retain **Cloud Speech-to-Text V2 Chirp 3** for customers who need the GCP resource/IAM deployment model. They are different APIs, models, and billing systems. Compare Azure standard Speech on the same Chinese corpus; treat MAI-Transcribe-2 as a separate preview candidate. Do not select a Chinese winner from multilingual average WER.

For Typeless's start/stop workflow, begin with completed-audio transcription and measure stop-to-final latency. Streaming is a separate integration and cost decision. Provider-side smart cleanup must be optional: compare verbatim ASR first, retain the raw result, and avoid applying two independent cleanup stages without measuring semantic changes.

## Google: two distinct routes

### Cloud Speech-to-Text V2, `chirp_3`

Chirp 3 supports `Recognize`, `StreamingRecognize`, and `BatchRecognize`. Mandarin `cmn-Hans-CN` is GA; Cantonese `yue-Hant-HK` and Taiwanese Mandarin `cmn-Hant-TW` remain Preview in the current model table. Automatic punctuation is GA; actual Chinese punctuation accuracy is not quantified. Language-agnostic mode identifies the dominant language, which is not a guarantee of accurate sentence-internal Chinese/English switching. The region table explicitly lists `us` and `eu` GA, while an example mentions `asia-southeast1`; use the locations capability API to resolve this inconsistency before promising a specific Asian region. Model-specific guidance also gives shorter batch limits than the generic quota ceiling. [Chirp 3 model documentation](https://docs.cloud.google.com/speech-to-text/docs/models/chirp-3)

Generic V2 limits: synchronous audio is at most 1 minute or 10 MB; streaming messages contain at most 25 KB, a stream lasts at most 5 minutes, and sending must approximate real time. Batch input uses Cloud Storage; the generic ceiling is 8 hours/file and currently 5 files/request. These generic maxima do not override a smaller model/feature limit. Multiple-language recognition is limited to global/US/EU endpoints. [V2 quotas](https://docs.cloud.google.com/speech-to-text/docs/quotas)

Integration requires a billing-enabled GCP project, enabled Speech API, region/recognizer path, and authorization. V2 `recognize` specifies the `cloud-platform` OAuth scope and `speech.recognizers.recognize` IAM permission. This is not a drop-in Gemini API key request. Use ADC in development and a deliberate user OAuth/backend identity design for distribution; do not ship a shared service-account private key in the desktop app. [V2 REST authorization](https://docs.cloud.google.com/speech-to-text/docs/reference/rest/v2/projects.locations.recognizers/recognize), [client-library authentication](https://docs.cloud.google.com/speech-to-text/docs/libraries)

Dynamic batch is explicitly lower urgency and can complete within 24 hours. It is suitable for an offline transcription queue, not the interactive Fn-stop response path. [Batch processing strategy](https://docs.cloud.google.com/speech-to-text/docs/reference/rest/v2/projects.locations.recognizers/batchRecognize)

### Gemini API, `gemini-3.5-transcribe` and `gemini-3.5-transcribe-live`

This newer family was updated in August 2026. File transcription uses the Interactions API; microphone streaming uses the Live API. The language table includes Mandarin `cmn-Hans-CN` and traditional Cantonese `yue-Hant-HK`. Google explicitly documents sentence-internal code switching, punctuation/normalization, vocabulary hints, and optional smart removal of fillers/repetitions. These are supported features, not measured guarantees for Chinese terminology or meaning preservation. [Transcription guide](https://ai.google.dev/gemini-api/docs/transcribe)

The model matrix gives a 10-minute live session limit and 1-hour file limit, reduced to 30 minutes with diarization/timestamps. Batch API, Flex, and Priority inference are not supported. Word timestamps can reduce accuracy; custom vocabulary cannot be combined with timestamps/diarization. [Model matrix](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-transcribe)

Live input is raw 16-bit, 16 kHz mono PCM over WebSockets; the API exposes manual/hybrid VAD. This needs a dedicated adapter rather than sending the app's existing WAV multipart request unchanged. [Live transcription](https://ai.google.dev/gemini-api/docs/live-api/live-transcribe)

Authentication is an API key associated with a Google Cloud project, available through AI Studio; this is simpler desktop BYOK setup than managing Cloud STT OAuth/recognizers. It still requires account/region eligibility and billing for paid usage. Singapore and Taiwan appear in the supported-region list; do not infer mainland-China availability from Chinese-language support, or infer data residency from the user's country. [API keys](https://ai.google.dev/gemini-api/docs/api-key), [eligible regions](https://ai.google.dev/gemini-api/docs/available-regions)

## Azure Speech

Standard Speech lists Mandarin `zh-CN`, Taiwanese Mandarin `zh-TW`, traditional Cantonese `zh-HK`, and simplified Cantonese `yue-CN`; the locale table covers real-time/batch with a separate Fast support column. These locales have Fast support. Select an explicit locale for a controlled Chinese test. [Language matrix](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt)

Use Speech SDK recognition for incremental microphone results. The short-audio REST endpoint accepts at most 60 seconds and only returns final results. Fast transcription processes a completed file synchronously; batch is asynchronous and should not be given an interactive latency promise. [Overview](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-to-text), [short-audio REST](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-speech-to-text-short), [Fast API](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/fast-transcription-create)

Standard continuous language identification does **not** detect language changes within the same sentence. Therefore, enabling LID is not sufficient evidence of Chinese/English code-switch quality. Standard display text includes automatic punctuation, but no comparable Chinese punctuation score was found. [LID limitations](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-identification), [display formatting](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/display-text-format)

**MAI-Transcribe-2** is a separate public-preview model accessed through Fast transcription `enhancedMode`. It supports `zh` and `yue`, code switching, verbatim/clean modes, keyword biasing and diarization. The documented code-switch examples are Hinglish/Spanglish, not a quantitative Mandarin-English result. It needs an Azure subscription, Speech resource, key and region; do not assume this preview model is the standard real-time SDK backend. [MAI documentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/mai-transcribe)

The MAI regional table includes `centralindia`, `eastus`, `northeurope`, `southeastasia`, `westus`, and `westus2`. Standard Speech has a broader regional matrix. A resource key plus matching endpoint/region provides a straightforward BYOK path; Microsoft Entra authentication is also available. Mainland Azure China is a separate cloud/account/endpoint offering, not automatic access through a global Azure key. [Regions](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions), [sovereign clouds](https://docs.azure.cn/en-us/ai-services/speech-service/sovereign-clouds)

## Cost comparison

Assume one channel, exact total billable duration, base on-demand prices, no free credits or volume commitments. Approximate token-model costs use the provider's published per-minute estimates, not a guaranteed Chinese invoice.

| Route | Base or estimated rate | 1 hour | 10 hours | 100 hours |
|---|---:|---:|---:|---:|
| Google Cloud V2 standard recognition | $0.016/min | $0.96 | $9.60 | $96.00 |
| Google Cloud V2 dynamic batch, **offline only** | $0.003/min | $0.18 | $1.80 | $18.00 |
| Gemini 3.5 Transcribe file, estimated blended | ~$0.005/min | ~$0.30 | ~$3.00 | ~$30.00 |
| Gemini 3.5 Transcribe Live, estimated blended | ~$0.009/min | ~$0.54 | ~$5.40 | ~$54.00 |
| Azure standard real-time, East US | $1.00/hour | $1.00 | $10.00 | $100.00 |
| Azure standard Fast, East US | $0.36/hour | $0.36 | $3.60 | $36.00 |
| Azure standard Batch, East US | $0.18/hour | $0.18 | $1.80 | $18.00 |
| OpenAI `gpt-transcribe`, audio duration | $0.0045/min | $0.27 | $2.70 | $27.00 |
| OpenAI `gpt-4o-transcribe`, estimate | ~$0.006/min | ~$0.36 | ~$3.60 | ~$36.00 |
| OpenAI `gpt-4o-mini-transcribe`, estimate | ~$0.003/min | ~$0.18 | ~$1.80 | ~$18.00 |
| OpenAI `whisper-1` | $0.006/min | $0.36 | $3.60 | $36.00 |
| Groq `whisper-large-v3` | $0.111/hour | $0.111 | $1.11 | $11.10 |
| Groq `whisper-large-v3-turbo` | $0.04/hour | $0.04 | $0.40 | $4.00 |

Google standard's first volume band extends to 500,000 minutes/month. Google rounds requests up in one-second increments; successful empty responses are billable. Each processed channel is billed separately, so a two-channel file can double the mono amount. Cloud Storage is extra. Do not borrow V1's free 60 minutes or logging rates for a V2 quote. [Cloud STT pricing](https://cloud.google.com/speech-to-text/pricing)

Gemini file pricing is $2/million audio-input tokens plus $12/million text-output tokens; Live is $3.50 plus $21 respectively. Google's rounded blended estimates assume 25 input audio tokens/second and 175 output text tokens/minute. Actual Chinese output token counts can differ. A minute containing exactly those assumed token counts calculates to $0.0051/file or $0.008925/live; the table intentionally uses Google's approximate $0.005/$0.009. No duration-minimum or channel-multiplier guarantee was established for this token route. Free-tier content is marked usable for product improvement, paid-tier content is marked not used for that purpose. [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing?hl=en)

Azure's public pricing page rendered numeric prices as `$-`, so the base rates above were verified using the unauthenticated [Azure Retail Prices API](https://prices.azure.com/api/retail/prices?$filter=armRegionName%20eq%20%27eastus%27%20and%20productName%20eq%20%27Azure%20Speech%27), filtered to USD consumption meters. Exact meters: `S1 Speech To Text` = 1.00/hour; `Fast Transcription Speech To Text` = 0.36/hour; `S1 Speech to Text Batch` = 0.18/hour. The API also returned `Fast Transcription Promo Speech To Text` = 0.10/hour, effective 2026-09-01. This is a region-specific public list-price check, not an account quote.

MAI-Transcribe-2's announcement advertises **$0.10/hour**, equivalent to ~$0.001667/minute, $1/10 hours and $10/100 hours. Unlike Gemini's estimate, this is an audio-duration price rather than an input/output-token decomposition. Select `enhancedMode.enabled=true` and `enhancedMode.model="MAI-Transcribe-2"`. The Azure pricing page labels its discount as ending **2026-12-31**. Keep this promotional scenario separate from base rates; neither its post-promotion price nor all feature combinations were established. The retail catalog's $0.30/hour enhanced-feature meter should not automatically be added to MAI merely because the API field is named `enhancedMode`. [MAI announcement](https://microsoft.ai/news/mai-transcribe-2-is-the-fastest-most-accurate-and-cheapest-speech-recognition-model-in-the-world/), [Azure pricing](https://azure.microsoft.com/en-us/pricing/details/speech/)

Azure bills Speech-to-Text in one-second increments; the reviewed pricing page did not specify a larger universal minimum. Its FAQ says a multiplexed dual-channel file is charged by file duration, whereas separately submitted channel files are each charged. This differs from Google's rule. [Azure pricing](https://azure.microsoft.com/en-us/pricing/details/speech/), [Azure channel billing FAQ](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/faq-stt)

## OpenAI and Groq scope

The older OpenAI models remain useful file-transcription comparison points. Their current official prices above are estimates for GPT-4o models and a duration price for Whisper. The current `gpt-transcribe` model page explicitly specifies transcription audio duration at $0.0045/minute; it is not a disclosed token-rate estimate. No universal minimum-duration/channel multiplier for these models was established in the reviewed current pages. Keep mono input and inspect usage receipts in a later authorized test. [OpenAI pricing](https://developers.openai.com/api/docs/pricing), [Current model](https://developers.openai.com/api/docs/models/gpt-transcribe), [Whisper model](https://developers.openai.com/api/docs/models/whisper-1)

Current OpenAI Docs now also list `gpt-transcribe` at $0.0045/min and dedicated live models at $0.017/min; do not silently replace the requested GPT-4o models or price a new live route at an old file-model rate. Current live documentation primarily describes `gpt-live-transcribe` and `gpt-transcribe`. Compatibility of the older trio with a chosen current live endpoint must be validated separately. File response streaming also does not mean live microphone input. [Pricing](https://developers.openai.com/api/docs/pricing), [Realtime guide](https://developers.openai.com/api/docs/guides/realtime-transcription)

The latest file guide explicitly documents `cmn`, `yue`, and regional `zh` hints for **gpt-transcribe**, not a per-locale guarantee for every older model. GPT-4o-transcribe has Chinese benchmark evidence below; a current uniform Mandarin/Cantonese/mixed-language certification table for the older trio was not established. Punctuation and simplified/traditional stability require corpus testing. API-key setup is simpler than Cloud STT IAM, but country eligibility and API billing still apply. [File guide](https://developers.openai.com/api/docs/guides/speech-to-text)

Groq hosts Whisper large-v3/turbo with file-transcription APIs. Its minimum billable request is **10 seconds**, so very short utterances inflate effective cost. These are hosted Whisper models, not evidence of a Groq-developed Chinese-leading model. Neither its multilingual WER column nor inference speed factor proves Chinese quality or end-to-end user latency. [Groq speech documentation](https://console.groq.com/docs/speech-to-text)

## What actual Chinese evidence establishes

GigaSpeechBench provides a difficult-domain Chinese CER comparison (see the main synthesis for its table), but includes Alibaba-affiliated authors and tests older Azure/Chirp-3 systems, so it cannot rank MAI-Transcribe-2/Gemini 3.5 Transcribe or establish everyday dictation accuracy. [Author results](https://raw.githubusercontent.com/SpeechColab/GigaSpeechBench/main/README.md), [paper and affiliations](https://arxiv.org/html/2606.28884v1)

No unified Chinese-only evaluation covering current Chirp-3, Gemini 3.5 Transcribe, Azure standard, MAI-Transcribe-2, and all requested OpenAI models was established. Microsoft's 60-language average WER and Google's multilingual marketing cannot fill that gap. No inference here establishes which provider is best for this user's voice.

## Proposed next evaluation, not performed

Use the same consented 180 utterances (approximately 30 minutes) per provider, aligned with the main comparison plan: Mandarin, Cantonese, Mandarin-English switching, names/code/numbers, Bluetooth microphone noise, and silence. Preserve byte-identical mono audio. Score normalized CER and literal CER separately; additionally record terminology recall, Chinese punctuation F1, simplified/traditional consistency, semantic additions/deletions, hallucinations on silence, p50/p95 stop-to-final latency, failures, and billed units. Run verbatim mode first, then compare optional cleanup. Record exact model, endpoint, region, date, hints, and feature settings; never substitute an aggregate multilingual score for the Chinese strata.

Before implementation, resolve preview acceptance, endpoint eligibility, actual Chinese token costs, credential UX, retention/deletion terms, and cancellation behavior. Recheck Cloud STT's conflicting regional/model-limit documentation with its capability API. No service account, billing project, provider adapter, or paid benchmark was created by this research.
