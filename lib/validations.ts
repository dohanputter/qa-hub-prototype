/**
 * Zod validation schemas for server actions
 */

import { z } from 'zod';

/**
 * Schema for creating a new issue
 */
export const createIssueSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
    description: z.string().max(500000, 'Description too long (max 500KB)').optional().default(''),
    assigneeId: z.union([z.number(), z.string()]).optional().transform(val => 
        val ? Number(val) : undefined
    ),
    labels: z.string().optional().default(''),
    labelId: z.string().optional(),
});

/**
 * Schema for updating issue labels
 */
export const updateLabelsSchema = z.object({
    addLabels: z.array(z.string()).optional(),
    removeLabels: z.array(z.string()).optional(),
}).refine(data => data.addLabels?.length || data.removeLabels?.length, {
    message: 'At least one label operation is required',
});

/**
 * Schema for configuring project labels
 */
export const configureLabelMappingSchema = z.object({
    pending: z.string().min(1, 'Pending label is required'),
    passed: z.string().min(1, 'Passed label is required'),
    failed: z.string().min(1, 'Failed label is required'),
});

/**
 * Schema for QA run submission
 */
export const submitQARunSchema = z.object({
    result: z.enum(['passed', 'failed']),
});

/**
 * Schema for snippet creation/update
 */
export const snippetSchema = z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
    content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
    type: z.enum(['test_case', 'issue']),
});

/**
 * Safe parse helper that returns a typed result
 */
export function safeParse<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; error: string } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    // Format error messages nicely
    const errorMessages = result.error.issues.map(issue => issue.message).join(', ');
    return { success: false, error: errorMessages };
}

