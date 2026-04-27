import { useNetInfo } from '@react-native-community/netinfo';

export function useIsOnline() {
  return useNetInfo();
}
