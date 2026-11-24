import {
  BackupPlan,
  Device,
  Drill,
  DrillResult,
  validatePlan,
} from "../domain/plan";

type Json = Record<string, unknown>;

const object = (value: unknown, label: string): Json => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + " inválido.");
  }
  return value as Json;
};

const text = (value: unknown, label: string): string => {
  if (typeof value !== "string") throw new Error(label + " inválido.");
  return value;
};

const number = (value: unknown, label: string): number => {
  if (typeof value !== "number") throw new Error(label + " inválido.");
  return value;
};

const bool = (value: unknown, label: string): boolean => {
  if (typeof value !== "boolean") throw new Error(label + " inválido.");
  return value;
};

const list = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(label + " inválido.");
  return value;
};

const readDevice = (value: unknown): Device => {
  const row = object(value, "Equipo");
  return {
    id: text(row.id, "ID del equipo"),
    name: text(row.name, "Nombre del equipo"),
    watts: number(row.watts, "Potencia"),
    hours: number(row.hours, "Horas"),
    essential: bool(row.essential, "Prioridad"),
    enabled: bool(row.enabled, "Selección"),
  };
};

const readDrill = (value: unknown): Drill => {
  const row = object(value, "Simulacro");
  const result = text(row.result, "Resultado");
  if (!["ready", "energy-risk", "power-risk"].includes(result)) {
    throw new Error("Resultado inválido.");
  }
  const at = text(row.at, "Fecha");
  if (Number.isNaN(Date.parse(at))) throw new Error("Fecha inválida.");
  return {
    id: text(row.id, "ID del simulacro"),
    at,
    energyWh: number(row.energyWh, "Energía del simulacro"),
    peakWatts: number(row.peakWatts, "Potencia del simulacro"),
    result: result as DrillResult,
  };
};

export function decodePlan(value: unknown): BackupPlan {
  const row = object(value, "Plan");
  return validatePlan({
    id: text(row.id, "ID"),
    name: text(row.name, "Nombre"),
    batteryWh: number(row.batteryWh, "Batería"),
    maxWatts: number(row.maxWatts, "Potencia máxima"),
    reservePercent: number(row.reservePercent, "Reserva"),
    devices: list(row.devices, "Equipos").map(readDevice),
    drills: list(row.drills ?? [], "Simulacros").map(readDrill),
  });
}

export function encodePlan(plan: BackupPlan): BackupPlan {
  return validatePlan(plan);
}
