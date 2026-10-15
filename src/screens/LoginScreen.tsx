import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../context/AuthContext";

type Mode = "login" | "signup";

const LAST_EMAIL_KEY = "dentnotes-last-email";
const RESET_COOLDOWN_MS = 30_000;

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function LoginScreen() {
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [resetMode, setResetMode] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const scrollRef = useRef<ScrollView>(null);
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Synchronous lock: state updates are async, so a fast double-tap
  // could otherwise fire two requests.
  const submitting = useRef(false);
  const emailEditedByUser = useRef(false);
  const lastResetRequest = useRef<{ email: string; at: number } | null>(null);
  const firstRender = useRef(true);

  // UX: prefill the last email used to sign in (never the password).
  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(LAST_EMAIL_KEY)
      .then((saved) => {
        if (active && saved && !emailEditedByUser.current) {
          setEmail(saved);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // UX: when the form changes (sign in / sign up / reset), put the cursor
  // in the first field the user needs to fill.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      if (resetMode) {
        emailRef.current?.focus();
      } else if (mode === "signup") {
        firstNameRef.current?.focus();
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [mode, resetMode]);

  // UX: feedback appears at the top of the card, so make sure the user
  // can actually see it, even on small screens or with the keyboard open.
  useEffect(() => {
    if (error || message) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [error, message]);

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  function updateEmail(value: string) {
    emailEditedByUser.current = true;
    setEmail(value);
    clearFeedback();
  }

  function updatePassword(value: string) {
    setPassword(value);
    clearFeedback();
  }

  // Show an error and send the cursor to the field that needs fixing.
  function fail(text: string, field?: React.RefObject<TextInput | null>) {
    setError(text);
    field?.current?.focus();
  }

  function switchMode() {
    if (busy) return;

    setMode((current) => (current === "login" ? "signup" : "login"));
    setResetMode(false);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    clearFeedback();
  }

  function openPasswordReset() {
    if (busy) return;

    setResetMode(true);
    clearFeedback();
  }

  function returnToLogin() {
    if (busy) return;

    setResetMode(false);
    setMode("login");
    setPassword("");
    setConfirmPassword("");
    clearFeedback();
    Keyboard.dismiss();
  }

  async function handleSubmit() {
    if (busy || submitting.current) return;

    clearFeedback();

    const normalizedEmail = email.trim().toLowerCase();

    // Validate in the same order the fields appear on screen, so the
    // user is always sent to the first thing that needs attention.
    if (!resetMode && mode === "signup") {
      if (!firstName.trim() || !lastName.trim()) {
        fail(
          "Please enter your first and last name.",
          !firstName.trim() ? firstNameRef : lastNameRef
        );
        return;
      }

      if (firstName.trim().length < 2 || lastName.trim().length < 2) {
        fail(
          "First and last names must contain at least 2 characters.",
          firstName.trim().length < 2 ? firstNameRef : lastNameRef
        );
        return;
      }
    }

    if (!normalizedEmail) {
      fail("Please enter your email address.", emailRef);
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      fail("Please enter a valid email address.", emailRef);
      return;
    }

    if (!resetMode && !password) {
      fail("Please enter your password.", passwordRef);
      return;
    }

    if (!resetMode && mode === "signup") {
      if (password.length < 8) {
        fail("Your password must be at least 8 characters long.", passwordRef);
        return;
      }

      if (password !== confirmPassword) {
        fail("Your passwords do not match.", confirmPasswordRef);
        return;
      }
    }

    // ---- Password reset request ----
    if (resetMode) {
      // UX: stop accidental repeat taps from spamming the inbox
      // (and hitting Supabase's email rate limit).
      const last = lastResetRequest.current;
      if (last && last.email === normalizedEmail) {
        const remaining = Math.ceil(
          (RESET_COOLDOWN_MS - (Date.now() - last.at)) / 1000
        );
        if (remaining > 0) {
          setMessage(
            `A reset link was already sent. You can request another in ${remaining} seconds.`
          );
          return;
        }
      }

      submitting.current = true;
      Keyboard.dismiss();
      setBusy(true);

      try {
        const result = await resetPassword(normalizedEmail);

        if (result.error) {
          setError(result.error);
        } else {
          lastResetRequest.current = { email: normalizedEmail, at: Date.now() };
          setMessage(
            "If an account exists for this email, a password-reset link will be sent. Please check your inbox and spam folder."
          );
        }
      } catch {
        setError("Unable to send the reset email. Please check your connection and try again.");
      } finally {
        submitting.current = false;
        setBusy(false);
      }

      return;
    }

    // ---- Sign in / sign up ----
    submitting.current = true;
    Keyboard.dismiss();
    setBusy(true);

    try {
      if (mode === "signup") {
        const result = await signUp(
          normalizedEmail,
          password,
          firstName.trim(),
          lastName.trim()
        );

        if (result.error) {
          setError(result.error);
        } else if (result.needsConfirmation) {
          AsyncStorage.setItem(LAST_EMAIL_KEY, normalizedEmail).catch(() => {});
          setMode("login");
          setResetMode(false);
          setPassword("");
          setConfirmPassword("");
          setMessage(
            "Your account was created. Please check your email to confirm your account before signing in."
          );
        } else {
          // Supabase's auth listener handles a successful sign-in/session.
          setPassword("");
          setConfirmPassword("");
        }
      } else {
        const result = await signIn(normalizedEmail, password);

        if (result.error) {
          setError(result.error);
          // UX: a wrong password is the common failure, so put the cursor
          // back in the password field (the typed value is kept).
          passwordRef.current?.focus();
        } else {
          AsyncStorage.setItem(LAST_EMAIL_KEY, normalizedEmail).catch(() => {});
        }
        // On success, the auth listener switches to the dashboard.
      }
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const heading = resetMode
    ? "Reset your password"
    : mode === "login"
      ? "Welcome back"
      : "Create an account";

  const description = resetMode
    ? "Enter your email address and we'll help you reset your password."
    : mode === "login"
      ? "Sign in to access your patient notes."
      : "Start documenting your patient care today.";

  const submitLabel = resetMode
    ? "Send reset link"
    : mode === "login"
      ? "Sign in"
      : "Create account";

  return (
    <View className="flex-1 bg-[#faf8fc]">
      <StatusBar style="dark" />

      {/* Existing purple gradient */}
      <View className="absolute inset-x-0 top-0 h-72 overflow-hidden">
        <LinearGradient
          colors={["#a855f7", "#7c3aed", "#faf8fc"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1, opacity: 0.35 }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingVertical: 28,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          className="px-6"
        >
          {/* Existing branding */}
          <View className="mb-8 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-[22px] bg-purple-700 shadow-xl shadow-purple-900/30">
              <Text className="text-3xl">🦷</Text>
            </View>

            <Text className="text-3xl font-extrabold tracking-tight text-purple-950">
              DentNotes
            </Text>

            <Text className="mt-2 text-sm text-slate-500">
              Patient care, clearly documented.
            </Text>
          </View>

          {/* Existing card */}
          <View className="rounded-[28px] border border-purple-100 bg-white p-6 shadow-2xl shadow-purple-950/10">
            <Text className="text-xl font-bold text-slate-900">
              {heading}
            </Text>

            <Text className="mt-1 text-sm leading-5 text-slate-500">
              {description}
            </Text>

            {message ? (
              <View
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3"
              >
                <Text className="text-sm leading-5 text-emerald-700">
                  {message}
                </Text>
              </View>
            ) : null}

            {error ? (
              <View
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3"
              >
                <Text className="text-sm leading-5 text-red-700">
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Name fields */}
            {!resetMode && mode === "signup" ? (
              <View className="mt-4 flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    First name
                  </Text>

                  <TextInput
                    ref={firstNameRef}
                    accessibilityLabel="First name"
                    autoCapitalize="words"
                    autoComplete="given-name"
                    textContentType="givenName"
                    autoCorrect={false}
                    returnKeyType="next"
                    value={firstName}
                    onChangeText={(value) => {
                      setFirstName(value);
                      clearFeedback();
                    }}
                    onSubmitEditing={() => lastNameRef.current?.focus()}
                    placeholder="Jane"
                    placeholderTextColor="#94a3b8"
                    editable={!busy}
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900"
                  />
                </View>

                <View className="flex-1">
                  <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Last name
                  </Text>

                  <TextInput
                    ref={lastNameRef}
                    accessibilityLabel="Last name"
                    autoCapitalize="words"
                    autoComplete="family-name"
                    textContentType="familyName"
                    autoCorrect={false}
                    returnKeyType="next"
                    value={lastName}
                    onChangeText={(value) => {
                      setLastName(value);
                      clearFeedback();
                    }}
                    onSubmitEditing={() => emailRef.current?.focus()}
                    placeholder="Doe"
                    placeholderTextColor="#94a3b8"
                    editable={!busy}
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900"
                  />
                </View>
              </View>
            ) : null}

            {/* Email */}
            <View className="mt-4">
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Email address
              </Text>

              <TextInput
                ref={emailRef}
                accessibilityLabel="Email address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType={resetMode ? "send" : "next"}
                value={email}
                onChangeText={updateEmail}
                onSubmitEditing={() => {
                  if (resetMode) {
                    // Pressing the keyboard's action key sends the reset link.
                    handleSubmit();
                  } else {
                    passwordRef.current?.focus();
                  }
                }}
                placeholder="doctor@clinic.com"
                placeholderTextColor="#94a3b8"
                editable={!busy}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900"
              />
            </View>

            {/* Password */}
            {!resetMode ? (
              <View className="mt-4">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Password
                  </Text>
                </View>

                <View className="h-12 flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 pr-3">
                  <TextInput
                    ref={passwordRef}
                    accessibilityLabel="Password"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    textContentType={mode === "signup" ? "newPassword" : "password"}
                    secureTextEntry={!showPassword}
                    returnKeyType={mode === "signup" ? "next" : "done"}
                    value={password}
                    onChangeText={updatePassword}
                    onSubmitEditing={() => {
                      if (mode === "signup") {
                        confirmPasswordRef.current?.focus();
                      } else {
                        handleSubmit();
                      }
                    }}
                    placeholder="Enter your password"
                    placeholderTextColor="#94a3b8"
                    editable={!busy}
                    className="h-12 flex-1 px-4 text-sm text-slate-900"
                  />

                  <Pressable
                    onPress={() => setShowPassword((visible) => !visible)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    className="px-1 py-2"
                  >
                    <Text className="text-xs font-bold text-purple-700">
                      {showPassword ? "Hide" : "Show"}
                    </Text>
                  </Pressable>
                  
                </View>
                {mode === "login" ? (
                  <View className="mt-2 items-end">
                    <Pressable
                      onPress={openPasswordReset}
                      disabled={busy}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Forgot password"
                    >
                      <Text className="text-xs font-bold text-purple-700">
                        Forgot password?
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
                {mode === "signup" ? (
                  <Text className="mt-2 text-xs leading-4 text-slate-400">
                    Use at least 8 characters. Choose a password you don't use
                    for other accounts.
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Confirm password */}
            {!resetMode && mode === "signup" ? (
              <View className="mt-4">
                <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Confirm password
                </Text>

                <View className="h-12 flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 pr-3">
                  <TextInput
                    ref={confirmPasswordRef}
                    accessibilityLabel="Confirm password"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    secureTextEntry={!showConfirmPassword}
                    returnKeyType="done"
                    value={confirmPassword}
                    onChangeText={(value) => {
                      setConfirmPassword(value);
                      clearFeedback();
                    }}
                    onSubmitEditing={handleSubmit}
                    placeholder="Re-enter your password"
                    placeholderTextColor="#94a3b8"
                    editable={!busy}
                    className="h-12 flex-1 px-4 text-sm text-slate-900"
                  />

                  <Pressable
                    onPress={() =>
                      setShowConfirmPassword((visible) => !visible)
                    }
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    className="px-1 py-2"
                  >
                    <Text className="text-xs font-bold text-purple-700">
                      {showConfirmPassword ? "Hide" : "Show"}
                    </Text>
                  </Pressable>
                </View>

                {confirmPassword.length > 0 ? (
                  <Text
                    className={`mt-2 text-xs ${
                      password === confirmPassword
                        ? "text-emerald-700"
                        : "text-slate-500"
                    }`}
                  >
                    {password === confirmPassword
                      ? "Passwords match."
                      : "Passwords do not match yet."}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Submit */}
            <Pressable
              onPress={handleSubmit}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={submitLabel}
              accessibilityState={{ disabled: busy, busy }}
              className={`mt-6 h-12 flex-row items-center justify-center rounded-2xl ${
                busy ? "bg-purple-400" : "bg-purple-700"
              }`}
            >
              {busy ? (
                <>
                  <ActivityIndicator color="white" />
                  <Text className="ml-2 text-sm font-bold text-white">
                    Please wait...
                  </Text>
                </>
              ) : (
                <Text className="text-base font-bold text-white">
                  {submitLabel}
                </Text>
              )}
            </Pressable>

            {!resetMode ? (
              <Text className="mt-4 text-center text-xs leading-relaxed text-slate-400">
                Secure access for authorized dental professionals only.
              </Text>
            ) : null}

            {/* Footer navigation */}
            <View className="mt-4 flex-row flex-wrap justify-center border-t border-slate-100 pt-4">
              {resetMode ? (
                <>
                  <Text className="text-sm text-slate-500">
                    Remembered your password?{" "}
                  </Text>
                  <Pressable onPress={returnToLogin} disabled={busy}>
                    <Text className="text-sm font-bold text-purple-700">
                      Back to sign in
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text className="text-sm text-slate-500">
                    {mode === "login"
                      ? "Don't have an account? "
                      : "Already have an account? "}
                  </Text>
                  <Pressable
                    onPress={switchMode}
                    disabled={busy}
                    accessibilityRole="button"
                  >
                    <Text className="text-sm font-bold text-purple-700">
                      {mode === "login" ? "Sign up" : "Sign in"}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}