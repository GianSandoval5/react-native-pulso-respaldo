import { BackupPlan } from "../../src/features/power/domain/plan";
import { PowerStore } from "../../src/features/power/presentation/store";
import { MemoryRepository } from "../support/memoryRepository";

const plan: BackupPlan = {
  id: "home",
  name: "Casa",
  batteryWh: 1000,
  maxWatts: 500,
  reservePercent: 10,
  devices: [],
  drills: [],
};

describe("estado observable", () => {
  it("carga, guarda, reemplaza y elimina después de confirmar el repositorio", async () => {
    const repository = new MemoryRepository([plan]);
    const store = new PowerStore(repository);
    const busy: boolean[] = [];
    store.subscribe(() => busy.push(store.snapshot().busy));
    expect(await store.refresh()).toBe(true);
    expect(store.snapshot().plans).toEqual([plan]);
    expect(busy[0]).toBe(true);
    expect(busy.at(-1)).toBe(false);

    const edited = { ...plan, name: "Casa editada" };
    expect(await store.save(edited)).toBe(true);
    expect(store.snapshot().plans).toEqual([edited]);
    expect(await store.remove(plan.id)).toBe(true);
    expect(store.snapshot().plans).toEqual([]);
  });

  it("conserva la copia confirmada y permite recuperar un error", async () => {
    const repository = new MemoryRepository([plan]);
    const store = new PowerStore(repository);
    await store.refresh();
    repository.error = new Error("Fallo simulado");
    expect(await store.save({ ...plan, name: "No guardado" })).toBe(false);
    expect(store.snapshot().plans[0].name).toBe("Casa");
    expect(store.snapshot().error).toBe("Fallo simulado");
    repository.error = null;
    expect(await store.save({ ...plan, name: "Recuperado" })).toBe(true);
    expect(store.snapshot().error).toBeNull();
  });

  it("ignora una operación superpuesta", async () => {
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const repository = new MemoryRepository([plan]);
    repository.pending = pending;
    const store = new PowerStore(repository);
    const first = store.refresh();
    expect(store.snapshot().busy).toBe(true);
    expect(await store.remove("home")).toBe(false);
    release();
    await first;
    expect(store.snapshot().busy).toBe(false);
  });
});
