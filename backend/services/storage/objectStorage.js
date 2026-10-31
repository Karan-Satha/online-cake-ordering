import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "../../config/index.js";

const storageConfigured = Boolean(
  process.env.AWS_ENDPOINT_URL_S3 &&
    process.env.AWS_REGION &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY,
);

const client = storageConfigured
  ? new S3Client({
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      region: process.env.AWS_REGION,
      forcePathStyle: true,
    })
  : null;

export const objectStorageEnabled = storageConfigured;

export function getProductImageUrl(filename) {
  if (!filename) return null;
  if (!objectStorageEnabled) return `/uploads/products/${filename}`;

  const bucket = encodeURIComponent(config.productImagesBucket);
  const key = encodeURIComponent(filename);
  return `${process.env.AWS_ENDPOINT_URL_S3.replace(/\/$/, "")}/${bucket}/${key}`;
}

export function getCustomCakeImagePath(filename) {
  return `/uploads/custom-cakes/${encodeURIComponent(filename)}`;
}

export async function storeImage({ bucket, key, body, contentType = "image/webp", publicRead = false }) {
  if (!objectStorageEnabled) return false;

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    ...(publicRead ? { CacheControl: "public, max-age=31536000, immutable" } : {}),
  }));

  return true;
}

export async function getPrivateImageStream(key) {
  if (!objectStorageEnabled) return null;

  const result = await client.send(new GetObjectCommand({ Bucket: config.customCakeImagesBucket, Key: key }));
  return { body: result.Body, contentType: result.ContentType || "application/octet-stream" };
}

export function assertObjectStorageConfigured() {
  if (config.nodeEnv === "production" && !objectStorageEnabled) {
    throw new Error("Neon Object Storage is required in production. Configure the AWS_* environment variables.");
  }
}
