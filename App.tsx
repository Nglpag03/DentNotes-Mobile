import "./tailwind.css";
import { ActivityIndicator, Alert, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import PatientsScreen from "./src/screens/PatientsScreen";
import PatientDetailScreen from "./src/screens/PatientDetailScreen";
import ScheduleScreen from "./src/screens/ScheduleScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import { ThemeProvider } from "./src/context/ThemeContext";
import SearchScreen from "./src/screens/SearchScreen";
import NotesScreen from "./src/screens/NotesScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import AboutScreen from "./src/screens/AboutScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import { useEffect, useRef, useState } from "react";

import * as Linking from "expo-linking";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import { supabase } from "./src/lib/supabase";

type Screen =
  | { name: "dashboard" }
  | { name: "patients" }
  | { name: "schedule" }
  | { name: "search" } 
  | { name: "notes" }
  | { name: "profile" }
  | { name: "about" } 
  | { name: "settings" }  
  | { name: "patient-from-dashboard"; id: string }
  | { name: "patient-from-patients"; id: string }
  | { name: "patient-from-schedule"; id: string }
  | { name: "patient-from-search"; id: string }
  | { name: "patient-from-notes"; id: string };

 function parseAuthParams(url: string) {
  const params = new URLSearchParams();
  const [beforeHash, hash = ""] = url.split("#");
  const query = beforeHash.split("?")[1] ?? "";
  new URLSearchParams(query).forEach((v, k) => params.set(k, v));
  new URLSearchParams(hash).forEach((v, k) => params.set(k, v));
  return params;
} 

function Root() {
  const { session, loading, onboardingSeen, markOnboardingSeen } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: "dashboard" });
  const [resetRequested, setResetRequested] = useState(false);
  const [processingLink, setProcessingLink] = useState(false);
  const handledUrls = useRef(new Set<string>());

useEffect(() => {
  async function handleIncomingUrl(url: string | null) {
    if (!url || !url.includes("reset-password")) return;
    if (handledUrls.current.has(url)) return;
    handledUrls.current.add(url);

    setProcessingLink(true);
    try {
      const params = parseAuthParams(url);

      if (params.get("error")) {
        throw new Error(params.get("error_description") ?? "Link error");
      }

      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        setResetRequested(true);
        return;
      }

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        setResetRequested(true);
        return;
      }

      throw new Error("No recovery code or tokens in link");
    } catch (error) {
      console.error("Password reset link failed:", error);
      Alert.alert(
        "Reset link problem",
        "This link is invalid or has expired. Please request a new one."
      );
    } finally {
      setProcessingLink(false);
    }
  }

  void Linking.getInitialURL().then(handleIncomingUrl);
  const subscription = Linking.addEventListener("url", ({ url }) => {
    void handleIncomingUrl(url);
  });
  return () => subscription.remove();
}, []);


    useEffect(() => {
    if (session) {
      setScreen({ name: "dashboard" });
    }
  }, [session?.user.id]);

if (loading || processingLink) {
  return (
    <View className="flex-1 items-center justify-center bg-[#faf8fc]">
      <ActivityIndicator size="large" color="#7c3aed" />
      <StatusBar style="dark" />
    </View>
  );
}

  if (resetRequested) {
  return (
    <ResetPasswordScreen
      onComplete={() => setResetRequested(false)}
    />
  );
}

  if (!onboardingSeen && !session) {
    return <OnboardingScreen onFinish={markOnboardingSeen} />;
  }


   if (!session) return <LoginScreen />;

      if (screen.name === "profile") {
      return <ProfileScreen onBack={() => setScreen({ name: "dashboard" })} />;
    }

    if (screen.name === "about") {
      return <AboutScreen onBack={() => setScreen({ name: "dashboard" })} />;
    }

    if (screen.name === "settings") {
  return <SettingsScreen onBack={() => setScreen({ name: "dashboard" })} />;
}
  // Patient detail — from any of the three origins
  if (screen.name === "patient-from-dashboard") {
    return (
      <PatientDetailScreen
        patientId={screen.id}
        onBack={() => setScreen({ name: "dashboard" })}
      />
    );
  }
  if (screen.name === "patient-from-patients") {
    return (
      <PatientDetailScreen
        patientId={screen.id}
        onBack={() => setScreen({ name: "patients" })}
      />
    );
  }
  if (screen.name === "patient-from-schedule") {
    return (
      <PatientDetailScreen
        patientId={screen.id}
        onBack={() => setScreen({ name: "schedule" })}
      />
    );
  }

  if (screen.name === "notes") {
  return (
    <NotesScreen
      onSelectPatient={(id) => setScreen({ name: "patient-from-notes", id })}
      onNavigateHome={() => setScreen({ name: "dashboard" })}
      onOpenSchedule={() => setScreen({ name: "schedule" })}
      onOpenPatients={() => setScreen({ name: "patients" })}
      onOpenProfile={() => setScreen({ name: "profile" })} 
      onOpenAbout={() => setScreen({ name: "about" })}
      onOpenSettings={() => setScreen({ name: "settings" })} 
    />
  );
}

if (screen.name === "patient-from-notes") {
  return (
    <PatientDetailScreen
      patientId={screen.id}
      onBack={() => setScreen({ name: "notes" })}
    />
  );
}

  if (screen.name === "search") {
  return (
    <SearchScreen
      onBack={() => setScreen({ name: "dashboard" })}
      onSelectPatient={(id) => setScreen({ name: "patient-from-search", id })}
    />
  );
}

if (screen.name === "patient-from-search") {
  return (
    <PatientDetailScreen
      patientId={screen.id}
      onBack={() => setScreen({ name: "search" })}
    />
  );
}


if (screen.name === "schedule") {
  return (
    <ScheduleScreen
      onSelectPatient={(id) =>
        setScreen({ name: "patient-from-schedule", id })
      }
      onNavigateHome={() => setScreen({ name: "dashboard" })}
      onOpenPatients={() => setScreen({ name: "patients" })}
      onOpenNotes={() => setScreen({ name: "notes" })}
      onOpenProfile={() => setScreen({ name: "profile" })} 
      onOpenAbout={() => setScreen({ name: "about" })}
      onOpenSettings={() => setScreen({ name: "settings" })} 
    />
  );
}

if (screen.name === "patients") {
  return (
    <PatientsScreen
      onSelectPatient={(id) =>
        setScreen({ name: "patient-from-patients", id })
      }
      onNavigateHome={() => setScreen({ name: "dashboard" })}
      onOpenSchedule={() => setScreen({ name: "schedule" })}
      onOpenNotes={() => setScreen({ name: "notes" })}
      onOpenProfile={() => setScreen({ name: "profile" })} 
      onOpenAbout={() => setScreen({ name: "about" })}
      onOpenSettings={() => setScreen({ name: "settings" })} 
    />
  );
}

  return (
    <DashboardScreen
      onViewAllPatients={() => setScreen({ name: "patients" })}
      onOpenSchedule={() => setScreen({ name: "schedule" })}
      onOpenSearch={() => setScreen({ name: "search" })}
      onSelectPatient={(id) =>
      setScreen({ name: "patient-from-dashboard", id })
    }
      onOpenNotes={() => setScreen({ name: "notes" })}
      onOpenProfile={() => setScreen({ name: "profile" })}
      onOpenAbout={() => setScreen({ name: "about" })}
      onOpenSettings={() => setScreen({ name: "settings" })} 
    />
  );
}



export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}