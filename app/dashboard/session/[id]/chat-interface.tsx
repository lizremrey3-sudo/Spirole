'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

type Props = {
  sessionId: string
  initialMessages: Message[]
  personaName: string
  userMessageCount: number
}

const MIN_TURNS = 6

// Minimal local types — Web Speech API is not in all TypeScript DOM lib versions
interface SR {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((e: SREvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

interface SRResult { isFinal: boolean; 0: { transcript: string } }
interface SREvent { resultIndex: number; results: SRResult[] & { length: number } }

function getSpeechRecognitionCtor(): (new () => SR) | null {
  if (typeof window === 'undefined') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as ((new () => SR) | undefined) ?? null
}

export default function ChatInterface({
  sessionId,
  initialMessages,
  personaName,
  userMessageCount: initialUserCount,
}: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [isEnding, startEnding] = useTransition()
  const [endError, setEndError] = useState<string | null>(null)
  const [userTurns, setUserTurns] = useState(initialUserCount)
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [speechSupported, setSpeechSupported] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SR | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    setSpeechSupported(getSpeechRecognitionCtor() !== null)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Stop recognition if the session ends or a message starts streaming
  useEffect(() => {
    if (isStreaming || isEnding) {
      recognitionRef.current?.stop()
    }
  }, [isStreaming, isEnding])

  const stopMediaRecorder = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const toggleSpeech = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      stopMediaRecorder()
      return
    }

    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (e: SREvent) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      if (final) {
        setInput(prev => {
          const base = prev.trimEnd()
          return base ? `${base} ${final.trim()}` : final.trim()
        })
        setInterimText('')
      } else {
        setInterimText(interim)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimText('')
      stopMediaRecorder()
      textareaRef.current?.focus()
    }

    recognition.onerror = () => {
      setIsListening(false)
      setInterimText('')
      stopMediaRecorder()
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)

    // Capture audio in parallel with speech recognition
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        mr.ondataavailable = e => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data)
        }
        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop())
        }
        mr.start()
        mediaRecorderRef.current = mr
      }).catch(() => { /* microphone denied — speech recognition may still work */ })
    }
  }

  const sendMessage = async () => {
    const content = input.trim()
    if (!content || isStreaming) return

    recognitionRef.current?.stop()
    setInput('')
    setIsStreaming(true)
    setStreamingText('')

    const optimisticId = `optimistic-${Date.now()}`
    setMessages(prev => [...prev, {
      id: optimisticId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }])
    setUserTurns(prev => prev + 1)

    try {
      const res = await fetch(`/api/session/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!res.ok || !res.body) throw new Error('Failed to get response')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setStreamingText(accumulated)
      }

      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: accumulated,
        created_at: new Date().toISOString(),
      }])
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setUserTurns(prev => prev - 1)
    } finally {
      setIsStreaming(false)
      setStreamingText('')
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleEndSession = () => {
    if (userTurns < MIN_TURNS) {
      setEndError(`You need at least ${MIN_TURNS} exchanges before ending. You have ${userTurns} so far.`)
      return
    }
    setEndError(null)
    startEnding(async () => {
      // Upload any captured audio before evaluation (non-blocking on failure)
      recognitionRef.current?.stop()
      stopMediaRecorder()
      const chunks = audioChunksRef.current
      if (chunks.length > 0) {
        try {
          const blob = new Blob(chunks, { type: 'audio/webm' })
          const fd = new FormData()
          fd.append('audio', blob, 'audio.webm')
          await fetch(`/api/session/${sessionId}/audio`, { method: 'POST', body: fd })
        } catch { /* audio upload failure should not block evaluation */ }
      }

      const res = await fetch(`/api/session/${sessionId}/evaluate`, { method: 'POST' })
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json() as { message?: string; error?: string }
        setEndError(data.message ?? data.error ?? 'Evaluation failed. Please try again.')
      }
    })
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl flex flex-col gap-4">
          {messages.map(msg => (
            <MessageBubble key={msg.id} role={msg.role} content={msg.content} personaName={personaName} />
          ))}

          {isStreaming && streamingText && (
            <MessageBubble role="assistant" content={streamingText} personaName={personaName} streaming />
          )}

          {isStreaming && !streamingText && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white border border-zinc-200 px-4 py-3 text-sm text-zinc-400 shadow-sm">
                <span className="animate-pulse">{personaName} is typing…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* End session error */}
      {endError && (
        <div className="mx-auto w-full max-w-2xl px-4">
          <p className="mb-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 border border-red-200">
            {endError}
          </p>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-zinc-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-2xl flex gap-2 items-end">
          <div className="flex-1 flex flex-col gap-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
              disabled={isStreaming || isEnding}
              rows={1}
              className="w-full resize-none rounded-xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
              style={{ maxHeight: '120px' }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${el.scrollHeight}px`
              }}
            />
            {interimText && (
              <p className="px-1 text-xs text-zinc-400 italic truncate">
                {interimText}
              </p>
            )}
          </div>

          {speechSupported && (
            <button
              onClick={toggleSpeech}
              disabled={isStreaming || isEnding}
              title={isListening ? 'Stop listening' : 'Speak your message'}
              className={[
                'shrink-0 rounded-xl border p-3 transition-colors disabled:opacity-40',
                isListening
                  ? 'border-red-200 bg-red-50 text-red-600 animate-pulse'
                  : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700',
              ].join(' ')}
            >
              <MicIcon />
            </button>
          )}

          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming || isEnding}
            className="shrink-0 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40"
          >
            Send
          </button>
          <button
            onClick={handleEndSession}
            disabled={isStreaming || isEnding}
            className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-40"
          >
            {isEnding ? 'Evaluating…' : 'End Session'}
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-zinc-400">
          {userTurns < MIN_TURNS
            ? `${MIN_TURNS - userTurns} more exchange${MIN_TURNS - userTurns === 1 ? '' : 's'} needed before ending`
            : 'Ready to end — click End Session when finished'}
        </p>
      </div>
    </div>
  )
}

function MicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function MessageBubble({
  role,
  content,
  personaName,
  streaming = false,
}: {
  role: 'user' | 'assistant'
  content: string
  personaName: string
  streaming?: boolean
}) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <span className="px-1 text-xs font-medium text-zinc-400">
          {isUser ? 'You' : personaName}
        </span>
        <div className={[
          'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-wrap',
          isUser ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-900',
          streaming ? 'opacity-80' : '',
        ].join(' ')}>
          {content}
          {streaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current align-text-bottom" />
          )}
        </div>
      </div>
    </div>
  )
}
