import { describe, expect, it } from "vitest";
import { TaskScheduler } from "../TaskScheduler";

describe("TaskScheduler", () => {
  describe("task registration", () => {
    it("should register a task with fluent API", () => {
      const scheduler = new TaskScheduler();

      scheduler
        .task("Test Task")
        .cron("0 2 * * *")
        .handle(async () => {});

      const tasks = scheduler.getRegisteredTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].name).toBe("Test Task");
      expect(tasks[0].cronExpression).toBe("0 2 * * *");
      expect(tasks[0].enabled).toBe(true);
    });

    it("should register multiple tasks", () => {
      const scheduler = new TaskScheduler();

      scheduler
        .task("Task 1")
        .cron("0 * * * *")
        .handle(async () => {});
      scheduler
        .task("Task 2")
        .cron("30 * * * *")
        .handle(async () => {});
      scheduler
        .task("Task 3")
        .cron("0 0 * * *")
        .handle(async () => {});

      expect(scheduler.getRegisteredTasks()).toHaveLength(3);
    });

    it("should support disabling a task", () => {
      const scheduler = new TaskScheduler();

      scheduler
        .task("Disabled Task")
        .cron("0 * * * *")
        .handle(async () => {})
        .disable();

      const tasks = scheduler.getRegisteredTasks();
      expect(tasks[0].enabled).toBe(false);
    });
  });

  describe("cron matching", () => {
    it("should match wildcard (*)", () => {
      const scheduler = new TaskScheduler();
      // Access private method for testing
      const shouldRun = (
        scheduler as unknown as { shouldRun: (expr: string, date: Date) => boolean }
      ).shouldRun;

      // Bind to scheduler instance
      const check = shouldRun.bind(scheduler);

      const date = new Date(2026, 0, 15, 10, 30); // Jan 15, 2026, 10:30, Thursday
      expect(check("* * * * *", date)).toBe(true);
      expect(check("30 10 * * *", date)).toBe(true);
      expect(check("30 10 15 1 *", date)).toBe(true);
    });

    it("should match step values", () => {
      const scheduler = new TaskScheduler();
      const check = (
        scheduler as unknown as { shouldRun: (expr: string, date: Date) => boolean }
      ).shouldRun.bind(scheduler);

      const date = new Date(2026, 0, 1, 0, 0); // minute=0
      expect(check("*/5 * * * *", date)).toBe(true); // 0 % 5 === 0

      const date2 = new Date(2026, 0, 1, 0, 7); // minute=7
      expect(check("*/5 * * * *", date2)).toBe(false); // 7 % 5 !== 0
    });

    it("should match comma-separated values", () => {
      const scheduler = new TaskScheduler();
      const check = (
        scheduler as unknown as { shouldRun: (expr: string, date: Date) => boolean }
      ).shouldRun.bind(scheduler);

      const date = new Date(2026, 0, 1, 0, 15);
      expect(check("0,15,30,45 * * * *", date)).toBe(true);

      const date2 = new Date(2026, 0, 1, 0, 20);
      expect(check("0,15,30,45 * * * *", date2)).toBe(false);
    });

    it("should match ranges", () => {
      const scheduler = new TaskScheduler();
      const check = (
        scheduler as unknown as { shouldRun: (expr: string, date: Date) => boolean }
      ).shouldRun.bind(scheduler);

      const date = new Date(2026, 0, 1, 9, 0); // hour=9
      expect(check("0 9-17 * * *", date)).toBe(true); // within 9-17

      const date2 = new Date(2026, 0, 1, 5, 0); // hour=5
      expect(check("0 9-17 * * *", date2)).toBe(false); // outside 9-17
    });

    it("should reject invalid expressions", () => {
      const scheduler = new TaskScheduler();
      const check = (
        scheduler as unknown as { shouldRun: (expr: string, date: Date) => boolean }
      ).shouldRun.bind(scheduler);

      expect(check("invalid", new Date())).toBe(false);
      expect(check("* * *", new Date())).toBe(false); // only 3 fields
    });
  });

  describe("start/stop", () => {
    it("should start and stop without errors", () => {
      const scheduler = new TaskScheduler();
      scheduler
        .task("Test")
        .cron("0 0 31 2 *")
        .handle(async () => {}); // Never matches

      scheduler.start(60000);
      scheduler.stop();
    });

    it("should not start twice", () => {
      const scheduler = new TaskScheduler();
      scheduler
        .task("Test")
        .cron("0 0 31 2 *")
        .handle(async () => {});

      scheduler.start(60000);
      scheduler.start(60000); // Should be no-op
      scheduler.stop();
    });
  });
});
