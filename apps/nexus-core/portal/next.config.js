/** @type {import('next').NextConfig} */
const nextConfig = {
  // OJO: @nexus/prisma NO va en transpilePackages — se importa @prisma/client
  // directo y el runtime queda externo (serverComponentsExternalPackages)
  // para que Node encuentre el Query Engine real en node_modules.
  transpilePackages: ["@nexus/ui", "@nexus/utils"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
};

module.exports = nextConfig;