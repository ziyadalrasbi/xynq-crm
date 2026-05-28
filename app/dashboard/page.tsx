import { getDashboardData } from '@/lib/queries';
import { ActionLists, PipelineSummary, RecentInteractions } from '@/components/dashboard/sections';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { overdue, dueToday, thisWeek, pipeline, recent } = await getDashboardData();

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-6">
      <ActionLists overdue={overdue} dueToday={dueToday} thisWeek={thisWeek} />
      <PipelineSummary pipeline={pipeline} />
      <RecentInteractions interactions={recent} />
    </main>
  );
}
