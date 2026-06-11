import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { LayoutDashboard, ListChecks, Settings as SettingsIcon } from "lucide-react-native";

import { useApp } from "../context/AppContext";
import { useTheme } from "../theme/ThemeProvider";
import LoginScreen from "../screens/LoginScreen";
import OverviewScreen from "../screens/OverviewScreen";
import TradesScreen from "../screens/TradesScreen";
import SettingsScreen from "../screens/SettingsScreen";
import LogTradeScreen from "../screens/LogTradeScreen";
import TradeDetailsScreen from "../screens/TradeDetailsScreen";
import UpgradeScreen from "../screens/UpgradeScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AppTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.yellow[400],
        tabBarInactiveTintColor: theme.text.muted,
        tabBarStyle: {
          backgroundColor: theme.bg.surface,
          borderTopColor: theme.border,
        },
        tabBarIcon: ({ color, size }) => {
          const Icon =
            route.name === "Overview"
              ? LayoutDashboard
              : route.name === "Trades"
                ? ListChecks
                : SettingsIcon;
          return <Icon size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Overview" component={OverviewScreen} />
      <Tab.Screen name="Trades" component={TradesScreen} />
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
