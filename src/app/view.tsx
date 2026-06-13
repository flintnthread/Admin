import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Legacy route — redirects to the API-backed bank details screen.
 */
export default function ViewBankRedirect() {
  const { sellerId } = useLocalSearchParams<{ sellerId?: string }>();

  if (sellerId) {
    return <Redirect href={{ pathname: "/viewbankdetails", params: { sellerId: String(sellerId) } }} />;
  }

  return <Redirect href="/sellerbankapproval" />;
}
