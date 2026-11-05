import Foundation

public enum VocabularyEngine {
    public static let maxEntries = 500
    public static let maxTermLength = 64
    public static let maxSoundsLike = 8
    public static let asrHintCount = 20
    public static let asrHintCharacters = 300
    public static let cleanupHintCount = 50
    public static let maxHistoryEntries = 200

    public static func fold(_ value: String) -> String {
        value.precomposedStringWithCompatibilityMapping.lowercased()
    }

    public static func sameWord(_ a: String, _ b: String) -> Bool {
        fold(a) == fold(b)
    }

    public static func mergeVariants(_ current: [String], _ added: [String], term: String) -> [String] {
        let keptCurrent = current.filter { cur in !added.contains(where: { sameWord($0, cur) }) }
        let combined = (keptCurrent + added).filter { !sameWord($0, term) }
        return Array(combined.suffix(maxSoundsLike))
    }

    public static func rankVocabulary(_ entries: [VocabularyEntry]) -> [VocabularyEntry] {
        entries.sorted { a, b in
            if a.hits != b.hits { return a.hits > b.hits }
            if a.lastUsedAt != b.lastUsedAt { return a.lastUsedAt > b.lastUsedAt }
            if a.updatedAt != b.updatedAt { return a.updatedAt > b.updatedAt }
            return a.createdAt > b.createdAt
        }
    }

    public static func rankHistory(_ entries: [DictationHistoryEntry]) -> [DictationHistoryEntry] {
        Array(entries.sorted { a, b in
            if a.startedAt != b.startedAt { return a.startedAt > b.startedAt }
            return a.updatedAt > b.updatedAt
        }.prefix(maxHistoryEntries))
    }

    private static func isLatinOrDigit(_ scalar: UnicodeScalar) -> Bool {
        CharacterSet.alphanumerics.contains(scalar) && scalar.isASCII
    }

    public static func mentions(_ text: String, _ value: String) -> Bool {
        let haystack = fold(text)
        let needle = fold(value)
        guard !needle.isEmpty else { return false }
        var searchRange = haystack.startIndex..<haystack.endIndex
        while let range = haystack.range(of: needle, options: [], range: searchRange) {
            let beforeOK: Bool = {
                guard let firstScalar = needle.unicodeScalars.first, isLatinOrDigit(firstScalar),
                      range.lowerBound > haystack.startIndex else { return true }
                let prevIndex = haystack.index(before: range.lowerBound)
                guard let prevScalar = haystack[prevIndex].unicodeScalars.first else { return true }
                return !isLatinOrDigit(prevScalar)
            }()
            let afterOK: Bool = {
                guard let lastScalar = needle.unicodeScalars.last, isLatinOrDigit(lastScalar),
                      range.upperBound < haystack.endIndex else { return true }
                guard let nextScalar = haystack[range.upperBound].unicodeScalars.first else { return true }
                return !isLatinOrDigit(nextScalar)
            }()
            if beforeOK && afterOK { return true }
            let nextStart = haystack.index(after: range.lowerBound)
            if nextStart >= haystack.endIndex { break }
            searchRange = nextStart..<haystack.endIndex
        }
        return false
    }

    public static func asrHints(_ entries: [VocabularyEntry]) -> [String] {
        var hints: [String] = []
        var length = 0
        for entry in rankVocabulary(entries) {
            if hints.count >= asrHintCount || length + entry.term.count > asrHintCharacters { break }
            hints.append(entry.term)
            length += entry.term.count + 2
        }
        return hints
    }

    public static func cleanupVocabulary(_ entries: [VocabularyEntry], transcript: String) -> [VocabularyHint] {
        let ranked = rankVocabulary(entries)
        let heard = ranked.filter { entry in
            mentions(transcript, entry.term) || entry.soundsLike.contains(where: { mentions(transcript, $0) })
        }
        let heardIds = Set(heard.map(\.id))
        let rest = ranked.filter { !heardIds.contains($0.id) }
        return Array((heard + rest).prefix(cleanupHintCount)).map { entry in
            VocabularyHint(term: entry.term, soundsLike: entry.soundsLike.isEmpty ? nil : entry.soundsLike)
        }
    }

    public static func usedEntryIds(_ entries: [VocabularyEntry], text: String) -> [String] {
        entries.filter { mentions(text, $0.term) }.map(\.id)
    }

    public static func mergeTombstones(_ a: [String: Int64], _ b: [String: Int64]) -> [String: Int64] {
        var merged = a
        for (id, ts) in b {
            merged[id] = max(merged[id] ?? 0, ts)
        }
        return merged
    }

    public static func mergeVocabularyWithTombstones(
        local: [VocabularyEntry],
        remote: [VocabularyEntry],
        deletedIds: [String: Int64]
    ) -> [VocabularyEntry] {
        var byId: [String: VocabularyEntry] = [:]
        func ingest(_ entry: VocabularyEntry) {
            if let deletedAt = deletedIds[entry.id], deletedAt >= entry.updatedAt { return }
            let existing = byId[entry.id] ?? byId.values.first(where: { sameWord($0.term, entry.term) })
            guard let existingEntry = existing else {
                byId[entry.id] = entry
                return
            }
            let newer = entry.updatedAt >= existingEntry.updatedAt ? entry : existingEntry
            let older = newer.id == entry.id && newer.updatedAt == entry.updatedAt ? existingEntry : entry
            let combined = VocabularyEntry(
                id: existingEntry.id,
                term: newer.term,
                soundsLike: mergeVariants(older.soundsLike, newer.soundsLike, term: newer.term),
                hits: max(existingEntry.hits, entry.hits),
                lastUsedAt: max(existingEntry.lastUsedAt, entry.lastUsedAt),
                createdAt: min(existingEntry.createdAt, entry.createdAt),
                updatedAt: max(existingEntry.updatedAt, entry.updatedAt)
            )
            byId[existingEntry.id] = combined
        }
        for item in local { ingest(item) }
        for item in remote { ingest(item) }
        return Array(rankVocabulary(Array(byId.values)).prefix(maxEntries))
    }

    public static func mergeHistoryWithTombstones(
        local: [DictationHistoryEntry],
        remote: [DictationHistoryEntry],
        deletedIds: [String: Int64]
    ) -> [DictationHistoryEntry] {
        var byId: [String: DictationHistoryEntry] = [:]
        func ingest(_ entry: DictationHistoryEntry) {
            if let deletedAt = deletedIds[entry.id], deletedAt >= entry.updatedAt { return }
            if let existing = byId[entry.id] {
                if entry.updatedAt >= existing.updatedAt {
                    byId[entry.id] = entry
                }
            } else {
                byId[entry.id] = entry
            }
        }
        for item in local { ingest(item) }
        for item in remote { ingest(item) }
        return rankHistory(Array(byId.values))
    }
}
