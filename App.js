import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import HeaderNavigator from './components/HeaderNavigator';
import { ThemeProvider } from './context/ThemeContext';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { FontContext } from './context/FontContext';
import LoginScreen from './pages/LoginScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();

        // Load fonts
        await Font.loadAsync({
          'CustomFont': require('./assets/fonts/Alkia.ttf'),
        });

        setFontsLoaded(true);

        setTimeout(async () => {
          await SplashScreen.hideAsync();
        }, 1000);
      } catch (e) {
        console.error('Error loading resources:', e);
      }
    };

    prepareApp();
  }, []);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const loginStatus = await AsyncStorage.getItem('isLoggedIn');
        setIsLoggedIn(loginStatus === 'true');
      } catch (error) {
        console.error('Error checking login status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('isLoggedIn');
      setIsLoggedIn(false); // Reset login state
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (!fontsLoaded) {
    return null; // display splash until fonts loaded
  }

  return (
    <ThemeProvider>
      <FontContext.Provider value={{ CustomFont: 'CustomFont' }}>
        {/* Wrap the whole app in UserProvider */}
        <NavigationContainer>
          {isLoggedIn ? (
            <HeaderNavigator onLogout={handleLogout} />
          ) : (
            <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />
          )}
        </NavigationContainer>
      </FontContext.Provider>
    </ThemeProvider>
  );
}
