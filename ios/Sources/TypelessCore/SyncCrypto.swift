import CryptoKit
import Foundation

public enum SyncCryptoError: LocalizedError {
    case invalidKeyLength
    case invalidFormat
    case decryptionFailed

    public var errorDescription: String? {
        switch self {
        case .invalidKeyLength:
            return "Sync encryption key must be 32 bytes (256 bits)."
        case .invalidFormat:
            return "Invalid encrypted sync credential format."
        case .decryptionFailed:
            return "Could not decrypt the synced API key."
        }
    }
}

public enum SyncCrypto {
    /// Generates a new random 32-byte (256-bit) master key.
    public static func generateKeyData() -> Data {
        let key = SymmetricKey(size: .bits256)
        return key.withUnsafeBytes { Data($0) }
    }

    /// Encrypts a plaintext API key into `v1:<iv_b64>:<tag_b64>:<cipher_b64>`, identical to Desktop `encryptSyncSecret`.
    public static func encrypt(_ plain: String, keyData: Data) throws -> String {
        guard keyData.count == 32 else { throw SyncCryptoError.invalidKeyLength }
        let symmetricKey = SymmetricKey(data: keyData)
        let nonce = AES.GCM.Nonce()
        let plainData = Data(plain.utf8)
        let sealed = try AES.GCM.seal(plainData, using: symmetricKey, nonce: nonce)
        let ivBase64 = Data(nonce).base64EncodedString()
        let tagBase64 = sealed.tag.base64EncodedString()
        let cipherBase64 = sealed.ciphertext.base64EncodedString()
        return "v1:\(ivBase64):\(tagBase64):\(cipherBase64)"
    }

    /// Decrypts a `v1:<iv_b64>:<tag_b64>:<cipher_b64>` string written by Desktop or iOS.
    public static func decrypt(_ encoded: String, keyData: Data) throws -> String {
        guard keyData.count == 32 else { throw SyncCryptoError.invalidKeyLength }
        let parts = encoded.split(separator: ":", omittingEmptySubsequences: false).map(String.init)
        guard parts.count == 4, parts[0] == "v1",
              let ivData = Data(base64Encoded: parts[1]), ivData.count == 12,
              let tagData = Data(base64Encoded: parts[2]), tagData.count == 16,
              let cipherData = Data(base64Encoded: parts[3])
        else {
            throw SyncCryptoError.invalidFormat
        }
        let symmetricKey = SymmetricKey(data: keyData)
        let nonce = try AES.GCM.Nonce(data: ivData)
        let box = try AES.GCM.SealedBox(nonce: nonce, ciphertext: cipherData, tag: tagData)
        let decrypted = try AES.GCM.open(box, using: symmetricKey)
        guard let text = String(data: decrypted, encoding: .utf8) else {
            throw SyncCryptoError.decryptionFailed
        }
        return text
    }
}
