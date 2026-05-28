import { notFound } from 'next/navigation';
import { getCompanyDetail } from '@/lib/queries';
import {
  CompanyHeader,
  ContactsSection,
  DealsSection,
  InteractionsSection,
  ReferralsSection,
} from '@/components/company/sections';
import { SequencesSection } from '@/components/company/sequences-section';
import { AIPanel } from '@/components/ai/ai-panel';

export const dynamic = 'force-dynamic';

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const data = await getCompanyDetail(params.id);
  if (!data.company) notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-6">
      <CompanyHeader company={data.company} />
      <DealsSection companyId={params.id} deals={data.deals} />
      <ContactsSection companyId={params.id} contacts={data.contacts} />
      <InteractionsSection
        companyId={params.id}
        companyName={data.company.name}
        interactions={data.interactions}
        contacts={data.contacts}
        deals={data.deals}
      />
      <ReferralsSection outbound={data.outboundReferrals} inbound={data.inboundReferrals} />
      <SequencesSection
        companyId={params.id}
        sequences={data.sequences as any}
        deals={data.deals.map((d: any) => ({ id: d.id, deal_name: d.deal_name }))}
      />
      <AIPanel companyId={params.id} />
    </main>
  );
}
