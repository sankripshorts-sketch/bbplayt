import React from 'react';
import { TextInput as RNTextInput, type TextInputProps } from 'react-native';
import { normalizeDinTextStyle } from '../theme/normalizeDinTextStyle';

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(
  function DinTextInput(props, ref) {
    return (
      <RNTextInput {...props} ref={ref} style={normalizeDinTextStyle(props.style)} />
    );
  },
);
