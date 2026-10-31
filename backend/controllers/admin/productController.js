import asyncHandler from "../../middleware/asyncHandler.js";
import AppError from "../../utils/AppError.js";

import {
  getProductsService,
  createProductService,
  updateProductService,
  getProductByIdService,
  deleteProductService,
} from "../../services/admin/productService.js";

export const getProducts = asyncHandler(async (req, res) => {
  const products = await getProductsService();

  res.json(products);
});

export const createProduct = asyncHandler(async (req, res) => {
  const { name, priceInPence, categoryId } = req.body;

  const image = req.files?.image?.[0]?.filename ?? req.body.image;
  const galleryImages = [
    ...parseGallery(req.body.imageGallery),
    ...(req.files?.galleryImages || []).map((file) => file.filename),
  ];

  const product = await createProductService({
    ...req.body,
    name, priceInPence, image, categoryId, imageGallery: galleryImages,
  });

  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { name, priceInPence, categoryId } = req.body;

  const image = req.files?.image?.[0]?.filename ?? req.body.image;
  const galleryImages = [
    ...parseGallery(req.body.imageGallery),
    ...(req.files?.galleryImages || []).map((file) => file.filename),
  ];

  const product = await updateProductService(Number(req.params.id), {
    ...req.body,
    name, priceInPence, image, categoryId, imageGallery: galleryImages,
  });

  res.json(product);
});

function parseGallery(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error("Expected a list");
    return parsed;
  } catch {
    throw new AppError("Product gallery data must be a valid list", 400);
  }
}

export const getProductById = asyncHandler(async (req, res) => {
  const product = await getProductByIdService(Number(req.params.id));

  res.json(product);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  console.log("DELETE:", req.params.id);
  const result = await deleteProductService(Number(req.params.id));

  res.json(result);
});
