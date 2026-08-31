# LinguaThread iOS build

This directory contains the signed iOS app shell for the LinguaThread master build. The production web app in the repository and at `https://linguathread.vercel.app/` remains the single source of truth for the launch choreography, typography, responsive layout, lesson engine, learner persistence, and future updates. The iOS target hosts that same runtime in `WKWebView` so the installed app stays in visual and behavioral harmony with the master instead of becoming a parallel rewrite.

The governing product and platform decisions are recorded in [`../docs/product-source-of-truth.md`](../docs/product-source-of-truth.md). Keep the shared runtime authoritative while adding native code only where iOS supplies a material platform benefit, such as reliable caching, network awareness, secure recovery, background synchronization, accessibility, or distribution support.

## Device installation

1. Open `LinguaThread.xcodeproj` in Xcode.
2. Connect the iPhone by cable, unlock it, and tap **Trust** if the phone asks whether to trust this Mac.
3. In Xcode, open the project settings, select the **LinguaThread** target, and under **Signing & Capabilities** choose the Apple Account / **Personal Team**. Leave automatic signing enabled.
4. Select the connected iPhone in the Xcode run-destination menu.
5. Press **Run**.
6. If iPhone asks you to trust the developer, open **Settings → General → VPN & Device Management**, select the developer profile, and tap **Trust**. Return to the app and run it again if necessary.

An unpaid personal Apple team is enough for this direct, private device test, although its development provisioning profile is time-limited. TestFlight is for distributing a beta build to other testers; it is not required for this first personal-device install.

The target uses a minimum iOS version of 17.0 and stable WebKit APIs, so it is built to run on iOS 26.6.1 and remain compatible with iOS 27. The app requires network access to load the Vercel master. Do not edit the web master from this iOS directory; update the production web app first, then rebuild the shell when a new device build is needed.

## App icon

`AppIconSource.svg` is the canonical, editable source for the simplified LinguaThread icon derived from the completed launch composition. Xcode consumes the opaque 1024×1024 PNG in `LinguaThread/Assets.xcassets/AppIcon.appiconset`. Keep the SVG as the source of truth and regenerate the PNG when the icon design changes.
