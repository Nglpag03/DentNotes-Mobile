import "./tailwind.css";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import PatientsScreen from "./src/screens/PatientsScreen";
import PatientDetailScreen from "./src/screens/PatientDetailScreen";
import ScheduleScreen from "./src/screens/ScheduleScreen";

// 👇 Split into explicit variants so TypeScript can narrow correctly
type Screen =
  | { name: "dashboard" }
  | { name: "patients" }
  | { name: "schedule" }
  | { name: "patient-from-dashboard"; id: string }
  | { name: "patient-from-patients"; id: string }
  | { name: "patient-from-schedule"; id: string };

function Root() {
  const { session, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: "dashboard" });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#faf8fc]">
        <ActivityIndicator size="large" color="#7c3aed" />
        <StatusBar style="dark" />
      </View>
    );
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

  if (screen.name === "schedule") {
    return (
      <ScheduleScreen
        onBack={() => setScreen({ name: "dashboard" })}
        onSelectPatient={(id) =>
          setScreen({ name: "patient-from-schedule", id })
        }
      />
    );
  }

  if (screen.name === "patients") {
    return (
      <PatientsScreen
        onSelectPatient={(id) =>
          setScreen({ name: "patient-from-patients", id })
        }
      />
    );
  }

  return (
    <DashboardScreen
      onViewAllPatients={() => setScreen({ name: "patients" })}
      onOpenSchedule={() => setScreen({ name: "schedule" })}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}