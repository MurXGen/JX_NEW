import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Sparkles, Star, TrendingUp, Globe2 } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { Button, Field, Input, Toast, Muted, Grad, GlassCard } from "../components/ui";
import GradientBackground from "../components/GradientBackground";
import { MotionView } from "../components/motion";
import { font } from "../theme/typography";
import * as authApi from "../api/auth";
import { apiErrorMessage } from "../lib/error";
import Constants from "expo-constants";

/* Native Google Sign-In is lazy-loaded (not available in Expo Go). */
function getGoogleSignin() {
  try {
    const mod = require("@react-native-google-signin/google-signin");
    const GoogleSignin = mod.GoogleSignin;
    GoogleSignin.configure({
      webClientId: Constants.expoConfig?.extra?.googleWebClientId,
      offlineAccess: false,
    });
    return GoogleSignin;
  } catch {
    return null;
  }
}

const ACHIEVEMENTS = [
  { icon: TrendingUp, label: "250k+ trades logged" },
  { icon: Star, label: "4.8★ trader rating" },
  { icon: Globe2, label: "All markets" },
];

export default function LoginScreen() {
  const { theme } = useTheme();
  const { completeLogin } = useApp();

  const [mode, setMode] = useState("password"); // password | codeRequest | codeVerify
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpUserId, setOtpUserId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const flash = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

  const doPasswordLogin = async () => {
    if (!email.trim() || !password) return flash("danger", "Enter your email and password");
    setBusy(true);
    try {
      const data = await authApi.login(email.trim(), password);
      if (!data?.token) flash("danger", "Logged in but server sent no token — set JWT_SECRET on the backend.");
      else await completeLogin(data);
    } catch (e) {
      flash("danger", apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = async () => {
    if (!email.trim()) return flash("danger", "Enter your email");
    setBusy(true);
    try {
      const data = await authApi.requestLoginOtp(email.trim());
      setOtpUserId(data?.userId);
      setMode("codeVerify");
      flash("success", "We emailed you a login code");
    } catch (e) {
      flash("danger", apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (otp.length !== 6) return flash("danger", "Enter the 6-digit code");
    setBusy(true);
    try {
      const data = await authApi.verifyLoginOtp(otpUserId, otp);
      await completeLogin(data);
    } catch (e) {
      flash("danger", apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const googleLogin = async () => {
    const GoogleSignin = getGoogleSignin();
    if (!GoogleSignin) return flash("danger", "Google sign-in needs the app build (not Expo Go). Use email or code login here.");
    setBusy(true);
    try {
      await GoogleSignin.hasPlayServices();
      const res = await GoogleSignin.signIn();
      const idToken = res?.idToken || res?.data?.idToken;
      if (!idToken) throw new Error("No Google token");
      const data = await authApi.googleNative(idToken);
      await completeLogin(data);
    } catch (e) {
      flash("danger", apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "password" ? "Welcome back" : mode === "codeRequest" ? "Log in with a code" : "Check your email";
  const subtitle =
    mode === "password"
      ? "Log in to your trading journal"
      : mode === "codeRequest"
        ? "We'll email you a one-time login code"
        : `Enter the 6-digit code sent to ${email}`;

  return (
    <GradientBackground>
    <SafeAreaView style={{ flex: 1 }}>
      <Toast toast={toast} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: theme.space[6], justifyContent: "space-between" }}>
          {/* hero */}
          <MotionView delay={0}>
            <View style={{ alignItems: "center", marginTop: theme.space[6], marginBottom: theme.space[7] }}>
              <View
                style={{
                  width: 64, height: 64, borderRadius: 18, marginBottom: theme.space[4],
                  alignItems: "center", justifyContent: "center", overflow: "hidden",
                  shadowColor: theme.primary, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10,
                }}
              >
                <Grad colors={theme.gradients.brandStrong} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                <Sparkles size={28} color={theme.primaryText} />
              </View>
              <Text style={{ fontFamily: font(800), fontSize: 30, color: theme.text.primary }}>
                Journal<Text style={{ color: theme.yellow[300] }}>X</Text>
              </Text>
              <Muted style={{ marginTop: 4, textAlign: "center" }}>
                Trade log analysis in under 10 seconds
              </Muted>
            </View>
          </MotionView>

          {/* form — centered glass card over the aurora backdrop */}
          <MotionView delay={90}>
            <GlassCard>
            <Text style={{ fontFamily: font(700), fontSize: theme.font.h2, color: theme.text.primary }}>{title}</Text>
            <Muted style={{ marginBottom: theme.space[5] }}>{subtitle}</Muted>

            {mode === "password" && (
              <View style={{ gap: theme.space[4] }}>
                <Field label="Email">
                  <Input value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
                </Field>
                <Field label="Password">
                  <Input value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
                </Field>
                <Button title="Log in" onPress={doPasswordLogin} loading={busy} />
                <Button title="Log in with an email code" variant="ghost" onPress={() => setMode("codeRequest")} />
                <Button title="Continue with Google" variant="outline" onPress={googleLogin} />
              </View>
            )}

            {mode === "codeRequest" && (
              <View style={{ gap: theme.space[4] }}>
                <Field label="Email">
                  <Input value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
                </Field>
                <Button title="Send login code" onPress={sendCode} loading={busy} />
                <Button title="Back to password login" variant="ghost" onPress={() => setMode("password")} />
              </View>
            )}

            {mode === "codeVerify" && (
              <View style={{ gap: theme.space[4] }}>
                <Field label="6-digit code">
                  <Input value={otp} onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, "").slice(0, 6))} placeholder="123456" keyboardType="number-pad" />
                </Field>
                <Button title="Verify & log in" onPress={verifyCode} loading={busy} />
                <Button title="Resend code" variant="ghost" onPress={sendCode} />
                <Button title="Back" variant="ghost" onPress={() => { setMode("codeRequest"); setOtp(""); }} />
              </View>
            )}
            </GlassCard>
          </MotionView>

          {/* achievements / trust strip */}
          <MotionView delay={200}>
            <View
              style={{
                flexDirection: "row", justifyContent: "space-around", alignItems: "center",
                marginTop: theme.space[7], paddingTop: theme.space[5],
                borderTopColor: theme.border, borderTopWidth: 1,
              }}
            >
              {ACHIEVEMENTS.map(({ icon: Icon, label }) => (
                <View key={label} style={{ alignItems: "center", flex: 1, gap: 6 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.glass.border }}>
                    <Grad colors={theme.gradients.statBrand} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                    <Icon size={16} color={theme.yellow[400]} />
                  </View>
                  <Text style={{ fontFamily: font(600), fontSize: 11, color: theme.text.muted, textAlign: "center" }}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          </MotionView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GradientBackground>
  );
}
