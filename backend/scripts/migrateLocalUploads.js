import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoDir = path.resolve(backendDir, "..");
const localEnvPath = path.join(repoDir, ".env.local");
const dotenv = await import("dotenv");
dotenv.config({ path: localEnvPath, override: true });
const { config: appConfig } = await import("../config/index.js");

const requiredEnv = ["AWS_ENDPOINT_URL_S3", "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];
const missing = requiredEnv.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Missing Neon storage settings: ${missing.join(", ")}`);

const client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION,
  forcePathStyle: true,
});

const contentTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

async function getImageFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && entry.name !== ".gitkeep");
}

async function copyDirectory(directory, bucket, isPublic) {
  const entries = await getImageFiles(directory);

  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);
    const body = await fs.readFile(filePath);
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: entry.name,
      Body: body,
      ContentType: contentTypes[path.extname(entry.name).toLowerCase()] || "application/octet-stream",
      ...(isPublic ? { CacheControl: "public, max-age=31536000, immutable" } : {}),
    }));
  }

  for (const entry of entries) {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: entry.name }));
  }

  return entries.length;
}

const productDirectory = path.join(backendDir, "uploads", "products");
const customCakeDirectory = path.join(backendDir, "uploads", "custom-cakes");
const productCount = await copyDirectory(productDirectory, appConfig.productImagesBucket, true);
const customCakeCount = await copyDirectory(customCakeDirectory, appConfig.customCakeImagesBucket, false);

const publicImage = (await getImageFiles(productDirectory)).find((entry) => entry.name.endsWith(".webp"));
const publicImageUrl = `${process.env.AWS_ENDPOINT_URL_S3.replace(/\/$/, "")}/${appConfig.productImagesBucket}/${encodeURIComponent(publicImage.name)}`;
const publicResponse = await fetch(publicImageUrl);
if (!publicResponse.ok || !publicResponse.headers.get("content-type")?.startsWith("image/")) {
  throw new Error("A product image did not pass the anonymous public-read check.");
}

const privateImage = (await getImageFiles(customCakeDirectory))[0];
const privateImageUrl = `${process.env.AWS_ENDPOINT_URL_S3.replace(/\/$/, "")}/${appConfig.customCakeImagesBucket}/${encodeURIComponent(privateImage.name)}`;
const privateResponse = await fetch(privateImageUrl);
if (privateResponse.ok) throw new Error("A private custom-cake image was accessible without credentials.");

console.log(`Uploaded ${productCount} product assets and ${customCakeCount} private custom-cake images.`);
console.log("Verified object presence, public product image access, and private custom-cake image access.");
