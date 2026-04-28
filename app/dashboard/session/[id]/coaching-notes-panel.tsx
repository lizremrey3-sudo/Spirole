'use client'

import { useActionState, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveCoachingNote } from '@/app/actions/coaching-notes'

type CoachingNote = { id: string; notes: string; updated_at: string } | null

export default function CoachingNotesPanel({
  sessionId,
  existingNote,
}: {
  sessionId: string
  existingNote: CoachingNote
}) {
  const [state, action, isPending] = useActionState(saveCoachingNote, null)
  const [isEditing, setIsEditing] = useState(!existingNote?.notes)
  const [notes, setNotes] = useState(existingNote?.notes ?? '')
  const router = useRouter()

  useEffect(() => {
    if (state?.message) {
      setIsEditing(false)
      router.refresh()
    }
  }, [state?.message])

  return (
    <div className="mb-8 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-indigo-300">Coaching Notes</h2>
          <p className="mt-0.5 text-xs text-white/40">Private — visible only to managers and admins</p>
        </div>
        {!isEditing && existingNote?.notes && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs text-white/50 transition-colors hover:text-white/80"
          >
            Edit
          </button>
        )}
      </div>

      {state?.error && (
        <p className="mb-3 rounded-md bg-red-900/40 px-3 py-2 text-sm text-red-300">{state.error}</p>
      )}
      {state?.message && (
        <p className="mb-3 rounded-md bg-[#2dd4bf]/10 px-3 py-2 text-sm text-[#2dd4bf]">{state.message}</p>
      )}

      {!isEditing ? (
        <div>
          {existingNote?.notes ? (
            <>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">{existingNote.notes}</p>
              {existingNote.updated_at && (
                <p className="mt-3 text-xs text-white/30">
                  Last updated{' '}
                  {new Date(existingNote.updated_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-sm text-white/40 transition-colors hover:text-white/60"
            >
              + Add coaching notes for this session
            </button>
          )}
        </div>
      ) : (
        <form action={action}>
          <input type="hidden" name="session_id" value={sessionId} />
          <textarea
            name="notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Key areas to address in 1:1s, specific examples from this session, patterns to watch for…"
            rows={5}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white placeholder-white/30 outline-none focus:border-indigo-400/60 focus:ring-1 focus:ring-indigo-400/40"
          />
          <div className="mt-3 flex items-center justify-end gap-3">
            {existingNote?.notes && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setNotes(existingNote.notes)
                }}
                className="text-sm text-white/40 transition-colors hover:text-white/70"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save notes'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
