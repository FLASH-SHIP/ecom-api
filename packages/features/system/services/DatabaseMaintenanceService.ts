import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Writable } from "node:stream";
import { isDevDiagnosticsBypassEnabled } from "@ecom/lib";
import { verifyPassword } from "@ecom/lib/crypto";
import { ErrorWithCode } from "@ecom/lib/errors";
import { getRedisClient } from "@ecom/lib/redis";
import type { PrismaClient } from "@ecom/prisma";

export type MaintenanceAction =
  | "migrate-deploy"
  | "migrate-reset"
  | "migrate-status"
  | "db-push"
  | "validate"
  | "generate"
  | "seed";

export interface IDatabaseMaintenanceServiceDeps {
  prisma: PrismaClient;
}

export class DatabaseMaintenanceService {
  private prisma: PrismaClient;
  private readonly LOCK_KEY = "lock:database_maintenance";
  private readonly LOCK_TTL_SECONDS = 300; // 5 minutes

  constructor(deps: IDatabaseMaintenanceServiceDeps) {
    this.prisma = deps.prisma;
  }

  /**
   * Helper to locate the packages/prisma directory dynamically.
   */
  private getPrismaDir(): string {
    const paths = [
      join(process.cwd(), "packages/prisma"),
      join(process.cwd(), "../../packages/prisma"),
      join(__dirname, "../../../prisma"),
      join(__dirname, "../../../../packages/prisma"),
    ];

    for (const p of paths) {
      if (existsSync(join(p, "schema"))) {
        return p;
      }
    }
    throw ErrorWithCode.Factory.Internal(
      "Could not locate packages/prisma directory on the server",
    );
  }

  private stripAnsi(text: string): string {
    // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes require control characters
    const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
    return text.replace(ansiRegex, "");
  }

  /**
   * Masks sensitive credentials like passwords in connection URLs.
   */
  private maskSecrets(text: string): string {
    let masked = text.replace(/(postgres(?:ql)?:\/\/([^:]+):)([^@]+)(@)/g, "$1******$4");

    const key = process.env.SYSTEM_MAINTENANCE_KEY;
    if (key && key.length >= 8) {
      const escapedKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const keyRegex = new RegExp(escapedKey, "g");
      masked = masked.replace(keyRegex, "******");
    }
    return masked;
  }

  /**
   * Safely timing-safe compares the maintenance key.
   */
  private verifyMaintenanceKey(key?: string): void {
    if (isDevDiagnosticsBypassEnabled()) {
      return;
    }

    const envKey = process.env.SYSTEM_MAINTENANCE_KEY;
    if (!envKey) {
      throw ErrorWithCode.Factory.Forbidden(
        "SYSTEM_MAINTENANCE_KEY is not configured on the server. Command execution is disabled.",
      );
    }

    if (!key) {
      throw ErrorWithCode.Factory.Forbidden("Missing SYSTEM_MAINTENANCE_KEY");
    }

    const keyBuf = Buffer.from(key);
    const envKeyBuf = Buffer.from(envKey);

    if (keyBuf.length !== envKeyBuf.length || !crypto.timingSafeEqual(keyBuf, envKeyBuf)) {
      throw ErrorWithCode.Factory.Forbidden("Invalid SYSTEM_MAINTENANCE_KEY");
    }
  }

