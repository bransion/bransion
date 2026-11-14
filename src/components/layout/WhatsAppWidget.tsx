// =====================================================================
// BRANSION — Floating WhatsApp support widget.
// Hidden below 320px wide. Fails silently if env var missing.
// =====================================================================
"use client";

import { MessageCircle } from "lucide-react";

export function WhatsAppWidget() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT;

  // If no phone number is set, render nothing.
  if (!phone) return null;

  const cleanPhone = phone.replace(/\D/g, "");
  const prefilledText = encodeURIComponent("Hi Bransion! I need help with: ");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${prefilledText}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0B0B0F] text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-gradient-to-br hover:from-[#0B0B0F] hover:to-[#2A2A3A] dark:bg-white dark:text-[#0B0B0F] dark:hover:bg-gradient-to-br dark:hover:from-gray-200 dark:hover:to-gray-400 sm:bottom-8 sm:right-8 hidden min-[320px]:flex"
      aria-label="Contact us on WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
