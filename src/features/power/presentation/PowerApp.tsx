import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  analyze,
  BackupPlan,
  Device,
  recordDrill,
  removeDevice,
  resultLabel,
  toggleDevice,
  upsertDevice,
  validatePlan,
} from "../domain/plan";
import { PowerStore } from "./store";
import { Button, Card, colors, ErrorNotice, Field, Hero, Page } from "./ui";

type Route =
  | { name: "home" }
  | { name: "plan-form"; planId?: string }
  | { name: "detail"; planId: string }
  | { name: "device-form"; planId: string; deviceId?: string }
  | { name: "simulation"; planId: string };

const id = (prefix: string) =>
  prefix +
  "-" +
  Date.now().toString(36) +
  Math.random().toString(36).slice(2, 7);

const number = (value: string) => Number(value.replace(",", "."));

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function PowerApp({
  store,
  endpoint,
}: {
  store: PowerStore;
  endpoint: string;
}) {
  const snapshot = useSyncExternalStore(store.subscribe, store.snapshot);
  const [route, setRoute] = useState<Route>({ name: "home" });

  useEffect(() => {
    void store.refresh();
  }, [store]);

  const plan =
    "planId" in route
      ? snapshot.plans.find((item) => item.id === route.planId)
      : undefined;

  useEffect(() => {
    if ("planId" in route && !snapshot.busy && !plan) {
      setRoute({ name: "home" });
    }
  }, [plan, route, snapshot.busy]);

  return (
    <>
      <StatusBar style="dark" />
      {route.name === "home" ? (
        <HomeScreen
          store={store}
          snapshot={snapshot}
          endpoint={endpoint}
          open={(planId) => setRoute({ name: "detail", planId })}
          create={() => setRoute({ name: "plan-form" })}
        />
      ) : route.name === "plan-form" ? (
        <PlanFormScreen
          store={store}
          existing={plan}
          busy={snapshot.busy}
          error={snapshot.error}
          close={() =>
            setRoute(
              plan ? { name: "detail", planId: plan.id } : { name: "home" },
            )
          }
          saved={(planId) => setRoute({ name: "detail", planId })}
        />
      ) : route.name === "detail" && plan ? (
        <DetailScreen
          plan={plan}
          store={store}
          busy={snapshot.busy}
          error={snapshot.error}
          back={() => setRoute({ name: "home" })}
          edit={() => setRoute({ name: "plan-form", planId: plan.id })}
          device={(deviceId) =>
            setRoute({ name: "device-form", planId: plan.id, deviceId })
          }
          simulate={() => setRoute({ name: "simulation", planId: plan.id })}
        />
      ) : route.name === "device-form" && plan ? (
        <DeviceFormScreen
          plan={plan}
          device={plan.devices.find((item) => item.id === route.deviceId)}
          store={store}
          busy={snapshot.busy}
          error={snapshot.error}
          close={() => setRoute({ name: "detail", planId: plan.id })}
        />
      ) : route.name === "simulation" && plan ? (
        <SimulationScreen
          plan={plan}
          store={store}
          busy={snapshot.busy}
          error={snapshot.error}
          close={() => setRoute({ name: "detail", planId: plan.id })}
        />
      ) : (
        <Page title="Pulso de Respaldo" busy>
          <Text>Cargando plan…</Text>
        </Page>
      )}
    </>
  );
}

function HomeScreen({
  store,
  snapshot,
  endpoint,
  open,
  create,
}: {
  store: PowerStore;
  snapshot: ReturnType<PowerStore["snapshot"]>;
  endpoint: string;
  open: (id: string) => void;
  create: () => void;
}) {
  const ready = snapshot.plans.filter(
    (plan) => analyze(plan).result === "ready",
  );
  return (
    <Page title="Pulso de Respaldo" busy={snapshot.busy}>
      <Hero
        eyebrow="PLAN LOCAL DE ENERGÍA"
        title="Decide qué mantener encendido"
        detail={
          snapshot.plans.length +
          " planes · " +
          ready.length +
          " listos con la carga seleccionada"
        }
      />
      <Button label="Nuevo plan" onPress={create} disabled={snapshot.busy} />
      <ErrorNotice
        message={snapshot.error}
        retry={() => void store.refresh()}
      />
      {!snapshot.busy && !snapshot.error && snapshot.plans.length === 0 ? (
        <Card>
          <Text style={screenStyles.cardTitle}>
            Tu primer respaldo empieza aquí
          </Text>
          <Text style={screenStyles.muted}>
            Registra la batería y los equipos que quieres mantener disponibles
            durante un corte.
          </Text>
        </Card>
      ) : null}
      {snapshot.plans.map((plan) => {
        const report = analyze(plan);
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              "Abrir " + plan.name + ". " + resultLabel(report.result)
            }
            key={plan.id}
            onPress={() => open(plan.id)}
          >
            <Card>
              <View style={screenStyles.row}>
                <View style={screenStyles.grow}>
                  <Text style={screenStyles.cardTitle}>{plan.name}</Text>
                  <Text style={screenStyles.muted}>
                    {report.energyWh} Wh · {report.peakWatts} W ·{" "}
                    {plan.devices.filter((item) => item.enabled).length} activos
                  </Text>
                </View>
                <StatusPill result={report.result} />
              </View>
            </Card>
          </Pressable>
        );
      })}
      <Text style={screenStyles.endpoint} numberOfLines={2}>
        Sandbox · {endpoint}
      </Text>
    </Page>
  );
}

