import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host:   process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  port:   Number(process.env.BREVO_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

const FROM = `"${process.env.BREVO_FROM_NAME || 'GDGOC-UITU'}" <${process.env.BREVO_FROM_EMAIL || 'noreply@gdgoc-uitu.com'}>`;

// ─── Shared layout wrapper ────────────────────────────────────────────────────

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px;background:#f4f4f0;">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
          style="background:#ffffff;border-radius:16px;overflow:hidden;border:3px solid #0f172a;box-shadow:6px 6px 0 #0f172a;max-width:600px;width:100%;margin:0 auto;">
          <!-- Google-color top bar -->
          <tr>
            <td style="background:#4285F4;height:5px;width:25%;padding:0;font-size:0;line-height:0;">&nbsp;</td>
            <td style="background:#EA4335;height:5px;width:25%;padding:0;font-size:0;line-height:0;">&nbsp;</td>
            <td style="background:#FBBC05;height:5px;width:25%;padding:0;font-size:0;line-height:0;">&nbsp;</td>
            <td style="background:#34A853;height:5px;width:25%;padding:0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <!-- Content -->
          <tr>
            <td colspan="4" style="padding:36px 40px 28px;">${body}</td>
          </tr>
          <!-- Footer -->
          <tr>
            <td colspan="4" style="padding:16px 40px 24px;border-top:2px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;font-family:Arial,sans-serif;">
                GDGOC · Google Developer Groups On Campus — UIT University, Karachi
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#cbd5e1;font-family:Arial,sans-serif;">
                You're receiving this because you're a member of GDGOC-UITU.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Templates ────────────────────────────────────────────────────────────────

function registrationConfirmedHtml(name: string, eventTitle: string, eventDate: string, eventUrl: string): string {
  return layout(`
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:-0.5px;font-family:Arial,sans-serif;">
      Registration Confirmed!
    </h1>
    <p style="margin:0 0 22px;color:#64748b;font-size:14px;font-family:Arial,sans-serif;">Hi ${name},</p>
    <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6;font-family:Arial,sans-serif;">
      You're all set! Your spot for <strong>"${eventTitle}"</strong> has been confirmed.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="background:#f8fafc;border-radius:12px;border:2px solid #e2e8f0;margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Event</p>
        <p style="margin:0 0 14px;font-size:17px;font-weight:800;color:#0f172a;font-family:Arial,sans-serif;">${eventTitle}</p>
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Date &amp; Time</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:#334155;font-family:Arial,sans-serif;">${eventDate}</p>
      </td></tr>
    </table>
    <a href="${eventUrl}"
      style="display:inline-block;padding:13px 32px;background:#4285F4;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;border-radius:50px;border:3px solid #0f172a;box-shadow:4px 4px 0 #0f172a;font-family:Arial,sans-serif;">
      View Event Details
    </a>
  `);
}

function newReplyHtml(name: string, replierName: string, threadTitle: string, threadUrl: string, snippet?: string): string {
  return layout(`
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:-0.5px;font-family:Arial,sans-serif;">
      New Reply
    </h1>
    <p style="margin:0 0 22px;color:#64748b;font-size:14px;font-family:Arial,sans-serif;">Hi ${name},</p>
    <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;font-family:Arial,sans-serif;">
      <strong>${replierName}</strong> replied to your thread <strong>"${threadTitle}"</strong>:
    </p>
    ${snippet ? `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="background:#f8fafc;border-radius:12px;border-left:4px solid #4285F4;margin-bottom:28px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;font-style:italic;font-family:Arial,sans-serif;">${snippet}</p>
      </td></tr>
    </table>` : `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="background:#eff6ff;border-radius:12px;border:2px solid #bfdbfe;margin-bottom:28px;">
      <tr><td style="padding:18px 24px;">
        <p style="margin:0;font-size:16px;font-weight:700;color:#1e40af;font-family:Arial,sans-serif;">"${threadTitle}"</p>
      </td></tr>
    </table>`}
    <a href="${threadUrl}"
      style="display:inline-block;padding:13px 32px;background:#4285F4;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;border-radius:50px;border:3px solid #0f172a;box-shadow:4px 4px 0 #0f172a;font-family:Arial,sans-serif;">
      Read the Reply
    </a>
  `);
}

function welcomeHtml(name: string, username: string, dashboardUrl: string): string {
  return layout(`
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:-0.5px;font-family:Arial,sans-serif;">
      Welcome to GDGOC-UITU!
    </h1>
    <p style="margin:0 0 22px;color:#64748b;font-size:14px;font-family:Arial,sans-serif;">Hi ${name},</p>
    <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6;font-family:Arial,sans-serif;">
      Your account <strong>@${username}</strong> is ready. Explore upcoming events, join forum discussions,
      and connect with the community.
    </p>
    <a href="${dashboardUrl}"
      style="display:inline-block;padding:13px 32px;background:#34A853;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;border-radius:50px;border:3px solid #0f172a;box-shadow:4px 4px 0 #0f172a;font-family:Arial,sans-serif;">
      Go to Dashboard
    </a>
  `);
}

function mentionHtml(name: string, mentionerName: string, context: string, threadTitle: string, threadUrl: string, snippet?: string): string {
  return layout(`
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:-0.5px;font-family:Arial,sans-serif;">
      You Were Mentioned
    </h1>
    <p style="margin:0 0 22px;color:#64748b;font-size:14px;font-family:Arial,sans-serif;">Hi ${name || 'there'},</p>
    <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;font-family:Arial,sans-serif;">
      <strong>${mentionerName}</strong> mentioned you in ${context} <strong>"${threadTitle}"</strong>:
    </p>
    ${snippet ? `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="background:#fffbeb;border-radius:12px;border-left:4px solid #FBBC05;margin-bottom:28px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:14px;color:#78350f;line-height:1.7;font-style:italic;font-family:Arial,sans-serif;">${snippet}</p>
      </td></tr>
    </table>` : `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="background:#fef3c7;border-radius:12px;border:2px solid #fde68a;margin-bottom:28px;">
      <tr><td style="padding:18px 24px;">
        <p style="margin:0;font-size:16px;font-weight:700;color:#92400e;font-family:Arial,sans-serif;">"${threadTitle}"</p>
      </td></tr>
    </table>`}
    <a href="${threadUrl}"
      style="display:inline-block;padding:13px 32px;background:#FBBC05;color:#0f172a;text-decoration:none;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;border-radius:50px;border:3px solid #0f172a;box-shadow:4px 4px 0 #0f172a;font-family:Arial,sans-serif;">
      View the Thread
    </a>
  `);
}

function newEventAnnouncementHtml(
  eventTitle: string,
  eventDate: string,
  venue: string | null,
  description: string | null,
  eventUrl: string,
): string {
  return layout(`
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:-0.5px;font-family:Arial,sans-serif;">
      New Event
    </h1>
    <p style="margin:0 0 22px;color:#64748b;font-size:14px;font-family:Arial,sans-serif;">A new event has just been announced:</p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="background:#f8fafc;border-radius:12px;border:2px solid #e2e8f0;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Event</p>
        <p style="margin:0 0 16px;font-size:18px;font-weight:800;color:#0f172a;font-family:Arial,sans-serif;">${eventTitle}</p>
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Date &amp; Time</p>
        <p style="margin:0 0 ${venue || description ? '16' : '0'}px;font-size:15px;font-weight:600;color:#334155;font-family:Arial,sans-serif;">${eventDate}</p>
        ${venue ? `
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Venue</p>
        <p style="margin:0 0 ${description ? '16' : '0'}px;font-size:15px;font-weight:600;color:#334155;font-family:Arial,sans-serif;">${venue}</p>` : ''}
        ${description ? `
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">About</p>
        <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;font-family:Arial,sans-serif;">${description}</p>` : ''}
      </td></tr>
    </table>
    <a href="${eventUrl}"
      style="display:inline-block;padding:13px 32px;background:#34A853;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;border-radius:50px;border:3px solid #0f172a;box-shadow:4px 4px 0 #0f172a;font-family:Arial,sans-serif;">
      View Event &#8594;
    </a>
  `);
}

function newsletterWelcomeHtml(name: string): string {
  return layout(`
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:-0.5px;font-family:Arial,sans-serif;">
      You're on the list!
    </h1>
    <p style="margin:0 0 22px;color:#64748b;font-size:14px;font-family:Arial,sans-serif;">Hi ${name || 'there'},</p>
    <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6;font-family:Arial,sans-serif;">
      Thanks for subscribing to the <strong>GDGOC-UITU newsletter</strong>. We'll keep you updated on
      events, workshops, hackathons, and everything happening in the community.
    </p>
    <p style="margin:0;color:#94a3b8;font-size:13px;font-family:Arial,sans-serif;">
      You can unsubscribe anytime from your account settings.
    </p>
  `);
}

// ─── Public send functions ────────────────────────────────────────────────────

export async function sendRegistrationConfirmed({
  to, name, eventTitle, eventDate, eventUrl,
}: {
  to: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  eventUrl: string;
}): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `You're registered for "${eventTitle}"!`,
    html: registrationConfirmedHtml(name, eventTitle, eventDate, eventUrl),
  });
}

