import Combine
import Foundation

public final class SharedStore: ObservableObject {
    public static let appGroupIdentifier = "group.dev.typeless.ios"
    public static let syncBundleFileName = "typeless-sync.json"
    public static let syncKeyFileName = "typeless-key.json"

    @Published public private(set) var settings: AppSettings = AppSettings()
    @Published public private(set) var vocabulary: [VocabularyEntry] = []
    @Published public private(set) var history: [DictationHistoryEntry] = []
    @Published public private(set) var syncEnabled: Bool = false
    @Published public private(set) var syncFolderDisplayPath: String = ""
    @Published public private(set) var lastSyncedAt: Int64? = nil
    @Published public private(set) var syncError: String? = nil

    private let containerURL: URL
    private var secrets: [String: String] = [:]
    private var configUpdatedAt: Int64 = 0
    private var deletedVocabularyIds: [String: Int64] = [:]
    private var deletedHistoryIds: [String: Int64] = [:]
    private var syncFolderURL: URL? = nil
    private var syncBookmarkData: Data? = nil

    private struct LocalContainerFile: Codable {
        var version: Int = 1
        var configUpdatedAt: Int64
        var settings: AppSettings
        var secrets: [String: String]
        var vocabulary: [VocabularyEntry]
        var deletedVocabularyIds: [String: Int64]
        var history: [DictationHistoryEntry]
        var deletedHistoryIds: [String: Int64]
        var syncEnabled: Bool
        var syncFolderDisplayPath: String
        var syncFolderPath: String?
        var syncBookmarkData: Data?
        var lastSyncedAt: Int64?
    }

    private var localStateFileURL: URL {
        containerURL.appendingPathComponent("typeless-local-state.json")
    }