  /**
   * Executes the database maintenance command and streams logs in real-time.
   */
  async executeCommand(params: {
    action: MaintenanceAction;
    maintenanceKey?: string;
    sudoPassword?: string;
    seedOnly?: string;
    userId: string;
    username: string;
    writeStream: Writable;
  }): Promise<void> {
    const { action, maintenanceKey, sudoPassword, seedOnly, userId, username, writeStream } =
      params;

    // ── 1. Production Guard ──────────────────────────────────────────────────
    if (process.env.NODE_ENV === "production") {
      throw ErrorWithCode.Factory.Forbidden(
        "Database maintenance endpoints are strictly disabled on production environments.",
      );
    }

    // ── 2. Security Key Check ────────────────────────────────────────────────
    this.verifyMaintenanceKey(maintenanceKey);

    // ── 2b. Sudo Password Check ──────────────────────────────────────────────
    if (!isDevDiagnosticsBypassEnabled()) {
      if (!sudoPassword) {
        throw ErrorWithCode.Factory.InvalidCredentials("Missing sudoPassword");
      }
      const dbUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          password: {
            select: {
              hash: true,
            },
          },
        },
      });
      const hash = dbUser?.password?.hash;
      if (!hash) {
        throw ErrorWithCode.Factory.InvalidCredentials("User password hash not found");
      }
      const isPasswordValid = await verifyPassword(sudoPassword, hash);
      if (!isPasswordValid) {
        throw ErrorWithCode.Factory.InvalidCredentials("Invalid sudo password");
      }
    }

    // ── 3. Mutex Lock Check via Redis ────────────────────────────────────────
    const redis = getRedisClient();
    const lockAcquired = await redis.set(
      this.LOCK_KEY,
      username,
      "EX",
      this.LOCK_TTL_SECONDS,
      "NX",
    );

    if (!lockAcquired) {
      const activeUser = (await redis.get(this.LOCK_KEY)) || "another developer";
      throw ErrorWithCode.Factory.Conflict(
        `Database is currently undergoing maintenance by ${activeUser}. Please try again later.`,
      );
    }

    // ── 4. Determine CLI Command and Arguments ───────────────────────────────
    let cmd = "npx";
    let args: string[] = [];
    const cwd = this.getPrismaDir();
    const env = { ...process.env };

    switch (action) {
      case "migrate-deploy":
        args = ["prisma", "migrate", "deploy"];
        break;
      case "migrate-reset":
        args = ["prisma", "migrate", "reset", "--force"];
        break;
      case "migrate-status":
        args = ["prisma", "migrate", "status"];
        break;
      case "db-push":
        args = ["prisma", "db", "push", "--accept-data-loss"];
        break;
      case "validate":
        args = ["prisma", "validate"];
        break;
      case "generate":
        args = ["prisma", "generate"];
        break;
      case "seed":
        cmd = "npx";
        args = ["tsx", "seed.ts"];
        if (seedOnly) {
          // Strictly validate seedOnly name to prevent command/argument injection
          if (!/^[a-zA-Z0-9_-]+$/.test(seedOnly)) {
            throw ErrorWithCode.Factory.BadRequest("Invalid seedOnly name parameter");
          }
          env.SEED_ONLY = seedOnly;
        }
        break;
      default:
        throw ErrorWithCode.Factory.BadRequest(`Unsupported action: ${action}`);
    }

    writeStream.write(`▶ Running: ${cmd} ${args.join(" ")}\n`);
    writeStream.write(`🧑 Executed by: ${username}\n`);
    writeStream.write("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // ── 5. Spawn Process & Stream Outputs ────────────────────────────────────
    return new Promise<void>((resolve, reject) => {
      const child = spawn(cmd, args, {
        cwd,
        env,
        shell: false, // Security: avoid spawning a shell wrapper
      });

      const writeData = (data: Buffer) => {
        const clean = this.maskSecrets(this.stripAnsi(data.toString("utf8")));
        writeStream.write(clean);
      };

      child.stdout.on("data", writeData);
      child.stderr.on("data", writeData);

      child.on("error", async (err) => {
        writeStream.write(`\n❌ Failed to start child process: ${err.message}\n`);
        await redis.del(this.LOCK_KEY);
        reject(err);
      });

      child.on("close", async (code) => {
        writeStream.write("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        if (code === 0) {
          writeStream.write("🎉 Execution completed successfully.\n");
        } else {
          writeStream.write(`❌ Process exited with code ${code}\n`);
        }

        // Release the Redis Lock
        await redis.del(this.LOCK_KEY);
        resolve();
      });
    });
  }
}
