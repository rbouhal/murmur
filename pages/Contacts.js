import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Contacts from "expo-contacts";
import { useTheme } from "../context/ThemeContext";
import { useFocusEffect } from "@react-navigation/native";
import Contact from '../components/Contact';


export default function ContactsPage({ searchText }) {
  const { theme } = useTheme();
  const [savedContacts, setSavedContacts] = useState({});
  const [deviceContacts, setDeviceContacts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [tempAddedContact, setTempAddedContact] = useState(null);
  


  const styles = getStyles(theme); // Dynamically generate styles based on the theme

  // Fetch saved contacts from AsyncStorage
  const fetchSavedContacts = async () => {
    try {
      const data = await AsyncStorage.getItem("murmur_contacts");
      if (data) {
        setSavedContacts(JSON.parse(data));
      }
    } catch (error) {
      console.error("Error fetching saved contacts:", error);
    }
  };

  // Save updated contacts to AsyncStorage
  const saveContacts = async (contacts) => {
    try {
      await AsyncStorage.setItem("murmur_contacts", JSON.stringify(contacts));
      setSavedContacts(contacts);
    } catch (error) {
      console.error("Error saving contacts:", error);
    }
  };

  // Fetch contacts from the device using expo-contacts
  const fetchDeviceContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === "granted") {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        });

        const contacts = data
          .filter((c) => c.name && c.phoneNumbers?.length > 0)
          .map((c) => ({
            id: c.id,
            name: c.name,
            phoneNumber: c.phoneNumbers[0]?.number || "No number",
          }));

        setDeviceContacts(contacts);
      } else {
        Alert.alert("Permission denied", "Cannot access your contacts.");
      }
    } catch (error) {
      console.error("Error fetching device contacts:", error);
    }
  };

  // Toggle adding/removing a contact
  const toggleContact = (contact) => {
    const updatedContacts = { ...savedContacts };

    if (updatedContacts[contact.id]) {
      // If already added, remove the contact
      delete updatedContacts[contact.id];
      saveContacts(updatedContacts);
    } else {
      // Temporarily add the contact and show the overlay
      updatedContacts[contact.id] = new Contact(
        contact.id,
        contact.name,
        contact.phoneNumber
      );
      saveContacts(updatedContacts);
      setTempAddedContact(contact); // Track the temporary contact
      setSelectedContact(contact);
      setIsOverlayVisible(true);
    }
  };

  const handleCancel = () => {
    if (tempAddedContact) {
      // Remove the temporary contact
      const updatedContacts = { ...savedContacts };
      delete updatedContacts[tempAddedContact.id];
      saveContacts(updatedContacts);
    }

    // Reset overlay and temporary contact state
    setTempAddedContact(null);
    setSelectedContact(null);
    setIsOverlayVisible(false);
  };



  const updatePriority = (priority) => {
    if (selectedContact) {
      const updatedContacts = { ...savedContacts };
      updatedContacts[selectedContact.id].priority = priority;
      saveContacts(updatedContacts);

      // Clear temporary contact and overlay
      setTempAddedContact(null);
      setSelectedContact(null);
      setIsOverlayVisible(false);
    }
  };

  // Re-fetch saved contacts when the page gains focus
  useFocusEffect(
    React.useCallback(() => {
      fetchSavedContacts();
    }, [])
  );

  // Filter device contacts based on search text
  const filterContacts = (text) => {
    setIsSearching(!!text);
    const filtered = deviceContacts.filter((contact) =>
      contact.name.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredContacts(filtered);
  };

  useEffect(() => {
    fetchDeviceContacts();
  }, []);

  useEffect(() => {
    filterContacts(searchText);
  }, [searchText]);

  const renderContactCard = ({ item }) => (
    <View
      style={[
        styles.card,
        {
          // THIS CHANGES THE COLORS OF A CONTACT CARD AFTER PRIORITY IS SELECTED
          backgroundColor:
            item.priority === "Red Flag"
              ? 'rgb(252, 223, 93)'
              : item.priority === "Emergency"
                ? 'rgba(255, 28, 28, 0.56)'
                : theme.cardBackground,
        },
      ]}
    >
      <Text style={[styles.cardText]}>
        {item.name}  {item.phoneNumber}
      </Text>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          savedContacts[item.id]
            // THESE ARE THE + AND - BUTTON COLORS
            ? { backgroundColor: 'rgb(255, 16, 16)' } // used to be theme.secondary
            : { backgroundColor: '#5dcf65' }, // used to be theme.primary
        ]}
        onPress={() => toggleContact(item)}
      >
        <Text style={styles.buttonText}>
          {savedContacts[item.id] ? "-" : "+"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {isSearching ? (
        filteredContacts.length > 0 ? (
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.id}
            renderItem={renderContactCard}
          />
        ) : (
          <Text style={styles.text}>No Contact found for: {searchText}</Text>
        )
      ) : Object.keys(savedContacts).length > 0 ? (
        <FlatList
          data={Object.values(savedContacts)}
          keyExtractor={(item) => item.id}
          renderItem={renderContactCard}
        />
      ) : (
        <Text style={styles.text}>No contacts added yet.</Text>
      )}
      {isOverlayVisible && (
        <View style={styles.overlay}>
          <Text style={[styles.overlayText]}>
            Set Priority for {selectedContact?.name}
          </Text>
          <View style={styles.overlayButtons}>
            <TouchableOpacity
              // IF YOU CHANGE THIS BACKGROUND COLOR GO TO renderContactCard to update it properly
              style={[styles.priorityButton, { backgroundColor: 'rgb(252, 223, 93)' }]}
              onPress={() => updatePriority("Red Flag")}
            >
              <Text style={styles.buttonText}>Red Flag</Text>
            </TouchableOpacity>
            <TouchableOpacity
              // IF YOU CHANGE THIS BACKGROUND COLOR GO TO renderContactCard to update it properly
              style={[styles.priorityButton, { backgroundColor: 'rgba(255, 28, 28, 0.77)' }]}
              onPress={() => updatePriority("Emergency")}
            >
              <Text style={styles.buttonText}>Emergency</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.overlayClose} onPress={handleCancel}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>

        </View>
      )}

    </View>
  );
}

// Generate styles dynamically based on the theme
const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      backgroundColor: theme.background
    },
    text: {
      fontSize: 18,
      color: theme.text,
      textAlign: "center",
      marginTop: 20,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 15,
      marginBottom: 10,
      borderRadius: 15,
      borderWidth: 2,
      borderColor: theme.primary,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    cardText: {
      fontSize: 16,
      flex: 1,
      marginRight: 10,
      color: theme.primary,
    },
    toggleButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "bold",
    },
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: `${theme.background}E6`,
      justifyContent: "center",
      alignItems: "center",
    },
    overlayText: {
      fontSize: 18,
      marginBottom: 20,
      color: theme.primary,
    },
    overlayButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "80%",
      marginBottom: 20,
    },
    priorityButton: {
      padding: 15,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      marginHorizontal: 5,
    },
    overlayClose: {
      marginTop: 10,
      padding: 10,
      borderRadius: 10,
      backgroundColor: theme.secondary,
    },
  });
