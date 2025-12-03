'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

export const QADetailDynamic = dynamic(() => import('./QADetail').then(mod => mod.QADetail), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
});
