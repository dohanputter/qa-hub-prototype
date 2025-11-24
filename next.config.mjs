/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'gitlab.com' },
            { protocol: 'https', hostname: '*.gitlab.com' },
            { protocol: 'https', hostname: 'api.dicebear.com' }, // Needed for mock avatars
        ],
    },
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
