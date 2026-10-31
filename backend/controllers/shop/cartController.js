import asyncHandler from "../../middleware/asyncHandler.js";

import {
  getCartService,
  addCartItemService,
  updateCartItemService,
  deleteCartItemService,
} from "../../services/shop/cartService.js";

// GET /api/cart
export const getCart = asyncHandler(async (req, res) => {
  const cart = await getCartService(req.cartId);

  res.json(cart);
});

// POST /api/cart/items
export const addCartItem = asyncHandler(async (req, res) => {
  const cart = await addCartItemService(
    req.cartId,
    Number(req.body.productId),
    Number(req.body.quantity),
    req.body.variantId ? Number(req.body.variantId) : null,
  );

  res.status(201).json(cart);
});

// PATCH /api/cart/items/:id
export const updateCartItem = asyncHandler(async (req, res) => {
  const cart = await updateCartItemService(
    req.cartId,
    Number(req.params.id),
    Number(req.body.quantity),
  );

  res.json(cart);
});

// DELETE /api/cart/items/:id
export const deleteCartItem = asyncHandler(async (req, res) => {
  const cart = await deleteCartItemService(req.cartId, Number(req.params.id));

  res.json(cart);
});
