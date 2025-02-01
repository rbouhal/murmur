import React, { useState, useEffect } from "react";
import { View, Text, Switch, StyleSheet, Alert, Modal, TouchableOpacity, FlatList, ScrollView } from "react-native";
import * as Location from "expo-location";
import { useTheme } from '../context/ThemeContext';
import CustomCard from '../components/CustomCard';
import Ionicons from 'react-native-vector-icons/Ionicons';



export default function Home() {
  const [isTracking, setIsTracking] = useState(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const { theme } = useTheme();
  const styles = getStyles(theme);


  const handleInfoPress = () => {
    setIsOverlayVisible(true);
  };

  const closeOverlay = () => {
    setIsOverlayVisible(false);
  };


  useEffect(() => {
    let intervalId;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Please enable location permissions.");
        Alert.alert("Permission Denied", errorMsg);
        return;
      }

      // Get the initial location
      const location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      // Update location every 30 minutes
      intervalId = setInterval(async () => {
        try {
          const updatedLocation = await Location.getCurrentPositionAsync({});
          setLocation(updatedLocation);
        } catch (error) {
          console.error("Error fetching location:", error);
          setErrorMsg("Failed to fetch location.");
        }
      }, 30 * 60 * 1000); // 30 minutes
    };

    if (isTracking) {
      startTracking();
    } else {
      // Stop tracking
      if (intervalId) clearInterval(intervalId);
      setLocation(null);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTracking]);


  const Item = ({ item }) => {
    return <View style={styles.item}>{item.icon}</View>;
  };
  const itemData = [
    {
      id: '1',
      icon: (
        <View style={styles.permissionRow}>
          <Ionicons
            name="flag"
            size={27}
            style={styles.primaryTextColorIcon}
          />
          <Text style={[styles.p, { color: theme.text }]}>
            Red Flag
          </Text>
        </View>
      )
    },
    {
      id: '2',
      icon: (
        <View style={styles.permissionRow}>
          <Ionicons
            name="warning"
            size={27}
            style={styles.primaryTextColorIcon}
          />
          <Text style={[styles.p, { color: theme.text }]}>
            Emergency
          </Text>
        </View>
      )
    },
    {
      id: '3',
      icon: (
        <Ionicons
          name="mic"
          size={27}
          style={styles.secondaryColorIcon}
        />
      )
    },
    {
      id: '4',
      icon: (
        <Ionicons
          name="mic"
          size={27}
          style={styles.secondaryColorIcon}
        />
      )
    }
  ];

  const Listen = ({ listen }) => {
    return <View style={styles.item}>{listen.icon}</View>;
  };
  const listenData = [
    {
      id: '1',
      icon: (
        <View style={styles.permissionRow}>
          <Ionicons
            name="flag"
            size={27}
            style={styles.primaryTextColorIcon}
          />
          <Text style={[styles.p, { color: theme.text }]}>
            Red Flag
          </Text>
        </View>
      )
    },
    {
      id: '2',
      icon: (
        <View style={styles.permissionRow}>
          <Ionicons
            name="warning"
            size={27}
            style={styles.primaryTextColorIcon}
          />
          <Text style={[styles.p, { color: theme.text }]}>
            Emergency
          </Text>
        </View>
      )
    },
    {
      id: '3',
      icon: (
        <Ionicons
          name="eye"
          size={27}
          style={styles.secondaryColorIcon}
        />
      )
    },
    {
      id: '4',
      icon: (
        <Ionicons
          name="eye"
          size={27}
          style={styles.secondaryColorIcon}
        />
      )
    }
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false} // Optional: hides vertical scroll indicator
    >

      {/* Permissions Card */}
      <CustomCard>
        <View style={styles.headerContainer}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Permissions
          </Text>
          <TouchableOpacity
            onPress={handleInfoPress}
            style={styles.infoIcon}
          >
            <Ionicons
              name="information-circle-outline"
              size={27}
              style={styles.primaryTextColorIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Enable Location Section */}
        <View style={[styles.permissionRow, styles.spaceAround]}>
          <View style={styles.primaryTextColorIcon}>
            <Ionicons name="navigate-circle" size={33} style={styles.primaryTextColorIcon} />
            <Text style={[styles.permissionText, { color: theme.text }]}>
              Enable Location
            </Text>
          </View>
          <Switch
            value={isTracking}
            onValueChange={setIsTracking}
            thumbColor={theme.text}
            trackColor={{ false: theme.secondary, true: theme.secondary }}
          />
        </View>

        {/* Enable Listening Section */}
        <View style={[styles.permissionRow, styles.spaceAround]}>
          <View style={styles.primaryTextColorIcon}>
            <Ionicons name="mic-circle" size={33} style={styles.primaryTextColorIcon} />
            <Text style={[styles.permissionText, { color: theme.text }]}>
              Enable Listening
            </Text>
          </View>
          <Switch
            value={isTracking}
            onValueChange={setIsTracking}
            thumbColor={theme.text}
            trackColor={{ false: theme.secondary, true: theme.secondary }}
          />
        </View>


      </CustomCard>

      {/* Required Setup Card */}
      <CustomCard>
        <View style={styles.headerContainer}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Required Setup
          </Text>
        </View>

        <View style={styles.headerContainer}>
          <Text style={[styles.cardH1, { color: theme.text }]}>
            Voice Detection
          </Text>
        </View>
        <View>
          <Text style={[styles.p, { color: theme.text }]}>
            Choose and then record yourself saying a distinct trigger word for each event.
          </Text>
        </View>
        <View style={styles.padding}>
          <FlatList
            data={itemData}
            numColumns={2}
            renderItem={Item}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
        <View style={styles.hr} />
        <View style={styles.headerContainer}>
          <Text style={[styles.cardH1, { color: theme.text }]}>
            Your Trigger Words
          </Text>
        </View>
        <View style={styles.padding}>
          <FlatList
            data={listenData}
            numColumns={2}
            renderItem={({ item }) => <Listen listen={item} />}
            keyExtractor={(listen) => listen.id}
            scrollEnabled={false}
          />
        </View>




      </CustomCard>


      {/* Overlay Modal */}
      <Modal
        visible={isOverlayVisible}
        transparent
        animationType="fade"
        onRequestClose={closeOverlay}
      >
        <View style={styles.overlayContainer}>
          <View style={styles.overlayContent}>
            <Text style={[styles.overlayText, { color: theme.text }]}>
              1. Complete the "Required Setup" by enrolling your voice profile and setting your "Safe Words" on the Home Page.
            </Text>
            <Text style={[styles.overlayText, { color: theme.text }]}>
              2. 
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={closeOverlay}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    hr: {
      borderBottomColor: theme.primary, // Line color
      borderBottomWidth: StyleSheet.hairlineWidth,
      marginVertical: 10,
      marginHorizontal: 20,
    },
    padding: {
      paddingVertical: 20,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: 15
    },
    cardTitle: {
      fontWeight: "bold",
      fontSize: 18,
    },
    cardH1: {
      fontWeight: "600",
      fontSize: 16,
    },
    p: {
      paddingLeft: 15,
    },
    infoIcon: {
      marginLeft: 8,
    },

    permissionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      paddingBottom: 10,
    },


    spaceAround: {
      justifyContent: 'space-between',
      marginHorizontal: 20
    },

    primaryTextColorIcon: {
      color: theme.text,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10
    },

    secondaryColorIcon: {
      color: theme.secondary
    },
    permissionText: {
      fontSize: 16,
    },
    overlayContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    overlayContent: {
      backgroundColor: theme.cardBackground,
      padding: 20,
      borderRadius: 15,
      width: "80%",
      alignItems: "center",
    },
    overlayText: {
      fontSize: 16,
      marginBottom: 16,
    },
    closeButton: {
      backgroundColor: theme.primary,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
    },
    closeButtonText: {
      color: "#FFF",
      fontWeight: "bold",
    },

    item: {
      flex: 1,
      maxWidth: "50%",
      height: '100%',
      overflow: 'hidden',
      alignItems: "center",
    }

  });