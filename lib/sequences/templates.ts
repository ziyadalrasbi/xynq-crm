export type SequenceStep = {
  day_offset: number;
  intent: string;
};

export type SequenceTemplate = {
  name: string;
  label: string;
  description: string;
  steps: SequenceStep[];
};

export const COLD_OUTREACH: SequenceTemplate = {
  name: 'cold_outreach',
  label: 'Cold outreach',
  description: '4-touch sequence for new prospects with no prior relationship.',
  steps: [
    {
      day_offset: 0,
      intent:
        'Personalised intro email. Lead with one specific thing about their business (cite from notes/context). One-sentence positioning of XYNQ as governance automation for digital ecosystems. Soft ask: "worth a quick conversation?"',
    },
    {
      day_offset: 5,
      intent:
        'Value-add follow-up. Reference relevant news, sector signal, or regulatory development. No ask — just keep the relationship warm.',
    },
    {
      day_offset: 12,
      intent:
        'Send a concrete utility — link to the XYNQ compliance checker tool or a one-pager relevant to their stack. Position as "thought you might find this useful".',
    },
    {
      day_offset: 20,
      intent:
        'Direct ask — "15 minutes to walk you through what we are building?" Reference the prior thread briefly. If no response after this, close out.',
    },
  ],
};

export const POST_CALL: SequenceTemplate = {
  name: 'post_call',
  label: 'Post-call',
  description: '3-touch sequence after a discovery or product call.',
  steps: [
    {
      day_offset: 0,
      intent:
        'Thank-you email + any attachments promised on the call. Summarise the 2-3 things agreed. End with one concrete next step (CTO call, gap analysis, etc).',
    },
    {
      day_offset: 7,
      intent:
        '"Had a thought about [specific thing from the call]" — adds new value tied to what was discussed. Not a check-in; an actual contribution.',
    },
    {
      day_offset: 14,
      intent:
        'Polite check-in if no reply. Reference the next step from the post-call note. Offer to re-scope if priorities have shifted.',
    },
  ],
};

export const PARTNERSHIP: SequenceTemplate = {
  name: 'partnership',
  label: 'Partnership',
  description: '4-touch sequence for strategic partnerships (rightsHUB / Merlin-shaped deals).',
  steps: [
    {
      day_offset: 0,
      intent:
        'Send the product overview + partnership deck. Frame as "as discussed — here is the overview, eyes on whatever resonates". Light touch.',
    },
    {
      day_offset: 10,
      intent:
        'Share the gap analysis output (or offer one if not yet done). Position as "free / no-strings — gives us both a shared map".',
    },
    {
      day_offset: 17,
      intent:
        '"Ready to set up the CTO call?" — concrete scheduling ask. Reference progress to date.',
    },
    {
      day_offset: 30,
      intent:
        '"Checking in — still keen to get our tech teams talking" — polite re-engagement if conversation has stalled. Mention any new XYNQ developments worth flagging.',
    },
  ],
};

export const TEMPLATES: Record<string, SequenceTemplate> = {
  cold_outreach: COLD_OUTREACH,
  post_call: POST_CALL,
  partnership: PARTNERSHIP,
};

export const TEMPLATE_NAMES = ['cold_outreach', 'post_call', 'partnership'] as const;
export type TemplateName = (typeof TEMPLATE_NAMES)[number];

export function getTemplate(name: string): SequenceTemplate | null {
  return TEMPLATES[name] ?? null;
}

/** Add N days to a YYYY-MM-DD date string. */
export function shiftDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
