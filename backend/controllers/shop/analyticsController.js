import { randomUUID } from "node:crypto";
import asyncHandler from "../../middleware/asyncHandler.js";
import pool from "../../db.js";
import { config } from "../../config/index.js";

const VISITOR_COOKIE = "hcVisitorId";
const VISITOR_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "none",
  secure: true,
  path: "/",
  maxAge: 1000 * 60 * 60 * 24 * 365,
};

export const trackVisitorPageView = asyncHandler(async (req, res) => {
  const candidate = req.cookies?.[VISITOR_COOKIE];
  const visitorId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate || "")
    ? candidate
    : randomUUID();

  res.cookie(VISITOR_COOKIE, visitorId, {
    ...VISITOR_COOKIE_OPTIONS,
    sameSite: config.nodeEnv === "production" ? "none" : "lax",
    secure: config.nodeEnv === "production",
  });

  const result = await pool.query(
    `INSERT INTO visitor_analytics (visitor_id, session_count, page_views_in_session, session_started_at, last_seen_at)
     VALUES ($1, 1, 1, now(), now())
     ON CONFLICT (visitor_id) DO UPDATE SET
       session_count = visitor_analytics.session_count + CASE
         WHEN visitor_analytics.last_seen_at <= now() - interval '30 minutes' THEN 1 ELSE 0 END,
       page_views_in_session = CASE
         WHEN visitor_analytics.last_seen_at <= now() - interval '30 minutes' THEN 1
         ELSE visitor_analytics.page_views_in_session + 1 END,
       session_started_at = CASE
         WHEN visitor_analytics.last_seen_at <= now() - interval '30 minutes' THEN now()
         ELSE visitor_analytics.session_started_at END,
       last_seen_at = now()
     RETURNING visitor_id, session_count, page_views_in_session`,
    [visitorId],
  );

  const visitor = result.rows[0];
  res.json({
    id: visitor.visitor_id,
    sessionCount: visitor.session_count,
    pageViewsInSession: visitor.page_views_in_session,
  });
});
