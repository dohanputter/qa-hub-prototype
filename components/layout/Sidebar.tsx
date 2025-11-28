'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, ListTodo, KanbanSquare, Bell, Wrench, LogOut, Folder } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

export function Sidebar() {
    const pathname = usePathname();
    // Extract projectId from path: /123/issues -> 123
    const projectIdMatch = pathname.match(/^\/(\d+)/);
    const projectId = projectIdMatch ? projectIdMatch[1] : null;

    const getHref = (path: string) => {
        // All routes are project-scoped if we have a projectId
        if (projectId) {
            // Dashboard is the project root
            if (path === '/') return `/${projectId}`;
            // Other routes are nested under project
            return `/${projectId}${path}`;
        }

        // If no projectId, redirect to projects selection
        return '/projects';
    };

    const navItems = [
        { href: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
        { href: '/projects', icon: Folder, label: 'Projects' },
        { href: '/issues', icon: ListTodo, label: 'Issues' },
        { href: '/board', icon: KanbanSquare, label: 'Issues Board' },
        { href: '/notifications', icon: Bell, label: 'Notifications' },
    ];

    // Helper to check active state
    const isActive = (href: string, exact = false) => {
        const targetPath = getHref(href);
        if (exact) return pathname === targetPath;
        return pathname.startsWith(targetPath);
    };

    return (
        <div className="w-64 h-screen bg-[#1e1e2f] text-gray-300 flex flex-col fixed left-0 top-0 z-50 border-r border-gray-700 shadow-xl">
            <div className="p-6 border-b border-gray-700 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center text-white font-bold">
                        QA
                    </div>
                    <h1 className="text-xl font-bold text-white tracking-tight">QA Hub</h1>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={getHref(item.href)}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                            isActive(item.href, item.exact)
                                ? "bg-indigo-600 text-white shadow-md"
                                : "hover:bg-gray-800 hover:text-white"
                        )}
                    >
                        <item.icon size={20} />
                        <span className="font-medium">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-700">
                <Link
                    href={getHref('/tools')}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                        isActive('/tools')
                            ? "bg-gray-800 text-white"
                            : "text-gray-400 hover:text-white"
                    )}
                >
                    <Wrench size={20} />
                    <span>Tools</span>
                </Link>
                <button
                    onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-400 transition-colors"
                >
                    <LogOut size={20} />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
}
