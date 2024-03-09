-- AlterTable
ALTER TABLE "Blog" ADD COLUMN     "privateKey" TEXT,
ADD COLUMN     "publicKey" TEXT;

-- CreateTable
CREATE TABLE "Follow" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" INTEGER NOT NULL,
    "targetAccountId" TEXT NOT NULL,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Follow_accountId_targetAccountId_key" ON "Follow"("accountId", "targetAccountId");

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
