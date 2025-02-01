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
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import Contact from '../components/Contact';

export default function AddContacts({ navigation }) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [priority, setPriority] = useState('Unset'); // Default priority
  const styles = getStyles(theme);

  // Save the contact to AsyncStorage
  const saveContact = async () => {
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
      setName('');
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
        <Icon name="person-circle-outline" size={200} color={theme.primary} />
        <Text style={[styles.heading, { color: theme.primary }]}>Add Contact</Text>

        {/* Name Input */}
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Name"
          placeholderTextColor={theme.secondary}
          value={name}
          onChangeText={setName}
        />

        {/* Phone Number Input */}
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Phone Number"
          placeholderTextColor={theme.secondary}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />

        {/* Priority Heading */}
        <Text style={[styles.subheading, { color: theme.primary }]}>Set Priority</Text>

        {/* Priority Buttons */}
        <View style={styles.priorityContainer}>
          <TouchableOpacity
            style={[
              styles.priorityButton,
              priority === 'Red Flag' && { backgroundColor: 'rgb(252, 223, 93)' },
            ]}
            onPress={() => setPriority('Red Flag')}
          >
            <Text style={styles.priorityText}>Red Flag</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.priorityButton,
              priority === 'Emergency' && { backgroundColor: 'rgba(255, 28, 28, 0.77)' },
            ]}
            onPress={() => setPriority('Emergency')}
          >
            <Text style={styles.priorityText}>Emergency</Text>
          </TouchableOpacity>
        </View>

        {/* Add Contact Button */}
        <TouchableOpacity style={styles.addButton} onPress={saveContact}>
          <Text style={styles.addButtonText}>Add Contact</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
      alignItems: 'center',
      padding: 20,
      paddingTop: 30,
    },
    heading: {
      fontSize: 24,
      fontWeight: 'bold',
      marginVertical: 10,
    },
    subheading: {
      fontSize: 18,
      fontWeight: 'bold',
      marginVertical: 10,
    },
    input: {
      width: '90%',
      padding: 15,
      marginVertical: 10,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 10,
      backgroundColor: `${theme.background}E6`,
      fontSize: 16,
    },
    priorityContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '90%',
      marginVertical: 10,
    },
    priorityButton: {
      flex: 1,
      padding: 15,
      borderRadius: 10,
      marginHorizontal: 5,
      backgroundColor: theme.secondary,
      alignItems: 'center',
    },
    priorityText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    addButton: {
      marginTop: 20,
      padding: 15,
      width: '90%',
      borderRadius: 10,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    addButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
  });
