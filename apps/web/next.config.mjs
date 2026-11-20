/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  transpilePackages: [
    '@funnygame/game-core',
    '@funnygame/ui',
    '@funnygame/game-calc-pressure',
    '@funnygame/game-color-trap',
    '@funnygame/game-dont-tap',
    '@funnygame/game-follow-pattern',
    '@funnygame/game-math-bridge',
    '@funnygame/game-moving-maze',
    '@funnygame/game-number-hunt',
    '@funnygame/game-odd-one-out',
    '@funnygame/game-watch-and-judge',
    '@funnygame/game-where-did-it-go'
  ],
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
