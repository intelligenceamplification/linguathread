import SwiftUI
import WebKit
@preconcurrency import AVFoundation

/// The iOS target hosts the same production runtime as the Vercel master.
/// This keeps the launch choreography, typography, responsive layout, lesson
/// engine, learner persistence, and future web updates on one source of truth.
struct ContentView: View {
    @Environment(\.colorScheme) private var colorScheme
    #if PERSONAL_PRACTICE
    @StateObject private var personalPractice = PersonalPracticeConnection()
    #endif
    private let masterURL = URL(string: "https://linguathread.vercel.app/")!

    var body: some View {
        Group {
        #if PERSONAL_PRACTICE
        LinguaThreadWebView(url: masterURL, personalPractice: personalPractice)
            .sheet(isPresented: $personalPractice.showConnection) {
                PersonalPracticeSheet(connection: personalPractice)
            }
        #else
        LinguaThreadWebView(url: masterURL)
        #endif
        }
            .background(
                (colorScheme == .dark
                    ? Color(red: 13 / 255, green: 17 / 255, blue: 20 / 255)
                    : Color.white)
                .ignoresSafeArea()
            )
    }
}

private struct LinguaThreadWebView: UIViewRepresentable {
    let url: URL
    var personalPractice: PersonalPracticeConnection? = nil

    func makeCoordinator() -> Coordinator {
        Coordinator(personalPractice: personalPractice)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.userContentController.add(context.coordinator, name: "linguathreadAudio")
        configuration.userContentController.add(context.coordinator, name: "linguathreadPractice")
        configuration.userContentController.addUserScript(WKUserScript(
            source: "window.__LINGUATHREAD_NATIVE_SPEECH__ = true; window.__LINGUATHREAD_NATIVE_CLIP__ = true; window.__LINGUATHREAD_PERSONAL_PRACTICE_ENABLED__ = \(personalPractice != nil ? "true" : "false");",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = true
        // Match the web master's paper without moving content into unsafe areas.
        let paper = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(red: 13 / 255, green: 17 / 255, blue: 20 / 255, alpha: 1)
                : .white
        }
        webView.backgroundColor = paper
        webView.scrollView.backgroundColor = paper
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.navigationDelegate = context.coordinator
        context.coordinator.webView = webView
        webView.allowsBackForwardNavigationGestures = false
        webView.load(URLRequest(url: url, cachePolicy: .useProtocolCachePolicy))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler, @preconcurrency AVSpeechSynthesizerDelegate, @preconcurrency AVAudioPlayerDelegate {
        weak var webView: WKWebView?
        private let synthesizer = AVSpeechSynthesizer()
        private var clipPlayer: AVAudioPlayer?
        private var clipTask: Task<Void, Never>?
        private var clipRequestID: String?
        private var pendingRequestID: String?
        private var activeRequestID: String?

        private let personalPractice: PersonalPracticeConnection?

        init(personalPractice: PersonalPracticeConnection?) {
            self.personalPractice = personalPractice
            super.init()
            synthesizer.delegate = self
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "linguathreadPractice" {
                handlePractice(message)
                return
            }
            guard message.name == "linguathreadAudio",
                  let payload = message.body as? [String: Any],
                  let action = payload["action"] as? String else { return }
            if action == "stop" {
                clipTask?.cancel()
                clipTask = nil
                if let clipPlayer {
                    clipPlayer.stop()
                    self.clipPlayer = nil
                    notifySpeechCancelled(requestID: clipRequestID)
                    clipRequestID = nil
                }
                if !synthesizer.stopSpeaking(at: .immediate) {
                    notifySpeechCancelled(requestID: payload["requestID"] as? String)
                }
                return
            }
            if action == "playClip" {
                guard let path = payload["url"] as? String,
                      path.hasPrefix("/audio/packs/"),
                      !path.contains(".."),
                      let requestID = payload["requestID"] as? String,
                      let url = URL(string: "https://linguathread.vercel.app\(path)") else { return }
                clipTask?.cancel()
                clipPlayer?.stop()
                clipPlayer = nil
                synthesizer.stopSpeaking(at: .immediate)
                clipRequestID = requestID
                clipTask = Task { [weak self] in
                    do {
                        let (data, response) = try await URLSession.shared.data(from: url)
                        guard !Task.isCancelled, let self, self.clipRequestID == requestID else { return }
                        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                            self.notifySpeechEvent("linguathread:native-speech-error", requestID: requestID)
                            return
                        }
                        try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio)
                        try AVAudioSession.sharedInstance().setActive(true)
                        let player = try AVAudioPlayer(data: data)
                        player.enableRate = true
                        player.rate = (payload["rate"] as? Double) == 0.75 ? 0.75 : 1
                        self.clipPlayer = player
                        player.delegate = self
                        player.prepareToPlay()
                        if player.play() {
                            self.notifySpeechEvent("linguathread:native-speech-started", requestID: requestID)
                        } else {
                            self.clipPlayer = nil
                            self.notifySpeechEvent("linguathread:native-speech-error", requestID: requestID)
                        }
                    } catch {
                        guard !Task.isCancelled, let self, self.clipRequestID == requestID else { return }
                        self.notifySpeechEvent("linguathread:native-speech-error", requestID: requestID)
                    }
                }
                return
            }
            guard action == "speak",
                  let text = payload["text"] as? String,
                  let language = payload["language"] as? String else { return }
            if let clipPlayer {
                clipPlayer.stop()
                self.clipPlayer = nil
                notifySpeechCancelled(requestID: clipRequestID)
                clipRequestID = nil
            }
            clipTask?.cancel()
            clipTask = nil
            synthesizer.stopSpeaking(at: .immediate)
            pendingRequestID = payload["requestID"] as? String
            let utterance = AVSpeechUtterance(string: text)
            utterance.voice = bestAvailableVoice(for: language)
            utterance.rate = (payload["rate"] as? Double) == 0.75 ? 0.30 : 0.40
            utterance.pitchMultiplier = 1
            utterance.preUtteranceDelay = 0.08
            synthesizer.speak(utterance)
        }

        func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
            guard player === clipPlayer else { return }
            let requestID = clipRequestID
            clipPlayer = nil
            clipRequestID = nil
            notifySpeechEvent(flag ? "linguathread:native-speech-ended" : "linguathread:native-speech-cancelled", requestID: requestID)
        }

