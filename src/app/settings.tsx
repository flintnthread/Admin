import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AdminLayout from "@/components/admin-layout";
import { getApiErrorMessage } from "@/lib/api/client";
import { sweetCrud, sweetError } from "@/lib/sweetAlert";
import {
  fetchIntegrationSettings,
  updateIntegrationSettings,
  type IntegrationSettings,
} from "@/services/settingsApi";

const PRIMARY = "#151D4F";
const ACCENT = "#3B82F6";
const TEXT_BODY = "#374151";
const TEXT_MUTED = "#6B7280";
const BORDER = "#E5E7EB";

export default function SettingsScreen() {
  const isWeb = Platform.OS === "web";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<IntegrationSettings | null>(null);

  const [sendgridApiKey, setSendgridApiKey] = useState("");
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState("");
  const [shiprocketEmail, setShiprocketEmail] = useState("");
  const [shiprocketPassword, setShiprocketPassword] = useState("");
  const [shiprocketPickupLocation, setShiprocketPickupLocation] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchIntegrationSettings();
        if (!cancelled) {
          setCurrent(data);
          setTwilioAccountSid(data.twilioAccountSid ?? "");
          setTwilioPhoneNumber(data.twilioPhoneNumber ?? "");
          setShiprocketEmail(data.shiprocketEmail ?? "");
          setShiprocketPickupLocation(data.shiprocketPickupLocation ?? "");
        }
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: {
        sendgridApiKey?: string;
        twilioAccountSid?: string;
        twilioAuthToken?: string;
        twilioPhoneNumber?: string;
        shiprocketEmail?: string;
        shiprocketPassword?: string;
        shiprocketPickupLocation?: string;
      } = {};

      if (sendgridApiKey.trim()) payload.sendgridApiKey = sendgridApiKey.trim();
      if (twilioAccountSid.trim()) payload.twilioAccountSid = twilioAccountSid.trim();
      if (twilioAuthToken.trim()) payload.twilioAuthToken = twilioAuthToken.trim();
      if (twilioPhoneNumber.trim()) payload.twilioPhoneNumber = twilioPhoneNumber.trim();
      if (shiprocketEmail.trim()) payload.shiprocketEmail = shiprocketEmail.trim();
      if (shiprocketPassword.trim()) payload.shiprocketPassword = shiprocketPassword.trim();
      if (shiprocketPickupLocation.trim()) {
        payload.shiprocketPickupLocation = shiprocketPickupLocation.trim();
      }

      const updated = await updateIntegrationSettings(payload);
      setCurrent(updated);
      setSendgridApiKey("");
      setTwilioAuthToken("");
      setShiprocketPassword("");
      void sweetCrud.saved("Integration settings");
    } catch (e) {
      const msg = getApiErrorMessage(e);
      setError(msg);
      void sweetError("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isWeb && styles.contentWeb]}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Feather name="settings" size={22} color={ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Platform Settings</Text>
            <Text style={styles.subtitle}>
              Save once here — SendGrid, Twilio, and Shiprocket credentials are shared across customer, seller, and admin services.
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={ACCENT} style={{ marginVertical: 32 }} />
        ) : (
          <>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>SendGrid (Email)</Text>
              <Text style={styles.cardHint}>
                SMTP password / API key for all platform emails.
                {current?.sendgridApiKeyConfigured
                  ? ` Current: ${current.sendgridApiKeyMasked}`
                  : " Not configured yet."}
              </Text>
              <Text style={styles.label}>SendGrid API Key</Text>
              <TextInput
                style={styles.input}
                value={sendgridApiKey}
                onChangeText={setSendgridApiKey}
                placeholder="Enter new API key to update"
                placeholderTextColor={TEXT_MUTED}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Twilio (SMS / OTP)</Text>
              <Text style={styles.cardHint}>
                One Account SID + Auth Token + Phone Number for all mobile OTP (customer login and seller registration). No restart needed after save.
                {current?.twilioAuthTokenConfigured
                  ? ` Auth token: ${current.twilioAuthTokenMasked}`
                  : " Auth token not configured yet."}
              </Text>

              <Text style={styles.label}>Account SID</Text>
              <TextInput
                style={styles.input}
                value={twilioAccountSid}
                onChangeText={setTwilioAccountSid}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                placeholderTextColor={TEXT_MUTED}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Auth Token</Text>
              <TextInput
                style={styles.input}
                value={twilioAuthToken}
                onChangeText={setTwilioAuthToken}
                placeholder="Enter new auth token to update"
                placeholderTextColor={TEXT_MUTED}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={twilioPhoneNumber}
                onChangeText={setTwilioPhoneNumber}
                placeholder="+13189243311"
                placeholderTextColor={TEXT_MUTED}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Shiprocket (Shipping)</Text>
              <Text style={styles.cardHint}>
                Login email, password, and default pickup nickname for order shipments. Password can include special characters (#, !) safely — stored in the database, not properties files.
                {current?.shiprocketPasswordConfigured
                  ? ` Password: ${current.shiprocketPasswordMasked}`
                  : " Password not configured yet."}
              </Text>

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={shiprocketEmail}
                onChangeText={setShiprocketEmail}
                placeholder="flintandthread@gmail.com"
                placeholderTextColor={TEXT_MUTED}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={shiprocketPassword}
                onChangeText={setShiprocketPassword}
                placeholder="Enter new password to update"
                placeholderTextColor={TEXT_MUTED}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Default Pickup Location</Text>
              <TextInput
                style={styles.input}
                value={shiprocketPickupLocation}
                onChangeText={setShiprocketPickupLocation}
                placeholder="ASVI HOME FOODS"
                placeholderTextColor={TEXT_MUTED}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (loading || saving) && { opacity: 0.6 }]}
              onPress={() => void handleSave()}
              disabled={loading || saving}
              activeOpacity={0.85}
            >
              <Feather name="save" size={16} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save Settings"}</Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              Leave password/token fields empty to keep the current value. Changes apply immediately — no service restart.
            </Text>
          </>
        )}
      </ScrollView>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#F7F8FC" },
  content: { padding: 16, paddingBottom: 40 },
  contentWeb: { paddingHorizontal: 28, paddingTop: 20, maxWidth: 760, alignSelf: "center", width: "100%" },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 20,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: PRIMARY,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: PRIMARY,
    marginBottom: 6,
  },
  cardHint: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 18,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_BODY,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "web" ? 10 : 12,
    fontSize: 14,
    color: TEXT_BODY,
    backgroundColor: "#FAFAFA",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 4,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  note: {
    marginTop: 14,
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 18,
    textAlign: "center",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    marginBottom: 12,
  },
});
