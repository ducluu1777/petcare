CREATE TABLE "ai_chat_usages" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "modelRequest" BOOLEAN NOT NULL DEFAULT false,
    "model" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "reason" TEXT,
    "status" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_usages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_chat_usages_requestId_key" ON "ai_chat_usages"("requestId");
CREATE INDEX "ai_chat_usages_createdAt_source_idx" ON "ai_chat_usages"("createdAt", "source");

CREATE TABLE "ai_assistant_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "dailyRequestLimit" INTEGER NOT NULL DEFAULT 1000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_assistant_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_knowledge_entries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "answer" TEXT,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reviewedAt" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_knowledge_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_knowledge_entries_enabled_updatedAt_idx" ON "ai_knowledge_entries"("enabled", "updatedAt");
