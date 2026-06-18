import { describe, expect, it, vi } from "vitest";
import { ContentCalendarService } from "../ContentCalendarService";

function createMockDeps() {
  return {
    findPostsByDateRange: vi.fn().mockResolvedValue([]),
  };
}

describe("ContentCalendarService", () => {
  it("should return empty calendar for empty data", async () => {
    const deps = createMockDeps();
    const service = new ContentCalendarService(deps);
    const result = await service.getCalendar(new Date("2024-01-01"), new Date("2024-01-31"));
    expect(result).toEqual([]);
  });

  it("should group entries by date", async () => {
    const deps = createMockDeps();
    deps.findPostsByDateRange.mockResolvedValue([
      {
        id: 1,
        title: "Post A",
        slug: "post-a",
        status: "PUBLISHED",
        authorName: "Author",
        publishedAt: new Date("2024-06-15T10:00:00Z"),
        scheduledAt: null,
        expiresAt: null,
      },
      {
        id: 2,
        title: "Post B",
        slug: "post-b",
        status: "PUBLISHED",
        authorName: "Author",
        publishedAt: new Date("2024-06-15T14:00:00Z"),
        scheduledAt: null,
        expiresAt: null,
      },
    ]);

    const service = new ContentCalendarService(deps);
    const result = await service.getCalendar(new Date("2024-06-01"), new Date("2024-06-30"));

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2024-06-15");
    expect(result[0].entries).toHaveLength(2);
  });

  it("should include scheduled and expiring entries", async () => {
    const deps = createMockDeps();
    deps.findPostsByDateRange.mockResolvedValue([
      {
        id: 1,
        title: "Scheduled",
        slug: "scheduled",
        status: "DRAFT",
        authorName: "Author",
        publishedAt: null,
        scheduledAt: new Date("2024-06-20T08:00:00Z"),
        expiresAt: new Date("2024-06-25T08:00:00Z"),
      },
    ]);

    const service = new ContentCalendarService(deps);
    const result = await service.getCalendar(new Date("2024-06-01"), new Date("2024-06-30"));

    expect(result).toHaveLength(2); // Two different dates
    const scheduledDay = result.find((d) => d.date === "2024-06-20");
    const expiresDay = result.find((d) => d.date === "2024-06-25");
    expect(scheduledDay?.entries[0].dateType).toBe("scheduled");
    expect(expiresDay?.entries[0].dateType).toBe("expires");
  });

  it("should sort days chronologically", async () => {
    const deps = createMockDeps();
    deps.findPostsByDateRange.mockResolvedValue([
      {
        id: 2,
        title: "Later",
        slug: "later",
        status: "PUBLISHED",
        authorName: "A",
        publishedAt: new Date("2024-06-20T10:00:00Z"),
        scheduledAt: null,
        expiresAt: null,
      },
      {
        id: 1,
        title: "Earlier",
        slug: "earlier",
        status: "PUBLISHED",
        authorName: "A",
        publishedAt: new Date("2024-06-10T10:00:00Z"),
        scheduledAt: null,
        expiresAt: null,
      },
    ]);

    const service = new ContentCalendarService(deps);
    const result = await service.getCalendar(new Date("2024-06-01"), new Date("2024-06-30"));

    expect(result[0].date).toBe("2024-06-10");
    expect(result[1].date).toBe("2024-06-20");
  });

  it("should support getMonthCalendar helper", async () => {
    const deps = createMockDeps();
    const service = new ContentCalendarService(deps);

    await service.getMonthCalendar(2024, 6);
    expect(deps.findPostsByDateRange).toHaveBeenCalledWith(new Date(2024, 5, 1), expect.any(Date));
  });
});
