"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SettingsContextType {
    slippage: number;
    setSlippage: (v: number) => void;
    theme: "light" | "dark";
    setTheme: (t: "light" | "dark") => void;
    soundEnabled: boolean;
    setSoundEnabled: (v: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [slippage, setSlippage] = useState(1.0); // Default 1%
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Load from local storage
        const savedSlippage = localStorage.getItem("poly_slippage");
        if (savedSlippage) setSlippage(parseFloat(savedSlippage));

        const savedTheme = localStorage.getItem("poly_theme") as "light" | "dark";
        if (savedTheme) setTheme(savedTheme);

        const savedSound = localStorage.getItem("poly_sound");
        if (savedSound) setSoundEnabled(savedSound === "true");
    }, []);

    useEffect(() => {
        if (!mounted) return;
        localStorage.setItem("poly_slippage", slippage.toString());
    }, [slippage, mounted]);

    useEffect(() => {
        if (!mounted) return;
        localStorage.setItem("poly_theme", theme);
        // Apply theme class to html if implemented
        if (theme === "dark") document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
    }, [theme, mounted]);

    useEffect(() => {
        if (!mounted) return;
        localStorage.setItem("poly_sound", soundEnabled.toString());
    }, [soundEnabled, mounted]);

    return (
        <SettingsContext.Provider value={{ slippage, setSlippage, theme, setTheme, soundEnabled, setSoundEnabled }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
