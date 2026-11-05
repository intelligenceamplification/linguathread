import Foundation

@main struct HybridPolicyCheck {
    @MainActor static func main() throws {
        func object(_ path: String) throws -> [String: Any] {
            try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: path))) as! [String: Any]
        }
        let seed = try object("ios/LinguaThread/NativeAudio/manifest.json")
        let library = try object("public/audio/native/library.json")
        let policies = seed["voicePolicies"] as! [[String: Any]]
        let clips = (library["clips"] as! [[String: Any]]).filter { ($0["id"] as? String ?? "").hasPrefix("local-") }
        precondition(!clips.isEmpty)
        let ids = Set(clips.map { $0["profileId"] as! String })
        precondition(ids.count == 7)
        precondition(!ids.contains("en-6"))
        for clip in clips {
            precondition(NativeAudioCatalog.accepts(clip, policies: policies, blocked: []))
            for key in ["backend", "recipeSha256", "voiceReferenceSha256"] {
                var changed = clip; changed[key] = "unapproved"
                precondition(!NativeAudioCatalog.accepts(changed, policies: policies, blocked: []))
            }
            var changed = clip; changed["normalTempo"] = 0.5
            precondition(!NativeAudioCatalog.accepts(changed, policies: policies, blocked: []))
            changed = clip; changed.removeValue(forKey: "reviewedAt")
            precondition(!NativeAudioCatalog.accepts(changed, policies: policies, blocked: []))
            precondition(!NativeAudioCatalog.accepts(clip, policies: policies, blocked: [clip["sha256"] as! String]))
        }
        print("Accepted all \(clips.count) reviewed local clips; rejected changed recipes, tempo, missing reviews and blocked files.")
    }
}