function PlanFormScreen({
  store,
  existing,
  busy,
  error,
  close,
  saved,
}: {
  store: PowerStore;
  existing?: BackupPlan;
  busy: boolean;
  error: string | null;
  close: () => void;
  saved: (id: string) => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [battery, setBattery] = useState(String(existing?.batteryWh ?? 1200));
  const [max, setMax] = useState(String(existing?.maxWatts ?? 1000));
  const [reserve, setReserve] = useState(
    String(existing?.reservePercent ?? 15),
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async () => {
    try {
      const plan = validatePlan({
        id: existing?.id ?? id("plan"),
        name,
        batteryWh: number(battery),
        maxWatts: number(max),
        reservePercent: number(reserve),
        devices: existing?.devices ?? [],
        drills: existing?.drills ?? [],
      });
      setLocalError(null);
      if (await store.save(plan)) saved(plan.id);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Revisa el formulario.",
      );
    }
  };

  return (
    <Page
      title={existing ? "Editar plan" : "Nuevo plan"}
      onBack={close}
      busy={busy}
    >
      <Hero
        eyebrow="CAPACIDAD DISPONIBLE"
        title={existing ? existing.name : "Un respaldo realista"}
        detail="Usa la capacidad útil y la potencia continua del equipo. Reserva una parte para imprevistos."
      />
      <Field
        label="Nombre del plan"
        value={name}
        onChangeText={setName}
        editable={!busy}
        maxLength={70}
        placeholder="Ej. Trabajo y conectividad"
      />
      <Field
        label="Capacidad de la batería (Wh)"
        value={battery}
        onChangeText={setBattery}
        editable={!busy}
        keyboardType="decimal-pad"
      />
      <Field
        label="Potencia continua máxima (W)"
        value={max}
        onChangeText={setMax}
        editable={!busy}
        keyboardType="decimal-pad"
      />
      <Field
        label="Reserva sin usar (%)"
        value={reserve}
        onChangeText={setReserve}
        editable={!busy}
        keyboardType="number-pad"
      />
      <ErrorNotice message={localError ?? error} />
      <Button
        label="Guardar plan"
        onPress={() => void submit()}
        disabled={busy}
      />
    </Page>
  );
}

function DetailScreen({
  plan,
  store,
  busy,
  error,
  back,
  edit,
  device,
  simulate,
}: {
  plan: BackupPlan;
  store: PowerStore;
  busy: boolean;
  error: string | null;
  back: () => void;
  edit: () => void;
  device: (id?: string) => void;
  simulate: () => void;
}) {
  const report = analyze(plan);
  const saveToggle = async (deviceId: string) => {
    await store.save(toggleDevice(plan, deviceId));
  };
  const remove = () =>
    Alert.alert(
      "¿Eliminar este plan?",
      "Se eliminarán sus equipos y simulacros guardados.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            if (await store.remove(plan.id)) back();
          },
        },
      ],
    );

  return (
    <Page title="Plan de respaldo" onBack={back} busy={busy}>
      <Hero
        eyebrow="CARGA SELECCIONADA"
        title={plan.name}
        detail={
          report.energyWh +
          " de " +
          report.usableWh +
          " Wh · " +
          report.peakWatts +
          " de " +
          plan.maxWatts +
          " W"
        }
      />
      <View style={screenStyles.metrics}>
        <Metric label="Margen" value={report.remainingWh + " Wh"} />
        <Metric label="Reserva" value={plan.reservePercent + "%"} />
        <Metric label="Equipos" value={String(plan.devices.length)} />
      </View>
      <StatusBanner result={report.result} />
      <Button label="Simular corte" onPress={simulate} disabled={busy} />
      <Button
        label="Editar capacidad"
        onPress={edit}
        secondary
        disabled={busy}
      />
      <Text accessibilityRole="header" style={screenStyles.sectionTitle}>
        Equipos
      </Text>
      {plan.devices.length === 0 ? (
        <Card>
          <Text style={screenStyles.cardTitle}>Aún no hay equipos</Text>
          <Text style={screenStyles.muted}>
            Añade una carga con su potencia y las horas que necesitas cubrir.
          </Text>
        </Card>
      ) : null}
      {plan.devices.map((item) => (
        <Card key={item.id}>
          <View style={screenStyles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={"Editar " + item.name}
              onPress={() => device(item.id)}
              style={screenStyles.grow}
            >
              <Text style={screenStyles.cardTitle}>
                {item.name}
                {item.essential ? " · esencial" : ""}
              </Text>
              <Text style={screenStyles.muted}>
                {item.watts} W × {item.hours} h ={" "}
                {Math.round(item.watts * item.hours)} Wh
              </Text>
            </Pressable>
            <Switch
              accessibilityLabel={"Incluir " + item.name}
              value={item.enabled}
              onValueChange={() => void saveToggle(item.id)}
              disabled={busy}
              trackColor={{ false: colors.line, true: colors.mint }}
              thumbColor={item.enabled ? colors.forest : "#FFFFFF"}
            />
          </View>
        </Card>
      ))}
      <Button
        label="Añadir equipo"
        onPress={() => device()}
        secondary
        disabled={busy}
      />
      <ErrorNotice message={error} />
      <Button label="Eliminar plan" onPress={remove} danger disabled={busy} />
    </Page>
  );
}

