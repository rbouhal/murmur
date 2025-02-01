import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, BackHandler, Platform, Linking } from "react-native"; // Add Linking and Platform
import Ionicons from 'react-native-vector-icons/Ionicons'; // Change icon library
import Home from '../pages/Home';
import Contacts from '../pages/Contacts';
import SearchBar from './SearchBar';
import CustomText from './CustomText';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();

export default function FooterNavigator({ navigation }) {
  const { theme } = useTheme();
  const [searchText, setSearchText] = useState('');

  const commonTabBarStyle = {
    backgroundColor: theme.background,
    borderTopColor: theme.background,
    paddingTop: 5,
  };

  const commonHeaderStyle = {
    backgroundColor: theme.background,
    borderBottomColor: theme.background,
    height: 90,
  };

  const iconMap = {
    // Change here https://oblador.github.io/react-native-vector-icons/#:~:text=zoom%2Dout-,Ionicons,-%EE%A8%81
    Home: 'home',
    Contacts: 'people-sharp',
    Exit: 'heart-sharp'
  };

  const screenOptions = ({ route }) => ({
    headerStyle: { backgroundColor: theme.background },
    headerShadowVisible: false,
    headerTitleAlign: "left",
    headerTitle:
      route.name === 'Contacts'
        ? () => <SearchBar theme={theme} setSearchText={setSearchText} />
        : () => (
          <CustomText
            style={{ fontSize: 30, color: theme.primary }}
            font="CustomFont"
          >
            murmur
          </CustomText>
        ),
    headerRight: () => {
      if (route.name === 'Home') {
        return (
          <Ionicons
            name="settings-outline"
            size={24}
            color={theme.text}
            style={{ paddingRight: 15 }}
            onPress={() => navigation.navigate('Settings')}
          />
        );
      }
      else if (route.name === 'Contacts') {
        return (
          <Ionicons
            name="person-add-sharp"
            size={24}
            color={theme.text}
            style={{ paddingRight: 15 }}
            onPress={() => navigation.navigate('AddContacts')}
          />
        );
      }
      else {
        return null;
      }
    },
    tabBarIcon: ({ color, size }) => (
      <Ionicons name={iconMap[route.name]} size={size} color={color} />
    ),
    tabBarStyle: {
      backgroundColor: theme.background,
      borderTopColor: theme.background,
      paddingTop: 5,
    },
    tabBarActiveTintColor: theme.primary,
    tabBarInactiveTintColor: theme.secondary,
  });


  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen
        name="Exit"
        component={View} // Use an empty View as a placeholder
        listeners={{
          tabPress: (e) => {
            e.preventDefault(); // Prevent default navigation
            if (Platform.OS === 'android') {
              BackHandler.exitApp(); // Exit the app on Android
            } else if (Platform.OS === 'ios') {
              // Attempt to redirect to photos app (workaround for iOS)
              Linking.openURL('weather://').catch(() => {
                Alert.alert('Unable to minimize the app');
              });
            }
          },
        }}
      />
      <Tab.Screen name="Contacts">
        {() => <Contacts searchText={searchText} />}
      </Tab.Screen>

    </Tab.Navigator>
  );
}
