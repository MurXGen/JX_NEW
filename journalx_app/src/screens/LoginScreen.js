import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotionView } from "../components/motion";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { Button, Field, Input, Toast, H1, Muted } from "../components/ui";
import * as authApi from "../api/auth";
import { apiErrorMessage } from "../lib/error";
import Constants from "expo-constants";

/* Lazily load the native Google Sign-In module. It isn't available in Expo Go,
   so we require it on demand and surface a friendly message there instead of
   crashing the whole screen at import time. */
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

  const flash = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const doPasswordLogin = async () => {
    if (!email.trim() || !password) return flash("danger", "Enter your email and password");
    setBusy(true);
    try {
      const data = await authApi.login(email.trim(), password);
      if (!data?.token) {
        flash("danger", "Logged in but server sent no token — set JWT_SECRET on the backend.");
      } else {
        await completeLogin(data);
      }
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
    if (!GoogleSignin) {
      return flash("danger", "Google sign-in needs the dev build (not Expo Go). Use email or code login here.");
    }
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.canvas }}>
      <Toast toast={toast} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: theme.space[6] }}>
          <MotionView>
            <Text style={{ color: theme.text.primary, fontSize: theme.font.h1, fontWeight: "800", marginBottom: 4 }}>
              Journal<Text style={{ color: theme.yellow[300] }}>X</Text>
            </Text>
            <H1>
              {mode === "password" ? "Welcome back" : mode === "codeRequest" ? "Log in with a code" : "Check your email"}
            </H1>
            <Muted style={{ marginBottom: theme.space[5] }}>
              {mode === "password"
                ? "Log in to your trading journal"
                : mode === "codeRequest"
                  ? "We'll email you a one-time login code"
                  : `Enter the 6-digit code sent to ${email}`}
            </Muted>

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
          </MotionView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
