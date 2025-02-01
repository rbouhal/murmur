import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Keyboard, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function SearchBar({ theme, setSearchText }) {
  const [isFocused, setIsFocused] = useState(false); // Track input focus state
  const [text, setText] = useState(''); // Track input text
  const styles = getStyles(theme);

  const handleCollapse = () => {
    setIsFocused(false);
    setText(''); // Clear the input text
    setSearchText(''); // Clear the parent state
    Keyboard.dismiss(); // Collapse keyboard
  };

  const handleTextChange = (value) => {
    setText(value);
    setSearchText(value); // Update parent state
  };

  const handleSubmit = () => {
    Keyboard.dismiss(); // Only collapse the keyboard
  };

  return (
    <View style={styles.container}>
      {/* Left Chevron Icon */}
      {isFocused && (
        <TouchableOpacity onPress={handleCollapse} style={styles.iconWrapper}>
          <Icon name="chevron-back-outline" size={styles.iconSize} color={theme.text} />
        </TouchableOpacity>
      )}

      {/* Magnifying Glass Icon */}
      {!isFocused && (
        <Icon name="search" size={styles.iconSize} color={theme.text} style={styles.icon} />
      )}

      {/* Input Field */}
      <TextInput
        style={styles.input}
        placeholder="Search For Contacts..."
        placeholderTextColor={theme.secondary}
        onFocus={() => setIsFocused(true)}
        onSubmitEditing={handleSubmit} // Only collapse the keyboard
        value={text}
        onChangeText={handleTextChange}
      />
    </View>
  );
}

const getStyles = (theme) => {
  const { width } = Dimensions.get('window');
  const fontSize = Math.round(width * 0.04); // 4% of screen width
  const iconSize = Math.round(width * 0.06); // 6% of screen width

  return StyleSheet.create({
    container: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center', // Vertically align all items
      paddingHorizontal: 10,
      height: 50, // Fixed height for container
      alignSelf: 'center',
      backgroundColor: theme.background,
    },
    iconWrapper: {
      marginRight: 5, // Space between chevron and search icon
    },
    icon: {
      marginRight: 10, // Space between icon and input
    },
    iconSize, // Dynamically calculated icon size
    input: {
      width: '90%',
      height: '90%',
      borderWidth: 0,
      paddingHorizontal: 0,
      fontSize, // Dynamic font size for text
      color: theme.text,
    },
  });
};
