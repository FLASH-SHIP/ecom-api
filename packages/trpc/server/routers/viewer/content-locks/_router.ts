import { router } from "../../../trpc";
import { acquireLock, checkLock, heartbeat, releaseLock } from "./procedures/contentLock.handler";

export const contentLocksRouter = router({
  acquire: acquireLock,
  release: releaseLock,
  check: checkLock,
  heartbeat,
});
