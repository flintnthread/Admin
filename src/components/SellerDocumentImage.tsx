import React, { useEffect, useMemo, useState } from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import { buildSellerDocumentImageCandidates } from "@/lib/sellerDocuments";

const PLACEHOLDER_SOURCE = require("@/assets/images/document-placeholder.png");

type Props = {
  path?: string | null;
  url?: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
};

export default function SellerDocumentImage({
  path,
  url,
  style,
  resizeMode = "cover",
}: Props) {
  const candidates = useMemo(
    () => buildSellerDocumentImageCandidates(path, url),
    [path, url],
  );

  const [index, setIndex] = useState(0);
  const [usePlaceholder, setUsePlaceholder] = useState(false);

  useEffect(() => {
    setIndex(0);
    setUsePlaceholder(false);
  }, [candidates.join("|")]);

  if (usePlaceholder || candidates.length === 0) {
    return (
      <Image
        source={PLACEHOLDER_SOURCE}
        style={style}
        resizeMode={resizeMode}
      />
    );
  }

  return (
    <Image
      source={{ uri: candidates[index] }}
      style={style}
      resizeMode={resizeMode}
      onError={() => {
        if (index < candidates.length - 1) {
          setIndex((i) => i + 1);
        } else {
          setUsePlaceholder(true);
        }
      }}
    />
  );
}
