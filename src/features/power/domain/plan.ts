export type Device = {
  id: string;
  name: string;
  watts: number;
  hours: number;
  essential: boolean;
  enabled: boolean;
};

export type DrillResult = "ready" | "energy-risk" | "power-risk";

export type Drill = {
  id: string;
  at: string;
  energyWh: number;
  peakWatts: number;
  result: DrillResult;
};

export type BackupPlan = {
  id: string;
  name: string;
  batteryWh: number;
  maxWatts: number;
  reservePercent: number;
  devices: Device[];
  drills: Drill[];
};

export type PowerAnalysis = {
  usableWh: number;
  energyWh: number;
  peakWatts: number;
  remainingWh: number;
  result: DrillResult;
};

export interface PowerRepository {
  list(): Promise<BackupPlan[]>;
  save(plan: BackupPlan): Promise<void>;
  remove(id: string): Promise<void>;
}

const finite = (value: number) => Number.isFinite(value);

export function validateDevice(device: Device): Device {
  const name = device.name.trim();
  if (
    !device.id.trim() ||
    !name ||
    name.length > 70 ||
    !finite(device.watts) ||
    device.watts < 1 ||
    device.watts > 10000 ||
    !finite(device.hours) ||
    device.hours < 0.1 ||
    device.hours > 72
  ) {
    throw new Error(
      "Cada equipo necesita nombre, potencia de 1 a 10000 W y uso de 0.1 a 72 horas.",
    );
  }
  return { ...device, name };
}

export function validatePlan(plan: BackupPlan): BackupPlan {
  const name = plan.name.trim();
  if (
    !plan.id.trim() ||
    !name ||
    name.length > 70 ||
    !finite(plan.batteryWh) ||
    plan.batteryWh < 50 ||
    plan.batteryWh > 100000 ||
    !finite(plan.maxWatts) ||
    plan.maxWatts < 10 ||
    plan.maxWatts > 50000 ||
    !Number.isInteger(plan.reservePercent) ||
    plan.reservePercent < 0 ||
    plan.reservePercent > 50 ||
    plan.devices.length > 30
  ) {
    throw new Error(
      "Revisa el nombre, la batería, la potencia máxima y la reserva.",
    );
  }
  const devices = plan.devices.map(validateDevice);
  if (new Set(devices.map((item) => item.id)).size !== devices.length) {
    throw new Error("Hay equipos duplicados.");
  }
  return { ...plan, name, devices: [...devices], drills: [...plan.drills] };
}

export function analyze(plan: BackupPlan): PowerAnalysis {
  const checked = validatePlan(plan);
  const active = checked.devices.filter((device) => device.enabled);
  const usableWh = Math.round(
    checked.batteryWh * (1 - checked.reservePercent / 100),
  );
  const energyWh = Math.round(
    active.reduce((sum, device) => sum + device.watts * device.hours, 0),
  );
  const peakWatts = Math.round(
    active.reduce((sum, device) => sum + device.watts, 0),
  );
  const result: DrillResult =
    peakWatts > checked.maxWatts
      ? "power-risk"
      : energyWh > usableWh
        ? "energy-risk"
        : "ready";
  return {
    usableWh,
    energyWh,
    peakWatts,
    remainingWh: usableWh - energyWh,
    result,
  };
}

export function upsertDevice(plan: BackupPlan, device: Device): BackupPlan {
  const checked = validateDevice(device);
  return validatePlan({
    ...plan,
    devices: [
      ...plan.devices.filter((item) => item.id !== checked.id),
      checked,
    ],
  });
}

export function removeDevice(plan: BackupPlan, id: string): BackupPlan {
  return validatePlan({
    ...plan,
    devices: plan.devices.filter((item) => item.id !== id),
  });
}

export function toggleDevice(plan: BackupPlan, id: string): BackupPlan {
  if (!plan.devices.some((item) => item.id === id)) {
    throw new Error("El equipo ya no existe.");
  }
  return validatePlan({
    ...plan,
    devices: plan.devices.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item,
    ),
  });
}

export function recordDrill(
  plan: BackupPlan,
  at: Date,
  id: string,
): BackupPlan {
  const report = analyze(plan);
  const drill: Drill = {
    id,
    at: at.toISOString(),
    energyWh: report.energyWh,
    peakWatts: report.peakWatts,
    result: report.result,
  };
  return validatePlan({ ...plan, drills: [drill, ...plan.drills] });
}

export function resultLabel(result: DrillResult): string {
  if (result === "power-risk") return "Exceso de potencia";
  if (result === "energy-risk") return "Energía insuficiente";
  return "Plan viable";
}
