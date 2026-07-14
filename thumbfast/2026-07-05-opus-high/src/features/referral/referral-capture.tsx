import { storeReferralCode } from "./referral-cookie";
import { useEffect } from "react";

export function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) storeReferralCode(ref);
  }, []);

  return null;
}