function DeviceFormScreen({
  plan,
  device,
  store,
  busy,
  error,
  close,
}: {
  plan: BackupPlan;
  device?: Device;
  store: PowerStore;
  busy: boolean;
  error: string | null;
  close: () => void;
}) {
  const [name, setName] = useState(device?.name ?? "");
  const [watts, setWatts] = useState(String(device?.watts ?? 60));
  const [hours, setHours] = useState(String(device?.hours ?? 2));
  const [essential, setEssential] = useState(device?.essential ?? true);
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async () => {
    try {
      const changed = upsertDevice(plan, {
        id: device?.id ?? id("device"),
        name,
        watts: number(watts),
        hours: number(hours),
        essential,
        enabled: device?.enabled ?? true,
      });
      setLocalError(null);
      if (await store.save(changed)) close();
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Revisa el equipo.",
      );
    }
  };

  const discard = () =>
    Alert.alert(
      "¿Quitar este equipo?",
      "El historial de simulacros conservará sus totales.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar",
          style: "destructive",
          onPress: async () => {
            if (device && (await store.save(removeDevice(plan, device.id)))) {
              close();
            }
          },
        },
      ],
    );

  return (
    <Page
      title={device ? "Editar equipo" : "Nuevo equipo"}
      onBack={close}
      busy={busy}
    >
      <Hero
        eyebrow="CONSUMO ESTIMADO"
        title={device ? device.name : "Añade una carga"}
        detail="Usa la potencia indicada por el fabricante o una medición propia. La app no mide equipos conectados."
      />
      <Field
        label="Nombre del equipo"
        value={name}
        onChangeText={setName}
        editable={!busy}
        maxLength={70}
      />
      <Field
        label="Potencia (W)"
        value={watts}
        onChangeText={setWatts}
        editable={!busy}
        keyboardType="decimal-pad"
      />
      <Field
        label="Horas necesarias"
        value={hours}
        onChangeText={setHours}
        editable={!busy}
        keyboardType="decimal-pad"
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: essential }}
        onPress={() => setEssential((value) => !value)}
        style={screenStyles.checkRow}
      >
        <View style={[screenStyles.check, essential && screenStyles.checked]}>
          <Text style={screenStyles.checkText}>{essential ? "✓" : ""}</Text>
        </View>
        <View style={screenStyles.grow}>
          <Text style={screenStyles.cardTitle}>Esencial durante el corte</Text>
          <Text style={screenStyles.muted}>
            Esta etiqueta ayuda a revisar las prioridades del plan.
          </Text>
        </View>
      </Pressable>
      <ErrorNotice message={localError ?? error} />
      <Button
        label="Guardar equipo"
        onPress={() => void submit()}
        disabled={busy}
      />
      {device ? (
        <Button
          label="Quitar equipo"
          onPress={discard}
          danger
          disabled={busy}
        />
      ) : null}
    </Page>
  );
}

