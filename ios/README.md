# Typeless for iOS (iPhone AI 语音输入法 & 主程序)

`ios/` 目录包含 Typeless 的原生 iOS 实现（Swift + SwiftUI），具备桌面版的核心 AI 语音听写、文字润色、个人词库、历史记录以及跨设备 iCloud 文件夹同步能力，并提供系统级自定义键盘扩展（`TypelessKeyboard`）。

## 目录结构

- `Sources/TypelessCore/`：主应用与键盘扩展共享的核心模块
  - `Models.swift`：与桌面端 `src/shared/contracts.ts` 和 `src/core/sync.ts` 保持一致的数据结构（`AppSettings`、`VocabularyEntry`、`DictationHistoryEntry`、`SyncBundle`）。
  - `SyncCrypto.swift`：基于 Apple `CryptoKit` 的 **AES-256-GCM** 跨设备密钥加解密（`v1:<iv_b64>:<tag_b64>:<cipher_b64>`），与桌面端 Node.js `crypto` 完全互通。
  - `SharedStore.swift`：管理 App Group (`group.dev.typeless.ios`) 与用户指定的 iCloud Drive 同步文件夹（`typeless-sync.json` + `typeless-key.json`），支持增量合并与墓碑删除（Tombstones）。
  - `VocabularyEngine.swift` & `CleanupPrompt.swift`：完整移植桌面端的词库匹配、ASR 提示词预算以及三档文字润色（不润色 / 轻度润色 / 强力润色）Prompt 规则与 Few-shot 示例。
  - `ProvidersClient.swift`：支持小米 MiMo (`/chat/completions` Base64 WAV) 与 OpenAI 兼容 (`/audio/transcriptions` Multipart WAV) 语音识别，以及 OpenAI 兼容的文字润色接口。
  - `AudioRecorder.swift`：录制单声道 16 kHz PCM16 WAV 音频并驱动听写状态机。
- `Sources/TypelessApp/`：iPhone 主应用（4 个标签页：**听写**、**历史记录**、**词库**、**设置与同步**）。
- `Sources/TypelessKeyboard/`：iOS 自定义语音输入法扩展 (`UIInputViewController`)，支持在任意 App 中调起麦克风听写、切换润色档位、一键插入最近历史记录，并通过 `textDocumentProxy.insertText` 自动上屏。

## 构建与测试

1. **运行核心与跨端同步自检**：
   ```sh
   cd ios && swift run typeless-ios-selftest
   ```
2. **生成 Xcode 工程并运行到 iPhone / 模拟器**：
   - 使用 [XcodeGen](https://github.com/yonaskolb/XcodeGen) 在 `ios/` 下执行 `xcodegen generate` 生成 `TypelessiOS.xcodeproj`，或在 Xcode 中直接打开 `ios/`。
   - 在 Signing & Capabilities 中配置你的 Apple Team 以及 App Group (`group.dev.typeless.ios`)。
   - 安装到 iPhone 后，前往 **系统设置 → 通用 → 键盘 → 键盘 → 添加新键盘 → Typeless**，并开启 **允许完全访问**。
