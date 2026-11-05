import SwiftUI
import TypelessCore
#if canImport(UIKit)
import UIKit
#endif

public struct HistoryView: View {
    @ObservedObject var store: SharedStore
    @State private var searchText = ""
    @State private var copiedId: String? = nil

    private var isZh: Bool { store.settings.language == .zh }

    private var filteredHistory: [DictationHistoryEntry] {
        let q = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if q.isEmpty { return store.history }
        return store.history.filter {
            $0.text.lowercased().contains(q) || $0.rawText.lowercased().contains(q)
        }
    }

    public var body: some View {
        NavigationStack {
            Group {
                if filteredHistory.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "clock.badge.checkmark")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                        Text(isZh ? "暂无听写历史记录" : "No dictation history yet")
                            .font(.headline)
                        Text(isZh ? "在 Mac 或 iPhone 上的听写记录会显示在这里，并可通过 iCloud 自动同步。" : "Dictations from your Mac and iPhone appear here and sync via iCloud.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                    }
                } else {
                    List {
                        ForEach(filteredHistory) { item in
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text(formatTimestamp(item.startedAt))
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    Text("· \(max(1, item.durationMs / 1000))s")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    if item.polished {
                                        Text(isZh ? "已润色" : "Polished")
                                            .font(.caption2)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(Color.secondary.opacity(0.12))
                                            .clipShape(Capsule())
                                    }
                                    Spacer()
                                    Button {
                                        copyEntry(item)
                                    } label: {
                                        Label(
                                            copiedId == item.id ? (isZh ? "已复制" : "Copied") : (isZh ? "复制" : "Copy"),
                                            systemImage: copiedId == item.id ? "checkmark" : "doc.on.doc"
                                        )
                                        .font(.caption.weight(.medium))
                                    }
                                    .buttonStyle(.borderless)
                                }
                                Text(item.text.isEmpty ? item.rawText : item.text)
                                    .font(.body)
                                    .lineSpacing(3)
                            }
                            .padding(.vertical, 4)
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    store.deleteHistory(id: item.id)
                                } label: {
                                    Label(isZh ? "删除" : "Delete", systemImage: "trash")
                                }
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle(isZh ? "历史记录" : "History")
            .searchable(text: $searchText, prompt: isZh ? "搜索历史记录…" : "Search history…")
            .toolbar {
                if !store.history.isEmpty {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button(isZh ? "清空" : "Clear", role: .destructive) {
                            store.clearHistory()
                        }
                    }
                }
            }
        }
    }

    private func copyEntry(_ item: DictationHistoryEntry) {
        let shown = item.text.isEmpty ? item.rawText : item.text
        #if canImport(UIKit)
        UIPasteboard.general.string = shown
        #endif
        copiedId = item.id
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
            if copiedId == item.id { copiedId = nil }
        }
    }

    private func formatTimestamp(_ epochMs: Int64) -> String {
        let date = Date(timeIntervalSince1970: TimeInterval(epochMs) / 1000.0)
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter.string(from: date)
    }
}
