import multer from "multer";

export default function errorHandler(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      error: error.message,
    });
  }

  const statusCode = error.statusCode || 500;

  const context = `${req.method} ${req.originalUrl}`;
  console.error(`[ERROR] ${context}: ${error.message}${error.code ? ` (code ${error.code})` : ""}`);
  if (process.env.NODE_ENV !== "production") {
    console.error(error.stack);
  }

  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal Server Error" : error.message,
  });
}
