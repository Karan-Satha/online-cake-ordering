import AppError from "../utils/AppError.js";

export function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email?.trim()) {
    return next(new AppError("Email is required", 400));
  }

  if (!password) {
    return next(new AppError("Password is required", 400));
  }

  next();
}
