import { buildCompanyContext } from '../context';
import { cacheableSystem, runTextCall } from '../helpers';

/**
 * Draft one email in a sequence. The template provides the per-step intent;
 * Claude fills it with company-specific context.
 */
export async function draftSequenceEmail(opts: {
  companyId: string;
  templateName: string;
  stepNumber: number;
  stepIntent: string;
}): Promise<{ subject: string; body: string }> {
  const context = await buildCompanyContext(opts.companyId);
  if (!context) throw new Error('Company not found');

  const { text } = await runTextCall({
    system: cacheableSystem(context),
    messages: [
      {
        role: 'user',
        content: `Draft email step ${opts.stepNumber + 1} of the "${opts.templateName}" sequence.

Step intent (the brief for this specific email):
${opts.stepIntent}

Rules:
- Match Leo's voice — short, direct, warm, no corporate fluff
- Reference specifics from the company context, not generic placeholders
- Use "Evidence Pack" terminology (never "Decision Certificate")
- Body 3–7 sentences; one paragraph or two short ones
- Subject under 60 chars

Format your reply exactly as:

Subject: <subject line>

<body>

Do not include any other commentary.`,
      },
    ],
    max_tokens: 1024,
    effort: 'medium',
  });

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
