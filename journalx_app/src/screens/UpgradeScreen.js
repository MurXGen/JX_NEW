import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, Crown, X } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { Button, Card, H1, Muted, Badge, Toast } from "../components/ui";
import {
  isPurchasesAvailable,
  getProOffering,
  purchasePro,
  restorePurchases,
} from "../lib/purchases";

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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.canvas }}>
      <Toast toast={toast} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: theme.space[5] }}>
        <H1>Upgrade</H1>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <X size={24} color={theme.text.muted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.space[5], paddingTop: 0, gap: theme.space[4] }}>
        {subscription.isPro ? (
          <Card style={{ alignItems: "center", gap: 8 }}>
            <Crown size={30} color={theme.yellow[400]} />
            <Text style={{ color: theme.text.primary, fontSize: theme.font.h3, fontWeight: "700" }}>
              You&apos;re on {subscription.plan === "lifetime" ? "Lifetime" : "Pro"}
            </Text>
            <Badge tone="success">{subscription.status}</Badge>
            {subscription.expiresAt && subscription.plan !== "lifetime" && (
              <Muted>Renews / expires {subscription.expiresAt.toLocaleDateString()}</Muted>
            )}
            {subscription.source === "paddle" && (
              <Muted>Managed on the web (Paddle) — manage it there.</Muted>
            )}
          </Card>
        ) : (
          <>
            <Card style={{ gap: theme.space[3] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Crown size={22} color={theme.yellow[400]} />
                <Text style={{ color: theme.text.primary, fontSize: theme.font.h3, fontWeight: "800" }}>JournalX Pro</Text>
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
            </Card>

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
  );
}
