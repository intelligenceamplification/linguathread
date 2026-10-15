import Foundation
import CryptoKit

/// Only validated recordings from the signed seed or the approved remote library.
@MainActor enum NativeAudioCatalog {
    static let libraryURL = URL(string: "https://linguathread.vercel.app/audio/native/library.json")!
    static let assetBase = URL(string: "https://linguathread.vercel.app/audio/native/assets/")!
    private static let bundled: [String: Any] = {
        guard let url = Bundle.main.url(forResource: "manifest", withExtension: "json", subdirectory: "NativeAudio"),
              let data = try? Data(contentsOf: url),
              let pack = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              pack["releaseReady"] as? Bool == true else {
            return ["schemaVersion": 1, "packVersion": "unavailable", "model": "approved-families", "approvedAt": NSNull(), "clips": []]
        }
        return pack
    }()
    private(set) static var manifest = bundled
    private static var lessonAudio: [String: [String]] = [:]
    private static var pinnedFiles = Set<String>()
    private static var downloads: [String: Task<Data, Error>] = [:]
    private static let cacheLimit = 24 * 1_024 * 1_024
#if AUDIO_CATALOG_TESTS
    static var testCacheDirectory: URL?
#endif

    static var javascript: String {
        let data = try? JSONSerialization.data(withJSONObject: manifest, options: [.sortedKeys])
        return "window.__LINGUATHREAD_NATIVE_AUDIO_PACK__ = \(data.flatMap { String(data: $0, encoding: .utf8) } ?? "null"); window.dispatchEvent(new Event('linguathread:native-audio-library-ready'));"
    }

    static func accepts(_ clip: [String: Any], policies: [[String: Any]], blocked: Set<String>) -> Bool {
        guard let language = clip["language"] as? String, ["es", "vi"].contains(language),
              let voice = clip["voice"] as? String,
              let policy = policies.first(where: { $0["language"] as? String == language && $0["voice"] as? String == voice }),
              let digest = clip["sha256"] as? String, digest.count == 64,
              digest.allSatisfy({ "0123456789abcdef".contains($0) }), !blocked.contains(digest),
              let file = clip["file"] as? String,
              [digest + ".wav", digest + ".m4a"].contains(file),
              clip["url"] as? String == "linguathread-audio://pack/" + file,
              clip["voiceReferenceSha256"] as? String == policy["referenceSha256"] as? String,
              let text = clip["text"] as? String, !text.isEmpty,
              clip["normalizedText"] as? String == text.precomposedStringWithCanonicalMapping.split(whereSeparator: \.isWhitespace).joined(separator: " "),
              clip["auditVersion"] as? Int == 2,
              let quality = clip["qualityCheck"] as? String,
              ["automated-text-pace-clarity", "human-text-pace-clarity"].contains(quality),
              let basis = clip["voiceApprovalBasis"] as? String,
              ["reference-hash", "explicit-listening-approval"].contains(basis),
              let tempo = clip["normalTempo"] as? Double,
              let expectedTempo = policy["normalTempo"] as? Double, abs(tempo - expectedTempo) < 0.0001 else { return false }
        if let backend = policy["backend"] as? String, clip["backend"] as? String != backend { return false }
        if let recipe = policy["recipeSha256"] as? String, clip["recipeSha256"] as? String != recipe { return false }
        if quality == "automated-text-pace-clarity", let auditModel = policy["requiredAuditModel"] as? String, clip["auditModel"] as? String != auditModel { return false }
        if quality == "automated-text-pace-clarity" && clip["reviewedAt"] != nil { return false }
        if (quality == "human-text-pace-clarity" || basis == "explicit-listening-approval") && (clip["reviewedAt"] as? String)?.isEmpty != false { return false }
        let correction = clip["paceCorrectionFactor"] as? Double ?? 1
        return (0.75...1).contains(correction)
    }

