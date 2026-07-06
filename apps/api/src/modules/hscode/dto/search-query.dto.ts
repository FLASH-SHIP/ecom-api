import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class SearchQueryDto {
  @ApiProperty({
    description: "Commodity description or code to search",
    example: "bovine",
  })
  @IsNotEmpty()
  @IsString()
  query!: string;
}
