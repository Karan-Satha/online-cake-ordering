import asyncHandler from "../../middleware/asyncHandler.js";
import { createOrderService } from "../../services/shop/orderService.js";

export const createOrder = asyncHandler(async (req, res) => {
  const order = await createOrderService(req.cartId, req.body);

  res.status(201).json({
    message: "Order created successfully",
    order,
  });
});
