import NetInfo from "@react-native-community/netinfo";

/**
 * Check if the device is connected to the internet
 * @returns Promise<boolean> - true if connected, false otherwise
 */
export async function isConnected(): Promise<boolean> {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected === true && netInfo.isInternetReachable === true;
  } catch {
    return false;
  }
}

/**
 * Subscribe to network state changes
 * @param callback - Function to call when network state changes
 * @returns Unsubscribe function
 */
export function subscribeToNetworkChanges(
  callback: (isConnected: boolean) => void
) {
  return NetInfo.addEventListener((state) => {
    const connected =
      state.isConnected === true && state.isInternetReachable === true;
    callback(connected);
  });
}

/**
 * Check if the device has internet connectivity and execute callback accordingly
 * @param onlineCallback - Function to execute when online
 * @param offlineCallback - Optional function to execute when offline
 */
export async function executeIfOnline(
  onlineCallback: () => Promise<void> | void,
  offlineCallback?: () => Promise<void> | void
): Promise<void> {
  const connected = await isConnected();

  if (connected) {
    await onlineCallback();
  } else if (offlineCallback) {
    await offlineCallback();
  }
}
