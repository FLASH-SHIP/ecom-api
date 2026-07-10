-- CreateTable
CREATE TABLE "provinces" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "divisionType" TEXT NOT NULL,
    "codeName" TEXT NOT NULL,
    "phoneCode" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wards" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "divisionType" TEXT NOT NULL,
    "codeName" TEXT NOT NULL,
    "provinceCode" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provinces_code_key" ON "provinces"("code");

-- CreateIndex
CREATE UNIQUE INDEX "wards_code_key" ON "wards"("code");

-- CreateIndex
CREATE INDEX "wards_provinceCode_idx" ON "wards"("provinceCode");

-- CreateIndex
CREATE INDEX "wards_codeName_idx" ON "wards"("codeName");

-- AddForeignKey
ALTER TABLE "wards" ADD CONSTRAINT "wards_provinceCode_fkey" FOREIGN KEY ("provinceCode") REFERENCES "provinces"("code") ON DELETE CASCADE ON UPDATE CASCADE;
