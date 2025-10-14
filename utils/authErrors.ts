/**
 * Utility functions for handling authentication errors with user-friendly messages
 */

export interface AuthError extends Error {
  code?: string;
  statusCode?: number;
}

/**
 * Maps backend error codes to user-friendly messages
 */
export function getAuthErrorMessage(error: AuthError): string {
  if (
    error.message.includes("Too many sign-in attempts") ||
    error.message.includes("Authentication failed") ||
    error.message.includes("Access denied") ||
    error.message.includes("Network error") ||
    error.message.includes("Internet connection required") ||
    error.message.includes("email addresses are allowed")
  ) {
    return error.message;
  }

  if (error.statusCode) {
    switch (error.statusCode) {
      case 429:
        return "Too many sign-in attempts. Please wait a few minutes and try again.";
      case 401:
        return "Authentication failed. Please check your credentials and try again.";
      case 403:
        return "Access denied. You may not have permission to access this application.";
      case 404:
        return "Authentication service not found. Please try again later.";
      case 500:
        return "Server error occurred. Please try again in a few minutes.";
      case 503:
        return "Service temporarily unavailable. Please try again later.";
      default:
        return `Sign-in failed (Error ${error.statusCode}). Please try again later.`;
    }
  }

  if (error.code) {
    switch (error.code) {
      case "sign_in_cancelled":
        return "Sign-in was cancelled.";
      case "in_progress":
        return "Sign-in is already in progress.";
      case "play_services_not_available":
        return "Google Play Services not available or outdated.";
      default:
        return `Google Sign-In error: ${error.message || "Unknown error"}`;
    }
  }

  return (
    error.message ||
    "An unexpected error occurred during sign-in. Please try again."
  );
}

/**
 * Determines if an error should prevent navigation (user should stay on sign-in screen)
 */
export const shouldStayOnSignIn = (error: AuthError): boolean => {
  const stayOnSignInErrors = [
    "Too many sign-in attempts",
    "Authentication failed",
    "Access denied",
    "Network error",
    "Internet connection required",
    "email addresses are allowed",
    "Backend authentication failed",
    "Service temporarily unavailable",
    "Server error occurred",
  ];

  return (
    stayOnSignInErrors.some((errorType) => error.message.includes(errorType)) ||
    (error.statusCode !== undefined && error.statusCode >= 400)
  );
};

/**
 * Gets appropriate alert title based on error type
 */
export const getErrorAlertTitle = (error: AuthError): string => {
  if (error.message.includes("email addresses are allowed")) {
    return "Access Denied";
  }

  if (
    error.message.includes("Network error") ||
    error.message.includes("Internet connection required")
  ) {
    return "Connection Error";
  }

  if (error.statusCode === 429 || error.message.includes("Too many")) {
    return "Rate Limited";
  }

  if (error.statusCode && error.statusCode >= 500) {
    return "Server Error";
  }

  return "Sign-In Error";
};
