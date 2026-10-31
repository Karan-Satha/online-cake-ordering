import AppError from "../utils/AppError.js";

export function validateCreateOrder(req, res, next) {
  const {
    customerName,
    customerEmail,
    customerPhone,
    deliveryAddress,
    deliveryCity,
    deliveryPostcode,
  } = req.body;

  if (
    !customerName ||
    !customerEmail ||
    !customerPhone ||
    !deliveryAddress ||
    !deliveryCity ||
    !deliveryPostcode
  ) {
    return next(new AppError("Please complete all required fields", 400));
  }

  next();
}
