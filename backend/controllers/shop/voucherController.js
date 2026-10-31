import asyncHandler from "../../middleware/asyncHandler.js";
import { getActiveVoucher } from "../../services/shop/voucherService.js";

export const lookupVoucher = asyncHandler(async (req, res) => {
  const voucher = await getActiveVoucher(req.params.code);

  if (!voucher) {
    return res.status(404).json({ error: "This code isn't valid." });
  }

  res.json(voucher);
});
