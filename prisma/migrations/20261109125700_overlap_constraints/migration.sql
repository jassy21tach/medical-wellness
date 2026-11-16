
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_end_after_start" CHECK ("end_at" > "start_at");

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist ("employee_id" WITH =, tstzrange("start_at", "end_at") WITH &&)
  WHERE ("status" <> 'CANCELLED');
