'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TicketDetail } from '@/components/TicketDetail';
import { Issue } from '@/types';

interface TicketDetailPageProps {
    issue: Issue;
}

export const TicketDetailPage: React.FC<TicketDetailPageProps> = ({ issue }) => {
    const router = useRouter();

    const handleClose = () => {
        router.push(`/${issue.projectId}`);
    };

    const handleUpdate = (updatedIssue: Issue) => {
        console.log('Updated issue:', updatedIssue);
        // In a real app, you'd call a server action here
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[80vh]">
                <TicketDetail
                    issue={issue}
                    onClose={handleClose}
                    onUpdate={handleUpdate}
                />
            </div>
        </div>
    );
};
