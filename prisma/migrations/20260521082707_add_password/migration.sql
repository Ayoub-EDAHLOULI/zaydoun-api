/*
  Warnings:

  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: add with temp default, then remove default to enforce NOT NULL going forward
ALTER TABLE "users" ADD COLUMN "password" TEXT NOT NULL DEFAULT '';
