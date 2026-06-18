import { WebhookRepository } from "@ecom/features/webhook/repositories/WebhookRepository";
import { WebhookService } from "@ecom/features/webhook/services/WebhookService";
import { prisma } from "@ecom/prisma";

let _webhookRepository: WebhookRepository | null = null;
let _webhookService: WebhookService | null = null;

export function getWebhookRepository(): WebhookRepository {
  if (!_webhookRepository) {
    _webhookRepository = new WebhookRepository(prisma);
  }
  return _webhookRepository;
}

export function getWebhookService(): WebhookService {
  if (!_webhookService) {
    _webhookService = new WebhookService({
      webhookRepo: getWebhookRepository(),
    });
  }
  return _webhookService;
}

export function resetWebhookContainers(): void {
  _webhookRepository = null;
  _webhookService = null;
}
