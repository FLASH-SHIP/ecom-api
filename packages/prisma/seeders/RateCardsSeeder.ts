import type { PrismaClient } from "../src/generated/prisma/client";
import type { Seeder } from "./seeder.interface";

export const RateCardsSeeder: Seeder = {
  name: "Rate Cards & Customer Groups",

  async run(prisma: PrismaClient) {
    // 1. Create Tier 1, Tier 2, and Tier 3 Customer Groups
    const tier1Group = await prisma.customerGroup.upsert({
      where: { code: "tier1" },
      update: {
        description: "Nhóm khách hàng tiêu chuẩn cấp 1",
      },
      create: {
        code: "tier1",
        name: "Khách hàng cấp 1 (Tier 1)",
        description: "Nhóm khách hàng tiêu chuẩn cấp 1",
      },
    });

    const tier2Group = await prisma.customerGroup.upsert({
      where: { code: "tier2" },
      update: {
        description: "Nhóm khách hàng thân thiết cấp 2",
      },
      create: {
        code: "tier2",
        name: "Khách hàng cấp 2 (Tier 2)",
        description: "Nhóm khách hàng thân thiết cấp 2",
      },
    });

    const tier3Group = await prisma.customerGroup.upsert({
      where: { code: "tier3" },
      update: {
        description: "Nhóm khách hàng VIP cấp 3",
      },
      create: {
        code: "tier3",
        name: "Khách hàng cấp 3 (Tier 3)",
        description: "Nhóm khách hàng VIP cấp 3",
      },
    });

    // 2. Assign any existing customers with no groupId to the tier1 group
    await prisma.customer.updateMany({
      where: { groupId: null },
      data: { groupId: tier1Group.id },
    });

    // 3. Seed Default Epacket Rate Card for Tier 1
    const epacketTier1Code = "epacket.tier1.us";
    const epacketCard = await prisma.rateCard.upsert({
      where: { code: epacketTier1Code },
      update: {},
      create: {
        code: epacketTier1Code,
        name: "Bảng giá Epacket Mặc định Tier 1",
        status: "PUBLISHED",
        shippingMethod: "EPACKET",
        country: "US",
        origin: null,
        currency: "USD",
        weightStep: 0.05,
        minWeight: 0.05,
        maxWeight: 5.0,
      },
    });

    // Link epacketCard to tier1 group
    await prisma.rateCardGroup.upsert({
      where: {
        rateCardId_customerGroupId: {
          rateCardId: epacketCard.id,
          customerGroupId: tier1Group.id,
        },
      },
      update: {},
      create: {
        rateCardId: epacketCard.id,
        customerGroupId: tier1Group.id,
      },
    });

    // Generate Epacket Slabs (0.05kg step, base $3.50 + $0.15 per 0.05kg)
    await prisma.rateCardItem.deleteMany({
      where: { rateCardId: epacketCard.id },
    });

    const epacketItems = [];
    let prevWeight = 0;
    for (let weightGram = 50; weightGram <= 5000; weightGram += 50) {
      const currentWeight = weightGram / 1000;
      const stepIndex = (weightGram - 50) / 50;
      const amount = 3.5 + stepIndex * 0.15; // e.g. 0.05 = $3.50, 0.10 = $3.65, ..., 5.00 = $18.35
      epacketItems.push({
        rateCardId: epacketCard.id,
        startWeight: prevWeight,
        endWeight: currentWeight,
        rateType: "STEP_FIXED" as const,
        amount: Number(amount.toFixed(2)),
      });
      prevWeight = currentWeight;
    }

    // Add Epacket Heavy Cargo Custom Range (5.00kg to 20.00kg -> $9.50/kg)
    epacketItems.push({
      rateCardId: epacketCard.id,
      startWeight: 5.0,
      endWeight: 20.0,
      rateType: "RANGE_PER_KG" as const,
      amount: 9.5,
    });

    await prisma.rateCardItem.createMany({
      data: epacketItems,
    });

    // 4. Seed VIP Silver Express Rate Card for Tier 2
    const expressTier2Code = "express.tier2.us";
    const expressCard2 = await prisma.rateCard.upsert({
      where: { code: expressTier2Code },
      update: {},
      create: {
        code: expressTier2Code,
        name: "Bảng giá Express Tier 2 US",
        status: "PUBLISHED",
        shippingMethod: "EXPRESS",
        country: "US",
        origin: null,
        currency: "USD",
        weightStep: 0.5,
        minWeight: 0.5,
        maxWeight: 20.0,
      },
    });

    // Link expressCard2 to tier2 group
    await prisma.rateCardGroup.upsert({
      where: {
        rateCardId_customerGroupId: {
          rateCardId: expressCard2.id,
          customerGroupId: tier2Group.id,
        },
      },
      update: {},
      create: {
        rateCardId: expressCard2.id,
        customerGroupId: tier2Group.id,
      },
    });

    // Generate Express Slabs for Tier 2 (0.5kg step, base $12.00 + $1.50 per 0.5kg)
    await prisma.rateCardItem.deleteMany({
      where: { rateCardId: expressCard2.id },
    });

    const expressItems2 = [];
    prevWeight = 0;
    for (let weightGram = 500; weightGram <= 20000; weightGram += 500) {
      const currentWeight = weightGram / 1000;
      const stepIndex = (weightGram - 500) / 500;
      const amount = 12.0 + stepIndex * 1.5; // e.g. 0.5 = $12.00, 1.0 = $13.50, ..., 20.0 = $70.50
      expressItems2.push({
        rateCardId: expressCard2.id,
        startWeight: prevWeight,
        endWeight: currentWeight,
        rateType: "STEP_FIXED" as const,
        amount: Number(amount.toFixed(2)),
      });
      prevWeight = currentWeight;
    }

    // Add Express Custom Heavy Cargo Ranges for Tier 2
    expressItems2.push({
      rateCardId: expressCard2.id,
      startWeight: 20.0,
      endWeight: 44.0,
      rateType: "RANGE_PER_KG" as const,
      amount: 9.99,
    });
    expressItems2.push({
      rateCardId: expressCard2.id,
      startWeight: 44.0,
      endWeight: 100.0,
      rateType: "RANGE_PER_KG" as const,
      amount: 8.99,
    });

    await prisma.rateCardItem.createMany({
      data: expressItems2,
    });

    // 5. Seed VIP Gold Express Rate Card for Tier 3
    const expressTier3Code = "express.tier3.us";
    const expressCard3 = await prisma.rateCard.upsert({
      where: { code: expressTier3Code },
      update: {},
      create: {
        code: expressTier3Code,
        name: "Bảng giá Express VIP Tier 3 US",
        status: "PUBLISHED",
        shippingMethod: "EXPRESS",
        country: "US",
        origin: null,
        currency: "USD",
        weightStep: 0.5,
        minWeight: 0.5,
        maxWeight: 20.0,
      },
    });

    // Link expressCard3 to tier3 group
    await prisma.rateCardGroup.upsert({
      where: {
        rateCardId_customerGroupId: {
          rateCardId: expressCard3.id,
          customerGroupId: tier3Group.id,
        },
      },
      update: {},
      create: {
        rateCardId: expressCard3.id,
        customerGroupId: tier3Group.id,
      },
    });

    // Generate Express Slabs for Tier 3 (0.5kg step, base $10.00 + $1.00 per 0.5kg) - Cheaper than Tier 2
    await prisma.rateCardItem.deleteMany({
      where: { rateCardId: expressCard3.id },
    });

    const expressItems3 = [];
    prevWeight = 0;
    for (let weightGram = 500; weightGram <= 20000; weightGram += 500) {
      const currentWeight = weightGram / 1000;
      const stepIndex = (weightGram - 500) / 500;
      const amount = 10.0 + stepIndex * 1.0; // e.g. 0.5 = $10.00, 1.0 = $11.00, ..., 20.0 = $49.00
      expressItems3.push({
        rateCardId: expressCard3.id,
        startWeight: prevWeight,
        endWeight: currentWeight,
        rateType: "STEP_FIXED" as const,
        amount: Number(amount.toFixed(2)),
      });
      prevWeight = currentWeight;
    }

    // Add Express Custom Heavy Cargo Ranges for Tier 3
    expressItems3.push({
      rateCardId: expressCard3.id,
      startWeight: 20.0,
      endWeight: 44.0,
      rateType: "RANGE_PER_KG" as const,
      amount: 8.99,
    });
    expressItems3.push({
      rateCardId: expressCard3.id,
      startWeight: 44.0,
      endWeight: 100.0,
      rateType: "RANGE_PER_KG" as const,
      amount: 7.99,
    });

    await prisma.rateCardItem.createMany({
      data: expressItems3,
    });

    console.log(`    → Created 3 Customer Groups ("tier1", "tier2", "tier3")`);
    console.log(`    → Created Rate Card "${epacketTier1Code}" with ${epacketItems.length} slabs`);
    console.log(`    → Created Rate Card "${expressTier2Code}" with ${expressItems2.length} slabs`);
    console.log(
      `    → Created Rate Card "${expressTier3Code}" (VIP Gold) with ${expressItems3.length} slabs`,
    );
  },
};
