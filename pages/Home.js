import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Alert,
  Modal,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from "react-native";
import * as Location from "expo-location";
import { useTheme } from "../context/ThemeContext";
import CustomCard from "../components/CustomCard";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  connectToWebSocket,
  disconnectFromWebSocket,
  sendDataToBackend,
  sendAudioToAzure,
} from "../services/network";
import { Audio } from "expo-av";

const recordingOptions = {
  isMeteringEnabled: false,
  android: {
    extension: ".wav",
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM_16BIT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: ".wav",
    outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

export default function Home() {
  const [activeRecordingType, setActiveRecordingType] = useState(null);

  const [redFlagSafeWord, setRedFlagSafeWord] = useState("");
  const [emergencySafeWord, setEmergencySafeWord] = useState("");

  const [recordingRedFlag, setRecordingRedFlag] = useState(null);
  const [recordingEmergency, setRecordingEmergency] = useState(null);

  const [redFlagSound, setRedFlagSound] = useState(null);
  const [emergencySound, setEmergencySound] = useState(null);

  const [showRedFlagWord, setShowRedFlagWord] = useState(false);
  const [showEmergencyWord, setShowEmergencyWord] = useState(false);

  const [isTracking, setIsTracking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recording, setRecording] = useState();

  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const { theme } = useTheme();
  const styles = getStyles(theme);

  // Handle switch toggle
  const toggleListening = (value) => {
    setIsListening(value);
    if (value) {
      sendDataToBackend();
      connectToWebSocket(); // Start WebSocket & audio streaming
    } else {
      disconnectFromWebSocket(); // Stop WebSocket & audio streaming
    }
  };

  async function startRecording() {
    try {
      if (permissionResponse.status !== "granted") {
        console.log("Requesting Permission");
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("Start recording...");
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(recording);
      console.log("Recording Started");
    } catch (err) {
      console.log("Failed to start recording", err);
    }
  }

  async function stopRecording(type) {
    console.log("Stopping recording..");
    setRecording(undefined);

    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    const uri = recording.getURI();
    console.log(`${type} recording stored at:`, uri);

    const response = await sendAudioToAzure(uri);
    console.log("Response: ", response);
    const recognizedText = response?.DisplayText || "";
    cleanedText = recognizedText.replace(/[!.,]/g, "");
    console.log("Stripped text", cleanedText);

    if (type === "redFlag") {
      if (cleanedText !== "" && cleanedText) {
        setRecordingRedFlag(recording);
      } else {
        setRecordingRedFlag(null);
      }
      setRedFlagSafeWord(cleanedText);
    } else if (type === "emergency") {
      if (cleanedText !== "" && cleanedText) {
        setRecordingEmergency(recording);
      } else {
        setRecordingEmergency(null);
      }
      setEmergencySafeWord(cleanedText);
    }

    return cleanedText;
  }

  // Playback for Red Flag
  async function playRedFlagRecording() {
    try {
      if (!recordingRedFlag) {
        Alert.alert(
          "No Red Flag recording",
          "Please record a Red Flag safe word first."
        );
        return;
      }
      // If we already have a sound loaded, unload it first
      if (redFlagSound) {
        await redFlagSound.unloadAsync();
        setRedFlagSound(null);
      }
      const { sound } = await Audio.Sound.createAsync({
        uri: recordingRedFlag.getURI(),
      });
      setRedFlagSound(sound);

      console.log("Playing Red Flag Sound...");
      await sound.playAsync();
    } catch (error) {
      console.log("Error playing Red Flag recording:", error);
    }
  }

  // Playback for Emergency
  async function playEmergencyRecording() {
    try {
      if (!recordingEmergency) {
        Alert.alert(
          "No Emergency recording",
          "Please record an Emergency trigger first."
        );
        return;
      }
      if (emergencySound) {
        await emergencySound.unloadAsync();
        setEmergencySound(null);
      }
      const { sound } = await Audio.Sound.createAsync({
        uri: recordingEmergency.getURI(),
      });
      setEmergencySound(sound);

      console.log("Playing Emergency Sound...");
      await sound.playAsync();
    } catch (error) {
      console.log("Error playing Emergency recording:", error);
    }
  }

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
      id: "1",
      icon: (
        <View style={styles.permissionRow}>
          <Ionicons name="flag-outline" size={27} style={styles.primaryTextColorIcon} />
          <Text style={[styles.p, { color: theme.text }]}>Red Flag</Text>
        </View>
      ),
    },
    {
      id: "2",
      icon: (
        <View style={styles.permissionRow}>
          <Ionicons
            name="warning-outline"
            size={27}
            style={styles.primaryTextColorIcon}
          />
          <Text style={[styles.p, { color: theme.text }]}>Emergency</Text>
        </View>
      ),
    },
    {
      id: "3",
      icon: (
        <TouchableOpacity
          onPress={() => {
            if (activeRecordingType === "redFlag") {
              stopRecording("redFlag");
              setActiveRecordingType(null);
            } else if (activeRecordingType === "emergency") {
              stopRecording("emergency");
              setActiveRecordingType("redFlag");
              startRecording();
            } else {
              // activeRecordingType is null
              startRecording();
              setActiveRecordingType("redFlag");
            }
          }}
          style={
            activeRecordingType === "redFlag" ? styles.micOn : styles.micOff
          }
        >
          <Ionicons name="mic" size={27} style={styles.secondaryColorIcon} />
        </TouchableOpacity>
      ),
    },
    {
      id: "4",
      icon: (
        <TouchableOpacity
          onPress={() => {
            if (activeRecordingType === "emergency") {
              stopRecording("emergency");
              setActiveRecordingType(null);
            } else if (activeRecordingType === "redFlag") {
              stopRecording("redFlag");
              setActiveRecordingType("emergency");
              startRecording();
            } else {
              // activeRecordingType is null
              startRecording();
              setActiveRecordingType("emergency");
            }
          }}
          style={
            activeRecordingType === "emergency" ? styles.micOn : styles.micOff
          }
        >
          <Ionicons name="mic" size={27} style={styles.secondaryColorIcon} />
        </TouchableOpacity>
      ),
    },
  ];

  const Listen = ({ listen }) => {
    return <View style={styles.item}>{listen.icon}</View>;
  };
  const listenData = [
    {
      id: "1",
      icon: (
        <View style={styles.permissionRow}>
          <Ionicons name="flag-outline" size={27} style={styles.primaryTextColorIcon} />
          <Text style={[styles.p, { color: theme.text }]}>Red Flag</Text>
        </View>
      ),
    },
    {
      id: "2",
      icon: (
        <View style={styles.permissionRow}>
          <Ionicons
            name="warning-outline"
            size={27}
            style={styles.primaryTextColorIcon}
          />
          <Text style={[styles.p, { color: theme.text }]}>Emergency</Text>
        </View>
      ),
    },
    {
      id: "3",
      icon: (
        <View
          style={{
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-evenly",
            gap: 10,
          }}
        >
          <TouchableOpacity onPress={() => setShowRedFlagWord((prev) => !prev)}>
            <Ionicons
              name={showRedFlagWord ? "eye-off" : "eye"}
              size={27}
              style={styles.secondaryColorIcon}
            />
          </TouchableOpacity>
          <Text style={[styles.p, { color: theme.text, textAlign: "center" }]}>
            {showRedFlagWord ? redFlagSafeWord || "(not recorded yet)" : ""}
          </Text>
          <TouchableOpacity onPress={playRedFlagRecording}>
            <Ionicons
              name="play-circle"
              size={27}
              style={styles.secondaryColorIcon}
            />
          </TouchableOpacity>
        </View>
      ),
    },
    // Eye icon for Emergency
    {
      id: "4",
      icon: (
        <View
          style={{
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-evenly",
            gap: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => setShowEmergencyWord((prev) => !prev)}
          >
            <Ionicons
              name={showEmergencyWord ? "eye-off" : "eye"}
              size={27}
              style={styles.secondaryColorIcon}
            />
          </TouchableOpacity>
          <Text style={[styles.p, { color: theme.text, textAlign: "center" }]}>
            {showEmergencyWord ? emergencySafeWord || "(not recorded yet)" : ""}
          </Text>
          <TouchableOpacity onPress={playEmergencyRecording}>
            <Ionicons
              name="play-circle"
              size={27}
              style={styles.secondaryColorIcon}
            />
          </TouchableOpacity>
        </View>
      ),
    },
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
          <TouchableOpacity onPress={handleInfoPress} style={styles.infoIcon}>
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
            <Ionicons
              name="navigate-circle"
              size={33}
              style={styles.primaryTextColorIcon}
            />
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
            <Ionicons
              name="mic-circle"
              size={33}
              style={styles.primaryTextColorIcon}
            />
            <Text style={[styles.permissionText, { color: theme.text }]}>
              Enable Listening
            </Text>
          </View>
          <Switch
            value={isListening}
            onValueChange={toggleListening}
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
            Choose and then record yourself saying a distinct "Safe Word" for
            each event.
          </Text>
        </View>
        {/* <View style={styles.padding}>
          <FlatList
            data={itemData}
            numColumns={2}
            renderItem={Item}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View> */}
        <View style={{ flexDirection: "row" }}>
          <View style={styles.borderBox}>
            <Ionicons
              name="flag-outline"
              size={22}
              style={styles.primaryTextColorIcon}
            />
            <Text style={[styles.cardH1, { color: theme.text }]}>Red Flag</Text>
            <TouchableOpacity
              onPress={() => {
                if (activeRecordingType === "redFlag") {
                  stopRecording("redFlag");
                  setActiveRecordingType(null);
                } else if (activeRecordingType === "emergency") {
                  stopRecording("emergency");
                  setActiveRecordingType("redFlag");
                  startRecording();
                } else {
                  // activeRecordingType is null
                  startRecording();
                  setActiveRecordingType("redFlag");
                }
              }}
              style={
                activeRecordingType === "redFlag" ? styles.micOn : styles.micOff
              }
            >
              <Ionicons
                name="mic"
                size={33}
                style={[styles.secondaryColorIcon, { textAlign: "center", paddingVertical: 15 }]}
              />
            </TouchableOpacity>

          </View>
          <View style={styles.borderBox}>
            <Ionicons
              name="warning-outline"
              size={22}
              style={styles.primaryTextColorIcon}
            />
            <Text style={[styles.cardH1, { color: theme.text }]}>Emergency</Text>
            <TouchableOpacity
              onPress={() => {
                if (activeRecordingType === "emergency") {
                  stopRecording("emergency");
                  setActiveRecordingType(null);
                } else if (activeRecordingType === "redFlag") {
                  stopRecording("redFlag");
                  setActiveRecordingType("emergency");
                  startRecording();
                } else {
                  // activeRecordingType is null
                  startRecording();
                  setActiveRecordingType("emergency");
                }
              }}
              style={
                activeRecordingType === "emergency" ? styles.micOn : styles.micOff
              }
            >
              <Ionicons
                name="mic"
                size={33}
                style={[styles.secondaryColorIcon, { textAlign: "center", paddingVertical: 15 }]}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.hr} />
        <View style={styles.headerContainer}>
          <Text style={[styles.cardH1, { color: theme.text }]}>
            Your Safe Words
          </Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          <View style={styles.borderBox}>
            <Ionicons
              name="flag-outline"
              size={22}
              style={styles.primaryTextColorIcon}
            />
            <Text style={[styles.cardH1, { color: theme.text }]}>Red Flag</Text>
            <View>
              <Ionicons
                name="eye"
                size={22}
                style={[styles.secondaryColorIcon, { paddingVertical: 5 }]}
              />

            </View>
            <Ionicons
              name="play-circle"
              size={32}
              style={[styles.secondaryColorIcon, { textAlign: "center", paddingVertical: 15 }]}
            />

          </View>
          <View style={styles.borderBox}>
            <Ionicons
              name="warning-outline"
              size={22}
              style={styles.primaryTextColorIcon}
            />
            <Text style={[styles.cardH1, { color: theme.text }]}>Emergency</Text>
            <View style={styles.emptyBox}>
              <Text style={{ color: theme.text }}>No Voice Profile</Text>
            </View>
          </View>
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
              First, set up your voice profile and record your safe words on the Home Page.
            </Text>
            <Text style={[styles.overlayText, { color: theme.text }]}>
              Next, go to the Contacts page to add existing or custom contacts, assigning them a priority level:
            </Text>
            <Text style={[styles.overlayText, { color: theme.text }]}>
              <Ionicons name="flag-outline" size={16} color={theme.text} />{" "}
              <Text style={{ fontWeight: 'bold' }}>Red Flag:</Text> A situation that feels unsafe or distressing but does not require immediate intervention.{"\n\n"}
              <Ionicons name="warning-outline" size={16} color={theme.text} />{" "}
              <Text style={{ fontWeight: 'bold' }}>Emergency:</Text> A crisis where your safety is in immediate danger and urgent help is needed.
            </Text>
            <Text style={[styles.overlayText, { color: theme.text }]}>
              Optionally, Enable Location sharing to include your live location in automated messages.
            </Text>
            <Text style={[styles.overlayText, { color: theme.text }]}>
              Once set up, turn on Enable Listening to detect safe words and send alerts to your contacts.
            </Text>
            <Text style={[styles.overlayText, { color: theme.text }]}>
              Shhhhhh...<Text style={{ fontWeight: 'bold' }}>murmur</Text>
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      paddingVertical: 10,
      paddingHorizontal: 15,
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
      paddingVertical: 10
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
      justifyContent: "space-between",
      marginHorizontal: 20,
    },

    primaryTextColorIcon: {
      color: theme.text,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    secondaryColorIcon: {
      color: theme.secondary,
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

    borderBox: {
      borderWidth: 1,
      borderColor: theme.secondary,
      borderRadius: 20,
      width: 140,
      marginHorizontal: 20,
      padding: 10
    },

    emptyBox: {
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 20,
      paddingVertical: 5,
      paddingHorizontal: 6,
      backgroundColor: theme.text + '40',  // '40' represents 25% opacity in hex
      marginVertical: 15,
    },

    item: {
      flex: 1,
      maxWidth: "50%",
      height: "100%",
      overflow: "hidden",
      alignItems: "center",

    },

    micOn: {
      textAlign: 'center',
      backgroundColor: theme.primary + '40',
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 50,
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
    }





  });
