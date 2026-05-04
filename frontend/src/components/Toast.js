/**
 * Toast.js — Premium user-friendly toast notification
 * Matches the design: circle icon | divider | title + subtitle | close button
 *
 * Usage:
 *   const [toast, setToast] = useState(null);
 *   const showToast = (title, subtitle = "", type = "error") => {
 *     setToast({ title, subtitle, type });
 *     setTimeout(() => setToast(null), 4500);
 *   };
 *   <Toast toast={toast} onClose={() => setToast(null)} />
 */
import React, { useEffect, useState } from "react";

const CONFIGS = {
  error: {
    bg: "#fff5f5",
    border: "#fecaca",
    iconBg: "#fee2e2",
    iconColor: "#ef4444",
    titleColor: "#991b1b",
    accentBar: "#ef4444",
    // SVG X icon
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
  },
  success: {
    bg: "#f0fdf4",
    border: "#bbf7d0",
    iconBg: "#dcfce7",
    iconColor: "#16a34a",
    titleColor: "#14532d",
    accentBar: "#22c55e",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  warning: {
    bg: "#fffbeb",
    border: "#fde68a",
    iconBg: "#fef3c7",
    iconColor: "#d97706",
    titleColor: "#92400e",
    accentBar: "#f59e0b",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  info: {
    bg: "#eff6ff",
    border: "#bfdbfe",
    iconBg: "#dbeafe",
    iconColor: "#2563eb",
    titleColor: "#1e3a8a",
    accentBar: "#3b82f6",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
};

const SUBTITLES = {
  "Grant failed": "Could not grant access. Please check the user email and try again.",
  "Save failed": "Could not save your changes. Please try again.",
};

/**
 * translateErrorMessage — Transforms technical Databricks/System errors into friendly ones.
 * E.g. "[ErrorClass=PRINCIPAL_NOT_FOUND] Could not find name t@gmail.com" 
 *   -> "User 't@gmail.com' was not found in Databricks."
 */
const translateErrorMessage = (raw) => {
  if (!raw) return { title: "Something went wrong", subtitle: "" };
  if (typeof raw !== "string") return { title: raw, subtitle: "" };

  // 1. Detect Databricks-style bracketed errors
  const errorClassMatch = raw.match(/ErrorClass=([\w.]+)/);
  const requestIdMatch = raw.match(/RequestId=([\w-]+)/);
  const errorClass = errorClassMatch ? errorClassMatch[1] : null;
  const requestId = requestIdMatch ? requestIdMatch[1] : null;

  // 2. Extract specific entities (like email or table name) if possible
  const emailMatch = raw.match(/name\s+([\w.@-]+)/i) || raw.match(/principal\s+([\w.@-]+)/i);
  const email = emailMatch ? emailMatch[1] : null;

  let title = raw;
  let subtitle = "";

  if (errorClass) {
    if (errorClass.includes("PRINCIPAL_NOT_FOUND") || errorClass.includes("PRINCIPAL_DOES_NOT_EXIST")) {
      title = email ? `User "${email}" not found` : "User not found in Databricks";
      subtitle = "Please verify the email address and try again.";
    } else if (errorClass.includes("PERMISSION_DENIED")) {
      title = "Access Denied";
      subtitle = "You don't have the required permissions for this action.";
    } else if (errorClass.includes("TABLE_NOT_FOUND") || errorClass.includes("RESOURCE_DOES_NOT_EXIST")) {
      title = "Resource not found";
      subtitle = "The requested table or catalog could not be located.";
    } else if (errorClass.includes("INVALID_PARAMETER_VALUE")) {
      title = "Invalid Operation";
      subtitle = "The request contained invalid parameters. Please check your input.";
    }
    
    // Attach technical details safely if not already handled
    if (!subtitle && requestId) {
      subtitle = `Technical Error: ${errorClass} (ID: ${requestId.slice(0, 8)}...)`;
    } else if (requestId) {
      subtitle += ` [Ref: ${requestId.slice(0, 8)}]`;
    }
  } else {
    // Basic mapping for common strings
    if (raw.toLowerCase().includes("credentials") || raw.toLowerCase().includes("password")) {
      title = "Invalid Credentials";
      subtitle = "Please check your email and password.";
    } else if (raw.toLowerCase().includes("access denied") || raw.toLowerCase().includes("forbidden")) {
      title = "Permission Required";
      subtitle = "You do not have administrative access for this action.";
    }
  }

  return { title, subtitle };
};

export function Toast({ toast, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [toast]);

  if (!toast || !visible) return null;

  const type = toast.type || "error";
  const cfg = CONFIGS[type] || CONFIGS.error;

  // Process raw message through translator
  const rawContent = toast.title || toast.message || "Something went wrong";
  const { title: translatedTitle, subtitle: translatedSubtitle } = translateErrorMessage(rawContent);

  const title = translatedTitle;
  const subtitle = toast.subtitle || translatedSubtitle || SUBTITLES[title] || (type === "error" ? "Something went wrong. Please try again or refresh the page." : "");

  return (
    <>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(-16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toastSlideOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(-16px) scale(0.97); }
        }
        .portal-toast {
          animation: toastSlideIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
      `}</style>
      <div
        className="portal-toast"
        style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 9999,
          maxWidth: "420px",
          width: "calc(100vw - 48px)",
          background: cfg.bg,
          border: `1.5px solid ${cfg.border}`,
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          gap: "0",
          padding: "18px 16px 18px 18px",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
        role="alert"
      >
        {/* Circle Icon */}
        <div style={{
          width: "48px", height: "48px", borderRadius: "50%",
          background: cfg.iconBg, color: cfg.iconColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          {cfg.icon}
        </div>

        {/* Vertical divider */}
        <div style={{ width: "1.5px", height: "44px", background: cfg.border, margin: "0 16px", flexShrink: 0, borderRadius: "2px" }} />

        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "15px", color: cfg.titleColor, marginBottom: subtitle ? "4px" : 0 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: "1.5" }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: cfg.iconColor, padding: "4px", marginLeft: "8px",
            borderRadius: "6px", display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0, opacity: 0.6,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
          onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}
          aria-label="Dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </>
  );
}

/**
 * useToast hook — drop-in replacement for manual toast state
 * Returns: { toast, showToast, closeToast, ToastComponent }
 */
export function useToast(autoDismissMs = 4500) {
  const [toast, setToast] = useState(null);
  const timerRef = React.useRef(null);

  const showToast = React.useCallback((title, subtitleOrType = "", type = "error") => {
    // Support overloaded call: showToast(msg, type) OR showToast(msg, subtitle, type)
    let subtitle = "";
    let resolvedType = type;
    if (subtitleOrType === "error" || subtitleOrType === "success" || subtitleOrType === "warning" || subtitleOrType === "info") {
      resolvedType = subtitleOrType;
      subtitle = "";
    } else {
      subtitle = subtitleOrType;
    }

    // Auto-detect "success" if not explicitly set and title sounds successful
    if (resolvedType === "error" && (title.toLowerCase().includes("success") || title.toLowerCase().includes("done") || title.toLowerCase().includes("deleted"))) {
      resolvedType = "success";
    }

    clearTimeout(timerRef.current);
    setToast({ title, subtitle, type: resolvedType });
    if (autoDismissMs > 0) {
      timerRef.current = setTimeout(() => setToast(null), autoDismissMs);
    }
  }, [autoDismissMs]);

  const closeToast = React.useCallback(() => {
    clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const ToastComponent = <Toast toast={toast} onClose={closeToast} />;

  return { toast, showToast, closeToast, ToastComponent };
}

export default Toast;
