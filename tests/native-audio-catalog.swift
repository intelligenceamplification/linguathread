import Foundation

@main struct CatalogChecks {
    @MainActor static func main() {
        let digest = String(repeating: "a", count: 64)
        var policy: [String: Any] = ["language": "es", "voice": "male", "referenceSha256": "approved-reference", "normalTempo": 0.85, "backend": "approved-backend", "recipeSha256": "approved-recipe"]
        var clip: [String: Any] = ["language": "es", "voice": "male", "text": "de", "normalizedText": "de", "sha256": digest, "file": digest + ".wav", "url": "linguathread-audio://pack/" + digest + ".wav", "voiceReferenceSha256": "approved-reference", "normalTempo": 0.85, "backend": "approved-backend", "recipeSha256": "approved-recipe", "auditVersion": 2, "qualityCheck": "automated-text-pace-clarity", "voiceApprovalBasis": "reference-hash"]
        func accepts() -> Bool { NativeAudioCatalog.accepts(clip, policies: [policy], blocked: []) }
        precondition(accepts())
        policy["requiredAuditModel"] = "reference-recognizer"
        precondition(!accepts())
        clip["auditModel"] = "converted-recognizer"; precondition(!accepts())
        clip["auditModel"] = "reference-recognizer"; precondition(accepts())
        policy.removeValue(forKey: "requiredAuditModel")
        clip["reviewedAt"] = "2026-10-14"; precondition(!accepts()); clip.removeValue(forKey: "reviewedAt")
        precondition(!NativeAudioCatalog.accepts(clip, policies: [policy], blocked: [digest]))
        clip["backend"] = "old-voice-backend"; precondition(!accepts()); clip["backend"] = "approved-backend"
        clip["recipeSha256"] = "old-pace"; precondition(!accepts()); clip["recipeSha256"] = "approved-recipe"
        clip["url"] = "https://example.com/audio.wav"; precondition(!accepts()); clip["url"] = "linguathread-audio://pack/" + digest + ".wav"
        clip["file"] = "../" + digest + ".wav"; precondition(!accepts()); clip["file"] = digest + ".wav"
        clip["text"] = "dé"; precondition(!accepts()); clip["text"] = "de"
        clip["qualityCheck"] = "human-text-pace-clarity"; precondition(!accepts()); clip["reviewedAt"] = "2026-10-13"; precondition(accepts())
        clip["paceCorrectionFactor"] = 0.5; precondition(!accepts())
        print("Native catalog rejects blocked, legacy, altered, mismatched and unreviewed claims.")
    }
}
