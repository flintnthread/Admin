import { useRouter } from "expo-router";
import React, { useState } from "react";

const sellers = [
  {
    id: "#S1248",
    initials: "KR",
    color: "#FF6B35",
    name: "Kancharla Raghu",
    email: "kancharlatextiles@gmail.com",
    phone: "+91 7780136846",
    business: "KANCHARLA TEXTILES",
    bank: "ICICI Bank",
    branch: "NRI HOSPITAL",
    account: "A/C: XXXX0177",
    ifsc: "IFSC: ICIC0007700",
    status: "pending",
    statusLabel: "Pending seller",
    requested: "06 Jun 2026\n10:15 AM",
    sellerConfirm: "-",
    adminApprove: "-",
  },
  {
    id: "#S1247",
    initials: "SS",
    color: "#4CAF50",
    name: "Sanju Sandhya",
    email: "flintandthread.hr@gmail.com",
    phone: "+91 9391939868",
    business: "sg creations",
    bank: "Canara Bank",
    branch: "DARSI",
    account: "A/C: XXXX1922",
    ifsc: "IFSC: CNRB0013641",
    status: "not_requested",
    statusLabel: "Not requested",
    requested: "05 Jun 2026\n04:30 PM",
    sellerConfirm: "-",
    adminApprove: "-",
  },
  {
    id: "#S1246",
    initials: "KM",
    color: "#9C27B0",
    name: "Khaiser Mohammed",
    email: "mdkhaiser0786@gmail.com",
    phone: "+91 9515848235",
    business: "ZOYA ALL BAGS CENTER",
    bank: "TELANGANA GRAMEENA BANK",
    branch: "PATANCHERU MA",
    account: "A/C: XXXX4942",
    ifsc: "IFSC: TGRB0008191",
    status: "not_requested",
    statusLabel: "Not requested",
    requested: "05 Jun 2026\n11:20 AM",
    sellerConfirm: "-",
    adminApprove: "-",
  },
  {
    id: "#S1245",
    initials: "AR",
    color: "#FF9800",
    name: "Arun Kumar",
    email: "arun.kumar@gmail.com",
    phone: "+91 9876543210",
    business: "KUMAR FASHION",
    bank: "HDFC Bank",
    branch: "KPHB BRANCH",
    account: "A/C: XXXX5623",
    ifsc: "IFSC: HDFC0001234",
    status: "approved",
    statusLabel: "Approved",
    requested: "04 Jun 2026\n02:10 PM",
    sellerConfirm: "04 Jun 2026\n03:20 PM",
    adminApprove: "04 Jun 2026\n04:20 PM",
  },
];

const stats = [
  { icon: "bi-people", label: "Total Sellers", value: "1,248", sub: "All time", color: "#FF6B35", bg: "#FFF3EE" },
  { icon: "bi-clock", label: "Pending Sellers", value: "86", sub: "Pending approval", color: "#4CAF50", bg: "#F0FBF0" },
  { icon: "bi-shield-check", label: "Approved Sellers", value: "1,102", sub: "This year", color: "#2196F3", bg: "#EEF5FF" },
  { icon: "bi-bank", label: "Banks Integrated", value: "12", sub: "Total banks", color: "#FF6B35", bg: "#FFF3EE" },
  { icon: "bi-hourglass-split", label: "Avg. Approval Time", value: "2.4 Days", sub: "This month", color: "#9C27B0", bg: "#F5EEF8" },
  { icon: "bi-graph-up-arrow", label: "Approval Rate", value: "88.5%", sub: "This month", color: "#00BCD4", bg: "#EEF9FB" },
];

