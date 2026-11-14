/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  transpilePackages: ['@funnygame/game-core', '@funnygame/ui', '@funnygame/game-color-trap'],
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  ...(isGithubPages ? {
    output: 'export',
    basePath: '/FunnyGame',
    trailingSlash: true,
    images: { unoptimized: true }
  } : {})
};

export default nextConfig;
