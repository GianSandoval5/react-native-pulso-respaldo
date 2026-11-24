import React from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MobileLabPowerRepository } from "./src/features/power/data/mobilelabRepository";
import { PowerStore } from "./src/features/power/presentation/store";
import { PowerApp } from "./src/features/power/presentation/PowerApp";

const endpoint =
  process.env.EXPO_PUBLIC_MOBILELAB_URL ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:4566"
    : "http://127.0.0.1:4566");
const store = new PowerStore(new MobileLabPowerRepository(endpoint));

export default function App() {
  return (
    <SafeAreaProvider>
      <PowerApp store={store} endpoint={endpoint} />
    </SafeAreaProvider>
  );
}
