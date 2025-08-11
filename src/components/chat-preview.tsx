"use client";

import { useMemo, useRef, useState } from "react";

type Props = {
    tenantPublicKey: string;     // tenants.public_key
    voice?: "friendly" | "formal" | string;
    height?: number;             // px
};

export default function ChatPreview({
    tenantPublicKey,
    voice = "friendly",
    height = 520,
}: Props) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [nonce, setNonce] = useState(0); // force reloads

    // The HTML we render inside the iframe.
    // Uses the real widget script at /api/widget?t=...
    const srcDoc = useMemo(() => {
        const safeVoice = encodeURIComponent(voice);
        const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, viewport-fit=cover"
  />
  <title>HelpNinja — Preview</title>
  <style>
    html, body { height: 100%; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
      background: #f6f7fb;
    }
    .hint {
      position: fixed; left: 12px; bottom: 12px; font-size: 12px; color: #667085;
      background: #fff; border: 1px solid #e5e7eb; padding: 6px 8px; border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="hint">This is a live preview of your site widget.</div>

  <!-- Real widget (same one customers embed) -->
  <script src="/api/widget?t=${tenantPublicKey}&voice=${safeVoice}" async></script>

  <!-- Preview control channel -->
  <script>
    // Listen for preview commands from parent (reset, ping, etc.)
    window.addEventListener("message", (ev) => {
      if (!ev || !ev.data || typeof ev.data !== "object") return;
      const { type } = ev.data;
      if (type === "hn:reset") {
        try {
          localStorage.removeItem("hn_sid");
          // If widget maintains any in-DOM state, a reload is simplest:
          location.reload();
        } catch (_) {}
      }
      if (type === "hn:ping") {
        parent.postMessage({ type: "hn:pong" }, "*");
      }
    }, false);
  </script>
</body>
</html>`;
        // data URL is not required because we use srcDoc, but escape for safety if needed
        return html;
    }, [tenantPublicKey, voice, nonce]);

    const onReset = () => {
        // tell the iframe to clear session + reload
        iframeRef.current?.contentWindow?.postMessage({ type: "hn:reset" }, "*");
    };

    const onReload = () => setNonce((n) => n + 1);

    const onPopOut = () => {
        // Open a separate window with the same srcDoc (helpful for narrow dashboards)
        const win = window.open("", "_blank");
        if (!win) return;
        win.document.open();
        win.document.write(srcDoc);
        win.document.close();
    };

    return (
        <div className="w-full">
            <div className="mb-2 flex items-center gap-2">
                <span className="text-sm text-gray-600">Chat preview</span>
                <div className="ml-auto flex gap-2">
                    <button onClick={onReset} className="border rounded px-3 py-1 text-sm">
                        Reset conversation
                    </button>
                    <button onClick={onReload} className="border rounded px-3 py-1 text-sm">
                        Reload
                    </button>
                    <button onClick={onPopOut} className="border rounded px-3 py-1 text-sm">
                        Pop out
                    </button>
                </div>
            </div>

            <iframe
                key={nonce} // hard reload when nonce changes
                ref={iframeRef}
                title="HelpNinja Preview"
                style={{ width: "100%", height, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff" }}
                sandbox="allow-scripts allow-same-origin allow-forms"
                srcDoc={srcDoc}
            />
        </div>
    );
}
