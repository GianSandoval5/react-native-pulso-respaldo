import {
  analyze,
  BackupPlan,
  recordDrill,
  removeDevice,
  resultLabel,
  toggleDevice,
  upsertDevice,
  validateDevice,
  validatePlan,
} from "../../src/features/power/domain/plan";

const plan = (patch: Partial<BackupPlan> = {}): BackupPlan => ({
  id: "home",
  name: "Casa",
  batteryWh: 1000,
  maxWatts: 500,
  reservePercent: 20,
  devices: [],
  drills: [],
  ...patch,
});

describe("reglas del plan de respaldo", () => {
  it("separa capacidad útil, energía y potencia simultánea", () => {
    const report = analyze(
      plan({
        devices: [
          {
            id: "router",
            name: " Router ",
            watts: 20,
            hours: 5,
            essential: true,
            enabled: true,
          },
          {
            id: "laptop",
            name: "Laptop",
            watts: 100,
            hours: 4,
            essential: true,
            enabled: true,
          },
          {
            id: "lamp",
            name: "Lámpara",
            watts: 10,
            hours: 6,
            essential: false,
            enabled: false,
          },
        ],
      }),
    );
    expect(report).toEqual({
      usableWh: 800,
      energyWh: 500,
      peakWatts: 120,
      remainingWh: 300,
      result: "ready",
    });
  });

  it("prioriza el riesgo de potencia y distingue el riesgo de energía", () => {
    const load = {
      id: "heater",
      name: "Carga",
      watts: 600,
      hours: 2,
      essential: false,
      enabled: true,
    };
    expect(analyze(plan({ devices: [load] })).result).toBe("power-risk");
    expect(analyze(plan({ maxWatts: 1000, devices: [load] })).result).toBe(
      "energy-risk",
    );
    expect(resultLabel("power-risk")).toBe("Exceso de potencia");
    expect(resultLabel("energy-risk")).toBe("Energía insuficiente");
    expect(resultLabel("ready")).toBe("Plan viable");
  });

  it("administra equipos sin mutar el plan de entrada", () => {
    const base = plan();
    const changed = upsertDevice(base, {
      id: "router",
      name: "Router",
      watts: 18,
      hours: 6,
      essential: true,
      enabled: true,
    });
    expect(base.devices).toHaveLength(0);
    expect(toggleDevice(changed, "router").devices[0].enabled).toBe(false);
    expect(removeDevice(changed, "router").devices).toHaveLength(0);
    expect(() => toggleDevice(changed, "missing")).toThrow(
      "El equipo ya no existe.",
    );
  });

  it("el simulacro conserva los totales aunque el plan cambie", () => {
    const withLoad = upsertDevice(plan(), {
      id: "router",
      name: "Router",
      watts: 18,
      hours: 6,
      essential: true,
      enabled: true,
    });
    const recorded = recordDrill(
      withLoad,
      new Date("2026-11-24T14:00:00Z"),
      "drill-1",
    );
    const edited = validatePlan({
      ...recorded,
      devices: [{ ...recorded.devices[0], hours: 2 }],
    });
    expect(recorded.drills[0]).toMatchObject({
      id: "drill-1",
      at: "2026-11-24T14:00:00.000Z",
      energyWh: 108,
      peakWatts: 18,
      result: "ready",
    });
    expect(analyze(edited).energyWh).toBe(36);
    expect(edited.drills[0].energyWh).toBe(108);
  });

  it("rechaza magnitudes, textos e identificadores fuera del contrato", () => {
    expect(() => validatePlan(plan({ name: " " }))).toThrow();
    expect(() => validatePlan(plan({ batteryWh: 49 }))).toThrow();
    expect(() => validatePlan(plan({ maxWatts: 0 }))).toThrow();
    expect(() => validatePlan(plan({ reservePercent: 51 }))).toThrow();
    expect(() =>
      validateDevice({
        id: "x",
        name: "Carga",
        watts: 10,
        hours: 0,
        essential: false,
        enabled: true,
      }),
    ).toThrow();
    expect(() =>
      validatePlan(
        plan({
          devices: [
            {
              id: "x",
              name: "Uno",
              watts: 10,
              hours: 1,
              essential: false,
              enabled: true,
            },
            {
              id: "x",
              name: "Dos",
              watts: 10,
              hours: 1,
              essential: false,
              enabled: true,
            },
          ],
        }),
      ),
    ).toThrow("duplicados");
  });
});
