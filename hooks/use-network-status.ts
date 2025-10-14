import { isConnected, subscribeToNetworkChanges } from "@/utils/network";
import { useEffect, useState } from "react";

/**
 * Hook to monitor network connectivity status in real-time
 * @returns Object containing connection status and utilities
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function checkInitialState() {
      try {
        const connected = await isConnected();
        if (isMounted) {
          setIsOnline(connected);
        }
      } catch {
        if (isMounted) {
          setIsOnline(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    const unsubscribe = subscribeToNetworkChanges((connected) => {
      if (isMounted) {
        setIsOnline(connected);
        setIsLoading(false);
      }
    });

    checkInitialState();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    isLoading,
    connectionStatus: isOnline ? "online" : "offline",
  };
};
