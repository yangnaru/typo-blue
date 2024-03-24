/*
  Warnings:

  - You are about to drop the column `privateKey` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the column `publicKey` on the `Blog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Blog" DROP COLUMN "privateKey",
DROP COLUMN "publicKey";
