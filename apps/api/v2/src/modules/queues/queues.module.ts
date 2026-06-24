import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { JobQueue } from "@ecom/features/queue/JobQueue";
import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from "@nestjs/common";
import { QueuesController } from "./queues.controller";
import { QueueAuthMiddleware } from "./queues.middleware";

@Module({
  controllers: [QueuesController],
})
export class QueuesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath("/api/v2/queues/dashboard");

    const queues = JobQueue.getQueues();
    createBullBoard({
      queues: queues.map((q) => new BullMQAdapter(q)),
      serverAdapter,
    });

    consumer
      .apply(QueueAuthMiddleware, serverAdapter.getRouter())
      .forRoutes({ path: "queues/dashboard*", method: RequestMethod.ALL });
  }
}
