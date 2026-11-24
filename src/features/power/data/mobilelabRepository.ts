import { BackupPlan, PowerRepository } from "../domain/plan";
import { decodePlan, encodePlan } from "./planDto";

export type Transport = typeof fetch;

export class DataError extends Error {}

export class MobileLabPowerRepository implements PowerRepository {
  constructor(
    private readonly base: string,
    private readonly transport: Transport = fetch,
    private readonly timeoutMs = 7000,
  ) {}

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.transport(
        this.base.replace(/\/$/, "") + "/api/backup-plans" + path,
        { ...init, signal: controller.signal },
      );
      if (!response.ok) {
        throw new DataError(
          "MobileLab respondió HTTP " + response.status + ".",
        );
      }
      return response;
    } catch (error) {
      if (error instanceof DataError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new DataError("MobileLab tardó demasiado. Inténtalo otra vez.");
      }
      throw new DataError(
        "No se pudo conectar. Comprueba la URL y el proceso de MobileLab.",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async list(): Promise<BackupPlan[]> {
    const value: unknown = await (await this.request("")).json();
    if (!Array.isArray(value)) {
      throw new DataError("MobileLab devolvió una colección incompatible.");
    }
    try {
      return value.map(decodePlan);
    } catch (error) {
      throw new DataError(
        error instanceof Error
          ? "No se pudo leer un plan: " + error.message
          : "No se pudo leer un plan.",
      );
    }
  }

  async save(plan: BackupPlan): Promise<void> {
    await this.request("/" + encodeURIComponent(plan.id), {
      method: "PUT",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(encodePlan(plan)),
    });
  }

  async remove(id: string): Promise<void> {
    await this.request("/" + encodeURIComponent(id), { method: "DELETE" });
  }
}
