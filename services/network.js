import axios from "axios";
import "react-native-get-random-values";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import {
  Alert,
} from "react-native";
import {
  EXPO_AZURE_API_KEY,
  EXPO_AZURE_ENDPOINT,
  EXPO_BACKEND_URL,
} from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function sendAudioToAzure(uri) {
  try {
    if (typeof uri !== "string") {
      throw new Error(`Invalid URI passed to sendAudioToAzure: ${uri}`);
    }

    const base64Data = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const audioBuffer = decode(base64Data);

    const response = await axios.post(EXPO_AZURE_ENDPOINT, audioBuffer, {
      headers: {
        "Ocp-Apim-Subscription-Key": EXPO_AZURE_API_KEY,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        Accept: "application/json;text/xml",
      },
      responseType: "json",
    });
    console.log("Azure STT response:", response.data);
    return response.data;
  } catch (err) {
    console.error("Azure STT error", err);
  }
}

export async function sendTextsToContacts(priorityType, location) {
  try {
    const savedContactsRaw = await AsyncStorage.getItem("murmur_contacts");
    const savedContacts = savedContactsRaw ? JSON.parse(savedContactsRaw) : {};
    if (!savedContacts) {
      console.log("No saved contacts found.");
      return;
    }

    // Extract latitude & longitude
    const processedLocation = location?.coords 
      ? { latitude: location.coords.latitude, longitude: location.coords.longitude }
      : null;

    // Map the incoming priority type to the stored priority string
    let targetPriority;
    if (priorityType === "emergency") {
      targetPriority = "Emergency";
    } else if (priorityType === "redFlag") {
      targetPriority = "Red Flag";
    } else {
      console.error("Invalid priority type provided to sendContacts.");
      return;
    }

    const filteredContacts = Object.values(savedContacts)
      .filter(contact => contact.priority === targetPriority)
      .map(contact => ({
        ...contact,
        phoneNumber: contact.phoneNumber.replace(/[\s()+-]/g, '') // Remove spaces, parentheses, plus signs
      }));
      
    if (filteredContacts.length === 0) {
      console.log(`No contacts with priority ${priorityType} found`);
      return;
    }

    const payload = {
      priority: priorityType,
      contacts: filteredContacts,
      location: processedLocation,
    };

    const response = await axios.post(`${EXPO_BACKEND_URL}/text-contacts`, payload);
    console.log("Contacts sent successfully:", response.data);
    return response.data;
  } catch (err) {
    console.error("Error sending contacts:", err);
    throw err;
  }
}

/**
 * Load Vosk models into memory.
 * Calls the `/load-models` endpoint in the Flask backend.
 */
export async function loadModels() {
  try {
    const response = await axios.get(`${EXPO_BACKEND_URL}/load-models`);
    console.log("Models loaded successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error loading models:", error);
    throw error;
  }
}

/**
 * Unload Vosk models to free memory.
 * Calls the `/unload-models` endpoint in the Flask backend.
 */
export async function unloadModels() {
  try {
    const response = await axios.get(`${EXPO_BACKEND_URL}/unload-models`);
    console.log("Models unloaded successfully:", response.data);
    await AsyncStorage.removeItem("speakerVector");
    return response.data;
  } catch (error) {
    console.error("Error unloading models:", error);
    throw error;
  }
}

// Function to upload voice recordings and set speaker vector
export async function uploadRecordings(recordings, setIsVoiceSetupVisible, setRecordings, setPhraseIndex) {
  try {
    const formData = new FormData();
    recordings.forEach((uri, index) => {
      formData.append(`audio${index + 1}`, {
        uri,
        type: "audio/wav",
        name: `audio${index + 1}.wav`,
      });
    });

    const response = await axios.post(`${EXPO_BACKEND_URL}/set-speaker-vector`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    await AsyncStorage.setItem("speakerVector", JSON.stringify(response.data.speaker_vector));
    console.log("Speaker vector stored successfully:", response.data.speaker_vector);

    Alert.alert("Success", "Your voice profile has been set up!");
    setIsVoiceSetupVisible(false);
    setRecordings([]);
    setPhraseIndex(0);
  } catch (error) {
    console.error("Error uploading recordings:", error);
    Alert.alert("Error", "Failed to set up voice profile. Please try again.");
    setRecordings([]); // Reset for retry
    setPhraseIndex(0);
  }
}

/**
 * Verifies if the provided voice sample matches the stored speaker vector.
 * Calls the `/verify-speaker` endpoint in the Flask backend.
 * 
 * @param {string} uri - The URI of the recorded audio file.
 * @returns {Promise<boolean>} - True if the speaker is verified, otherwise False.
 */
export async function verifySpeaker(uri) {
  try {
    const formData = new FormData();
    formData.append("audio", {
      uri,
      type: "audio/wav",
      name: "test_audio.wav",
    });

    const response = await axios.post(`${EXPO_BACKEND_URL}/verify-speaker`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const isVerified = response.data.verified === "True";
    console.log(`Speaker verification result: ${isVerified}`);
    return isVerified;
  } catch (error) {
    console.error("Error verifying speaker:", error);
    return false;
  }
}

