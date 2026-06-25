import { prisma } from "@ecom/prisma";
import { Injectable } from "@nestjs/common";
import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ name: "IsUnique", async: true })
@Injectable()
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
    const [modelName, columnName] = args.constraints;
    if (value === undefined || value === null || value === "") return true;

    try {
      const db = prisma as unknown as Record<
        string,
        {
          findFirst: (args: {
            where: Record<string, unknown>;
            select: { id: true };
          }) => Promise<Record<string, unknown> | null>;
        }
      >;
      if (typeof db[modelName]?.findFirst !== "function") {
        return false;
      }

      const record = await db[modelName].findFirst({
        where: { [columnName]: value },
        select: { id: true },
      });

      return !record;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    const [modelName, columnName] = args.constraints;
    return `The ${columnName} is already taken in ${modelName}.`;
  }
}

export function IsUnique(model: string, column: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [model, column],
      validator: IsUniqueConstraint,
    });
  };
}
