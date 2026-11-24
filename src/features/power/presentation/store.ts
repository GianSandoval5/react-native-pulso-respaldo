import { BackupPlan, PowerRepository } from "../domain/plan";

export type PowerSnapshot = {
  plans: BackupPlan[];
  busy: boolean;
  error: string | null;
};

export class PowerStore {
  private state: PowerSnapshot = { plans: [], busy: false, error: null };
  private listeners = new Set<() => void>();

  constructor(private readonly repository: PowerRepository) {}

  snapshot = () => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private update(patch: Partial<PowerSnapshot>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private async run(action: () => Promise<void>): Promise<boolean> {
    if (this.state.busy) return false;
    this.update({ busy: true, error: null });
    try {
      await action();
      return true;
    } catch (error) {
      this.update({
        error:
          error instanceof Error ? error.message : "Error de almacenamiento.",
      });
      return false;
    } finally {
      this.update({ busy: false });
    }
  }

  refresh = () =>
    this.run(async () => {
      this.update({ plans: await this.repository.list() });
    });

  save = (plan: BackupPlan) =>
    this.run(async () => {
      await this.repository.save(plan);
      this.update({
        plans: [
          plan,
          ...this.state.plans.filter((item) => item.id !== plan.id),
        ],
      });
    });

  remove = (id: string) =>
    this.run(async () => {
      await this.repository.remove(id);
      this.update({
        plans: this.state.plans.filter((item) => item.id !== id),
      });
    });
}
