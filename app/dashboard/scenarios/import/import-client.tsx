'use client'

import { useActionState, useState, useRef } from 'react'
import Link from 'next/link'
import { importScenarios } from '@/app/actions/scenarios'

// ── CSV parser (RFC 4180) ─────────────────────────────────────────────────────

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let pos = 0
  const n = text.length

  function readField(): string {
    if (pos < n && text[pos] === '"') {
      pos++ // consume opening quote
      let value = ''
      while (pos < n) {
        if (text[pos] === '"') {
          if (pos + 1 < n && text[pos + 1] === '"') {
            value += '"'
            pos += 2
          } else {
            pos++ // consume closing quote
            break
          }
        } else {
          value += text[pos++]
        }
      }
      return value
    }
    let value = ''
    while (pos < n && text[pos] !== ',' && text[pos] !== '\n' && text[pos] !== '\r') {
      value += text[pos++]
    }
    return value
  }

  while (pos < n) {
    const fields: string[] = []
    fields.push(readField())
    while (pos < n && text[pos] === ',') {
      pos++
      fields.push(readField())
    }
    if (pos < n && text[pos] === '\r') pos++
    if (pos < n && text[pos] === '\n') pos++
    if (fields.some(f => f.trim() !== '')) rows.push(fields)
  }

  return rows
}

// ── Types & validation ────────────────────────────────────────────────────────

const VALID_TYPES = ['manager', 'optician', 'technician', 'receptionist']
const REQUIRED_HEADERS = ['title', 'associate_type', 'persona', 'rubric']

type ParsedRow = {
  title: string
  description: string
  associate_type: string
  persona: string
  rubric: string
  errors: string[]
}

