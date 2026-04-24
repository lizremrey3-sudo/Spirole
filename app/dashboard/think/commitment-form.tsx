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
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state?.message && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>
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
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400',
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
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm leading-relaxed text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !response.trim()}
              className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save commitment'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
