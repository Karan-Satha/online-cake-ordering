import AppError from "../utils/AppError.js";

export function validateAddCartItem(req, res, next) {
  const { productId, quantity } = req.body;

  if (!Number.isInteger(Number(productId))) {
    return next(new AppError("Invalid product", 400));
  }

  if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
    return next(new AppError("Invalid quantity", 400));
  }

  if (req.body.variantId != null && req.body.variantId !== "" && (!Number.isInteger(Number(req.body.variantId)) || Number(req.body.variantId) < 1)) {
    return next(new AppError("Invalid product size", 400));
  }

  next();
}

export function validateUpdateCartItem(req, res, next) {
  const productId = Number(req.params.id);
  const quantity = Number(req.body.quantity);

  if (!Number.isInteger(productId)) {
    return next(new AppError("Invalid product", 400));
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return next(new AppError("Invalid quantity", 400));
  }

  next();
}
