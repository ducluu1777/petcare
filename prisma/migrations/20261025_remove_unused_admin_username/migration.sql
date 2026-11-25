DROP INDEX IF EXISTS "admin_credentials_username_key";

ALTER TABLE "admin_credentials"
DROP COLUMN IF EXISTS "username";
