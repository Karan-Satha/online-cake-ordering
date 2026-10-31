import asyncHandler from "../../middleware/asyncHandler.js";

import { getDashboardStatsService } from "../../services/admin/dashboardService.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await getDashboardStatsService();

  res.json(stats);
});
