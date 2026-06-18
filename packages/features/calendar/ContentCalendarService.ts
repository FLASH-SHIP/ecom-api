import { createLogger } from "@ecom/lib/logger";

const log = createLogger("ContentCalendar");

export interface CalendarEntry {
  id: number;
  title: string;
  slug: string;
  type: "post" | "page";
  status: string;
  authorName: string | null;
  date: Date;
  dateType: "published" | "scheduled" | "expires";
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  entries: CalendarEntry[];
}

interface ICalendarDeps {
  findPostsByDateRange: (
    start: Date,
    end: Date,
  ) => Promise<
    {
      id: number;
      title: string;
      slug: string;
      status: string;
      authorName: string | null;
      publishedAt: Date | null;
      scheduledAt: Date | null;
      expiresAt: Date | null;
    }[]
  >;
}

/**
 * Content Calendar service — provides a calendar view of content events.
 *
 * Shows published, scheduled, and expiring content on a timeline.
 * Inspired by CoSchedule and WordPress Editorial Calendar.
 */
export class ContentCalendarService {
  private deps: ICalendarDeps;
  constructor(deps: ICalendarDeps) {
    this.deps = deps;
  }

  /**
   * Get calendar entries for a date range.
   */
  async getCalendar(start: Date, end: Date): Promise<CalendarDay[]> {
    const posts = await this.deps.findPostsByDateRange(start, end);

    const dayMap = new Map<string, CalendarEntry[]>();

    for (const post of posts) {
      if (post.publishedAt && post.publishedAt >= start && post.publishedAt <= end) {
        this.addToDay(dayMap, post.publishedAt, {
          id: post.id,
          title: post.title,
          slug: post.slug,
          type: "post",
          status: post.status,
          authorName: post.authorName,
          date: post.publishedAt,
          dateType: "published",
        });
      }

      if (post.scheduledAt && post.scheduledAt >= start && post.scheduledAt <= end) {
        this.addToDay(dayMap, post.scheduledAt, {
          id: post.id,
          title: post.title,
          slug: post.slug,
          type: "post",
          status: post.status,
          authorName: post.authorName,
          date: post.scheduledAt,
          dateType: "scheduled",
        });
      }

      if (post.expiresAt && post.expiresAt >= start && post.expiresAt <= end) {
        this.addToDay(dayMap, post.expiresAt, {
          id: post.id,
          title: post.title,
          slug: post.slug,
          type: "post",
          status: post.status,
          authorName: post.authorName,
          date: post.expiresAt,
          dateType: "expires",
        });
      }
    }

    // Sort by date
    const days: CalendarDay[] = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entries]) => ({ date, entries }));

    log.info(
      `Calendar: ${days.length} days with entries for ${start.toISOString()} – ${end.toISOString()}`,
    );
    return days;
  }

  /**
   * Get entries for a specific month.
   */
  async getMonthCalendar(year: number, month: number): Promise<CalendarDay[]> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    return this.getCalendar(start, end);
  }

  private addToDay(map: Map<string, CalendarEntry[]>, date: Date, entry: CalendarEntry): void {
    const key = date.toISOString().slice(0, 10);
    const existing = map.get(key) ?? [];
    existing.push(entry);
    map.set(key, existing);
  }
}