function processFile(text: string): ParsedRow[] {
  const raw = parseCsv(text)
  if (raw.length === 0) throw new Error('CSV file is empty.')

  const headers = raw[0].map(h => h.trim().toLowerCase())
  for (const h of REQUIRED_HEADERS) {
    if (!headers.includes(h)) throw new Error(`Missing required column: "${h}"`)
  }

  const idx = (name: string) => headers.indexOf(name)
  const rows: ParsedRow[] = raw.slice(1).map(fields => {
    const get = (name: string) => (fields[idx(name)] ?? '').trim()
    const errors: string[] = []

    const title = get('title')
    const description = get('description')
    const associate_type = get('associate_type')
    const persona = get('persona')
    const rubric = get('rubric')

    if (!title) errors.push('Title is required')
    if (!VALID_TYPES.includes(associate_type))
      errors.push(`associate_type must be one of: ${VALID_TYPES.join(', ')}`)

    if (!persona) {
      errors.push('Persona is required')
    } else {
      try { JSON.parse(persona) } catch { errors.push('Persona is not valid JSON') }
    }

    if (!rubric) {
      errors.push('Rubric is required')
    } else {
      try { JSON.parse(rubric) } catch { errors.push('Rubric is not valid JSON') }
    }

    return { title, description, associate_type, persona, rubric, errors }
  })

  if (rows.length === 0) throw new Error('CSV has no data rows (only a header).')
  if (rows.length > 500) throw new Error('Too many rows. Maximum is 500 per import.')

  return rows
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ImportClient() {
  const [state, formAction, pending] = useActionState(importScenarios, null)
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setParseError('Please upload a .csv file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setParseError('File too large. Maximum is 5 MB.')
      return
    }
    try {
      const text = await file.text()
      const parsed = processFile(text)
      setRows(parsed)
      setParseError(null)
      setStep('preview')
    } catch (e) {
      setParseError((e as Error).message)
    }
  }

  const validCount = rows.filter(r => r.errors.length === 0).length
  const invalidCount = rows.length - validCount
  const canImport = rows.length > 0 && invalidCount === 0

  // ── Upload step ───────────────────────────────────────────────────────────

  if (step === 'upload') {
    return (
      <div className="flex flex-col gap-6">
        {parseError && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{parseError}</p>
        )}

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
          onClick={() => fileInputRef.current?.click()}
          className={[
            'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors',
            dragOver
              ? 'border-zinc-500 bg-zinc-50'
              : 'border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50',
          ].join(' ')}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <svg className="h-6 w-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">Drop a CSV file here, or click to browse</p>
            <p className="mt-1 text-xs text-zinc-500">Maximum 500 rows · 5 MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4">
          <p className="mb-2 text-xs font-semibold text-zinc-600">Expected format</p>
          <p className="mb-2 text-xs text-zinc-500">
            Required columns: <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono">title</code>,{' '}
            <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono">associate_type</code>,{' '}
            <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono">persona</code>,{' '}
            <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono">rubric</code>.
            Optional: <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono">description</code>.
            The <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono">persona</code> and{' '}
            <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono">rubric</code> columns
            must be JSON-encoded strings.
          </p>
          <pre className="overflow-x-auto rounded border border-zinc-200 bg-white p-3 font-mono text-xs leading-relaxed text-zinc-600">{
`title,description,associate_type,persona,rubric
"Handling Objections","Basic scenario","optician","{""name"":""Sarah"",""tone"":""friendly"",""background"":""5yr exp""}","{""dimensions"":[{""name"":""Rapport"",""description"":""Builds trust"",""max_score"":25}]}"`
          }</pre>
        </div>
      </div>
    )
  }

  // ── Preview step ──────────────────────────────────────────────────────────

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input
        type="hidden"
        name="rows"
        value={JSON.stringify(rows.map(({ title, description, associate_type, persona, rubric }) =>
          ({ title, description, associate_type, persona, rubric })
        ))}
      />

      {state?.error && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-zinc-900">{rows.length} rows parsed</span>
        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          {validCount} valid
        </span>
        {invalidCount > 0 && (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            {invalidCount} invalid
          </span>
        )}
      </div>

      {invalidCount > 0 && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Fix {invalidCount} invalid {invalidCount === 1 ? 'row' : 'rows'} in your CSV file, then re-upload.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <div className="max-h-[52vh] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50">
              <tr>
                <Th>#</Th>
                <Th>Title</Th>
                <Th>Associate Type</Th>
                <Th>Persona</Th>
                <Th>Rubric</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row, i) => {
                const isValid = row.errors.length === 0
                return (
                  <tr key={i} className={isValid ? 'bg-white' : 'bg-red-50'}>
                    <Td muted>{i + 1}</Td>
                    <Td>
                      {row.title
                        ? <span className="font-medium text-zinc-900">{row.title}</span>
                        : <span className="italic text-red-500">missing</span>}
                      {row.description && (
                        <span className="mt-0.5 block max-w-[200px] truncate text-xs text-zinc-400">
                          {row.description}
                        </span>
                      )}
                    </Td>
                    <Td><TypeBadge value={row.associate_type} /></Td>
                    <Td><JsonBadge value={row.persona} /></Td>
                    <Td><JsonBadge value={row.rubric} /></Td>
                    <Td>
                      {isValid ? (
                        <span className="text-xs font-medium text-green-700">✓ Ready</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {row.errors.map((err, j) => (
                            <li key={j} className="text-xs text-red-600">{err}</li>
                          ))}
                        </ul>
                      )}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={!canImport || pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending
            ? 'Importing…'
            : `Import ${validCount} ${validCount === 1 ? 'scenario' : 'scenarios'}`}
        </button>
        <button
          type="button"
          onClick={() => { setStep('upload'); setRows([]); setParseError(null) }}
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          Choose different file
        </button>
        <Link href="/dashboard" className="ml-auto text-sm text-zinc-500 hover:text-zinc-700">
          Cancel
        </Link>
      </div>
    </form>
  )
}

// ── Table cell helpers ────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-xs font-medium text-zinc-500">{children}</th>
  )
}

function Td({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td className={`px-4 py-3 align-top ${muted ? 'text-zinc-400' : 'text-zinc-700'}`}>{children}</td>
  )
}

function TypeBadge({ value }: { value: string }) {
  const valid = VALID_TYPES.includes(value)
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
      valid ? 'bg-zinc-100 text-zinc-700' : 'bg-red-100 text-red-700'
    }`}>
      {value || <em>missing</em>}
    </span>
  )
}

function JsonBadge({ value }: { value: string }) {
  if (!value) return <span className="text-xs text-red-600">✗ missing</span>
  try {
    JSON.parse(value)
    return <span className="text-xs text-green-700">✓ valid JSON</span>
  } catch {
    return <span className="text-xs text-red-600">✗ invalid JSON</span>
  }
}
