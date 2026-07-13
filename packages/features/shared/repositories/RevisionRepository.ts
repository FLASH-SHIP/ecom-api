import type { PrismaClient } from "@ecom/prisma";

export class RevisionRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByReference(referenceId: number, referenceType: string) {
    return this.prisma.revision.findMany({
      where: { referenceId, referenceType },
      select: {
        id: true,
        title: true,
        note: true,
        authorId: true,
        author: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async findById(id: number) {
    return this.prisma.revision.findUnique({
      where: { id },
      select: {
        id: true,
        referenceId: true,
        referenceType: true,
        title: true,
        content: true,
        note: true,
        authorId: true,
        author: { select: { id: true, name: true } },
        createdAt: true,
      },
    });
  }

  async create(data: {
    referenceId: number;
    referenceType: string;
    title: string;
    content?: string;
    authorId: string;
    note?: string;
  }) {
    return this.prisma.revision.create({
      data,
      select: { id: true, createdAt: true },
    });
  }
}
