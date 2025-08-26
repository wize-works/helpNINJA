import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Central markdown rendering function to reuse in dashboard + widget
export function renderMarkdown(md: string) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                h1: (props) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                h2: (props) => <h2 className="text-lg font-semibold mt-4 mb-2" {...props} />,
                h3: (props) => <h3 className="text-base font-semibold mt-3 mb-1" {...props} />,
                p: (props) => <p className="my-2 leading-relaxed" {...props} />,
                a: (props) => <a className="link link-primary break-words" target="_blank" rel="noreferrer" {...props} />,
                ul: (props) => <ul className="list-disc ml-5 my-2 space-y-1" {...props} />,
                ol: (props) => <ol className="list-decimal ml-5 my-2 space-y-1" {...props} />,
                li: (props) => <li className="ml-1" {...props} />,
                code: ({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) => {
                    const lang = /language-(\w+)/.exec(className || '')?.[1];
                    if (inline) return <code className="px-1 py-0.5 rounded bg-base-200 text-[0.85em]" {...props}>{children}</code>;
                    return (
                        <pre className="bg-base-200 rounded-md p-3 overflow-x-auto text-sm" data-lang={lang}>
                            <code>{children}</code>
                        </pre>
                    );
                },
                blockquote: (props) => <blockquote className="border-l-4 border-base-300 pl-3 italic text-base-content/70 my-2" {...props} />,
                table: (props) => <div className="overflow-x-auto my-4"><table className="table table-xs" {...props} /></div>,
                th: (props) => <th className="font-semibold bg-base-200/60" {...props} />,
                td: (props) => <td className="align-top" {...props} />,
                hr: () => <hr className="my-6 border-base-300/60" />,
            }}
        >
            {md}
        </ReactMarkdown>
    );
}
