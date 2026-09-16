import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

/**
 * Requests notification permission and returns a fresh Expo push token, or `null` if the
 * permission was denied or a token couldn't be issued.
 *
 * Note (Story 5.4): as of Expo SDK 53+, remote push notifications no longer work inside
 * Expo Go — a development build (`expo-dev-client`/EAS build) is required, and the app
 * must be linked to an EAS project (`eas init`, which populates `app.json`'s
 * `expo.extra.eas.projectId`) before `getExpoPushTokenAsync` can issue a real token. This
 * repo hasn't been through that setup yet, so this function is expected to return `null`
 * (permission may still be requestable, but no `projectId` means no real token) until the
 * user runs `eas init` and builds a dev client — the same category of gap as native
 * Google/Apple OAuth on mobile (see docs/stories/story-1.2.md).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    return null;
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) {
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}
