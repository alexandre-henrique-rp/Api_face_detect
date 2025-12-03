/*
  Warnings:

  - You are about to drop the column `userId` on the `Image` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Dosie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "logs" TEXT NOT NULL,
    "processedBy" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "Dosie_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Dosie_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Dosie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Dosie" ("createdAt", "documentId", "id", "imageId", "logs", "processedAt", "processedBy", "status", "updatedAt") SELECT "createdAt", "documentId", "id", "imageId", "logs", "processedAt", "processedBy", "status", "updatedAt" FROM "Dosie";
DROP TABLE "Dosie";
ALTER TABLE "new_Dosie" RENAME TO "Dosie";
CREATE INDEX "Dosie_imageId_idx" ON "Dosie"("imageId");
CREATE INDEX "Dosie_documentId_idx" ON "Dosie"("documentId");
CREATE INDEX "Dosie_status_idx" ON "Dosie"("status");
CREATE INDEX "Dosie_processedBy_idx" ON "Dosie"("processedBy");
CREATE INDEX "Dosie_createdAt_idx" ON "Dosie"("createdAt");
CREATE INDEX "Dosie_userId_idx" ON "Dosie"("userId");
CREATE UNIQUE INDEX "Dosie_imageId_documentId_key" ON "Dosie"("imageId", "documentId");
CREATE TABLE "new_Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "extension" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "faceHash" TEXT,
    "eyeDistance" REAL,
    "noseWidth" REAL,
    "mouthWidth" REAL,
    "faceRatio" REAL,
    "faceFeatures" TEXT
);
INSERT INTO "new_Image" ("createdAt", "extension", "eyeDistance", "faceFeatures", "faceHash", "faceRatio", "id", "mouthWidth", "name", "noseWidth", "originalName", "path", "size", "updatedAt") SELECT "createdAt", "extension", "eyeDistance", "faceFeatures", "faceHash", "faceRatio", "id", "mouthWidth", "name", "noseWidth", "originalName", "path", "size", "updatedAt" FROM "Image";
DROP TABLE "Image";
ALTER TABLE "new_Image" RENAME TO "Image";
CREATE INDEX "Image_name_idx" ON "Image"("name");
CREATE INDEX "Image_extension_idx" ON "Image"("extension");
CREATE INDEX "Image_createdAt_idx" ON "Image"("createdAt");
CREATE INDEX "Image_faceHash_idx" ON "Image"("faceHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
