'use server';

import { db } from '@/lib/db';
import { snippets } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Snippet } from '@/types';

export async function getSnippetsAction(): Promise<Snippet[]> {
    const results = await db
        .select()
        .from(snippets)
        .orderBy(desc(snippets.updatedAt));

    return results.map(s => ({
        id: s.id!,
        title: s.title,
        content: s.content,
        type: s.type,
        updatedAt: s.updatedAt?.toISOString() || new Date().toISOString(),
    }));
}

export async function createSnippetAction(snippet: Omit<Snippet, 'id' | 'updatedAt'>) {
    const result = await db
        .insert(snippets)
        .values({
            title: snippet.title,
            content: snippet.content,
            type: snippet.type,
        })
        .returning();

    return result[0];
}

export async function updateSnippetAction(snippet: Snippet) {
    const result = await db
        .update(snippets)
        .set({
            title: snippet.title,
            content: snippet.content,
            type: snippet.type,
            updatedAt: new Date(),
        })
        .where(eq(snippets.id, snippet.id))
        .returning();

    return result[0];
}

export async function deleteSnippetAction(id: number) {
    await db
        .delete(snippets)
        .where(eq(snippets.id, id));

    return true;
}
