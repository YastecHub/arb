import { env } from '../config/env';

interface Mail {
  to: string;
  subject: string;
  html: string;
}

async function sendViaResend(mail: Mail): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.email.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.email.from, ...mail }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

export async function sendEmail(mail: Mail): Promise<void> {
  if (env.email.resendApiKey) {
    await sendViaResend(mail);
    return;
  }
  // Console fallback so dev flows work with no email account.
  // eslint-disable-next-line no-console
  console.log(`\n📧 [email:console] To: ${mail.to}\n   Subject: ${mail.subject}\n   ${mail.html.replace(/<[^>]+>/g, ' ').trim()}\n`);
}

export function resetEmail(name: string, link: string): Mail['html'] {
  return `<p>Hi ${name},</p><p>Reset your ARB ResearchHub password (valid 1 hour):</p><p><a href="${link}">Reset password</a></p><p>${link}</p>`;
}
