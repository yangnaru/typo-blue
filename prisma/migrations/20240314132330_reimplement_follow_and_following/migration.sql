/*
  Warnings:

  - You are about to drop the column `accountId` on the `Follow` table. All the data in the column will be lost.
  - You are about to drop the column `targetAccountId` on the `Follow` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[followerId,followingId]` on the table `Follow` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `followerId` to the `Follow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `followingId` to the `Follow` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_accountId_fkey";

-- DropIndex
DROP INDEX "Follow_accountId_targetAccountId_key";

-- AlterTable
ALTER TABLE "Follow" DROP COLUMN "accountId",
DROP COLUMN "targetAccountId",
ADD COLUMN     "followerId" INTEGER NOT NULL,
ADD COLUMN     "followingId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "Blog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "Blog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
