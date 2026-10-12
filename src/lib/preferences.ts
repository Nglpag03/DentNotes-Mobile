import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Preferences {
  defaultRoom: string;
  defaultDuration: number; // minutes
  notifySoon: boolean;
  notifyInProgress: boolean;
  notifyMissed: boolean;
}

const KEY = "dentnotes-preferences";

export const DEFAULT_PREFERENCES: Preferences = {
  defaultRoom: "",
  defaultDuration: 30,
  notifySoon: true,
  notifyInProgress: true,
  notifyMissed: true,
};

export async function loadPreferences(): Promise<Preferences> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(prefs: Preferences): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
}