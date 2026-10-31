import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { storeImage } from "../services/storage/objectStorage.js";
import { config } from "../config/index.js";

const MB = 1024 * 1024;

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

function fileFilter(req, file, cb) {
  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  const error = new Error("Please upload a JPG, PNG, or WebP image.");
  error.statusCode = 400;
  cb(error);
}

// Files are held in memory only long enough to be re-encoded as WebP and
// written to disk — nothing is ever saved to disk in its original format.
function createUpload(limitBytes) {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
      fileSize: limitBytes,
    },
  });
}

function generateWebpFilename() {
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
}

async function convertFileToWebp(file, destination) {
  const filename = generateWebpFilename();
  const filePath = path.join(destination, filename);
  const webpBuffer = await sharp(file.buffer).webp({ quality: 80 }).toBuffer();
  const isCustomCake = destination.endsWith("custom-cakes");
  const bucket = isCustomCake ? config.customCakeImagesBucket : config.productImagesBucket;
  const storedInObjectStorage = await storeImage({
    bucket,
    key: filename,
    body: webpBuffer,
    publicRead: !isCustomCake,
  });

  if (!storedInObjectStorage) {
    fs.mkdirSync(destination, { recursive: true });
    await fs.promises.writeFile(filePath, webpBuffer);
  }

  // Line up the file object with what multer.diskStorage would normally
  // produce, so downstream code (req.file.filename, file.filename, etc.)
  // keeps working unchanged.
  file.filename = filename;
  file.path = filePath;
  file.destination = destination;
  file.mimetype = "image/webp";
  delete file.buffer;
}

function convertToWebp(destination) {
  return async function (req, res, next) {
    try {
      if (req.file) {
        await convertFileToWebp(req.file, destination);
      }

      const files = Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat();
      if (files.length) {
        for (const file of files) {
          await convertFileToWebp(file, destination);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export const uploadProductImage = [createUpload(3 * MB).single("image"), convertToWebp("uploads/products")];
export const uploadProductImages = [
  createUpload(3 * MB).fields([
    { name: "image", maxCount: 1 },
    { name: "galleryImages", maxCount: 8 },
  ]),
  convertToWebp("uploads/products"),
];

export const uploadCakeImages = [
  createUpload(5 * MB).array("inspirationImages", 10),
  convertToWebp("uploads/custom-cakes"),
];
