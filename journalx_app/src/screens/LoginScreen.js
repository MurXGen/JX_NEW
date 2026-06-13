import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Sparkles } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { Button, Field, Input, Toast, Muted } from "../components/ui";
import { MotionView } from "../components/motion";
import { font } from "../theme/typography";
import * as authApi from "../api/auth";
import { apiErrorMessage } from "../lib/error";
import { successHaptic, errorHaptic } from "../lib/haptics";
import Constants from "expo-constants";

function getGoogleSignin() {
  try {
    const mod = require("@react-native-google-signin/google-signin");
    const GoogleSignin = mod.GoogleSignin;
    GoogleSignin.configure({ webClientId: Constants.expoConfig?.extra?.googleWebClientId, offlineAccess: false });
    return GoogleSignin;
  } catch {
    return null;
  }
}

export default function LoginScreen() {
  const { theme: t } = useTheme();
  const { completeLogin } = useApp();

  // login | register | codeRequest | codeVerify | registerVerify
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpUserId, setOtpUserId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const flash = (type, msg) => {
    setToast({ type, msg });
    type === "danger" ? errorHaptic() : successHaptic();
    setTimeout(() => setToast(null), 3500);
  };

  const doPasswordLogin = async () => {
    if (!email.trim() || !password) return flash("danger", "Enter your email and password");
    setBusy(true);
    try {
      const data = await authApi.login(email.trim(), password);
      if (!data?.token) flash("danger", "Logged in but server sent no token — set JWT_SECRET on the backend.");
      else await completeLogin(data);
    } catch (e) { flash("danger", apiErrorMessage(e)); } finally { setBusy(false); }
  };

  const doRegister = async () => {
    if (!name.trim()) return flash("danger", "Enter your name");
    if (!email.trim()) return flash("danger", "Enter your email");
    if (!password || password.length < 6) return flash("danger", "Password must be at least 6 characters");
    setBusy(true);
    try {
      const data = await authApi.register(name.trim(), email.trim(), password);
      setOtpUserId(data?.userId);
      setOtp("");
      setMode("registerVerify");
      flash("success", "We emailed you a verification code");
    } catch (e) { flash("danger", apiErrorMessage(e)); } finally { setBusy(false); }
  };

  const verifyRegister = async () => {
    if (otp.length !== 6) return flash("danger", "Enter the 6-digit code");
    setBusy(true);
    try {
      const data = await authApi.verifyOtp(otpUserId, otp);
      await completeLogin({ ...data, isNewUser: true });
    } catch (e) { flash("danger", apiErrorMessage(e)); } finally { setBusy(false); }
  };

  const sendCode = async () => {
    if (!email.trim()) return flash("danger", "Enter your email");
    setBusy(true);
    try {
      const data = await authApi.requestLoginOtp(email.trim());
      setOtpUserId(data?.userId);
      setOtp("");
      setMode("codeVerify");
      flash("success", "We emailed you a login code");
    } catch (e) { flash("danger", apiErrorMessage(e)); } finally { setBusy(false); }
  };

  const verifyCode = async () => {
    if (otp.length !== 6) return flash("danger", "Enter the 6-digit code");
    setBusy(true);
    try {
      const data = await authApi.verifyLoginOtp(otpUserId, otp);
      await completeLogin(data);
    } catch (e) { flash("danger", apiErrorMessage(e)); } finally { setBusy(false); }
  };

  const googleLogin = async () => {
    const GoogleSignin = getGoogleSignin();
    if (!GoogleSignin) return flash("danger", "Google sign-in needs the app build (not Expo Go). Use email here.");
    setBusy(true);
    try {
      await GoogleSignin.hasPlayServices();
      const res = await GoogleSignin.signIn();
      const idToken = res?.idToken || res?.data?.idToken;
      if (!idToken) throw new Error("No Google token");
      const data = await authApi.googleNative(idToken);
      await completeLogin(data);
    } catch (e) { flash("danger", apiErrorMessage(e)); } finally { setBusy(false); }
  };

  const copy = {
    login: { title: "Welcome back", sub: "Log in to your trading journal" },
    register: { title: "Create your account", sub: "Start journaling your trades in seconds" },
    codeRequest: { title: "Log in with a code", sub: "We'll email you a one-time login code" },
    codeVerify: { title: "Check your email", sub: `Enter the 6-digit code sent to ${email}` },
    registerVerify: { title: "Verify your email", sub: `Enter the 6-digit code sent to ${email}` },
  }[mode];

  const isVerify = mode === "codeVerify" || mode === "registerVerify";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg.canvas }}>
      <Toast toast={toast} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: t.space[6], justifyContent: "center" }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* brand */}
          <MotionView delay={0}>
            <View style={{ alignItems: "center", marginBottom: t.space[7] }}>
              <View style={{ width: 66, height: 66, borderRadius: 20, backgroundColor: t.primary, alignItems: "center", justifyContent: "center", marginBottom: t.space[4] }}>
                <Sparkles size={28} color={t.primaryText} />
              </View>
              <Text style={{ fontFamily: font(800), fontSize: 30, color: t.text.primary }}>
                Journal<Text style={{ color: t.yellow[400] }}>X</Text>
              </Text>
              <Muted style={{ marginTop: 4, textAlign: "center" }}>Trade log analysis in under 10 seconds</Muted>
            </View>
          </MotionView>

          {/* form */}
          <MotionView delay={90}>
            <View style={{ backgroundColor: t.bg.surface, borderColor: t.border, borderWidth: 1, borderRadius: t.radius.xl, padding: t.space[5] }}>
              <Text style={{ fontFamily: font(800), fontSize: t.font.h2, color: t.text.primary }}>{copy.title}</Text>
              <Muted style={{ marginBottom: t.space[5], marginTop: 2 }}>{copy.sub}</Muted>

              {mode === "login" && (
                <View style={{ gap: t.space[4] }}>
                  <Field label="Email"><Input value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" /></Field>
                  <Field label="Password"><Input value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry /></Field>
                  <Button title="Log in" onPress={doPasswordLogin} loading={busy} />
                  <Button title="Log in with an email code" variant="ghost" onPress={() => setMode("codeRequest")} />
                  <Button title="Continue with Google" variant="outline" onPress={googleLogin} />
                </View>
              )}

              {mode === "register" && (
                <View style={{ gap: t.space[4] }}>
                  <Field label="Name"><Input value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" /></Field>
                  <Field label="Email"><Input value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" /></Field>
                  <Field label="Password"><Input value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry /></Field>
                  <Button title="Create account" onPress={doRegister} loading={busy} />
                  <Button title="Continue with Google" variant="outline" onPress={googleLogin} />
                </View>
              )}

              {mode === "codeRequest" && (
                <View style={{ gap: t.space[4] }}>
                  <Field label="Email"><Input value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" /></Field>
                  <Button title="Send login code" onPress={sendCode} loading={busy} />
                  <Button title="Back to password login" variant="ghost" onPress={() => setMode("login")} />
                </View>
              )}

              {isVerify && (
                <View style={{ gap: t.space[4] }}>
                  <Field label="6-digit code"><Input value={otp} onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, "").slice(0, 6))} placeholder="123456" keyboardType="number-pad" /></Field>
                  <Button title="Verify & continue" onPress={mode === "registerVerify" ? verifyRegister : verifyCode} loading={busy} />
                  <Button title="Resend code" variant="ghost" onPress={mode === "registerVerify" ? doRegister : sendCode} />
                  <Button title="Back" variant="ghost" onPress={() => { setOtp(""); setMode(mode === "registerVerify" ? "register" : "codeRequest"); }} />
                </View>
              )}
            </View>
          </MotionView>

          {/* switch login / register */}
          {(mode === "login" || mode === "register" || mode === "codeRequest") && (
            <MotionView delay={170}>
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: t.space[5] }}>
                <Text style={{ color: t.text.muted, fontSize: t.font.body }}>
                  {mode === "register" ? "Already have an account?" : "New to JournalX?"}
                </Text>
                <Pressable onPress={() => { setMode(mode === "register" ? "login" : "register"); setOtp(""); }} hitSlop={8}>
                  <Text style={{ color: t.accent.text, fontFamily: font(700), fontSize: t.font.body }}>
                    {mode === "register" ? "Log in" : "Create account"}
                  </Text>
                </Pressable>
              </View>
            </MotionView>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
