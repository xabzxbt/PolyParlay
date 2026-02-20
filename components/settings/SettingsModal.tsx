"use client";
import React from "react";
import { X, Sliders, Volume2, VolumeX, Moon, Sun, Shield, Zap } from "lucide-react";
import { useSettings } from "@/providers/SettingsProvider";
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/Modal";

export default function SettingsModal({ onClose }: { onClose: () => void }) {
    const { slippage, setSlippage, theme, setTheme, soundEnabled, setSoundEnabled } = useSettings();

    return (
        <Modal isOpen={true} onClose={onClose} title={
            <>
                <Sliders size={16} className="text-primary" />
                Preferences
            </>
        }>
            <div className="p-5 space-y-6">

                {/* Slippage Section */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                            <Shield size={14} /> Max Slippage
                        </label>
                        <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-pill">
                            {slippage}%
                        </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {[0.5, 1, 2].map((val) => (
                            <button
                                key={val}
                                onClick={() => setSlippage(val)}
                                className={cn(
                                    "px-3 py-2 text-xs font-bold rounded-button border transition-all",
                                    slippage === val
                                        ? "bg-primary text-white border-primary shadow-sm"
                                        : "bg-surface-2 text-text-secondary border-border-default hover:border-primary/30 hover:text-primary"
                                )}
                            >
                                {val}%
                            </button>
                        ))}
                        <div className="relative">
                            <input
                                type="number"
                                value={slippage}
                                onChange={(e) => setSlippage(Math.min(50, Math.max(0.1, parseFloat(e.target.value) || 0)))}
                                className={cn(
                                    "w-full h-full px-2 text-center text-xs font-bold bg-surface-2 border rounded-button focus:outline-none focus:ring-1 focus:ring-primary transition-all",
                                    ![0.5, 1, 2].includes(slippage) ? "border-primary text-primary" : "border-border-default text-text-secondary"
                                )}
                                placeholder="Custom"
                            />
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-text-muted pointer-events-none">%</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
                        Your transaction will revert if the price changes unfavorably by more than this percentage.
                    </p>
                </section>

                {/* Interface Section */}
                <section className="pt-4 border-t border-border-default">
                    <h3 className="text-xs font-bold text-text-secondary mb-3 flex items-center gap-1.5">
                        <Zap size={14} /> Interface
                    </h3>

                    <div className="space-y-3">
                        {/* Sound Toggle */}
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border-default bg-surface-2 hover:border-primary/20 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-pill", soundEnabled ? "bg-primary/10 text-primary" : "bg-surface-3 text-text-muted")}>
                                    {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-text-primary">Sound Effects</div>
                                    <div className="text-[10px] text-text-muted">Audio feedback for actions</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className={cn("w-10 h-5 rounded-pill relative transition-colors", soundEnabled ? "bg-primary" : "bg-stroke")}
                            >
                                <div className={cn("absolute top-1 w-3 h-3 rounded-pill bg-white transition-all shadow-sm", soundEnabled ? "left-6" : "left-1")} />
                            </button>
                        </div>

                        {/* Theme Toggle */}
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border-default bg-surface-2 hover:border-primary/20 transition-colors opacity-80">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-pill bg-surface-3 text-text-secondary">
                                    {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-text-primary">Theme Mode</div>
                                    <div className="text-[10px] text-text-muted">Select your preferred appearance</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-pill border border-amber-500/20">Soon</span>
                                <div className="flex bg-surface-3 p-0.5 rounded-pill border border-border-default opacity-50 cursor-not-allowed">
                                    <button disabled className={cn("p-1.5 rounded-pill transition-all text-text-muted")}>
                                        <Sun size={12} />
                                    </button>
                                    <button disabled className={cn("p-1.5 rounded-pill transition-all bg-white shadow-sm text-primary")}>
                                        <Moon size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

            </div>

            <div className="p-4 bg-surface-1 border-t border-border-default text-center">
                <p className="text-[10px] text-text-disabled">PolyParlay v1.0.0 • Build 2026.02</p>
            </div>
        </Modal>
    );
}
