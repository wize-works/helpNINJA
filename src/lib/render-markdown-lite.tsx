import React from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * Lightweight markdown renderer (no GFM, tables, complex styling) intended for the embeddable widget.
 * Keep this dependency surface minimal so the widget bundle stays small.
 * Supported: paragraphs, emphasis, strong, links, inline & block code, basic lists, headings (compact scale).
 * Omitted: tables, task lists, footnotes, strikethrough (since no remark-gfm), custom blockquote styling.
 */
export function renderMarkdownLite(md: string) {
    return (
        <ReactMarkdown
            // No remark plugins -> smaller bundle
            components={{
                h1: (props) => <h1 className="text-base font-semibold mt-3 mb-1" {...props} />,
                h2: (props) => <h2 className="text-sm font-semibold mt-3 mb-1" {...props} />,
                h3: (props) => <h3 className="text-xs font-semibold mt-2 mb-1 uppercase tracking-wide" {...props} />,
                p: (props) => <p className="my-1 leading-snug" {...props} />,
                a: (props) => <a className="underline text-primary break-words" target="_blank" rel="noreferrer" {...props} />,
                ul: (props) => <ul className="list-disc ml-4 my-1 space-y-0.5" {...props} />,
                ol: (props) => <ol className="list-decimal ml-4 my-1 space-y-0.5" {...props} />,
                li: (props) => <li className="ml-0" {...props} />,
                code: ({ inline, children, ...rest }: { inline?: boolean; children?: React.ReactNode }) => {
                    if (inline) return <code className="px-1 rounded bg-base-200 text-[0.8em]" {...rest}>{children}</code>;
                    return (
                        <pre className="bg-base-200 rounded-md p-2 overflow-x-auto text-[0.75rem] leading-relaxed">
                            <code>{children}</code>
                        </pre>
                    );
                },
                blockquote: (props) => <blockquote className="pl-2 border-l border-base-300 italic text-base-content/70" {...props} />,
                hr: () => <hr className="my-4 border-base-300/60" />,
            }}
        >
            {md}
        </ReactMarkdown>
    );
}

/**
 * Tiny helper to choose renderer based on an estimated length.
 * Widgets can call this to auto-upgrade to the full renderer (dynamic import) only for larger / richer content.
 * This keeps initial payload small for short answers while still allowing richer formatting on demand.
 */
export async function smartRenderMarkdown(md: string, opts?: { fullThreshold?: number }) {
    const threshold = opts?.fullThreshold ?? 800; // characters
    if (md.length < threshold) return renderMarkdownLite(md);
    // Dynamically import heavy renderer only when needed
    const { renderMarkdown } = await import('./render-markdown');
    return renderMarkdown(md);
}