    public init(containerURL: URL? = nil) {
        if let customURL = containerURL {
            self.containerURL = customURL
        } else if let groupURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Self.appGroupIdentifier) {
            self.containerURL = groupURL
        } else {
            let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
            self.containerURL = support.appendingPathComponent("Typeless", isDirectory: true)
        }
        try? FileManager.default.createDirectory(at: self.containerURL, withIntermediateDirectories: true)
        loadFromContainer()
        if syncEnabled {
            _ = try? syncNow()
        }
    }

    public func reloadFromAppGroup() {
        loadFromContainer()
    }

    private func loadFromContainer() {
        guard FileManager.default.fileExists(atPath: localStateFileURL.path),
              let data = try? Data(contentsOf: localStateFileURL),
              let saved = try? JSONDecoder().decode(LocalContainerFile.self, from: data) else {
            return
        }
        self.configUpdatedAt = saved.configUpdatedAt
        self.secrets = saved.secrets
        var loadedSettings = saved.settings
        loadedSettings.asr.hasApiKey = !(saved.secrets["asr"] ?? "").isEmpty
        loadedSettings.cleanup.hasApiKey = !(saved.secrets["cleanup"] ?? "").isEmpty
        self.settings = loadedSettings
        self.vocabulary = VocabularyEngine.rankVocabulary(saved.vocabulary)
        self.deletedVocabularyIds = saved.deletedVocabularyIds
        self.history = VocabularyEngine.rankHistory(saved.history)
        self.deletedHistoryIds = saved.deletedHistoryIds
        self.syncEnabled = saved.syncEnabled
        self.syncFolderDisplayPath = saved.syncFolderDisplayPath
        self.syncBookmarkData = saved.syncBookmarkData
        self.lastSyncedAt = saved.lastSyncedAt

        if let bookmark = saved.syncBookmarkData {
            var isStale = false
            if let resolved = try? URL(resolvingBookmarkData: bookmark, bookmarkDataIsStale: &isStale) {
                self.syncFolderURL = resolved
            }
        }
        if self.syncFolderURL == nil, let path = saved.syncFolderPath, !path.isEmpty {
            self.syncFolderURL = URL(fileURLWithPath: path, isDirectory: true)
        }
    }

    private func persistToContainer() {
        try? FileManager.default.createDirectory(at: containerURL, withIntermediateDirectories: true)
        var cleanSettings = settings
        cleanSettings.asr.hasApiKey = !(secrets["asr"] ?? "").isEmpty
        cleanSettings.cleanup.hasApiKey = !(secrets["cleanup"] ?? "").isEmpty
        self.settings = cleanSettings

        let payload = LocalContainerFile(
            configUpdatedAt: configUpdatedAt,
            settings: cleanSettings,
            secrets: secrets,
            vocabulary: vocabulary,
            deletedVocabularyIds: deletedVocabularyIds,
            history: history,
            deletedHistoryIds: deletedHistoryIds,
            syncEnabled: syncEnabled,
            syncFolderDisplayPath: syncFolderDisplayPath,
            syncFolderPath: syncFolderURL?.path,
            syncBookmarkData: syncBookmarkData,
            lastSyncedAt: lastSyncedAt
        )
        if let data = try? JSONEncoder().encode(payload) {
            let tmp = localStateFileURL.appendingPathExtension("tmp")
            try? data.write(to: tmp, options: .atomic)
            _ = try? FileManager.default.replaceItemAt(localStateFileURL, withItemAt: tmp)
        }
    }

    public func secret(for key: String) -> String {
        secrets[key] ?? ""
    }

    public func saveSettings(_ updated: AppSettings, asrKey: String? = nil, cleanupKey: String? = nil, now: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) {
        if updated.asr.baseUrl != settings.asr.baseUrl || updated.asr.kind != settings.asr.kind {
            if asrKey == nil { secrets.removeValue(forKey: "asr") }
        }
        if updated.cleanup.baseUrl != settings.cleanup.baseUrl {
            if cleanupKey == nil { secrets.removeValue(forKey: "cleanup") }
        }
        if let asrKey = asrKey {
            let trimmed = asrKey.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty { secrets.removeValue(forKey: "asr") }
            else { secrets["asr"] = trimmed }
        }
        if let cleanupKey = cleanupKey {
            let trimmed = cleanupKey.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty { secrets.removeValue(forKey: "cleanup") }
            else { secrets["cleanup"] = trimmed }
        }
        var next = updated
        next.asr.hasApiKey = !(secrets["asr"] ?? "").isEmpty
        next.cleanup.hasApiKey = !(secrets["cleanup"] ?? "").isEmpty
        self.settings = next
        self.configUpdatedAt = now
        persistToContainer()
        if syncEnabled {
            _ = try? syncNow(now: now)
        }
    }

    @discardableResult
    public func saveVocabulary(id: String? = nil, term: String, soundsLike: [String], now: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) throws -> VocabularyEntry {
        let trimmedTerm = term.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedTerm.isEmpty, trimmedTerm.count <= VocabularyEngine.maxTermLength else {
            throw NSError(domain: "Typeless", code: 1, userInfo: [NSLocalizedDescriptionKey: "Word must be 1–64 characters."])
        }
        let cleanedVariants = soundsLike
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty && !VocabularyEngine.sameWord($0, trimmedTerm) }

        var list = vocabulary
        let saved: VocabularyEntry
        if let id = id, let idx = list.firstIndex(where: { $0.id == id }) {
            list[idx].term = trimmedTerm
            list[idx].soundsLike = Array(cleanedVariants.prefix(VocabularyEngine.maxSoundsLike))
            list[idx].updatedAt = now
            saved = list[idx]
        } else if let idx = list.firstIndex(where: { VocabularyEngine.sameWord($0.term, trimmedTerm) }) {
            list[idx].term = trimmedTerm
            list[idx].soundsLike = VocabularyEngine.mergeVariants(list[idx].soundsLike, cleanedVariants, term: trimmedTerm)
            list[idx].updatedAt = now
            saved = list[idx]
        } else {
            let entry = VocabularyEntry(
                id: UUID().uuidString.lowercased(),
                term: trimmedTerm,
                soundsLike: Array(cleanedVariants.prefix(VocabularyEngine.maxSoundsLike)),
                hits: 0,
                lastUsedAt: 0,
                createdAt: now,
                updatedAt: now
            )
            list.append(entry)
            saved = entry
        }
        deletedVocabularyIds.removeValue(forKey: saved.id)
        vocabulary = VocabularyEngine.rankVocabulary(list)
        persistToContainer()
        if syncEnabled {
            _ = try? syncNow(now: now)
        }
        return saved
    }

    public func deleteVocabulary(id: String, now: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) {
        vocabulary.removeAll { $0.id == id }
        deletedVocabularyIds[id] = now
        persistToContainer()
        if syncEnabled {
            _ = try? syncNow(now: now)
        }
    }

    public func recordVocabularyHits(_ ids: [String], now: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) {
        guard !ids.isEmpty else { return }
        let idSet = Set(ids)
        vocabulary = VocabularyEngine.rankVocabulary(vocabulary.map { entry in
            guard idSet.contains(entry.id) else { return entry }
            var updated = entry
            updated.hits += 1
            updated.lastUsedAt = now
            updated.updatedAt = max(updated.updatedAt, now)
            return updated
        })
        persistToContainer()
        if syncEnabled {
            _ = try? syncNow(now: now)
        }
    }

    @discardableResult
    public func recordHistory(
        id: String = UUID().uuidString.lowercased(),
        startedAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000),
        durationMs: Int,
        rawText: String,
        text: String,
        polished: Bool,
        now: Int64 = Int64(Date().timeIntervalSince1970 * 1000)
    ) -> DictationHistoryEntry {
        let entry = DictationHistoryEntry(
            id: id,
            startedAt: startedAt,
            durationMs: max(0, durationMs),
            rawText: rawText,
            text: text,
            polished: polished,
            updatedAt: now
        )
        deletedHistoryIds.removeValue(forKey: entry.id)
        var list = history.filter { $0.id != entry.id }
        list.insert(entry, at: 0)
        history = VocabularyEngine.rankHistory(list)
        persistToContainer()
        if syncEnabled {
            _ = try? syncNow(now: now)
        }
        return entry
    }

    public func deleteHistory(id: String, now: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) {
        history.removeAll { $0.id == id }
        deletedHistoryIds[id] = now
        persistToContainer()
        if syncEnabled {
            _ = try? syncNow(now: now)
        }
    }

    public func clearHistory(now: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) {
        for item in history {
            deletedHistoryIds[item.id] = now
        }
        history = []
        persistToContainer()
        if syncEnabled {
            _ = try? syncNow(now: now)
        }
    }

    /// Configures the iCloud Drive or custom folder URL selected by the user.
    public func setSyncFolder(url: URL, now: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) throws {
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }

        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        self.syncFolderURL = url
        self.syncBookmarkData = try? url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil)
        self.syncFolderDisplayPath = url.lastPathComponent == "Typeless" ? "iCloud Drive / Typeless" : url.path
        self.syncEnabled = true
        self.syncError = nil
        try syncNow(now: now, initialLink: true)
    }

    public func disableSync() {
        self.syncEnabled = false
        self.syncError = nil
        persistToContainer()
    }

    private func loadOrCreateSyncKey(in folderURL: URL) throws -> Data {
        let keyURL = folderURL.appendingPathComponent(Self.syncKeyFileName)
        try? FileManager.default.startDownloadingUbiquitousItem(at: keyURL)
        if FileManager.default.fileExists(atPath: keyURL.path) {
            let data = try Data(contentsOf: keyURL)
            let decoded = try JSONDecoder().decode(SyncKeyFile.self, from: data)
            guard let keyBytes = Data(base64Encoded: decoded.key), keyBytes.count == 32 else {
                throw SyncCryptoError.invalidKeyLength
            }
            return keyBytes
        }
        let keyBytes = SyncCrypto.generateKeyData()
        let keyFile = SyncKeyFile(version: 1, key: keyBytes.base64EncodedString())
        let encoded = try JSONEncoder().encode(keyFile)
        try encoded.write(to: keyURL, options: .atomic)
        return keyBytes
    }

    private func readRemoteBundle(in folderURL: URL) throws -> SyncBundle? {
        let bundleURL = folderURL.appendingPathComponent(Self.syncBundleFileName)
        try? FileManager.default.startDownloadingUbiquitousItem(at: bundleURL)
        guard FileManager.default.fileExists(atPath: bundleURL.path) else {
            return nil
        }
        let data = try Data(contentsOf: bundleURL)
        return try JSONDecoder().decode(SyncBundle.self, from: data)
    }

    private func writeRemoteBundle(_ bundle: SyncBundle, in folderURL: URL) throws {
        let bundleURL = folderURL.appendingPathComponent(Self.syncBundleFileName)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try encoder.encode(bundle)
        try data.write(to: bundleURL, options: .atomic)
    }

    /// Performs a bidirectional merge with `<syncFolder>/typeless-sync.json`, identical to Desktop `Store.syncNow`.
    @discardableResult
    public func syncNow(now: Int64 = Int64(Date().timeIntervalSince1970 * 1000), initialLink: Bool = false) throws -> Bool {
        guard syncEnabled, let folderURL = syncFolderURL else { return false }
        let accessed = folderURL.startAccessingSecurityScopedResource()
        defer { if accessed { folderURL.stopAccessingSecurityScopedResource() } }

        do {
            try FileManager.default.createDirectory(at: folderURL, withIntermediateDirectories: true)
            let keyData = try loadOrCreateSyncKey(in: folderURL)
            let remote = try readRemoteBundle(in: folderURL)

            let mergedVocabTombstones = VocabularyEngine.mergeTombstones(deletedVocabularyIds, remote?.deletedVocabularyIds ?? [:])
            let mergedHistoryTombstones = VocabularyEngine.mergeTombstones(deletedHistoryIds, remote?.deletedHistoryIds ?? [:])
            let mergedVocabulary = VocabularyEngine.mergeVocabularyWithTombstones(
                local: vocabulary,
                remote: remote?.vocabulary ?? [],
                deletedIds: mergedVocabTombstones
            )
            let mergedHistory = VocabularyEngine.mergeHistoryWithTombstones(
                local: history,
                remote: remote?.history ?? [],
                deletedIds: mergedHistoryTombstones
            )

            var nextSettings = settings
            var nextSecrets = secrets
            var nextConfigUpdatedAt = configUpdatedAt > 0 ? configUpdatedAt : now
            var encryptedSecretsForBundle: [String: String] = [:]

            let localHasKeys = !(secrets["asr"] ?? "").isEmpty || !(secrets["cleanup"] ?? "").isEmpty
            let remoteHasKeys = remote != nil && (!(remote!.config.secrets["asr"] ?? "").isEmpty || !(remote!.config.secrets["cleanup"] ?? "").isEmpty)
            let useRemoteConfig = remote != nil && (
                (initialLink && remoteHasKeys && !localHasKeys) ||
                (!(initialLink && localHasKeys && !remoteHasKeys) && remote!.config.updatedAt > configUpdatedAt)
            )

            if useRemoteConfig, let remote = remote {
                nextConfigUpdatedAt = remote.config.updatedAt
                nextSettings.asr = ProviderSettings(
                    kind: remote.config.asr.kind,
                    baseUrl: remote.config.asr.baseUrl,
                    model: remote.config.asr.model,
                    hasApiKey: false
                )
                nextSettings.cleanup = CleanupSettings(
                    enabled: remote.config.cleanup.enabled,
                    baseUrl: remote.config.cleanup.baseUrl,
                    model: remote.config.cleanup.model,
                    hasApiKey: false
                )
                nextSettings.writing = WritingSettings(
                    strength: remote.config.writing.strength,
                    instructions: remote.config.writing.instructions,
                    language: remote.config.writing.language
                )
                nextSecrets = [:]
                for key in ["asr", "cleanup"] {
                    if let enc = remote.config.secrets[key], !enc.isEmpty {
                        let plain = try SyncCrypto.decrypt(enc, keyData: keyData)
                        nextSecrets[key] = plain
                        encryptedSecretsForBundle[key] = enc
                    }
                }
            } else {
                for key in ["asr", "cleanup"] {
                    if let plain = secrets[key], !plain.isEmpty {
                        encryptedSecretsForBundle[key] = try SyncCrypto.encrypt(plain, keyData: keyData)
                    }
                }
            }

            nextSettings.asr.hasApiKey = !(nextSecrets["asr"] ?? "").isEmpty
            nextSettings.cleanup.hasApiKey = !(nextSecrets["cleanup"] ?? "").isEmpty

            let changed = nextSettings != settings || nextSecrets != secrets || mergedVocabulary != vocabulary || mergedHistory != history

            self.settings = nextSettings
            self.secrets = nextSecrets
            self.configUpdatedAt = nextConfigUpdatedAt
            self.deletedVocabularyIds = mergedVocabTombstones
            self.deletedHistoryIds = mergedHistoryTombstones
            self.vocabulary = mergedVocabulary
            self.history = mergedHistory
            self.lastSyncedAt = now
            self.syncError = nil
            persistToContainer()

            let bundle = SyncBundle(
                version: 1,
                updatedAt: now,
                config: SharedProviderConfig(
                    updatedAt: nextConfigUpdatedAt,
                    asr: .init(kind: nextSettings.asr.kind, baseUrl: nextSettings.asr.baseUrl, model: nextSettings.asr.model),
                    cleanup: .init(enabled: nextSettings.cleanup.enabled, baseUrl: nextSettings.cleanup.baseUrl, model: nextSettings.cleanup.model),
                    writing: .init(strength: nextSettings.writing.strength, instructions: nextSettings.writing.instructions, language: nextSettings.writing.language),
                    secrets: encryptedSecretsForBundle
                ),
                vocabulary: mergedVocabulary,
                deletedVocabularyIds: mergedVocabTombstones,
                history: mergedHistory,
                deletedHistoryIds: mergedHistoryTombstones
            )
            try writeRemoteBundle(bundle, in: folderURL)
            return changed
        } catch {
            self.syncError = error.localizedDescription
            persistToContainer()
            throw error
        }
    }
}
