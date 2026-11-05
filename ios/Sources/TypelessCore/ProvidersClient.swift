import Foundation

public struct ProviderError: LocalizedError, Equatable, Sendable {
    public let message: String
    public let code: String

    public init(_ message: String, code: String = "provider") {
        self.message = message
        self.code = code
    }

    public var errorDescription: String? { message }
}

public struct CleanupResult: Equatable, Sendable {
    public let text: String
    public let warning: String?

    public init(text: String, warning: String? = nil) {
        self.text = text
        self.warning = warning
    }
}

public final class ProvidersClient: Sendable {
    private let session: URLSession

    public init(session: URLSession = .shared) {
        self.session = session
    }

    public static func endpoint(base: String, suffix: String) throws -> URL {
        guard var components = URLComponents(string: base.trimmingCharacters(in: .whitespacesAndNewlines)),
              let scheme = components.scheme?.lowercased(),
              let host = components.host?.lowercased() else {
            throw ProviderError("Invalid service endpoint URL.", code: "configuration")
        }
        if components.user != nil || components.password != nil || components.query != nil || components.fragment != nil {
            throw ProviderError("Endpoint must not contain credentials, query parameters or a fragment.", code: "configuration")
        }
        let isLoopback = ["localhost", "127.0.0.1", "[::1]", "::1"].contains(host)
        if scheme != "https" && !(scheme == "http" && isLoopback) {
            throw ProviderError("Use HTTPS, or HTTP on a loopback address.", code: "configuration")
        }
        let cleanPath = components.path.replacingOccurrences(of: "/+$", with: "", options: .regularExpression)
        components.path = "\(cleanPath)/\(suffix)"
        guard let url = components.url else {
            throw ProviderError("Invalid service endpoint URL.", code: "configuration")
        }
        return url
    }

    private static func statusMessage(_ status: Int) -> String {
        switch status {
        case 400: return "The provider rejected the request format or model."
        case 401: return "The API key was rejected."
        case 402: return "The provider account has insufficient balance."
        case 403: return "The provider denied access."
        case 404: return "The provider endpoint or model was not found."
        case 413: return "The audio is too large."
        case 421: return "The provider blocked this content."
        case 429: return "The provider rate limit was reached."
        case 500: return "The provider encountered an internal error."
        case 503: return "The provider is temporarily unavailable."
        default: return "The provider returned HTTP \(status)."
        }
    }

    public static func extractCompletionText(from data: Data) throws -> String {
        guard let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let choices = root["choices"] as? [[String: Any]],
              !choices.isEmpty else {
            throw ProviderError("The provider did not return a complete result.")
        }
        let choice = choices.first(where: { ($0["index"] as? Int) == 0 }) ?? choices[0]
        guard let finishReason = choice["finish_reason"] as? String, finishReason == "stop" else {
            let reason = choice["finish_reason"] as? String
            throw ProviderError(reason == "length" ? "The provider output was truncated." : "The provider did not return a complete result.")
        }
        guard let message = choice["message"] as? [String: Any] else {
            throw ProviderError("The provider returned empty or invalid text.")
        }
        if message["refusal"] is String || ((message["tool_calls"] as? [Any])?.isEmpty == false) {
            throw ProviderError("The provider returned a refusal or tool call instead of text.")
        }
        guard let content = message["content"] as? String else {
            throw ProviderError("The provider returned empty or invalid text.")
        }
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty || content.count > 50000 {
            throw ProviderError("The provider returned empty or invalid text.")
        }
        return trimmed
    }

    private func performRequest(_ request: URLRequest) async throws -> Data {
        for attempt in 0..<3 {
            let (data, response) = try await session.data(for: request)
            if data.count > 1_000_000 {
                throw ProviderError("The provider response exceeded the size limit.")
            }
            guard let http = response as? HTTPURLResponse else {
                throw ProviderError("Invalid HTTP response.", code: "network")
            }
            if (http.statusCode == 429 || http.statusCode == 503) && attempt < 2 {
                try await Task.sleep(nanoseconds: UInt64(500_000_000 * (attempt + 1)))
                continue
            }
            guard (200..<300).contains(http.statusCode) else {
                throw ProviderError(Self.statusMessage(http.statusCode), code: String(http.statusCode))
            }
            return data
        }
        throw ProviderError("The provider request failed.", code: "network")
    }

