import React, { useEffect, useMemo, useState } from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import { buildSellerDocumentImageCandidates } from "@/lib/sellerDocuments";

const BUNDLED_PLACEHOLDER = Image.resolveAssetSource(
  require("@/assets/images/document-placeholder.png"),
).uri;

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
  const candidates = useMemo(() => {
    const list = buildSellerDocumentImageCandidates(path, url);
    if (BUNDLED_PLACEHOLDER && !list.includes(BUNDLED_PLACEHOLDER)) {
      list.push(BUNDLED_PLACEHOLDER);
    }
    return list;
  }, [path, url]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates.join("|")]);

  return (
    <Image
      source={{ uri: candidates[index] }}
      style={style}
      resizeMode={resizeMode}
      onError={() => {
        if (index < candidates.length - 1) setIndex((i) => i + 1);
      }}
    />
  );
}
