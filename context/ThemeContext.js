import React, { createContext, useState, useContext, useEffect } from 'react';
import { StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

const lightTheme = {
  background: '#EAE3ED',
  text: '#583F98',
  primary: '#815ac0',
  secondary: '#b185db',
  statusBarStyle: 'dark-content', // IOS Status bar style for light theme
  cardBackground: '#FBF9FC'
};

const darkTheme = {
  background: '#0B0812',
  text: '#F9EDFF',
  primary: '#b185db',
  secondary: '#d2b7e5',
  statusBarStyle: 'light-content', // IOS Status bar style for dark theme
  cardBackground: '#302450'
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(lightTheme);
  const themeKey = 'userTheme';

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === lightTheme ? darkTheme : lightTheme));
  };

  // Load theme from AsyncStorage when the app starts
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(themeKey);
        if (storedTheme) {
          setTheme(storedTheme === 'dark' ? darkTheme : lightTheme);
        }
      } catch (error) {
        console.error('Error loading theme from AsyncStorage:', error);
      }
    };

    loadTheme();
  }, []);

  // Save theme to AsyncStorage whenever it changes
  useEffect(() => {
    const saveTheme = async () => {
      try {
        const themeName = theme === darkTheme ? 'dark' : 'light';
        await AsyncStorage.setItem(themeKey, themeName);
        StatusBar.setBarStyle(theme.statusBarStyle); // Update the status bar
      } catch (error) {
        console.error('Error saving theme to AsyncStorage:', error);
      }
    };

    saveTheme();
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
