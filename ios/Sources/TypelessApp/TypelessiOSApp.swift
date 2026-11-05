import SwiftUI
import TypelessCore

@main
struct TypelessiOSApp: App {
    @StateObject private var store: SharedStore
    @StateObject private var coordinator: DictationCoordinator
    @Environment(\.scenePhase) private var scenePhase

    init() {
        let sharedStore = SharedStore()
        _store = StateObject(wrappedValue: sharedStore)
        _coordinator = StateObject(wrappedValue: DictationCoordinator(store: sharedStore))
    }

    var body: some Scene {
        WindowGroup {
            MainTabView(store: store, coordinator: coordinator)
                .onOpenURL { url in
                    // Deep-link bridge (`typeless://record`) invoked by the custom Keyboard Extension
                    // when the user starts voice input from the system keyboard.
                    if url.scheme == "typeless" && url.host == "record" {
                        store.reloadFromAppGroup()
                        if coordinator.status != .recording {
                            coordinator.startRecording()
                        }
                    }
                }
                .onChange(of: scenePhase) { newPhase in
                    if newPhase == .active {
                        store.reloadFromAppGroup()
                        if store.syncEnabled {
                            try? store.syncNow()
                        }
                    }
                }
        }
    }
}
