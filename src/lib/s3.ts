import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const endpoint = process.env.S3_ENDPOINT ?? "http://127.0.0.1:9000";
const bucket = process.env.S3_BUCKET ?? "mercury-media";
const publicBase = process.env.S3_PUBLIC_BASE ?? "/media";
const paidBucket = process.env.S3_PAID_BUCKET ?? "mercury-paid";
export const PAID_BUCKET = paidBucket;

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
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export function extFor(type: string): string | null {
  return EXT[type] ?? null;
}

/** Sube un buffer y devuelve la URL (pública en /media, o proxy /api/media/<key> si es privada). */
export async function putMedia(
  buf: Buffer,
  contentType: string,
  prefix: string,
  opts?: { private?: boolean },
): Promise<string> {
  const ext = extFor(contentType) ?? "bin";
  const key = `${prefix}/${randomUUID()}.${ext}`;
  const isPrivate = opts?.private === true;
  await s3.send(
    new PutObjectCommand({
      Bucket: isPrivate ? paidBucket : bucket,
      Key: key,
      Body: buf,
      ContentType: contentType,
    }),
  );
  return isPrivate ? `/api/media/${key}` : `${publicBase}/${key}`;
}

/** Genera una URL prefirmada de lectura para un objeto del bucket privado. */
export async function presignGet(key: string, ttl = 60): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: paidBucket, Key: key }), { expiresIn: ttl });
}
