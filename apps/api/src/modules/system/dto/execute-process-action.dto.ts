import { IsEnum, IsNotEmpty, IsString } from "class-validator";

export class ExecuteProcessActionDto {
  @IsEnum(["restart", "stop", "reload"])
  @IsNotEmpty()
  action!: "restart" | "stop" | "reload";

  @IsString()
  @IsNotEmpty()
  target!: string;

  @IsString()
  @IsNotEmpty()
  sudoPassword!: string;

  @IsString()
  @IsNotEmpty()
  maintenanceKey!: string;
}
