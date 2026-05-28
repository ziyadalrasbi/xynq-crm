import { listAllContacts } from '@/lib/queries';
import { ContactsTable } from './contacts-table';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const contacts = await listAllContacts();
  return (
    <main className="mx-auto max-w-7xl space-y-4 px-6 py-6">
      <h1 className="text-lg font-semibold tracking-tight">Contacts</h1>
      <ContactsTable contacts={contacts as any} />
    </main>
  );
}
