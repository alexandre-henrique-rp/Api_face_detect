/*
  Warnings:

  - The primary key for the `user_adm` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_adm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_user_adm" ("createdAt", "email", "id", "name", "password", "updatedAt") SELECT "createdAt", "email", "id", "name", "password", "updatedAt" FROM "user_adm";
DROP TABLE "user_adm";
ALTER TABLE "new_user_adm" RENAME TO "user_adm";
CREATE UNIQUE INDEX "user_adm_email_key" ON "user_adm"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
