import AVFoundation
import Combine
import Foundation

@MainActor
public final class DictationCoordinator: ObservableObject {
    @Published public private(set) var status: SessionStatus = .idle
    @Published public private(set) var level: Double = 0.0
    @Published public private(set) var durationMs: Int = 0
    @Published public private(set) var rawText: String = ""
    @Published public private(set) var text: String = ""
    @Published public private(set) var warning: String? = nil
    @Published public private(set) var errorMessage: String? = nil

    public let store: SharedStore
    private let providers: ProvidersClient
    private var recorder: AVAudioRecorder?
    private var recordingURL: URL?
    private var meterTimer: Timer?
    private var startedAt: Date?
    private var currentTask: Task<Void, Never>?

    public var onResultReady: ((String) -> Void)?

    public init(store: SharedStore, providers: ProvidersClient = ProvidersClient()) {
        self.store = store
        self.providers = providers
    }

    public func toggle() {
        switch status {
        case .recording, .arming:
            stopAndTranscribe()
        case .transcribing, .polishing:
            break
        default:
            startRecording()
        }
    }

    public func startRecording() {
        let settings = store.settings
        let asrKey = store.secret(for: "asr")
        guard !asrKey.isEmpty, !settings.asr.model.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            self.status = .error
            self.errorMessage = settings.language == .zh
                ? "请先在 AI 配置中填写语音识别模型与 API 密钥，或绑定 iCloud 同步文件夹。"
                : "Configure the speech model and API key first, or connect your iCloud sync folder."
            return
        }

        cancel()
        self.errorMessage = nil
        self.warning = nil
        self.rawText = ""
        self.text = ""
        self.status = .arming

        #if os(iOS)
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetooth])
            try audioSession.setActive(true)
        } catch {
            self.status = .error
            self.errorMessage = settings.language == .zh
                ? "无法开启麦克风录音会话，请确认已开启麦克风权限及键盘完全访问权限。"
                : "Could not start the microphone session. Check Microphone and Full Access permissions."
            return
        }
        #endif

        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("typeless-\(UUID().uuidString).wav")
        let formatSettings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVSampleRateKey: 16000.0,
            AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsFloatKey: false
        ]

        do {
            let rec = try AVAudioRecorder(url: tempURL, settings: formatSettings)
            rec.isMeteringEnabled = true
            guard rec.record() else {
                self.status = .error
                self.errorMessage = settings.language == .zh
                    ? "录音启动失败。若在键盘中，请点击旁边的麦克风桥接按钮或检查权限。"
                    : "Recording could not start. Check microphone permissions."
                return
            }
            self.recorder = rec
            self.recordingURL = tempURL
            self.startedAt = Date()
            self.durationMs = 0
            self.level = 0
            self.status = .recording

            let maxDuration = settings.maxDurationSeconds
            self.meterTimer = Timer.scheduledTimer(withTimeInterval: 0.06, repeats: true) { [weak self] _ in
                Task { @MainActor [weak self] in
                    guard let self = self, let rec = self.recorder, self.status == .recording else { return }
                    rec.updateMeters()
                    let power = rec.averagePower(forChannel: 0) // -160 .. 0 dB
                    let normalized = max(0.0, min(1.0, Double(power + 50.0) / 50.0))
                    self.level = normalized
                    if let started = self.startedAt {
                        self.durationMs = Int(Date().timeIntervalSince(started) * 1000)
                        if self.durationMs >= maxDuration * 1000 {
                            self.stopAndTranscribe()
                        }
                    }
                }
            }
        } catch {
            self.status = .error
            self.errorMessage = error.localizedDescription
        }
    }

    public func stopAndTranscribe() {
        meterTimer?.invalidate()
        meterTimer = nil
        recorder?.stop()
        recorder = nil
        level = 0

        guard let url = recordingURL, let wavData = try? Data(contentsOf: url) else {
            status = .error
            errorMessage = store.settings.language == .zh ? "未获取到录音数据。" : "No audio data captured."
            return
        }
        try? FileManager.default.removeItem(at: url)
        recordingURL = nil

        let sessionDuration = max(durationMs, 500)
        let sessionStart = Int64((startedAt ?? Date()).timeIntervalSince1970 * 1000)
        status = .transcribing

        let snapshotSettings = store.settings
        let asrKey = store.secret(for: "asr")
        let cleanupKey = store.secret(for: "cleanup")
        let vocabSnapshot = store.vocabulary

        currentTask = Task {
            do {
                let hints = VocabularyEngine.asrHints(vocabSnapshot)
                let recognized = try await providers.transcribe(
                    settings: snapshotSettings.asr,
                    apiKey: asrKey,
                    wavData: wavData,
                    language: snapshotSettings.writing.language,
                    hints: hints
                )
                if Task.isCancelled { return }
                self.rawText = recognized
                self.status = .polishing

                let finalResult: CleanupResult
                do {
                    let latestSettings = self.store.settings
                    let cleanupVocab = latestSettings.cleanup.enabled
                        ? VocabularyEngine.cleanupVocabulary(self.store.vocabulary, transcript: recognized)
                        : []
                    finalResult = try await providers.cleanup(
                        settings: latestSettings,
                        apiKey: cleanupKey,
                        transcript: recognized,
                        vocabulary: cleanupVocab
                    )
                } catch {
                    if Task.isCancelled { return }
                    finalResult = CleanupResult(
                        text: recognized,
                        warning: "Text processing failed. Original transcript is ready. \(error.localizedDescription)"
                    )
                }
                if Task.isCancelled { return }

                self.text = finalResult.text
                self.warning = finalResult.warning
                self.status = .ready

                let usedIds = VocabularyEngine.usedEntryIds(self.store.vocabulary, text: finalResult.text)
                self.store.recordVocabularyHits(usedIds)
                self.store.recordHistory(
                    startedAt: sessionStart,
                    durationMs: sessionDuration,
                    rawText: recognized,
                    text: finalResult.text,
                    polished: recognized != finalResult.text
                )
                self.onResultReady?(finalResult.text)
            } catch {
                if Task.isCancelled { return }
                self.status = .error
                self.errorMessage = error.localizedDescription
            }
        }
    }

    public func cancel() {
        currentTask?.cancel()
        currentTask = nil
        meterTimer?.invalidate()
        meterTimer = nil
        recorder?.stop()
        recorder = nil
        if let url = recordingURL {
            try? FileManager.default.removeItem(at: url)
            recordingURL = nil
        }
        level = 0
        if status != .idle {
            status = .cancelled
        }
    }

    public func teachCorrection(heard: String, term: String) throws {
        let saved = try store.saveVocabulary(term: term, soundsLike: [heard])
        let currentShown = text.isEmpty ? rawText : text
        if !heard.isEmpty, let range = currentShown.range(of: heard) {
            text = currentShown.replacingCharacters(in: range, with: saved.term)
        }
    }
}
