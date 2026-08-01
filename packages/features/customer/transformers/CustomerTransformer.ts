import { BaseTransformer } from "@flash-ship/ecom-lib";

export interface CustomerResponseDto {
  id: string;
  customerCode: string | null;
  email: string;
  username: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  emailVerified: string | null;
  dob: string | null;
  gender: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
  group?: {
    id: number;
    name: string;
    code: string;
  } | null;
}

export interface CustomerInput {
  id: string;
  customerCode?: string | null;
  email?: string;
  username?: string | null;
  name?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  status?: string;
  emailVerified?: Date | string | null;
  dob?: Date | string | null;
  gender?: string | null;
  description?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string | null;
  group?: {
    id: number;
    name: string;
    code: string;
  } | null;
}

export class CustomerTransformer extends BaseTransformer<CustomerInput, CustomerResponseDto> {
  transform(customer: CustomerInput): CustomerResponseDto {
    return {
      id: customer.id,
      customerCode: customer.customerCode ?? null,
      email: customer.email ?? "",
      username: customer.username ?? "",
      name: customer.name ?? null,
      phone: customer.phone ?? null,
      avatarUrl: customer.avatarUrl ?? null,
      status: customer.status ?? "ACTIVE",
      emailVerified: this.formatDate(customer.emailVerified),
      dob: this.formatDate(customer.dob),
      gender: customer.gender ?? null,
      description: customer.description ?? null,
      createdAt: this.formatDate(customer.createdAt) ?? new Date().toISOString(),
      updatedAt: this.formatDate(customer.updatedAt),
      group: customer.group
        ? {
            id: customer.group.id,
            name: customer.group.name,
            code: customer.group.code,
          }
        : null,
    };
  }

  private formatDate(date?: Date | string | null): string | null {
    if (!date) return null;
    return date instanceof Date ? date.toISOString() : date;
  }
}
