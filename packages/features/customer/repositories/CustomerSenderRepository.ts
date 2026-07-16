import type { PrismaClient } from "@ecom/prisma";

const SENDER_SELECT = {
  id: true,
  label: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  city: true,
  ward: true,
  zipCode: true,
  country: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class CustomerSenderRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByCustomerId(customerId: string) {
    return this.prisma.customerSender.findMany({
      where: { customerId, deletedAt: null },
      select: SENDER_SELECT,
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
  }

  async findById(id: number) {
    return this.prisma.customerSender.findFirst({
      where: { id, deletedAt: null },
      select: { ...SENDER_SELECT, customerId: true },
    });
  }

  async create(data: {
    customerId: string;
    label?: string | null;
    name: string;
    phone?: string | null;
    email?: string | null;
    address: string;
    city: string;
    ward?: string | null;
    zipCode?: string | null;
    country?: string;
    isDefault?: boolean;
  }) {
    return this.prisma.customerSender.create({
      data,
      select: SENDER_SELECT,
    });
  }

  async update(
    id: number,
    data: {
      label?: string | null;
      name?: string;
      phone?: string | null;
      email?: string | null;
      address?: string;
      city?: string;
      ward?: string | null;
      zipCode?: string | null;
      country?: string;
      isDefault?: boolean;
    },
  ) {
    return this.prisma.customerSender.update({
      where: { id },
      data,
      select: SENDER_SELECT,
    });
  }

  async softDelete(id: number) {
    return this.prisma.customerSender.update({
      where: { id },
      data: { deletedAt: new Date(), isDefault: false },
      select: { id: true },
    });
  }

  async resetDefault(customerId: string) {
    return this.prisma.customerSender.updateMany({
      where: { customerId, isDefault: true, deletedAt: null },
      data: { isDefault: false },
    });
  }
}
