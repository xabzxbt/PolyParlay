"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    showCloseButton?: boolean;
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    className,
    showCloseButton = true,
}: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    // Use createPortal to render the modal at the end of document.body
    // This avoids z-index and stacking context issues when the modal is used inside other components like Headers
    return createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto animate-fade-in text-left">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Container */}
            <div className="flex min-h-full items-center justify-center p-4">
                {/* Modal Content */}
                <div
                    ref={modalRef}
                    className={cn(
                        "relative w-full max-w-lg bg-surface-2 border border-border-default rounded-modal shadow-elevated overflow-hidden animate-scale-in my-8",
                        className
                    )}
                    role="dialog"
                    aria-modal="true"
                >
                    {/* Header */}
                    {(title || showCloseButton) && (
                        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-1">
                            {title ? (
                                <div className="text-sm font-display font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
                                    {title}
                                </div>
                            ) : <div />}

                            {showCloseButton && (
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-pill hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    aria-label="Close modal"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Body */}
                    <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
                        {children}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