    public func transcribe(
        settings: ProviderSettings,
        apiKey: String,
        wavData: Data,
        language: String = "auto",
        hints: [String] = []
    ) async throws -> String {
        let model = settings.model.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !apiKey.isEmpty, !model.isEmpty else {
            throw ProviderError("Configure the speech provider model and API key first.", code: "configuration")
        }
        guard wavData.count >= 44, wavData.count <= 6_750_000,
              String(data: wavData.subdata(in: 0..<4), encoding: .ascii) == "RIFF",
              String(data: wavData.subdata(in: 8..<12), encoding: .ascii) == "WAVE" else {
            throw ProviderError("Expected a valid WAV recording under the upload limit.", code: "audio")
        }

        if settings.kind == .mimo {
            let url = try Self.endpoint(base: settings.baseUrl, suffix: "chat/completions")
            var req = URLRequest(url: url, timeoutInterval: 90)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue(apiKey, forHTTPHeaderField: "api-key")

            let langOpt = ["zh", "en"].contains(language) ? language : "auto"
            let body: [String: Any] = [
                "model": model,
                "messages": [
                    [
                        "role": "user",
                        "content": [
                            [
                                "type": "input_audio",
                                "input_audio": [
                                    "data": "data:audio/wav;base64,\(wavData.base64EncodedString())"
                                ]
                            ]
                        ]
                    ]
                ],
                "asr_options": ["language": langOpt],
                "stream": false
            ]
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
            let data = try await performRequest(req)
            return try Self.extractCompletionText(from: data)
        } else {
            let url = try Self.endpoint(base: settings.baseUrl, suffix: "audio/transcriptions")
            let boundary = "Boundary-\(UUID().uuidString)"
            var req = URLRequest(url: url, timeoutInterval: 90)
            req.httpMethod = "POST"
            req.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
            req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

            var body = Data()
            func appendField(_ name: String, _ value: String) {
                body.append("--\(boundary)\r\n".data(using: .utf8)!)
                body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
                body.append("\(value)\r\n".data(using: .utf8)!)
            }
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"file\"; filename=\"dictation.wav\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: audio/wav\r\n\r\n".data(using: .utf8)!)
            body.append(wavData)
            body.append("\r\n".data(using: .utf8)!)

            appendField("model", model)
            appendField("response_format", "json")
            if language != "auto" && language.count == 2 {
                appendField("language", language)
            }
            if !hints.isEmpty {
                appendField("prompt", hints.joined(separator: ", "))
            }
            if model.hasPrefix("gpt-transcribe") {
                for hint in hints where !hint.contains("<") && !hint.contains(">") && !hint.contains("\n") && !hint.contains("\r") {
                    appendField("keywords[]", hint)
                }
            }
            body.append("--\(boundary)--\r\n".data(using: .utf8)!)
            req.httpBody = body

            let data = try await performRequest(req)
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let text = json["text"] as? String, text.count <= 50000 else {
                throw ProviderError("The speech provider returned an invalid transcript.")
            }
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty {
                throw ProviderError("No speech was recognized.")
            }
            return trimmed
        }
    }

    public func cleanup(
        settings: AppSettings,
        apiKey: String,
        transcript: String,
        vocabulary: [VocabularyHint] = []
    ) async throws -> CleanupResult {
        if !settings.cleanup.enabled {
            return CleanupResult(text: transcript, warning: nil)
        }
        let model = settings.cleanup.model.trimmingCharacters(in: .whitespacesAndNewlines)
        if apiKey.isEmpty || model.isEmpty {
            return CleanupResult(text: transcript, warning: "Text cleanup is not configured. Original transcript is ready.")
        }
        let url = try Self.endpoint(base: settings.cleanup.baseUrl, suffix: "chat/completions")
        var req = URLRequest(url: url, timeoutInterval: 90)
        req.httpMethod = "POST"
        req.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let messages = CleanupPrompt.cleanupMessages(settings: settings, transcript: transcript, vocabulary: vocabulary)
        let payload: [String: Any] = [
            "model": model,
            "messages": messages.map { ["role": $0.role, "content": $0.content] },
            "stream": false
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let data = try await performRequest(req)
        let polished = try Self.extractCompletionText(from: data)
        let warning = CleanupPrompt.semanticWarning(raw: transcript, text: polished)
        return CleanupResult(text: polished, warning: warning)
    }
}
