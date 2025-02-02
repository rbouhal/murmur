import axios from "axios";
import "react-native-get-random-values";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { EXPO_AZURE_API_KEY, EXPO_AZURE_ENDPOINT } from "@env";
import Constants from "expo-constants";

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
