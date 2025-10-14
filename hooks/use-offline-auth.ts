import { useAuth } from "@/contexts/AuthContext";
import { executeIfOnline } from "@/utils/network";

/**
 * Hook that provides offline-aware utilities for authentication actions
 */
export const useOfflineAuth = () => {
  const { isOnline, ...authContext } = useAuth();

  /**
   * Execute a function only if online, with an optional offline callback
   */
  async function executeIfOnlineWithAuth(
    onlineCallback: () => Promise<void> | void,
    offlineCallback?: () => Promise<void> | void
  ) {
    return executeIfOnline(onlineCallback, offlineCallback);
  }

  /**
   * Show a user-friendly offline message
   */
  function getOfflineMessage(action: string = "perform this action") {
    return `You need an internet connection to ${action}. Please check your connection and try again.`;
  }

  /**
   * Check if user can perform online-only actions
   */
  const canPerformOnlineAction = () => isOnline;

  return {
    ...authContext,
    isOnline,
    executeIfOnlineWithAuth,
    getOfflineMessage,
    canPerformOnlineAction,
  };
};
