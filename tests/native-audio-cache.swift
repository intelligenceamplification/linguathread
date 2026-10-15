import Foundation
import CryptoKit

final class AudioStub: URLProtocol, @unchecked Sendable {
    static var library = Data()
    static var assets: [String: Data] = [:]
    static var requests: [String] = []
    static var offline = false
    private static let lock = NSLock()
    override class func canInit(with request: URLRequest) -> Bool { request.url?.host == "linguathread.vercel.app" }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        Self.lock.lock()
        let name = request.url!.lastPathComponent
        Self.requests.append(name)
        let data = name == "library.json" ? Self.library : Self.assets[name]
        let offline = Self.offline
        Self.lock.unlock()
        if offline { client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet)); return }
        client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: data == nil ? 404 : 200, httpVersion: nil, headerFields: nil)!, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data ?? Data())
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

@main struct CacheChecks {
    @MainActor static func main() async throws {
        let directory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
        NativeAudioCatalog.testCacheDirectory = directory
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [AudioStub.self]
        let session = URLSession(configuration: config)
        defer { session.invalidateAndCancel() }
        func clip(_ text: String, _ bytes: Data) -> [String: Any] {
            let digest = SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined()
            return ["language": "es", "voice": "male", "text": text, "normalizedText": text, "sha256": digest, "file": digest + ".wav", "url": "linguathread-audio://pack/" + digest + ".wav", "voiceReferenceSha256": "fixture-reference", "normalTempo": 0.85, "backend": "fixture-backend", "recipeSha256": "fixture-recipe", "auditVersion": 2, "qualityCheck": "automated-text-pace-clarity", "voiceApprovalBasis": "reference-hash"]
        }
        let bytes = Data("verified playback bytes".utf8)
        let valid = clip("eres", bytes)
        let corrupt = clip("de", Data("expected bytes".utf8))
        let url = URL(string: valid["url"] as! String)!
        func library(blocked: [String] = []) throws -> Data {
            try JSONSerialization.data(withJSONObject: ["kind": "verified-audio-library", "schemaVersion": 1, "clips": [valid, corrupt], "blockedAudioSha256": blocked, "lessonAudio": ["next-lesson": [url.absoluteString]]])
        }
        AudioStub.library = try library()
        AudioStub.assets[valid["file"] as! String] = bytes
        AudioStub.assets[corrupt["file"] as! String] = Data("altered bytes".utf8)
        await NativeAudioCatalog.refreshLibrary(using: session)
        precondition((NativeAudioCatalog.manifest["clips"] as? [[String: Any]])?.count == 2)
        async let first = NativeAudioCatalog.audioData(for: url, using: session)
        async let second = NativeAudioCatalog.audioData(for: url, using: session)
        let results = try await (first, second)
        precondition(results.0 == bytes && results.1 == bytes)
        precondition(AudioStub.requests.filter { $0 == valid["file"] as? String }.count == 1)
        do {
            _ = try await NativeAudioCatalog.audioData(for: URL(string: corrupt["url"] as! String)!, using: session)
            preconditionFailure("Corrupted download was accepted")
        } catch { }
        precondition(!FileManager.default.fileExists(atPath: directory.appendingPathComponent(corrupt["file"] as! String).path))
        AudioStub.offline = true
        let cached = try await NativeAudioCatalog.audioData(for: url, using: session)
        precondition(cached == bytes)
        await NativeAudioCatalog.refreshLibrary(using: session)
        precondition((NativeAudioCatalog.manifest["clips"] as? [[String: Any]])?.count == 2)
        AudioStub.offline = false
        AudioStub.library = try library(blocked: [valid["sha256"] as! String])
        await NativeAudioCatalog.refreshLibrary(using: session)
        do {
            _ = try await NativeAudioCatalog.audioData(for: url, using: session)
            preconditionFailure("Blocked cached recording was accepted")
        } catch { }
        print("PASS: shared download, checked bytes, offline cache, cached index, blocked cached audio")
    }
}
