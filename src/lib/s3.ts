import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const endpoint = process.env.S3_ENDPOINT ?? "http://127.0.0.1:9000";
const bucket = process.env.S3_BUCKET ?? "mercury-media";
const publicBase = process.env.S3_PUBLIC_BASE ?? "/media";

export const s3 = new S3Client({
  endpoint,
  region: "us-east-1",
  forcePathStyle: true, // requerido por MinIO
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  },
});

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function extFor(type: string): string | null {
  return EXT[type] ?? null;
}

/** Sube un buffer y devuelve la URL pública (servida por nginx en /media). */
export async function putMedia(
  buf: Buffer,
  contentType: string,
  prefix: string,
): Promise<string> {
  const ext = extFor(contentType) ?? "bin";
  const key = `${prefix}/${randomUUID()}.${ext}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: contentType,
    }),
  );
  return `${publicBase}/${key}`;
}
