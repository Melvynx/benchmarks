import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { ReferralModalContent } from "./referral-modal";

export function openReferralDialog(orgSlug: string) {
  dialogManager.custom({
    title: "Get free thumbnails",
    description:
      "Share your referral link. You get free thumbnails after a successful referral.",
    size: "md",
    children: <ReferralModalContent orgSlug={orgSlug} />,
  });
}
