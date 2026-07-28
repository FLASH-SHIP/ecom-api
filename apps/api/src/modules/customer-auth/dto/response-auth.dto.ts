import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CustomerProfileDto {
  @ApiProperty({ type: String, example: "cust_123456789" })
  id!: string;

  @ApiProperty({ type: String, example: "customer@example.com" })
  email!: string;

  @ApiProperty({ type: String, example: "ACTIVE" })
  status!: string;

  @ApiPropertyOptional({ type: String, example: "John Doe", nullable: true })
  fullName?: string | null;

  @ApiPropertyOptional({ type: String, example: "+84900000000", nullable: true })
  phone?: string | null;

  @ApiPropertyOptional({ type: String, example: "1995-05-15", nullable: true })
  dob?: string | null;

  @ApiPropertyOptional({ type: String, example: "MALE", nullable: true })
  gender?: string | null;

  @ApiPropertyOptional({ type: String, example: "VIP Customer Account", nullable: true })
  description?: string | null;

  @ApiProperty({ type: String, example: "2026-07-25T10:00:00.000Z" })
  createdAt!: string;
}

export class CustomerProfileResponseDto {
  @ApiProperty({ type: () => CustomerProfileDto })
  data!: CustomerProfileDto;
}

export class TokenPairDto {
  @ApiProperty({ type: String, example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  accessToken!: string;

  @ApiProperty({ type: String, example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  refreshToken!: string;

  @ApiProperty({ type: Number, example: 900 })
  expiresIn!: number;
}

export class CustomerAuthDataDto extends TokenPairDto {
  @ApiProperty({ type: Object, example: { id: "cust_123", email: "cust@example.com", name: "John Doe", tokenVersion: 1 } })
  user!: { id: string; email: string; name: string; tokenVersion?: number };

  @ApiProperty({ type: () => CustomerProfileDto })
  customer!: CustomerProfileDto;
}

export class CustomerAuthResponseDto {
  @ApiProperty({ type: () => CustomerAuthDataDto })
  data!: CustomerAuthDataDto;
}

export class TokenPairResponseDto {
  @ApiProperty({ type: () => TokenPairDto })
  data!: TokenPairDto;
}

export class GenericSuccessResponseDto {
  @ApiProperty({ type: Object, example: { success: true } })
  data!: { success: boolean };
}

export class GenericMessageResponseDto {
  @ApiProperty({ type: Object, example: { message: "Operation completed successfully." } })
  data!: { message: string };
}
