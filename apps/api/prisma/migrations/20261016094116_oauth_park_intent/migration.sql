-- CreateEnum
CREATE TYPE "OAuthParkIntent" AS ENUM ('SIGNUP', 'LINK');

-- AlterTable
ALTER TABLE "OAuthSignup" ADD COLUMN     "intent" "OAuthParkIntent" NOT NULL DEFAULT 'SIGNUP';
