import React, { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const colors = {
  ink: "#17352F",
  forest: "#245F52",
  mint: "#B8F2D0",
  cream: "#F8F4E8",
  paper: "#FFFDF7",
  line: "#CBD8D2",
  amber: "#F1B84B",
  danger: "#A43D42",
  muted: "#53645F",
};

export function Page({
  children,
  title,
  onBack,
  busy = false,
}: PropsWithChildren<{
  title: string;
  onBack?: () => void;
  busy?: boolean;
}>) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={onBack}
            style={styles.iconButton}
          >
            <Text style={styles.iconText}>‹</Text>
          </Pressable>
        ) : (
          <View style={styles.iconSpace} />
        )}
        <Text accessibilityRole="header" style={styles.topTitle}>
          {title}
        </Text>
        {busy ? (
          <ActivityIndicator
            accessibilityLabel="Guardando"
            color={colors.forest}
            style={styles.iconSpace}
          />
        ) : (
          <View style={styles.iconSpace} />
        )}
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.column}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Hero({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={styles.heroTitle}>
        {title}
      </Text>
      <Text style={styles.heroDetail}>{detail}</Text>
    </View>
  );
}

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

export function Button({
  label,
  onPress,
  disabled = false,
  secondary = false,
  danger = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={[
        styles.button,
        secondary && styles.secondaryButton,
        danger && styles.dangerButton,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && styles.secondaryButtonText,
          danger && styles.dangerButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? styles.inputError : undefined]}
        {...props}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function ErrorNotice({
  message,
  retry,
}: {
  message: string | null;
  retry?: () => void;
}) {
  if (!message) return null;
  return (
    <View accessibilityLiveRegion="polite" style={styles.errorBox}>
      <Text style={styles.error}>{message}</Text>
      {retry ? <Button label="Reintentar" secondary onPress={retry} /> : null}
    </View>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  topbar: {
    minHeight: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.paper,
  },
  topTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: { color: colors.ink, fontSize: 38, lineHeight: 40 },
  iconSpace: { width: 44 },
  scroll: { flexGrow: 1, alignItems: "center" },
  column: {
    width: "100%",
    maxWidth: 720,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 48,
    gap: 12,
  },
  hero: {
    borderRadius: 24,
    backgroundColor: colors.ink,
    padding: 22,
    gap: 10,
  },
  eyebrow: {
    color: colors.mint,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontSize: 12,
  },
  heroTitle: {
    color: colors.paper,
    fontWeight: "800",
    fontSize: 30,
    lineHeight: 36,
  },
  heroDetail: { color: colors.paper, fontSize: 16, lineHeight: 22 },
  card: {
    borderRadius: 18,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 8,
  },
  button: {
    minHeight: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: colors.forest,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryButton: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.forest,
  },
  secondaryButtonText: { color: colors.forest },
  dangerButton: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerButtonText: { color: colors.danger },
  disabled: { opacity: 0.45 },
  field: { gap: 6 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.paper,
    color: colors.ink,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontWeight: "600" },
  errorBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8B7BA",
    backgroundColor: "#FFF3F3",
    gap: 10,
  },
});
