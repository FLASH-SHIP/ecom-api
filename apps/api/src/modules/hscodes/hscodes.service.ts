import { Injectable, NotFoundException } from "@nestjs/common";
import * as hsCodeFeatures from "@ecom/features/hscodes/hscode-service";

@Injectable()
export class HscodesService {
  async getTree() {
    return await hsCodeFeatures.getTree();
  }

  async getDetail(code: string) {
    try {
      return await hsCodeFeatures.getDetail(code);
    } catch (e: any) {
      throw new NotFoundException(e.message);
    }
  }

  async search(query: string) {
    return await hsCodeFeatures.search(query);
  }

  async getCountries() {
    return await hsCodeFeatures.getCountries();
  }

  async getTransportModes() {
    return await hsCodeFeatures.getTransportModes();
  }

  async calculate(
    code: string,
    value: number,
    mode: string,
    country?: string,
    entryDate?: string,
    loadingDate?: string
  ) {
    return await hsCodeFeatures.calculate(code, value, mode, country, entryDate, loadingDate);
  }
}
