-- DropTable
DROP TABLE IF EXISTS "transport_modes";

-- CreateTable
CREATE TABLE "transport_modes" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_modes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transport_modes_code_key" ON "transport_modes"("code");
