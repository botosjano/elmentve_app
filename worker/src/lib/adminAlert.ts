import type { EmailProvider } from './email';

// Vegleg hibas kuldesnel es a scheduled-run sajat hibajanal is
// adminriasztas -- spec 7. resz utolso pontja.
export async function sendAdminAlert(
  provider: EmailProvider,
  fromEmail: string,
  adminEmail: string,
  subject: string,
  details: string,
): Promise<void> {
  await provider.send({
    to: adminEmail,
    from: fromEmail,
    replyTo: fromEmail,
    subject: `[Elmentve worker] ${subject}`,
    text: details,
    html: `<pre>${details.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!)}</pre>`,
    idempotencyKey: `admin-alert:${subject}:${Date.now()}`,
  });
}
