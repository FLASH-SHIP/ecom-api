import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { JobQueue } from "@ecom/features/queue/JobQueue";
import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { QueuesController } from "./queues.controller";
import { QueueAuthMiddleware } from "./queues.middleware";

@Module({
  controllers: [QueuesController],
})
export class QueuesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath("/api/v1/queues/dashboard");

    const queues = JobQueue.getQueues();
    createBullBoard({
      queues: queues.map((q) => new BullMQAdapter(q)),
      serverAdapter,
    });

    const router = serverAdapter.getRouter();

    consumer
      .apply(QueueAuthMiddleware, (req: Request, res: Response, next: NextFunction) => {
        const prefix = "/api/v1/queues/dashboard";
        if (req.url.startsWith(prefix)) {
          req.url = req.url.substring(prefix.length) || "/";
        }
        router(req, res, next);
      })
      .forRoutes({ path: "v1/queues/dashboard*path", method: RequestMethod.ALL });
  }
}
