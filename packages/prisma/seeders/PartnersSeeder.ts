import type { PrismaClient } from "../src/generated/prisma/client";
import type { Seeder } from "./seeder.interface";

export const PartnersSeeder: Seeder = {
  name: "Partners and Services",

  async run(prisma: PrismaClient) {
    const defaultPartners = [
      {
        code: "IBC",
        name: "IBC Logistics",
        contactName: "Nguyen Van A",
        contactEmail: "contact@ibc.com",
        contactPhone: "0901234567",
        status: "ACTIVE" as const,
        description: "Đối tác hải quan và logistics chặng quốc tế",
      },
      {
        code: "USPS",
        name: "United States Postal Service",
        contactName: "John Smith",
        contactEmail: "support@usps.com",
        contactPhone: "+18002758777",
        status: "ACTIVE" as const,
        description: "Đối tác giao hàng chặng cuối tại Mỹ (Last Mile)",
      },
      {
        code: "SBP",
        name: "SBP Express",
        contactName: "Tran Van B",
        contactEmail: "ops@sbpexpress.com",
        contactPhone: "0918765432",
        status: "ACTIVE" as const,
        description: "Đối tác thu gom hàng chặng đi tại Việt Nam (Pickup)",
      },
      {
        code: "UPS",
        name: "United Parcel Service",
        contactName: "David Johnson",
        contactEmail: "api@ups.com",
        contactPhone: "+18007425877",
        status: "ACTIVE" as const,
        description: "Đối tác chuyển phát nhanh Last Mile",
      },
    ];

    // Seed partners
    for (const partnerData of defaultPartners) {
      await prisma.partner.upsert({
        where: { code: partnerData.code },
        update: {
          name: partnerData.name,
          contactName: partnerData.contactName,
          contactEmail: partnerData.contactEmail,
          contactPhone: partnerData.contactPhone,
          status: partnerData.status,
          description: partnerData.description,
        },
        create: partnerData,
      });
    }

    // Resolve IDs
    const partners = await prisma.partner.findMany({
      select: { id: true, code: true },
    });
    const partnerIdMap = new Map(partners.map((p) => [p.code, p.id]));

    const defaultServices = [
      {
        partnerCode: "IBC",
        code: "ibc_epacket",
        name: "IBC Epacket",
        type: "LASTMILE" as const,
        isSandbox: true,
        isActive: true,
        apiConfig: {
          endpoint: "https://api-sandbox.ibc.com/v1",
          timeoutMs: 15000,
        },
      },
      {
        partnerCode: "IBC",
        code: "ibc_express",
        name: "IBC Express Direct",
        type: "LASTMILE" as const,
        isSandbox: true,
        isActive: true,
        apiConfig: {
          endpoint: "https://api-sandbox.ibc.com/v1/express",
          timeoutMs: 15000,
        },
      },
      {
        partnerCode: "USPS",
        code: "usps_first_class",
        name: "USPS Ground Advantage / First-Class",
        type: "LASTMILE" as const,
        isSandbox: true,
        isActive: true,
        apiConfig: {
          endpoint: "https://secure.shippingapis.com/ShippingAPI.dll",
          timeoutMs: 10000,
        },
      },
      {
        partnerCode: "USPS",
        code: "usps_priority",
        name: "USPS Priority Mail",
        type: "LASTMILE" as const,
        isSandbox: true,
        isActive: true,
        apiConfig: {
          endpoint: "https://secure.shippingapis.com/ShippingAPI.dll",
          timeoutMs: 10000,
        },
      },
      {
        partnerCode: "SBP",
        code: "sbp_pickup",
        name: "SBP Domestic Pickup",
        type: "PICKUP" as const,
        isSandbox: true,
        isActive: true,
        apiConfig: {
          endpoint: "https://staging-api.sbpexpress.com/v2",
          timeoutMs: 10000,
        },
      },
    ];

    // Seed services
    for (const serviceData of defaultServices) {
      const partnerId = partnerIdMap.get(serviceData.partnerCode);
      if (!partnerId) continue;

      const { partnerCode, ...servicePayload } = serviceData;
      await prisma.partnerService.upsert({
        where: {
          partnerId_code: {
            partnerId,
            code: servicePayload.code,
          },
        },
        update: {
          name: servicePayload.name,
          type: servicePayload.type,
          isSandbox: servicePayload.isSandbox,
          isActive: servicePayload.isActive,
          apiConfig: servicePayload.apiConfig,
        },
        create: {
          ...servicePayload,
          partnerId,
        },
      });
    }

    console.log(
      `    → ${defaultPartners.length} partners and ${defaultServices.length} partner services seeded.`,
    );
  },
};
