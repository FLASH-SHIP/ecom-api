export interface NotificationEventConfig {
  type: string;
  target: "USER" | "CUSTOMER";
  category: "order" | "system" | "blog" | "account" | "wallet";
  labelKey: string; // i18n translation key
  descriptionKey: string; // i18n translation key
  channels: {
    inApp: { default: boolean; mandatory: boolean };
    push: { default: boolean; mandatory: boolean };
    email: { default: boolean; mandatory: boolean };
    webhook: { default: boolean; mandatory: boolean };
  };
}

export const NOTIFICATION_EVENTS: NotificationEventConfig[] = [
  // CUSTOMER EVENTS
  {
    type: "order.created",
    target: "CUSTOMER",
    category: "order",
    labelKey: "notifications.events.order_created.label",
    descriptionKey: "notifications.events.order_created.desc",
    channels: {
      inApp: { default: true, mandatory: true },
      push: { default: true, mandatory: false },
      email: { default: true, mandatory: false },
      webhook: { default: false, mandatory: false },
    },
  },
  {
    type: "order.status_updated",
    target: "CUSTOMER",
    category: "order",
    labelKey: "notifications.events.order_status.label",
    descriptionKey: "notifications.events.order_status.desc",
    channels: {
      inApp: { default: true, mandatory: true },
      push: { default: true, mandatory: false },
      email: { default: true, mandatory: false },
      webhook: { default: true, mandatory: false },
    },
  },
  {
    type: "order.checkpoint_added",
    target: "CUSTOMER",
    category: "order",
    labelKey: "notifications.events.order_checkpoint.label",
    descriptionKey: "notifications.events.order_checkpoint.desc",
    channels: {
      inApp: { default: true, mandatory: false },
      push: { default: true, mandatory: false },
      email: { default: false, mandatory: false },
      webhook: { default: true, mandatory: false },
    },
  },
  {
    type: "wallet.transaction",
    target: "CUSTOMER",
    category: "wallet",
    labelKey: "notifications.events.wallet_transaction.label",
    descriptionKey: "notifications.events.wallet_transaction.desc",
    channels: {
      inApp: { default: true, mandatory: true },
      push: { default: true, mandatory: false },
      email: { default: true, mandatory: false },
      webhook: { default: false, mandatory: false },
    },
  },
  {
    type: "promotion.new",
    target: "CUSTOMER",
    category: "blog",
    labelKey: "notifications.events.promotion.label",
    descriptionKey: "notifications.events.promotion.desc",
    channels: {
      inApp: { default: true, mandatory: false },
      push: { default: true, mandatory: false },
      email: { default: false, mandatory: false },
      webhook: { default: false, mandatory: false },
    },
  },

  // USER (STAFF/ADMIN) EVENTS
  {
    type: "webhook.deactivated",
    target: "USER",
    category: "system",
    labelKey: "notifications.events.webhook_deactivated.label",
    descriptionKey: "notifications.events.webhook_deactivated.desc",
    channels: {
      inApp: { default: true, mandatory: true },
      push: { default: false, mandatory: false },
      email: { default: true, mandatory: false },
      webhook: { default: false, mandatory: false },
    },
  },
  {
    type: "comment.created",
    target: "USER",
    category: "blog",
    labelKey: "notifications.events.comment_created.label",
    descriptionKey: "notifications.events.comment_created.desc",
    channels: {
      inApp: { default: true, mandatory: false },
      push: { default: false, mandatory: false },
      email: { default: false, mandatory: false },
      webhook: { default: false, mandatory: false },
    },
  },
  {
    type: "contact.submitted",
    target: "USER",
    category: "system",
    labelKey: "notifications.events.contact_submitted.label",
    descriptionKey: "notifications.events.contact_submitted.desc",
    channels: {
      inApp: { default: true, mandatory: false },
      push: { default: false, mandatory: false },
      email: { default: true, mandatory: false },
      webhook: { default: false, mandatory: false },
    },
  },
];
