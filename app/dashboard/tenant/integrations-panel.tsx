'use client'

import { useState, useTransition } from 'react'
import { saveGooglePlaceId } from '@/app/actions/integrations'

export default function IntegrationsPanel({
  tenantId,
  initialPlaceId,
  baseUrl,
}: {
  tenantId: string
  initialPlaceId: string | null
  baseUrl: string
}) {
  const webhookUrl = `${baseUrl}/api/webhooks/metrics/${tenantId}`
  const [placeId, setPlaceId] = useState(initialPlaceId ?? '')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await saveGooglePlaceId(placeId)
      setMessage(result.error
        ? { text: result.error, ok: false }
        : { text: 'Saved!', ok: true })
    })
  }

  function handleCopy() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#111827] p-6">
      <h2 className="mb-1 text-sm font-semibold text-[#2dd4bf]">Integrations</h2>
      <p className="mb-6 text-xs text-white/40">Connect external data sources to track real-world impact.</p>

      <div className="flex flex-col gap-6">

        {/* Google Reviews */}
        <div>
          <p className="mb-1 text-sm font-medium text-white">Google Reviews</p>
          <p className="mb-3 text-xs text-white/50">
            Enter your Google Place ID to sync star ratings and review counts daily.{' '}
            <a
              href="https://developers.google.com/maps/documentation/places/web-service/place-id"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2dd4bf]/70 hover:text-[#2dd4bf] underline"
            >
              Find your Place ID
            </a>
          </p>
          <form onSubmit={handleSave} className="flex gap-2">
            <input
              type="text"
              value={placeId}
              onChange={e => setPlaceId(e.target.value)}
              placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
              className="flex-1 min-w-0 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-[#2dd4bf]/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isPending}
              className="shrink-0 rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </form>
          {message && (
            <p className={`mt-2 text-xs ${message.ok ? 'text-[#2dd4bf]' : 'text-red-400'}`}>
              {message.text}
            </p>
          )}
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Zapier Webhook */}
        <div>
          <p className="mb-1 text-sm font-medium text-white">Zapier Webhook</p>
          <p className="mb-3 text-xs text-white/50">
            POST to this URL from Zapier to send any business metric into Spirole. Include{' '}
            <span className="font-mono text-white/60">source</span>,{' '}
            <span className="font-mono text-white/60">metric_name</span>,{' '}
            <span className="font-mono text-white/60">metric_value</span>, and{' '}
            <span className="font-mono text-white/60">recorded_date</span>{' '}
            (YYYY-MM-DD) in the request body.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/60 font-mono truncate select-all">
              {webhookUrl}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
