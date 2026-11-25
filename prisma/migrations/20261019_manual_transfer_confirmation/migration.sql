ALTER TABLE "transactions"
ADD COLUMN "receivedAmount" INTEGER,
ADD COLUMN "confirmedById" TEXT;

ALTER TABLE "order_payment_intents"
ADD COLUMN "confirmedById" TEXT,
ADD COLUMN "excessRefunded" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_confirmedById_fkey"
FOREIGN KEY ("confirmedById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_payment_intents"
ADD CONSTRAINT "order_payment_intents_confirmedById_fkey"
FOREIGN KEY ("confirmedById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
