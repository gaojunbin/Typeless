import SwiftUI
import TypelessCore
import UniformTypeIdentifiers

public struct SettingsView: View {
    @ObservedObject var store: SharedStore

    @State private var showFolderPicker = false
    @State private var asrKind: ProviderKind = .mimo
    @State private var asrBaseUrl: String = ""
    @State private var asrModel: String = ""
    @State private var asrKeyDraft: String = ""

    @State private var cleanupEnabled: Bool = true
    @State private var cleanupBaseUrl: String = ""
    @State private var cleanupModel: String = ""
    @State private var cleanupKeyDraft: String = ""

    @State private var writingStrength: WritingStrength = .balanced
    @State private var writingInstructions: String = ""
    @State private var interfaceLanguage: InterfaceLanguage = .zh
    @State private var saveToast: String? = nil

    private var isZh: Bool { store.settings.language == .zh }

    public init(store: SharedStore) {
        self.store = store
    }

    public var body: some View {
        NavigationStack {
            Form {
                icloudSyncSection
                keyboardSetupSection
                asrProviderSection
                cleanupProviderSection
                generalSection
            }
            .navigationTitle(isZh ? "设置与同步" : "Settings & Sync")
            .onAppear(perform: loadDrafts)
            .fileImporter(
                isPresented: $showFolderPicker,
                allowedContentTypes: [.folder],
                allowsMultipleSelection: false
            ) { result in
                if case .success(let urls) = result, let folderURL = urls.first {
                    do {
                        try store.setSyncFolder(url: folderURL)
                        loadDrafts()
                        showToast(isZh ? "已绑定同步文件夹并完成同步" : "Sync folder linked and synced")
                    } catch {
                        showToast(error.localizedDescription)
                    }
                }
            }
        }
    }

    private var icloudSyncSection: some View {
        Section {
            HStack {
                Label(
                    isZh ? "同步状态" : "Sync status",
                    systemImage: store.syncEnabled ? "checkmark.icloud.fill" : "icloud.slash"
                )
                Spacer()
                Text(store.syncEnabled ? (isZh ? "已开启" : "Active") : (isZh ? "仅本机存储" : "Local only"))
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(store.syncEnabled ? Color.green.opacity(0.14) : Color.secondary.opacity(0.14))
                    .foregroundColor(store.syncEnabled ? .green : .secondary)
                    .clipShape(Capsule())
            }

            if store.syncEnabled {
                VStack(alignment: .leading, spacing: 4) {
                    Text(isZh ? "当前同步文件夹" : "Sync folder")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(store.syncFolderDisplayPath)
                        .font(.subheadline)
                }
            }

            if let err = store.syncError {
                Text(err)
                    .font(.caption)
                    .foregroundColor(.red)
            }

            Button {
                showFolderPicker = true
            } label: {
                Label(
                    store.syncEnabled
                        ? (isZh ? "更换 iCloud 同步文件夹…" : "Change iCloud sync folder…")
                        : (isZh ? "选择 iCloud Drive 同步文件夹…" : "Choose iCloud Drive sync folder…"),
                    systemImage: "folder.badge.gearshape"
                )
            }

            if store.syncEnabled {
                HStack {
                    Button(isZh ? "立即同步" : "Sync now") {
                        try? store.syncNow()
                        loadDrafts()
                        showToast(isZh ? "已完成多设备同步" : "Synchronized")
                    }
                    Spacer()
                    Button(isZh ? "停止同步" : "Turn off sync", role: .destructive) {
                        store.disableSync()
                    }
                }
            }
        } header: {
            Text(isZh ? "iCloud 多设备同步（Mac / iPhone 免重复配置）" : "iCloud Multi-Device Sync")
        } footer: {
            Text(isZh
                 ? "在 Mac 和 iPhone 上选择同一个 iCloud 云盘文件夹（如 iCloud Drive/Typeless），只要在一台设备填好 API 密钥，其他设备会自动解密同步密钥、词库与历史记录。"
                 : "Select the same iCloud Drive folder on your Mac and iPhone. Configure your API key once and all devices sync keys, vocabulary and history automatically.")
        }
    }

