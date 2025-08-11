"use client";

import { useMemo, useState } from "react";
import ChatPreview from "@/components/chat-preview";

type Props = {
    tenantPublicKey: string;
};

export default function ChatWidgetPanel({ tenantPublicKey }: Props) {
    const [voice, setVoice] = useState<string>("friendly");
    const [copied, setCopied] = useState(false);

    const embedSnippet = useMemo(() => {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const v = encodeURIComponent(voice || "friendly");
        const src = origin ? `${origin}/api/widget?t=${tenantPublicKey}&voice=${v}` : `/api/widget?t=${tenantPublicKey}&voice=${v}`;
        return `<script src="${src}" async></script>`;
    }, [tenantPublicKey, voice]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(embedSnippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="form-control w-full md:w-60">
                    <label className="label"><span className="label-text">Voice</span></label>
                    <select className="select select-bordered select-sm" value={voice} onChange={(e) => setVoice(e.target.value)}>
                        <option value="friendly">friendly</option>
                        <option value="formal">formal</option>
                    </select>
                </div>
                <div className="md:ml-auto" />
            </div>

            <div className="rounded border border-base-300 bg-base-100">
                <div className="px-3 py-2 flex items-center justify-between">
                    <div className="text-sm opacity-70">Embed snippet</div>
                    <button type="button" onClick={copy} className="btn btn-xs">
                        {copied ? "Copied" : "Copy"}
                    </button>
                </div>
                <pre className="px-3 pb-3 text-xs overflow-x-auto">
                    {embedSnippet}
                </pre>
            </div>

            <div className="mt-2">
                <ChatPreview tenantPublicKey={tenantPublicKey} voice={voice} height={520} />
            </div>
        </div>
    );
}
