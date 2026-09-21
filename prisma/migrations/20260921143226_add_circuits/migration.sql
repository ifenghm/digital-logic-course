-- CreateTable
CREATE TABLE "circuits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "graph" TEXT NOT NULL DEFAULT '{"nodes":[],"wires":[]}',
    "forkedFromId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "circuits_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "circuits_forkedFromId_fkey" FOREIGN KEY ("forkedFromId") REFERENCES "circuits" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
