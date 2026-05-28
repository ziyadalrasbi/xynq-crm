import { TriageForm } from '@/components/triage/triage-form';

export const dynamic = 'force-dynamic';

export default function TriagePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Email triage</h1>
        <p className="mt-1 text-sm text-muted">
          Paste an inbound email. The agent matches it to a company, classifies it, drafts a
          reply, and extracts new contacts / referrals. Approve to log it as an
          email_received interaction.
        </p>
      </header>
      <TriageForm />
    </main>
  );
}
