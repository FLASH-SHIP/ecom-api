import { ContactRepository } from "@ecom/features/contact/repositories/ContactRepository";
import { ContactService } from "@ecom/features/contact/services/ContactService";
import { prisma } from "@ecom/prisma";

let _contactRepository: ContactRepository | null = null;
let _contactService: ContactService | null = null;

export function getContactRepository(): ContactRepository {
  if (!_contactRepository) {
    _contactRepository = new ContactRepository(prisma);
  }
  return _contactRepository;
}

export function getContactService(): ContactService {
  if (!_contactService) {
    _contactService = new ContactService({
      contactRepo: getContactRepository(),
    });
  }
  return _contactService;
}

export function resetContactContainers(): void {
  _contactRepository = null;
  _contactService = null;
}
