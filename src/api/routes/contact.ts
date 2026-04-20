import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Resend } from 'resend';
import { ContactFormSchema } from '@/types/api';
import { sanitiseTextServer } from '../middleware/sanitise';
import { rateLimitMiddleware, ipHashIdentifier } from '../middleware/rateLimit';
import { rateLimits } from '@/lib/redis/client';

const contactRoutes = new Hono();

// POST /api/contact — unauthenticated, rate-limited by IP hash (3/hour)
contactRoutes.post(
  '/',
  rateLimitMiddleware(rateLimits.contact, ipHashIdentifier),
  zValidator('json', ContactFormSchema),
  async (c) => {
    const body = c.req.valid('json');

    const resendKey = process.env['RESEND_API_KEY'];
    const fromEmail = process.env['RESEND_FROM_EMAIL'];

    if (!resendKey || !fromEmail) {
      return c.json({ error: 'Email service not configured' }, 500);
    }

    const resend = new Resend(resendKey);

    const name = sanitiseTextServer(body.name);
    const message = sanitiseTextServer(body.message);
    const email = body.email;

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: fromEmail,
      replyTo: email,
      subject: `NutriApp contact: ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p><p>${message.replace(/\n/g, '<br>')}</p>`,
    });

    if (error !== null) {
      return c.json({ error: 'Failed to send message' }, 500);
    }

    return c.json({ ok: true });
  },
);

export { contactRoutes };