function SimulationScreen({
  plan,
  store,
  busy,
  error,
  close,
}: {
  plan: BackupPlan;
  store: PowerStore;
  busy: boolean;
  error: string | null;
  close: () => void;
}) {
  const report = useMemo(() => analyze(plan), [plan]);
  const active = plan.devices.filter((item) => item.enabled);
  const save = async () => {
    const changed = recordDrill(plan, new Date(), id("drill"));
    await store.save(changed);
  };

  return (
    <Page title="Simulación" onBack={close} busy={busy}>
      <Hero
        eyebrow="CORTE SIMULADO"
        title={resultLabel(report.result)}
        detail={
          active.length +
          " equipos · " +
          report.energyWh +
          " Wh · pico de " +
          report.peakWatts +
          " W"
        }
      />
      <StatusBanner result={report.result} />
      <View style={screenStyles.metrics}>
        <Metric label="Útil" value={report.usableWh + " Wh"} />
        <Metric label="Necesario" value={report.energyWh + " Wh"} />
        <Metric label="Margen" value={report.remainingWh + " Wh"} />
      </View>
      <Text accessibilityRole="header" style={screenStyles.sectionTitle}>
        Carga activa
      </Text>
      {active.length === 0 ? (
        <Card>
          <Text style={screenStyles.cardTitle}>No seleccionaste equipos</Text>
          <Text style={screenStyles.muted}>
            Regresa al plan y activa al menos una carga antes de guardar el
            simulacro.
          </Text>
        </Card>
      ) : (
        active.map((item) => (
          <Card key={item.id}>
            <Text style={screenStyles.cardTitle}>{item.name}</Text>
            <Text style={screenStyles.muted}>
              {item.watts} W · {item.hours} h ·{" "}
              {Math.round(item.watts * item.hours)} Wh
            </Text>
          </Card>
        ))
      )}
      <Button
        label="Guardar simulacro"
        onPress={() => void save()}
        disabled={busy || active.length === 0}
      />
      <ErrorNotice message={error} />
      <Text accessibilityRole="header" style={screenStyles.sectionTitle}>
        Historial
      </Text>
      {plan.drills.length === 0 ? (
        <Card>
          <Text style={screenStyles.cardTitle}>Sin simulacros guardados</Text>
          <Text style={screenStyles.muted}>
            El primer registro conservará el consumo y la potencia calculados
            hoy.
          </Text>
        </Card>
      ) : (
        plan.drills.map((drill) => (
          <Card key={drill.id}>
            <View style={screenStyles.row}>
              <View style={screenStyles.grow}>
                <Text style={screenStyles.cardTitle}>
                  {dateLabel(drill.at)}
                </Text>
                <Text style={screenStyles.muted}>
                  {drill.energyWh} Wh · {drill.peakWatts} W
                </Text>
              </View>
              <StatusPill result={drill.result} />
            </View>
          </Card>
        ))
      )}
    </Page>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={screenStyles.metric}>
      <Text style={screenStyles.metricValue}>{value}</Text>
      <Text style={screenStyles.metricLabel}>{label}</Text>
    </View>
  );
}

function StatusPill({
  result,
}: {
  result: ReturnType<typeof analyze>["result"];
}) {
  const safe = result === "ready";
  return (
    <View
      style={[
        screenStyles.pill,
        { backgroundColor: safe ? colors.mint : "#FFE4AE" },
      ]}
    >
      <Text style={screenStyles.pillText}>{safe ? "Viable" : "Revisar"}</Text>
    </View>
  );
}

function StatusBanner({
  result,
}: {
  result: ReturnType<typeof analyze>["result"];
}) {
  const text =
    result === "power-risk"
      ? "La carga simultánea supera la potencia continua de la batería."
      : result === "energy-risk"
        ? "La batería no cubre todas las horas seleccionadas con la reserva actual."
        : "La capacidad y la potencia alcanzan para esta selección estimada.";
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        screenStyles.banner,
        {
          backgroundColor: result === "ready" ? "#E4F8EC" : "#FFF3D9",
        },
      ]}
    >
      <Text style={screenStyles.bannerTitle}>{resultLabel(result)}</Text>
      <Text style={screenStyles.muted}>{text}</Text>
    </View>
  );
}

const screenStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  grow: { flex: 1, gap: 4 },
  cardTitle: { color: colors.ink, fontWeight: "800", fontSize: 16 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  sectionTitle: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 20,
    marginTop: 8,
  },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 },
  pillText: { color: colors.ink, fontWeight: "800", fontSize: 12 },
  metrics: { flexDirection: "row", gap: 8 },
  metric: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
  },
  metricValue: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 17,
    textAlign: "center",
  },
  metricLabel: { color: colors.muted, fontSize: 12, textAlign: "center" },
  banner: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  bannerTitle: { color: colors.ink, fontWeight: "800", fontSize: 17 },
  checkRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.paper,
    padding: 12,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.forest,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: { backgroundColor: colors.forest },
  checkText: { color: "#FFFFFF", fontWeight: "900" },
  endpoint: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});
