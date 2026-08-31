import SwiftUI
import WebKit

/// The iOS target hosts the same production runtime as the Vercel master.
/// This keeps the launch choreography, typography, responsive layout, lesson
/// engine, learner persistence, and future web updates on one source of truth.
struct ContentView: View {
    private let masterURL = URL(string: "https://linguathread.vercel.app/")!

    var body: some View {
        LinguaThreadWebView(url: masterURL)
            .background(Color.white)
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

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = true
        webView.backgroundColor = .white
        webView.scrollView.backgroundColor = .white
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = false
        webView.load(URLRequest(url: url, cachePolicy: .useProtocolCachePolicy))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard webView.url == nil else { return }
        webView.load(URLRequest(url: url, cachePolicy: .useProtocolCachePolicy))
    }

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate {
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
