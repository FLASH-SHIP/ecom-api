import type { ContactRepository } from "@ecom/features/contact/repositories/ContactRepository";
import { ErrorWithCode } from "@ecom/lib/errors";
import { createLogger } from "@ecom/lib/logger";

const log = createLogger("ContactService");

export interface IContactServiceDeps {
  contactRepo: ContactRepository;
}

type ContactStatus = "new" | "read" | "replied" | "archived";

export class ContactService {
  private deps: IContactServiceDeps;
  constructor(deps: IContactServiceDeps) {
    this.deps = deps;
  }

  async listSubmissions(options: {
    formSlug?: string;
    status?: ContactStatus;
    page?: number;
    perPage?: number;
  }) {
    return this.deps.contactRepo.findMany(options);
  }

  async getSubmission(id: number) {
    const submission = await this.deps.contactRepo.findById(id);
    if (!submission) throw ErrorWithCode.Factory.NotFound("Contact submission not found");

    if (submission.status === "new") {
      await this.deps.contactRepo.updateStatus(id, "read");
    }

    return submission;
  }

  async createSubmission(data: {
    formSlug?: string;
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
    metadata?: unknown;
    ipAddress?: string;
  }) {
    log.info("New contact submission", {
      formSlug: data.formSlug,
      email: data.email,
    });
    return this.deps.contactRepo.create(data);
  }

  async updateStatus(id: number, status: ContactStatus) {
    const submission = await this.deps.contactRepo.findById(id);
    if (!submission) throw ErrorWithCode.Factory.NotFound("Contact submission not found");
    return this.deps.contactRepo.updateStatus(id, status);
  }

  async assignTo(id: number, assigneeId: string) {
    const submission = await this.deps.contactRepo.findById(id);
    if (!submission) throw ErrorWithCode.Factory.NotFound("Contact submission not found");
    return this.deps.contactRepo.assignTo(id, assigneeId);
  }

  async markReplied(id: number) {
    const submission = await this.deps.contactRepo.findById(id);
    if (!submission) throw ErrorWithCode.Factory.NotFound("Contact submission not found");
    return this.deps.contactRepo.markReplied(id);
  }

  async deleteSubmission(id: number) {
    const submission = await this.deps.contactRepo.findById(id);
    if (!submission) throw ErrorWithCode.Factory.NotFound("Contact submission not found");
    return this.deps.contactRepo.remove(id);
  }

  async getStatusCounts() {
    return this.deps.contactRepo.countByStatus();
  }
}
