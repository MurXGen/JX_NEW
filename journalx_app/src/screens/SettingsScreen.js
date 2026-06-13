import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, ChevronRight, Crown, LifeBuoy, Moon, Pencil, Plus, Sun, Wallet, X } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { Card, H1, Muted, Badge, Button, Toast, Grad, GlassBackdrop, SectionLabel } from "../components/ui";
import GradientBackground from "../components/GradientBackground";
import { AnimatedProgress } from "../components/charts";
import SupportModal from "../components/SupportModal";
import { font } from "../theme/typography";
import { createAccount, updateAccount } from "../api/account";
import { updateProfile } from "../api/auth";
import { apiErrorMessage } from "../lib/error";
import { currencySymbol, money } from "../lib/format";
import { getPlanLimits, tradesThisMonth } from "../lib/planLimits";

const CURRENCIES = ["USD", "USDT", "INR", "EUR", "GBP"];

function Row({ label, children }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 }}>
      <Text style={{ color: theme.text.secondary, fontSize: theme.font.body }}>{label}</Text>
      {children}
    </View>
  );
}

function LimitBar({ label, used, max, theme }) {
  const unlimited = max === Infinity;
  const pct = unlimited ? 0 : Math.min(1, used / Math.max(1, max));
  const near = !unlimited && pct >= 0.8;
  const color = unlimited ? theme.success : near ? theme.danger : theme.primary;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: theme.text.secondary, fontSize: theme.font.small }}>{label}</Text>
        <Text style={{ color: theme.text.primary, fontFamily: font(600), fontSize: theme.font.small }}>
          {unlimited ? `${used} · Unlimited` : `${used} / ${max}`}
        </Text>
      </View>
      <AnimatedProgress pct={unlimited ? 100 : pct * 100} color={color} height={7} />
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const { theme, mode, toggleTheme } = useTheme();
  const { userData, subscription, logout, accounts, currentAccount, selectAccount, applyUserData } = useApp();

  // current balance per journal = starting balance + realised P&L of its trades
  const balanceFor = (acc) => {
    const start = acc?.startingBalance?.amount || 0;
    const pnl = (userData?.trades || [])
      .filter((tr) => tr.accountId === acc._id)
      .reduce((sx, tr) => sx + (Number(tr.pnl) || 0), 0);
    return start + pnl;
  };

  const [toast, setToast] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [editingAcct, setEditingAcct] = useState(null); // null = create, else edit
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [balance, setBalance] = useState("");
  const [creating, setCreating] = useState(false);
  const flash = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  const openNew = () => {
    setEditingAcct(null); setName(""); setCurrency("USD"); setBalance(""); setShowCreate(true);
  };
  const openEdit = (a) => {
    setEditingAcct(a);
    setName(a.name || "");
    setCurrency(a.currency || "USD");
    setBalance(String(a.startingBalance?.amount ?? 0));
    setShowCreate(true);
  };

  // editable profile name
  const [editingName, setEditingName] = useState(false);
  const [profileName, setProfileName] = useState(userData?.name || "");
  const [savingName, setSavingName] = useState(false);
  const saveName = async () => {
    const next = profileName.trim();
    if (!next) return flash("danger", "Name can't be empty");
    setSavingName(true);
    try {
      await updateProfile(next);
      applyUserData({ ...(userData || {}), name: next });
      setEditingName(false);
      flash("success", "Profile updated");
    } catch (e) {
      flash("danger", apiErrorMessage(e));
    } finally {
      setSavingName(false);
    }
  };

  const planLabel = subscription.status === "active" ? (subscription.plan === "lifetime" ? "Lifetime" : "Pro") : "Free";

  // subscription usage vs limits
  const limits = getPlanLimits(subscription);
  const usedTrades = tradesThisMonth(userData?.trades || []);
  const usedJournals = accounts.length;
  const initials = (userData?.name || userData?.email || "U").trim().charAt(0).toUpperCase();

  const save = async () => {
    if (!name.trim()) return flash("danger", "Enter a journal name");
    const bal = Number(balance) || 0;
    setCreating(true);
    try {
      if (editingAcct) {
        const res = await updateAccount(editingAcct._id, name.trim(), currency, bal);
        if (res?.userData) applyUserData(res.userData);
        flash("success", "Journal updated");
      } else {
        const res = await createAccount(name.trim(), currency, bal);
        if (res?.userData) {
          applyUserData(res.userData);
          const created = (res.userData.accounts || []).find((a) => a.name === name.trim());
          if (created) selectAccount(created._id);
        }
        flash("success", "Journal created");
      }
      setTimeout(() => setShowCreate(false), 400);
    } catch (e) {
      flash("danger", apiErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <GradientBackground>
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <Toast toast={toast} />
      <ScrollView contentContainerStyle={{ padding: theme.space[5], gap: theme.space[4], paddingBottom: 120 }}>
        <H1>Settings</H1>

        {/* Profile */}
        <SectionLabel>Account</SectionLabel>
        <Card style={{ marginTop: -theme.space[2] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, overflow: "hidden", alignItems: "center", justifyContent: "center", shadowColor: theme.primary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
              <Grad colors={theme.gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
              <Text style={{ color: theme.primaryText, fontFamily: font(700), fontSize: 24 }}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              {editingName ? (
                <View style={{ backgroundColor: theme.glass.input, borderColor: theme.glass.border, borderWidth: 1, borderRadius: theme.radius.md }}>
                  <TextInput
                    value={profileName}
                    onChangeText={setProfileName}
                    placeholder="Your name"
                    placeholderTextColor={theme.text.muted}
                    autoFocus
                    style={{ color: theme.text.primary, fontFamily: font(600), paddingVertical: 9, paddingHorizontal: 12 }}
                  />
                </View>
              ) : (
                <Text style={{ color: theme.text.primary, fontFamily: font(700), fontSize: theme.font.title }}>{userData?.name || "User"}</Text>
              )}
              <Muted>{userData?.email || ""}</Muted>
            </View>
            {editingName ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => { setEditingName(false); setProfileName(userData?.name || ""); }} hitSlop={8} style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: theme.bg.muted, alignItems: "center", justifyContent: "center" }}>
                  <X size={18} color={theme.text.muted} />
                </Pressable>
                <Pressable onPress={saveName} disabled={savingName} hitSlop={8} style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center", opacity: savingName ? 0.7 : 1 }}>
                  {savingName ? <ActivityIndicator size="small" color={theme.primaryText} /> : <Check size={18} color={theme.primaryText} />}
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => { setProfileName(userData?.name || ""); setEditingName(true); }} hitSlop={8} style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: theme.bg.muted, alignItems: "center", justifyContent: "center" }}>
                <Pencil size={16} color={theme.text.secondary} />
              </Pressable>
            )}
          </View>
        </Card>

        {/* Journals */}
        <SectionLabel>Journals</SectionLabel>
        <Card style={{ marginTop: -theme.space[2] }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.space[2] }}>
            <Text style={{ color: theme.text.primary, fontFamily: font(700), fontSize: theme.font.title }}>Journals</Text>
            <Pressable onPress={openNew} style={{ flexDirection: "row", alignItems: "center", gap: 5, borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 7, overflow: "hidden" }}>
              <Grad colors={theme.gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
              <Plus size={15} color={theme.primaryText} />
              <Text style={{ color: theme.primaryText, fontFamily: font(700), fontSize: theme.font.small }}>New</Text>
            </Pressable>
          </View>
          {accounts.length === 0 && <Muted>No journals yet — create your first.</Muted>}
          {accounts.map((a) => {
            const active = a._id === currentAccount?._id;
            return (
              <Pressable key={a._id} onPress={() => { selectAccount(a._id); flash("success", `Switched to ${a.name}`); }}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomColor: theme.border, borderBottomWidth: 1 }}>
                <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: active ? theme.primarySubtle : theme.bg.muted, alignItems: "center", justifyContent: "center" }}>
                  <Wallet size={15} color={active ? theme.yellow[500] : theme.text.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text.primary, fontFamily: font(600), fontSize: theme.font.body }}>{a.name}</Text>
                  <Text style={{ color: theme.text.muted, fontSize: theme.font.caption }}>
                    {a.currency || "USD"} · Balance {currencySymbol(a.currency)}{Math.abs(balanceFor(a)).toLocaleString()}
                  </Text>
                </View>
                {active ? <Check size={18} color={theme.success} /> : <Text style={{ color: theme.accent.text, fontFamily: font(600), fontSize: theme.font.small }}>Switch</Text>}
                <Pressable onPress={() => openEdit(a)} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: theme.bg.muted, alignItems: "center", justifyContent: "center", marginLeft: 4 }}>
                  <Pencil size={15} color={theme.text.secondary} />
                </Pressable>
              </Pressable>
            );
          })}
        </Card>

        {/* Subscription */}
        <SectionLabel>Plan & billing</SectionLabel>
        <Card style={{ marginTop: -theme.space[2] }}>
          <Text style={{ color: theme.text.primary, fontFamily: font(700), fontSize: theme.font.title, marginBottom: 8 }}>Subscription</Text>
          <Row label="Current plan"><Badge tone={subscription.isPro ? "brand" : "neutral"}>{planLabel}</Badge></Row>
          <Row label="Status"><Badge tone={subscription.status === "active" ? "success" : "neutral"}>{subscription.status}</Badge></Row>
          {subscription.expiresAt && (
            <Row label={subscription.plan === "lifetime" ? "Access" : "Renews / expires"}>
              <Muted>{subscription.plan === "lifetime" ? "Forever" : subscription.expiresAt.toLocaleDateString()}</Muted>
            </Row>
          )}

          {/* Plan limits with progress bars */}
          <View style={{ marginTop: theme.space[3], paddingTop: theme.space[3], borderTopColor: theme.border, borderTopWidth: 1, gap: theme.space[3] }}>
            <Text style={{ color: theme.text.secondary, fontFamily: font(600), fontSize: theme.font.small }}>Plan limits</Text>
            <LimitBar label="Trades this month" used={usedTrades} max={limits.tradesPerMonth} theme={theme} />
            <LimitBar label="Journals" used={usedJournals} max={limits.journals} theme={theme} />
            <Row label="Screenshots per trade"><Muted>{limits.imagesPerTrade === Infinity ? "Unlimited" : `Up to ${limits.imagesPerTrade}`}</Muted></Row>
            {!subscription.isPro && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: theme.radius.md, padding: 10, overflow: "hidden", borderWidth: 1, borderColor: theme.accent.border }}>
                <Grad colors={theme.gradients.statBrand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                <Crown size={16} color={theme.accent.text} />
                <Text style={{ flex: 1, color: theme.text.secondary, fontSize: theme.font.caption }}>Upgrade to Pro for unlimited trades, journals & screenshots.</Text>
              </View>
            )}
          </View>

          <Button title={subscription.isPro ? "Manage subscription" : "Upgrade to Pro"} style={{ marginTop: 8 }} onPress={() => navigation.navigate("Upgrade")} />
        </Card>

        {/* Appearance */}
        <SectionLabel>Preferences</SectionLabel>
        <Card style={{ marginTop: -theme.space[2] }}>
          <Text style={{ color: theme.text.primary, fontFamily: font(700), fontSize: theme.font.title, marginBottom: 4 }}>Appearance</Text>
          <Row label={`Theme · ${mode}`}>
            <Button title={mode === "dark" ? "Light" : "Dark"} variant="outline" icon={mode === "dark" ? Sun : Moon} onPress={toggleTheme} />
          </Row>
        </Card>

        {/* Help & feedback */}
        <Card>
          <Text style={{ color: theme.text.primary, fontFamily: font(700), fontSize: theme.font.title, marginBottom: 4 }}>Help</Text>
          <Pressable onPress={() => setShowSupport(true)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, opacity: pressed ? 0.6 : 1 })}>
            <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: theme.primarySubtle, alignItems: "center", justifyContent: "center" }}>
              <LifeBuoy size={17} color={theme.yellow[500]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text.primary, fontFamily: font(600), fontSize: theme.font.body }}>Support & feedback</Text>
              <Text style={{ color: theme.text.muted, fontSize: theme.font.caption }}>Questions, bugs or ideas — we read every message.</Text>
            </View>
            <ChevronRight size={18} color={theme.text.muted} />
          </Pressable>
        </Card>

        <Button title="Log out" variant="danger" onPress={logout} />
      </ScrollView>

      <SupportModal
        visible={showSupport}
        onClose={() => setShowSupport(false)}
        user={userData}
        plan={subscription.isPro ? (subscription.plan === "lifetime" ? "lifetime" : "pro") : "free"}
      />

      {/* Create journal modal — frosted glass sheet */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => !creating && setShowCreate(false)}>
        <Pressable onPress={() => !creating && setShowCreate(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: theme.glass.border, padding: theme.space[5], paddingBottom: theme.space[8], gap: theme.space[4] }}>
            <GlassBackdrop strong />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: font(700), fontSize: theme.font.title, color: theme.text.primary }}>{editingAcct ? "Edit journal" : "New journal"}</Text>
              <Pressable onPress={() => !creating && setShowCreate(false)} hitSlop={10}><X size={22} color={theme.text.muted} /></Pressable>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ color: theme.text.secondary, fontSize: theme.font.small, fontFamily: font(500) }}>Name</Text>
              <View style={{ backgroundColor: theme.glass.input, borderColor: theme.glass.border, borderWidth: 1, borderRadius: theme.radius.md }}>
                <TextInput value={name} onChangeText={setName} placeholder="e.g. Crypto swing" placeholderTextColor={theme.text.muted} style={{ color: theme.text.primary, fontFamily: font(500), paddingVertical: 12, paddingHorizontal: 14 }} />
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ color: theme.text.secondary, fontSize: theme.font.small, fontFamily: font(500) }}>Base currency</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {CURRENCIES.map((c) => {
                  const active = currency === c;
                  return (
                    <Pressable key={c} onPress={() => setCurrency(c)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, backgroundColor: active ? theme.primary : theme.bg.muted, borderColor: active ? theme.primary : theme.border }}>
                      <Text style={{ fontFamily: font(600), fontSize: theme.font.small, color: active ? theme.primaryText : theme.text.secondary }}>{c}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ color: theme.text.secondary, fontSize: theme.font.small, fontFamily: font(500) }}>Starting balance ({currencySymbol(currency)})</Text>
              <View style={{ backgroundColor: theme.glass.input, borderColor: theme.glass.border, borderWidth: 1, borderRadius: theme.radius.md }}>
                <TextInput value={balance} onChangeText={(v) => setBalance(v.replace(/[^0-9.]/g, ""))} placeholder="0" keyboardType="numbers-and-punctuation" placeholderTextColor={theme.text.muted} style={{ color: theme.text.primary, fontFamily: font(500), paddingVertical: 12, paddingHorizontal: 14 }} />
              </View>
              {editingAcct && <Text style={{ color: theme.text.muted, fontSize: theme.font.caption }}>Changing the starting balance adjusts your journal balance; it doesn&apos;t alter logged trades.</Text>}
            </View>
            <Pressable onPress={save} disabled={creating} style={{ borderRadius: theme.radius.md, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, opacity: creating ? 0.7 : 1, overflow: "hidden" }}>
              <Grad colors={theme.gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
              {creating && <ActivityIndicator size="small" color={theme.primaryText} />}
              <Text style={{ color: theme.primaryText, fontFamily: font(700), fontSize: theme.font.bodyMd }}>{creating ? "Saving…" : editingAcct ? "Save changes" : "Create journal"}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
    </GradientBackground>
  );
}
