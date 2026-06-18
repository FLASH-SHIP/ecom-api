import { prisma } from "@ecom/prisma";
import { BadRequestException, Body, Controller, Post, UnauthorizedException } from "@nestjs/common";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

@Controller("v2/member/auth")
export class MemberAuthController {
  @Post("register")
  async register(@Body() body: RegisterDto) {
    const existing = await prisma.member.findUnique({
      where: { email: body.email },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException("Email already registered");
    }

    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(body.password, 12);

    const member = await prisma.member.create({
      data: {
        email: body.email,
        name: body.name,
        hashedPassword,
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });

    const jwt = await import("jsonwebtoken");
    const secret = process.env.JWT_SECRET ?? "fallback-secret";
    const accessToken = jwt.sign({ sub: member.id, email: member.email }, secret, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign(
      { sub: member.id, email: member.email, type: "refresh" },
      secret,
      { expiresIn: "7d" },
    );

    return { member, accessToken, refreshToken };
  }

  @Post("login")
  async login(@Body() body: LoginDto) {
    const member = await prisma.member.findUnique({
      where: { email: body.email },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        hashedPassword: true,
        status: true,
      },
    });

    if (!member?.hashedPassword) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (member.status !== "ACTIVE") {
      throw new UnauthorizedException("Account is not active");
    }

    const bcrypt = await import("bcryptjs");
    const isValid = await bcrypt.compare(body.password, member.hashedPassword);
    if (!isValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    await prisma.member.update({
      where: { id: member.id },
      data: { lastLoginAt: new Date() },
    });

    const jwt = await import("jsonwebtoken");
    const secret = process.env.JWT_SECRET ?? "fallback-secret";
    const accessToken = jwt.sign({ sub: member.id, email: member.email }, secret, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign(
      { sub: member.id, email: member.email, type: "refresh" },
      secret,
      { expiresIn: "7d" },
    );

    return {
      member: {
        id: member.id,
        email: member.email,
        name: member.name,
        avatarUrl: member.avatarUrl,
      },
      accessToken,
      refreshToken,
    };
  }

  @Post("refresh")
  async refreshToken(@Body() body: RefreshTokenDto) {
    const jwt = await import("jsonwebtoken");
    const secret = process.env.JWT_SECRET ?? "fallback-secret";

    try {
      const payload = jwt.verify(body.refreshToken, secret) as unknown as {
        sub: number;
        email: string;
      };
      const accessToken = jwt.sign({ sub: payload.sub, email: payload.email }, secret, {
        expiresIn: "15m",
      });
      const refreshToken = jwt.sign(
        { sub: payload.sub, email: payload.email, type: "refresh" },
        secret,
        { expiresIn: "7d" },
      );

      return { accessToken, refreshToken };
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }
}
