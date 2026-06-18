import { router } from "@ecom/trpc/server/trpc";
import {
  deleteNotification,
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
} from "./procedures/notifications.handler";

export const notificationsRouter = router({
  list: listNotifications,
  unreadCount,
  markRead,
  markAllRead,
  delete: deleteNotification,
});
