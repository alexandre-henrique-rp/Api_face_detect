/*
  Warnings:

  - You are about to drop the column `documentNumber` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `documentType` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `eyeDistance` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `faceFeatures` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `faceRatio` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `mouthWidth` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `noseWidth` on the `Image` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "extension" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Document" ("createdAt", "extension", "id", "name", "originalName", "path", "size", "updatedAt") SELECT "createdAt", "extension", "id", "name", "originalName", "path", "size", "updatedAt" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE INDEX "Document_name_idx" ON "Document"("name");
CREATE INDEX "Document_extension_idx" ON "Document"("extension");
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");
CREATE TABLE "new_Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "extension" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "faceHash" TEXT
);
INSERT INTO "new_Image" ("createdAt", "extension", "faceHash", "id", "name", "originalName", "path", "size", "updatedAt") SELECT "createdAt", "extension", "faceHash", "id", "name", "originalName", "path", "size", "updatedAt" FROM "Image";
DROP TABLE "Image";
ALTER TABLE "new_Image" RENAME TO "Image";
CREATE INDEX "Image_name_idx" ON "Image"("name");
CREATE INDEX "Image_extension_idx" ON "Image"("extension");
CREATE INDEX "Image_createdAt_idx" ON "Image"("createdAt");
CREATE INDEX "Image_faceHash_idx" ON "Image"("faceHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
