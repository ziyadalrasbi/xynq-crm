import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getConversation } from '@/lib/queries';
import { ConversationView } from '@/components/chat/conversation-view';
import { deleteConversation } from '../actions';

export const dynamic = 'force-dynamic';

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const data = await getConversation(params.id);
  if (!data) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <Link href="/chat" className="text-xs text-muted hover:text-ink">
            ← All chats
          </Link>
          <h1 className="mt-1 truncate text-base font-semibold">{data.conversation.title}</h1>
        </div>
        <form action={deleteConversation.bind(null, params.id)}>
          <Button type="submit" variant="ghost" className="text-xs text-overdue">
            Delete
          </Button>
        </form>
      </div>
      <ConversationView
        conversationId={params.id}
        initialMessages={data.messages as any}
      />
    </main>
  );
}
