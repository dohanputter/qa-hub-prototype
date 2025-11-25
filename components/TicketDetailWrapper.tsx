'use client';

import { useRouter } from 'next/navigation';
import { TicketDetail } from './TicketDetail';
import { Issue } from '@/types';

export function TicketDetailWrapper({ issue }: { issue: Issue }) {
    const router = useRouter();

    const handleClose = () => {
        router.back();
    };

    const handleUpdate = (updatedIssue: Issue) => {
        // Call server action here
        console.log('Update issue', updatedIssue);
    };

    return (
        <TicketDetail
            issue={issue}
            onClose={handleClose}
            onUpdate={handleUpdate}
        />
    );
}
