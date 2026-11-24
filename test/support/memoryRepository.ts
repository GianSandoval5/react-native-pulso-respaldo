import {
  BackupPlan,
  PowerRepository,
} from "../../src/features/power/domain/plan";

export class MemoryRepository implements PowerRepository {
  readonly rows = new Map<string, BackupPlan>();
  error: Error | null = null;
  pending: Promise<void> | null = null;

  constructor(plans: BackupPlan[] = []) {
    plans.forEach((plan) => this.rows.set(plan.id, plan));
  }

  private async before() {
    if (this.pending) await this.pending;
    if (this.error) throw this.error;
  }

  async list() {
    await this.before();
    return [...this.rows.values()];
  }

  async save(plan: BackupPlan) {
    await this.before();
    this.rows.set(plan.id, plan);
  }

  async remove(id: string) {
    await this.before();
    this.rows.delete(id);
  }
}
