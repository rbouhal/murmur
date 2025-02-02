import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useTheme } from "../context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import { useDatabase } from "../services/database";
import { useAuth } from "../providers/AuthProvider";

export default function LoginScreen({ onLoginSuccess }) {
  const { insertUser } = useDatabase();
  const { setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isDarkMode] = React.useState(theme.background === "#0B0812");
  const styles = getStyles(theme);
  const fadeAnim = useRef(new Animated.Value(0)).current; // Initial opacity: 0

  const blurhash =
    "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayayj[fQj[ayayj[ayfjj[j[ayjuayj[";

  useEffect(() => {
    // Trigger fade-in animation when the component mounts
    Animated.timing(fadeAnim, {
      toValue: 1, // Final opacity: 1
      duration: 3000, // 3 seconds fade-in duration
      useNativeDriver: true, // Enable native driver for better performance
    }).start();
  }, [fadeAnim]);

  async function handleAppleSignIn() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      let displayName = "User"; // Default name
      const userId = credential.user;
      // Check if fullName is available (first login only)
      if (
        credential.fullName &&
        (credential.fullName.givenName || credential.fullName.familyName)
      ) {
        displayName = `${credential.fullName.givenName || ""} ${
          credential.fullName.familyName || ""
        }`.trim();
      } else {
        // If fullName is missing, check if it's already stored in AsyncStorage
        const storedName = await AsyncStorage.getItem("userName");
        if (storedName) {
          displayName = storedName; // Use the previously stored name
        }
      }

      await insertUser(userId, displayName);
      await AsyncStorage.setItem("userId", userId);
      await AsyncStorage.setItem("isLoggedIn", "true");
      await AsyncStorage.setItem("userName", displayName);

      setUser({ userId, displayName });

      onLoginSuccess();
    } catch (error) {}
  }

  return (
    <View style={styles.outerContainer}>
      <View style={styles.innerContainer}>
        {/* Animated Image */}
        <Animated.Image
          source={require("../assets/icon.png")}
          style={[styles.image, { opacity: fadeAnim }]} // Bind opacity to fadeAnim
        />
      </View>
      <View style={styles.appleContainer}>
        {/* Sign-in Button */}
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={
            isDarkMode
              ? AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          }
          cornerRadius={5}
          style={styles.button}
          onPress={handleAppleSignIn}
        />
      </View>
    </View>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    outerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    innerContainer: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.backgroundColor,
      shadowColor: theme.primary,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 0.7,
      shadowRadius: 4,
      width: 300,
    },
    image: {
      marginLeft: 14,
      width: 200, // Set the desired width of the image
      height: 200, // Set the desired height of the image
      marginBottom: 10, // Space between the image and button
    },
    button: {
      width: 200,
      height: 50,
    },
    appleContainer: {
      position: "absolute",
      bottom: 150,
    },
  });
