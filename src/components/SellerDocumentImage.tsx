import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
} from "react-native";
import { buildSellerDocumentImageCandidates } from "@/lib/sellerDocuments";

const DOCUMENT_PLACEHOLDER = require("@/assets/images/document-placeholder.png") as ImageSourcePropType;

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
  const [usePlaceholder, setUsePlaceholder] = useState(candidates.length === 0);

  useEffect(() => {
    setIndex(0);
    setUsePlaceholder(candidates.length === 0);
  }, [candidates.join("|")]);

  if (usePlaceholder || candidates.length === 0) {
    return (
      <Image
        source={DOCUMENT_PLACEHOLDER}
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
