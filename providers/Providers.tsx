"use client";
import { ReactNode } from "react";
import { Web3Provider } from "@/providers/Web3Provider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { SettingsProvider } from "@/providers/SettingsProvider";
import { ParlayProvider } from "@/providers/ParlayProvider";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ReferralCapture from "@/components/ReferralCapture";
import QuickSetupModal from "@/components/setup/QuickSetupModal";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <Web3Provider>
      <AuthProvider>
        <ToastProvider>
          <SettingsProvider>
            <ParlayProvider>
              <ErrorBoundary>
                <ReferralCapture />
                <Header />
                <QuickSetupModal />
                <main>{children}</main>
                <Footer />
              </ErrorBoundary>
            </ParlayProvider>
          </SettingsProvider>
        </ToastProvider>
      </AuthProvider>
    </Web3Provider>
  );
}
