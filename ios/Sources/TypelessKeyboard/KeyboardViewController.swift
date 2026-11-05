#if canImport(UIKit)
import SwiftUI
import TypelessCore
import UIKit

public final class KeyboardViewController: UIInputViewController {
    private var sharedStore: SharedStore!
    private var coordinator: DictationCoordinator!
    private var hostingController: UIHostingController<KeyboardRootView>?

    public override func viewDidLoad() {
        super.viewDidLoad()
        let store = SharedStore()
        let coord = DictationCoordinator(store: store)
        coord.onResultReady = { [weak self] finalText in
            guard let self = self else { return }
            UIPasteboard.general.string = finalText
            if self.sharedStore.settings.autoInsertInKeyboard {
                self.textDocumentProxy.insertText(finalText)
            }
        }
        self.sharedStore = store
        self.coordinator = coord

        let rootView = KeyboardRootView(
            store: store,
            coordinator: coord,
            needsInputModeSwitchKey: self.needsInputModeSwitchKey,
            onNextKeyboard: { [weak self] in
                self?.advanceToNextInputMode()
            },
            onInsertText: { [weak self] text in
                self?.textDocumentProxy.insertText(text)
            },
            onDeleteBackward: { [weak self] in
                self?.textDocumentProxy.deleteBackward()
            },
            onOpenHostAppForMic: { [weak self] in
                self?.openURL(URL(string: "typeless://record")!)
            }
        )

        let host = UIHostingController(rootView: rootView)
        host.view.translatesAutoresizingMaskIntoConstraints = false
        host.view.backgroundColor = .clear
        addChild(host)
        view.addSubview(host.view)
        host.didMove(toParent: self)

        NSLayoutConstraint.activate([
            host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            host.view.topAnchor.constraint(equalTo: view.topAnchor),
            host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            view.heightAnchor.constraint(equalToConstant: 260)
        ])
        self.hostingController = host
    }

    public override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        sharedStore.reloadFromAppGroup()
        if sharedStore.syncEnabled {
            try? sharedStore.syncNow()
        }
    }

    private func openURL(_ url: URL) {
        var responder: UIResponder? = self
        let selector = sel_registerName("openURL:")
        while let current = responder {
            if current.responds(to: selector) {
                current.perform(selector, with: url)
                return
            }
            responder = current.next
        }
    }
}
#endif
