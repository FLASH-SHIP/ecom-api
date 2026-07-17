import { IsArray, IsOptional, IsString, IsUrl } from "class-validator";

export class CreateCustomerWebhookDto {
  @IsString()
  name!: string;

  @IsUrl({}, { message: "URL webhook phải hợp lệ" })
  url!: string;

  @IsArray()
  @IsString({ each: true })
  events!: string[];

  @IsOptional()
  @IsString()
  apiVersion?: string;
}
