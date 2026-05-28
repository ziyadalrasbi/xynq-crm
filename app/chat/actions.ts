'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createNewConversation() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('chat_conversations')
    .insert({})
    .select('id')
    .single();
  if (error || !data) throw error ?? new Error('Failed to create conversation');
  revalidatePath('/chat');
  redirect(`/chat/${data.id}`);
}

export async function deleteConversation(conversationId: string) {
  const supabase = createClient();
  await supabase.from('chat_conversations').delete().eq('id', conversationId);
  revalidatePath('/chat');
  redirect('/chat');
}
