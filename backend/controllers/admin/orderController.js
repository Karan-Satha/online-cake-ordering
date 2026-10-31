import asyncHandler from "../../middleware/asyncHandler.js";

import {
  getOrdersService,
  getOrderByIdService,
  updateOrderStatusService,
} from "../../services/admin/orderService.js";

export const getOrders = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;

  const limit = Number(req.query.limit) || 10;

  const orders = await getOrdersService(page, limit);

  res.json(orders);
});

export const getOrderById = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);

  const order = await getOrderByIdService(orderId);

  res.json(order);
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);
  const { status } = req.body;

  const order = await updateOrderStatusService(orderId, status);

  res.json({
    message: "Order status updated",
    order,
  });
});
