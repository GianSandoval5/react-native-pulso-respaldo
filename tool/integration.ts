import assert from "node:assert/strict";
import { MobileLabPowerRepository } from "../src/features/power/data/mobilelabRepository";
import { BackupPlan, recordDrill } from "../src/features/power/domain/plan";

async function main() {
  const repository = new MobileLabPowerRepository(process.argv[2]);
  const phase = process.argv[3];
  const id = "integration-backup-plan";

  if (phase === "write") {
    const seeded = await repository.list();
    assert.ok(seeded.some((plan) => plan.id === "demo-trabajo"));
    const plan: BackupPlan = {
      id,
      name: "Integración sintética",
      batteryWh: 1000,
      maxWatts: 600,
      reservePercent: 20,
      devices: [
        {
          id: "router",
          name: "Router demo",
          watts: 18,
          hours: 4,
          essential: true,
          enabled: true,
        },
      ],
      drills: [],
    };
    await repository.save(plan);
    assert.equal(
      (await repository.list()).find((item) => item.id === id)?.devices.length,
      1,
    );
    await repository.save(
      recordDrill(plan, new Date("2026-11-24T14:00:00Z"), "drill-integration"),
    );
    assert.equal(
      (await repository.list()).find((item) => item.id === id)?.drills.length,
      1,
    );
    return;
  }

  assert.equal(phase, "restart");
  const restored = (await repository.list()).find((item) => item.id === id);
  assert.ok(restored);
  assert.equal(restored.name, "Integración sintética");
  assert.deepEqual(
    restored.devices.map((item) => item.name),
    ["Router demo"],
  );
  assert.equal(restored.drills[0].energyWh, 72);
  assert.equal(restored.drills[0].peakWatts, 18);
  await repository.remove(id);
  assert.equal(
    (await repository.list()).some((item) => item.id === id),
    false,
  );
  assert.ok(
    (await repository.list()).some((item) => item.id === "demo-trabajo"),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