        private func bestAvailableVoice(for language: String) -> AVSpeechSynthesisVoice? {
            let requested = language.lowercased()
            let base = requested.split(separator: "-").first.map(String.init) ?? requested
            let candidates = AVSpeechSynthesisVoice.speechVoices().filter { voice in
                let code = voice.language.lowercased()
                guard code == requested || code.split(separator: "-").first.map(String.init) == base else { return false }
                if #available(iOS 17.0, *) {
                    return !voice.voiceTraits.contains(.isNoveltyVoice) && !voice.voiceTraits.contains(.isPersonalVoice)
                }
                return true
            }
            return candidates.max { left, right in
                let leftScore = (left.language.lowercased() == requested ? 10 : 0) + left.quality.rawValue
                let rightScore = (right.language.lowercased() == requested ? 10 : 0) + right.quality.rawValue
                return leftScore < rightScore
            } ?? AVSpeechSynthesisVoice(language: language)
        }

        func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
            activeRequestID = pendingRequestID
            notifySpeechEvent("linguathread:native-speech-started", requestID: activeRequestID)
        }

        func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
            notifySpeechEnded()
        }

        func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
            notifySpeechCancelled(requestID: activeRequestID)
            activeRequestID = nil
        }

        private func notifySpeechEnded() {
            notifySpeechEvent("linguathread:native-speech-ended", requestID: activeRequestID)
            activeRequestID = nil
        }

        private func notifySpeechCancelled(requestID: String?) {
            notifySpeechEvent("linguathread:native-speech-cancelled", requestID: requestID)
        }

        private func notifySpeechEvent(_ name: String, requestID: String?) {
            // JSONSerialization rejects top-level scalar fragments on-device and
            // raises an Objective-C exception before Swift can handle it. Encode
            // the optional directly so both a String and nil become valid JSON.
            guard let data = try? JSONEncoder().encode(requestID),
                  let json = String(data: data, encoding: .utf8) else { return }
            webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('\(name)', { detail: \(json) }))")
        }

        private func handlePractice(_ message: WKScriptMessage) {
            // Only the hosted LinguaThread main frame can use this narrow bridge.
            guard message.frameInfo.isMainFrame,
                  message.frameInfo.securityOrigin.protocol == "https",
                  message.frameInfo.securityOrigin.host == "linguathread.vercel.app",
                  let payload = message.body as? [String: Any],
                  let action = payload["action"] as? String else { return }
            if action == "copy",
               let text = payload["text"] as? String, !text.isEmpty, text.utf8.count <= 40_000,
               let requestID = payload["requestID"] as? String, UUID(uuidString: requestID) != nil {
                UIPasteboard.general.string = text
                Task { [weak self] in
                    guard let self else { return }
                    let shared = await self.personalPractice?.save(text) ?? false
                    let result: [String: Any] = ["requestID": requestID, "copied": true, "personalPracticeReady": shared]
                    guard let data = try? JSONSerialization.data(withJSONObject: result),
                          let json = String(data: data, encoding: .utf8) else { return }
                    _ = try? await self.webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('linguathread:practice-copy', { detail: \(json) }))")
                }
            } else if action == "connectPersonalPractice" {
                personalPractice?.reconnect()
            } else if action == "openChatGPT" {
                openChatGPT()
            }
        }

        private func openChatGPT() {
            // OpenAI's published apple-app-site-association declares #native as app home.
            let destination = URL(string: personalPractice == nil ? "https://chatgpt.com/" : "https://chatgpt.com/#native")!
            UIApplication.shared.open(destination, options: [.universalLinksOnly: true]) { opened in
                if !opened {
                    UIApplication.shared.open(destination, options: [:])
                }
            }
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void
        ) {
            if navigationAction.request.url?.absoluteString == "https://chatgpt.com/" {
                decisionHandler(.cancel)
                openChatGPT()
                return
            }
            guard let destination = navigationAction.request.url,
                  destination.scheme == "https",
                  destination.host == "linguathread.vercel.app" else {
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }
    }
}

