'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListTodo, KanbanSquare, Bell, Wrench, LogOut, BarChart3, ShieldAlert } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/Button";

export function Sidebar() {
    const pathname = usePathname();


    // Extract groupId from path: /123/issues -> 123
    const projectIdMatch = pathname.match(/^\/(\d+)/);
    const projectId = projectIdMatch ? projectIdMatch[1] : null;

    const [lastGroupId, setLastGroupId] = React.useState<string | null>(null);

    // Load from storage on mount
    React.useEffect(() => {
        const stored = sessionStorage.getItem('lastSelectedGroup');
        if (stored) setLastGroupId(stored);
    }, []);

    // Remember the last selected group in sessionStorage
    React.useEffect(() => {
        if (projectId) {
            sessionStorage.setItem('lastSelectedGroup', projectId);
            setLastGroupId(projectId);
        }
    }, [projectId]);

    const getHref = (path: string) => {
        // Special case: Groups always go to root /projects, never nested
        if (path === '/projects') {
            return '/projects';
        }

        // All other routes are group-scoped if we have a groupId
        if (projectId) {
            // Dashboard is the group root
            if (path === '/') return `/${projectId}`;
            // Other routes are nested under group
            return `/${projectId}${path}`;
        }

        // If no current groupId but we have a last selected group, use that
        // If no current groupId but we have a last selected group, use that
        if (lastGroupId) {
            if (path === '/') return `/${lastGroupId}`;
            return `/${lastGroupId}${path}`;
        }

        // If no group context at all, go to group selection
        return '/projects';
    };

    const navItems = [
        { href: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
        { href: '/issues', icon: ListTodo, label: 'Issues' },
        { href: '/board', icon: KanbanSquare, label: 'Issues Board' },
        { href: '/blockers', icon: ShieldAlert, label: 'Blockers' },
        { href: '/notifications', icon: Bell, label: 'Notifications' },
    ];

    // Helper to check active state
    const isActive = (href: string, exact = false) => {
        const targetPath = getHref(href);
        if (exact) return pathname === targetPath;
        return pathname.startsWith(targetPath);
    };

    return (
        <div className="w-64 h-screen bg-background/80 backdrop-blur-xl border-r border-border/40 flex flex-col fixed left-0 top-0 z-50 transition-all duration-300">
            <div className="p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg shadow-lg shadow-teal-500/20 flex items-center justify-center text-white font-bold text-sm">
                        QA
                    </div>
                    <h1 className="text-lg font-bold text-foreground tracking-tight">QA Hub</h1>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {navItems.map((item) => {
                    const active = isActive(item.href, item.exact);
                    return (
                        <Link
                            key={item.href}
                            href={getHref(item.href)}
                            className={cn(
                                "group relative w-full flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200",
                                active
                                    ? "text-primary font-medium bg-primary/5"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            {active && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                            )}
                            <item.icon size={18} className={cn("transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                            <span className="text-sm">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border/40 space-y-1">
                <Link
                    href={getHref('/tools')}
                    className={cn(
                        "group relative w-full flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200",
                        isActive('/tools')
                            ? "text-primary font-medium bg-primary/5"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                >
                    {isActive('/tools') && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                    )}
                    <Wrench size={18} />
                    <span className="text-sm">Tools</span>
                </Link>
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        onClick={() => signOut()}
                    >
                        <LogOut size={18} />
                        <span className="font-medium">Sign Out</span>
                    </Button>
                    <ThemeToggle />
                </div>
                <div className="mt-2 pt-2 border-t border-border/40 text-xs text-muted-foreground/60 text-center">
                    <span>v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
                    <span className="mx-1">•</span>
                    <span>{new Date(process.env.NEXT_PUBLIC_BUILD_DATE || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
            </div>
        </div>
    );
}
