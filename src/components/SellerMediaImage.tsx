import React, { useEffect, useState } from "react";
import { Image, ImageStyle, StyleProp, Text, View, ViewStyle } from "react-native";
import { buildSellerImageCandidates } from "@/lib/api/media";

type Props = {
  seller: {
    profilePicUrl?: string | null;
    profilePicPath?: string | null;
    liveSelfiePath?: string | null;
    avatar?: string | null;
    banner?: string | null;
    name?: string;
  };
  size?: number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  fallbackInitials?: string;
  fallbackBg?: string;
  borderRadius?: number;
};

export default function SellerMediaImage({
  seller,
  size = 34,
  style,
  containerStyle,
  resizeMode = "cover",
  fallbackInitials,
  fallbackBg = "#D4690A",
  borderRadius,
}: Props) {
  const candidates = React.useMemo(() => {
    const fromPaths = buildSellerImageCandidates(seller);
    const direct = [seller.avatar, seller.banner].filter(Boolean) as string[];
    const all = [...direct, ...fromPaths];
    return all.filter((url, i) => url && all.indexOf(url) === i);
  }, [seller]);

  const [index, setIndex] = useState(0);
  const radius = borderRadius ?? (resizeMode === "cover" ? size / 2 : 0);

  useEffect(() => {
    setIndex(0);
  }, [candidates.join("|")]);

  const uri = candidates[index];
  const initials =
    fallbackInitials ??
    ((seller.name ?? "")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?");

  if (!uri) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: fallbackBg,
            justifyContent: "center",
            alignItems: "center",
          },
          containerStyle,
        ]}
      >
        <Text style={{ color: "#FFF", fontWeight: "700", fontSize: size * 0.35 }}>{initials}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: "#FFF3E6",
        },
        style,
      ]}
      resizeMode={resizeMode}
      onError={() => {
        if (index < candidates.length - 1) setIndex((i) => i + 1);
      }}
    />
  );
}
