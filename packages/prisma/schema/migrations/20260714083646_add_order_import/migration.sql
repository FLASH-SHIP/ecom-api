-- CreateTable
CREATE TABLE "order_imports" (
    "id" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER,
    "total_rows" INTEGER NOT NULL,
    "success_rows" INTEGER NOT NULL,
    "failed_rows" INTEGER NOT NULL,
    "error_file_url" TEXT,
    "status" TEXT NOT NULL,
    "errors" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_imports_customer_id_idx" ON "order_imports"("customer_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "order_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_imports" ADD CONSTRAINT "order_imports_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
