import type { PrismaClient } from "../src/generated/prisma/client";
import type { Seeder } from "./seeder.interface";

export const CustomersSeeder: Seeder = {
  name: "Default Customers",

  async run(prisma: PrismaClient) {
    // Find customer groups (Tier 1, 2, 3) created in RateCardsSeeder
    const tier1 = await prisma.customerGroup.findUnique({
      where: { code: "tier1" },
      select: { id: true },
    });
    const tier2 = await prisma.customerGroup.findUnique({
      where: { code: "tier2" },
      select: { id: true },
    });
    const tier3 = await prisma.customerGroup.findUnique({
      where: { code: "tier3" },
      select: { id: true },
    });

    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("password123", 12);

    const customersData = [
      {
        id: "0190a618-971c-7000-8000-000000000002",
        customerCode: "KH9R5M84",
        email: "customer1@ecom.com",
        username: "customer1",
        name: "Nguyễn Văn A",
        phone: "0901234567",
        hashedPassword: hash,
        emailVerified: new Date(),
        groupId: tier1?.id || null,
      },
      {
        id: "0190a618-971c-7000-8000-000000000003",
        customerCode: "KHFPBWQU",
        email: "customer2@ecom.com",
        username: "customer2",
        name: "Trần Thị B",
        phone: "0907654321",
        hashedPassword: hash,
        emailVerified: new Date(),
        groupId: tier2?.id || null,
      },
      {
        id: "0190a618-971c-7000-8000-000000000004",
        customerCode: "KH35N4W3",
        email: "customer3@ecom.com",
        username: "customer3",
        name: "Lê Văn C",
        phone: "0988888888",
        hashedPassword: hash,
        emailVerified: new Date(),
        groupId: tier3?.id || null,
      },
    ];

    for (const data of customersData) {
      const existing = await prisma.customer.findUnique({
        where: { email: data.email },
        select: { id: true },
      });

      if (!existing) {
        await prisma.customer.create({
          data,
        });
        console.log(`    → Created ${data.email} (password: password123)`);
      } else {
        // Update group assignment if it changes
        await prisma.customer.update({
          where: { id: existing.id },
          data: { groupId: data.groupId },
        });
      }
    }
  },
};
