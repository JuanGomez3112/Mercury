import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fallback: si se accede a Next directo (:3000) sin nginx, /media resuelve igual a MinIO.
  // En producción nginx sirve /media; esto evita el "?" de imagen rota fuera de nginx.
  async rewrites() {
    return [
      {
        source: "/media/:path*",
        destination: `${process.env.S3_ENDPOINT ?? "http://127.0.0.1:9000"}/${process.env.S3_BUCKET ?? "mercury-media"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
