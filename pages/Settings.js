import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import CustomCard from '../components/CustomCard';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function Settings({ onLogout }) {
  const { theme, toggleTheme } = useTheme();
  const [isDarkMode, setIsDarkMode] = React.useState(theme.background === '#0B0812');
  const styles = getStyles(theme);
  const [userName, setUserName] = useState('');
  // Sync switch state with the current theme
  useEffect(() => {
    setIsDarkMode(theme.background === '#0B0812');
  }, [theme]);

  const handleToggle = () => {
    toggleTheme(); // Change the theme
  };

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const name = await AsyncStorage.getItem('userName');
        setUserName(name || 'User');
      } catch (error) {
        console.error('Error fetching user name:', error);
        setUserName('User');
      }
    };

    fetchUserName();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.setItem('isLoggedIn', 'false');
      onLogout();
      // Optionally reload the app or navigate to the login screen
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };


  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false} // Optional: hides vertical scroll indicator
    >
      {/* Your Name Card */}
      <CustomCard>
        <View style={styles.headerContainer}>
          <Text style={styles.cardTitle}>
            About
          </Text>
        </View>
        <View style={[styles.permissionRow, styles.spaceAround]}>
          <View style={styles.primaryTextColorIcon}>
            <Ionicons name='person-outline' size={23} style={styles.primaryTextColorIcon} />
            <Text style={styles.permissionText}>
              Welcome, {userName || 'User'}!
            </Text>
          </View>
        </View>
      </CustomCard>

      {/* Display Settings Card */}
      <CustomCard>
        <View style={styles.headerContainer}>
          <Text style={styles.cardTitle}>
            Display
          </Text>
        </View>
        <View style={[styles.permissionRow, styles.spaceAround]}>
          <View style={styles.primaryTextColorIcon}>
            <Ionicons name={isDarkMode ? 'moon-sharp' : 'sunny-outline'} size={33} style={styles.primaryTextColorIcon} />
            <Text style={styles.permissionText}>
              {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={handleToggle}
            thumbColor={theme.primary}
            trackColor={{ false: theme.primary, true: theme.primary }}
          />
        </View>
      </CustomCard>

      {/* Logout Card */}
      <CustomCard>
        <View style={styles.headerContainer}>
          <Text style={styles.cardTitle}>
            We hate to see you go!
          </Text>
        </View>
        <View style={[styles.buttonContainer]}>
          <TouchableOpacity style={styles.button} onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </CustomCard>
    </ScrollView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      margin: 0,
      flex: 1,
      backgroundColor: theme.background,
      padding: 5,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: 15
    },
    permissionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      paddingBottom: 10,
    },
    cardTitle: {
      fontWeight: "bold",
      fontSize: 18,
      color: theme.text,
    },
    primaryTextColorIcon: {
      color: theme.text,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10
    },
    spaceAround: {
      justifyContent: 'space-between',
      marginHorizontal: 20
    },
    permissionText: {
      fontSize: 16,
      color: theme.text,
    },
    buttonContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },
    button: {
      backgroundColor: theme.background, // Custom background color (e.g., red-orange)
      borderRadius: 30,
      paddingVertical: 10,
      width: 200,
      alignItems: 'center',
    },
    buttonText: {
      color: theme.secondary,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
