// Add to index.html:
// <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"/>

import { useEffect, useRef, useState } from "react";

/* ─── Theme ─────────────────────────────────────────────────────────── */
const BLUE   = "#2563EB";
const LIGHT  = "#F8FAFC";
const BORDER = "#E8EDF5";

/* ─── Mock Data ─────────────────────────────────────────────────────── */
const MOCK_VERIFICATIONS = [
  { id: "BV-001", sellerName: "Sanju Sandilya",   email: "sanju.sandilya@gmail.com",  phone: "+91 98765 43210", business: "SG Creations",        account: "XXXX XXXX 4321", ifsc: "HDFC0001234", bank: "HDFC Bank",  status: "Pending",    attempts: 1, created: "05 Jun, 2025", verified: "—",           initials: "SS", color: "#F97316" },
  { id: "BV-002", sellerName: "Khajaer Mohammed",  email: "khater2025@gmail.com",      phone: "+91 96158 43215", business: "ZOYA ALL BAGS CENTER", account: "XXXX XXXX 8765", ifsc: "ICIC0002345", bank: "ICICI Bank", status: "Verified",   attempts: 2, created: "29 May, 2025", verified: "01 Jun, 2025", initials: "KM", color: "#10B981" },
  { id: "BV-003", sellerName: "Sandhya Gudisa",    email: "sandhya.gm@gmail.com",      phone: "+91 98760 12349", business: "Sandhya Boutique",     account: "XXXX XXXX 1234", ifsc: "SBIN0003456", bank: "SBI",        status: "Processing", attempts: 1, created: "28 May, 2025", verified: "—",           initials: "SG", color: "#8B5CF6" },
  { id: "BV-004", sellerName: "Rahul Sharma",      email: "rahul.sharma@gmail.com",    phone: "+91 97654 32109", business: "RS Traders",           account: "XXXX XXXX 5678", ifsc: "PUNB0004567", bank: "PNB",        status: "Failed",     attempts: 3, created: "20 May, 2025", verified: "—",           initials: "RS", color: "#3B82F6" },
  { id: "BV-005", sellerName: "Priya Mehta",       email: "priya.mehta@gmail.com",     phone: "+91 96543 21098", business: "PM Boutique",          account: "XXXX XXXX 9012", ifsc: "AXIS0005678", bank: "Axis Bank",  status: "Expired",    attempts: 2, created: "15 May, 2025", verified: "—",           initials: "PM", color: "#EC4899" },
  { id: "BV-006", sellerName: "Amit Verma",        email: "amit.verma@gmail.com",      phone: "+91 95432 10987", business: "Verma Electronics",    account: "XXXX XXXX 3456", ifsc: "HDFC0006789", bank: "HDFC Bank",  status: "Verified",   attempts: 1, created: "10 May, 2025", verified: "12 May, 2025", initials: "AV", color: "#06B6D4" },
  { id: "BV-007", sellerName: "Neha Joshi",        email: "neha.joshi@gmail.com",      phone: "+91 94321 09876", business: "Joshi Handcrafts",     account: "XXXX XXXX 7890", ifsc: "KOTAK0007890", bank: "Kotak",      status: "Pending",    attempts: 1, created: "05 May, 2025", verified: "—",           initials: "NJ", color: "#F59E0B" },
  { id: "BV-008", sellerName: "Vikram Singh",      email: "vikram.singh@gmail.com",    phone: "+91 93210 98765", business: "Singh Organics",       account: "XXXX XXXX 2345", ifsc: "SBIN0008901", bank: "SBI",        status: "Verified",   attempts: 1, created: "01 May, 2025", verified: "03 May, 2025", initials: "VS", color: "#EF4444" },
  { id: "BV-009", sellerName: "Deepa Nair",        email: "deepa.nair@gmail.com",      phone: "+91 92109 87654", business: "Nair Silks",           account: "XXXX XXXX 6789", ifsc: "ICIC0009012", bank: "ICICI Bank", status: "Processing", attempts: 2, created: "28 Apr, 2025", verified: "—",           initials: "DN", color: "#7C3AED" },
  { id: "BV-010", sellerName: "Suresh Babu",       email: "suresh.babu@gmail.com",     phone: "+91 91098 76543", business: "Babu Enterprises",     account: "XXXX XXXX 0123", ifsc: "AXIS0010123", bank: "Axis Bank",  status: "Failed",     attempts: 3, created: "22 Apr, 2025", verified: "—",           initials: "SB", color: "#059669" },
  { id: "BV-011", sellerName: "Ananya Krishnan",   email: "ananya.k@gmail.com",        phone: "+91 90987 65432", business: "AK Fashion Studio",    account: "XXXX XXXX 4567", ifsc: "HDFC0011234", bank: "HDFC Bank",  status: "Verified",   attempts: 1, created: "18 Apr, 2025", verified: "20 Apr, 2025", initials: "AK", color: "#DC2626" },
  { id: "BV-012", sellerName: "Manoj Tiwari",      email: "manoj.tiwari@gmail.com",    phone: "+91 89876 54321", business: "Tiwari General Store", account: "XXXX XXXX 8901", ifsc: "PUNB0012345", bank: "PNB",        status: "Expired",    attempts: 2, created: "12 Apr, 2025", verified: "—",           initials: "MT", color: "#9333EA" },
];

