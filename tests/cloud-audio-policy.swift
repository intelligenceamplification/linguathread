import Foundation

@main struct CloudPolicyCheck {
    @MainActor static func main() throws {
        func object(_ path: String) throws -> [String: Any] {
            try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: path))) as! [String: Any]
        }
        let seed = try object(CommandLine.arguments[1])
        let library = try object(CommandLine.arguments[2])
        let policies = seed["voicePolicies"] as! [[String: Any]]
        let clips = library["clips"] as! [[String: Any]]
        let cloud = clips.filter { ($0["backend"] as? String ?? "").hasPrefix("gemini/") }
        let approvals = try object(CommandLine.arguments.count > 3 ? CommandLine.arguments[3] : "audio/cloud-listening-approvals.json")["clips"] as! [[String: Any]]
        precondition(Set(cloud.map { $0["sha256"] as! String }) == Set(approvals.map { $0["sha256"] as! String }))
        for clip in clips {
            precondition(NativeAudioCatalog.accepts(clip, policies: policies, blocked: []))
            precondition(NativeAudioCatalog.accepts(clip, policies: Array(policies.reversed()), blocked: []))
        }
        for clip in cloud {
            for key in ["backend", "recipeSha256", "voiceReferenceSha256"] {
                var changed = clip; changed[key] = "unapproved"
                precondition(!NativeAudioCatalog.accepts(changed, policies: policies, blocked: []))
            }
            precondition(!NativeAudioCatalog.accepts(clip, policies: policies, blocked: [clip["sha256"] as! String]))
        }
        print("Cloud and preserved voices accepted; altered identities and blocked files rejected.")
    }
}