    private static func cacheDirectory() throws -> URL {
#if AUDIO_CATALOG_TESTS
        if let directory = testCacheDirectory {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            return directory
        }
#endif
        var url = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).appendingPathComponent("VerifiedLessonAudio", isDirectory: true)
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        var values = URLResourceValues(); values.isExcludedFromBackup = true
        try url.setResourceValues(values)
        return url
    }

    private static func mergeLibrary(_ data: Data) throws {
        guard data.count < 8 * 1_024 * 1_024,
              let library = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              library["kind"] as? String == "verified-audio-library",
              library["schemaVersion"] as? Int == 1,
              let clips = library["clips"] as? [[String: Any]], clips.count <= 10_000,
              let policies = bundled["voicePolicies"] as? [[String: Any]], !policies.isEmpty else { throw CocoaError(.fileReadCorruptFile) }
        let blocked = Set((bundled["blockedAudioSha256"] as? [String] ?? []) + (library["blockedAudioSha256"] as? [String] ?? []))
        let trusted = clips.filter { accepts($0, policies: policies, blocked: blocked) }
        let seed = (bundled["clips"] as? [[String: Any]] ?? []).filter { !blocked.contains($0["sha256"] as? String ?? "") }
        var merged = seed
        func identity(_ clip: [String: Any]) -> String {
            ["language", "voice", "normalizedText", "url"].map { clip[$0] as? String ?? "" }.joined(separator: "\u{0}")
        }
        var positions = Dictionary(uniqueKeysWithValues: seed.enumerated().map { (identity($0.element), $0.offset) })
        for clip in trusted {
            let key = identity(clip)
            if let index = positions[key] {
                if merged[index]["reviewedAt"] == nil || clip["reviewedAt"] != nil { merged[index] = clip }
            } else { positions[key] = merged.count; merged.append(clip) }
        }
        manifest = bundled
        manifest["clips"] = merged
        manifest["blockedAudioSha256"] = Array(blocked)
        let allowed = Set((manifest["clips"] as? [[String: Any]] ?? []).compactMap { $0["url"] as? String })
        lessonAudio = (library["lessonAudio"] as? [String: [String]] ?? [:]).mapValues { $0.filter { allowed.contains($0) } }
    }

    static func refreshLibrary(using session: URLSession = .shared) async {
        do {
            let directory = try cacheDirectory()
            let saved = directory.appendingPathComponent("library.json")
            if let cached = try? Data(contentsOf: saved) { try? mergeLibrary(cached) }
            var request = URLRequest(url: libraryURL, cachePolicy: .reloadIgnoringLocalCacheData)
            request.timeoutInterval = 12
            let (data, response) = try await session.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { return }
            try Task.checkCancellation()
            try mergeLibrary(data)
            try data.write(to: saved, options: .atomic)
        } catch { /* The signed seed and previously checked cache remain usable. */ }
    }

    static func audioData(for url: URL, using session: URLSession = .shared) async throws -> Data {
        guard url.scheme == "linguathread-audio", url.host == "pack",
              let clip = (manifest["clips"] as? [[String: Any]])?.first(where: { $0["url"] as? String == url.absoluteString }),
              let digest = clip["sha256"] as? String, let file = clip["file"] as? String,
              file == URL(fileURLWithPath: file).lastPathComponent else { throw CocoaError(.fileReadNoPermission) }
        let seed = Bundle.main.resourceURL?.appendingPathComponent("NativeAudio").appendingPathComponent(file)
        if let seed, let data = try? Data(contentsOf: seed), valid(data, digest: digest) { return data }
        let directory = try cacheDirectory()
        let cached = directory.appendingPathComponent(file)
        if let data = try? Data(contentsOf: cached), valid(data, digest: digest) {
            try? FileManager.default.setAttributes([.modificationDate: Date()], ofItemAtPath: cached.path)
            return data
        }
        if let pending = downloads[file] { return try await pending.value }
        var request = URLRequest(url: assetBase.appendingPathComponent(file))
        request.timeoutInterval = 20
        let downloadRequest = request
        let task = Task<Data, Error> {
            let (data, response) = try await session.data(for: downloadRequest)
            guard (response as? HTTPURLResponse)?.statusCode == 200, data.count < 10 * 1_024 * 1_024,
                  valid(data, digest: digest), !(manifest["blockedAudioSha256"] as? [String] ?? []).contains(digest) else { throw CocoaError(.fileReadCorruptFile) }
            try data.write(to: cached, options: .atomic)
            trimCache(directory)
            return data
        }
        downloads[file] = task
        defer { downloads.removeValue(forKey: file) }
        return try await task.value
    }

    private static func valid(_ data: Data, digest: String) -> Bool {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() == digest
    }

    private static func trimCache(_ directory: URL) {
        let files = (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.fileSizeKey, .contentModificationDateKey])) ?? []
        let ordered = files.filter { ["wav", "m4a"].contains($0.pathExtension) }.sorted {
            ((try? $0.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast) < ((try? $1.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast)
        }
        var bytes = ordered.reduce(0) { $0 + ((try? $1.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0) }
        for file in ordered where bytes > cacheLimit && !pinnedFiles.contains(file.lastPathComponent) {
            bytes -= (try? file.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            try? FileManager.default.removeItem(at: file)
        }
    }

    static func prefetchLessons(_ ids: [String]) async {
        let urls = Set(ids.prefix(16).flatMap { lessonAudio[$0] ?? [] })
        pinnedFiles = Set(urls.compactMap { URL(string: $0)?.lastPathComponent })
        for url in urls {
            if Task.isCancelled { return }
            if let parsed = URL(string: url) { _ = try? await audioData(for: parsed) }
        }
    }
}
