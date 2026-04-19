import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './DinText';

type Props = { children: ReactNode };

type State = { err: Error | null };

/**
 * Предотвращает полный «вылет» UI при необработанном исключении в дереве React.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.error('AppErrorBoundary', err, info.componentStack);
    }
  }

  render(): ReactNode {
    const { err } = this.state;
    if (err) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Что-то пошло не так</Text>
          <Text style={styles.body}>Экран не удалось показать. Попробуйте открыть его ещё раз.</Text>
          <Pressable
            style={styles.btn}
            onPress={() => this.setState({ err: null })}
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>Попробовать снова</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#121212',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  body: { color: '#ccc', fontSize: 14, marginBottom: 20 },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: '#2d6a4f',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  btnText: { color: '#fff', fontSize: 16 },
});
