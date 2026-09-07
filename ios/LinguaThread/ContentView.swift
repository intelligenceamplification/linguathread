import SwiftUI
import WebKit
@preconcurrency import AVFoundation

/// The iOS target hosts the same production runtime as the Vercel master.
/// This keeps the launch choreography, typography, responsive layout, lesson
/// engine, learner persistence, and future web updates on one source of truth.
struct ContentView: View {
    @Environment(\.colorScheme) private var colorScheme
    private let masterURL = URL(string: "https://linguathread.vercel.app/")!

    var body: some View {
        LinguaThreadWebView(url: masterURL)
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

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.userContentController.add(context.coordinator, name: "linguathreadAudio")
        configuration.userContentController.addUserScript(WKUserScript(
            source: "window.__LINGUATHREAD_NATIVE_SPEECH__ = true;",
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

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard webView.url == nil else { return }
        webView.load(URLRequest(url: url, cachePolicy: .useProtocolCachePolicy))
    }

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler, @preconcurrency AVSpeechSynthesizerDelegate {
        weak var webView: WKWebView?
        private let synthesizer = AVSpeechSynthesizer()

        override init() {
            super.init()
            synthesizer.delegate = self
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "linguathreadAudio",
                  let payload = message.body as? [String: Any],
                  let action = payload["action"] as? String else { return }
            if action == "stop" {
                synthesizer.stopSpeaking(at: .immediate)
                notifySpeechEnded()
                return
            }
            guard action == "speak",
                  let text = payload["text"] as? String,
                  let language = payload["language"] as? String else { return }
            synthesizer.stopSpeaking(at: .immediate)
            let utterance = AVSpeechUtterance(string: text)
            utterance.voice = AVSpeechSynthesisVoice(language: language)
            utterance.rate = 0.46
            utterance.pitchMultiplier = 1
            synthesizer.speak(utterance)
        }

        func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
            notifySpeechEnded()
        }

        func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
            notifySpeechEnded()
        }

        private func notifySpeechEnded() {
            webView?.evaluateJavaScript("window.dispatchEvent(new Event('linguathread:native-speech-ended'))")
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void
        ) {
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
