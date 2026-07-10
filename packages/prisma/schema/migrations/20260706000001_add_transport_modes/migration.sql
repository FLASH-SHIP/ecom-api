-- CreateTable
CREATE TABLE IF NOT EXISTS "transport_modes" (
    "id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_modes_pkey" PRIMARY KEY ("id")
);
