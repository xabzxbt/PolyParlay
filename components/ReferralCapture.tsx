"use client";
import { useEffect } from "react";
import { captureReferral } from "@/lib/referral";

export default function ReferralCapture() {
  useEffect(() => {
    captureReferral();
  }, []);
  return null;
}