// This private connection is instantiated only in the PERSONAL_PRACTICE test build.
// It operates LinguaThread's own Site; it never inspects or controls ChatGPT.
@MainActor
private final class PersonalPracticeConnection: NSObject, ObservableObject, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    @Published var showConnection = false
    @Published var connected = false
    let siteURL = URL(string: "https://linguathread-personal-practice.dez108.chatgpt.site/")!
    private(set) var browser: WKWebView!

    override init() {
        super.init()
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.add(self, name: "personalPractice")
        browser = WKWebView(frame: .zero, configuration: configuration)
        browser.navigationDelegate = self
        browser.uiDelegate = self
        browser.load(URLRequest(url: siteURL))
        showConnection = !UserDefaults.standard.bool(forKey: "personalPracticeConnected")
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.securityOrigin.protocol == "https",
              message.frameInfo.securityOrigin.host == siteURL.host,
              let payload = message.body as? [String: String], payload["action"] == "connected" else { return }
        connected = true
        UserDefaults.standard.set(true, forKey: "personalPracticeConnected")
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        connected = false
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if navigationAction.targetFrame == nil, navigationAction.request.url?.scheme == "https" {
            webView.load(navigationAction.request)
        }
        return nil
    }

    func reconnect() {
        if !connected { browser.load(URLRequest(url: siteURL)) }
        showConnection = true
    }

    func save(_ capsule: String) async -> Bool {
        guard connected, browser.url?.host == siteURL.host else { return false }
        // Bound the preparation to four seconds; clipboard fallback always remains.
        return await withCheckedContinuation { continuation in
            var finished = false
            let finish: (Bool) -> Void = { value in
                guard !finished else { return }
                finished = true
                continuation.resume(returning: value)
            }
            let timeout = Task { @MainActor in
                try? await Task.sleep(for: .seconds(4))
                guard !Task.isCancelled else { return }
                finish(false)
            }
            browser.callAsyncJavaScript("return await window.saveLinguaThreadPractice?.(capsule) === true;", arguments: ["capsule": capsule], in: nil, in: .page, completionHandler: { result in
                timeout.cancel()
                if case .success(let value) = result { finish((value as? Bool) == true) }
                else { finish(false) }
            })
        }
    }
}

private struct PersonalPracticeSheet: View {
    @ObservedObject var connection: PersonalPracticeConnection
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            PersonalPracticeBrowser(browser: connection.browser)
                .navigationTitle("Personal Live Practice")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button(connection.connected ? "Done" : "Close") { dismiss() }
                    }
                }
        }
    }
}

private struct PersonalPracticeBrowser: UIViewRepresentable {
    let browser: WKWebView
    func makeUIView(context: Context) -> WKWebView { browser }
    func updateUIView(_ view: WKWebView, context: Context) {}
}
