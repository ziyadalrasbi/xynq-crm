import { getPipelineDeals } from '@/lib/queries';
import { Kanban } from '@/components/pipeline/kanban';

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  const deals = await getPipelineDeals();
  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <Kanban deals={deals} />
    </main>
  );
}