const STATUS_OPTIONS = ["All Status","Pending","Processing","Verified","Failed","Expired"];

const STATUS_CONFIG = {
  Pending:    { bg:"#FEF9C3", color:"#854D0E", border:"#FDE047", icon:"bi-clock",          iconBg:"#FEF08A", iconColor:"#CA8A04" },
  Processing: { bg:"#CFFAFE", color:"#155E75", border:"#67E8F9", icon:"bi-arrow-repeat",   iconBg:"#A5F3FC", iconColor:"#0891B2" },
  Verified:   { bg:"#DCFCE7", color:"#14532D", border:"#86EFAC", icon:"bi-check-circle",   iconBg:"#BBF7D0", iconColor:"#16A34A" },
  Failed:     { bg:"#FEE2E2", color:"#7F1D1D", border:"#FCA5A5", icon:"bi-x-circle",       iconBg:"#FECACA", iconColor:"#DC2626" },
  Expired:    { bg:"#F1F5F9", color:"#334155", border:"#CBD5E1", icon:"bi-hourglass-split", iconBg:"#E2E8F0", iconColor:"#64748B" },
};

/* ─── Helpers ───────────────────────────────────────────────────────── */
function Avatar({ initials, color, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color + "22", border: `2px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.32, color, flexShrink: 0, letterSpacing: 0.5 }}>
      {initials}
    </div>
  );
}

function StatusBadge({ status, size = "normal" }) {
  const c = STATUS_CONFIG[status] || { bg: "#F1F5F9", color: "#64748B", border: "#CBD5E1", icon: "bi-circle" };
  const small = size === "small";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 20, padding: small ? "2px 8px" : "4px 10px", fontSize: small ? 10 : 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      <i className={`bi ${c.icon}`} style={{ fontSize: small ? 10 : 12 }} /> {status}
    </span>
  );
}

/* Stat card icon box */
function StatIconBox({ icon, iconBg, iconColor, spinning }) {
  return (
    <div style={{ width: 44, height: 44, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <i className={`bi ${icon}`} style={{ fontSize: 22, color: iconColor, animation: spinning ? "spin 1.5s linear infinite" : "none" }} />
    </div>
  );
}

/* Custom dropdown using Bootstrap Icon */
function CustomSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", userSelect: "none" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#374151", background: "#fff", cursor: "pointer", minWidth: 160 }}
      >
        <span>{value}</span>
        <i className={`bi bi-chevron-${open ? "up" : "down"}`} style={{ fontSize: 12, color: "#94A3B8", marginLeft: 8 }} />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 200, overflow: "hidden", minWidth: 180 }}>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{ padding: "10px 16px", fontSize: 14, color: value === opt ? "#fff" : "#374151", background: value === opt ? BLUE : "#fff", cursor: "pointer", transition: "background 0.12s", fontWeight: value === opt ? 700 : 400 }}
              onMouseEnter={e => { if (value !== opt) e.currentTarget.style.background = "#F1F5F9"; }}
              onMouseLeave={e => { if (value !== opt) e.currentTarget.style.background = "#fff"; }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function BankVerifications() {
  const [windowW, setWindowW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [searchInput,  setSearchInput]  = useState("");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [page,    setPage]    = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    const onResize = () => setWindowW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMobile  = windowW < 640;
  const isTablet  = windowW >= 640 && windowW < 1024;
  const isDesktop = windowW >= 1024;

  /* Counts per status */
  const counts = {
    total:      MOCK_VERIFICATIONS.length,
    pending:    MOCK_VERIFICATIONS.filter(v => v.status === "Pending").length,
    processing: MOCK_VERIFICATIONS.filter(v => v.status === "Processing").length,
    verified:   MOCK_VERIFICATIONS.filter(v => v.status === "Verified").length,
    failed:     MOCK_VERIFICATIONS.filter(v => v.status === "Failed").length,
    expired:    MOCK_VERIFICATIONS.filter(v => v.status === "Expired").length,
  };

  /* Filter + search */
  const filtered = MOCK_VERIFICATIONS.filter(v => {
    const matchStatus = statusFilter === "All Status" || v.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      v.sellerName.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      v.phone.includes(q) ||
      v.business.toLowerCase().includes(q) ||
      v.account.toLowerCase().includes(q) ||
      v.ifsc.toLowerCase().includes(q) ||
      v.id.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const doFilter = () => { setSearchQuery(searchInput); setPage(1); };
  const handleKey = e => { if (e.key === "Enter") doFilter(); };

  /* When status changes, reset page */
  const handleStatusChange = (v) => { setStatusFilter(v); setPage(1); };

  /* Pagination numbers */
  const pageNums = (() => {
    if (totalPages <= 7) return [...Array(totalPages)].map((_, i) => i + 1);
    if (safePage <= 4)   return [1, 2, 3, 4, 5, "...", totalPages];
    if (safePage >= totalPages - 3) return [1, "...", totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages];
    return [1, "...", safePage - 1, safePage, safePage + 1, "...", totalPages];
  })();

  const STAT_CARDS = [
    { label: "TOTAL",      value: counts.total,      icon: "bi-list-ul",        iconBg: "#EFF6FF", iconColor: "#3B82F6", spinning: false },
    { label: "PENDING",    value: counts.pending,    icon: "bi-clock",          iconBg: "#FEF9C3", iconColor: "#CA8A04", spinning: false },
    { label: "PROCESSING", value: counts.processing, icon: "bi-arrow-repeat",   iconBg: "#CFFAFE", iconColor: "#0891B2", spinning: true  },
    { label: "VERIFIED",   value: counts.verified,   icon: "bi-check-circle",   iconBg: "#DCFCE7", iconColor: "#16A34A", spinning: false },
    { label: "FAILED",     value: counts.failed,     icon: "bi-x-circle",       iconBg: "#FEE2E2", iconColor: "#DC2626", spinning: false },
    { label: "EXPIRED",    value: counts.expired,    icon: "bi-hourglass-split",iconBg: "#F1F5F9", iconColor: "#64748B", spinning: false },
  ];

  const pad = isMobile ? "14px 12px" : isTablet ? "18px 20px" : "24px 32px";

  return (
    <div style={{ background: LIGHT, minHeight: "100vh", fontFamily: "'Inter','Segoe UI',sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input:focus, select:focus { outline: none; }
        button:focus { outline: none; }
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-track { background: #F1F5F9; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
      `}</style>

      <div style={{ flex: 1, maxWidth: isDesktop ? 1300 : "100%", width: "100%", margin: "0 auto", padding: pad }}>

        {/* ── Page Title ── */}
        <div style={{ marginBottom: isMobile ? 16 : 22 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: "#0F172A", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="bi bi-bank" style={{ fontSize: isMobile ? 18 : 22, color: BLUE }} />
            Bank Verifications
          </h1>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: isMobile ? "16px 12px" : "20px 24px", marginBottom: isMobile ? 14 : 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(3,1fr)" : "repeat(6,1fr)", gap: isMobile ? 10 : 16 }}>
            {STAT_CARDS.map(c => (
              <div
                key={c.label}
                onClick={() => handleStatusChange(c.label === "TOTAL" ? "All Status" : c.label.charAt(0) + c.label.slice(1).toLowerCase())}
                style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: isMobile ? "12px 10px" : "14px 16px", cursor: "pointer", transition: "all 0.15s", background: "#fff" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = "#CBD5E1"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = BORDER; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: isMobile ? 9 : 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{c.label}</div>
                    <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{c.value}</div>
                  </div>
                  <StatIconBox icon={c.icon} iconBg={c.iconBg} iconColor={c.iconColor} spinning={c.spinning} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Filters ── */}
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, padding: isMobile ? "14px 12px" : "18px 24px", marginBottom: isMobile ? 14 : 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "200px 1fr auto", gap: isMobile ? 10 : 14, alignItems: "end" }}>

            {/* Status */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>
                <i className="bi bi-funnel" style={{ marginRight: 4 }} />Status
              </label>
              <CustomSelect value={statusFilter} onChange={handleStatusChange} options={STATUS_OPTIONS} />
            </div>

            {/* Search */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>
                <i className="bi bi-search" style={{ marginRight: 4 }} />Search
              </label>
              <div style={{ position: "relative" }}>
                <i className="bi bi-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#94A3B8" }} />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Search by email, name, account, IFSC..."
                  style={{ width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px 10px 36px", fontSize: 14, color: "#374151", background: "#fff" }}
                />
                {searchInput && (
                  <i className="bi bi-x-circle-fill"
                    onClick={() => { setSearchInput(""); setSearchQuery(""); setPage(1); }}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#94A3B8", cursor: "pointer" }} />
                )}
              </div>
            </div>

            {/* Filter button */}
            <button
              onClick={doFilter}
              style={{ background: BLUE, color: "#fff", border: "none", borderRadius: 9, padding: "10px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, justifyContent: "center", height: 42, whiteSpace: "nowrap" }}
              onMouseEnter={e => e.currentTarget.style.background = "#1D4ED8"}
              onMouseLeave={e => e.currentTarget.style.background = BLUE}
            >
              <i className="bi bi-search" style={{ fontSize: 14 }} /> Filter
            </button>
          </div>
        </div>

        {/* ── Table / Cards ── */}
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}`, overflow: "hidden", marginBottom: isMobile ? 14 : 20 }}>

          {/* Per-page selector */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 12px 0" : "14px 20px 0", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>
              <i className="bi bi-table" style={{ marginRight: 5, color: BLUE }} />
              {filtered.length > 0
                ? `Showing ${(safePage-1)*perPage+1}–${Math.min(safePage*perPage,filtered.length)} of ${filtered.length}`
                : "No results"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#64748B" }}>Per page</span>
              <CustomSelect value={String(perPage)} onChange={v => { setPerPage(Number(v)); setPage(1); }} options={["5","10","20","50"]} />
            </div>
          </div>

          {/* Desktop Table */}
          {!isMobile ? (
            <div style={{ overflowX: "auto", padding: "0 0 4px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, marginTop: 12 }}>
                    {[
                      { label: "ID",              icon: "bi-hash" },
                      { label: "Seller",          icon: "bi-person" },
                      { label: "Account Details", icon: "bi-credit-card" },
                      { label: "Status",          icon: "bi-circle-half" },
                      { label: "Attempts",        icon: "bi-arrow-repeat" },
                      { label: "Created",         icon: "bi-calendar3" },
                      { label: "Verified",        icon: "bi-calendar-check" },
                      { label: "Actions",         icon: "bi-gear" },
                    ].map(h => (
                      <th key={h.label} style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        <i className={`bi ${h.icon}`} style={{ marginRight: 5 }} />{h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", color: "#94A3B8" }}>
                          <i className="bi bi-info-circle" style={{ fontSize: 40, marginBottom: 12, color: "#CBD5E1" }} />
                          <span style={{ fontSize: 15, fontWeight: 500 }}>No verifications found</span>
                          {(searchQuery || statusFilter !== "All Status") && (
                            <button onClick={() => { setSearchInput(""); setSearchQuery(""); setStatusFilter("All Status"); setPage(1); }}
                              style={{ marginTop: 10, background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, color: BLUE, cursor: "pointer", fontWeight: 600 }}>
                              Clear filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : paginated.map((v, idx) => (
                    <tr key={v.id}
                      style={{ borderBottom: `1px solid #F1F5F9`, background: idx % 2 === 0 ? "#fff" : "#FAFBFD", transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#F0F7FF"}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#FAFBFD"}
                    >
                      <td style={{ padding: "13px 14px", fontWeight: 700, color: "#94A3B8", fontSize: 12 }}>{v.id}</td>
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar initials={v.initials} color={v.color} size={34} />
                          <div>
                            <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 13 }}>{v.sellerName}</div>
                            <div style={{ fontSize: 11, color: "#94A3B8" }}><i className="bi bi-envelope" style={{ marginRight: 3 }} />{v.email}</div>
                            <div style={{ fontSize: 11, color: "#94A3B8" }}><i className="bi bi-telephone" style={{ marginRight: 3 }} />{v.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{v.account}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8" }}><i className="bi bi-bank" style={{ marginRight: 3 }} />{v.bank}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8" }}>IFSC: {v.ifsc}</div>
                      </td>
                      <td style={{ padding: "13px 14px" }}><StatusBadge status={v.status} /></td>
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          {[...Array(3)].map((_, i) => (
                            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < v.attempts ? (v.status === "Failed" ? "#EF4444" : v.status === "Verified" ? "#22C55E" : "#F59E0B") : "#E2E8F0" }} />
                          ))}
                          <span style={{ fontSize: 12, color: "#64748B", marginLeft: 2, fontWeight: 600 }}>{v.attempts}/3</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 14px", fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>{v.created}</td>
                      <td style={{ padding: "13px 14px", fontSize: 12, color: v.verified === "—" ? "#CBD5E1" : "#475569", whiteSpace: "nowrap" }}>{v.verified}</td>
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ background: "#EFF6FF", color: BLUE, border: `1px solid #BFDBFE`, borderRadius: 7, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                            <i className="bi bi-eye-fill" /> View
                          </button>
                          {v.status === "Pending" && (
                            <button style={{ background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", borderRadius: 7, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                              <i className="bi bi-check-lg" /> Verify
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Mobile Cards */
            <div style={{ padding: "12px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
              {paginated.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", color: "#94A3B8" }}>
                  <i className="bi bi-info-circle" style={{ fontSize: 36, marginBottom: 10 }} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>No verifications found</span>
                  {(searchQuery || statusFilter !== "All Status") && (
                    <button onClick={() => { setSearchInput(""); setSearchQuery(""); setStatusFilter("All Status"); setPage(1); }}
                      style={{ marginTop: 10, background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, color: BLUE, cursor: "pointer", fontWeight: 600 }}>
                      Clear filters
                    </button>
                  )}
                </div>
              ) : paginated.map(v => (
                <div key={v.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, background: "#FAFBFD" }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <Avatar initials={v.initials} color={v.color} size={42} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 14 }}>{v.sellerName}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <i className="bi bi-envelope" style={{ marginRight: 3 }} />{v.email}
                      </div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>
                        <i className="bi bi-telephone" style={{ marginRight: 3 }} />{v.phone}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textAlign: "right" }}>{v.id}</div>
                      <StatusBadge status={v.status} size="small" />
                    </div>
                  </div>
                  {/* Account info */}
                  <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", marginBottom: 10, fontSize: 12 }}>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3 }}>
                      <i className="bi bi-credit-card" style={{ color: "#64748B" }} />
                      <span style={{ fontWeight: 700, color: "#374151" }}>{v.account}</span>
                    </div>
                    <div style={{ color: "#94A3B8" }}><i className="bi bi-bank" style={{ marginRight: 3 }} />{v.bank} · IFSC: {v.ifsc}</div>
                  </div>
                  {/* Meta grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                    {[
                      { icon: "bi-arrow-repeat", label: "Attempts", val: `${v.attempts}/3` },
                      { icon: "bi-calendar3",    label: "Created",  val: v.created },
                      { icon: "bi-calendar-check",label:"Verified", val: v.verified },
                    ].map(({ icon, label, val }) => (
                      <div key={label} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 8px" }}>
                        <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>
                          <i className={`bi ${icon}`} style={{ marginRight: 3 }} />{label}
                        </div>
                        <div style={{ fontSize: 11, color: "#374151", fontWeight: 600 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ flex: 1, background: "#EFF6FF", color: BLUE, border: "1px solid #BFDBFE", borderRadius: 8, padding: "8px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                      <i className="bi bi-eye-fill" /> View
                    </button>
                    {v.status === "Pending" && (
                      <button style={{ flex: 1, background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", borderRadius: 8, padding: "8px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                        <i className="bi bi-check-lg" /> Verify
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Pagination ── */}
          {filtered.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 10px" : "14px 20px", borderTop: `1px solid ${BORDER}`, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#64748B" }}>
                Page {safePage} of {totalPages}
              </span>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <PagBtn icon="bi-chevron-double-left"  onClick={() => setPage(1)}          disabled={safePage === 1} />
                <PagBtn icon="bi-chevron-left"         onClick={() => setPage(p => Math.max(1, p-1))} disabled={safePage === 1} />
                {pageNums.map((p, i) => p === "..." ? (
                  <span key={"e" + i} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#94A3B8" }}>…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ width: 32, height: 32, border: `1px solid ${safePage === p ? BLUE : BORDER}`, borderRadius: 8, background: safePage === p ? BLUE : "#fff", color: safePage === p ? "#fff" : "#374151", fontWeight: 700, cursor: "pointer", fontSize: 13, transition: "all 0.12s" }}>
                    {p}
                  </button>
                ))}
                <PagBtn icon="bi-chevron-right"        onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={safePage === totalPages} />
                <PagBtn icon="bi-chevron-double-right" onClick={() => setPage(totalPages)} disabled={safePage === totalPages} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign: "center", padding: "16px 20px", fontSize: 13, color: "#94A3B8", borderTop: `1px solid ${BORDER}`, background: "#fff" }}>
        2026 © Flintnthread India Pvt. Ltd. Crafted by{" "}
        <a href="#" style={{ color: "#16A34A", fontWeight: 700, textDecoration: "none" }}>Flinththread India Pvt. Ltd.</a>
      </div>
    </div>
  );
}

function PagBtn({ icon, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: 32, height: 32, border: `1px solid #E2E8F0`, borderRadius: 8, background: "#fff", cursor: disabled ? "not-allowed" : "pointer", color: disabled ? "#CBD5E1" : "#374151", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "#F1F5F9"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}>
      <i className={`bi ${icon}`} style={{ fontSize: 11 }} />
    </button>
  );
}