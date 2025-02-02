import axios from "axios";
import "react-native-get-random-values";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
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

export async function sendContacts(priorityType) {
  try {
    const savedContacts = await AsyncStorage.getItem("murmur_contacts");
    if (!savedContacts) {
      console.log("No saved contacts found.");
      return;
    }

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

    const filteredContacts = Object.values(savedContacts).filter(
      (contact) => contact.priority === targetPriority
    );

    if (filteredContacts.length === 0) {
      console.log(`No contacts with priority ${priorityType} found`);
      return;
    }

    const payload = {
      priority: priorityType,
      contacts: filteredContacts,
    };

    const endpoint = "";
    const url = `${EXPO_BACKEND_URL}/${endpoint}`;

    const response = await axios.post(url, payload);
    console.log("Contacts sent successfully:", response.data);
    return response.data;
  } catch (err) {
    console.error("Error sending contacts:", err);
    throw err;
  }
}
