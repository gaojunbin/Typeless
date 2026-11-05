import Foundation

public enum ProviderKind: String, Codable, CaseIterable, Sendable {
    case mimo
    case openai
}

public enum WritingStrength: String, Codable, CaseIterable, Sendable {
    case light
    case balanced
}

public enum InterfaceLanguage: String, Codable, CaseIterable, Sendable {
    case zh
    case en
}

public struct ProviderSettings: Codable, Equatable, Sendable {
    public var kind: ProviderKind
    public var baseUrl: String
    public var model: String
    public var hasApiKey: Bool

    public init(kind: ProviderKind = .mimo, baseUrl: String = "https://api.xiaomimimo.com/v1", model: String = "mimo-v2.5-asr", hasApiKey: Bool = false) {
        self.kind = kind
        self.baseUrl = baseUrl
        self.model = model
        self.hasApiKey = hasApiKey
    }
}

public struct CleanupSettings: Codable, Equatable, Sendable {
    public var enabled: Bool
    public var baseUrl: String
    public var model: String
    public var hasApiKey: Bool

    public init(enabled: Bool = true, baseUrl: String = "https://api.openai.com/v1", model: String = "", hasApiKey: Bool = false) {
        self.enabled = enabled
        self.baseUrl = baseUrl
        self.model = model
        self.hasApiKey = hasApiKey
    }
}

public struct WritingSettings: Codable, Equatable, Sendable {
    public var strength: WritingStrength
    public var instructions: String
    public var language: String

    public init(strength: WritingStrength = .balanced, instructions: String = "", language: String = "auto") {
        self.strength = strength
        self.instructions = instructions
        self.language = language
    }
}

public struct AppSettings: Codable, Equatable, Sendable {
    public var asr: ProviderSettings
    public var cleanup: CleanupSettings
    public var writing: WritingSettings
    public var language: InterfaceLanguage
    public var maxDurationSeconds: Int
    public var interactionSounds: Bool
    public var autoInsertInKeyboard: Bool

    public init(
        asr: ProviderSettings = ProviderSettings(),
        cleanup: CleanupSettings = CleanupSettings(),
        writing: WritingSettings = WritingSettings(),
        language: InterfaceLanguage = .zh,
        maxDurationSeconds: Int = 60,
        interactionSounds: Bool = true,
        autoInsertInKeyboard: Bool = true
    ) {
        self.asr = asr
        self.cleanup = cleanup
        self.writing = writing
        self.language = language
        self.maxDurationSeconds = maxDurationSeconds
        self.interactionSounds = interactionSounds
        self.autoInsertInKeyboard = autoInsertInKeyboard
    }
}

public struct VocabularyEntry: Codable, Equatable, Identifiable, Sendable {
    public var id: String
    public var term: String
    public var soundsLike: [String]
    public var hits: Int
    public var lastUsedAt: Int64
    public var createdAt: Int64
    public var updatedAt: Int64

    public init(
        id: String = UUID().uuidString.lowercased(),
        term: String,
        soundsLike: [String] = [],
        hits: Int = 0,
        lastUsedAt: Int64 = 0,
        createdAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000),
        updatedAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000)
    ) {
        self.id = id
        self.term = term
        self.soundsLike = soundsLike
        self.hits = hits
        self.lastUsedAt = lastUsedAt
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

public struct VocabularyHint: Codable, Equatable, Sendable {
    public var term: String
    public var soundsLike: [String]?

    public init(term: String, soundsLike: [String]? = nil) {
        self.term = term
        self.soundsLike = (soundsLike?.isEmpty == false) ? soundsLike : nil
    }
}

public struct DictationHistoryEntry: Codable, Equatable, Identifiable, Sendable {
    public var id: String
    public var startedAt: Int64
    public var durationMs: Int
    public var rawText: String
    public var text: String
    public var polished: Bool
    public var updatedAt: Int64

    public init(
        id: String = UUID().uuidString.lowercased(),
        startedAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000),
        durationMs: Int,
        rawText: String,
        text: String,
        polished: Bool,
        updatedAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000)
    ) {
        self.id = id
        self.startedAt = startedAt
        self.durationMs = durationMs
        self.rawText = rawText
        self.text = text
        self.polished = polished
        self.updatedAt = updatedAt
    }
}

/// Wire-compatible with Desktop `src/core/sync.ts` (`typeless-key.json`).
public struct SyncKeyFile: Codable, Equatable, Sendable {
    public var version: Int
    public var key: String
    public var createdAt: Int64

    public init(version: Int = 1, key: String, createdAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) {
        self.version = version
        self.key = key
        self.createdAt = createdAt
    }
}

/// Wire-compatible with Desktop `src/core/sync.ts` (`SharedProviderConfig`).
public struct SharedProviderConfig: Codable, Equatable, Sendable {
    public struct SharedASR: Codable, Equatable, Sendable {
        public var kind: ProviderKind
        public var baseUrl: String
        public var model: String
        public init(kind: ProviderKind, baseUrl: String, model: String) {
            self.kind = kind
            self.baseUrl = baseUrl
            self.model = model
        }
    }

    public struct SharedCleanup: Codable, Equatable, Sendable {
        public var enabled: Bool
        public var baseUrl: String
        public var model: String
        public init(enabled: Bool, baseUrl: String, model: String) {
            self.enabled = enabled
            self.baseUrl = baseUrl
            self.model = model
        }
    }

    public struct SharedWriting: Codable, Equatable, Sendable {
        public var strength: WritingStrength
        public var instructions: String
        public var language: String
        public init(strength: WritingStrength, instructions: String, language: String) {
            self.strength = strength
            self.instructions = instructions
            self.language = language
        }
    }

    public var updatedAt: Int64
    public var asr: SharedASR
    public var cleanup: SharedCleanup
    public var writing: SharedWriting
    public var secrets: [String: String]

    public init(updatedAt: Int64, asr: SharedASR, cleanup: SharedCleanup, writing: SharedWriting, secrets: [String: String]) {
        self.updatedAt = updatedAt
        self.asr = asr
        self.cleanup = cleanup
        self.writing = writing
        self.secrets = secrets
    }
}

/// Wire-compatible with Desktop `src/core/sync.ts` (`typeless-sync.json`).
public struct SyncBundle: Codable, Equatable, Sendable {
    public var version: Int
    public var updatedAt: Int64
    public var config: SharedProviderConfig
    public var vocabulary: [VocabularyEntry]
    public var deletedVocabularyIds: [String: Int64]
    public var history: [DictationHistoryEntry]
    public var deletedHistoryIds: [String: Int64]

    public init(
        version: Int = 1,
        updatedAt: Int64,
        config: SharedProviderConfig,
        vocabulary: [VocabularyEntry],
        deletedVocabularyIds: [String: Int64] = [:],
        history: [DictationHistoryEntry],
        deletedHistoryIds: [String: Int64] = [:]
    ) {
        self.version = version
        self.updatedAt = updatedAt
        self.config = config
        self.vocabulary = vocabulary
        self.deletedVocabularyIds = deletedVocabularyIds
        self.history = history
        self.deletedHistoryIds = deletedHistoryIds
    }
}

public enum SessionStatus: String, Codable, Sendable {
    case idle
    case arming
    case recording
    case transcribing
    case polishing
    case ready
    case error
    case cancelled
}
