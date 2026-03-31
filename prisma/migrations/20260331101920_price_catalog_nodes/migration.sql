-- CreateTable
CREATE TABLE "PriceCatalogNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priceText" TEXT,
    "sourceUrl" TEXT,
    "searchBlob" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PriceCatalogNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PriceCatalogNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PriceCatalogNode_parentId_idx" ON "PriceCatalogNode"("parentId");

-- CreateIndex
CREATE INDEX "PriceCatalogNode_searchBlob_idx" ON "PriceCatalogNode"("searchBlob");
