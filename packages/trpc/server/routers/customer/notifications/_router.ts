import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  deleteNotification,
  getPreferences,
  listNotifications,
  markAllRead,
  markRead,
  registerToken,
  unreadCount,
  unregisterToken,
  updatePreference,
} from "./procedures/notifications.handler";

export const customerNotificationsRouter = router({
  list: listNotifications,
  unreadCount,
  markRead,
  markAllRead,
  delete: deleteNotification,
  registerToken,
  unregisterToken,
  getPreferences,
  updatePreference,
});

export type CustomerNotificationsRouter = typeof customerNotificationsRouter;
