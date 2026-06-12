import React from "react";
import { Pressable, View, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme, DarkTheme, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { CandlestickChart, LayoutDashboard, ListChecks, Settings as SettingsIcon, Zap } from "lucide-react-native";

import { useApp } from "../context/AppContext";
import { useTheme } from "../theme/ThemeProvider";
import { Grad, GlassBackdrop } from "../components/ui";
import LoginScreen from "../screens/LoginScreen";
import OverviewScreen from "../screens/OverviewScreen";
import TradesScreen from "../screens/TradesScreen";
import MarketsScreen from "../screens/MarketsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import LogTradeScreen from "../screens/LogTradeScreen";
import TradeDetailsScreen from "../screens/TradeDetailsScreen";
import UpgradeScreen from "../screens/UpgradeScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/* center quick-log FAB (thunder), raised above the bar — brand gradient + glow */
function QuickFab() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Pressable
        onPress={() => navigation.navigate("LogTrade")}
        style={{
          width: 56, height: 56, borderRadius: 28, marginTop: -22,
          alignItems: "center", justifyContent: "center", overflow: "hidden",
          shadowColor: theme.primary, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10,
          borderWidth: 2, borderColor: theme.glass.border,
        }}
      >
        <Grad colors={theme.gradients.brandStrong} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={StyleSheet.absoluteFill} />
        <Zap size={24} color={theme.primaryText} fill={theme.primaryText} />
      </Pressable>
    </View>
  );
}

/* frosted glass backdrop behind the floating tab bar */
function TabBarGlass() {
  const { theme } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      <GlassBackdrop strong />
      <Grad
        colors={[theme.glass.highlight, "rgba(255,255,255,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5 }}
      />
    </View>
  );
}

/* active tab icon sits on a soft brand-gradient pill */
function TabIcon({ Icon, color, focused, theme }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 44, height: 28, borderRadius: 14, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        {focused && (
          <Grad
            colors={theme.gradients.statBrand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
        )}
        <Icon size={focused ? 23 : 21} color={color} />
      </View>
    </View>
  );
}

function AppTabs() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const barHeight = 58 + insets.bottom;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.yellow[400],
        tabBarInactiveTintColor: theme.text.muted,
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "transparent",
          borderTopColor: theme.glass.border,
          borderTopWidth: 1,
          height: barHeight,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          elevation: 0,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarBackground: () => <TabBarGlass />,
        tabBarLabelStyle: {
          fontFamily: "Poppins_500Medium",
          fontSize: 11,
          marginTop: 2,
        },
        tabBarIconStyle: { marginTop: 2 },
        tabBarIcon: ({ color, focused }) => {
          const map = {
            Overview: LayoutDashboard,
            Trades: ListChecks,
            Markets: CandlestickChart,
            Settings: SettingsIcon,
          };
          const Icon = map[route.name] || LayoutDashboard;
          return <TabIcon Icon={Icon} color={color} focused={focused} theme={theme} />;
        },
      })}
    >
      <Tab.Screen name="Overview" component={OverviewScreen} />
      <Tab.Screen name="Trades" component={TradesScreen} />
      <Tab.Screen
        name="Quick"
        component={OverviewScreen}
        options={{ tabBarButton: () => <QuickFab />, tabBarLabel: () => null }}
      />
      <Tab.Screen name="Markets" component={MarketsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { booting, isAuthed } = useApp();
  const { theme, mode } = useTheme();

  const navTheme = mode === "dark" ? DarkTheme : DefaultTheme;
  navTheme.colors.background = theme.bg.canvas;

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg.canvas }}>
        <ActivityIndicator color={theme.yellow[400]} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthed ? (
          <>
            <Stack.Screen name="App" component={AppTabs} />
            <Stack.Screen
              name="LogTrade"
              component={LogTradeScreen}
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="TradeDetails"
              component={TradeDetailsScreen}
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="Upgrade"
              component={UpgradeScreen}
              options={{ presentation: "modal" }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
