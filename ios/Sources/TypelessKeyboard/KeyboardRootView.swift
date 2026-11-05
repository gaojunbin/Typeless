import SwiftUI
import TypelessCore
#if canImport(UIKit)
import UIKit
#endif

public struct KeyboardRootView: View {
    @ObservedObject var store: SharedStore
    @ObservedObject var coordinator: DictationCoordinator
    let needsInputModeSwitchKey: Bool
    let onNextKeyboard: () -> Void
    let onInsertText: (String) -> Void
    let onDeleteBackward: () -> Void
    let onOpenHostAppForMic: () -> Void

    private var isZh: Bool { store.settings.language == .zh }

    public var body: some View {
        VStack(spacing: 10) {
            topToolbar
            recentHistoryStrip
            voiceCenterPanel
            bottomKeyRow
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .frame(height: 260)
    }

    private var topToolbar: some View {
        HStack(spacing: 8) {
            HStack(spacing: 5) {
                Circle()
                    .fill(Color.primary)
                    .frame(width: 8, height: 8)
                Text("Typeless")
                    .font(.caption.weight(.bold))
            }

            Spacer()

            // Quick Polishing Mode Pill
            Button {
                cyclePolishingMode()
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "sparkles")
                        .font(.caption2)
                    Text(polishingLabel)
                        .font(.caption.weight(.medium))
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Color.primary.opacity(0.08))
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)

            if store.syncEnabled {
                Image(systemName: "checkmark.icloud")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }

    private var recentHistoryStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                if store.history.isEmpty {
                    Text(isZh ? "点击下方麦克风说话，识别润色后自动上屏" : "Tap microphone to speak; polished text inserts automatically")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                } else {
                    ForEach(store.history.prefix(5)) { item in
                        let snippet = item.text.isEmpty ? item.rawText : item.text
                        Button {
                            onInsertText(snippet)
                        } label: {
                            Text(snippet)
                                .font(.caption)
                                .lineLimit(1)
                                .frame(maxWidth: 160)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(Color.primary.opacity(0.06))
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .frame(height: 26)
    }

    private var voiceCenterPanel: some View {
        VStack(spacing: 8) {
            if coordinator.status == .recording {
                HStack(spacing: 14) {
                    Button {
                        coordinator.cancel()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 15, weight: .semibold))
                            .frame(width: 38, height: 38)
                            .background(Color.primary.opacity(0.1))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)

                    VStack(spacing: 4) {
                        Text(isZh ? "正在聆听 · \(coordinator.durationMs / 1000)s" : "Listening · \(coordinator.durationMs / 1000)s")
                            .font(.caption.weight(.semibold))
                        HStack(spacing: 3) {
                            ForEach(0..<20, id: \.self) { idx in
                                let wave = sin(Double(idx) * 0.6) * 0.35 + 0.65
                                let h = max(0.18, min(1.0, coordinator.level * wave))
                                Capsule()
                                    .fill(Color.red)
                                    .frame(width: 3, height: CGFloat(h) * 22.0)
                            }
                        }
                        .frame(height: 24)
                    }

                    Button {
                        coordinator.stopAndTranscribe()
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark")
                            Text(isZh ? "完成" : "Done")
                        }
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 9)
                        .background(Color.black)
                        .foregroundColor(.white)
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            } else if coordinator.status == .transcribing || coordinator.status == .polishing {
                HStack(spacing: 10) {
                    ProgressView()
                    Text(coordinator.status == .transcribing
                         ? (isZh ? "正在语音识别…" : "Transcribing…")
                         : (isZh ? "正在 AI 润色…" : "Polishing…"))
                        .font(.subheadline.weight(.medium))
                    Button(isZh ? "取消" : "Cancel") {
                        coordinator.cancel()
                    }
                    .font(.caption)
                }
            } else {
                HStack(spacing: 12) {
                    Button {
                        coordinator.toggle()
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "mic.fill")
                                .font(.system(size: 18, weight: .semibold))
                            Text(isZh ? "按一下开始说话" : "Tap to speak")
                                .font(.subheadline.weight(.semibold))
                        }
                        .padding(.horizontal, 24)
                        .padding(.vertical, 14)
                        .background(Color.black)
                        .foregroundColor(.white)
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)

                    if coordinator.status == .error {
                        Button {
                            onOpenHostAppForMic()
                        } label: {
                            Label(isZh ? "唤起主程序录音" : "App Mic Bridge", systemImage: "arrow.up.forward.app")
                                .font(.caption.weight(.medium))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 10)
                                .background(Color.orange.opacity(0.15))
                                .foregroundColor(.orange)
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
                if coordinator.status == .error, let err = coordinator.errorMessage {
                    Text(err)
                        .font(.caption2)
                        .foregroundColor(.orange)
                        .lineLimit(1)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.primary.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var bottomKeyRow: some View {
        HStack(spacing: 8) {
            if needsInputModeSwitchKey {
                keyButton(systemImage: "globe", action: onNextKeyboard)
                    .frame(width: 44)
            }

            keyButton(title: isZh ? "粘贴" : "Paste", systemImage: "doc.on.clipboard") {
                #if canImport(UIKit)
                if let clip = UIPasteboard.general.string, !clip.isEmpty {
                    onInsertText(clip)
                }
                #endif
            }
            .frame(width: 72)

            keyButton(title: isZh ? "空格" : "Space", systemImage: nil) {
                onInsertText(" ")
            }

            keyButton(systemImage: "delete.left", action: onDeleteBackward)
                .frame(width: 52)

            keyButton(title: isZh ? "换行" : "Return", systemImage: "return") {
                onInsertText("\n")
            }
            .frame(width: 72)
        }
        .frame(height: 42)
    }

    private func keyButton(title: String? = nil, systemImage: String?, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let img = systemImage {
                    Image(systemName: img)
                        .font(.system(size: 14, weight: .medium))
                }
                if let t = title {
                    Text(t)
                        .font(.footnote.weight(.medium))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.primary.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
    }

    private var polishingLabel: String {
        if !store.settings.cleanup.enabled {
            return isZh ? "不润色" : "No Polish"
        }
        return store.settings.writing.strength == .light
            ? (isZh ? "轻度润色" : "Light")
            : (isZh ? "强力润色" : "Strong")
    }

    private func cyclePolishingMode() {
        var next = store.settings
        if !next.cleanup.enabled {
            next.cleanup.enabled = true
            next.writing.strength = .light
        } else if next.writing.strength == .light {
            next.cleanup.enabled = true
            next.writing.strength = .balanced
        } else {
            next.cleanup.enabled = false
        }
        store.saveSettings(next)
    }
}
