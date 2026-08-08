import { describe, expect, it, vi } from "vitest";
import { JobQueue } from "../../JobQueue";
import {
  queueRateCardJob,
  RATECARD_QUEUE,
  registerRateCardWorker,
} from "../rateCardWorker";

vi.mock("../../di/containers/ShippingRateService", () => ({
  getRateCardService: () => ({
    archiveSupersededDefaultRateCards: vi
      .fn()
      .mockResolvedValue({ archivedCount: 1, archivedIds: [101] }),
  }),
}));

describe("rateCardWorker", () => {
  it("should register the worker with JobQueue", () => {
    const registerSpy = vi.spyOn(JobQueue, "register");
    registerRateCardWorker();
    expect(registerSpy).toHaveBeenCalledWith(
      RATECARD_QUEUE,
      expect.any(Function),
      3,
    );
  });

  it("should queue repeatable rate card job if queue exists", async () => {
    const mockAdd = vi.fn().mockResolvedValue({});
    vi.spyOn(JobQueue, "getQueues").mockReturnValue([
      { name: RATECARD_QUEUE, add: mockAdd } as any,
    ]);

    await queueRateCardJob();

    expect(mockAdd).toHaveBeenCalledWith(
      "hourly-ratecard-archive",
      {},
      {
        repeat: {
          pattern: "0 * * * *",
        },
        jobId: "repeatable-ratecard-archive",
      },
    );
  });
});
