import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import Contact from '../components/Contact';
import Ionicons from "react-native-vector-icons/Ionicons";

export default function AddContacts({ navigation }) {
  const { theme } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [priority, setPriority] = useState('Unset'); // Default priority
  const styles = getStyles(theme);

  // Helper function to format phone number
  const formatPhoneNumber = (input) => {
    // Remove all non-numeric characters
    const cleaned = input.replace(/\D/g, '');

    // Apply formatting based on the length of the cleaned input
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  // Handle phone number input change
  const handlePhoneNumberChange = (input) => {
    const formatted = formatPhoneNumber(input);
    setPhoneNumber(formatted);
  };


  // Save the contact to AsyncStorage
  const saveContact = async () => {

    const name = `${firstName} ${lastName}`.trim();

    if (!name || !phoneNumber) {
      Alert.alert('Error', 'Please fill out all fields');
      return;
    }

    const newContact = new Contact(Date.now().toString(), name, phoneNumber, priority);
    try {
      const existingContacts = JSON.parse(await AsyncStorage.getItem('murmur_contacts')) || {};
      existingContacts[newContact.id] = newContact;
      await AsyncStorage.setItem('murmur_contacts', JSON.stringify(existingContacts));

      // Reset fields after saving
      setFirstName('');
      setLastName('');
      setPhoneNumber('');
      setPriority('Unset');
      Alert.alert('Success', 'Contact added successfully!');
      navigation.goBack(); // Return to the contacts page
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag" // Dismiss keyboard on scroll
      >
        <View>
          <View style={styles.formContainer}>
            <Text style={[styles.heading, { color: theme.text }]}>Add Contact</Text>

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-evenly',

            }}>
              <View style={{ width: '50%' }}>
                <Text style={{ color: theme.text, fontWeight: "600", fontSize: 14, marginTop: 12, marginLeft: 5 }}>
                  First Name
                </Text>
                {/* Name Input */}
                <TextInput
                  style={[styles.inputContainer, { color: theme.text, marginRight: 5 }]}
                  placeholder="First Name"
                  placeholderTextColor={theme.secondary}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>

              <View style={{ width: '50%' }}>
                <Text style={{ color: theme.text, fontWeight: "600", fontSize: 14, marginTop: 12, marginLeft: 5 }}>
                  Last Name
                </Text>
                {/* Name Input */}
                <TextInput
                  style={[styles.inputContainer, { color: theme.text, marginLeft: 5 }]}
                  placeholder="Last Name"
                  placeholderTextColor={theme.secondary}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>

            </View>
            <View>
              <Text style={{ color: theme.text, fontWeight: "600", fontSize: 14, marginTop: 12, marginLeft: 5 }}>
                Phone Number
              </Text>
              {/* Phone Number Input with Icon */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="call-outline" // Replace with your desired icon
                  size={20}
                  color={theme.secondary}
                  style={styles.icon}
                />
                <TextInput
                  style={[{ color: theme.text }]}
                  placeholder="(555) 000 - 0000"
                  placeholderTextColor={theme.secondary}
                  value={phoneNumber}
                  onChangeText={handlePhoneNumberChange}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <View style={styles.hr} />
            {/* Priority Heading */}
            <Text style={[styles.heading, { color: theme.text }]}>Set Priority</Text>

            <View style={styles.priorityContainer}>
              {/* Red Flag Button */}
              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  priority === "Red Flag" && styles.priorityButtonPressed, // Apply pressed style
                ]}
                onPress={() => setPriority("Red Flag")}
                activeOpacity={0.7} // Add visual feedback on press
              >
                <Ionicons
                  name="flag-outline"
                  size={22}
                  style={styles.primaryTextColorIcon}
                />
                <Text style={styles.buttonText}>Red Flag</Text>
              </TouchableOpacity>

              {/* Emergency Button */}
              <TouchableOpacity
                style={[
                  styles.priorityButton,
                  priority === "Emergency" && styles.priorityButtonPressed, // Apply pressed style
                ]}
                onPress={() => setPriority("Emergency")}
                activeOpacity={0.7} // Add visual feedback on press
              >
                <Ionicons
                  name="warning-outline"
                  size={22}
                  style={styles.primaryTextColorIcon}
                />
                <Text style={styles.buttonText}>Emergency</Text>
              </TouchableOpacity>
            </View>

          </View>
          {/* Add Contact Button */}
          <TouchableOpacity style={styles.addButton} onPress={saveContact}>
            <View style={{ flexDirection: 'row' }}>
              <Ionicons
                name="add-outline"
                size={22}
                style={styles.addButtonText}
              />
              <Text style={styles.addButtonText}>Add</Text>
            </View>

          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView >
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'flex-start',
      padding: 20,
      paddingTop: 30,
    },
    heading: {
      fontSize: 24,
      fontWeight: 'bold',
      margin: 10,
    },
    subheading: {
      fontSize: 18,
      fontWeight: 'bold',
      margin: 10,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#ccc",
      borderRadius: 8,
      paddingHorizontal: 10,
      marginTop: 8,
      // iOS Shadow
      shadowColor: theme.text,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      padding: 15,
      marginVertical: 10,
      borderWidth: 1,
      borderColor: theme.text,
      borderRadius: 10,
      fontSize: 16,
      backgroundColor: theme.cardBackground,
    },
    icon: {
      marginRight: 10, // Space between the icon and the input
    },

    buttonText: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "bold",
    },
    primaryTextColorIcon: {
      color: theme.text,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    priorityButton: {
      padding: 15,
      borderRadius: 5,
      borderColor: theme.primary,
      borderWidth: 1,
      shadowColor: theme.text,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      marginHorizontal: 5,
      backgroundColor: theme.cardBackground
    },
    priorityButtonPressed: {
      backgroundColor: theme.primary + "40", // Slightly transparent primary color
      borderColor: theme.primary,
      shadowOffset: { width: 1, height: 1 }, // Reduce shadow for "sunk in" effect
      elevation: 2, // Reduce elevation for Android
    },
    priorityContainer: {
      flexDirection: "row",
      justifyContent: 'space-evenly',
      marginBottom: 20,
    },
    formContainer: {
      backgroundColor: theme.cardBackground,
      borderRadius: 20,
      padding: 20,
      // iOS Shadow
      shadowColor: theme.text,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    hr: {
      borderBottomColor: theme.primary, // Line color
      borderBottomWidth: 0.5,
      marginVertical: 10,
      marginHorizontal: 2,
    },

    addButton: {
      backgroundColor: theme.text,
      borderRadius: 50,
      alignItems: 'center',
      alignSelf: 'center',
      marginVertical: 50,
      paddingHorizontal: 30,
      paddingVertical: 6,
      shadowColor: theme.text,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    addButtonText: {
      color: theme.cardBackground,
      marginHorizontal: 5,
      paddingVertical: 5,

      alignSelf: 'center',
    }
  });
