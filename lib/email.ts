import { Resend } from 'resend'

export async function sendInviteEmail({
  to,
  invitedByEmail,
  joinUrl,
}: {
  to: string
  invitedByEmail: string
  joinUrl: string
}) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM_EMAIL ?? 'Spirole <noreply@spiroletrainer.com>'
  await resend.emails.send({
    from: FROM,
    to,
    subject: "You've been invited to Spirole",
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:40px auto;padding:40px 32px;background:#111827;border-radius:16px;border:1px solid rgba(255,255,255,0.08);">
    <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#2dd4bf;">SPIROLE</p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">You're invited to join Spirole</h1>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.55);">
      <strong style="color:rgba(255,255,255,0.8);">${invitedByEmail}</strong> has invited you to their practice on Spirole — AI-powered communication training for optical teams.
    </p>
    <a href="${joinUrl}" style="display:inline-block;padding:12px 28px;background:#2dd4bf;color:#0a0e1a;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">Accept Invitation</a>
    <p style="margin:28px 0 0;font-size:12px;color:rgba(255,255,255,0.25);line-height:1.6;">
      This link expires in 7 days. If you weren't expecting this email you can safely ignore it.
    </p>
  </div>
</body>
</html>`,
  })
}
