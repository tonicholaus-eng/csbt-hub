import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "elvebredd.com",
        port: "",
        pathname: "/images/pets/**",
      },
    ],
  },
};

export default nextConfig;