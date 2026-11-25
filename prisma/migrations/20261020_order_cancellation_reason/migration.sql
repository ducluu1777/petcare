ALTER TABLE public."orders"
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
