import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Alert,
  Modal,
  TouchableOpacity,
  ScrollView,
  AppState,
} from "react-native";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";
import { useTheme } from "../context/ThemeContext";
import CustomCard from "../components/CustomCard";
import Ionicons from "react-native-vector-icons/Ionicons";
import { sendAudioToAzure } from "../services/network";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  registerBackgroundTask,
  unregisterBackgroundTask,
} from "../services/backgroundTaskManager";

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
  const [isTracking, setIsTracking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [recording, setRecording] = useState(null);
  const [currentSound, setCurrentSound] = useState(null);
  const [activeRecordingType, setActiveRecordingType] = useState(null);
  const [playingType, setPlayingType] = useState(null);

  const [redFlagSafeWord, setRedFlagSafeWord] = useState("");
  const [emergencySafeWord, setEmergencySafeWord] = useState("");

  const [redFlagRecording, setRedFlagRecording] = useState(null);
  const [emergencyRecording, setEmergencyRecording] = useState(null);

  const [showRedFlagWord, setShowRedFlagWord] = useState(false);
  const [showEmergencyWord, setShowEmergencyWord] = useState(false);

  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const canEnableListening = Boolean(
    redFlagSafeWord.trim() &&
      redFlagRecording &&
      emergencySafeWord.trim() &&
      emergencyRecording
  );

  /**
   * Stores recordings/safe words
   */
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const storedRedFlagSafeWord = await AsyncStorage.getItem(
          "redFlagSafeWord"
        );

        const storedEmergencySafeWord = await AsyncStorage.getItem(
          "emergencySafeWord"
        );

        if (storedRedFlagSafeWord) {
          setRedFlagSafeWord(storedRedFlagSafeWord);
        }
        if (storedEmergencySafeWord) {
          setEmergencySafeWord(storedEmergencySafeWord);
        }

        const storedRedFlagRecording = await AsyncStorage.getItem(
          "redFlagRecording"
        );
        if (storedRedFlagRecording) {
          const fileInfo = await FileSystem.getInfoAsync(
            storedRedFlagRecording
          );
          console.log("RedFlag file exists?", fileInfo.exists, fileInfo);
          if (fileInfo.exists) {
            setRedFlagRecording(storedRedFlagRecording);
          } else {
            console.warn("RedFlag recording not found on disk");
          }
        }

        const storedEmergencyRecording = await AsyncStorage.getItem(
          "emergencyRecording"
        );
        if (storedEmergencyRecording) {
          const fileInfo = await FileSystem.getInfoAsync(
            storedEmergencyRecording
          );
          console.log("Emergency file exists?", fileInfo.exists, fileInfo);
          if (fileInfo.exists) {
            setEmergencyRecording(storedEmergencyRecording);
          } else {
            console.warn("Emergency recording not found on disk");
          }
        }
      } catch (error) {
        console.error("Error loading persisted data:", error);
      }
    };

    loadPersistedData();
  }, []);

  /**
   * Enables location tracking
   */
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

  /**
   * Enables active listening in 10 second increments
   */
  useEffect(() => {
    let cancelActiveListening = false;

    const startActiveListeningLoop = async () => {
      if (redFlagSafeWord && emergencySafeWord) {
        while (isListening && !cancelActiveListening) {
          console.log("Starting foreground active listening segment...");
          await activeListenerForeground();
          console.log("Foreground active listening segment finished.");
        }
      }
    };

    if (isListening) {
      startActiveListeningLoop();
    }
    return () => {
      cancelActiveListening = true;
    };
  }, [isListening, redFlagSafeWord, emergencySafeWord]);

  // Toggles active listening
  const toggleListening = async (value) => {
    if (value && !canEnableListening) {
      Alert.alert(
        "Safe Words Required",
        "Please record both your Red Flag and Emergency safe words before enabling active listening."
      );
      return; // Do not enable listening.
    }
    if (value && recording) {
      console.log(
        "Listening toggle turned off while a recording is progress; discarding recording."
      );
      await discardRecording();
    }

    setIsListening(value);
    if (value) {
      await registerBackgroundTask();
    } else {
      await unregisterBackgroundTask();
    }
    console.log(
      value ? "Active listening enabled" : "Active listening disabled"
    );
  };

  function redFlagTriggerEvent() {
    console.log("Red Flag safe word detected!");
    Alert.alert("Red Flag Detected", "Red Flag safe word was detected!");
    /**
     * implement functionality for red flag trigger event
     */
  }

  function emergencyTriggerEvent() {
    console.log("Emergency safe word detected!");
    Alert.alert("Emergency Detected", "Emergency safe word was detected!");
    /**
     * implement functionality for emergency trigger event
     */
  }

  async function activeListenerForeground() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: segmentRecording } = await Audio.Recording.createAsync(
        recordingOptions
      );
      console.log("Foreground active listening segment recording started");

      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for 10 seconds

      await segmentRecording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = segmentRecording.getURI();
      console.log("Foreground active listening segment recorded at:", uri);

      if (uri) {
        const response = await sendAudioToAzure(uri);
        const recognizedText = response?.DisplayText || "";
        const cleanedText = recognizedText
          .replace(/[!.,]/g, "")
          .trim()
          .toLowerCase();
        console.log(
          "Foreground active listening recognized text:",
          cleanedText
        );

        // Recognizes safe words in audio segment. If both words are said in the same segment; Emergency word takes precedence
        if (
          emergencySafeWord &&
          cleanedText.includes(emergencySafeWord.toLowerCase())
        ) {
          emergencyTriggerEvent();
        } else if (
          redFlagSafeWord &&
          cleanedText.includes(redFlagSafeWord.toLowerCase())
        ) {
          redFlagTriggerEvent();
        }
      }
    } catch (err) {
      console.error("Error during foreground active listening segment:", err);
    }
  }

  /**
   * Starts recording for safe word @param {"redFlag", "emergency"} type
   */
  async function startRecording(type) {
    if (isListening) {
      console.log(
        `Listening is active. Disabling listening mode to start ${type} recording`
      );
      await toggleListening(false);
    }

    try {
      if (recording && activeRecordingType) {
        console.log(`Stopping previous recording for ${activeRecordingType}`);
        await stopRecording(activeRecordingType);
      }

      if (permissionResponse.status !== "granted") {
        console.log("Requesting Permission");
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log(`Start ${type} recording...`);
      const { recording: newRecording } = await Audio.Recording.createAsync(
        recordingOptions
      );
      setRecording(newRecording);
      setActiveRecordingType(type);
      console.log(`${type} Recording Started`);
    } catch (err) {
      console.log("Failed to start recording", err);
    }
  }

  /**
   * Stops recording safe word of @param {"redFlag", "emergency"} type
   */
  async function stopRecording(type) {
    if (!recording) {
      console.warn(`No active recording to stop for ${type}`);
      return;
    }

    console.log(`Stopping ${type} recording..`);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });

    const uri = recording.getURI();
    console.log(`${type} recording stored at temporary URI:`, uri);

    setRecording(null);
    setActiveRecordingType(null);

    try {
      const response = await sendAudioToAzure(uri);
      console.log("Response: ", response);
      const recognizedText = response?.DisplayText || "";
      const cleanedText = recognizedText.replace(/[!.,]/g, "");
      console.log("Cleaned text", cleanedText);

      if (cleanedText !== "") {
        if (type === "redFlag") {
          setRedFlagRecording(uri);
          setRedFlagSafeWord(cleanedText);
          await AsyncStorage.setItem("redFlagRecording", uri);
          await AsyncStorage.setItem("redFlagSafeWord", cleanedText);
        } else if (type === "emergency") {
          setEmergencyRecording(uri);
          setEmergencySafeWord(cleanedText);
          await AsyncStorage.setItem("emergencyRecording", uri);
          await AsyncStorage.setItem("emergencySafeWord", cleanedText);
        }
      }
    } catch (err) {
      console.error(`Error sending ${type} recording to Azure:`, err);
    }
  }

  // Playback for Red Flag
  async function playRedFlagRecording() {
    try {
      if (!redFlagRecording) {
        Alert.alert(
          "No Red Flag recording",
          "Please record a Red Flag safe word first."
        );
        return;
      }
      console.log("Red Flag recording URI:", redFlagRecording);

      // Verify that the file actually exists on the filesystem.
      const fileInfo = await FileSystem.getInfoAsync(redFlagRecording);
      if (!fileInfo.exists) {
        Alert.alert(
          "Recording Not Found",
          "The red flag recording file could not be found on disk. Please re-record."
        );
        return;
      }
      console.log("Red Flag recording URI:", fileInfo.uri);

      if (playingType === "redFlag" && currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
        setPlayingType(null);
      } else {
        if (currentSound) {
          await currentSound.stopAsync();
          await currentSound.unloadAsync();
          setCurrentSound(null);
          setPlayingType(null);
        }
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
        });

        const { sound } = await Audio.Sound.createAsync({
          uri: fileInfo.uri,
        });

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setCurrentSound(null);
            setPlayingType(null);
          }
        });

        setCurrentSound(sound);
        setPlayingType("redFlag");
        console.log("Playing Red Flag Sound...");
        await sound.playAsync();
      }
    } catch (error) {
      console.log("Error playing Red Flag recording:", error);
    }
  }

  // Playback for Emergency
  async function playEmergencyRecording() {
    try {
      if (!emergencyRecording) {
        Alert.alert(
          "No Emergency recording",
          "Please record an Emergency trigger first."
        );
        return;
      }
      // Verify that the file exists on the filesystem.
      const fileInfo = await FileSystem.getInfoAsync(emergencyRecording);
      if (!fileInfo.exists) {
        Alert.alert(
          "Recording Not Found",
          "The emergency recording file could not be found on disk. Please re-record."
        );
        return;
      }
      console.log("Emergency recording URI:", emergencyRecording);

      if (playingType === "emergency" && currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
        setPlayingType(null);
      } else {
        if (currentSound) {
          await currentSound.stopAsync();
          await currentSound.unloadAsync();
          setCurrentSound(null);
          setPlayingType(null);
        }

        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
        });

        const { sound } = await Audio.Sound.createAsync({
          uri: fileInfo.uri,
        });

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setCurrentSound(null);
            setPlayingType(null);
          }
        });

        setCurrentSound(sound);
        setPlayingType("emergency");
        console.log("Playing Emergency Sound...");
        await sound.playAsync();
      }
    } catch (error) {
      console.log("Error playing Emergency recording:", error);
    }
  }

  async function removeSafeWord(type) {
    if (isListening) {
      setIsListening(false);
    }

    if (type === "redFlag") {
      // If the red flag recording is currently playing, stop it first.
      if (playingType === "redFlag" && currentSound) {
        try {
          await currentSound.stopAsync();
          await currentSound.unloadAsync();
          setCurrentSound(null);
          setPlayingType(null);
          console.log("Stopped red flag playback before deletion.");
        } catch (error) {
          console.error(
            "Error stopping red flag playback before deletion:",
            error
          );
        }
      }
      // Delete the recording file if it exists.
      if (redFlagRecording) {
        try {
          await FileSystem.deleteAsync(redFlagRecording);
          console.log("Red flag recording deleted.");
        } catch (error) {
          console.error("Error deleting red flag recording:", error);
        }
      }
      // Remove the safe word and recording URI from AsyncStorage.
      try {
        await AsyncStorage.removeItem("redFlagRecording");
        await AsyncStorage.removeItem("redFlagSafeWord");
        console.log("Red flag safe word data removed from AsyncStorage.");
      } catch (error) {
        console.error("Error removing red flag data from AsyncStorage:", error);
      }
      // Update component state.
      setRedFlagRecording(null);
      setRedFlagSafeWord("");
    } else if (type === "emergency") {
      // If the emergency recording is currently playing, stop it first.
      if (playingType === "emergency" && currentSound) {
        try {
          await currentSound.stopAsync();
          await currentSound.unloadAsync();
          setCurrentSound(null);
          setPlayingType(null);
          console.log("Stopped emergency playback before deletion.");
        } catch (error) {
          console.error(
            "Error stopping emergency playback before deletion:",
            error
          );
        }
      }
      // Delete the recording file if it exists.
      if (emergencyRecording) {
        try {
          await FileSystem.deleteAsync(emergencyRecording);
          console.log("Emergency recording deleted.");
        } catch (error) {
          console.error("Error deleting emergency recording:", error);
        }
      }
      // Remove the safe word and recording URI from AsyncStorage.
      try {
        await AsyncStorage.removeItem("emergencyRecording");
        await AsyncStorage.removeItem("emergencySafeWord");
        console.log("Emergency safe word data removed from AsyncStorage.");
      } catch (error) {
        console.error(
          "Error removing emergency data from AsyncStorage:",
          error
        );
      }
      // Update component state.
      setEmergencyRecording(null);
      setEmergencySafeWord("");
    }
  }

  // Helper function to discard an in‐progress safe word recording
  async function discardRecording() {
    if (!recording) return;
    try {
      // Stop and unload the recording without further processing.
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      console.log("Recording discarded.");
    } catch (error) {
      console.error("Error discarding recording:", error);
    } finally {
      // Reset state so no safe word recording is in progress.
      setRecording(null);
      setActiveRecordingType(null);
    }
  }

  const handleInfoPress = () => {
    setIsOverlayVisible(true);
  };

  const closeOverlay = () => {
    setIsOverlayVisible(false);
  };

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
            disabled={!canEnableListening}
            thumbColor={theme.text}
            trackColor={{ false: theme.secondary, true: theme.primary }}
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
                if (!recording) {
                  startRecording("redFlag");
                } else {
                  stopRecording("redFlag");
                }
              }}
              style={
                activeRecordingType === "redFlag" ? styles.micOn : styles.micOff
              }
            >
              <Ionicons
                name="mic"
                size={33}
                style={[
                  styles.secondaryColorIcon,
                  { textAlign: "center", paddingVertical: 15 },
                ]}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.borderBox}>
            <Ionicons
              name="warning-outline"
              size={22}
              style={styles.primaryTextColorIcon}
            />
            <Text style={[styles.cardH1, { color: theme.text }]}>
              Emergency
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (!recording) {
                  startRecording("emergency");
                } else {
                  stopRecording("emergency");
                }
              }}
              style={
                activeRecordingType === "emergency"
                  ? styles.micOn
                  : styles.micOff
              }
            >
              <Ionicons
                name="mic"
                size={33}
                style={[
                  styles.secondaryColorIcon,
                  { textAlign: "center", paddingVertical: 15 },
                ]}
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
          {/* Red Flag Box */}
          <View style={styles.borderBox}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Ionicons
                name="flag-outline"
                size={22}
                style={styles.primaryTextColorIcon}
              />
              {redFlagSafeWord && redFlagRecording && (
                <TouchableOpacity
                  onPress={() => {
                    removeSafeWord("redFlag");
                  }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    style={styles.primaryTextColorIcon}
                  />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.cardH1, { color: theme.text }]}>Red Flag</Text>

            {redFlagSafeWord && (
              <>
                <TouchableOpacity
                  onPress={() => setShowRedFlagWord((prev) => !prev)}
                  style={{ flexDirection: "row", alignItems: "center" }} // Align icon and text/dots horizontally
                >
                  <Ionicons
                    name={showRedFlagWord ? "eye" : "eye-off"}
                    size={22}
                    style={[styles.secondaryColorIcon, { paddingVertical: 5 }]}
                  />
                  {/* Wrap text in a <Text> component */}
                  <Text style={[styles.p, { color: theme.text }]}>
                    {showRedFlagWord ? redFlagSafeWord : "•••••••"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => playRedFlagRecording()}>
                  <Ionicons
                    name={
                      playingType === "redFlag" ? "stop-circle" : "play-circle"
                    }
                    size={32}
                    style={[
                      styles.secondaryColorIcon,
                      { textAlign: "center", paddingVertical: 15 },
                    ]}
                  />
                </TouchableOpacity>
              </>
            )}
            {!redFlagSafeWord && (
              <View style={styles.transparentPill}>
                <Text style={[{ color: theme.text, textAlign: "center" }]}>
                  No Recording
                </Text>
              </View>
            )}
          </View>

          {/* Emergency Box */}
          <View style={styles.borderBox}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Ionicons
                name="warning-outline"
                size={22}
                style={styles.primaryTextColorIcon}
              />
              {emergencySafeWord && emergencyRecording && (
                <TouchableOpacity
                  onPress={() => {
                    removeSafeWord("emergency");
                  }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    style={styles.primaryTextColorIcon}
                  />
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.cardH1, { color: theme.text }]}>
              Emergency
            </Text>

            {/* Eye Icon and Safe Word */}
            {emergencySafeWord && (
              <>
                <TouchableOpacity
                  onPress={() => setShowEmergencyWord((prev) => !prev)}
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <Ionicons
                    name={showEmergencyWord ? "eye" : "eye-off"}
                    size={22}
                    style={[styles.secondaryColorIcon, { paddingVertical: 5 }]}
                  />
                  {/* Wrap text directly in a <Text> component */}
                  <Text
                    style={[
                      styles.p,
                      {
                        color: theme.text,
                        maxWidth: "80%", // Limit the width of the text
                        flexShrink: 1, // Allow text to shrink
                      },
                    ]}
                    numberOfLines={1} // Ensure text stays on one line
                    ellipsizeMode="tail" // Add ellipsis if text overflows
                  >
                    {showEmergencyWord ? emergencySafeWord : "•••••••"}
                  </Text>
                </TouchableOpacity>

                {/* Play Button */}
                <TouchableOpacity onPress={() => playEmergencyRecording()}>
                  <Ionicons
                    name={
                      playingType === "emergency"
                        ? "stop-circle"
                        : "play-circle"
                    }
                    size={32}
                    style={[
                      styles.secondaryColorIcon,
                      { textAlign: "center", paddingVertical: 15 },
                    ]}
                  />
                </TouchableOpacity>
              </>
            )}
            {!emergencySafeWord && (
              <View style={styles.transparentPill}>
                <Text style={[{ color: theme.text, textAlign: "center" }]}>
                  No Recording
                </Text>
              </View>
            )}
          </View>
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
              First, set up your voice profile and record your safe words on the
              Home Page.
            </Text>
            <Text style={[styles.overlayText, { color: theme.text }]}>
              Next, go to the Contacts page to add existing or custom contacts,
              assigning them a priority level:
            </Text>
            <Text style={[styles.overlayText, { color: theme.text }]}>
              <Ionicons name="flag-outline" size={16} color={theme.text} />{" "}
              <Text style={{ fontWeight: "bold" }}>Red Flag:</Text> A situation
              that feels unsafe or distressing but does not require immediate
              intervention.{"\n\n"}
              <Ionicons
                name="warning-outline"
                size={16}
                color={theme.text}
              />{" "}
              <Text style={{ fontWeight: "bold" }}>Emergency:</Text> A crisis
              where your safety is in immediate danger and urgent help is
              needed.
            </Text>
            <Text style={[styles.overlayText, { color: theme.text }]}>
              Optionally, Enable Location sharing to include your live location
              in automated messages.
            </Text>
            <Text style={[styles.overlayText, { color: theme.text }]}>
              Once set up, turn on Enable Listening to detect safe words and
              send alerts to your contacts.
            </Text>
            <Text style={[styles.overlayText, { color: theme.text }]}>
              Shhhhhh...<Text style={{ fontWeight: "bold" }}>murmur</Text>
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
      paddingVertical: 10,
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
      padding: 10,
    },

    emptyBox: {
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 20,
      paddingVertical: 5,
      paddingHorizontal: 6,
      backgroundColor: theme.text + "40", // '40' represents 25% opacity in hex
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
      textAlign: "center",
      backgroundColor: theme.primary + "40",
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 50,
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
    },

    transparentPill: {
      backgroundColor: theme.text + "40",
      paddingVertical: 5,
      borderRadius: 20,
      borderColor: theme.text,
      borderWidth: 0.25,
      marginVertical: 18,
    },
  });
