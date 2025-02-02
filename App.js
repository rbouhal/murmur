import React, { useState, useEffect, Suspense } from "react";
import { NavigationContainer } from "@react-navigation/native";
import HeaderNavigator from "./components/HeaderNavigator";
import { ThemeProvider } from "./context/ThemeContext";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import { ActivityIndicator, Text, View } from "react-native";
import { FontContext } from "./context/FontContext";
import LoginScreen from "./pages/LoginScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SQLiteProvider } from "expo-sqlite";
import { loadDatabase } from "./services/database";
import { AuthProvider } from "./providers/AuthProvider";
import { loadModels, unloadModels } from "./services/network";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
        
        // Load database
        await loadDatabase();
        setDbLoaded(true);

        // Load fonts
        await Font.loadAsync({
          CustomFont: require("./assets/fonts/Alkia.ttf"),
        });
        setFontsLoaded(true);

        // Load Vosk models
        const response = await loadModels();
        if (response && response.message === "Models loaded successfully.") {
          setModelsLoaded(true);
        } else {
          setModelsLoaded(false);
          throw new Error("Failed to load models.");
        }

        // Hide splash screen only when all resources are ready
        await SplashScreen.hideAsync();
      } catch (e) {
        console.error("Error initializing app:", e);
      }
    };

    prepareApp();
  }, []);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const loginStatus = await AsyncStorage.getItem("isLoggedIn");
        setIsLoggedIn(loginStatus === "true");
      } catch (error) {
        console.error("Error checking login status:", error);
      }
    };

    checkLoginStatus();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("isLoggedIn");
      setIsLoggedIn(false); // Reset login state
      await unloadModels();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  if (!dbLoaded)
    return (
      <View style={{ flex: 1 }}>
        <ActivityIndicator size={"large"} />
        <Text>Loading Database...</Text>
      </View>
    );

  if (!fontsLoaded || !modelsLoaded) {
    return null; // display splash until fonts loaded
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <Suspense>
          <SQLiteProvider databaseName="mySQLiteDB.db" useSuspense>
            <FontContext.Provider value={{ CustomFont: "CustomFont" }}>
              {/* Wrap the whole app in UserProvider */}
              <NavigationContainer>
                {isLoggedIn ? (
                  <HeaderNavigator onLogout={handleLogout} />
                ) : (
                  <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />
                )}
              </NavigationContainer>
            </FontContext.Provider>
          </SQLiteProvider>
        </Suspense>
      </ThemeProvider>
    </AuthProvider>
  );
}
