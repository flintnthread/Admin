// Bootstrap Icons loaded via CDN — add this to your index.html:
// <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"/>

import { useEffect, useRef, useState } from "react";

const ORANGE = "#F97316";
const DARK_NAV = "#1B2332";

type Seller = {
  id: number;
  name: string;
  email: string;
  phone: string;
  business: string;
  onboard: string;
  status: string;
  profile: string;
  kyc: string;
  supplement: string;
  shiprocket: string;
  shipDate: string | null;
  products: number;
  initials: string;
  color: string;
};

type ChartData = {
  labels: string[];
  registered: number[];
  profileCompleted: number[];
  approved: number[];
  productsAdded: number[];
  shiprocketUploaded: number[];
  [key: string]: string[] | number[];
};

/* ─── Data ─────────────────────────────────────────────────────────── */
const ALL_SELLERS = [
  { id: 286, name: "Sanju Sandilya",    email: "sanju.sandilya@gmail.com",  phone: "+91 98765 43210", business: "SG Creations",          onboard: "05 Jun, 2025", status: "Pending",           profile: "Complete",   kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 0,  initials: "SS", color: "#F97316" },
  { id: 285, name: "Khajaer Mohammed",  email: "khater2025@gmail.com",      phone: "+91 96158 43215", business: "ZOYA ALL BAGS CENTER",   onboard: "29 May, 2025", status: "Active",            profile: "Complete",   kyc: "Pending",  supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "20 May, 2025", products: 2,  initials: "KM", color: "#10B981" },
  { id: 284, name: "Sandhya Gudisa",    email: "sandhya.gm@gmail.com",      phone: "+91 98760 12349", business: "—",                     onboard: "28 May, 2025", status: "Awaiting Approval", profile: "Incomplete", kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 0,  initials: "SG", color: "#8B5CF6" },
  { id: 283, name: "Rahul Sharma",      email: "rahul.sharma@gmail.com",    phone: "+91 97654 32109", business: "RS Traders",            onboard: "20 May, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "18 May, 2025", products: 5,  initials: "RS", color: "#3B82F6" },
  { id: 282, name: "Priya Mehta",       email: "priya.mehta@gmail.com",     phone: "+91 96543 21098", business: "PM Boutique",           onboard: "15 May, 2025", status: "Active",            profile: "Complete",   kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 3,  initials: "PM", color: "#EC4899" },
  { id: 281, name: "Amit Verma",        email: "amit.verma@gmail.com",      phone: "+91 95432 10987", business: "Verma Electronics",     onboard: "10 May, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "08 May, 2025", products: 12, initials: "AV", color: "#06B6D4" },
  { id: 280, name: "Neha Joshi",        email: "neha.joshi@gmail.com",      phone: "+91 94321 09876", business: "Joshi Handcrafts",      onboard: "05 May, 2025", status: "Pending",           profile: "Incomplete", kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 0,  initials: "NJ", color: "#F59E0B" },
  { id: 279, name: "Vikram Singh",      email: "vikram.singh@gmail.com",    phone: "+91 93210 98765", business: "Singh Organics",        onboard: "01 May, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "28 Apr, 2025", products: 7,  initials: "VS", color: "#EF4444" },
  { id: 278, name: "Deepa Nair",        email: "deepa.nair@gmail.com",      phone: "+91 92109 87654", business: "Nair Silks",            onboard: "28 Apr, 2025", status: "Awaiting Approval", profile: "Complete",   kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 4,  initials: "DN", color: "#7C3AED" },
  { id: 277, name: "Suresh Babu",       email: "suresh.babu@gmail.com",     phone: "+91 91098 76543", business: "Babu Enterprises",      onboard: "22 Apr, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "20 Apr, 2025", products: 9,  initials: "SB", color: "#059669" },
  { id: 276, name: "Ananya Krishnan",   email: "ananya.k@gmail.com",        phone: "+91 90987 65432", business: "AK Fashion Studio",     onboard: "18 Apr, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "15 Apr, 2025", products: 15, initials: "AK", color: "#DC2626" },
  { id: 275, name: "Manoj Tiwari",      email: "manoj.tiwari@gmail.com",    phone: "+91 89876 54321", business: "Tiwari General Store",  onboard: "12 Apr, 2025", status: "Pending",           profile: "Incomplete", kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 0,  initials: "MT", color: "#9333EA" },
  { id: 274, name: "Rekha Pillai",      email: "rekha.pillai@gmail.com",    phone: "+91 88765 43210", business: "Pillai Naturals",       onboard: "08 Apr, 2025", status: "Active",            profile: "Complete",   kyc: "Pending",  supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "05 Apr, 2025", products: 6,  initials: "RP", color: "#0891B2" },
  { id: 273, name: "Arun Mishra",       email: "arun.mishra@gmail.com",     phone: "+91 87654 32109", business: "Mishra Kirana",         onboard: "03 Apr, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "01 Apr, 2025", products: 11, initials: "AM", color: "#16A34A" },
  { id: 272, name: "Kavya Reddy",       email: "kavya.reddy@gmail.com",     phone: "+91 86543 21098", business: "Reddy Textiles",        onboard: "28 Mar, 2025", status: "Awaiting Approval", profile: "Incomplete", kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 0,  initials: "KR", color: "#B45309" },
  { id: 271, name: "Ravi Kumar",        email: "ravi.kumar@gmail.com",      phone: "+91 85432 10987", business: "Kumar Spices",          onboard: "22 Mar, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "20 Mar, 2025", products: 8,  initials: "RK", color: "#F97316" },
  { id: 270, name: "Sunita Patel",      email: "sunita.patel@gmail.com",    phone: "+91 84321 09876", business: "Patel Groceries",       onboard: "18 Mar, 2025", status: "Pending",           profile: "Incomplete", kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 0,  initials: "SP", color: "#10B981" },
  { id: 269, name: "Arjun Nambiar",     email: "arjun.nambiar@gmail.com",   phone: "+91 83210 98765", business: "Nambiar Exports",       onboard: "14 Mar, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "12 Mar, 2025", products: 20, initials: "AN", color: "#8B5CF6" },
  { id: 268, name: "Divya Menon",       email: "divya.menon@gmail.com",     phone: "+91 82109 87654", business: "Menon Crafts",          onboard: "10 Mar, 2025", status: "Awaiting Approval", profile: "Complete",   kyc: "Pending",  supplement: "Not Provided", shiprocket: "Not Uploaded", shipDate: null,           products: 2,  initials: "DM", color: "#3B82F6" },
  { id: 267, name: "Gopal Das",         email: "gopal.das@gmail.com",       phone: "+91 81098 76543", business: "Das Furniture",         onboard: "05 Mar, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", supplement: "Provided",     shiprocket: "Uploaded",     shipDate: "03 Mar, 2025", products: 14, initials: "GD", color: "#EC4899" },
];

const chartData: ChartData = {
  labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  registered:         [10,  20,  28,  50,  90, 160, 300, 450, 580, 680, 760, 880],
  profileCompleted:   [ 0,   2,   5,  10,  20,  50, 120, 220, 320, 430, 500, 590],
  approved:           [ 0,   1,   3,   8,  18,  55, 140, 250, 310, 380, 430, 440],
  productsAdded:      [ 0,   0,   2,   5,  10,  28,  90, 195, 285, 345, 255, 280],
  shiprocketUploaded: [ 0,   0,   0,   2,   5,  10,  25,  50,  70, 100, 115, 140],
};

// dash: strokeDasharray, marker: circle|square|triangle|diamond|star
const SERIES = [
  { key: "registered",         label: "Registered",          color: "#2563EB", dash: "",           marker: "circle"   },
  { key: "profileCompleted",   label: "Profile Completed",   color: "#16A34A", dash: "8 4",        marker: "square"   },
  { key: "approved",           label: "Approved",            color: "#F97316", dash: "6 3 2 3",    marker: "triangle" },
  { key: "productsAdded",      label: "Products Added",      color: "#7C3AED", dash: "4 4",        marker: "diamond"  },
  { key: "shiprocketUploaded", label: "Shiprocket Uploaded", color: "#0891B2", dash: "",           marker: "star"     },
];

const YEAR_OPTIONS    = ["2027","2026","2025","2024","2023","2022","2021","2020","2019","2018","2017","2016"];
const FILTER_OPTIONS  = ["Overall","Monthly","Weekly","Quarterly"];
const PERPAGE_OPTIONS = [10, 25, 50, 100];
const SELLER_OPTIONS  = ["All Sellers", ...ALL_SELLERS.map(s => s.name)];
const METRIC_OPTIONS  = ["All Metrics","Registered","Profile Completed","Approved","Products Added","Shiprocket Uploaded"];

/* ─── Helpers ───────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    "Pending":           { bg:"#FEF3C7", color:"#92400E", border:"#FCD34D" },
    "Active":            { bg:"#D1FAE5", color:"#065F46", border:"#34D399" },
    "Awaiting Approval": { bg:"#EDE9FE", color:"#4C1D95", border:"#A78BFA" },
    "Complete":          { bg:"#D1FAE5", color:"#065F46", border:"#34D399" },
    "Incomplete":        { bg:"#FEE2E2", color:"#7F1D1D", border:"#FCA5A5" },
    "Not Uploaded":      { bg:"#F3F4F6", color:"#374151", border:"#D1D5DB" },
    "Uploaded":          { bg:"#D1FAE5", color:"#065F46", border:"#34D399" },
    "Provided":          { bg:"#D1FAE5", color:"#065F46", border:"#34D399" },
    "Not Provided":      { bg:"#F3F4F6", color:"#374151", border:"#D1D5DB" },
    "Not done":          { bg:"#1F2937", color:"#F9FAFB", border:"#374151" },
  };
  const s = map[status] || { bg:"#F3F4F6", color:"#374151", border:"#D1D5DB" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: 6, padding: "2px 8px",
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap"
    }}>
      {status}
    </span>
  );
}

function Avatar({ initials, color, size = 36 }: { initials: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color + "22", border: `2px solid ${color}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.33, color, flexShrink: 0
    }}>
      {initials}
    </div>
  );
}

function BSSelect({ value, onChange, options, style = {} }: { value: string; onChange: (v: string) => void; options: string[]; style?: React.CSSProperties }) {
  return (
    <div style={{ position: "relative", ...style }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", border: "1px solid #E2E8F0", borderRadius: 8,
          padding: "9px 32px 9px 12px", fontSize: 13, color: "#374151",
          background: "#fff", cursor: "pointer", appearance: "none", WebkitAppearance: "none"
        }}
      >
        {options.map(o => <option key={String(o)} value={o}>{o}</option>)}
      </select>
      <i className="bi bi-chevron-down" style={{
        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
        fontSize: 12, color: "#94A3B8", pointerEvents: "none"
      }} />
    </div>
  );
}

/* ─── Marker renderer ───────────────────────────────────────────────── */
function Marker({ type, cx, cy, color, size = 6 }: { type: string; cx: number; cy: number; color: string; size?: number }) {
  const s = size;
  if (type === "circle")
    return <circle cx={cx} cy={cy} r={s * 0.7} fill={color} stroke="#fff" strokeWidth={1.5} />;
  if (type === "square")
    return <rect x={cx - s * 0.65} y={cy - s * 0.65} width={s * 1.3} height={s * 1.3}
      fill={color} stroke="#fff" strokeWidth={1.5} />;
  if (type === "triangle") {
    const h = s * 1.3;
    return <polygon
      points={`${cx},${cy - h} ${cx - h * 0.87},${cy + h * 0.5} ${cx + h * 0.87},${cy + h * 0.5}`}
      fill={color} stroke="#fff" strokeWidth={1.5} />;
  }
  if (type === "diamond")
    return <polygon
      points={`${cx},${cy - s} ${cx + s * 0.75},${cy} ${cx},${cy + s} ${cx - s * 0.75},${cy}`}
      fill={color} stroke="#fff" strokeWidth={1.5} />;
  if (type === "star") {
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const ao = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const ai = ao + Math.PI / 5;
      pts.push(`${cx + s * Math.cos(ao)},${cy + s * Math.sin(ao)}`);
      pts.push(`${cx + s * 0.4 * Math.cos(ai)},${cy + s * 0.4 * Math.sin(ai)}`);
    }
    return <polygon points={pts.join(" ")} fill={color} stroke="#fff" strokeWidth={1} />;
  }
  return null;
}

/* ─── Legend swatch ─────────────────────────────────────────────────── */
function LegendSwatch({ series, active }: { series: typeof SERIES[0]; active: boolean }) {
  const { color, dash, marker } = series;
  const dim = active ? 1 : 0.35;
  return (
    <svg width={36} height={14} style={{ opacity: dim, flexShrink: 0 }}>
      <line x1={0} y1={7} x2={36} y2={7}
        stroke={color} strokeWidth={2}
        strokeDasharray={dash || undefined} />
      <Marker type={marker} cx={18} cy={7} color={color} size={5} />
    </svg>
  );
}

/* ─── Line Chart ────────────────────────────────────────────────────── */
function LineChart({ width, height, activeSeries }: { width: number; height: number; activeSeries: string }) {
  const pad = { top: 24, right: 24, bottom: 44, left: 52 };
  const W = Math.max(1, width - pad.left - pad.right);
  const H = height - pad.top - pad.bottom;
  const maxY = 900;
  const yTicks = [0, 150, 300, 450, 600, 750, 900];
  const [hovered, setHovered] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const xScale = (i: number) => (i / (chartData.labels.length - 1)) * W;
  const yScale = (v: number) => H - (v / maxY) * H;

  const getPath = (key: string) =>
    (chartData[key] as number[]).map((v: number, i: number) =>
      `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`
    ).join(" ");

  const visibleSeries = activeSeries === "All Metrics"
    ? SERIES
    : SERIES.filter(s => s.label === activeSeries);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left - pad.left;
    const idx = Math.round((mx / W) * (chartData.labels.length - 1));
    setHovered(Math.max(0, Math.min(chartData.labels.length - 1, idx)));
  };

  const tooltipX = hovered !== null ? xScale(hovered) : 0;
  const tooltipRight = hovered !== null && tooltipX > W * 0.55;
  const MARKER_EVERY = 1; // show marker at every point

  return (
    <svg ref={svgRef} width={width} height={height}
      style={{ overflow: "visible", cursor: "crosshair", display: "block" }}
      onMouseMove={handleMouseMove} onMouseLeave={() => setHovered(null)}>
      <g transform={`translate(${pad.left},${pad.top})`}>

        {/* Grid lines + Y labels */}
        {yTicks.map(t => (
          <g key={t}>
            <line x1={0} x2={W} y1={yScale(t)} y2={yScale(t)}
              stroke="#E5E7EB" strokeWidth={t === 0 ? 1 : 0.75} />
            <text x={-10} y={yScale(t) + 4} textAnchor="end"
              fontSize={11} fill="#9CA3AF" fontFamily="inherit">{t}</text>
          </g>
        ))}

        {/* X labels */}
        {chartData.labels.map((l, i) => (
          <text key={l} x={xScale(i)} y={H + 18}
            textAnchor="middle" fontSize={11} fill="#6B7280" fontFamily="inherit">{l}</text>
        ))}

        {/* Lines */}
        {visibleSeries.map(s => (
          <path key={s.key}
            d={getPath(s.key)}
            fill="none"
            stroke={s.color}
            strokeWidth={2.2}
            strokeDasharray={s.dash || undefined}
            strokeLinejoin="round"
            strokeLinecap="round" />
        ))}

        {/* Markers at every data point */}
        {visibleSeries.map(s =>
          (chartData[s.key] as number[]).map((v: number, i: number) => (
            <Marker key={`${s.key}-${i}`}
              type={s.marker} cx={xScale(i)} cy={yScale(v)}
              color={s.color} size={5} />
          ))
        )}

        {/* Hover crosshair */}
        {hovered !== null && (
          <>
            <line x1={xScale(hovered)} x2={xScale(hovered)} y1={0} y2={H}
              stroke="#94A3B8" strokeWidth={1} strokeDasharray="5 3" />

            {/* Highlighted markers on hover */}
            {visibleSeries.map(s => (
              <Marker key={s.key}
                type={s.marker}
                cx={xScale(hovered)}
                cy={yScale((chartData[s.key] as number[])[hovered] as number)}
                color={s.color} size={7} />
            ))}

            {/* Tooltip box */}
            {(() => {
              const tw = 160;
              const th = visibleSeries.length * 20 + 28;
              const tx = tooltipRight ? xScale(hovered) - tw - 10 : xScale(hovered) + 12;
              const ty = 4;
              return (
                <g>
                  <rect x={tx} y={ty} width={tw} height={th}
                    rx={8} fill="white"
                    stroke="#E2E8F0" strokeWidth={1}
                    style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.10))" }} />
                  <text x={tx + 10} y={ty + 16}
                    fontSize={11} fontWeight="700" fill="#1B2332" fontFamily="inherit">
                    {chartData.labels[hovered]} 2025
                  </text>
                  {visibleSeries.map((s, i) => (
                    <text key={s.key}
                      x={tx + 10} y={ty + 30 + i * 20}
                      fontSize={11} fill={s.color} fontFamily="inherit">
                      {s.label}: {(chartData[s.key] as number[])[hovered] as number}
                    </text>
                  ))}
                </g>
              );
            })()}
          </>
        )}
      </g>
    </svg>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────────── */
function StatCard({ biIcon, label, value, sub, iconBg, iconColor }: { biIcon: string; label: string; value: string; sub?: string; iconBg: string; iconColor: string }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #F1F5F9", borderRadius: 12,
      padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, minWidth: 0
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12, background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
      }}>
        <i className={`bi ${biIcon}`} style={{ fontSize: 22, color: iconColor }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 11, color: "#94A3B8", fontWeight: 600, letterSpacing: "0.05em",
          textTransform: "uppercase", marginBottom: 2
        }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1B2332", lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

const STAT_CARDS = [
  { biIcon: "bi-person-plus-fill",  label: "Registered",           value: "141", sub: "in 2025",          iconBg: "#FFF7ED", iconColor: ORANGE     },
  { biIcon: "bi-person-check-fill", label: "Profile Completed",    value: "74",  sub: "in 2025",          iconBg: "#F0FDF4", iconColor: "#10B981"  },
  { biIcon: "bi-shield-check",      label: "Approved",             value: "71",  sub: "Active + Profile", iconBg: "#EFF6FF", iconColor: "#3B82F6"  },
  { biIcon: "bi-box-seam-fill",     label: "Products Added",       value: "707", sub: "in 2025",          iconBg: "#F5F3FF", iconColor: "#8B5CF6"  },
  { biIcon: "bi-cloud-upload-fill", label: "Ship Rocket Uploaded", value: "70",  sub: "CSV uploaded",     iconBg: "#ECFDF5", iconColor: "#06B6D4"  },
  { biIcon: "bi-arrow-repeat",      label: "Shiprocket Sync",      value: "On",  sub: "Seller sync",      iconBg: "#FFF7ED", iconColor: ORANGE     },
];

const INSIGHTS = [
  { biIcon: "bi-graph-up-arrow",    text: "Registered sellers increased by 85% compared to the previous period.", color: "#2563EB", bg: "#EFF6FF" },
  { biIcon: "bi-check-circle-fill", text: "71 sellers are fully approved and active.",                            color: "#16A34A", bg: "#F0FDF4" },
  { biIcon: "bi-box-seam-fill",     text: "707 products added in 2025.",                                         color: "#7C3AED", bg: "#F5F3FF" },
  { biIcon: "bi-arrow-repeat",      text: "Shiprocket sync is currently running smoothly.",                       color: ORANGE,    bg: "#FFF7ED" },
];

/* ─── Seller Detail Modal ────────────────────────────────────────────── */
function SellerModal({ seller, onClose }: { seller: Seller; onClose: () => void }) {
  if (!seller) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative",
          background: "#fff", borderRadius: 20,
          width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto",
          padding: 0, boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
          animation: "modalIn 0.26s cubic-bezier(0.32,0.72,0,1)"
        }}
      >
        <style>{`@keyframes modalIn { from { transform:scale(0.94) translateY(12px); opacity:0; } to { transform:scale(1) translateY(0); opacity:1; } }`}</style>

        {/* ── Floating close button – top-right corner ── */}
        <button
          onClick={onClose}
          title="Close"
          style={{
            position: "absolute", top: 12, right: 12, zIndex: 10,
            width: 34, height: 34, borderRadius: "50%", border: "none",
            background: "#E2E8F0", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s, transform 0.15s"
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#CBD5E1"; e.currentTarget.style.transform = "scale(1.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#E2E8F0"; e.currentTarget.style.transform = "scale(1)"; }}
        >
          <i className="bi bi-x-circle-fill" style={{ fontSize: 20, color: "#475569" }} />
        </button>

        <div style={{
          display: "flex", alignItems: "center",
          padding: "20px 56px 16px 20px", borderBottom: "1px solid #F1F5F9"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar initials={seller.initials} color={seller.color} size={50} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#1B2332" }}>{seller.name}</div>
              <div style={{ fontSize: 12, color: "#94A3B8" }}>{seller.business}</div>
            </div>
          </div>
        </div>
        <div style={{ padding: "20px" }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "#94A3B8",
            textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10
          }}>
            <i className="bi bi-person-lines-fill" style={{ marginRight: 5, color: ORANGE }} />Contact
          </div>
          {[
            { icon: "bi-envelope",  label: "Email",     val: seller.email   },
            { icon: "bi-telephone", label: "Phone",     val: seller.phone   },
            { icon: "bi-calendar3", label: "Onboarded", val: seller.onboard },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <i className={`bi ${r.icon}`} style={{ fontSize: 14, color: "#94A3B8", width: 18 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#64748B", minWidth: 76 }}>{r.label}:</span>
              <span style={{ fontSize: 13, color: "#374151" }}>{r.val}</span>
            </div>
          ))}
          <div style={{
            fontSize: 11, fontWeight: 700, color: "#94A3B8",
            textTransform: "uppercase", letterSpacing: "0.07em", margin: "16px 0 10px"
          }}>
            <i className="bi bi-shield-check" style={{ marginRight: 5, color: ORANGE }} />Status
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Status",     val: seller.status     },
              { label: "Profile",    val: seller.profile    },
              { label: "KYC",        val: seller.kyc        },
              { label: "Supplement", val: seller.supplement },
              { label: "Shiprocket", val: seller.shiprocket },
            ].map(b => (
              <div key={b.label}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>{b.label}</div>
                <StatusBadge status={b.val} />
              </div>
            ))}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "#94A3B8",
            textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10
          }}>
            <i className="bi bi-box-seam" style={{ marginRight: 5, color: ORANGE }} />Products
          </div>
          <div style={{
            background: "#F8FAFC", borderRadius: 10, padding: 16,
            textAlign: "center", border: "1px solid #E8EDF5"
          }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#1B2332" }}>{seller.products}</div>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>Total Products Listed</div>
          </div>
          {seller.shipDate && (
            <div style={{
              marginTop: 12, background: "#ECFDF5", borderRadius: 8,
              padding: "10px 14px", display: "flex", alignItems: "center", gap: 8
            }}>
              <i className="bi bi-cloud-check-fill" style={{ color: "#10B981", fontSize: 15 }} />
              <span style={{ fontSize: 13, color: "#065F46" }}>Shiprocket uploaded: {seller.shipDate}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Seller List Container ──────────────────────────────────────────── */
function SellerListContainer({ isMobile, sellerFilter, setSellerFilter }: { isMobile: boolean; sellerFilter: string; setSellerFilter: (v: string) => void }) {
  const [search, setSearch]     = useState("");
  const [searchQ, setSearchQ]   = useState("");
  const [page, setPage]         = useState(1);
  const [perPage, setPerPage]   = useState(10);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);

  const filtered = ALL_SELLERS.filter(s => {
    const q = searchQ.toLowerCase();
    const matchQ = !q
      || s.name.toLowerCase().includes(q)
      || s.email.toLowerCase().includes(q)
      || s.business.toLowerCase().includes(q)
      || s.phone.includes(q);
    const matchSeller = sellerFilter === "All Sellers" || s.name === sellerFilter;
    return matchQ && matchSeller;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const doSearch = () => { setSearchQ(search); setPage(1); };
  const doReset  = () => { setSearch(""); setSearchQ(""); setPage(1); setPerPage(10); };

  const pageNums = (() => {
    if (totalPages <= 7) return [...Array(totalPages)].map((_, i) => i + 1);
    if (safePage <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (safePage >= totalPages - 3) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", safePage - 1, safePage, safePage + 1, "...", totalPages];
  })();

  const pageBtnBase = (active: boolean, disabled: boolean) => ({
    width: 32, height: 32,
    border: `1px solid ${active ? ORANGE : "#E2E8F0"}`,
    borderRadius: 8,
    background: active ? ORANGE : "#fff",
    color: disabled ? "#CBD5E1" : active ? "#fff" : "#374151",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 13,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  });

  const TABLE_COLS = [
    { label: "ID",         icon: "bi-hash"         },
    { label: "Seller",     icon: "bi-person"       },
    { label: "Business",   icon: "bi-briefcase"    },
    { label: "Onboard",    icon: "bi-calendar3"    },
    { label: "Status",     icon: "bi-circle-half"  },
    { label: "Profile",    icon: "bi-person-badge" },
    { label: "KYC",        icon: "bi-shield-check" },
    { label: "Supplement", icon: "bi-capsule"      },
    { label: "Products",   icon: "bi-box-seam"     },
    { label: "Action",     icon: "bi-gear"         },
  ];

  return (
    <>
      <div style={{
        background: "#fff", borderRadius: 14, border: "1px solid #E8EDF5",
        padding: isMobile ? 14 : 20, marginTop: isMobile ? 12 : 18
      }}>
        <div style={{
          display: "flex", alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between", marginBottom: 14,
          flexDirection: isMobile ? "column" : "row", gap: 6
        }}>
          <div>
            <div style={{
              fontSize: 15, fontWeight: 700, color: "#1B2332",
              display: "flex", alignItems: "center", gap: 6
            }}>
              <i className="bi bi-people-fill" style={{ color: ORANGE }} /> Seller List
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>
              Browse all sellers onboarded on our platform
            </div>
          </div>
          <div style={{
            fontSize: 12, color: "#64748B", fontWeight: 700,
            background: "#F1F5F9", borderRadius: 8, padding: "4px 10px", flexShrink: 0
          }}>
            <i className="bi bi-person-lines-fill" style={{ marginRight: 4 }} />
            Total {filtered.length}
          </div>
        </div>

        <div style={{
          display: "flex", gap: 10, alignItems: "flex-end",
          flexWrap: "wrap", marginBottom: 14,
          flexDirection: isMobile ? "column" : "row"
        }}>
          <div style={{ flex: 1, minWidth: isMobile ? "100%" : 220 }}>
            <label style={{
              fontSize: 12, fontWeight: 600, color: "#64748B",
              display: "block", marginBottom: 6
            }}>
              <i className="bi bi-search" style={{ marginRight: 4 }} />Search
            </label>
            <div style={{ position: "relative" }}>
              <i className="bi bi-search" style={{
                position: "absolute", left: 10, top: "50%",
                transform: "translateY(-50%)", fontSize: 14, color: "#94A3B8"
              }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSearch()}
                placeholder="Search name / email / mobile / business..."
                style={{
                  width: "100%", border: "1px solid #E2E8F0", borderRadius: 9,
                  padding: "9px 36px 9px 34px", fontSize: 13, color: "#374151",
                  background: "#fff"
                }}
              />
              {search && (
                <i className="bi bi-x-circle-fill"
                  onClick={() => { setSearch(""); setSearchQ(""); setPage(1); }}
                  style={{
                    position: "absolute", right: 10, top: "50%",
                    transform: "translateY(-50%)", fontSize: 14,
                    color: "#94A3B8", cursor: "pointer"
                  }} />
              )}
            </div>
          </div>

          <div style={{ flexShrink: 0, width: isMobile ? "100%" : "auto" }}>
            <label style={{
              fontSize: 12, fontWeight: 600, color: "#64748B",
              display: "block", marginBottom: 6
            }}>
              <i className="bi bi-list-ol" style={{ marginRight: 4 }} />Per page
            </label>
            <BSSelect
              value={String(perPage)}
              onChange={(v: string) => { setPerPage(Number(v)); setPage(1); }}
              options={PERPAGE_OPTIONS.map(String)}
              style={{ minWidth: 90 }}
            />
          </div>

          <div style={{
            display: "flex", gap: 8, alignItems: "flex-end",
            flexShrink: 0, width: isMobile ? "100%" : "auto"
          }}>
            <button
              onClick={doSearch}
              style={{
                background: ORANGE, color: "#fff", border: "none",
                borderRadius: 9, padding: "9px 20px", fontWeight: 700, fontSize: 13,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                height: 40, whiteSpace: "nowrap",
                flex: isMobile ? 1 : "none"
              }}
            >
              <i className="bi bi-search" /> Search
            </button>
            <button
              onClick={doReset}
              style={{
                background: "#F1F5F9", color: "#475569", border: "1px solid #E2E8F0",
                borderRadius: 9, padding: "9px 18px", fontWeight: 700, fontSize: 13,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                height: 40, whiteSpace: "nowrap",
                flex: isMobile ? 1 : "none"
              }}
            >
              <i className="bi bi-arrow-counterclockwise" /> Reset
            </button>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
          <i className="bi bi-list-check" style={{ marginRight: 4 }} />
          {filtered.length === 0
            ? "No results found"
            : `Showing ${(safePage - 1) * perPage + 1}–${Math.min(safePage * perPage, filtered.length)} of ${filtered.length} entries`}
        </div>

        {!isMobile ? (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{
              width: "100%", borderCollapse: "collapse",
              fontSize: 13, minWidth: 980
            }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {TABLE_COLS.map(h => (
                    <th key={h.label} style={{
                      padding: "11px 12px", textAlign: "left",
                      fontWeight: 700, fontSize: 11, color: "#64748B",
                      letterSpacing: "0.04em", textTransform: "uppercase",
                      borderBottom: "2px solid #E8EDF5", whiteSpace: "nowrap"
                    }}>
                      <i className={`bi ${h.icon}`} style={{ marginRight: 4 }} />{h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: "center", padding: 48, color: "#94A3B8", fontSize: 14 }}>
                      <i className="bi bi-inbox" style={{ fontSize: 36, display: "block", marginBottom: 10, color: "#CBD5E1" }} />
                      No sellers found
                      {(searchQ || sellerFilter !== "All Sellers") && (
                        <div style={{ marginTop: 10 }}>
                          <button onClick={doReset} style={{
                            background: "none", border: "1px solid #E2E8F0",
                            borderRadius: 8, padding: "6px 14px", fontSize: 12,
                            color: ORANGE, cursor: "pointer", fontWeight: 600
                          }}>Clear filters</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : paginated.map((s, idx) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #F1F5F9" }}
                    onMouseEnter={e => {
                      e.currentTarget.querySelectorAll("td").forEach(td => { td.style.background = "#FFF7ED"; });
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.querySelectorAll("td").forEach(td => { td.style.background = idx % 2 === 0 ? "#fff" : "#FAFBFD"; });
                    }}
                  >
                    <td style={{ padding: "12px", fontWeight: 700, color: "#94A3B8", fontSize: 12, background: idx % 2 === 0 ? "#fff" : "#FAFBFD", whiteSpace: "nowrap" }}>#{s.id}</td>
                    <td style={{ padding: "12px", background: idx % 2 === 0 ? "#fff" : "#FAFBFD", minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar initials={s.initials} color={s.color} size={34} />
                        <div>
                          <div style={{ fontWeight: 700, color: "#1B2332", fontSize: 13 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: "#94A3B8" }}>{s.email}</div>
                          <div style={{ fontSize: 11, color: "#94A3B8" }}>{s.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px", color: "#475569", fontSize: 12, background: idx % 2 === 0 ? "#fff" : "#FAFBFD", maxWidth: 140 }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.business}</span>
                    </td>
                    <td style={{ padding: "12px", color: "#475569", fontSize: 12, whiteSpace: "nowrap", background: idx % 2 === 0 ? "#fff" : "#FAFBFD" }}>{s.onboard}</td>
                    <td style={{ padding: "12px", background: idx % 2 === 0 ? "#fff" : "#FAFBFD" }}><StatusBadge status={s.status} /></td>
                    <td style={{ padding: "12px", background: idx % 2 === 0 ? "#fff" : "#FAFBFD" }}><StatusBadge status={s.profile} /></td>
                    <td style={{ padding: "12px", background: idx % 2 === 0 ? "#fff" : "#FAFBFD" }}><StatusBadge status={s.kyc === "Pending" ? "Not done" : s.kyc} /></td>
                    <td style={{ padding: "12px", background: idx % 2 === 0 ? "#fff" : "#FAFBFD" }}><StatusBadge status={s.supplement} /></td>
                    <td style={{ padding: "12px", fontWeight: 700, color: "#1B2332", textAlign: "center", background: idx % 2 === 0 ? "#fff" : "#FAFBFD" }}>{s.products}</td>
                    <td style={{ padding: "12px", background: idx % 2 === 0 ? "#fff" : "#FAFBFD" }}>
                      <button onClick={() => setSelectedSeller(s)} style={{
                        background: DARK_NAV, color: "#fff", border: "none",
                        borderRadius: 8, padding: "7px 14px", fontSize: 12,
                        fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap"
                      }}>
                        <i className="bi bi-eye-fill" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {paginated.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "#94A3B8" }}>
                <i className="bi bi-inbox" style={{ fontSize: 36, display: "block", marginBottom: 10, color: "#CBD5E1" }} />
                No sellers found
                {(searchQ || sellerFilter !== "All Sellers") && (
                  <div style={{ marginTop: 10 }}>
                    <button onClick={doReset} style={{
                      background: "none", border: "1px solid #E2E8F0",
                      borderRadius: 8, padding: "6px 14px", fontSize: 12,
                      color: ORANGE, cursor: "pointer", fontWeight: 600
                    }}>Clear filters</button>
                  </div>
                )}
              </div>
            ) : paginated.map(s => (
              <div key={s.id} style={{
                background: "#fff", border: "1px solid #E8EDF5",
                borderRadius: 14, padding: 16,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar initials={s.initials} color={s.color} size={46} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#1B2332", fontSize: 14 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <i className="bi bi-envelope" style={{ marginRight: 3 }} />{s.email}
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>
                      <i className="bi bi-telephone" style={{ marginRight: 3 }} />{s.phone}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: "#94A3B8",
                    background: "#F1F5F9", borderRadius: 6, padding: "3px 8px", flexShrink: 0
                  }}>#{s.id}</div>
                </div>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8, background: "#F8FAFC", borderRadius: 8,
                  padding: "10px 12px", margin: "10px 0"
                }}>
                  {[
                    { icon: "bi-briefcase", label: "Business", val: s.business     },
                    { icon: "bi-calendar3",  label: "Onboard",  val: s.onboard      },
                    { icon: "bi-box-seam",   label: "Products", val: String(s.products) },
                  ].map(({ icon, label, val }) => (
                    <div key={label}>
                      <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>
                        <i className={`bi ${icon}`} style={{ marginRight: 2 }} />{label}
                      </div>
                      <div style={{ fontSize: 12, color: "#374151", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 0" }}>
                  {[
                    { label: "Status",     val: s.status     },
                    { label: "Profile",    val: s.profile    },
                    { label: "KYC",        val: s.kyc === "Pending" ? "Not done" : s.kyc },
                    { label: "Supplement", val: s.supplement },
                  ].map(b => (
                    <div key={b.label}>
                      <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{b.label}</div>
                      <StatusBadge status={b.val} />
                    </div>
                  ))}
                </div>
                {s.shipDate && (
                  <div style={{ fontSize: 11, color: "#94A3B8", margin: "8px 0" }}>
                    <i className="bi bi-cloud-check-fill" style={{ marginRight: 4, color: "#10B981" }} />
                    Shiprocket uploaded: {s.shipDate}
                  </div>
                )}
                <button onClick={() => setSelectedSeller(s)} style={{
                  width: "100%", background: DARK_NAV, color: "#fff",
                  border: "none", borderRadius: 9, padding: "10px",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 6, marginTop: 10
                }}>
                  <i className="bi bi-eye-fill" /> View Details
                </button>
              </div>
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: 16, flexWrap: "wrap", gap: 10,
            borderTop: "1px solid #F1F5F9", paddingTop: 14
          }}>
            <span style={{ fontSize: 12, color: "#64748B" }}>Page {safePage} of {totalPages}</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button onClick={() => setPage(1)} disabled={safePage === 1} style={pageBtnBase(false, safePage === 1)}>
                <i className="bi bi-chevron-double-left" style={{ fontSize: 11 }} />
              </button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={pageBtnBase(false, safePage === 1)}>
                <i className="bi bi-chevron-left" style={{ fontSize: 11 }} />
              </button>
              {pageNums.map((p, i) => p === "..." ? (
                <span key={"e" + i} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#94A3B8" }}>…</span>
              ) : (
                <button key={p} onClick={() => setPage(Number(p))} style={pageBtnBase(safePage === p, false)}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={pageBtnBase(false, safePage === totalPages)}>
                <i className="bi bi-chevron-right" style={{ fontSize: 11 }} />
              </button>
              <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} style={pageBtnBase(false, safePage === totalPages)}>
                <i className="bi bi-chevron-double-right" style={{ fontSize: 11 }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedSeller && (
        <SellerModal seller={selectedSeller} onClose={() => setSelectedSeller(null)} />
      )}
    </>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function SellersDashboard() {
  const [windowW, setWindowW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [chartW, setChartW]   = useState(600);
  const chartRef = useRef(null);

  const [sellerFilter, setSellerFilter] = useState("All Sellers");
  const [filterType,   setFilterType]   = useState("Overall");
  const [filterYear,   setFilterYear]   = useState("2025");
  const [fromDate,     setFromDate]     = useState("");
  const [toDate,       setToDate]       = useState("");
  const [activeSeries, setActiveSeries] = useState("All Metrics");

  useEffect(() => {
    const onResize = () => setWindowW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setChartW(e.contentRect.width);
    });
    ro.observe(chartRef.current);
    return () => ro.disconnect();
  }, []);

  const isMobile  = windowW < 640;
  const isTablet  = windowW >= 640 && windowW < 1024;
  const isDesktop = windowW >= 1024;

  return (
    /*
      ── SCROLL FIX ──────────────────────────────────────────────────────
      The outer wrapper uses height:100vh + overflowY:auto so the page
      scrolls inside the artifact iframe on desktop. Without this the
      iframe never gets a scrollbar because the child content pushes the
      height past 100vh but the container has no overflow set.
    ────────────────────────────────────────────────────────────────── */
    <div style={{
      height: "100vh",
      overflowY: "auto",
      overflowX: "hidden",
      background: "#F8FAFC",
      fontFamily: "'Inter','Segoe UI',sans-serif"
    }}>
      <style>{`
        * { box-sizing:border-box; }
        input:focus, select:focus, button:focus { outline:none; }
        ::-webkit-scrollbar { height:4px; width:4px; }
        ::-webkit-scrollbar-track { background:#F1F5F9; }
        ::-webkit-scrollbar-thumb { background:#CBD5E1; border-radius:4px; }
      `}</style>

      <div style={{
        maxWidth: isDesktop ? 1320 : "100%", margin: "0 auto",
        padding: isMobile ? "16px 12px" : isTablet ? "20px 20px" : "28px 36px"
      }}>

        {/* ── Page Header ── */}
        <div style={{
          display: "flex", alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between", marginBottom: isMobile ? 14 : 22,
          flexDirection: isMobile ? "column" : "row", gap: 10
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#94A3B8", marginBottom: 4 }}>
              <i className="bi bi-house-door-fill" style={{ color: ORANGE, fontSize: 13 }} />
              <span style={{ color: ORANGE, fontWeight: 600 }}>Dashboard</span>
              <i className="bi bi-chevron-right" style={{ fontSize: 10 }} />
              <span style={{ color: ORANGE, fontWeight: 600 }}>Sellers</span>
              <i className="bi bi-chevron-right" style={{ fontSize: 10 }} />
              <span>Sellers Graph</span>
            </div>
            <h1 style={{
              fontSize: isMobile ? 20 : 26, fontWeight: 800, color: "#1B2332",
              margin: 0, display: "flex", alignItems: "center", gap: 8
            }}>
              <i className="bi bi-bar-chart-line-fill" style={{ color: ORANGE, fontSize: isMobile ? 18 : 22 }} />
              Sellers Graph / Analysis
            </h1>
          </div>
          <button style={{
            background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10,
            padding: "8px 18px", fontSize: 13, fontWeight: 600, color: "#475569",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0
          }}>
            <i className="bi bi-chevron-left" style={{ fontSize: 12 }} /> Back
          </button>
        </div>

        {/* ── Filters Card ── */}
        <div style={{
          background: "#fff", borderRadius: 14, border: "1px solid #E8EDF5",
          padding: isMobile ? "14px" : "18px 22px", marginBottom: isMobile ? 12 : 18
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "1fr 1fr 1fr auto",
            gap: 12, alignItems: "end"
          }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>
                <i className="bi bi-person" style={{ marginRight: 5 }} />Seller
              </label>
              <BSSelect value={sellerFilter} onChange={(v: string) => setSellerFilter(String(v))} options={SELLER_OPTIONS} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>
                <i className="bi bi-funnel" style={{ marginRight: 5 }} />Filter
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <BSSelect value={filterType} onChange={setFilterType} options={FILTER_OPTIONS} style={{ flex: 1 }} />
                <BSSelect value={filterYear} onChange={setFilterYear} options={YEAR_OPTIONS}   style={{ flex: 1 }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>
                <i className="bi bi-calendar3" style={{ marginRight: 5 }} />Date Range
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  style={{ flex: 1, border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: fromDate ? "#374151" : "#94A3B8", width: "100%" }} />
                <span style={{ color: "#94A3B8", fontWeight: 600 }}>–</span>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  style={{ flex: 1, border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: toDate ? "#374151" : "#94A3B8", width: "100%" }} />
              </div>
            </div>
            <button style={{
              background: ORANGE, color: "#fff", border: "none", borderRadius: 9,
              padding: "10px 22px", fontWeight: 700, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 7, justifyContent: "center",
              whiteSpace: "nowrap", height: 40
            }}>
              <i className="bi bi-funnel-fill" style={{ fontSize: 13 }} /> Apply
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 10, marginBottom: 0 }}>
            <i className="bi bi-info-circle" style={{ marginRight: 4 }} />
            Showing analytics for <strong>{filterType}</strong> · <strong>{sellerFilter}</strong> · <strong>{filterYear}</strong>
            {fromDate && toDate && ` · ${fromDate} → ${toDate}`}
          </p>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(3,1fr)" : "repeat(6,1fr)",
          gap: isMobile ? 10 : 14, marginBottom: isMobile ? 12 : 18
        }}>
          {STAT_CARDS.map(c => <StatCard key={c.label} {...c} />)}
        </div>

        {/* ── Chart + Insights ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile || isTablet ? "1fr" : "1fr 320px",
          gap: isMobile ? 12 : 18, marginBottom: isMobile ? 12 : 18
        }}>
          {/* ── Chart Card ── */}
          <div style={{
            background: "#fff", borderRadius: 14, border: "1px solid #E8EDF5",
            padding: isMobile ? "16px 12px" : "24px"
          }}>
            {/* Card header */}
            <div style={{
              display: "flex", alignItems: isMobile ? "flex-start" : "center",
              justifyContent: "space-between", marginBottom: 20,
              flexWrap: "wrap", gap: 10
            }}>
              <div>
                <div style={{
                  fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#1B2332",
                  marginBottom: 2
                }}>
                  Yearly Overview
                </div>
                <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.4 }}>
                  Performance overview of all sellers{isMobile ? " /" : " /"}<br style={{ display: isMobile ? "block" : "none" }} />
                  {" "}overall sellers for the selected period
                </div>
              </div>
              {/* Dropdown */}
              <BSSelect
                value={activeSeries}
                onChange={setActiveSeries}
                options={METRIC_OPTIONS}
                style={{ minWidth: 160 }}
              />
            </div>

            {/* Chart SVG */}
            <div ref={chartRef} style={{ width: "100%" }}>
              <LineChart
                width={chartW || 600}
                height={isMobile ? 220 : 320}
                activeSeries={activeSeries}
              />
            </div>

            {/* Legend – bottom, matching image style */}
            <div style={{
              display: "flex", flexWrap: "wrap",
              gap: isMobile ? "8px 14px" : "10px 24px",
              marginTop: 18,
              justifyContent: "center",
              borderTop: "1px solid #F1F5F9",
              paddingTop: 14
            }}>
              {SERIES.map(s => {
                const isActive = activeSeries === "All Metrics" || activeSeries === s.label;
                return (
                  <button
                    key={s.key}
                    onClick={() => setActiveSeries(activeSeries === s.label ? "All Metrics" : s.label)}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      background: "none", border: "none", cursor: "pointer",
                      padding: "3px 6px", borderRadius: 6,
                      opacity: isActive ? 1 : 0.35,
                      transition: "opacity 0.18s",
                      fontSize: 12, color: "#374151", fontWeight: 500,
                      whiteSpace: "nowrap"
                    }}
                  >
                    <LegendSwatch series={s} active={isActive} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{
            background: "#fff", borderRadius: 14, border: "1px solid #E8EDF5",
            padding: isMobile ? 14 : 20
          }}>
            <div style={{
              fontSize: 15, fontWeight: 700, color: "#1B2332", marginBottom: 14,
              display: "flex", alignItems: "center", gap: 6
            }}>
              <i className="bi bi-lightbulb-fill" style={{ color: "#F59E0B" }} /> Key Insights
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {INSIGHTS.map((ins, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, background: ins.bg,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                  }}>
                    <i className={`bi ${ins.biIcon}`} style={{ fontSize: 18, color: ins.color }} />
                  </div>
                  <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.55, margin: 0 }}>{ins.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SellerListContainer
          isMobile={isMobile}
          sellerFilter={sellerFilter}
          setSellerFilter={setSellerFilter}
        />

        <div style={{ textAlign: "center", padding: "20px 0 8px", fontSize: 12, color: "#94A3B8" }}>
          2026 © Flintnthread India Pvt. Ltd. Crafted by{" "}
          <a href="#" style={{ color: "#16A34A", fontWeight: 700, textDecoration: "none" }}>
            Flinththread India Pvt. Ltd.
          </a>
        </div>

      </div>
    </div>
  );
}