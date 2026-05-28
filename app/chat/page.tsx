import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { listChatConversations } from '@/lib/queries';
import { formatRelative } from '@/lib/format';
import { createNewConversation } from './actions';

export const dynamic = 'force-dynamic';

export default async function ChatIndexPage() {
  const conversations = await listChatConversations();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Chat</h1>
          <p className="mt-1 text-sm text-muted">
            Ask anything about your pipeline. Read-only — the agent queries the CRM, doesn&rsquo;t modify it.
          </p>
        </div>
        <form action={createNewConversation}>
          <Button type="submit">+ New chat</Button>
        </form>
      </div>

      {conversations.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          No conversations yet. Start a new one.
        </Card>
      ) : (
        <Card>
          {conversations.map((c: any) => (
            <Link
              key={c.id}
              href={`/chat/${c.id}`}
              className="block border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-bg"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{c.title}</span>
                <span className="text-xs text-muted">{formatRelative(c.updated_at)}</span>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </main>
  );
}
