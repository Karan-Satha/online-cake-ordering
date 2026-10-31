import asyncHandler from "../../middleware/asyncHandler.js";

import {
  getVouchersService,
  getVoucherByIdService,
  createVoucherService,
  updateVoucherService,
  deleteVoucherService,
} from "../../services/admin/voucherService.js";

export const getVouchers = asyncHandler(async (req, res) => {
  const vouchers = await getVouchersService();

  res.json(vouchers);
});

export const getVoucherById = asyncHandler(async (req, res) => {
  const voucher = await getVoucherByIdService(Number(req.params.id));

  res.json(voucher);
});

export const createVoucher = asyncHandler(async (req, res) => {
  const voucher = await createVoucherService(req.body);

  res.status(201).json(voucher);
});

export const updateVoucher = asyncHandler(async (req, res) => {
  const voucher = await updateVoucherService(Number(req.params.id), req.body);

  res.json(voucher);
});

export const deleteVoucher = asyncHandler(async (req, res) => {
  const result = await deleteVoucherService(Number(req.params.id));

  res.json(result);
});
