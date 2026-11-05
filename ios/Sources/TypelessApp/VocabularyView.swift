import SwiftUI
import TypelessCore

public struct VocabularyView: View {
    @ObservedObject var store: SharedStore
    @State private var newTerm = ""
    @State private var newSoundsLike = ""
    @State private var editingEntry: VocabularyEntry? = nil
    @State private var editTerm = ""
    @State private var editSoundsLike = ""
    @State private var errorAlert: String? = nil

    private var isZh: Bool { store.settings.language == .zh }

    public var body: some View {
        NavigationStack {
            List {
                Section(isZh ? "添加常用词 / 专有名词" : "Add vocabulary term") {
                    TextField(isZh ? "常用词（例如：Claude Code）" : "Term (e.g. Claude Code)", text: $newTerm)
                    TextField(isZh ? "常被识别成（逗号分隔，如：云，克劳德）" : "Sounds like (comma-separated)", text: $newSoundsLike)
                    Button {
                        addTerm()
                    } label: {
                        Label(isZh ? "添加到词库" : "Add to vocabulary", systemImage: "plus.circle.fill")
                    }
                    .disabled(newTerm.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }

                Section(isZh ? "已保存词条 (\(store.vocabulary.count))" : "Saved words (\(store.vocabulary.count))") {
                    if store.vocabulary.isEmpty {
                        Text(isZh ? "词库为空。添加容易被误识别的人名、术语或产品名，润色时会自动按上下文纠正。" : "No words yet. Add names or terms that speech recognition often mishears.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    } else {
                        ForEach(store.vocabulary) { entry in
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(entry.term)
                                        .font(.headline)
                                    if !entry.soundsLike.isEmpty {
                                        Text((isZh ? "常被识别成：" : "Sounds like: ") + entry.soundsLike.joined(separator: "、"))
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                Spacer()
                                Text(entry.hits > 0 ? (isZh ? "已用 \(entry.hits) 次" : "\(entry.hits) uses") : (isZh ? "尚未用到" : "Unused"))
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.secondary.opacity(0.12))
                                    .clipShape(Capsule())
                            }
                            .contentShape(Rectangle())
                            .onTapGesture {
                                editingEntry = entry
                                editTerm = entry.term
                                editSoundsLike = entry.soundsLike.joined(separator: "，")
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    store.deleteVocabulary(id: entry.id)
                                } label: {
                                    Label(isZh ? "删除" : "Delete", systemImage: "trash")
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle(isZh ? "个人词库" : "Vocabulary")
            .sheet(item: $editingEntry) { entry in
                NavigationStack {
                    Form {
                        TextField(isZh ? "常用词" : "Term", text: $editTerm)
                        TextField(isZh ? "常被识别成" : "Sounds like", text: $editSoundsLike)
                    }
                    .navigationTitle(isZh ? "编辑词条" : "Edit word")
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button(isZh ? "取消" : "Cancel") { editingEntry = nil }
                        }
                        ToolbarItem(placement: .confirmationAction) {
                            Button(isZh ? "保存" : "Save") {
                                let variants = splitVariants(editSoundsLike)
                                try? store.saveVocabulary(id: entry.id, term: editTerm, soundsLike: variants)
                                editingEntry = nil
                            }
                        }
                    }
                }
            }
        }
    }

    private func splitVariants(_ raw: String) -> [String] {
        raw.components(separatedBy: CharacterSet(charactersIn: ",，、;；"))
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    private func addTerm() {
        do {
            let variants = splitVariants(newSoundsLike)
            try store.saveVocabulary(term: newTerm, soundsLike: variants)
            newTerm = ""
            newSoundsLike = ""
        } catch {
            errorAlert = error.localizedDescription
        }
    }
}
