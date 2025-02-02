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
import Ionicons from "react-native-vector-icons/Ionicons";

export default function ContactsPage({ searchText }) {
  const { theme } = useTheme();
  const [savedContacts, setSavedContacts] = useState({});
  const [deviceContacts, setDeviceContacts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [tempAddedContact, setTempAddedContact] = useState(null);
  const [showOptions, setShowOptions] = useState(false);



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

  const renderContactCard = ({ item }) => {
    // Check if the contact is already saved
    const isContactSaved = savedContacts[item.id];

    return (
      <View style={{ flexDirection: 'row', marginVertical: 5, marginHorizontal: 36 }}>
        {/* Priority Icon (only show when not searching) */}
        {!isSearching && isContactSaved && savedContacts[item.id].priority === "Red Flag" && (
          <Ionicons
            name="flag"
            size={20}
            style={{ color: theme.text, marginHorizontal: 10 }}
          />
        )}
        {!isSearching && isContactSaved && savedContacts[item.id].priority === "Emergency" && (
          <Ionicons
            name="warning"
            size={20}
            style={{ color: theme.text, marginHorizontal: 10 }}
          />
        )}

        <Text style={[styles.cardText]}>
          {item.name}
        </Text>

        {isSearching ? (
          isContactSaved ? (
            // Render the "Added" button if the contact is saved
            <TouchableOpacity
              style={styles.addedButton}
              onPress={() => toggleContact(item)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons
                  name="checkmark-outline"
                  size={27}
                  style={{ color: theme.cardBackground }}
                />
                <Text style={{ color: theme.cardBackground, fontSize: 16 }}>Added</Text>
              </View>
            </TouchableOpacity>
          ) : (
            // Render the "Add" button if the contact is not saved
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => toggleContact(item)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons
                  name="add"
                  size={27}
                  style={styles.primaryTextColorIcon}
                />
                <Text style={{ color: theme.text, fontSize: 16 }}>Add</Text>
              </View>
            </TouchableOpacity>
          )
        ) : (
          <>
            {/* Show pencil and trash icons if options are visible */}
            {showOptions && (
              <>
                {/* Pencil Icon (Edit Priority) */}
                <TouchableOpacity
                  onPress={() => {
                    setSelectedContact(item); // Set the selected contact
                    setIsOverlayVisible(true); // Show the overlay
                    setShowOptions(false); // Hide the options
                  }}
                  style={{ marginRight: 10 }}
                >
                  <Ionicons
                    name="pencil"
                    size={24}
                    style={{ color: theme.text }}
                  />
                </TouchableOpacity>

                {/* Trash Icon (Remove Contact) */}
                <TouchableOpacity
                  onPress={() => {
                    const updatedContacts = { ...savedContacts };
                    delete updatedContacts[item.id]; // Remove the contact
                    saveContacts(updatedContacts); // Save the updated contacts
                    setShowOptions(false); // Hide the options
                  }}
                >
                  <Ionicons
                    name="trash"
                    size={24}
                    style={{ color: theme.text }}
                  />
                </TouchableOpacity>
              </>
            )}

            {/* Ellipsis Icon (Toggle Options) - Hidden when showOptions is true */}
            {!showOptions && (
              <TouchableOpacity
                onPress={() => setShowOptions(true)} // Toggle options visibility
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={24}
                  style={{ color: theme.text }}
                />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );

  }

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
              style={styles.priorityButton}
              onPress={() => updatePriority("Red Flag")}
            ><Ionicons
                name="flag-outline"
                size={22}
                style={styles.primaryTextColorIcon}
              />
              <Text style={styles.buttonText}>Red Flag</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.priorityButton}
              onPress={() => updatePriority("Emergency")}
            >
              <Ionicons
                name="warning-outline"
                size={22}
                style={styles.primaryTextColorIcon}
              />
              <Text style={styles.buttonText}>Emergency</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.overlayClose} onPress={handleCancel}>
            <Ionicons
              name="close-outline"
              size={22}
              style={{ color: theme.cardBackground }}
            />
            <Text style={{ color: theme.cardBackground, size: 18 }}>Cancel</Text>
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
      color: theme.text,
    },
    toggleButton: {
      borderRadius: 5,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "bold",
    },
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.background + 'F2',
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
    overlayClose: {
      flexDirection: 'row',
      alignItems: "center",
      alignSelf: 'flex-end',
      marginHorizontal: 50,
      paddingVertical: 5,
      paddingHorizontal: 15,
      borderRadius: 50,
      backgroundColor: theme.text,
      // iOS Shadow
      shadowColor: theme.text,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    primaryTextColorIcon: {
      color: theme.text,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    addButton: {
      backgroundColor: theme.cardBackground,
      borderRadius: 5,
      width: 70,
      // iOS Shadow
      shadowColor: theme.text,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4,

    },
    addedButton: {
      backgroundColor: theme.text,
      borderRadius: 5,
      width: 85,
      // iOS Shadow
      shadowColor: theme.text,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    }
  });
