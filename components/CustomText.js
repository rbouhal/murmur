import React, { useContext } from 'react';
import { Text, StyleSheet } from 'react-native';
import { FontContext } from '../context/FontContext';

export default function CustomText({ children, style, font = 'CustomFont', ...props }) {
  const fonts = useContext(FontContext);

  if (!fonts) {
    console.error('FontContext is not available. Did you forget to wrap the component in FontContext.Provider?');
    return null;
  }

  return (
    <Text style={[styles.text, style, { fontFamily: fonts[font] }]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    color: '#000',
  },
});
 