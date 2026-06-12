import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, Crown, X } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { Button, Card, H1, Muted, Badge, Toast, Grad, GlassBackdrop } from "../components/ui";
import GradientBackground from "../components/GradientBackground";
import { font } from "../theme/typography";
import {
  isPurchasesAvailable,
  getProOffering,
  purchasePro,
  restorePurchases,
} from "../lib/purchases";

function SubRow({ theme, label, value, last }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomColor: theme.border, borderBottomWidth: last ? 0 : 1 }}>
      <Text style={{ color: theme.text.muted, fontSize: theme.font.body }}>{label}</Text>
      <Text style={{ color: theme.text.primary, fontSize: theme.font.body, fontFamily: font(700) }}>{value}</Text>
    </View>
  );
}

const PRO_FEATURES = [
  "Unlimited trades",
  "Advanced analytics",
  "Unlimited chart logging",
  "Full trade history",
  "Priority support",
];

export default function UpgradeScreen({ navigation }) {
  const { theme } = useTheme();
  const { subscription, refresh } = useApp();

  const [offering, setOffering] = useState(null);
  const [loadingOffer, setLoadingOffer] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const available = isPurchasesAvailable();

  const flash = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    (async () => {
      if (available) setOffering(await getProOffering());
      setLoadingOffer(false);
    })();
  }, [available]);

  const subscribe = async () => {
    if (!offering?.pkg) return flash("danger", "Plan unavailable right now");
    setBusy(true);
    try {
      const { active } = await purchasePro(offering.pkg);
      if (active) {
        // RevenueCat webhook updates the backend; refresh to reflect it
        await refresh();
        flash("success", "You're Pro now 🎉");
        setTimeout(() => navigation.goBack(), 1000);
      } else {
        flash("danger", "Purchase didn't activate — try Restore");
      }
    } catch (e) {
      if (!e?.userCancelled) flash("danger", e?.message || "Purchase failed");
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      const { active } = await restorePurchases();
      await refresh();
      flash(active ? "success" : "info", active ? "Pro restored" : "No active purchase found");
    } catch (e) {
      flash("danger", e?.message || "Restore failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GradientBackground>
    <SafeAreaView style={{ flex: 1 }}>
      <Toast toast={toast} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: theme.space[5] }}>
        <H1>Upgrade</H1>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <X size={24} color={theme.text.muted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.space[5], paddingTop: 0, gap: theme.space[4] }}>
        {subscription.isPro ? (
          <>
            {/* status header */}
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <View style={{ padding: theme.space[5], alignItems: "center", gap: 6, overflow: "hidden" }}>
                <Grad colors={theme.gradients.statBrand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                <View style={{ width: 56, height: 56, borderRadius: 16, overflow: "hidden", alignItems: "center", justifyContent: "center", shadowColor: theme.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 }}>
                  <Grad colors={theme.gradients.brandStrong} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                  <Crown size={28} color={theme.primaryText} />
                </View>
                <Text style={{ color: theme.text.primary, fontSize: theme.font.h3, fontFamily: "Poppins_700Bold" }}>
                  You&apos;re on {subscription.plan === "lifetime" ? "Lifetime" : "Pro"}
                </Text>
                <Badge tone="success">{subscription.status}</Badge>
              </View>
              <View style={{ padding: theme.space[5] }}>
                <SubRow theme={theme} label="Plan" value={subscription.plan === "lifetime" ? "Lifetime" : "Pro Monthly"} />
                <SubRow theme={theme} label="Status" value={subscription.status} />
                {subscription.plan !== "lifetime" && subscription.expiresAt && (
                  <SubRow theme={theme} label="Renews / expires" value={subscription.expiresAt.toLocaleDateString()} />
                )}
                {subscription.daysLeft != null && subscription.plan !== "lifetime" && (
                  <SubRow theme={theme} label="Days left" value={`${subscription.daysLeft}`} />
                )}
                <SubRow theme={theme} label="Billed via" value={subscription.source === "play" ? "Google Play" : subscription.source === "paddle" ? "Web (Paddle)" : "—"} last />
              </View>
            </Card>

            {/* what's included */}
            <Card>
              <Text style={{ color: theme.text.primary, fontFamily: "Poppins_700Bold", fontSize: theme.font.title, marginBottom: theme.space[3] }}>Your plan includes</Text>
              <View style={{ gap: 10 }}>
                {PRO_FEATURES.map((f) => (
                  <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Check size={16} color={theme.success} />
                    <Text style={{ color: theme.text.secondary, fontSize: theme.font.body }}>{f}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {subscription.source === "play" ? (
              <Muted style={{ textAlign: "center" }}>Manage or cancel anytime in the Google Play Store → Subscriptions.</Muted>
            ) : subscription.source === "paddle" ? (
              <Muted style={{ textAlign: "center" }}>This subscription is managed on the web — manage it from journalx.app.</Muted>
            ) : null}
          </>
        ) : (
          <>
            {/* hero pricing card — brand-gradient border wrap (the "popular" plan) */}
            <Grad
              colors={theme.gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: theme.radius.xl + 1.5, padding: 1.5, shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}
            >
              <View style={{ borderRadius: theme.radius.xl, overflow: "hidden", padding: theme.space[5], gap: theme.space[3], backgroundColor: theme.bg.canvas }}>
                <GlassBackdrop strong />
                <Grad colors={theme.gradients.statBrand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                    <Grad colors={theme.gradients.brandStrong} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                    <Crown size={20} color={theme.primaryText} />
                  </View>
                  <Text style={{ color: theme.text.primary, fontSize: theme.font.h3, fontWeight: "800" }}>JournalX Pro</Text>
                  <View style={{ marginLeft: "auto" }}><Badge tone="brand">MOST POPULAR</Badge></View>
                </View>
                <Text style={{ color: theme.text.primary, fontSize: theme.font.h1, fontWeight: "800" }}>
                  {offering?.priceString || (loadingOffer ? "…" : "—")}
                  <Text style={{ color: theme.text.muted, fontSize: theme.font.body, fontWeight: "400" }}>  / month</Text>
                </Text>
                <View style={{ gap: 10, marginTop: 4 }}>
                  {PRO_FEATURES.map((f) => (
                    <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Check size={16} color={theme.success} />
                      <Text style={{ color: theme.text.secondary, fontSize: theme.font.body }}>{f}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Grad>

            {available ? (
              <>
                <Button
                  title={offering ? "Subscribe with Google Play" : "Plan unavailable"}
                  onPress={subscribe}
                  loading={busy}
                  disabled={!offering}
                />
                <Button title="Restore purchases" variant="ghost" onPress={restore} disabled={busy} />
                <Muted style={{ textAlign: "center", fontSize: theme.font.caption }}>
                  Billed through Google Play. Cancel anytime in the Play Store.
                </Muted>
              </>
            ) : (
              <Card flat>
                <Muted>
                  In-app purchases need the installed app build (not Expo Go). Run a dev/production
                  build to subscribe via Google Play.
                </Muted>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
    </GradientBackground>
  );
}
