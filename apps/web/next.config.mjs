/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@runai/ui", "@runai/types", "@runai/ai", "@runai/db"],
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