export async function sendNewReplyNotification({
  to, name, replierName, threadTitle, threadUrl, snippet,
}: {
  to: string;
  name: string;
  replierName: string;
  threadTitle: string;
  threadUrl: string;
  snippet?: string;
}): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `${replierName} replied to your thread`,
    html: newReplyHtml(name, replierName, threadTitle, threadUrl, snippet),
  });
}

export async function sendNewsletterWelcome({
  to,
  name,
}: {
  to: string;
  name?: string;
}): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "You're subscribed to GDGOC-UITU updates!",
    html: newsletterWelcomeHtml(name ?? ''),
  });
}

export async function sendMentionNotification({
  to, name, mentionerName, context, threadTitle, threadUrl, snippet,
}: {
  to: string;
  name: string;
  mentionerName: string;
  context: string;
  threadTitle: string;
  threadUrl: string;
  snippet?: string;
}): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `${mentionerName} mentioned you`,
    html: mentionHtml(name, mentionerName, context, threadTitle, threadUrl, snippet),
  });
}

export async function sendNewEventAnnouncement({
  to, eventTitle, eventDate, venue, description, eventUrl,
}: {
  to: string;
  eventTitle: string;
  eventDate: string;
  venue?: string | null;
  description?: string | null;
  eventUrl: string;
}): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `New Event: ${eventTitle}`,
    html: newEventAnnouncementHtml(eventTitle, eventDate, venue ?? null, description ?? null, eventUrl),
  });
}

export async function sendWelcomeEmail({
  to, name, username, dashboardUrl,
}: {
  to: string;
  name: string;
  username: string;
  dashboardUrl: string;
}): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Welcome to GDGOC-UITU!',
    html: welcomeHtml(name, username, dashboardUrl),
  });
}
