import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
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
