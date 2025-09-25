'use server';

import { cookies } from 'next/headers';

export async function storeRagInfoInCookies(
  ragId: string, 
  userId: string, 
  docId: string
): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set({
    name: 'rag_id',
    value: ragId
  });
  
  cookieStore.set({
    name: 'active_user_id',
    value: userId
  });
  
  cookieStore.set({
    name: 'active_litigation_doc_id',
    value: docId
  });
}

export async function clearRagInfoCookies(): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.delete('rag_id');
  cookieStore.delete('active_user_id');
  cookieStore.delete('active_litigation_doc_id');
} 