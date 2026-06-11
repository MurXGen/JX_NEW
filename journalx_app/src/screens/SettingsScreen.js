import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Moon, Sun } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { Card, H1, Muted, Badge, Button } from "../components/ui";

function Row({ label, children }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 }}>
      <Text style={{ color: theme.text.secondary, fontSize: theme.font.body }}>{label}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const { theme, mode, toggleTheme } = useTheme();
  const { userData, subscription, logout } = useApp();

  const planLabel =
    subscription.status === "active"
      ? subscription.plan === "lifetime"
        ? "Lifetime"
        : "Pro"
      : "Free";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.canvas }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: theme.space[5], gap: theme.space[4] }}>
        <H1>Settings</H1>

        {/* Profile */}
        <Card>
          <Text style={{ color: theme.text.primary, fontWeight: "700", fontSize: theme.font.title }}>
            {userData?.name || "User"}
          </Text>
          <Muted>{userData?.email || ""}</Muted>
        </Card>

        {/* Subscription status (from the user data we already have) */}
        <Card>
          <Text style={{ color: theme.text.primary, fontWeight: "700", fontSize: theme.font.title, marginBottom: 8 }}>
            Subscription
          </Text>
          <Row label="Current plan">
            <Badge tone={subscription.isPro ? "brand" : "neutral"}>{planLabel}</Badge>
          </Row>
          <Row label="Status">
            <Badge tone={subscription.status === "active" ? "success" : "neutral"}>
              {subscription.status}
            </Badge>
          </Row>
          {subscription.expiresAt && (
            <Row label={subscription.plan === "lifetime" ? "Access" : "Renews / expires"}>
              <Muted>
                {subscription.plan === "lifetime"
                  ? "Forever"
                  : subscription.expiresAt.toLocaleDateString()}
              </Muted>
            </Row>
          )}
          <Button
            title={subscription.isPro ? "Manage subscription" : "Upgrade to Pro"}
            style={{ marginTop: 8 }}
            onPress={() => navigation.navigate("Upgrade")}
          />
        </Card>

        {/* Appearance */}
        <Card>
          <Text style={{ color: theme.text.primary, fontWeight: "700", fontSize: theme.font.title, marginBottom: 4 }}>
            Appearance
          </Text>
          <Row label={`Theme · ${mode}`}>
            <Button
              title={mode === "dark" ? "Light" : "Dark"}
              variant="outline"
              icon={mode === "dark" ? Sun : Moon}
              onPress={toggleTheme}
            />
          </Row>
        </Card>

        <Button title="Log out" variant="danger" onPress={logout} />
      </ScrollView>
    </SafeAreaView>
  );
}
