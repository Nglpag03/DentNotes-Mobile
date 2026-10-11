import "./tailwind.css";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
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

type Screen =
  | { name: "dashboard" }
  | { name: "patients" }
  | { name: "schedule" }
  | { name: "search" } 
  | { name: "patient-from-dashboard"; id: string }
  | { name: "patient-from-patients"; id: string }
  | { name: "patient-from-schedule"; id: string }
  | { name: "patient-from-search"; id: string };

function Root() {
  const { session, loading, onboardingSeen, markOnboardingSeen } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: "dashboard" });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#faf8fc]">
        <ActivityIndicator size="large" color="#7c3aed" />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (!onboardingSeen && !session) {
    return <OnboardingScreen onFinish={markOnboardingSeen} />;
  }

  if (!session) return <LoginScreen />;

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