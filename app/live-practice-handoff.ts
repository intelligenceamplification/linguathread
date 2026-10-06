// Only this boundary knows about the clipboard and external destination.
export const chatGPTDestination = "https://chatgpt.com/";
type NativePractice = { postMessage: (value: unknown) => void };
function nativePractice(): NativePractice | undefined {
  return (window as Window & { webkit?: { messageHandlers?: { linguathreadPractice?: NativePractice } } }).webkit?.messageHandlers?.linguathreadPractice;
}

export async function copyPracticeContext(text: string): Promise<void> {
  const native = nativePractice();
  if (!native) {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const requestID = crypto.randomUUID();
    const cleanup = () => { clearTimeout(timeout); window.removeEventListener("linguathread:practice-copy", result); };
    const result = (event: Event) => {
      const detail = (event as CustomEvent<{ requestID: string; copied: boolean }>).detail;
      if (detail?.requestID !== requestID) return;
      cleanup();
      if (detail.copied) resolve(); else reject(new Error("Clipboard unavailable"));
    };
    const timeout = setTimeout(() => { cleanup(); reject(new Error("Clipboard unavailable")); }, 5000);
    window.addEventListener("linguathread:practice-copy", result);
    try { native.postMessage({ action: "copy", text, requestID }); }
    catch { cleanup(); reject(new Error("Clipboard unavailable")); }
  });
}

// Return true only when native code takes responsibility; otherwise use the normal anchor.
export function openNativeChatGPT(): boolean {
  const native = nativePractice();
  if (!native) return false;
  try { native.postMessage({ action: "openChatGPT" }); return true; }
  catch { return false; }
}
