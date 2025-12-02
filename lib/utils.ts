
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function mapLabelToStatus(
    labels: string[],
    mapping: { pending: string; passed: string; failed: string }
): 'pending' | 'passed' | 'failed' | null {
    if (labels.includes(mapping.passed)) return 'passed';
    if (labels.includes(mapping.failed)) return 'failed';
    if (labels.includes(mapping.pending)) return 'pending';
    return null;
}

export async function executeBatched<T, R>(
    items: T[],
    batchSize: number,
    fn: (item: T) => Promise<R>
): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fn));
        results.push(...batchResults);
    }
    return results;
}


