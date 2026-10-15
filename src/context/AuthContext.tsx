
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import * as Linking from "expo-linking";
type AuthState = {
  session: Session | null;
  loading: boolean;
  onboardingSeen: boolean;
  markOnboardingSeen: () => Promise<void>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>; 
  resetPassword: (email: string) => Promise<{ error: string | null }>;
};


const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  onboardingSeen: true,
  markOnboardingSeen: async () => {},
  signIn: async () => ({ error: "Authentication is not ready." }),
  signUp: async () => ({
    error: "Authentication is not ready.",
    needsConfirmation: false,
  }),
  signOut: async () => {},
  resetPassword: async () => ({ error: "Auth not ready" }),
});

function friendlyAuthError(error: unknown): string {
  const message =
    error instanceof Error ? error.message.toLowerCase() : "";

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid email or password")
  ) {
    return "Incorrect email or password. Please try again.";
  }

  if (message.includes("email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }

  if (
    message.includes("user already registered") ||
    message.includes("already been registered")
  ) {
    return "An account with this email may already exist. Try signing in.";
  }

  if (
    message.includes("password") &&
    (message.includes("weak") ||
      message.includes("at least") ||
      message.includes("characters"))
  ) {
    return "Your password does not meet the security requirements.";
  }

  if (
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("failed to fetch")
  ) {
    return "Unable to connect. Check your internet connection and try again.";
  }

  return "Authentication failed. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingSeen, setOnboardingSeen] = useState(true);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
      }
    });

    async function initialize() {
      try {
        const [storedOnboarding, authResult] = await Promise.all([
          AsyncStorage.getItem("dentnotes-onboarding-seen"),
          supabase.auth.getSession(),
        ]);

        if (!mounted) return;

        if (authResult.error) {
          console.error(
            "Unable to restore authentication session:",
            authResult.error.message
          );
        }

        setOnboardingSeen(storedOnboarding === "1");
        setSession(authResult.data.session);
      } catch (error) {
        if (!mounted) return;

        console.error("Authentication initialization failed:", error);
        setOnboardingSeen(true);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const markOnboardingSeen = useCallback(async () => {
    await AsyncStorage.setItem("dentnotes-onboarding-seen", "1");
    setOnboardingSeen(true);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        return {
          error: error ? friendlyAuthError(error) : null,
        };
      } catch (error) {
        return { error: friendlyAuthError(error) };
      }
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string
    ) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            },
          },
        });

        if (error) {
          return {
            error: friendlyAuthError(error),
            needsConfirmation: false,
          };
        }

        // A null session with a returned user commonly means
        // email confirmation is required.
        const needsConfirmation = Boolean(data.user && !data.session);

        return {
          error: null,
          needsConfirmation,
        };
      } catch (error) {
        return {
          error: friendlyAuthError(error),
          needsConfirmation: false,
        };
      }
    },
    []
  );

const resetPassword = useCallback(async (email: string) => {
  try {
    const redirectTo = Linking.createURL("reset-password");

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo }
    );

    return { error: error?.message ?? null };
  } catch {
    return {
      error: "Unable to send the reset email. Please try again.",
    };
  }
}, []);


  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error("Unable to sign out. Please try again.");
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        onboardingSeen,
        markOnboardingSeen,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
