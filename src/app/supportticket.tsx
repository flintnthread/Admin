// Bootstrap Icons CDN — add to your index.html:
// <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"/>

import { useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */
type TicketStatus   = "Open" | "In Progress" | "Waiting" | "Resolved" | "Urgent";
type TicketPriority = "General" | "High" | "Low" | "Critical";

interface Ticket {
  id:       string;
  subject:  string;
  user:     string;
  priority: TicketPriority;
  status:   TicketStatus;
  ticketNo: string;
  date:     string;
  messages: Message[];
}

interface Message {
  from:    string;
  content: string;
  time:    string;
  isAdmin: boolean;
}

/* ═══════════════════════════════════════════
   SAMPLE DATA
═══════════════════════════════════════════ */
const TICKETS: Ticket[] = [
  {
    id: "1",
    subject:  "When will we receive the credit of our payment",
    user:     "Ravi Chauhan",
    priority: "General",
    status:   "Open",
    ticketNo: "#TKT-250601-000001",
    date:     "06 Jun, 25 20:22",
    messages: [
      { from: "Ravi Chauhan", content: "Hello, I made a payment 3 days ago but I have not received the credit yet. Please look into this matter urgently.", time: "06 Jun, 25 20:22", isAdmin: false },
      { from: "Support Team", content: "Hello Ravi, we have received your query. Our team is looking into it. You should receive the credit within 24 hours.", time: "06 Jun, 25 21:05", isAdmin: true  },
      { from: "Ravi Chauhan", content: "Thank you for the quick response. Please keep me updated.", time: "06 Jun, 25 21:30", isAdmin: false },
    ],
  },
  {
    id: "2",
    subject:  "Please arrange pickup of our core product",
    user:     "Suresh Patel",
    priority: "General",
    status:   "Open",
    ticketNo: "#TKT-250531-000002",
    date:     "31 May, 25 13:01",
    messages: [
      { from: "Suresh Patel", content: "We have 20 units of our core product ready for pickup. Please arrange logistics at the earliest.", time: "31 May, 25 13:01", isAdmin: false },
      { from: "Support Team", content: "Dear Suresh, our logistics team will contact you within 2 business days to schedule the pickup.", time: "31 May, 25 14:20", isAdmin: true },
    ],
  },
  {
    id: "3",
    subject:  "HOW TO COUNT KYC",
    user:     "Jasmeet Bansal",
    priority: "General",
    status:   "Open",
    ticketNo: "#TKT-250507-000003",
    date:     "07 May, 25 11:14",
    messages: [
      { from: "Jasmeet Bansal", content: "Can you please explain how KYC count is calculated in the admin panel? I am unable to understand the metrics.", time: "07 May, 25 11:14", isAdmin: false },
      { from: "Support Team",   content: "Hi Jasmeet, KYC count is calculated based on successfully verified documents. Each seller who has uploaded and passed verification counts as 1.", time: "07 May, 25 12:00", isAdmin: true  },
      { from: "Jasmeet Bansal", content: "Got it! Thank you for clarifying.", time: "07 May, 25 12:45", isAdmin: false },
    ],
  },
  {
    id: "4",
    subject:  "products upload is issue",
    user:     "Sandeep Narula",
    priority: "General",
    status:   "Resolved",
    ticketNo: "#TKT-250425-000004",
    date:     "25 Apr, 25 17:08",
    messages: [
      { from: "Sandeep Narula", content: "I am facing issues uploading products to the platform. The upload button is not working.", time: "25 Apr, 25 17:08", isAdmin: false },
      { from: "Support Team",   content: "Hi Sandeep, we have identified the issue. It was a temporary server glitch. Please try again now.", time: "25 Apr, 25 17:45", isAdmin: true  },
      { from: "Sandeep Narula", content: "It is working now. Thank you!", time: "25 Apr, 25 18:00", isAdmin: false },
      { from: "Support Team",   content: "Great! We are marking this ticket as resolved. Please reach out if you face any issues.", time: "25 Apr, 25 18:10", isAdmin: true  },
    ],
  },
  {
    id: "5",
    subject:  "Unable to access seller dashboard",
    user:     "Meena Sharma",
    priority: "High",
    status:   "In Progress",
    ticketNo: "#TKT-250420-000005",
    date:     "20 Apr, 25 09:30",
    messages: [
      { from: "Meena Sharma",  content: "I am unable to login to my seller dashboard since yesterday. Please help urgently.", time: "20 Apr, 25 09:30", isAdmin: false },
      { from: "Support Team",  content: "Hi Meena, we are investigating the issue. Our technical team is working on it.", time: "20 Apr, 25 10:15", isAdmin: true  },
    ],
  },
];

/* ═══════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════ */
const ORANGE  = "#F97316";
const DARK_BG = "#7B3F00";

const PRIORITY_BADGE: Record<TicketPriority, { bg: string; color: string }> = {
  "General":  { bg: "#1F2937", color: "#fff" },
  "High":     { bg: "#F59E0B", color: "#fff" },
  "Low":      { bg: "#3B82F6", color: "#fff" },
  "Critical": { bg: "#EF4444", color: "#fff" },
};

const STATUS_BADGE: Record<TicketStatus, { bg: string; color: string }> = {
  "Open":        { bg: "#F97316", color: "#fff" },
  "In Progress": { bg: "#F59E0B", color: "#fff" },
  "Waiting":     { bg: "#0D9488", color: "#fff" },
  "Resolved":    { bg: "#10B981", color: "#fff" },
  "Urgent":      { bg: "#EF4444", color: "#fff" },
};

const ALL_STATUSES:   (TicketStatus   | "All Status")[]     = ["All Status",     "Open", "In Progress", "Waiting", "Resolved", "Urgent"];
const ALL_PRIORITIES: (TicketPriority | "All Priorities")[] = ["All Priorities", "General", "High", "Low", "Critical"];

/* ═══════════════════════════════════════════
   BADGES
═══════════════════════════════════════════ */
function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const cfg = PRIORITY_BADGE[priority];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 5, padding: "2px 9px", fontSize: 11, fontWeight: 700, display: "inline-block" }}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const cfg = STATUS_BADGE[status];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 5, padding: "2px 9px", fontSize: 11, fontWeight: 700, display: "inline-block" }}>
      {status}
    </span>
  );
}

