import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BackupPlan } from "../../src/features/power/domain/plan";
import { PowerApp } from "../../src/features/power/presentation/PowerApp";
import { PowerStore } from "../../src/features/power/presentation/store";
import { MemoryRepository } from "../support/memoryRepository";

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderApp = (repository: MemoryRepository) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <PowerApp
        store={new PowerStore(repository)}
        endpoint="http://127.0.0.1:4566"
      />
    </SafeAreaProvider>,
  );

const fixture = (patch: Partial<BackupPlan> = {}): BackupPlan => ({
  id: "home",
  name: "Casa",
  batteryWh: 1000,
  maxWatts: 500,
  reservePercent: 20,
  devices: [
    {
      id: "router",
      name: "Router",
      watts: 18,
      hours: 6,
      essential: true,
      enabled: true,
    },
  ],
  drills: [],
  ...patch,
});

describe("flujos de interfaz", () => {
  it("recupera un error inicial y muestra el estado vacío", async () => {
    const repository = new MemoryRepository();
    repository.error = new Error("Servicio fuera de línea");
    const screen = renderApp(repository);
    expect(await screen.findByText("Servicio fuera de línea")).toBeTruthy();
    repository.error = null;
    fireEvent.press(screen.getByText("Reintentar"));
    expect(
      await screen.findByText("Tu primer respaldo empieza aquí"),
    ).toBeTruthy();
  });

  it("valida, crea un plan y añade un equipo", async () => {
    const repository = new MemoryRepository();
    const screen = renderApp(repository);
    expect(
      await screen.findByText("Tu primer respaldo empieza aquí"),
    ).toBeTruthy();

    fireEvent.press(screen.getByText("Nuevo plan"));
    fireEvent.press(screen.getByText("Guardar plan"));
    expect(
      await screen.findByText(
        "Revisa el nombre, la batería, la potencia máxima y la reserva.",
      ),
    ).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Nombre del plan"), "Oficina");
    fireEvent.press(screen.getByText("Guardar plan"));
    expect(await screen.findByText("Añadir equipo")).toBeTruthy();

    fireEvent.press(screen.getByText("Añadir equipo"));
    fireEvent.press(screen.getByText("Guardar equipo"));
    expect(await screen.findByText(/Cada equipo necesita nombre/)).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Nombre del equipo"), "Router");
    fireEvent.changeText(screen.getByLabelText("Potencia (W)"), "18");
    fireEvent.changeText(screen.getByLabelText("Horas necesarias"), "6");
    fireEvent.press(screen.getByText("Guardar equipo"));
    expect(await screen.findByText("Router · esencial")).toBeTruthy();
    expect([...repository.rows.values()][0].devices[0].name).toBe("Router");
  });

  it("desactiva una carga, simula y guarda un registro histórico", async () => {
    const repository = new MemoryRepository([fixture()]);
    const screen = renderApp(repository);
    fireEvent.press(await screen.findByText("Casa"));
    expect(screen.getByText("108 de 800 Wh · 18 de 500 W")).toBeTruthy();

    fireEvent(screen.getByLabelText("Incluir Router"), "valueChange", false);
    await waitFor(() =>
      expect(repository.rows.get("home")?.devices[0].enabled).toBe(false),
    );
    expect(await screen.findByText("0 de 800 Wh · 0 de 500 W")).toBeTruthy();

    fireEvent(screen.getByLabelText("Incluir Router"), "valueChange", true);
    await waitFor(() =>
      expect(repository.rows.get("home")?.devices[0].enabled).toBe(true),
    );
    fireEvent.press(screen.getByText("Simular corte"));
    expect(await screen.findByText("Carga activa")).toBeTruthy();
    fireEvent.press(screen.getByText("Guardar simulacro"));
    await waitFor(() =>
      expect(repository.rows.get("home")?.drills).toHaveLength(1),
    );
    expect(screen.queryByText("Sin simulacros guardados")).toBeNull();
    expect(screen.getAllByText("Plan viable").length).toBeGreaterThan(0);
  });

  it("muestra riesgos de energía y potencia en pantallas accesibles", async () => {
    const heavy = fixture({
      batteryWh: 500,
      maxWatts: 1000,
      reservePercent: 20,
      devices: [
        {
          id: "load",
          name: "Carga larga",
          watts: 300,
          hours: 2,
          essential: false,
          enabled: true,
        },
      ],
    });
    const repository = new MemoryRepository([heavy]);
    const screen = renderApp(repository);
    fireEvent.press(await screen.findByLabelText(/Abrir Casa/));
    expect(await screen.findByText("Energía insuficiente")).toBeTruthy();
    fireEvent.press(screen.getByText("Editar capacidad"));
    fireEvent.changeText(
      screen.getByLabelText("Potencia continua máxima (W)"),
      "200",
    );
    fireEvent.press(screen.getByText("Guardar plan"));
    expect(await screen.findByText("Exceso de potencia")).toBeTruthy();
    expect(screen.getByLabelText("Volver")).toBeTruthy();
  });
});
