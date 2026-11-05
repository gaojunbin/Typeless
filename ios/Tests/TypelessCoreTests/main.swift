import Foundation
import TypelessCore

func check(_ condition: @autoclosure () -> Bool, _ message: String) {
    if !condition() {
        fputs("Assertion failed: \(message)\n", stderr)
        exit(1)
    }
}

func runTests() throws {
    // 1. SyncCrypto round-trip & v1:<iv>:<tag>:<cipher> format
    let keyData = SyncCrypto.generateKeyData()
    check(keyData.count == 32, "Generated key must be 32 bytes")
    let secret = "sk-mimo-and-openai-cross-device-secret-999"
    let encrypted = try SyncCrypto.encrypt(secret, keyData: keyData)
    check(encrypted.hasPrefix("v1:"), "Encrypted secret must start with v1:")
    check(!encrypted.contains(secret), "Encrypted secret must not contain plaintext")
    let decrypted = try SyncCrypto.decrypt(encrypted, keyData: keyData)
    check(decrypted == secret, "Decrypted secret must match original")

    // 2. Cross-device iCloud Folder Sync between Mac and iPhone
    let tempRoot = FileManager.default.temporaryDirectory.appendingPathComponent("typeless-ios-test-\(UUID().uuidString)")
    defer { try? FileManager.default.removeItem(at: tempRoot) }

    let macContainer = tempRoot.appendingPathComponent("mac-container", isDirectory: true)
    let iphoneContainer = tempRoot.appendingPathComponent("iphone-container", isDirectory: true)
    let icloudFolder = tempRoot.appendingPathComponent("iCloudDrive/Typeless", isDirectory: true)

    let macStore = SharedStore(containerURL: macContainer)
    var macSettings = macStore.settings
    macSettings.asr = ProviderSettings(kind: .openai, baseUrl: "https://api.openai.com/v1", model: "gpt-4o-transcribe", hasApiKey: true)
    macSettings.cleanup = CleanupSettings(enabled: true, baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", hasApiKey: true)
    macSettings.writing = WritingSettings(strength: .balanced, instructions: "保留英文技术术语", language: "zh")
    macStore.saveSettings(macSettings, asrKey: "sk-mac-asr-key", cleanupKey: "sk-mac-cleanup-key", now: 1000)
    try macStore.saveVocabulary(term: "Typeless", soundsLike: ["tapless", "type less"], now: 1100)
    macStore.recordHistory(
        id: "mac-hist-1",
        startedAt: 1200,
        durationMs: 4200,
        rawText: "嗯，用 tapless 语音输入法",
        text: "用 Typeless 语音输入法。",
        polished: true,
        now: 1200
    )

    try macStore.setSyncFolder(url: icloudFolder, now: 1300)

    let iphoneStore = SharedStore(containerURL: iphoneContainer)
    check(!iphoneStore.settings.asr.hasApiKey, "Fresh iPhone store starts without key")
    try iphoneStore.setSyncFolder(url: icloudFolder, now: 1400)

    check(iphoneStore.settings.asr.hasApiKey, "iPhone store receives ASR key from iCloud folder")
    check(iphoneStore.settings.cleanup.hasApiKey, "iPhone store receives Cleanup key from iCloud folder")
    check(iphoneStore.secret(for: "asr") == "sk-mac-asr-key", "iPhone decrypts Mac ASR key")
    check(iphoneStore.secret(for: "cleanup") == "sk-mac-cleanup-key", "iPhone decrypts Mac Cleanup key")
    check(iphoneStore.settings.asr.model == "gpt-4o-transcribe", "iPhone receives ASR model")
    check(iphoneStore.settings.writing.instructions == "保留英文技术术语", "iPhone receives writing instructions")
    check(iphoneStore.vocabulary.map(\.term) == ["Typeless"], "iPhone receives vocabulary")
    check(iphoneStore.history.map(\.text) == ["用 Typeless 语音输入法。"], "iPhone receives history")

    // iPhone adds a vocabulary term and syncs back to Mac
    try iphoneStore.saveVocabulary(term: "SwiftUI", soundsLike: ["swift ui"], now: 1500)
    try macStore.syncNow(now: 1600)
    check(macStore.vocabulary.map(\.term).sorted() == ["SwiftUI", "Typeless"], "Mac receives iPhone vocabulary")

    // 3. Vocabulary mentions & CleanupPrompt
    check(VocabularyEngine.mentions("Ask Claude to review", "claude"), "Whole-word Latin match")
    check(!VocabularyEngine.mentions("Ask Claudius to review", "claude"), "Reject partial Latin word")
    check(VocabularyEngine.mentions("我用云写了脚本", "云"), "CJK substring match")

    let messages = CleanupPrompt.cleanupMessages(
        settings: AppSettings(),
        transcript: "我用云写了脚本",
        vocabulary: [VocabularyHint(term: "Claude", soundsLike: ["云"])]
    )
    check(messages.first?.content.contains("Editing level: STRONG") == true, "Prompt contains STRONG editing rule")
    check(messages.last?.content.contains("Claude") == true, "Prompt contains vocabulary hint")

    // Optional CLI interop check: if a folder argument is passed, sync into an ephemeral container and verify
    if CommandLine.arguments.count > 2 && CommandLine.arguments[1] == "--verify-sync-folder" {
        let folderURL = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
        let cliStore = SharedStore(containerURL: tempRoot.appendingPathComponent("cli-interop", isDirectory: true))
        try cliStore.setSyncFolder(url: folderURL, now: 5000)
        try cliStore.saveVocabulary(term: "iOSKeyboard", soundsLike: ["ios keyboard"], now: 5100)
        cliStore.recordHistory(
            id: "ios-from-swift",
            startedAt: 5200,
            durationMs: 1800,
            rawText: "来自 iPhone 语音键盘",
            text: "来自 iPhone 语音键盘。",
            polished: true,
            now: 5200
        )
        let result: [String: Any] = [
            "asrKey": cliStore.secret(for: "asr"),
            "cleanupKey": cliStore.secret(for: "cleanup"),
            "asrModel": cliStore.settings.asr.model,
            "vocabulary": cliStore.vocabulary.map(\.term),
            "historyCount": cliStore.history.count
        ]
        let data = try JSONSerialization.data(withJSONObject: result)
        print(String(data: data, encoding: .utf8)!)
        return
    }

    print("TypelessCore iOS self-test passed.")
}

try runTests()
