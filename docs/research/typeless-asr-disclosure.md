# Typeless ASR model disclosure audit

Access date: **2026-09-17**. Scope: the commercial product at typeless.com, not similarly named open-source projects. This is a public-source audit, not firsthand testing, traffic inspection, or a provider confirmation.

## Conclusion

**The underlying speech-recognition model and its serving provider cannot be confirmed from the primary sources retrieved in this audit.** Typeless officially confirms cloud transcription and names OpenAI as an example of an **LLM** partner. That does not establish that its ASR uses Whisper, GPT transcribe, or OpenAI at all. [Official Data Controls](https://www.typeless.com/data-controls)

There are public clues involving OpenAI, Groq, Gemini, and a purported Typeless transcription SDK. None establishes the current desktop application's underlying ASR model. It would be premature to recommend a specific model on the basis that it is what Typeless uses.

## Evidence levels

| Level | Finding | What it establishes | What it does not establish |
| --- | --- | --- | --- |
| A: retrieved official statement | Data Controls says cloud transcription and identifies OpenAI among LLM partners. | Cloud processing; an acknowledged LLM-provider relationship. | ASR provider, model name, version, routing, or whether OpenAI handles audio. |
| A: official pages reviewed | Privacy, Terms, FAQ, homepage, and About were checked. | Public product and processing descriptions. | No specific underlying ASR model was located in these reviewed pages. This is a bounded search result, not proof that no disclosure exists anywhere. |
| B: secondhand reproduction of an official list | A Japanese article reproduces a Subprocessors table listing OpenAI, Groq, and Gemini under AI & ML Services. | A useful lead to a purported supplier list. | We could not independently retrieve the live list; the category would not identify ASR versus text processing even if confirmed. |
| B: package publisher's unverified affiliation | A PyPI package calls itself the official Typeless SDK and lists branded transcription model aliases. | What that package's publisher claims its API supports. | Independent proof of affiliation, desktop use, or the underlying foundation model. |
| C: interview/show notes and public experience | An investor interview's show notes describe Typeless's adaptation to application style. | An attributed product-experience account. | A technical disclosure of its speech model. |
| D: forum guesses and name collisions | Forum speculation mentions Groq; unrelated projects named Typeless use Whisper. | Existence of those guesses and separate implementations. | Evidence about the commercial service's production ASR. |

## Primary disclosures

The official Data Controls page, updated August 25, 2026, contains two decisive short passages:

- “Transcription is performed on the cloud”
- “leading LLM providers (such as OpenAI)”

The page describes processing audio with limited application/text context, but provides no model identifier or division of responsibilities between speech recognition and subsequent text generation. OpenAI is explicitly described in an LLM-provider context. Treating this as an ASR attribution would add information absent from the source. [Data Controls](https://www.typeless.com/data-controls)

The [Privacy Policy](https://www.typeless.com/privacy), [Terms](https://www.typeless.com/terms), and [FAQs](https://www.typeless.com/help/faqs) did not yield a named underlying speech model. The Terms' reference to LLMs is likewise insufficient to map an ASR component. The [homepage](https://www.typeless.com/) and [About page](https://www.typeless.com/about) were also reviewed without locating that disclosure.

The official footer links to a [Trust Center](https://trust.typeless.com/) and [Subprocessors](https://trust.typeless.com/subprocessors). Retrieval failed in this run: the web tool could not return their contents, and a public HTTP request returned 429. This is an access limitation, **not** evidence that the list is empty or unpublished.

## Supplier-list lead

A Japanese article dated July 29, 2026, updated August 8, reports OpenAI, Groq, and Gemini in a table labeled “AI & ML Services” and embeds a screenshot attributed to the official Trust Center. It is a secondary article with a promotional-content notice; it is not a supplier confirmation. [Article and reproduced list](https://applekakomarete.com/typeless-security/)

Even a directly verified supplier list would establish a relationship at most. It would not tell us whether Groq serves speech recognition or a text model, whether Gemini processes audio, whether providers are alternatives, or whether all customers use the same route. The article's additional interpretation of data flows must not be promoted into a primary technical finding.

## A new but unresolved SDK lead

The public [typeless-sdk PyPI page](https://pypi.org/project/typeless-sdk/) lists release 0.1.0 dated July 18, 2026 and describes itself as “Official Python SDK for the Typeless External Transcript API.” It lists the API-facing identifiers `typeless-1.0-lite`, `typeless-1.0-pro`, and `typeless-1.0-max`, points to `api.typelessapi.com`, and links back to Typeless's site and policies.

This is noteworthy but not sufficient attribution. The publisher supplies those links and affiliation claims. This audit did not locate an independently retrieved typeless.com backlink confirming the SDK; attempts to retrieve typelessapi.com and docs.typelessapi.com failed. No package was installed and no authenticated API call was made. Even if its affiliation is confirmed later, branded endpoint aliases would not reveal the underlying ASR model or prove that the desktop product uses the same pipeline.

Therefore this report does **not** conclude that Typeless has no developer API, nor that the package is counterfeit. Both would exceed the available evidence.

## Interviews, founder statements, and rumors

The original show page for an interview with ZhenFund's Yusen Dai includes a Typeless discussion at 17:45 about adapting to speaking style across applications. The reviewed show notes do not name an ASR model. The full audio was not reviewed, so this is not a claim about every spoken sentence. [Original interview show notes](https://www.xiaoyuzhoufm.com/episode/693becad2a383da167c0b3b6)

Searches for founder Huang Song, his public account, and launch material did not locate a retrievable primary statement identifying a speech model. A [Product Hunt launch mirror](https://www.hunted.space/product/typeless-2/launches/typeless-2) contained product claims but no model attribution in the reviewed text; the original linked launch page was not retrievable. Quiet-voice or whisper-mode terminology is a feature description, not evidence of OpenAI Whisper.

A [Linux.do discussion](https://linux.do/t/topic/1574602) asks whether Typeless uses a local model. Replies include guesses about architecture and Groq, plus suggestions for recreating similar behavior with other ASR services. No verifiable insider attribution or model-disclosure document was supplied in the reviewed replies. These remain rumors or implementation suggestions.

Searches also return independent projects such as [jlgadgeteer/typeless](https://github.com/jlgadgeteer/typeless) and [Smopig/typeless](https://github.com/Smopig/typeless). Their code or README choices cannot be attributed to the commercial product merely because their names match.

## Candidate claims adjudicated

| Candidate claim | Audit verdict |
| --- | --- |
| Typeless uses OpenAI services. | Supported specifically as an official LLM-partner example; scope must remain explicit. |
| Typeless uses Whisper / Whisper large-v3 / GPT transcribe. | Not established by retrieved primary evidence. |
| Typeless uses Groq for ASR. | Unconfirmed. A secondhand generic supplier category and forum assertion cannot establish the workload. |
| Typeless uses Gemini / Google Speech / Azure Speech. | Not established. Gemini appearing in a reported generic list is not a Google Speech product attribution. |
| Typeless uses Deepgram or AssemblyAI. | No confirming primary disclosure or official customer case was located in targeted searches. Absence from search is not proof of non-use. |
| Typeless has its own foundation speech model. | Not established. Branded SDK model aliases, even if authentic, do not establish model provenance. |
| Typeless runs ASR entirely locally. | Conflicts with the retrieved official cloud-transcription statement for the described service. |

Targeted searches covered Typeless combined with Whisper, Deepgram, AssemblyAI, Google, Azure, OpenAI, Groq, ASR, model, founder, and interview; provider-domain searches included OpenAI, Groq, Deepgram, AssemblyAI, and Google Cloud. Results were assessed for an explicit connection between the commercial product and a speech workload, not merely matching names.

## Implications for our evaluation

Typeless should be treated as a **black-box end-to-end product comparator**, with its internal ASR marked unknown. A polished final paragraph can reflect recognition, context, dictionary handling, revision interpretation, and text cleanup. It cannot identify the recognition model by itself.

Our own comparison should separately measure raw transcription and final edited output on the same recordings. Report Chinese character error rate for verbatim recognition, preservation of names/numbers/negation, intended correction handling, end-to-end latency, and cost. Keep the cleanup model and instructions fixed when comparing ASR candidates. Where Typeless does not expose raw recognition, label its score as final-output quality rather than a directly comparable raw-ASR score.

To resolve attribution, obtain a direct current statement from Typeless or an official supplier case explicitly identifying the speech workload and model. This audit did not contact anyone. Vendor documentation may still leave version changes and per-language routing unspecified, so those need separate confirmation before a claim of exact replication.

## Evidence ledger

All entries accessed or attempted on **2026-09-17**. Quotes above are deliberately short; most evidence is paraphrased.

| Source | Status and scope |
| --- | --- |
| [Typeless Data Controls](https://www.typeless.com/data-controls) | Retrieved official page; updated August 25, 2026; strongest affirmative evidence. |
| [Typeless Privacy](https://www.typeless.com/privacy) | Retrieved official processing policy; no underlying ASR identifier located. |
| [Typeless Terms](https://www.typeless.com/terms) | Retrieved official LLM-related terms; no ASR mapping located. |
| [Typeless FAQs](https://www.typeless.com/help/faqs) | Retrieved official help; no underlying ASR identifier located. |
| [Typeless homepage](https://www.typeless.com/) / [About](https://www.typeless.com/about) | Retrieved official marketing/company pages. |
| [Trust Center](https://trust.typeless.com/) / [Subprocessors](https://trust.typeless.com/subprocessors) | Attempted, unavailable to this audit; do not treat secondary reproduction as live verification. |
| [Japanese security article](https://applekakomarete.com/typeless-security/) | Retrieved secondary supplier-list lead; dated July 29 / August 8, 2026. |
| [PyPI typeless-sdk](https://pypi.org/project/typeless-sdk/) | Retrieved publisher-authored metadata and README; affiliation and desktop applicability unresolved. |
| [API documentation](https://docs.typelessapi.com/) | Attempted; not retrievable in this run. |
| [Yusen Dai interview show page](https://www.xiaoyuzhoufm.com/episode/693becad2a383da167c0b3b6) | Retrieved original show notes; no full-audio review. |
| [Launch mirror](https://www.hunted.space/product/typeless-2/launches/typeless-2) | Retrieved secondary launch text; original launch retrieval failed. |
| [Linux.do thread](https://linux.do/t/topic/1574602) | Retrieved anecdotal discussion; not technical proof. |
| [jlgadgeteer/typeless](https://github.com/jlgadgeteer/typeless) / [Smopig/typeless](https://github.com/Smopig/typeless) | Separate projects; excluded from commercial-product attribution. |
