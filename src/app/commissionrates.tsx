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
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AdminLayout from "@/components/admin-layout";
import { getApiErrorMessage } from "@/lib/api/client";
import { fetchCommissionRates, updateCommissionRates } from "@/services/settingsApi";

const PRIMARY_ORANGE = "#ef7b1a";
const TITLE_DARK = "#1d324e";
const TEXT_BODY = "#504f56";
const TEXT_MUTED = "#69798c";
const BORDER_COLOR = "#6c8494";

const CommissionRatesScreen: React.FC = () => {
  const isWeb = Platform.OS === "web";

  const [b2cCommission, setB2cCommission] = useState("");
  const [b2bCommission, setB2bCommission] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rates = await fetchCommissionRates();
        if (!cancelled) {
          setB2cCommission(rates.b2c ?? "");
          setB2bCommission(rates.b2b ?? "");
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
    try {
      await updateCommissionRates(b2cCommission, b2bCommission);
      const msg = "Commission rates saved successfully!";
      if (isWeb) window.alert(msg);
      else Alert.alert("Success", msg);
    } catch (e) {
      const msg = getApiErrorMessage(e);
      if (isWeb) window.alert(msg);
      else Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const MainContent = (
    <ScrollView style={styles.mainContainer} contentContainerStyle={isWeb ? styles.webMainContent : styles.mobileMainContent}>
      {/* Header */}
      <View style={[styles.header, !isWeb && { marginBottom: 16 }]}>
        <Text style={styles.headerTitle}>Platform commission rates</Text>
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbLink}>Dashboard</Text>
          <Feather name="chevron-right" size={14} color={TEXT_MUTED} style={{ marginHorizontal: 4 }} />
          <Text style={styles.breadcrumbCurrent}>Commission (B2B / B2C)</Text>
        </View>
      </View>

      {/* Main Card */}
      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator size="large" color={PRIMARY_ORANGE} style={{ marginVertical: 24 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
        <Text style={styles.infoText}>
          These percentages apply to <Text style={{ fontWeight: "700" }}>selling price including GST</Text> when sellers add products and in seller payment breakdowns. B2B vs B2C is taken from each seller's profile <Text style={{ color: "#e879f9" }}>(sellers.seller_category)</Text>.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>B2C commission (%)</Text>
          <TextInput
            style={styles.textInput}
            value={b2cCommission}
            onChangeText={setB2cCommission}
            keyboardType="numeric"
          />
          <Text style={styles.inputHint}>Default retail / consumer sellers.</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>B2B commission (%)</Text>
          <TextInput
            style={styles.textInput}
            value={b2bCommission}
            onChangeText={setB2bCommission}
            keyboardType="numeric"
          />
          <Text style={styles.inputHint}>Business sellers (wholesale).</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (loading || saving) && { opacity: 0.6 }]}
          activeOpacity={0.8}
          onPress={handleSave}
          disabled={loading || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="save" size={14} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save rates</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <AdminLayout>
      <View style={styles.webLayout}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.webMainColumn}>
          {MainContent}
        </View>
      </View>
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F8",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  webLayout: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F4F6F8",
    height: "100%",
  },
  sidebarGap: {
    width: 260,
  },
  webMainColumn: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  mainContainer: {
    flex: 1,
  },
  webMainContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  mobileMainContent: {
    padding: 16,
    paddingBottom: 40,
  },
  
  header: {
    backgroundColor: "#151D4F",
    marginHorizontal: 2,
    marginTop: 12,
    borderRadius: 22,
    paddingHorizontal: 32,
    paddingVertical: 28,
    paddingBottom: 68,
    shadowColor: "#151D4F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
  },
  breadcrumbLink: {
    fontSize: 12,
    color: PRIMARY_ORANGE,
    fontWeight: "500",
  },
  breadcrumbCurrent: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    marginTop: -42,
    marginHorizontal: 16,
    zIndex: 10,
  },
  infoText: {
    fontSize: 13,
    color: TEXT_BODY,
    lineHeight: 20,
    marginBottom: 24,
  },

  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_BODY,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: TEXT_BODY,
    backgroundColor: "#F8FAFC",
    width: "100%",
    maxWidth: 400,
  },
  inputHint: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 6,
  },

  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_ORANGE,
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
    shadowColor: PRIMARY_ORANGE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  errorText: {
    fontSize: 13,
    color: "#DC2626",
    marginBottom: 16,
  },
});

export default CommissionRatesScreen;
