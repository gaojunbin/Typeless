import SwiftUI
import TypelessCore
#if canImport(UIKit)
import UIKit
#endif

public struct HomeView: View {
    @ObservedObject var store: SharedStore
    @ObservedObject var coordinator: DictationCoordinator
    let openSettings: () -> Void

    @State private var showRaw = false
    @State private var copied = false
    @State private var showCorrectionSheet = false
    @State private var heardDraft = ""
    @State private var termDraft = ""

    private var isZh: Bool { store.settings.language == .zh }
    private var configured: Bool {
        store.settings.asr.hasApiKey && !store.settings.asr.model.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    dictationCard
                    if coordinator.status == .error, let err = coordinator.errorMessage {
                        errorCard(err)
                    }
                    if !coordinator.text.isEmpty || !coordinator.rawText.isEmpty {
                        resultCard
                    }
                    statusSummaryList
                }
                .padding(16)
            }
            .background(Color(white: 0.97))
            .navigationTitle(isZh ? "说话，不打字" : "Speak, don’t type")
            .sheet(isPresented: $showCorrectionSheet) {
                correctionSheet
            }
        }
    }

    private var dictationCard: some View {
        VStack(spacing: 16) {
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(coordinator.status == .recording ? Color.red : Color.black)
                        .frame(width: 52, height: 52)
                    if coordinator.status == .transcribing || coordinator.status == .polishing {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: coordinator.status == .recording ? "stop.fill" : "mic.fill")
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundColor(.white)
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(statusTitle)
                        .font(.headline)
                    Text(statusSubtitle)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button {
                    if !configured && coordinator.status != .recording {
                        openSettings()
                    } else {
                        coordinator.toggle()
                    }
                } label: {
                    Text(buttonLabel)
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.black)
                        .foregroundColor(.white)
                        .clipShape(Capsule())
                }
                .disabled(coordinator.status == .transcribing || coordinator.status == .polishing)

                if coordinator.status == .recording || coordinator.status == .transcribing || coordinator.status == .polishing {
                    Button {
                        coordinator.cancel()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .semibold))
                            .padding(10)
                            .background(Color.secondary.opacity(0.14))
                            .clipShape(Circle())
                    }
                }
            }

            if coordinator.status == .recording {
                WaveformBarView(level: coordinator.level, barCount: 32)
                    .frame(height: 32)
            }
        }
        .padding(18)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(Color.black.opacity(0.08), lineWidth: 1)
        )
    }

    private func errorCard(_ message: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.orange)
            Text(message)
                .font(.subheadline)
            Spacer()
            Button(isZh ? "去配置" : "Settings") {
                openSettings()
            }
            .buttonStyle(.bordered)
        }
        .padding(14)
        .background(Color.orange.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var resultCard: some View {
        let hasDifferent = !coordinator.rawText.isEmpty && !coordinator.text.isEmpty && coordinator.rawText != coordinator.text
        let displayed = (hasDifferent && showRaw) ? coordinator.rawText : (coordinator.text.isEmpty ? coordinator.rawText : coordinator.text)

        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                if hasDifferent {
                    Picker("", selection: $showRaw) {
                        Text(isZh ? "整理后" : "Polished").tag(false)
                        Text(isZh ? "原文" : "Original").tag(true)
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 160)
                } else {
                    Text(isZh ? "本次听写" : "This dictation")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Button(isZh ? "纠错" : "Correct") {
                    heardDraft = ""
                    termDraft = ""
                    showCorrectionSheet = true
                }
                .font(.subheadline.weight(.medium))

                Button {
                    copyToPasteboard(displayed)
                } label: {
                    Label(copied ? (isZh ? "已复制" : "Copied") : (isZh ? "复制" : "Copy"), systemImage: copied ? "checkmark" : "doc.on.doc")
                        .font(.subheadline.weight(.medium))
                }
            }

            Text(displayed)
                .font(.body)
                .lineSpacing(4)
                .textSelection(.enabled)

            if let warn = coordinator.warning {
                Text(warn)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(18)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(Color.black.opacity(0.08), lineWidth: 1)
        )
    }

    private var statusSummaryList: some View {
        VStack(spacing: 0) {
            statusRow(
                icon: "mic",
                title: isZh ? "语音识别" : "Speech recognition",
                detail: configured
                    ? "\(store.settings.asr.kind == .mimo ? "Xiaomi MiMo" : "OpenAI") · \(store.settings.asr.model)"
                    : (isZh ? "待配置或从 iCloud 同步" : "Not configured"),
                ok: configured
            )
            Divider()
            let cleanupOk = !store.settings.cleanup.enabled || (store.settings.cleanup.hasApiKey && !store.settings.cleanup.model.isEmpty)
            statusRow(
                icon: "wand.and.stars",
                title: isZh ? "文字润色" : "Text polishing",
                detail: !store.settings.cleanup.enabled
                    ? (isZh ? "不润色" : "No polishing")
                    : (store.settings.writing.strength == .light ? (isZh ? "轻度润色" : "Light") : (isZh ? "强力润色" : "Strong")),
                ok: cleanupOk
            )
            Divider()
            statusRow(
                icon: "icloud",
                title: isZh ? "iCloud 多设备同步" : "iCloud Sync",
                detail: store.syncEnabled ? store.syncFolderDisplayPath : (isZh ? "未启用（点击绑定同一 iCloud 文件夹免配置同步）" : "Tap to link iCloud Drive folder"),
                ok: store.syncEnabled
            )
        }
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.black.opacity(0.08), lineWidth: 1)
        )
    }

    private func statusRow(icon: String, title: String, detail: String, ok: Bool) -> some View {
        Button(action: openSettings) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .frame(width: 22)
                    .foregroundColor(.secondary)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.primary)
                    Text(detail)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
                Spacer()
                Text(ok ? (isZh ? "已就绪" : "Ready") : (isZh ? "去设置" : "Setup"))
                    .font(.caption.weight(.medium))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(ok ? Color.green.opacity(0.14) : Color.orange.opacity(0.14))
                    .foregroundColor(ok ? .green : .orange)
                    .clipShape(Capsule())
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(14)
        }
    }

    private var correctionSheet: some View {
        NavigationStack {
            Form {
                Section(isZh ? "纠错并加入词库" : "Teach correction") {
                    TextField(isZh ? "识别成（例如：云）" : "Heard as", text: $heardDraft)
                    TextField(isZh ? "应为（例如：Claude）" : "Should be", text: $termDraft)
                }
            }
            .navigationTitle(isZh ? "纠错" : "Correction")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(isZh ? "取消" : "Cancel") { showCorrectionSheet = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isZh ? "加入词库" : "Save") {
                        try? coordinator.teachCorrection(heard: heardDraft, term: termDraft)
                        showCorrectionSheet = false
                    }
                    .disabled(termDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private var statusTitle: String {
        switch coordinator.status {
        case .recording: return isZh ? "正在录音…" : "Recording…"
        case .transcribing: return isZh ? "正在识别语音…" : "Transcribing…"
        case .polishing: return isZh ? "正在润色文字…" : "Polishing…"
        default:
            return configured ? (isZh ? "随时开口，直接输入" : "Ready when you are") : (isZh ? "先连接你的 AI 模型或 iCloud" : "Connect AI or iCloud first")
        }
    }

    private var statusSubtitle: String {
        switch coordinator.status {
        case .recording:
            let sec = coordinator.durationMs / 1000
            return isZh ? "已录制 \(sec) 秒，再次点击结束" : "Listening (\(sec)s) · tap to finish"
        default:
            return configured
                ? (isZh ? "支持 App 内听写或切换到 Typeless 语音输入法键盘" : "Dictate here or use the Typeless iOS keyboard")
                : (isZh ? "在 Mac 配置好后，选择同一个 iCloud 文件夹即可自动同步" : "Select the same iCloud folder to auto-sync keys")
        }
    }

    private var buttonLabel: String {
        switch coordinator.status {
        case .recording: return isZh ? "完成" : "Stop"
        case .transcribing, .polishing: return isZh ? "处理中" : "Working"
        default: return configured ? (isZh ? "开始听写" : "Start") : (isZh ? "去配置" : "Configure")
        }
    }

    private func copyToPasteboard(_ value: String) {
        #if canImport(UIKit)
        UIPasteboard.general.string = value
        #endif
        copied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
            copied = false
        }
    }
}

public struct WaveformBarView: View {
    public let level: Double
    public let barCount: Int

    public init(level: Double, barCount: Int = 24) {
        self.level = level
        self.barCount = barCount
    }

    public var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<barCount, id: \.self) { index in
                let wave = sin(Double(index) * 0.55) * 0.35 + 0.65
                let heightRatio = max(0.15, min(1.0, level * wave))
                Capsule()
                    .fill(Color.primary.opacity(0.75))
                    .frame(width: 3, height: CGFloat(heightRatio) * 28.0)
            }
        }
    }
}