    private var keyboardSetupSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                Text(isZh ? "1. 打开「系统设置 → 通用 → 键盘 → 键盘」" : "1. Open Settings → General → Keyboard → Keyboards")
                    .font(.subheadline)
                Text(isZh ? "2. 添加新键盘「Typeless」，并开启「允许完全访问」（用于调用语音识别与润色 API）" : "2. Add 'Typeless' and enable 'Allow Full Access' (required for ASR & polishing API requests)")
                    .font(.subheadline)
                Text(isZh ? "3. 在任意聊天或笔记 App 切换到 Typeless 键盘即可直接语音输入并自动润色上屏。" : "3. Switch to the Typeless keyboard in any app to dictate and insert polished text.")
                    .font(.subheadline)
            }
            .padding(.vertical, 4)
        } header: {
            Text(isZh ? "iOS AI 语音输入法启用指南" : "iOS AI Voice Keyboard Setup")
        }
    }

    private var asrProviderSection: some View {
        Section(isZh ? "语音识别 (ASR)" : "Speech Recognition (ASR)") {
            Picker(isZh ? "语音协议" : "Protocol", selection: $asrKind) {
                Text(isZh ? "小米 MiMo" : "Xiaomi MiMo").tag(ProviderKind.mimo)
                Text(isZh ? "OpenAI 兼容" : "OpenAI-compatible").tag(ProviderKind.openai)
            }
            TextField(isZh ? "服务根地址 (Base URL)" : "Base URL", text: $asrBaseUrl)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            TextField(isZh ? "语音模型名称" : "Model name", text: $asrModel)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            SecureField(
                store.settings.asr.hasApiKey
                    ? (isZh ? "API 密钥（已保存，留空保留）" : "API key (saved, leave blank to keep)")
                    : (isZh ? "输入语音 API 密钥" : "Enter speech API key"),
                text: $asrKeyDraft
            )
            Button(isZh ? "保存语音识别配置" : "Save speech settings") {
                saveASR()
            }
            .fontWeight(.semibold)
        }
    }

    private var cleanupProviderSection: some View {
        Section(isZh ? "文字润色与表达" : "Text Polishing & Writing") {
            Picker(isZh ? "润色程度" : "Polishing level", selection: Binding(
                get: { !cleanupEnabled ? 0 : (writingStrength == .light ? 1 : 2) },
                set: { level in
                    if level == 0 {
                        cleanupEnabled = false
                    } else if level == 1 {
                        cleanupEnabled = true
                        writingStrength = .light
                    } else {
                        cleanupEnabled = true
                        writingStrength = .balanced
                    }
                }
            )) {
                Text(isZh ? "不润色" : "None").tag(0)
                Text(isZh ? "轻度润色" : "Light").tag(1)
                Text(isZh ? "强力润色" : "Strong").tag(2)
            }
            .pickerStyle(.segmented)

            TextField(isZh ? "润色服务地址 (Base URL)" : "Polishing Base URL", text: $cleanupBaseUrl)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            TextField(isZh ? "润色模型名称" : "Polishing model", text: $cleanupModel)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            SecureField(
                store.settings.cleanup.hasApiKey
                    ? (isZh ? "润色密钥（已保存，留空保留）" : "API key (saved, leave blank to keep)")
                    : (isZh ? "输入润色 API 密钥" : "Enter polishing API key"),
                text: $cleanupKeyDraft
            )
            TextField(isZh ? "个人表达说明（如：保留英文技术术语）" : "Personal writing instructions", text: $writingInstructions, axis: .vertical)
                .lineLimit(2...4)

            Button(isZh ? "保存文字润色配置" : "Save polishing settings") {
                saveCleanup()
            }
            .fontWeight(.semibold)
        }
    }

    private var generalSection: some View {
        Section(isZh ? "通用" : "General") {
            Picker(isZh ? "界面语言" : "Language", selection: $interfaceLanguage) {
                Text("中文").tag(InterfaceLanguage.zh)
                Text("English").tag(InterfaceLanguage.en)
            }
            .onChange(of: interfaceLanguage) { newLang in
                var next = store.settings
                next.language = newLang
                store.saveSettings(next)
            }
            if let toast = saveToast {
                Text(toast)
                    .font(.caption)
                    .foregroundColor(.green)
            }
        }
    }

    private func loadDrafts() {
        let s = store.settings
        asrKind = s.asr.kind
        asrBaseUrl = s.asr.baseUrl
        asrModel = s.asr.model
        cleanupEnabled = s.cleanup.enabled
        cleanupBaseUrl = s.cleanup.baseUrl
        cleanupModel = s.cleanup.model
        writingStrength = s.writing.strength
        writingInstructions = s.writing.instructions
        interfaceLanguage = s.language
    }

    private func saveASR() {
        var next = store.settings
        next.asr.kind = asrKind
        next.asr.baseUrl = asrBaseUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        next.asr.model = asrModel.trimmingCharacters(in: .whitespacesAndNewlines)
        let keyArg = asrKeyDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : asrKeyDraft
        store.saveSettings(next, asrKey: keyArg)
        asrKeyDraft = ""
        showToast(isZh ? "语音识别配置已保存" : "Speech settings saved")
    }

    private func saveCleanup() {
        var next = store.settings
        next.cleanup.enabled = cleanupEnabled
        next.cleanup.baseUrl = cleanupBaseUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        next.cleanup.model = cleanupModel.trimmingCharacters(in: .whitespacesAndNewlines)
        next.writing.strength = writingStrength
        next.writing.instructions = writingInstructions.trimmingCharacters(in: .whitespacesAndNewlines)
        let keyArg = cleanupKeyDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : cleanupKeyDraft
        store.saveSettings(next, cleanupKey: keyArg)
        cleanupKeyDraft = ""
        showToast(isZh ? "文字润色配置已保存" : "Polishing settings saved")
    }

    private func showToast(_ text: String) {
        saveToast = text
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            if saveToast == text { saveToast = nil }
        }
    }
}
