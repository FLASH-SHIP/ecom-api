import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class ListRatesQueryDto {
  @ApiProperty({
    description: "4-digit HS heading code",
    example: "0102",
    minLength: 4,
    maxLength: 4,
  })
  @IsNotEmpty()
  @IsString()
  @Length(4, 4)
  code!: string;
}
