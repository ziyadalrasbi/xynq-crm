import { buildCompanyContext } from '../context';
import { cacheableSystem, runTextCall } from '../helpers';

export async function draftFollowUpEmail(opts: {
  companyId: string;
  intent?: string; // optional steering: "post-call thank you", "check in", etc.
}): Promise<{ subject: string; body: string }> {
  const context = await buildCompanyContext(opts.companyId);
  if (!context) throw new Error('Company not found');

  const intent = opts.intent?.trim()
    ? `\n\nSteering: ${opts.intent}`
    : '';

  const { text } = await runTextCall({
    system: cacheableSystem(context),
    messages: [
      {
        role: 'user',
        content: `Draft a follow-up email to send to the primary contact at this company.${intent}

Constraints:
- Short and direct (3–6 sentences body)
- Reference the most recent interaction naturally
- Match Leo's voice — warm but concise, no corporate fluff
- Use "Evidence Pack" terminology if relevant
- If a partnership or audit conversation is the right next move, frame it directly

Return your draft in this exact format:

Subject: <subject line>

<body>

Do not include any other commentary.`,
      },
    ],
    max_tokens: 1024,
    effort: 'medium',
  });

  // Parse "Subject: ...\n\n<body>"
  const lines = text.trim().split('\n');
  let subject = '';
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().startsWith('subject:')) {
      subject = lines[i].slice(lines[i].indexOf(':') + 1).trim();
      bodyStart = i + 1;
      break;
    }
  }
  const body = lines.slice(bodyStart).join('\n').trim();
  return { subject, body };
}
