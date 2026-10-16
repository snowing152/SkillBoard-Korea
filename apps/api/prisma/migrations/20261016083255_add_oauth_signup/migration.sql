-- CreateTable
CREATE TABLE "OAuthSignup" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "displayName" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthSignup_tokenHash_key" ON "OAuthSignup"("tokenHash");

-- CreateIndex
CREATE INDEX "OAuthSignup_expiresAt_idx" ON "OAuthSignup"("expiresAt");
