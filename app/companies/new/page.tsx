import { Card } from '@/components/ui/card';
import { Input, Label, Select, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { AutoResearchButton } from '@/components/ai/auto-research-button';
import {
  ENGINE_PIPES,
  ENGINE_PIPE_LABELS,
  INDUSTRIES,
  INDUSTRY_LABELS,
  MUSIC_SUB_TYPES,
} from '@/lib/design';
import { createCompany } from './actions';

export default function NewCompanyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-6">
      <h1 className="text-lg font-semibold tracking-tight">Add company</h1>
      <p className="mt-1 text-sm text-muted">
        Creates the company, a primary contact, and an exposure-scan deal in one step.
      </p>

      <Card className="mt-5 p-5">
        <form action={createCompany} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="name">Company name *</Label>
              <Input id="name" name="name" required autoFocus />
            </div>
            <div className="sm:col-span-2">
              <AutoResearchButton nameId="name" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="industry">Industry *</Label>
              <Select id="industry" name="industry" defaultValue="music" required>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{INDUSTRY_LABELS[i]}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sub_type">Sub-type</Label>
              <Select id="sub_type" name="sub_type" defaultValue="">
                <option value="">—</option>
                {MUSIC_SUB_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="engine_pipe">Engine / Pipe</Label>
              <Select id="engine_pipe" name="engine_pipe" defaultValue="">
                <option value="">—</option>
                {ENGINE_PIPES.map((e) => (
                  <option key={e} value={e}>{ENGINE_PIPE_LABELS[e]}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input id="mmf_member" name="mmf_member" type="checkbox" />
              <label htmlFor="mmf_member" className="text-xs text-muted">MMF member (25% discount)</label>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" placeholder="https://" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" name="tags" placeholder="distributor, african_market, priority" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Primary contact</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="contact_name">Name</Label>
                <Input id="contact_name" name="contact_name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_role">Role</Label>
                <Input id="contact_role" name="contact_role" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_email">Email</Label>
                <Input id="contact_email" name="contact_email" type="email" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="source">Source</Label>
                <Select id="source" name="source" defaultValue="direct">
                  <option value="direct">Direct</option>
                  <option value="referral">Referral</option>
                  <option value="inbound">Inbound</option>
                  <option value="event">Event</option>
                  <option value="cold_outreach">Cold outreach</option>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="referred_by">Referred by</Label>
                <Input id="referred_by" name="referred_by" placeholder="e.g. Lee Morrison" />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">First action</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="next_action">Next action</Label>
                <Input id="next_action" name="next_action" placeholder="e.g. Send intro email" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="next_action_due">Due</Label>
                <Input id="next_action_due" name="next_action_due" type="date" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit">Create company</Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
