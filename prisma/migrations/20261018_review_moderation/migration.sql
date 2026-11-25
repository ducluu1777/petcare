ALTER TABLE "reviews"
ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "moderationReason" TEXT,
ADD COLUMN "moderatedAt" TIMESTAMP(3),
ADD COLUMN "moderatedById" TEXT;

CREATE INDEX "reviews_isHidden_createdAt_idx"
ON "reviews"("isHidden", "createdAt");

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_moderatedById_fkey"
FOREIGN KEY ("moderatedById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
