import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));

/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        NEXT_PUBLIC_APP_VERSION: packageJson.version,
        NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
    },
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
