import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { useAuth, useAuthErrorMessage } from "../context/auth-context";

// --- MOBILE LOGIN SCREEN ---
function MobileLoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<unknown>(null);
  const loginErrorMessage = useAuthErrorMessage(loginError);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const validateEmail = (value: string) => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(value);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) setEmailError("");
    if (loginError) setLoginError(null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) setPasswordError("");
    if (loginError) setLoginError(null);
  };

  const handleLogin = async () => {
    let isValid = true;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!validateEmail(trimmedEmail)) {
      setEmailError("Enter a valid email address");
      isValid = false;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else {
      setPasswordError("");
    }

    if (!isValid) return;

    setLoading(true);
    setLoginError(null);

    try {
      await signIn(trimmedEmail, password);
    } catch (err) {
      setLoginError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={stylesMobile.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={stylesMobile.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={stylesMobile.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={stylesMobile.container}>
            {/* Logo Section */}
            <View style={stylesMobile.logoContainer}>
              <Image
                source={require("../../assets/images/logo.jpg")}
                style={stylesMobile.logo}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <Text style={stylesMobile.title}>Admin Login</Text>

            {/* Subtitle */}
            <Text style={stylesMobile.subtitle}>
              {"Welcome back. Sign in to continue to the admin portal."}
            </Text>

            {/* Form Fields Container */}
            <View style={stylesMobile.formContainer}>
              {/* Email Input Wrapper */}
              <View style={stylesMobile.inputWrapper}>
                <Text style={stylesMobile.label}>Email</Text>
                <View
                  style={[
                    stylesMobile.emailInputContainer,
                    emailError
                      ? stylesMobile.inputError
                      : emailFocused
                      ? stylesMobile.inputFocused
                      : null,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={
                      emailError
                        ? "#EF4444"
                        : emailFocused
                        ? "#2D85E6"
                        : "#A0ABC0"
                    }
                  />
                  <TextInput
                    style={stylesMobile.textInput}
                    placeholder="Enter your email"
                    placeholderTextColor="#A0ABC0"
                    value={email}
                    onChangeText={handleEmailChange}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {emailError ? (
                  <Text style={stylesMobile.errorText}>{emailError}</Text>
                ) : null}
              </View>

              {/* Password Input Wrapper */}
              <View style={stylesMobile.inputWrapper}>
                <Text style={stylesMobile.label}>Password</Text>
                <View
                  style={[
                    stylesMobile.passwordInputContainer,
                    passwordError
                      ? stylesMobile.inputError
                      : passwordFocused
                      ? stylesMobile.inputFocused
                      : null,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={
                      passwordError
                        ? "#EF4444"
                        : passwordFocused
                        ? "#2D85E6"
                        : "#A0ABC0"
                    }
                  />
                  <TextInput
                    style={stylesMobile.passwordInput}
                    placeholder="Enter your password"
                    placeholderTextColor="#A0ABC0"
                    value={password}
                    onChangeText={handlePasswordChange}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                    style={stylesMobile.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color="#55657E"
                    />
                  </TouchableOpacity>
                </View>
                {passwordError ? (
                  <Text style={stylesMobile.errorText}>{passwordError}</Text>
                ) : null}
              </View>

              {/* Remember Me Checkbox Row */}
              <TouchableOpacity
                style={stylesMobile.rememberMeRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View style={[stylesMobile.checkbox, rememberMe && stylesMobile.checkboxChecked]}>
                  {rememberMe && (
                    <Feather name="check" size={12} color="#FFFFFF" strokeWidth={3} />
                  )}
                </View>
                <Text style={stylesMobile.rememberMeText}>Remember me</Text>
              </TouchableOpacity>

              {loginError !== null ? (
                <Text style={stylesMobile.errorText}>{loginErrorMessage}</Text>
              ) : null}

              {/* Sign In Button */}
              <TouchableOpacity
                style={[
                  stylesMobile.signInButton,
                  loading && stylesMobile.signInButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={stylesMobile.signInButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- WEB LOGIN SCREEN ---
function WebLoginScreen() {
  const { signIn } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 768;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true); // Default checked as shown in mockup
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<unknown>(null);
  const loginErrorMessage = useAuthErrorMessage(loginError);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const validateEmail = (value: string) => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(value);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) setEmailError("");
    if (loginError) setLoginError(null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) setPasswordError("");
    if (loginError) setLoginError(null);
  };

  const handleLogin = async () => {
    let isValid = true;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!validateEmail(trimmedEmail)) {
      setEmailError("Enter a valid email address");
      isValid = false;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else {
      setPasswordError("");
    }

    if (!isValid) return;

    setLoading(true);
    setLoginError(null);

    try {
      await signIn(trimmedEmail, password);
    } catch (err) {
      setLoginError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={stylesWeb.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View
        style={[
          stylesWeb.mainContainer,
          isLargeScreen ? stylesWeb.rowLayout : stylesWeb.columnLayout,
        ]}
      >
        {/* Left Column - Dashboard Banner (Desktop & Tablet only) */}
        {isLargeScreen && (
          <LinearGradient
            colors={["#1d324e", "#1d324e"]}
            style={stylesWeb.leftColumn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Logo and Slogan Grouped Wrapper */}
            <View style={stylesWeb.leftColumnTop}>
              {/* Top Logo Section */}
              <View style={stylesWeb.webLogoContainer}>
                <Image
                  source={require("../../assets/images/logo.jpg")}
                  style={stylesWeb.webLogo}
                  resizeMode="contain"
                />
              </View>

              {/* Middle Slogan Section */}
              <View style={stylesWeb.sloganContainer}>
                <Text style={stylesWeb.sloganTitle}>Manage your store with ease</Text>
                <Text style={stylesWeb.sloganSubtext}>
                  {
                    "Access orders, products, customers and\ngrow your business seamlessly."
                  }
                </Text>
              </View>

              {/* Illustration Section */}
              <Image
                source={require("../../assets/images/web_illustration.png")}
                style={stylesWeb.webIllustration}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>
        )}

        {/* Right Column - Login Form (Visible everywhere) */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={stylesWeb.rightColumn}
        >
          <ScrollView
            contentContainerStyle={stylesWeb.webScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Form Container Card */}
            <View style={stylesWeb.webFormWrapper}>
              {/* Titles */}
              <Text style={stylesWeb.webTitle}>Admin Login</Text>
              <Text style={stylesWeb.webSubtitle}>
                {"Enter your email address and password\nto access admin panel."}
              </Text>

              <View style={stylesWeb.formFields}>
                {/* Email Wrapper */}
                <View style={stylesWeb.inputWrapper}>
                  <Text style={stylesWeb.webLabel}>Email</Text>
                  <View
                    style={[
                      stylesWeb.webInputContainer,
                      emailError
                        ? stylesWeb.inputError
                        : emailFocused
                        ? stylesWeb.inputFocused
                        : null,
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={
                        emailError
                          ? "#EF4444"
                          : emailFocused
                          ? "#4C3A9B"
                          : "#9CA3AF"
                      }
                      style={stylesWeb.inputIcon}
                    />
                    <TextInput
                      style={stylesWeb.webTextInput}
                      placeholder="Enter your email"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={handleEmailChange}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {emailError ? (
                    <Text style={stylesWeb.errorText}>{emailError}</Text>
                  ) : null}
                </View>

                {/* Password Wrapper */}
                <View style={stylesWeb.inputWrapper}>
                  <Text style={stylesWeb.webLabel}>Password</Text>
                  <View
                    style={[
                      stylesWeb.webInputContainer,
                      passwordError
                        ? stylesWeb.inputError
                        : passwordFocused
                        ? stylesWeb.inputFocused
                        : null,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={
                        passwordError
                          ? "#EF4444"
                          : passwordFocused
                          ? "#4C3A9B"
                          : "#9CA3AF"
                      }
                      style={stylesWeb.inputIcon}
                    />
                    <TextInput
                      style={stylesWeb.webTextInput}
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={handlePasswordChange}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.7}
                      style={stylesWeb.webEyeButton}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordError ? (
                    <Text style={stylesWeb.errorText}>{passwordError}</Text>
                  ) : null}
                </View>

                {/* Remember Me Checkbox */}
                <TouchableOpacity
                  style={stylesWeb.webRememberRow}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      stylesWeb.webCheckbox,
                      rememberMe && stylesWeb.webCheckboxChecked,
                    ]}
                  >
                    {rememberMe && (
                      <Feather name="check" size={12} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                  <Text style={stylesWeb.webRememberText}>Remember me</Text>
                </TouchableOpacity>

                {loginError !== null ? (
                  <Text style={stylesWeb.errorText}>{loginErrorMessage}</Text>
                ) : null}

                {/* Login Button */}
                <TouchableOpacity
                  style={[
                    stylesWeb.webLoginButton,
                    loading && stylesWeb.webLoginButtonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={stylesWeb.webLoginButtonText}>Login</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Web Footer */}
              <Text style={stylesWeb.webFooterText}>
                © 2024 Flint & Thread. All rights reserved.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

// --- PLATFORM SELECTOR ROUTER ---
export default function LoginScreen() {
  if (Platform.OS === "web") {
    return <WebLoginScreen />;
  }
  return <MobileLoginScreen />;
}

// --- MOBILE STYLES ---
const stylesMobile = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  logoContainer: {
    width: 240,
    height: 60,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 80,
  },
  logo: {
    width: 240,
    height: 240,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#233A63",
    textAlign: "center",
    marginTop: 5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 34,
    color: "#55657E",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 30,
  },
  formContainer: {
    width: "100%",
  },
  inputWrapper: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#55657E",
    marginBottom: 10,
  },
  emailInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderColor: "#D7DDE5",
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    paddingLeft: 16,
  },
  textInput: {
    flex: 1,
    height: "100%",
    paddingLeft: 12,
    paddingRight: 20,
    fontSize: 16,
    color: "#1d324e",
  },
  inputFocused: {
    borderColor: "#1d324e",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderColor: "#D7DDE5",
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    paddingLeft: 16,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    paddingLeft: 12,
    fontSize: 16,
    color: "#1d324e",
  },
  eyeButton: {
    paddingHorizontal: 15,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  rememberMeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: "#D7DDE5",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: "#1d324e",
    borderColor: "#1d324e",
  },
  rememberMeText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#55657E",
  },
  signInButton: {
    height: 48,
    backgroundColor: "#1d324e",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    shadowColor: "#1d324e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});

// --- WEB STYLES ---
const stylesWeb = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  mainContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  rowLayout: {
    flexDirection: "row",
  },
  columnLayout: {
    flexDirection: "column",
  },
  leftColumn: {
    flex: 1,
    maxWidth: 550,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  rightColumn: {
    flex: 1.2,
    backgroundColor: "#FFFFFF",
  },
  webScrollContent: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    paddingBottom: 40,
  },
  webFormWrapper: {
    flex: 1,
    justifyContent: "center",
    alignSelf: "center",
    width: "100%",
    maxWidth: 440,
    paddingHorizontal: 24,
    marginTop: 40,
  },
  webTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1d324e",
    textAlign: "center",
    marginBottom: 8,
  },
  webSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 40,
  },
  formFields: {
    width: "100%",
  },
  inputWrapper: {
    marginBottom: 24,
  },
  webLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  webInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  webTextInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#111827",
    ...Platform.select({
      web: {
        outlineStyle: "none" as any,
      },
    }),
  },
  webEyeButton: {
    paddingLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  inputFocused: {
    borderColor: "#1d324e",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
  webRememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  webCheckbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  webCheckboxChecked: {
    backgroundColor: "#1d324e",
    borderColor: "#1d324e",
  },
  webRememberText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#1d324e",
  },
  webLoginButton: {
    height: 48,
    backgroundColor: "#1d324e",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  webLoginButtonDisabled: {
    opacity: 0.7,
  },
  webLoginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  webFooterText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  webLogoContainer: {
    alignItems: "center",
    width: "100%",
  },
  webLogo: {
    width: 240,
    height: 50,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  leftColumnTop: {
    width: "100%",
    alignItems: "center",
  },
  sloganContainer: {
    alignItems: "center",
    marginTop: 24,
  },
  sloganTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  sloganSubtext: {
    fontSize: 15,
    lineHeight: 22,
    color: "#C2B6D6",
    textAlign: "center",
  },
  webIllustration: {
    width: 320,
    height: 320,
    marginTop: 60,
    alignSelf: "center",
    borderRadius: 12,
  },
});