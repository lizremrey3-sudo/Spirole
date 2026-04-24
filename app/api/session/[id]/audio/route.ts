import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Verify session ownership
  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return new Response('Session not found', { status: 404 })

  const formData = await request.formData()
  const audio = formData.get('audio') as Blob | null
  if (!audio) return new Response('Missing audio', { status: 400 })

  const arrayBuffer = await audio.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from('session-audio')
    .upload(`${sessionId}.webm`, buffer, {
      contentType: 'audio/webm',
      upsert: true,
    })

  if (error) {
    console.error('Audio upload error:', error)
    return new Response('Upload failed', { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
