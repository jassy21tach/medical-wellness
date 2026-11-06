-- Overlap prevention (defense-in-depth). Application code also serializes
-- per-employee writes with pg_advisory_xact_lock. The exclusion constraint
-- is the database-level guarantee against double bookings, including races
-- from external writers. Cancelled appointments are excluded so they never
-- block availability.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_end_after_start" CHECK ("end_at" > "start_at");

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist ("employee_id" WITH =, tstzrange("start_at", "end_at") WITH &&)
  WHERE ("status" <> 'CANCELLED');
