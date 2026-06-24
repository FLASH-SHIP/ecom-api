import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf } from "class-validator";

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsNumber()
  postId?: number;

  @IsOptional()
  @IsNumber()
  pageId?: number;

  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsString()
  authorEmail?: string;

  @IsOptional()
  @IsNumber()
  parentId?: number;

  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ValidateIf((o: CreateCommentDto) => !o.postId && !o.pageId)
  @IsNotEmpty({ message: "Either postId or pageId is required" })
  _requireTarget?: never;
}
