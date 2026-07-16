import type { PrismaClient } from "@ecom/prisma";

const RECEIVER_SELECT = {
  id: true,
  label: true,
  name: true,
  phone: true,
  email: true,
  address1: true,
  address2: true,
  city: true,
  state: true,
  zipCode: true,
  country: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class CustomerReceiverRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByCustomerId(customerId: string) {
    return this.prisma.customerReceiver.findMany({
      where: { customerId, deletedAt: null },
      select: RECEIVER_SELECT,
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
  }

  async findById(id: number) {
    return this.prisma.customerReceiver.findFirst({
      where: { id, deletedAt: null },
      select: { ...RECEIVER_SELECT, customerId: true },
    });
  }

  async create(data: {
    customerId: string;
    label?: string | null;
    name: string;
    phone?: string | null;
    email?: string | null;
    address1: string;
    address2?: string | null;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    isDefault?: boolean;
  }) {
    return this.prisma.customerReceiver.create({
      data,
      select: RECEIVER_SELECT,
    });
  }

  async update(
    id: number,
    data: {
      label?: string | null;
      name?: string;
      phone?: string | null;
      email?: string | null;
      address1?: string;
      address2?: string | null;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      isDefault?: boolean;
    },
  ) {
    return this.prisma.customerReceiver.update({
      where: { id },
      data,
      select: RECEIVER_SELECT,
    });
  }

  async softDelete(id: number) {
    return this.prisma.customerReceiver.update({
      where: { id },
      data: { deletedAt: new Date(), isDefault: false },
      select: { id: true },
    });
  }

  async resetDefault(customerId: string) {
    return this.prisma.customerReceiver.updateMany({
      where: { customerId, isDefault: true, deletedAt: null },
      data: { isDefault: false },
    });
  }
}
