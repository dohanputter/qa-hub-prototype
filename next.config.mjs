/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        // Allow sync usage of headers/cookies for NextAuth compatibility
        dynamicIO: false,
    },
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'gitlab.com' },
            { protocol: 'https', hostname: '*.gitlab.com' },
        ],
    },
    // Suppress Next.js 15 async headers warnings for NextAuth until they update
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.ignoreWarnings = [
                { module: /node_modules\/@auth\/core/ },
                { message: /headers\(\)/ },
            ];
        }
        return config;
    },
};

export default nextConfig;
