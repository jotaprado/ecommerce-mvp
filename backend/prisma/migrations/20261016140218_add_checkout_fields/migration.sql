-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('shipping', 'pickup');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryType" "DeliveryType",
ADD COLUMN     "pickupStore" TEXT,
ADD COLUMN     "shippingAddress" JSONB,
ADD COLUMN     "shippingCost" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "cardBrand" TEXT,
ADD COLUMN     "cardLast4" TEXT,
ADD COLUMN     "method" TEXT;

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "method" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);
