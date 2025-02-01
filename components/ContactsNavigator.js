import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import Contacts from "../pages/Contacts";
import AddContacts from "../pages/AddContacts";

const Stack = createStackNavigator();

export default function ContactsNavigator() {
  return (
    <Stack.Navigator>
      {/* Contacts Screen */}
      <Stack.Screen
        name="ContactsMain"
        component={Contacts}
        options={{
          headerStyle: { backgroundColor: "#f5f5f5" },
          headerTitleAlign: "left",
          headerTitle: "Contacts",
        }}
      />
      {/* AddContacts Screen */}
      <Stack.Screen
        name="AddContacts"
        component={AddContacts}
        options={{
          headerStyle: { backgroundColor: "#f5f5f5" },
          headerTitleAlign: "left",
          headerTitle: "Search Contacts",
        }}
      />
    </Stack.Navigator>
  );
}
