ALTER TABLE "admin_credentials"
ADD COLUMN "username" TEXT;

CREATE UNIQUE INDEX "admin_credentials_username_key"
ON "admin_credentials"("username");
