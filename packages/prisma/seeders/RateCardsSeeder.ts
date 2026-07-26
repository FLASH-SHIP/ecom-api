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

    // ==========================================
    // DEFAULT TIER (Baseline) - ID: 1, 2
    // ==========================================

    // 3. Seed Default Epacket Rate Card (linked ONLY to default group) -> ID: 1
    const epacketDefaultCode = "epacket.default.us";
    const epacketDefaultCard = await prisma.rateCard.upsert({
      where: { code: epacketDefaultCode },
      update: {
        type: "DEFAULT",
        minWeight: 0.0,
        maxWeight: 5.0,
        weightStep: 0.05,
      },
      create: {
        code: epacketDefaultCode,
        name: "Bảng giá Epacket Mặc định",
        type: "DEFAULT",
        status: "PUBLISHED",
        shippingMethod: "EPACKET",
        country: "US",
        origin: null,
        currency: "USD",
        weightStep: 0.05,
        minWeight: 0.0,
        maxWeight: 5.0,
      },
    });

    // Generate Epacket Slabs for Default (0.05kg step, base $3.80 + $0.20 per 0.05kg)
    await prisma.rateCardItem.deleteMany({
      where: { rateCardId: epacketDefaultCard.id },
    });

    const epacketDefaultItems = [];
    let prevWeight = 0;
    for (let weightGram = 50; weightGram <= 5000; weightGram += 50) {
      const currentWeight = weightGram / 1000;
      const stepIndex = (weightGram - 50) / 50;
      const amount = 3.8 + stepIndex * 0.2; // e.g. 0.05 = $3.80, 0.10 = $4.00, ..., 5.00 = $23.60
      epacketDefaultItems.push({
        rateCardId: epacketDefaultCard.id,
        startWeight: prevWeight,
        endWeight: currentWeight,
        rateType: "STEP_FIXED" as const,
        amount: Number(amount.toFixed(2)),
      });
      prevWeight = currentWeight;
    }

    // Add Epacket Heavy Cargo Custom Range for Default (5.00kg to 20.00kg -> $10.50/kg)
    epacketDefaultItems.push({
      rateCardId: epacketDefaultCard.id,
      startWeight: 5.0,
      endWeight: 20.0,
      rateType: "RANGE_PER_KG" as const,
      amount: 10.5,
    });

    await prisma.rateCardItem.createMany({
      data: epacketDefaultItems,
    });

    // 4. Seed Default Express Rate Card (linked ONLY to default group) -> ID: 2
    const expressDefaultCode = "express.default.us";
    const expressDefaultCard = await prisma.rateCard.upsert({
      where: { code: expressDefaultCode },
      update: {
        type: "DEFAULT",
        minWeight: 0.0,
        maxWeight: 20.0,
        weightStep: 0.5,
      },
      create: {
        code: expressDefaultCode,
        name: "Bảng giá Express Mặc định",
        type: "DEFAULT",
        status: "PUBLISHED",
        shippingMethod: "EXPRESS",
        country: "US",
        origin: null,
        currency: "USD",
        weightStep: 0.5,
        minWeight: 0.0,
        maxWeight: 20.0,
      },
    });

    // Generate Express Slabs for Default (0.5kg step, base $15.00 + $2.00 per 0.5kg)
    await prisma.rateCardItem.deleteMany({
      where: { rateCardId: expressDefaultCard.id },
    });

    const expressDefaultItems = [];
    prevWeight = 0;
    for (let weightGram = 500; weightGram <= 20000; weightGram += 500) {
      const currentWeight = weightGram / 1000;
      const stepIndex = (weightGram - 500) / 500;
      const amount = 15.0 + stepIndex * 2.0; // e.g. 0.5 = $15.00, 1.0 = $17.00, ..., 20.0 = $93.00
      expressDefaultItems.push({
        rateCardId: expressDefaultCard.id,
        startWeight: prevWeight,
        endWeight: currentWeight,
        rateType: "STEP_FIXED" as const,
        amount: Number(amount.toFixed(2)),
      });
      prevWeight = currentWeight;
    }

    // Add Express Custom Heavy Cargo Ranges for Default
    expressDefaultItems.push({
      rateCardId: expressDefaultCard.id,
      startWeight: 20.0,
      endWeight: 100.0,
      rateType: "RANGE_PER_KG" as const,
      amount: 11.99,
    });

    await prisma.rateCardItem.createMany({
      data: expressDefaultItems,
    });

    // ==========================================
    // TIER 1 - ID: 3, 4
    // ==========================================

    // 5. Seed Tier 1 Epacket Rate Card (linked ONLY to tier1 group) -> ID: 3
    const epacketTier1Code = "epacket.tier1.us";
    const epacketTier1Card = await prisma.rateCard.upsert({
      where: { code: epacketTier1Code },
      update: {
        type: "CUSTOM",
        minWeight: 0.0,
        maxWeight: 5.0,
        weightStep: 0.05,
      },
      create: {
        code: epacketTier1Code,
        name: "Bảng giá Epacket Tier 1",
        type: "CUSTOM",
        status: "PUBLISHED",
        shippingMethod: "EPACKET",
        country: "US",
        origin: null,
        currency: "USD",
        weightStep: 0.05,
        minWeight: 0.0,
        maxWeight: 5.0,
      },
    });

    // Link epacketTier1Card to tier1 group
    await prisma.rateCardGroup.upsert({
      where: {
        rateCardId_customerGroupId: {
          rateCardId: epacketTier1Card.id,
          customerGroupId: tier1Group.id,
        },
      },
      update: {},
      create: {
        rateCardId: epacketTier1Card.id,
        customerGroupId: tier1Group.id,
      },
    });

    // Generate Epacket Slabs for Tier 1 (0.05kg step, base $3.50 + $0.15 per 0.05kg)
    await prisma.rateCardItem.deleteMany({
      where: { rateCardId: epacketTier1Card.id },
    });

    const epacketTier1Items = [];
    prevWeight = 0;
    for (let weightGram = 50; weightGram <= 5000; weightGram += 50) {
      const currentWeight = weightGram / 1000;
      const stepIndex = (weightGram - 50) / 50;
      const amount = 3.5 + stepIndex * 0.15; // e.g. 0.05 = $3.50, 0.10 = $3.65, ..., 5.00 = $18.35
      epacketTier1Items.push({
        rateCardId: epacketTier1Card.id,
        startWeight: prevWeight,
        endWeight: currentWeight,
        rateType: "STEP_FIXED" as const,
        amount: Number(amount.toFixed(2)),
      });
      prevWeight = currentWeight;
    }

    // Add Epacket Heavy Cargo Custom Range for Tier 1 (5.00kg to 20.00kg -> $9.50/kg)
    epacketTier1Items.push({
      rateCardId: epacketTier1Card.id,
      startWeight: 5.0,
      endWeight: 20.0,
      rateType: "RANGE_PER_KG" as const,
      amount: 9.5,
    });

    await prisma.rateCardItem.createMany({
      data: epacketTier1Items,
    });

    // 6. Seed Tier 1 Express Rate Card (linked ONLY to tier1 group) -> ID: 4
    const expressTier1Code = "express.tier1.us";
    const expressTier1Card = await prisma.rateCard.upsert({
      where: { code: expressTier1Code },
      update: {
        type: "CUSTOM",
        minWeight: 0.0,
        maxWeight: 20.0,
        weightStep: 0.5,
      },
      create: {
        code: expressTier1Code,
        name: "Bảng giá Express Tier 1",
        type: "CUSTOM",
        status: "PUBLISHED",
        shippingMethod: "EXPRESS",
        country: "US",
        origin: null,
        currency: "USD",
        weightStep: 0.5,
        minWeight: 0.0,
        maxWeight: 20.0,
      },
    });

    // Link expressTier1Card to tier1 group
    await prisma.rateCardGroup.upsert({
      where: {
        rateCardId_customerGroupId: {
          rateCardId: expressTier1Card.id,
          customerGroupId: tier1Group.id,
        },
      },
      update: {},
      create: {
        rateCardId: expressTier1Card.id,
        customerGroupId: tier1Group.id,
      },
    });

    // Generate Express Slabs for Tier 1 (0.5kg step, base $13.50 + $1.75 per 0.5kg)
    await prisma.rateCardItem.deleteMany({
      where: { rateCardId: expressTier1Card.id },
    });

    const expressTier1Items = [];
    prevWeight = 0;
    for (let weightGram = 500; weightGram <= 20000; weightGram += 500) {
      const currentWeight = weightGram / 1000;
      const stepIndex = (weightGram - 500) / 500;
      const amount = 13.5 + stepIndex * 1.75; // e.g. 0.5 = $13.50, 1.0 = $15.25, ..., 20.0 = $81.75
      expressTier1Items.push({
        rateCardId: expressTier1Card.id,
        startWeight: prevWeight,
        endWeight: currentWeight,
        rateType: "STEP_FIXED" as const,
        amount: Number(amount.toFixed(2)),
      });
      prevWeight = currentWeight;
    }

    // Add Express Custom Heavy Cargo Ranges for Tier 1
    expressTier1Items.push({
      rateCardId: expressTier1Card.id,
      startWeight: 20.0,
      endWeight: 100.0,
      rateType: "RANGE_PER_KG" as const,
      amount: 10.99,
    });

    await prisma.rateCardItem.createMany({
      data: expressTier1Items,
    });

    // ==========================================
    // TIER 2 - ID: 5, 6
    // ==========================================

    // 7. Seed Tier 2 Epacket Rate Card (linked ONLY to tier2 group) -> ID: 5
    const epacketTier2Code = "epacket.tier2.us";
    const epacketTier2Card = await prisma.rateCard.upsert({
      where: { code: epacketTier2Code },
      update: {
        type: "CUSTOM",
        minWeight: 0.0,
        maxWeight: 5.0,
        weightStep: 0.05,
      },
      create: {
        code: epacketTier2Code,
        name: "Bảng giá Epacket Tier 2",
        type: "CUSTOM",
        status: "PUBLISHED",
        shippingMethod: "EPACKET",
        country: "US",
        origin: null,
        currency: "USD",
        weightStep: 0.05,
        minWeight: 0.0,
        maxWeight: 5.0,
      },
    });

    // Link epacketTier2Card to tier2 group
    await prisma.rateCardGroup.upsert({
      where: {
        rateCardId_customerGroupId: {
          rateCardId: epacketTier2Card.id,
          customerGroupId: tier2Group.id,
        },
      },
      update: {},
      create: {
        rateCardId: epacketTier2Card.id,
        customerGroupId: tier2Group.id,
      },
    });

    // Generate Epacket Slabs for Tier 2 (0.05kg step, base $3.20 + $0.12 per 0.05kg)
    await prisma.rateCardItem.deleteMany({
      where: { rateCardId: epacketTier2Card.id },
    });

    const epacketTier2Items = [];
    prevWeight = 0;
    for (let weightGram = 50; weightGram <= 5000; weightGram += 50) {
      const currentWeight = weightGram / 1000;
      const stepIndex = (weightGram - 50) / 50;
      const amount = 3.2 + stepIndex * 0.12; // e.g. 0.05 = $3.20, 0.10 = $3.32, ..., 5.00 = $15.08
      epacketTier2Items.push({
        rateCardId: epacketTier2Card.id,
        startWeight: prevWeight,
        endWeight: currentWeight,
        rateType: "STEP_FIXED" as const,
        amount: Number(amount.toFixed(2)),
      });
      prevWeight = currentWeight;
    }

    // Add Epacket Heavy Cargo Custom Range for Tier 2 (5.00kg to 20.00kg -> $8.50/kg)
    epacketTier2Items.push({
      rateCardId: epacketTier2Card.id,
      startWeight: 5.0,
      endWeight: 20.0,
      rateType: "RANGE_PER_KG" as const,
      amount: 8.5,
    });

    await prisma.rateCardItem.createMany({
      data: epacketTier2Items,
    });

    // 8. Seed Tier 2 Express Rate Card (linked ONLY to tier2 group) -> ID: 6
    const expressTier2Code = "express.tier2.us";
    const expressCard2 = await prisma.rateCard.upsert({
      where: { code: expressTier2Code },
      update: {
        type: "CUSTOM",
        minWeight: 0.0,
        maxWeight: 20.0,
        weightStep: 0.5,
      },
      create: {
        code: expressTier2Code,
        name: "Bảng giá Express Tier 2 US",
        type: "CUSTOM",
        status: "PUBLISHED",
        shippingMethod: "EXPRESS",
        country: "US",
        origin: null,
        currency: "USD",
        weightStep: 0.5,
        minWeight: 0.0,
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
      endWeight: 100.0,
      rateType: "RANGE_PER_KG" as const,
      amount: 9.99,
    });

    await prisma.rateCardItem.createMany({
      data: expressItems2,
    });

    // ==========================================
    // TIER 3 - ID: 7, 8
    // ==========================================

    // 9. Seed Tier 3 Epacket Rate Card (linked ONLY to tier3 group) -> ID: 7
    const epacketTier3Code = "epacket.tier3.us";
    const epacketTier3Card = await prisma.rateCard.upsert({
      where: { code: epacketTier3Code },
      update: {
        type: "CUSTOM",
        minWeight: 0.0,
        maxWeight: 5.0,
        weightStep: 0.05,
      },
      create: {
        code: epacketTier3Code,
        name: "Bảng giá Epacket Tier 3",
        type: "CUSTOM",
        status: "PUBLISHED",
        shippingMethod: "EPACKET",
        country: "US",
        origin: null,
        currency: "USD",
        weightStep: 0.05,
        minWeight: 0.0,
        maxWeight: 5.0,
      },
    });

    // Link epacketTier3Card to tier3 group
    await prisma.rateCardGroup.upsert({
      where: {
        rateCardId_customerGroupId: {
          rateCardId: epacketTier3Card.id,
          customerGroupId: tier3Group.id,
        },
      },
      update: {},
      create: {
        rateCardId: epacketTier3Card.id,
        customerGroupId: tier3Group.id,
      },
    });

    // Generate Epacket Slabs for Tier 3 (0.05kg step, base $2.90 + $0.10 per 0.05kg)
    await prisma.rateCardItem.deleteMany({
      where: { rateCardId: epacketTier3Card.id },
    });

    const epacketTier3Items = [];
    prevWeight = 0;
    for (let weightGram = 50; weightGram <= 5000; weightGram += 50) {
      const currentWeight = weightGram / 1000;
      const stepIndex = (weightGram - 50) / 50;
      const amount = 2.9 + stepIndex * 0.1; // e.g. 0.05 = $2.90, 0.10 = $3.00, ..., 5.00 = $12.80
      epacketTier3Items.push({
        rateCardId: epacketTier3Card.id,
        startWeight: prevWeight,
        endWeight: currentWeight,
        rateType: "STEP_FIXED" as const,
        amount: Number(amount.toFixed(2)),
      });
      prevWeight = currentWeight;
    }

    // Add Epacket Heavy Cargo Custom Range for Tier 3 (5.00kg to 20.00kg -> $7.50/kg)
    epacketTier3Items.push({
      rateCardId: epacketTier3Card.id,
      startWeight: 5.0,
      endWeight: 20.0,
      rateType: "RANGE_PER_KG" as const,
      amount: 7.5,
    });

    await prisma.rateCardItem.createMany({
      data: epacketTier3Items,
    });

    // 10. Seed Tier 3 Express Rate Card (linked ONLY to tier3 group) -> ID: 8
    const expressTier3Code = "express.tier3.us";
    const expressCard3 = await prisma.rateCard.upsert({
      where: { code: expressTier3Code },
      update: {
        type: "CUSTOM",
        minWeight: 0.0,
        maxWeight: 20.0,
        weightStep: 0.5,
      },
      create: {
        code: expressTier3Code,
        name: "Bảng giá Express VIP Tier 3 US",
        type: "CUSTOM",
        status: "PUBLISHED",
        shippingMethod: "EXPRESS",
        country: "US",
        origin: null,
        currency: "USD",
        weightStep: 0.5,
        minWeight: 0.0,
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
      endWeight: 100.0,
      rateType: "RANGE_PER_KG" as const,
      amount: 8.99,
    });

    await prisma.rateCardItem.createMany({
      data: expressItems3,
    });

    console.log(`    → Created 3 Customer Groups ("tier1", "tier2", "tier3")`);
    console.log(
      `    → Created Rate Card "${epacketDefaultCode}" with ${epacketDefaultItems.length} slabs`,
    );
    console.log(
      `    → Created Rate Card "${expressDefaultCode}" with ${expressDefaultItems.length} slabs`,
    );
    console.log(
      `    → Created Rate Card "${epacketTier1Code}" with ${epacketTier1Items.length} slabs`,
    );
    console.log(
      `    → Created Rate Card "${expressTier1Code}" with ${expressTier1Items.length} slabs`,
    );
    console.log(
      `    → Created Rate Card "${epacketTier2Code}" with ${epacketTier2Items.length} slabs`,
    );
    console.log(`    → Created Rate Card "${expressTier2Code}" with ${expressItems2.length} slabs`);
    console.log(
      `    → Created Rate Card "${epacketTier3Code}" with ${epacketTier3Items.length} slabs`,
    );
    console.log(
      `    → Created Rate Card "${expressTier3Code}" (VIP Gold) with ${expressItems3.length} slabs`,
    );
  },
};
