import { buildCompanyContext } from '../context';
import { cacheableSystem, runTextCall } from '../helpers';

/**
 * Generate a one-page meeting prep brief for an upcoming call/meeting.
 * Returns markdown for direct display in the UI.
 */
export async function generateMeetingPrep(opts: {
  companyId: string;
  dealName: string;
  nextAction: string;
  nextActionDue: string;
}): Promise<string> {
  const context = await buildCompanyContext(opts.companyId);
  if (!context) throw new Error('Company not found');

  const { text } = await runTextCall({
    system: cacheableSystem(context),
    messages: [
      {
        role: 'user',
        content: `Prepare Leo for an upcoming meeting/call.

Deal: ${opts.dealName}
Scheduled action: "${opts.nextAction}"
Due: ${opts.nextActionDue}

Write a one-page prep brief in markdown with these exact sections:

## Company summary
2–3 sentences. Who they are, where they sit (engine/pipe), why XYNQ matters to them.

## Contacts on this account
Name + role + any relationship colour (referred by, advisor, decision maker vs gatekeeper).

## What was agreed / promised last time
Surface specific commitments from the interaction log. If none, say so.

## Current state
Stage, track, what is open right now.

## Talking points
3–5 specific things Leo should raise, each tied to context.

## Risks
1–3 things to be aware of (politics, stalled signals, competitor presence, missed expectations).

## Suggested ask
The concrete next step Leo should push for on this call.

Be specific, use names, reference dates. No generic filler.`,
      },
    ],
    max_tokens: 2048,
    effort: 'medium',
    thinking: true,
  });

  return text.trim();
}
