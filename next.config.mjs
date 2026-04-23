/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["react-simple-maps"],
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
