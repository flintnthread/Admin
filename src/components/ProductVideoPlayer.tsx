import React from "react";
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  height?: number;
};

/** Product video for Admin (web-first). */
export function ProductVideoPlayer({ uri, style, height = 280 }: Props) {
  const source = String(uri ?? "").trim();
  if (!source) return null;

  if (Platform.OS === "web") {
    return (
      <View style={[styles.wrap, { height }, style]}>
        {/* @ts-expect-error HTML video element on web */}
        <video
          src={source}
          controls
          playsInline
          preload="metadata"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            backgroundColor: "#0f172a",
            borderRadius: 12,
          }}
        />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.wrap, styles.nativeFallback, { height }, style]}
      onPress={() => void Linking.openURL(source)}
      activeOpacity={0.85}
    >
      <MaterialCommunityIcons name="play-circle" size={56} color="#fff" />
      <Text style={styles.nativeText}>Play product video</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "#0f172a",
  },
  nativeFallback: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nativeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
