import {
  DataError,
  MobileLabPowerRepository,
  Transport,
} from "../../src/features/power/data/mobilelabRepository";
import { decodePlan, encodePlan } from "../../src/features/power/data/planDto";
import { BackupPlan } from "../../src/features/power/domain/plan";

const fixture: BackupPlan = {
  id: "plan con espacio",
  name: "Conectividad",
  batteryWh: 800,
  maxWatts: 500,
  reservePercent: 10,
  devices: [
    {
      id: "router",
      name: "Router",
      watts: 18,
      hours: 4,
      essential: true,
      enabled: true,
    },
  ],
  drills: [],
};

const response = (value: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
  }) as Response;

describe("DTO y adaptador HTTP", () => {
  it("serializa y reconstruye un plan con equipos y documentos anteriores", () => {
    expect(decodePlan(encodePlan(fixture))).toEqual(fixture);
    const legacy = { ...fixture } as Record<string, unknown>;
    delete legacy.drills;
    expect(decodePlan(legacy).drills).toEqual([]);
  });

  it("rechaza documentos incompletos, fechas y resultados desconocidos", () => {
    expect(() => decodePlan(null)).toThrow("Plan inválido");
    expect(() => decodePlan({ id: "x" })).toThrow();
    expect(() =>
      decodePlan({
        ...fixture,
        drills: [
          {
            id: "d",
            at: "ayer",
            energyWh: 1,
            peakWatts: 1,
            result: "ready",
          },
        ],
      }),
    ).toThrow("Fecha inválida");
    expect(() =>
      decodePlan({
        ...fixture,
        drills: [
          {
            id: "d",
            at: "2026-11-24T00:00:00Z",
            energyWh: 1,
            peakWatts: 1,
            result: "unknown",
          },
        ],
      }),
    ).toThrow("Resultado inválido");
  });

  it("usa GET, PUT y DELETE en las rutas declaradas", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const transport: Transport = jest.fn(async (url, init) => {
      calls.push({ url: String(url), init });
      return response(init?.method === "PUT" ? {} : [fixture], 200);
    });
    const repository = new MobileLabPowerRepository(
      "http://localhost:4566/",
      transport,
    );
    expect((await repository.list())[0].name).toBe("Conectividad");
    await repository.save(fixture);
    await repository.remove(fixture.id);
    expect(calls.map((call) => [call.url, call.init?.method ?? "GET"])).toEqual(
      [
        ["http://localhost:4566/api/backup-plans", "GET"],
        ["http://localhost:4566/api/backup-plans/plan%20con%20espacio", "PUT"],
        [
          "http://localhost:4566/api/backup-plans/plan%20con%20espacio",
          "DELETE",
        ],
      ],
    );
    expect(calls[1].init?.headers).toEqual({
      "Content-Type": "application/json; charset=utf-8",
    });
    expect(JSON.parse(String(calls[1].init?.body))).toEqual(fixture);
  });

  it("traduce HTTP, red, timeout y colecciones incompatibles", async () => {
    const http = new MobileLabPowerRepository(
      "http://local",
      jest.fn(async () => response({}, 503)),
    );
    await expect(http.list()).rejects.toThrow("HTTP 503");

    const offline = new MobileLabPowerRepository(
      "http://local",
      jest.fn(async () => {
        throw new TypeError("offline");
      }),
    );
    await expect(offline.list()).rejects.toThrow("No se pudo conectar");

    const invalid = new MobileLabPowerRepository(
      "http://local",
      jest.fn(async () => response({})),
    );
    await expect(invalid.list()).rejects.toThrow("colección incompatible");

    const corrupt = new MobileLabPowerRepository(
      "http://local",
      jest.fn(async () => response([{ id: 4 }])),
    );
    await expect(corrupt.list()).rejects.toThrow("No se pudo leer un plan");

    const timeoutTransport: Transport = jest.fn(
      async (_url, init): Promise<Response> =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const timeout = new MobileLabPowerRepository(
      "http://local",
      timeoutTransport,
      5,
    );
    await expect(timeout.list()).rejects.toBeInstanceOf(DataError);
    await expect(timeout.list()).rejects.toThrow("tardó demasiado");
  });
});
