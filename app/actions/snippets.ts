'use server';

import { getMockSnippets, createMockSnippet, updateMockSnippet, deleteMockSnippet } from '@/lib/gitlab';
import { Snippet } from '@/types';

export async function getSnippetsAction(): Promise<Snippet[]> {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        return getMockSnippets();
    }
    // Real implementation would go here (e.g. DB or GitLab Snippets)
    // For now, we only have mock snippets
    return [];
}

export async function createSnippetAction(snippet: Omit<Snippet, 'id' | 'updatedAt'>) {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        return createMockSnippet(snippet);
    }
    throw new Error('Not implemented in production mode');
}

export async function updateSnippetAction(snippet: Snippet) {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        return updateMockSnippet(snippet);
    }
    throw new Error('Not implemented in production mode');
}

export async function deleteSnippetAction(id: number) {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        return deleteMockSnippet(id);
    }
    throw new Error('Not implemented in production mode');
}
