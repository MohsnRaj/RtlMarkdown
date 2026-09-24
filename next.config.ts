import type { NextConfig } from 'next';

const isGithubPages =
  process.env.DEPLOY_TARGET === 'gh-pages' ||
  process.env.GITHUB_PAGES === 'true' ||
  process.env.CI === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isGithubPages ? '/RtlMarkdown' : '',
  assetPrefix: isGithubPages ? '/RtlMarkdown/' : undefined,
  images: {
    unoptimized: true,
  },
  devIndicators: false,
};

export default nextConfig;
