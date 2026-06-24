import type { ArgumentMetadata } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { I18nValidationException } from "../common/exceptions/i18n-validation.exception";
import { DynamicValidationPipe } from "../common/pipes/dynamic-validation.pipe";
import { CreateSubmissionDto } from "../modules/contacts/dto/create-submission.dto";

describe("DynamicValidationPipe", () => {
  const metadata: ArgumentMetadata = {
    type: "body",
    metatype: CreateSubmissionDto,
  };

  it("should validate and allow optional phone when group is default", async () => {
    const mockRequest = { validationGroups: ["default"] };
    const pipe = new DynamicValidationPipe(mockRequest, {
      whitelist: true,
      transform: true,
    });

    const payload = {
      name: "Tuan",
      email: "tuan@example.com",
      message: "Hello world",
    };

    const result = await pipe.transform(payload, metadata);
    expect(result.name).toBe("Tuan");
    expect(result.phone).toBeUndefined();
  });

  it("should fail validation and throw when phone is missing and group is vip", async () => {
    const mockRequest = { validationGroups: ["vip"] };
    const pipe = new DynamicValidationPipe(mockRequest, {
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => new I18nValidationException(errors),
    });

    const payload = {
      name: "Tuan",
      email: "tuan@example.com",
      message: "Hello world",
    };

    await expect(pipe.transform(payload, metadata)).rejects.toThrow(I18nValidationException);
  });

  it("should pass validation when phone is provided and group is vip", async () => {
    const mockRequest = { validationGroups: ["vip"] };
    const pipe = new DynamicValidationPipe(mockRequest, {
      whitelist: true,
      transform: true,
    });

    const payload = {
      name: "Tuan",
      email: "tuan@example.com",
      message: "Hello world",
      phone: "0123456789",
    };

    const result = await pipe.transform(payload, metadata);
    expect(result.phone).toBe("0123456789");
  });

  it("should resolve group vip dynamically from payload formSlug", async () => {
    const mockRequest = {}; // no groups set in guard
    const pipe = new DynamicValidationPipe(mockRequest, {
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => new I18nValidationException(errors),
    });

    const payload = {
      name: "Tuan",
      email: "tuan@example.com",
      message: "Hello world",
      formSlug: "vip",
    };

    await expect(pipe.transform(payload, metadata)).rejects.toThrow(I18nValidationException);
  });
});
