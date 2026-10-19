import Foundation

// Use the actual installed player's admission rules, not a second approximation.
@main struct VerifyDownloadAudio {
    @MainActor static func main() throws {
        func object(_ path: String) throws -> [String: Any] {
            try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: path))) as! [String: Any]
        }
        let seed = try object(CommandLine.arguments[1])
        let library = try object(CommandLine.arguments[2])
        let policies = seed["voicePolicies"] as! [[String: Any]]
        let blocked = Set((seed["blockedAudioSha256"] as? [String] ?? []) + (library["blockedAudioSha256"] as? [String] ?? []))
        let clips = library["clips"] as! [[String: Any]]
        for clip in clips where !NativeAudioCatalog.accepts(clip, policies: policies, blocked: blocked) {
            throw NSError(domain: "Rejected prepared audio: \(clip["id"] ?? "unknown")", code: 1)
        }
        print("Installed player accepts all \(clips.count) catalog variants.")
    }
}
