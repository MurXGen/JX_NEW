import React from "react";
import { View, Text as RNText } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from "@expo-google-fonts/poppins";

import { ThemeProvider } from "./src/theme/ThemeProvider";
import { AppProvider } from "./src/context/AppContext";
import RootNavigator from "./src/navigation/RootNavigator";

// make Poppins the default font for every <Text> (per-component weights still
// override via their own fontFamily).
RNText.defaultProps = RNText.defaultProps || {};
RNText.defaultProps.style = [{ fontFamily: "Poppins_400Regular" }];

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#0d1117" }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </AppProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