function StatusBadge({ status, label }: { status: string; label: string }) {
  const styles: Record<string, { bg: string; color: string; dot: string }> = {
    pending: { bg: "#FF6B35", color: "#fff", dot: "#FF6B35" },
    not_requested: { bg: "#1a2332", color: "#fff", dot: "#555" },
    approved: { bg: "#E8F5E9", color: "#2E7D32", dot: "#4CAF50" },
  };
  const s = styles[status] || styles.not_requested;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        borderRadius: 6,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 600,
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: color + "22",
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 14,
        flexShrink: 0,
        border: `1.5px solid ${color}44`,
      }}
    >
      {initials}
    </div>
  );
}

export default function BankApproval() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("Pending Sellers");
  const [activeTab, setActiveTab] = useState("Dashboard");

  // Detect mobile via window width using state
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [searchQuery, setSearchQuery] = useState("");

  React.useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  React.useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSellers = normalizedQuery
    ? sellers.filter((seller) => {
        return [seller.name, seller.business, seller.phone, seller.email]
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
    : sellers;

  // Pagination state (defined after filter)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = isMobile ? 5 : 10;
  const totalEntries = filteredSellers.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const pagedSellers = filteredSellers.slice(startIndex, endIndex);

  function gotoPage(n: number) {
    const v = Math.max(1, Math.min(totalPages, n));
    setCurrentPage(v);
  }

  function makePageList() {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    const left = Math.max(2, currentPage - 1);
    const right = Math.min(totalPages - 1, currentPage + 1);
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; background: #f4f6fa; }
        @media (max-width: 767px) {
          .desktop-table { display: none !important; }
          .mobile-cards { display: block !important; }
          .stats-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (min-width: 768px) {
          .mobile-cards { display: none !important; }
          .desktop-table { display: block !important; }
        }
        .mobile-cards { display: none; }
        .stat-card { background: #fff; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
        .stat-icon { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .page-header { background: #fff; padding: 18px 28px 0; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #999; margin-top: 4px; }
        .breadcrumb a { color: #FF6B35; text-decoration: none; }
        .page-title { font-size: 24px; font-weight: 700; color: #1a2332; }
        .btn-outline { border: 1.5px solid #FF6B35; color: #FF6B35; background: #fff; border-radius: 8px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .btn-dark { background: #1a2332; color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .filter-btn { background: #FF6B35; color: #fff; border: none; border-radius: 8px; padding: 11px 28px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .search-input { border: 1.5px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; font-size: 13.5px; outline: none; width: 100%; color: #555; }
        .search-input:focus { border-color: #FF6B35; }
        .select-input { border: 1.5px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; font-size: 13.5px; outline: none; background: #fff; color: #555; appearance: none; cursor: pointer; }
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #1a2332; }
        thead th { color: #fff; font-size: 12.5px; font-weight: 600; padding: 14px 16px; text-align: left; white-space: nowrap; }
        tbody tr { border-bottom: 1px solid #f0f2f5; background: #fff; }
        tbody tr:hover { background: #fafbfc; }
        tbody td { padding: 14px 16px; font-size: 13px; color: #333; vertical-align: middle; }
        .pagination { display: flex; align-items: center; gap: 4px; }
        .page-btn { width: 34px; height: 34px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; color: #555; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .page-btn.active { background: #FF6B35; color: #fff; border-color: #FF6B35; }
        .page-btn:hover:not(.active) { background: #f5f5f5; }
        .mobile-seller-card { background: #fff; border-radius: 12px; margin-bottom: 14px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .progress-line { display: flex; align-items: center; gap: 0; margin: 12px 0 4px; }
        .progress-dot { width: 12px; height: 12px; border-radius: 50%; flexShrink: 0; }
        .progress-connector { flex: 1; height: 2px; background: #e5e7eb; }
        .progress-connector.filled { background: #4CAF50; }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", background: "#f4f6fa" }}>
        {/* Main */}
        <div className="main-content" style={{ marginLeft: 0, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", overflowY: "auto" }}>

          {/* Page Content */}
          <div style={{ flex: 1, padding: isMobile ? "16px 14px" : "0 0 32px" }}>

            {/* Desktop Page Title Bar */}
            {!isMobile && (
              <div style={{ background: "#fff", padding: "18px 28px 16px", borderBottom: "1px solid #f0f2f5", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div className="page-title">Seller Bank Approval</div>
                  <div className="breadcrumb">
                    <a href="#">Dashboard</a>
                    <i className="bi bi-chevron-right" style={{ fontSize: 11 }} />
                    <a href="#">Sellers</a>
                    <i className="bi bi-chevron-right" style={{ fontSize: 11 }} />
                    <span>Bank Approval</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn-outline" onClick={() => router.push('/bankverification')}><i className="bi bi-shield-check" /> Bank Verifications</button>
                  <button className="btn-dark" onClick={() => router.push('/supportticket')}><i className="bi bi-headset" /> Seller Support</button>
                </div>
              </div>
            )}

            {/* Mobile Page Title */}
            {isMobile && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1a2332", marginBottom: 4 }}>Seller Bank Approval</div>
                <div className="breadcrumb">
                  <a href="#" style={{ color: "#FF6B35", textDecoration: "none", fontSize: 12 }}>Dashboard</a>
                  <i className="bi bi-chevron-right" style={{ fontSize: 10, color: "#999" }} />
                  <a href="#" style={{ color: "#FF6B35", textDecoration: "none", fontSize: 12 }}>Sellers</a>
                  <i className="bi bi-chevron-right" style={{ fontSize: 10, color: "#999" }} />
                  <span style={{ fontSize: 12, color: "#999" }}>Bank Approval</span>
                </div>
              </div>
            )}

            {/* Mobile action buttons */}
            {isMobile && (
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <button className="btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => router.push('/bankverification')}><i className="bi bi-shield-check" /> Bank Verifications</button>
                <button className="btn-dark" style={{ flex: 1, justifyContent: "center" }} onClick={() => router.push('/supportticket')}><i className="bi bi-headset" /> Seller Support</button>
              </div>
            )}

            {/* Filters */}
            <div style={{ background: isMobile ? "transparent" : "#fff", padding: isMobile ? "0" : "20px 28px", borderBottom: isMobile ? "none" : "1px solid #f0f2f5", marginBottom: isMobile ? 0 : 0 }}>
              {!isMobile ? (
                <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
                  <div style={{ flex: "0 0 200px" }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#333", display: "block", marginBottom: 8 }}>Status</label>
                    <div style={{ position: "relative" }}>
                      <select className="select-input" style={{ width: "100%", paddingRight: 32 }}>
                        <option>All</option>
                        <option>Not Requested</option>
                        <option>Pending Seller</option>
                        <option>Pending Admin</option>
                        <option>Needs Edit </option>
                        <option>Approved</option>
                        <option>Rejected</option>
                      </select>
                      <i className="bi bi-chevron-down" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: 13, pointerEvents: "none" }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#333", display: "block", marginBottom: 8 }}>Search</label>
                    <input
                      className="search-input"
                      placeholder="Seller name / email / mobile / business"
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                  <button className="filter-btn"><i className="bi bi-funnel" /> Filter</button>
                </div>
              ) : (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#333", display: "block", marginBottom: 6 }}>Status</label>
                      <div style={{ position: "relative" }}>
                        <select className="select-input" style={{ width: "100%", paddingRight: 28 }}>
                          <option>All</option>
                          <option>Pending</option>
                          <option>Approved</option>
                        </select>
                        <i className="bi bi-chevron-down" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: 12, pointerEvents: "none" }} />
                      </div>
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#333", display: "block", marginBottom: 6 }}>Search</label>
                      <div style={{ position: "relative" }}>
                        <input
                          className="search-input"
                          placeholder="Seller name / email / mobile / business"
                          style={{ paddingRight: 36, fontSize: 12 }}
                          value={searchQuery}
                          onChange={(event) => {
                            setSearchQuery(event.target.value);
                            setCurrentPage(1);
                          }}
                        />
                        <i className="bi bi-search" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#aaa", fontSize: 13 }} />
                      </div>
                    </div>
                  </div>
                  <button className="filter-btn" style={{ width: "100%", justifyContent: "center" }}><i className="bi bi-funnel" /> Filter</button>
                </div>
              )}
            </div>

            {/* Stats */}
            <div style={{ padding: isMobile ? "0" : "24px 28px", background: isMobile ? "transparent" : "#fff", borderBottom: isMobile ? "none" : "1px solid #f0f2f5", marginBottom: isMobile ? 14 : 24 }}>
              <div
                className="stats-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(6, 1fr)",
                  gap: isMobile ? 10 : 16,
                }}
              >
                {stats.map((s, i) => (
                  <div className="stat-card" key={i} style={{ padding: isMobile ? "12px 10px" : "16px", gap: isMobile ? 8 : 14, flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center" }}>
                    <div className="stat-icon" style={{ background: s.bg, color: s.color, width: isMobile ? 36 : 48, height: isMobile ? 36 : 48, fontSize: isMobile ? 16 : 20 }}>
                      <i className={`bi ${s.icon}`} />
                    </div>
                    <div>
                      <div style={{ fontSize: isMobile ? 10 : 11, color: "#888", fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: isMobile ? 15 : 20, fontWeight: 800, color: "#1a2332", lineHeight: 1.1 }}>{s.value}</div>
                      <div style={{ fontSize: isMobile ? 9 : 11, color: "#aaa", marginTop: 2 }}>{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Table */}
            <div className="desktop-table" style={{ margin: "0 28px", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Seller</th>
                    <th>Business</th>
                    <th>Bank</th>
                    <th>Account</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Seller Confirm</th>
                    <th>Admin Approve</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSellers.map((s, i) => (
                    <tr key={startIndex + i}>
                      <td style={{ color: "#555", fontWeight: 600 }}>{s.id}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar initials={s.initials} color={s.color} />
                          <div>
                            <div style={{ fontWeight: 600, color: "#1a2332", fontSize: 13 }}>{s.name}</div>
                            <div style={{ color: "#888", fontSize: 12 }}>{s.email}</div>
                            <div style={{ color: "#888", fontSize: 12 }}>{s.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>{s.business}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.bank}</div>
                        <div style={{ color: "#888", fontSize: 11 }}>{s.branch}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13 }}>{s.account}</div>
                        <div style={{ color: "#888", fontSize: 11 }}>{s.ifsc}</div>
                      </td>
                      <td><StatusBadge status={s.status} label={s.statusLabel} /></td>
                      <td style={{ fontSize: 12, color: "#555", whiteSpace: "pre-line" }}>{s.requested}</td>
                      <td style={{ fontSize: 12, color: "#555" }}>{s.sellerConfirm}</td>
                      <td style={{ fontSize: 12, color: "#555" }}>{s.adminApprove}</td>
                      <td>
                        <button style={{ border: "1.5px solid #FF6B35", color: "#FF6B35", background: "#fff", borderRadius: 7, padding: "6px 14px", fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontWeight: 600 }} onClick={() => router.push('/viewbankdetails')}>
                          <i className="bi bi-eye" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ background: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #f0f2f5" }}>
                <span style={{ fontSize: 13, color: "#666" }}>Showing {startIndex + 1} to {endIndex} of {totalEntries} entries</span>
                <div className="pagination">
                  <button className="page-btn" onClick={() => gotoPage(currentPage - 1)} disabled={currentPage === 1}><i className="bi bi-chevron-left" /></button>
                  {makePageList().map((p, i) => (
                    typeof p === 'number' ? (
                      <button key={i} className={`page-btn${p === currentPage ? " active" : ""}`} onClick={() => gotoPage(p as number)}>{p}</button>
                    ) : (
                      <button key={i} className="page-btn" disabled style={{ cursor: 'default' }}>{p}</button>
                    )
                  ))}
                  <button className="page-btn" onClick={() => gotoPage(currentPage + 1)} disabled={currentPage === totalPages}><i className="bi bi-chevron-right" /></button>
                </div>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="mobile-cards">
              {pagedSellers.map((s, i) => {
                const isApproved = s.status === "approved";
                const isPending = s.status === "pending";
                const dotColor = isApproved ? "#4CAF50" : isPending ? "#FF6B35" : "#1a2332";
                return (
                  <div className="mobile-seller-card" key={i}>
                    <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                      <Avatar initials={s.initials} color={s.color} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1a2332" }}>{s.name}</div>
                        <div style={{ fontSize: 11.5, color: "#888" }}>{s.email}</div>
                        <div style={{ fontSize: 11.5, color: "#888" }}>{s.phone}</div>
                      </div>
                      <button style={{ border: "1.5px solid #FF6B35", color: "#FF6B35", background: "#fff", borderRadius: 7, padding: "5px 12px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, height: "fit-content", fontWeight: 600 }} onClick={() => router.push('/viewbankdetails')}>
                        <i className="bi bi-eye" /> View
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600, marginBottom: 2 }}>Business</div>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: "#1a2332" }}>{s.business}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600, marginBottom: 2 }}>Bank</div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#1a2332" }}>{s.bank}</div>
                        <div style={{ fontSize: 10, color: "#888" }}>{s.branch}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600, marginBottom: 2 }}>Account</div>
                        <div style={{ fontSize: 11.5, color: "#1a2332" }}>{s.account}</div>
                        <div style={{ fontSize: 10, color: "#888" }}>{s.ifsc}</div>
                      </div>
                    </div>

                    {/* Progress Timeline */}
                    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                      <div style={{ flex: 1, height: 2, background: isApproved ? "#4CAF50" : "#e5e7eb" }} />
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#e5e7eb", flexShrink: 0, border: "2px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="bi bi-person" style={{ fontSize: 7, color: "#999" }} />
                      </div>
                      <div style={{ flex: 1, height: 2, background: isApproved ? "#4CAF50" : "#e5e7eb" }} />
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#e5e7eb", flexShrink: 0, border: "2px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="bi bi-shield" style={{ fontSize: 7, color: "#999" }} />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#aaa", marginBottom: 3 }}>Status</div>
                        <StatusBadge status={s.status} label={s.statusLabel} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#aaa", marginBottom: 3 }}>Requested</div>
                        <div style={{ fontSize: 10.5, color: "#555", whiteSpace: "pre-line" }}>{s.requested}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#aaa", marginBottom: 3 }}>Seller Confirm</div>
                        <div style={{ fontSize: 10.5, color: "#555", whiteSpace: "pre-line" }}>{s.sellerConfirm}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#aaa", marginBottom: 3 }}>Admin Approve</div>
                        <div style={{ fontSize: 10.5, color: "#555", whiteSpace: "pre-line" }}>{s.adminApprove}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Mobile Pagination */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 12, color: "#666" }}>Showing {startIndex + 1} to {endIndex} of {totalEntries} entries</span>
                <div className="pagination">
                  <button className="page-btn" style={{ width: 30, height: 30, fontSize: 12 }} onClick={() => gotoPage(currentPage - 1)} disabled={currentPage === 1}><i className="bi bi-chevron-left" /></button>
                  {makePageList().map((p, i) => (
                    typeof p === 'number' ? (
                      <button key={i} className={`page-btn${p === currentPage ? " active" : ""}`} style={{ width: 30, height: 30, fontSize: 12 }} onClick={() => gotoPage(p as number)}>{p}</button>
                    ) : (
                      <button key={i} className="page-btn" style={{ width: 30, height: 30, fontSize: 12 }} disabled>{p}</button>
                    )
                  ))}
                  <button className="page-btn" style={{ width: 30, height: 30, fontSize: 12 }} onClick={() => gotoPage(currentPage + 1)} disabled={currentPage === totalPages}><i className="bi bi-chevron-right" /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}