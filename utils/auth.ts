import { User } from "@react-native-google-signin/google-signin";

import { BackendUserResponse, UserData } from "@/config/auth.config";
import { isConnected } from "@/utils/network";

export async function fetchLatestUserData(
  userData: UserData
): Promise<UserData | null> {
  const hasConnection = await isConnected();

  if (!hasConnection) {
    return userData;
  }

  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/users/${userData.id}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_AUTH_TOKEN}`,
          "Content-Type": "application/json",
          "Token-Type": "auth",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404 || response.status === 410) {
        return null;
      }

      if (response.status === 401 || response.status === 403) {
        return userData;
      }

      if (response.status === 204) {
        return userData;
      }

      try {
        const errorBody = await response.json();
        const msg =
          (errorBody && (errorBody.message || errorBody.error || "") + "") ||
          "";
        const lowered = msg.toLowerCase();
        if (
          lowered.includes("not found") ||
          lowered.includes("not exist") ||
          lowered.includes("deleted") ||
          lowered.includes("no such user")
        ) {
          return null;
        }
      } catch {}

      return userData;
    }

    const data = await response.json();

    if (data == null) {
      return userData;
    }

    if (Object.prototype.hasOwnProperty.call(data, "data")) {
      if (data.data == null) {
        return userData;
      }
      return data.data;
    }

    try {
      const msg = (data && (data.message || data.error || "") + "") || "";
      const lowered = msg.toLowerCase();
      if (
        lowered.includes("not found") ||
        lowered.includes("not exist") ||
        lowered.includes("deleted") ||
        lowered.includes("no such user")
      ) {
        return null;
      }
    } catch {}

    return data;
  } catch {
    return userData;
  }
}

export async function validateUserInBackend(
  userData: UserData
): Promise<boolean> {
  const hasConnection = await isConnected();

  if (!hasConnection) {
    return true;
  }

  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/users/${userData.id}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_AUTH_TOKEN}`,
          "Content-Type": "application/json",
          "Token-Type": "auth",
        },
      }
    );

    return response.ok;
  } catch {
    return true;
  }
}

export async function signInToBackend(
  profile: User
): Promise<BackendUserResponse> {
  const userValues = {
    email: profile.user.email,
    name: `${profile.user.givenName} ${profile.user.familyName}`,
    oauthId: profile.user.id,
    profileImage: profile.user.photo,
  };

  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BACKEND_URL}/v1/api/users`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_AUTH_TOKEN}`,
          "Content-Type": "application/json",
          "Token-Type": "auth",
        },
        body: JSON.stringify(userValues),
      }
    );

    if (!response.ok) {
      switch (response.status) {
        case 429:
          throw new Error(
            "Too many sign-in attempts. Please wait a few minutes and try again."
          );
        case 401:
          throw new Error(
            "Authentication failed. Please check your credentials and try again."
          );
        case 403:
          throw new Error(
            "Access denied. You may not have permission to access this application."
          );
        case 404:
          throw new Error(
            "Authentication service not found. Please try again later."
          );
        case 500:
          throw new Error(
            "Server error occurred. Please try again in a few minutes."
          );
        case 503:
          throw new Error(
            "Service temporarily unavailable. Please try again later."
          );
        default:
          throw new Error(
            `Sign-in failed (Error ${response.status}). Please try again later.`
          );
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes("Too many sign-in attempts") ||
        error.message.includes("Authentication failed") ||
        error.message.includes("Access denied") ||
        error.message.includes("Sign-in failed")
      ) {
        throw error;
      }

      if (
        error.message.includes("Network request failed") ||
        error.message.includes("fetch")
      ) {
        throw new Error(
          "Network error. Please check your internet connection and try again."
        );
      }

      throw new Error(`Backend authentication failed: ${error.message}`);
    }
    throw new Error("Backend authentication failed: Unknown error occurred");
  }
}
