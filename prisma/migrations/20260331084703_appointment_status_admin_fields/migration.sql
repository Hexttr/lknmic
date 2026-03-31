-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppointmentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "specialistTypeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "adminDate" TEXT,
    "adminTime" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppointmentRequest_specialistTypeId_fkey" FOREIGN KEY ("specialistTypeId") REFERENCES "SpecialistType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AppointmentRequest" ("createdAt", "date", "id", "specialistTypeId", "timeSlot", "userId") SELECT "createdAt", "date", "id", "specialistTypeId", "timeSlot", "userId" FROM "AppointmentRequest";
DROP TABLE "AppointmentRequest";
ALTER TABLE "new_AppointmentRequest" RENAME TO "AppointmentRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
