const recentUploads = new Map<string, number[]>();

// GitLab-style API rate limiting for mock mode
interface RateLimitEntry {
    requests: number[];
    burstRequests: number[];
}

const apiRateLimits = new Map<string, RateLimitEntry>();

// GitLab rate limits (simplified)
const GITLAB_RATE_LIMITS = {
    authenticated: {
        perMinute: 2000,
        burst: 100, // Allow burst of requests
        burstWindow: 10000, // 10 second burst window
    },
    unauthenticated: {
        perMinute: 10,
        burst: 5,
        burstWindow: 60000,
    }
};

export async function checkUploadRateLimit(userId: string): Promise<boolean> {
    const now = Date.now();
    const userUploads = recentUploads.get(userId) || [];
    const recent = userUploads.filter((t) => now - t < 60000);

    if (recent.length >= 10) return false;

    recentUploads.set(userId, [...recent, now]);
    return true;
}

export async function checkGitLabAPIRateLimit(token: string): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
    if (process.env.NEXT_PUBLIC_MOCK_MODE !== 'true') {
        return { allowed: true }; // Skip rate limiting in production
    }

    const now = Date.now();
    const key = `gitlab:${token}`;
    const limits = token === 'mock-token' ? GITLAB_RATE_LIMITS.authenticated : GITLAB_RATE_LIMITS.unauthenticated;

    let entry = apiRateLimits.get(key);
    if (!entry) {
        entry = { requests: [], burstRequests: [] };
        apiRateLimits.set(key, entry);
    }

    // Clean old requests
    entry.requests = entry.requests.filter(t => now - t < 60000); // 1 minute window
    entry.burstRequests = entry.burstRequests.filter(t => now - t < limits.burstWindow);

    // Check burst limit first (stricter)
    if (entry.burstRequests.length >= limits.burst) {
        const oldestBurstRequest = Math.min(...entry.burstRequests);
        const resetTime = oldestBurstRequest + limits.burstWindow;
        return {
            allowed: false,
            resetTime,
            remaining: 0
        };
    }

    // Check sustained rate limit
    if (entry.requests.length >= limits.perMinute) {
        const oldestRequest = Math.min(...entry.requests);
        const resetTime = oldestRequest + 60000;
        return {
            allowed: false,
            resetTime,
            remaining: 0
        };
    }

    // Add request to tracking
    entry.requests.push(now);
    entry.burstRequests.push(now);

    const remaining = Math.max(0, limits.perMinute - entry.requests.length);

    return {
        allowed: true,
        remaining
    };
}

export async function enforceGitLabAPIRateLimit(token: string): Promise<void> {
    const result = await checkGitLabAPIRateLimit(token);

    if (!result.allowed) {
        const resetIn = result.resetTime ? Math.ceil((result.resetTime - Date.now()) / 1000) : 60;
        throw new Error(`GitLab API rate limit exceeded. Try again in ${resetIn} seconds.`);
    }

    // Add realistic delay to simulate API latency (50-200ms)
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 50));
    }
}
