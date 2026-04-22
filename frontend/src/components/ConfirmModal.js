import React from "react";

/**
 * Shared ConfirmModal — Premium design with SVG icons
 * @param {boolean} isOpen 
 * @param {string} title 
 * @param {React.ReactNode} message 
 * @param {function} onConfirm 
 * @param {function} onCancel 
 * @param {string} confirmText 
 * @param {boolean} isDestructive 
 * @param {string} type - 'danger' | 'warning' | 'success' | 'info'
 */
const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirm", 
  isDestructive = false,
  type = "info"
}) => {
  if (!isOpen) return null;

  // Resolve design based on type or isDestructive
  const resolvedType = isDestructive ? "danger" : type;
  
  const COLORS = {
    danger: { main: "#ef4444", bg: "#fef2f2", iconBg: "#fef2f2" },
    warning: { main: "#f59e0b", bg: "#fffbeb", iconBg: "#fffbeb" },
    success: { main: "#10b981", bg: "#f0fdf4", iconBg: "#f0fdf4" },
    info: { main: "#3b82f6", bg: "#eff6ff", iconBg: "#eff6ff" },
  };

  const cfg = COLORS[resolvedType] || COLORS.info;

  const ICONS = {
    danger: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    ),
    warning: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    success: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    info: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  };

  return (
    <div 
      style={{ 
        position: "fixed", inset: 0, background: "rgba(100,116,139,0.3)", 
        backdropFilter: "blur(6px)", zIndex: 10000, 
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" 
      }} 
      onClick={onCancel}
    >
      <div 
        style={{ 
          background: "#fff", borderRadius: "24px", width: "100%", maxWidth: "420px", 
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden", 
          animation: "modalFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards", 
          padding: "40px 32px 32px", display: "flex", flexDirection: "column", 
          alignItems: "center" 
        }} 
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.96) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Dynamic Icon Wrapper */}
        <div style={{ 
          width: 64, height: 64, borderRadius: "50%", background: cfg.iconBg, 
          color: cfg.main, display: "flex", alignItems: "center", justifyContent: "center", 
          marginBottom: 24, boxShadow: `0 0 0 10px ${cfg.iconBg}` 
        }}>
          {ICONS[resolvedType] || ICONS.info}
        </div>

        {/* Content */}
        <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "#111827", textAlign: "center", letterSpacing: "-0.02em" }}>
          {title}
        </h2>
        
        <div style={{ width: 40, height: 3, background: cfg.main, margin: "16px 0", borderRadius: 2 }} />

        <div style={{ textAlign: "center", color: "#4b5563", fontSize: "15px", lineHeight: 1.6, marginBottom: 32 }}>
          {message}
        </div>

        {/* Action Buttons */}
        <div style={{ 
          width: "100%", display: "flex", gap: "12px", borderTop: "1px solid #f3f4f6", 
          paddingTop: "24px" 
        }}>
          <button 
            onClick={onCancel} 
            style={{ 
              flex: 1, padding: "12px", background: "#fff", color: "#374151", 
              border: "1px solid #d1d5db", borderRadius: "12px", fontWeight: 700, 
              fontSize: "14px", cursor: "pointer", transition: "all 0.2s" 
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
            onMouseLeave={e => e.currentTarget.style.background = "#fff"}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            style={{ 
              flex: 1, padding: "12px", background: cfg.main, color: "#fff", 
              border: "none", borderRadius: "12px", fontWeight: 700, 
              fontSize: "14px", cursor: "pointer", boxShadow: `0 4px 14px ${cfg.main}40`,
              transition: "all 0.2s" 
            }}
            onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"}
            onMouseLeave={e => e.currentTarget.style.filter = "none"}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
