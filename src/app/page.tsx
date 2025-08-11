export default function Home(){
  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">HelpNinja</h1>
      <p className="mt-2 text-gray-600">A 2‑minute, AI‑powered website support agent. Paste a URL, crawl, answer, escalate.</p>
      <a className="inline-block mt-6 underline" href="/billing">Go to Billing</a> · <a className="underline" href="/integrations">Integrations</a>
    </main>
  )
}
