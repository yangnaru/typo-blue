/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Blog` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Blog_userId_key" ON "Blog"("userId");
