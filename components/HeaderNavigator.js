import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import Settings from "../pages/Settings";
import AddContacts from "../pages/AddContacts";
import FooterNavigator from "./FooterNavigator";
import { useTheme } from "../context/ThemeContext";

const Stack = createStackNavigator();

export default function HeaderNavigator({ onLogout }) {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
          borderBottomColor: theme.background,
          height: 90,
        },
        headerTintColor: theme.primary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Back" component={FooterNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Settings">
        {props => <Settings {...props} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen name="AddContacts" component={AddContacts} options={{ headerTitle: '' }} />
    </Stack.Navigator>
  );
}
