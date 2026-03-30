-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PendingAuth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checkId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "ipHash" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);
INSERT INTO "new_PendingAuth" ("checkId", "createdAt", "expiresAt", "id", "ipHash", "phone") SELECT "checkId", "createdAt", "expiresAt", "id", "ipHash", "phone" FROM "PendingAuth";
DROP TABLE "PendingAuth";
ALTER TABLE "new_PendingAuth" RENAME TO "PendingAuth";
CREATE UNIQUE INDEX "PendingAuth_checkId_key" ON "PendingAuth"("checkId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
