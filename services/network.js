import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import io from "socket.io-client";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { EXPO_AZURE_API_KEY, EXPO_SERVER_URL, EXPO_AZURE_ENDPOINT } from "@env";

// We’ll keep a reference to our socket, the ongoing Recording object,
// and an interval for chunking audio:
let socket = null;
let recording = null;
let chunkInterval = null;

/**
 * Send user data (name and contacts) to backend
 */
export async function sendDataToBackend() {
  try {
    const userName = await AsyncStorage.getItem("userName");
    const contactsList = await AsyncStorage.getItem("murmur_contacts");
    const parsedContacts = contactsList ? JSON.parse(contactsList) : [];

    const response = await axios.post(
      `${EXPO_SERVER_URL}/store-user-data`,
      { userName, contacts: parsedContacts },
      { headers: { Accept: "*/*", "Content-Type": "application/json" } }
    );

    console.log("Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending data to backend:", error);
  }
}

/**
 * Establish a WebSocket connection.
 */
export function connectToWebSocket() {
  if (!socket) {
    socket = io(EXPO_SERVER_URL);
    socket.on("connect", () => console.log("Connected to WebSocket server"));
    socket.on("disconnect", () =>
      console.log("Disconnected from WebSocket server")
    );
    socket.on("connect_error", (err) =>
      console.error("WebSocket connection error:", err)
    );
  }
  startAudioStreaming();
}

/**
 * Disconnect from WebSocket.
 */
export function disconnectFromWebSocket() {
  if (socket) {
    stopAudioStreaming();
    socket.disconnect();
    socket = null;
    console.log("Disconnected from WebSocket server");
  }
}

export async function sendAudioToAzure(uri) {
  try {
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

/**
 * Start capturing and streaming audio from the user's microphone to the WebSocket server.
 *
 * This method:
 * 1) Requests mic permission
 * 2) Configures the Audio mode for iOS/Android
 * 3) Starts recording
 * 4) Every few seconds, stops the recording, fetches the audio data, sends it over the socket,
 *    and starts a new recording immediately so streaming continues.
 */
export async function startAudioStreaming() {
  try {
    // 1) Request microphone permissions
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      console.log("Permission to access microphone denied");
      return;
    }

    // 2) Configure audio settings
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    // 3) Start recording
    recording = new Audio.Recording();
    await recording.prepareToRecordAsync(
      Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
    );
    await recording.startAsync();
    console.log("Recording started");

    // 4) Set up an interval to chunk and send audio every 2 seconds (adjust as needed)
    chunkInterval = setInterval(async () => {
      try {
        // Stop current recording
        await recording.stopAndUnloadAsync();

        // Get the audio file URI
        const uri = recording.getURI();
        if (!uri) return;

        // Fetch the file data as a Blob
        const response = await fetch(uri);
        const blob = await response.blob();

        // Convert Blob to ArrayBuffer using FileReader
        const arrayBuffer = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        });

        // If the socket is connected, emit the chunk
        if (socket && socket.connected) {
          // Convert arrayBuffer to a Uint8Array for sending over socket
          socket.emit("audio-stream", new Uint8Array(arrayBuffer));
        }

        // Re-initialize recording immediately for the next chunk
        recording = new Audio.Recording();
        await recording.prepareToRecordAsync(
          Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
        );
        await recording.startAsync();
      } catch (error) {
        console.log("Error during audio chunk processing:", error);
      }
    }, 2000);
  } catch (err) {
    console.error("Could not start audio streaming:", err);
  }
}

/**
 * Stop capturing and streaming audio from the user's microphone.
 * This clears the interval and stops/unloads the recording.
 */
export async function stopAudioStreaming() {
  try {
    if (chunkInterval) {
      clearInterval(chunkInterval);
      chunkInterval = null;
    }

    if (recording) {
      await recording.stopAndUnloadAsync();
      recording = null;
      console.log("Recording stopped");
    }
  } catch (error) {
    console.error("Error stopping audio streaming:", error);
  }
}
