import SwiftUI
import TypelessCore

public struct MainTabView: View {
    @ObservedObject var store: SharedStore
    @ObservedObject var coordinator: DictationCoordinator
    @State private var selectedTab: Int = 0

    public init(store: SharedStore, coordinator: DictationCoordinator) {
        self.store = store
        self.coordinator = coordinator
    }

    private var isZh: Bool { store.settings.language == .zh }

    public var body: some View {
        TabView(selection: $selectedTab) {
            HomeView(store: store, coordinator: coordinator, openSettings: { selectedTab = 3 })
                .tabItem {
                    Label(isZh ? "听写" : "Dictate", systemImage: "mic.fill")
                }
                .tag(0)

            HistoryView(store: store)
                .tabItem {
                    Label(isZh ? "历史记录" : "History", systemImage: "clock.arrow.circlepath")
                }
                .tag(1)

            VocabularyView(store: store)
                .tabItem {
                    Label(isZh ? "词库" : "Vocabulary", systemImage: "character.book.closed.fill")
                }
                .tag(2)

            SettingsView(store: store)
                .tabItem {
                    Label(isZh ? "设置与同步" : "Settings", systemImage: "gearshape.fill")
                }
                .tag(3)
        }
        .tint(.primary)
    }
}
