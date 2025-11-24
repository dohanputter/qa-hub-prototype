'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    // Check if we are in a board view (e.g. /123)
    const isBoardView = /^\/\d+$/.test(pathname);

    return (
        <div className="min-h-screen bg-[#f9fafb]">
            <Sidebar />
            <main
                className="min-h-screen transition-all duration-300 ml-64"
            >
                {children}
            </main>
        </div>
    );
}
