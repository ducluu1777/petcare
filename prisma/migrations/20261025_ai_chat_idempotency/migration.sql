CREATE TYPE "AiChatRequestStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "ai_chat_requests" (
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "ownerToken" TEXT NOT NULL,
    "status" "AiChatRequestStatus" NOT NULL DEFAULT 'PROCESSING',
    "response" JSONB,
    "leaseExpiresAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_chat_requests_pkey" PRIMARY KEY ("idempotencyKey")
);

CREATE INDEX "ai_chat_requests_status_leaseExpiresAt_idx" ON "ai_chat_requests"("status", "leaseExpiresAt");
CREATE INDEX "ai_chat_requests_expiresAt_idx" ON "ai_chat_requests"("expiresAt");
