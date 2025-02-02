import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendAudioToAzure } from "./network";

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

export const BACKGROUND_TASK = "BACKGROUND_ACTIVE_LISTEN";

export async function activeListenerBackground() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording: segmentRecording } = await Audio.Recording.createAsync({
      options: recordingOptions,
    });
    console.log("Background active listening segment recording started");

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await segmentRecording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = segmentRecording.getURI();
    console.log("Background active listening segment recorded at:", uri);

    if (uri) {
      const response = await sendAudioToAzure(uri);
      const recognizedText = response?.DisplayText || "";
      const cleanedText = recognizedText
        .replace(/[!.,]/g, "")
        .trim()
        .toLowerCase();
      console.log("Background active listening recognized text:", cleanedText);

      const redFlagSafeWord =
        (await AsyncStorage.getItem("redFlagSafeWord")) || "";
      const emergencySafeWord =
        (await AsyncStorage.getItem("emergencySafeWord")) || "";

      if (
        emergencySafeWord &&
        cleanedText.includes(emergencySafeWord.toLowerCase())
      ) {
        console.log("Emergency safe word detected in background!");
      } else if (
        redFlagSafeWord &&
        cleanedText.includes(redFlagSafeWord.toLowerCase())
      ) {
        console.log("Red Flag safe word detected in background!");
      }
    }
  } catch (err) {
    console.error("Error during background active listening segment:", err);
  }
}

TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    console.log("Running background active listening task");
    await activeListenerBackground();
    return BackgroundFetch.Result.NewData;
  } catch (err) {
    console.error("Background task error:", err);
    return BackgroundFetch.Result.Failed;
  }
});

export async function registerBackgroundTask() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK, {
      minimumInterval: 15,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log("Background task registered successfully");
  } catch (err) {
    console.error("Error registering background task:", err);
  }
}

export async function unregisterBackgroundTask() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK);
    console.log("Background task unregistered successfully");
  } catch (err) {
    console.error("Error unregistering background task:", err);
  }
}
