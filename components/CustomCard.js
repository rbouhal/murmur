import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function CustomCard({ children, style }) {
  const { theme } = useTheme();

  // Customize these values if you want a different shadow color,
  // offset, opacity, or radius.
  const styles = StyleSheet.create({
    cardContainer: {
      backgroundColor: theme.cardBackground, 
      borderRadius: 15,
      paddingBottom: 35,
      
      // iOS Shadow
      shadowColor: theme.text, 
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      
      // Margin/spacing to separate from other elements
      marginVertical: 10,
      marginHorizontal: 10,
    },
  });

  return (
    <View style={[styles.cardContainer, style]}>
      {children}
    </View>
  );
}
