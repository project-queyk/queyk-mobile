import { BackendUserResponse, UserData } from "@/config/auth.config";
import { User } from "@react-native-google-signin/google-signin";

export async function fetchLatestUserData(
  userData: UserData
): Promise<UserData | null> {
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
      return null;
    }

    const data = await response.json();
    return data.data || data;
  } catch {
    return null;
  }
}

export async function validateUserInBackend(
  userData: UserData
): Promise<boolean> {
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
    return false;
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
      const errorText = await response.text();
      throw new Error(`Backend returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Backend authentication failed: ${error.message}`);
    }
    throw new Error("Backend authentication failed: Unknown error occurred");
  }
}
