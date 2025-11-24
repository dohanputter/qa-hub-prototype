'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function SignInPage() {
    const [isLoading, setIsLoading] = useState(false);

    const handleSignIn = async () => {
        setIsLoading(true);
        try {
            if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
                await signIn('mock-login', { callbackUrl: '/' });
            } else {
                await signIn('gitlab', { callbackUrl: '/' });
            }
        } catch (error) {
            console.error('Sign in failed', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                QA
            </div>

            <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                    Welcome to QA Hub
                </h1>
                <p className="text-sm text-gray-500">
                    Sign in with your GitLab account to continue
                </p>
            </div>

            <Button
                onClick={handleSignIn}
                className="w-full bg-[#FC6D26] hover:bg-[#E24329] text-white"
                disabled={isLoading}
            >
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .41.26l2.47 7.6h8.6l2.47-7.6A.43.43 0 0 1 19.18 2a.42.42 0 0 1 .11.16l2.44 7.51 1.22 3.78a.84.84 0 0 1-.3.94z" />
                    </svg>
                )}
                Sign in with GitLab
            </Button>

            {process.env.NEXT_PUBLIC_MOCK_MODE === 'true' && (
                <div className="p-4 bg-yellow-50 text-yellow-800 text-xs rounded-md border border-yellow-200">
                    Mock Mode Enabled: GitLab auth will use mock provider if configured, or you might need to bypass auth for local dev.
                </div>
            )}
        </div>
    );
}
