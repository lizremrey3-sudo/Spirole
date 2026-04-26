'use client'

import { useActionState, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveCommitment } from '@/app/actions/commitments'

const PROMPTS = [
  "What's one change you will make in every interaction this week?",
  "What improvements do you want to see in your performance?",
  "How will your improvements in performance impact your patients? Your team?",
  "How will I convey clear expectations for my patients?",
]

export default function CommitmentForm() {
  const [state, action, isPending] = useActionState(saveCommitment, null)
  const [selected, setSelected] = useState<string | null>(null)
  const [response, setResponse] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (state?.message) {
      setSelected(null)
      setResponse('')
      router.refresh()
    }
  }, [state?.message])

  function pick(prompt: string) {
    setSelected(prompt)
    setResponse('')
  }

  return (
    <div className="flex flex-col gap-4">
      {state?.error && (
        <p className="rounded-md bg-red-900/40 px-3 py-2 text-sm text-red-300">{state.error}</p>
      )}
      {state?.message && (
        <p className="rounded-md bg-[#2dd4bf]/10 px-3 py-2 text-sm text-[#2dd4bf]">{state.message}</p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PROMPTS.map(prompt => (
          <button
            key={prompt}
            type="button"
            onClick={() => pick(prompt)}
            className={[
              'rounded-xl border p-4 text-left text-sm leading-snug transition-all',
              selected === prompt
                ? 'border-[#2dd4bf] bg-[#2dd4bf]/10 text-[#2dd4bf]'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10',
            ].join(' ')}
          >
            {prompt}
          </button>
        ))}
      </div>

      {selected && (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="prompt" value={selected} />
          <textarea
            name="response"
            value={response}
            onChange={e => setResponse(e.target.value)}
            placeholder="Write your response here…"
            rows={4}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white placeholder-white/30 outline-none focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#2dd4bf]/40"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !response.trim()}
              className="rounded-md bg-[#2dd4bf] px-5 py-2 text-sm font-medium text-[#0a0e1a] transition-colors hover:bg-[#2dd4bf]/80 disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save commitment'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
