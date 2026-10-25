import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.svg": {
        loaders: [
          {
            loader: "@svgr/webpack",
            options: {
              icon: true,
              svgoConfig: {
                plugins: [
                  {
                    name: "convertColors",
                    params: { currentColor: true },
                  },
                ],
              },
            },
          },
        ],
        as: "*.js",
      },
    },
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;

    if (!backendUrl) {
      throw new Error("Backend url missing");
    }

    return [{ source: "/api/:path*", destination: `${backendUrl}/:path*` }];
  },
  allowedDevOrigins: [
    // '*.ngrok-free.app',
    // '*.ngrok.io',
    // '*.ngrok-free.dev',
    "pleasedly-fossillike-arlena.ngrok-free.dev",
    "192.168.0.100",
  ],
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
