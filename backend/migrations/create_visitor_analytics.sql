CREATE TABLE IF NOT EXISTS visitor_analytics (
  visitor_id UUID PRIMARY KEY,
  session_count INTEGER NOT NULL DEFAULT 0,
  page_views_in_session INTEGER NOT NULL DEFAULT 0,
  session_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
