import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import JoinForm from './join-form'

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return <InvalidLink reason="No invite token found in this link." />
  }

  const admin = createAdminClient()
  const { data: invitation } = await admin
    .from('invitations')
    .select('email, accepted_at, token_expires_at')
    .eq('token', token)
    .maybeSingle()

  if (!invitation) {
    return <InvalidLink reason="This invite link is invalid or has already been used." />
  }

  if (invitation.accepted_at) {
    return <InvalidLink reason="This invite has already been accepted. Please sign in." />
  }

  if (new Date(invitation.token_expires_at as string) < new Date()) {
    return <InvalidLink reason="This invite link has expired. Ask your admin to resend the invite." />
  }

  return <JoinForm token={token} email={invitation.email as string} />
}

function InvalidLink({ reason }: { reason: string }) {
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-white">Invalid invite link</h1>
      <p className="mb-6 text-sm text-white/50">{reason}</p>
      <Link href="/sign-in" className="text-sm text-[#2dd4bf] hover:underline">
        Go to sign in
      </Link>
    </>
  )
}