/* ═══════════════════════════════════════════
   CUSTOM DROPDOWN
═══════════════════════════════════════════ */
function Dropdown<T extends string>({
  value, onChange, options, style = {}
}: {
  value: T; onChange: (v: T) => void; options: T[]; style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          border: "1px solid #D1D5DB", borderRadius: 8,
          padding: "9px 36px 9px 14px", fontSize: 13,
          color: "#374151", background: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center",
          userSelect: "none", position: "relative"
        }}
      >
        <span style={{ flex: 1 }}>{value}</span>
        <i className={`bi bi-chevron-${open ? "up" : "down"}`} style={{ fontSize: 12, color: "#6B7280" }} />
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden"
        }}>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                padding: "9px 14px", fontSize: 13, cursor: "pointer",
                background: value === opt ? "#FFF7ED" : "#fff",
                color: value === opt ? ORANGE : "#374151",
                fontWeight: value === opt ? 700 : 400,
                borderBottom: "1px solid #F3F4F6",
                transition: "background 0.12s",
              }}
              onMouseEnter={e => { if (value !== opt) (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; }}
              onMouseLeave={e => { if (value !== opt) (e.currentTarget as HTMLElement).style.background = "#fff"; }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════ */
function StatCard({ label, count, bg, icon }: { label: string; count: number; bg: string; icon: string }) {
  return (
    <div style={{
      background: bg, borderRadius: 12, padding: "18px 12px",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 6, color: "#fff",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      minHeight: 100,
    }}>
      <i className={`bi ${icon}`} style={{ fontSize: 24, opacity: 0.95 }} />
      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.92, textAlign: "center", lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TICKET ROW
═══════════════════════════════════════════ */
function TicketRow({ ticket, selected, onClick }: { ticket: Ticket; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "14px 16px", borderBottom: "1px solid #F3F4F6",
        cursor: "pointer",
        background: selected ? "#FFF7ED" : "#fff",
        borderLeft: selected ? `3px solid ${ORANGE}` : "3px solid transparent",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = "#FAFAFA"; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = "#fff"; }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: "#111827", marginBottom: 5, lineHeight: 1.4 }}>
        {ticket.subject}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7, color: "#6B7280", fontSize: 12 }}>
        <i className="bi bi-person-circle" style={{ fontSize: 13 }} />
        <span>{ticket.user}</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        <PriorityBadge priority={ticket.priority} />
        <StatusBadge   status={ticket.status}   />
      </div>
      <div style={{ fontSize: 11, color: "#9CA3AF" }}>
        {ticket.ticketNo} | {ticket.date}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CONVERSATION PANEL
═══════════════════════════════════════════ */
function ConversationPanel({
  ticket, onBack, isMobile
}: { ticket: Ticket | null; onBack?: () => void; isMobile: boolean }) {
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket]);

  /* Empty state — shows chat icon exactly like the screenshot */
  if (!ticket) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 14, color: "#9CA3AF",
        padding: 40, background: "#fff",
        minHeight: isMobile ? 320 : "auto",
      }}>
        {/* Chat bubble icon matching screenshot */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "#F3F4F6",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className="bi bi-chat-square-dots" style={{ fontSize: 34, color: "#D1D5DB" }} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#374151", textAlign: "center" }}>
          Select a ticket to view conversation
        </div>
        <div style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", maxWidth: 260, lineHeight: 1.6 }}>
          Choose from the list on the left to start helping users
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px", borderBottom: "1px solid #E5E7EB",
        background: "#fff", display: "flex", alignItems: "flex-start", gap: 10,
        flexShrink: 0,
      }}>
        {isMobile && onBack && (
          <button
            onClick={onBack}
            style={{
              border: "none", background: "#F3F4F6", borderRadius: 8,
              width: 34, height: 34, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}
          >
            <i className="bi bi-arrow-left" style={{ fontSize: 15, color: "#374151" }} />
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 4 }}>{ticket.subject}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#6B7280" }}>
              <i className="bi bi-person-circle" style={{ marginRight: 4 }} />{ticket.user}
            </span>
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>|</span>
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge   status={ticket.status}   />
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>{ticket.ticketNo}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px 20px",
        background: "#F9FAFB", display: "flex", flexDirection: "column", gap: 14,
      }}>
        {ticket.messages.map((msg, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: msg.isAdmin ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "78%", padding: "11px 14px",
              borderRadius: msg.isAdmin ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
              background: msg.isAdmin ? ORANGE : "#fff",
              color: msg.isAdmin ? "#fff" : "#1F2937",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              fontSize: 13, lineHeight: 1.55
            }}>
              <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4, opacity: 0.85 }}>
                {msg.isAdmin
                  ? <><i className="bi bi-headset" style={{ marginRight: 4 }} /></>
                  : <><i className="bi bi-person-fill" style={{ marginRight: 4 }} /></>}
                {msg.from}
              </div>
              {msg.content}
            </div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4, paddingInline: 4 }}>{msg.time}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply box */}
      <div style={{
        padding: "12px 16px", borderTop: "1px solid #E5E7EB",
        background: "#fff", display: "flex", gap: 10, alignItems: "flex-end",
        flexShrink: 0,
      }}>
        <textarea
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          placeholder="Type your reply..."
          rows={2}
          style={{
            flex: 1, resize: "none", border: "1px solid #D1D5DB",
            borderRadius: 10, padding: "10px 12px", fontSize: 13,
            fontFamily: "inherit", color: "#374151", outline: "none"
          }}
        />
        <button
          onClick={() => setReplyText("")}
          style={{
            background: ORANGE, color: "#fff", border: "none",
            borderRadius: 10, padding: "10px 18px", fontWeight: 700,
            fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            height: 44, whiteSpace: "nowrap"
          }}
        >
          <i className="bi bi-send-fill" /> Send
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function SupportTicketManagement() {
  const [windowW, setWindowW] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const [statusFilter,   setStatusFilter]   = useState<TicketStatus | "All Status">("All Status");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "All Priorities">("All Priorities");
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [mobileView,     setMobileView]     = useState<"list" | "chat">("list");

  useEffect(() => {
    const onResize = () => setWindowW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMobile  = windowW < 640;
  const isTablet  = windowW >= 640  && windowW < 1024;
  const isDesktop = windowW >= 1024;

  /* Stat counts */
  const total   = TICKETS.length;
  const countOf = (s: TicketStatus) => TICKETS.filter(t => t.status === s).length;

  const STATS = [
    { label: "Total Tickets", count: total,                  bg: ORANGE,    icon: "bi-ticket-perforated-fill"   },
    { label: "Open",          count: countOf("Open"),        bg: "#10B981", icon: "bi-envelope-open-fill"       },
    { label: "In Progress",   count: countOf("In Progress"), bg: "#F59E0B", icon: "bi-arrow-clockwise"          },
    { label: "Waiting",       count: countOf("Waiting"),     bg: "#0D9488", icon: "bi-clock-fill"               },
    { label: "Resolved",      count: countOf("Resolved"),    bg: "#6B7280", icon: "bi-check-circle-fill"        },
    { label: "Urgent",        count: countOf("Urgent"),      bg: "#EF4444", icon: "bi-exclamation-circle-fill"  },
  ];

  /* Filtered tickets */
  const filtered = TICKETS.filter(t => {
    const matchStatus   = statusFilter   === "All Status"      || t.status   === statusFilter;
    const matchPriority = priorityFilter === "All Priorities"  || t.priority === priorityFilter;
    return matchStatus && matchPriority;
  });

  const selectedTicket = TICKETS.find(t => t.id === selectedId) ?? null;

  /* Layout helpers */
  const statGridCols = isMobile ? "1fr 1fr" : isTablet ? "repeat(3,1fr)" : "repeat(6,1fr)";
  const sidebarW     = isDesktop ? 340 : isTablet ? 280 : "100%";
  const contentPad   = isMobile ? "14px 12px" : isTablet ? "20px 18px" : "24px 32px";

  /* ── Chat panel height on desktop/tablet ── */
  const chatPanelHeight = isMobile ? "auto" : 560;

  return (
    <div style={{
      background: "#F3F4F6",
      minHeight: "100vh",
      fontFamily: "'Segoe UI', 'Inter', sans-serif",
      /* FIX: enable scroll on all viewports */
      overflowY: "auto",
      overflowX: "hidden",
    }}>
      <style>{`
        * { box-sizing: border-box; }
        textarea:focus, input:focus, button:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #F1F5F9; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
        html, body { height: 100%; overflow-y: auto; }
      `}</style>

      {/* ════════════════════════════════
          ORANGE HEADER BANNER
      ════════════════════════════════ */}
      <div style={{
        background: `linear-gradient(135deg, ${ORANGE} 0%, ${DARK_BG} 100%)`,
        /* FIX: no negative overlap on mobile — use consistent padding */
        padding: isMobile ? "20px 16px 24px" : "22px 32px 36px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative circles */}
        {[
          { size: 130, right: "6%",  top: "-35px",   opacity: 0.12 },
          { size: 85,  right: "21%", top: "8px",     opacity: 0.09 },
          { size: 65,  right: "14%", top: "50px",    opacity: 0.07 },
        ].map((c, i) => (
          <div key={i} style={{
            position: "absolute", width: c.size, height: c.size, borderRadius: "50%",
            background: "#fff", opacity: c.opacity,
            right: c.right, top: c.top, pointerEvents: "none",
          }} />
        ))}

        {/* White icon box */}
        <div style={{
          width: 46, height: 46, background: "#fff", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          position: "relative", zIndex: 1,
        }}>
          <i className="bi bi-headset" style={{ fontSize: 22, color: ORANGE }} />
        </div>

        <h1 style={{
          color: "#fff", margin: 0, fontWeight: 800,
          fontSize: isMobile ? 20 : 26, marginBottom: 6,
          position: "relative", zIndex: 1,
        }}>
          Support Ticket Management
        </h1>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 13, color: "rgba(255,255,255,0.85)",
          position: "relative", zIndex: 1,
        }}>
          <i className="bi bi-house-door-fill" style={{ fontSize: 13 }} />
          <span style={{ color: "#FFD89B", fontWeight: 600, cursor: "pointer" }}>Dashboard</span>
          <i className="bi bi-chevron-right" style={{ fontSize: 11 }} />
          <span>Support Management</span>
        </div>
      </div>

      {/* ════════════════════════════════
          MAIN CONTENT AREA
          FIX: positive marginTop for mobile — no overlap
      ════════════════════════════════ */}
      <div style={{
        maxWidth: isDesktop ? 1320 : "100%",
        margin: "0 auto",
        padding: contentPad,
        /* FIX: no negative margin. Use consistent positive top spacing */
        paddingTop: isMobile ? 16 : isTablet ? 20 : 24,
      }}>

        {/* ── Stat Cards ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: statGridCols,
          gap: isMobile ? 10 : 14,
          marginBottom: isMobile ? 16 : 22,
        }}>
          {STATS.map(s => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* ── Filters ── */}
        <div style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #E5E7EB",
          padding: isMobile ? "14px" : "16px 20px",
          marginBottom: isMobile ? 16 : 20,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 14,
        }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Filter by Status
            </label>
            <Dropdown
              value={statusFilter as any}
              onChange={(v) => setStatusFilter(v as any)}
              options={ALL_STATUSES as any}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Filter by Priority
            </label>
            <Dropdown
              value={priorityFilter as any}
              onChange={(v) => setPriorityFilter(v as any)}
              options={ALL_PRIORITIES as any}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* ════════════════════════════════
            TICKETS + CONVERSATION
        ════════════════════════════════ */}
        <div style={{
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #E5E7EB",
          overflow: "hidden",
          display: "flex",
          flexDirection: isDesktop || isTablet ? "row" : "column",
          /* FIX: on mobile, height is natural (auto) so it can expand and scroll.
             On desktop/tablet, use a fixed height so conversation panel scrolls inside. */
          height: isMobile ? "auto" : chatPanelHeight,
        }}>

          {/* ── LEFT: Ticket List ── */}
          {(!isMobile || mobileView === "list") && (
            <div style={{
              width: isDesktop ? sidebarW : isTablet ? sidebarW : "100%",
              borderRight: isDesktop || isTablet ? "1px solid #E5E7EB" : "none",
              borderBottom: isMobile ? "1px solid #E5E7EB" : "none",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              /* on desktop it fills the fixed height and scrolls internally */
              overflow: "hidden",
              height: isMobile ? "auto" : "100%",
            }}>
              {/* Sidebar header */}
              <div style={{
                background: `linear-gradient(90deg, ${ORANGE} 0%, ${DARK_BG} 100%)`,
                padding: "13px 16px",
                display: "flex", alignItems: "center", gap: 8,
                flexShrink: 0,
              }}>
                <i className="bi bi-ticket-perforated-fill" style={{ color: "#fff", fontSize: 16 }} />
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Support Tickets</span>
                <span style={{
                  marginLeft: "auto", background: "rgba(255,255,255,0.22)",
                  color: "#fff", borderRadius: 20, padding: "1px 10px",
                  fontSize: 11, fontWeight: 700,
                }}>
                  {filtered.length}
                </span>
              </div>

              {/* Ticket rows */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                /* mobile: show full list, no fixed height cap */
              }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>
                    <i className="bi bi-inbox" style={{ fontSize: 36, display: "block", marginBottom: 10, opacity: 0.4 }} />
                    No tickets match the filters
                  </div>
                ) : filtered.map(t => (
                  <TicketRow
                    key={t.id}
                    ticket={t}
                    selected={selectedId === t.id}
                    onClick={() => {
                      setSelectedId(t.id);
                      if (isMobile) setMobileView("chat");
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── RIGHT: Conversation Panel ── */}
          {(!isMobile || mobileView === "chat") && (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              overflow: "hidden",
              /* mobile chat: tall enough to show content */
              minHeight: isMobile && mobileView === "chat" ? 500 : "auto",
            }}>
              <ConversationPanel
                ticket={selectedTicket}
                isMobile={isMobile}
                onBack={() => { setMobileView("list"); setSelectedId(null); }}
              />
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ textAlign: "center", padding: "20px 0 12px", fontSize: 12, color: "#9CA3AF" }}>
          2026 © Flintnthread India Pvt. Ltd. — Support System
        </div>
      </div>
    </div>
  );
}