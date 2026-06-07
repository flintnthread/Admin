// Bootstrap Icons loaded via CDN — add this to your index.html:
// <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"/>

import { useEffect, useRef, useState } from "react";

const ORANGE = "#F97316";
const DARK_NAV = "#1B2332";

/* ─── Data ─────────────────────────────────────────────────────────── */
const ALL_SELLERS = [
  { id: 286, name: "Sanju Sandilya",    email: "sanju.sandilya@gmail.com",  phone: "+91 98765 43210", business: "SG Creations",          onboard: "05 Jun, 2025", status: "Pending",           profile: "Complete",   kyc: "Pending",  shiprocket: "Not Uploaded", shipDate: null,          products: 0,  initials: "SS", color: "#F97316" },
  { id: 285, name: "Khajaer Mohammed",  email: "khater2025@gmail.com",      phone: "+91 96158 43215", business: "ZOYA ALL BAGS CENTER",   onboard: "29 May, 2025", status: "Active",            profile: "Complete",   kyc: "Pending",  shiprocket: "Uploaded",     shipDate: "20 May, 2025", products: 2,  initials: "KM", color: "#10B981" },
  { id: 284, name: "Sandhya Gudisa",    email: "sandhya.gm@gmail.com",      phone: "+91 98760 12349", business: "—",                     onboard: "28 May, 2025", status: "Awaiting Approval", profile: "Incomplete", kyc: "Pending",  shiprocket: "Not Uploaded", shipDate: null,          products: 0,  initials: "SG", color: "#8B5CF6" },
  { id: 283, name: "Rahul Sharma",      email: "rahul.sharma@gmail.com",    phone: "+91 97654 32109", business: "RS Traders",            onboard: "20 May, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", shiprocket: "Uploaded",     shipDate: "18 May, 2025", products: 5,  initials: "RS", color: "#3B82F6" },
  { id: 282, name: "Priya Mehta",       email: "priya.mehta@gmail.com",     phone: "+91 96543 21098", business: "PM Boutique",           onboard: "15 May, 2025", status: "Active",            profile: "Complete",   kyc: "Pending",  shiprocket: "Not Uploaded", shipDate: null,          products: 3,  initials: "PM", color: "#EC4899" },
  { id: 281, name: "Amit Verma",        email: "amit.verma@gmail.com",      phone: "+91 95432 10987", business: "Verma Electronics",     onboard: "10 May, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", shiprocket: "Uploaded",     shipDate: "08 May, 2025", products: 12, initials: "AV", color: "#06B6D4" },
  { id: 280, name: "Neha Joshi",        email: "neha.joshi@gmail.com",      phone: "+91 94321 09876", business: "Joshi Handcrafts",      onboard: "05 May, 2025", status: "Pending",           profile: "Incomplete", kyc: "Pending",  shiprocket: "Not Uploaded", shipDate: null,          products: 0,  initials: "NJ", color: "#F59E0B" },
  { id: 279, name: "Vikram Singh",      email: "vikram.singh@gmail.com",    phone: "+91 93210 98765", business: "Singh Organics",        onboard: "01 May, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", shiprocket: "Uploaded",     shipDate: "28 Apr, 2025", products: 7,  initials: "VS", color: "#EF4444" },
  { id: 278, name: "Deepa Nair",        email: "deepa.nair@gmail.com",      phone: "+91 92109 87654", business: "Nair Silks",            onboard: "28 Apr, 2025", status: "Awaiting Approval", profile: "Complete",   kyc: "Pending",  shiprocket: "Not Uploaded", shipDate: null,          products: 4,  initials: "DN", color: "#7C3AED" },
  { id: 277, name: "Suresh Babu",       email: "suresh.babu@gmail.com",     phone: "+91 91098 76543", business: "Babu Enterprises",      onboard: "22 Apr, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", shiprocket: "Uploaded",     shipDate: "20 Apr, 2025", products: 9,  initials: "SB", color: "#059669" },
  { id: 276, name: "Ananya Krishnan",   email: "ananya.k@gmail.com",        phone: "+91 90987 65432", business: "AK Fashion Studio",     onboard: "18 Apr, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", shiprocket: "Uploaded",     shipDate: "15 Apr, 2025", products: 15, initials: "AK", color: "#DC2626" },
  { id: 275, name: "Manoj Tiwari",      email: "manoj.tiwari@gmail.com",    phone: "+91 89876 54321", business: "Tiwari General Store",  onboard: "12 Apr, 2025", status: "Pending",           profile: "Incomplete", kyc: "Pending",  shiprocket: "Not Uploaded", shipDate: null,          products: 0,  initials: "MT", color: "#9333EA" },
  { id: 274, name: "Rekha Pillai",      email: "rekha.pillai@gmail.com",    phone: "+91 88765 43210", business: "Pillai Naturals",       onboard: "08 Apr, 2025", status: "Active",            profile: "Complete",   kyc: "Pending",  shiprocket: "Uploaded",     shipDate: "05 Apr, 2025", products: 6,  initials: "RP", color: "#0891B2" },
  { id: 273, name: "Arun Mishra",       email: "arun.mishra@gmail.com",     phone: "+91 87654 32109", business: "Mishra Kirana",         onboard: "03 Apr, 2025", status: "Active",            profile: "Complete",   kyc: "Complete", shiprocket: "Uploaded",     shipDate: "01 Apr, 2025", products: 11, initials: "AM", color: "#16A34A" },
  { id: 272, name: "Kavya Reddy",       email: "kavya.reddy@gmail.com",     phone: "+91 86543 21098", business: "Reddy Textiles",        onboard: "28 Mar, 2025", status: "Awaiting Approval", profile: "Incomplete", kyc: "Pending",  shiprocket: "Not Uploaded", shipDate: null,          products: 0,  initials: "KR", color: "#B45309" },
];

const chartData = {
  labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  registered:         [2,  5,  9, 15, 24, 38, 55, 75, 98,115,130,141],
  profileCompleted:   [1,  3,  6, 11, 18, 28, 40, 54, 64, 69, 72, 74],
  approved:           [1,  2,  4,  8, 14, 22, 31, 42, 50, 57, 65, 71],
  productsAdded:      [0,  5, 18, 40, 80,130,200,290,390,490,580,707],
  shiprocketUploaded: [0,  1,  3,  7, 12, 18, 28, 36, 45, 55, 63, 70],
};

const SERIES = [
  { key: "registered",         label: "Registered",          color: "#3B82F6" },
  { key: "profileCompleted",   label: "Profile Completed",   color: "#10B981" },
  { key: "approved",           label: "Approved",            color: "#F97316" },
  { key: "productsAdded",      label: "Products Added",      color: "#8B5CF6" },
  { key: "shiprocketUploaded", label: "Shiprocket Uploaded", color: "#06B6D4" },
];

const YEAR_OPTIONS   = ["2025","2024","2023","2022"];
const FILTER_OPTIONS = ["Overall","Monthly","Weekly","Quarterly"];
const PERPAGE_OPTIONS = [5, 10, 20, 50];
const SELLER_OPTIONS = ["All Sellers", ...ALL_SELLERS.map(s => s.name)];
const METRIC_OPTIONS = ["All Metrics","Registered","Profile Completed","Approved","Products Added","Shiprocket Uploaded"];

/* ─── Helpers ───────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    "Pending":           { bg:"#FEF3C7", color:"#92400E", border:"#FCD34D" },
    "Active":            { bg:"#D1FAE5", color:"#065F46", border:"#34D399" },
    "Awaiting Approval": { bg:"#EDE9FE", color:"#4C1D95", border:"#A78BFA" },
    "Complete":          { bg:"#D1FAE5", color:"#065F46", border:"#34D399" },
    "Incomplete":        { bg:"#FEE2E2", color:"#7F1D1D", border:"#FCA5A5" },
    "Not Uploaded":      { bg:"#F3F4F6", color:"#374151", border:"#D1D5DB" },
    "Uploaded":          { bg:"#D1FAE5", color:"#065F46", border:"#34D399" },
  };
  const s = map[status] || { bg:"#F3F4F6", color:"#374151", border:"#D1D5DB" };
  return (
    <span style={{ background:s.bg, color:s.color, border:`1px solid ${s.border}`, borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>
      {status}
    </span>
  );
}

function Avatar({ initials, color, size=36 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:color+"22", border:`2px solid ${color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:size*0.33, color, flexShrink:0 }}>
      {initials}
    </div>
  );
}

/* Custom styled select with Bootstrap Icon chevron */
function BSSelect({ value, onChange, options, style={} }) {
  return (
    <div style={{ position:"relative", ...style }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width:"100%", border:"1px solid #E2E8F0", borderRadius:8, padding:"9px 32px 9px 12px", fontSize:13, color:"#374151", background:"#fff", cursor:"pointer", appearance:"none", WebkitAppearance:"none" }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <i className="bi bi-chevron-down" style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"#94A3B8", pointerEvents:"none" }} />
    </div>
  );
}

/* ─── Line Chart ────────────────────────────────────────────────────── */
function LineChart({ width, height, activeSeries }) {
  const pad = { top:20, right:20, bottom:40, left:48 };
  const W = Math.max(1, width - pad.left - pad.right);
  const H = height - pad.top - pad.bottom;
  const maxY = 750;
  const yTicks = [0,100,200,300,400,500,600,700];
  const [hovered, setHovered] = useState(null);
  const svgRef = useRef(null);

  const xScale = i => (i / (chartData.labels.length - 1)) * W;
  const yScale = v => H - (v / maxY) * H;
  const getPath = key => chartData[key].map((v,i) => `${i===0?"M":"L"}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`).join(" ");

  const visibleSeries = activeSeries === "All Metrics"
    ? SERIES
    : SERIES.filter(s => s.label === activeSeries);

  const handleMouseMove = e => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left - pad.left;
    const idx = Math.round((mx / W) * (chartData.labels.length - 1));
    setHovered(Math.max(0, Math.min(chartData.labels.length - 1, idx)));
  };

  const tooltipX = hovered !== null ? xScale(hovered) : 0;
  const tooltipRight = hovered !== null && tooltipX > W * 0.6;

  return (
    <svg ref={svgRef} width={width} height={height} style={{ overflow:"visible", cursor:"crosshair" }}
      onMouseMove={handleMouseMove} onMouseLeave={() => setHovered(null)}>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {yTicks.map(t => (
          <g key={t}>
            <line x1={0} x2={W} y1={yScale(t)} y2={yScale(t)} stroke="#E5E7EB" strokeWidth={0.5}/>
            <text x={-8} y={yScale(t)+4} textAnchor="end" fontSize={10} fill="#9CA3AF">{t}</text>
          </g>
        ))}
        {chartData.labels.map((l,i) => (
          <text key={l} x={xScale(i)} y={H+16} textAnchor="middle" fontSize={10} fill="#9CA3AF">{l}</text>
        ))}
        {visibleSeries.map(s => (
          <path key={s.key} d={getPath(s.key)} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"/>
        ))}
        {hovered !== null && (
          <>
            <line x1={xScale(hovered)} x2={xScale(hovered)} y1={0} y2={H} stroke="#CBD5E1" strokeWidth={1} strokeDasharray="4 3"/>
            {visibleSeries.map(s => (
              <circle key={s.key} cx={xScale(hovered)} cy={yScale(chartData[s.key][hovered])} r={5} fill={s.color} stroke="#fff" strokeWidth={2}/>
            ))}
            <rect
              x={tooltipRight ? xScale(hovered) - 148 : xScale(hovered) + 10}
              y={8}
              width={138}
              height={visibleSeries.length * 18 + 22}
              rx={8} fill="white" stroke="#E2E8F0" strokeWidth={1}
            />
            <text
              x={tooltipRight ? xScale(hovered) - 142 : xScale(hovered) + 16}
              y={24} fontSize={11} fontWeight="700" fill="#374151">
              {chartData.labels[hovered]} 2025
            </text>
            {visibleSeries.map((s,i) => (
              <text key={s.key}
                x={tooltipRight ? xScale(hovered) - 142 : xScale(hovered) + 16}
                y={40 + i*18} fontSize={10} fill={s.color}>
                {s.label}: {chartData[s.key][hovered]}
              </text>
            ))}
          </>
        )}
      </g>
    </svg>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────────── */
function StatCard({ biIcon, label, value, sub, iconBg, iconColor }) {
  return (
    <div style={{ background:"#fff", border:"1px solid #F1F5F9", borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
      <div style={{ width:46, height:46, borderRadius:12, background:iconBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <i className={`bi ${biIcon}`} style={{ fontSize:22, color:iconColor }}/>
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:11, color:"#94A3B8", fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:22, fontWeight:800, color:"#1B2332", lineHeight:1 }}>{value}</div>
        {sub && <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
}

const STAT_CARDS = [
  { biIcon:"bi-person-plus-fill",   label:"Registered",           value:"141", sub:"in 2025",        iconBg:"#FFF7ED", iconColor:ORANGE   },
  { biIcon:"bi-person-check-fill",  label:"Profile Completed",    value:"74",  sub:"in 2025",        iconBg:"#F0FDF4", iconColor:"#10B981" },
  { biIcon:"bi-shield-check",       label:"Approved",             value:"71",  sub:"Active + Profile",iconBg:"#EFF6FF", iconColor:"#3B82F6" },
  { biIcon:"bi-box-seam-fill",      label:"Products Added",       value:"707", sub:"in 2025",        iconBg:"#F5F3FF", iconColor:"#8B5CF6" },
  { biIcon:"bi-cloud-upload-fill",  label:"Ship Rocket Uploaded", value:"70",  sub:"CSV uploaded",   iconBg:"#ECFDF5", iconColor:"#06B6D4" },
  { biIcon:"bi-arrow-repeat",       label:"Shiprocket Sync",      value:"On",  sub:"Seller sync",    iconBg:"#FFF7ED", iconColor:ORANGE    },
];

const INSIGHTS = [
  { biIcon:"bi-graph-up-arrow", text:"Registered sellers increased by 85% compared to the previous period.", color:"#3B82F6", bg:"#EFF6FF" },
  { biIcon:"bi-check-circle-fill", text:"71 sellers are fully approved and active.",                         color:"#10B981", bg:"#F0FDF4" },
  { biIcon:"bi-box-seam-fill", text:"707 products added in 2025.",                                          color:"#8B5CF6", bg:"#F5F3FF" },
  { biIcon:"bi-arrow-repeat", text:"Shiprocket sync is currently running smoothly.",                        color:ORANGE,    bg:"#FFF7ED" },
];

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function SellersDashboard() {
  const [windowW, setWindowW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [chartW, setChartW]   = useState(600);
  const chartRef = useRef(null);

  /* Filter state */
  const [sellerFilter,  setSellerFilter]  = useState("All Sellers");
  const [filterType,    setFilterType]    = useState("Overall");
  const [filterYear,    setFilterYear]    = useState("2025");
  const [fromDate,      setFromDate]      = useState("");
  const [toDate,        setToDate]        = useState("");
  const [activeSeries,  setActiveSeries]  = useState("All Metrics");

  /* Table state */
  const [search,   setSearch]   = useState("");
  const [searchQ,  setSearchQ]  = useState("");
  const [page,     setPage]     = useState(1);
  const [perPage,  setPerPage]  = useState(10);

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

  /* Auto-apply date range when both dates selected */
  useEffect(() => {
    if (fromDate && toDate) {
      /* In a real app you'd filter data here */
    }
  }, [fromDate, toDate]);

  const isMobile  = windowW < 640;
  const isTablet  = windowW >= 640 && windowW < 1024;
  const isDesktop = windowW >= 1024;

  /* Table filtering */
  const filtered = ALL_SELLERS.filter(s => {
    const q = searchQ.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.business.toLowerCase().includes(q) || s.phone.includes(q);
    const matchSeller = sellerFilter === "All Sellers" || s.name === sellerFilter;
    return matchQ && matchSeller;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const doSearch = () => { setSearchQ(search); setPage(1); };
  const doReset  = () => { setSearch(""); setSearchQ(""); setPage(1); };

  const chartHeight = isMobile ? 200 : 260;

  /* Pagination page numbers */
  const pageNums = (() => {
    if (totalPages <= 7) return [...Array(totalPages)].map((_,i) => i+1);
    if (safePage <= 4)   return [1,2,3,4,5,"...",totalPages];
    if (safePage >= totalPages-3) return [1,"...",totalPages-4,totalPages-3,totalPages-2,totalPages-1,totalPages];
    return [1,"...",safePage-1,safePage,safePage+1,"...",totalPages];
  })();

  return (
    <div style={{ background:"#F8FAFC", minHeight:"100vh", fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: isDesktop ? 1320 : "100%", margin:"0 auto", padding: isMobile ? "16px 12px" : isTablet ? "20px 20px" : "28px 36px" }}>

        {/* ── Page Header ── */}
        <div style={{ display:"flex", alignItems: isMobile?"flex-start":"center", justifyContent:"space-between", marginBottom: isMobile?14:22, flexDirection: isMobile?"column":"row", gap:10 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#94A3B8", marginBottom:4 }}>
              <i className="bi bi-house-door-fill" style={{ color:ORANGE, fontSize:13 }}/>
              <span style={{ color:ORANGE, fontWeight:600 }}>Dashboard</span>
              <i className="bi bi-chevron-right" style={{ fontSize:10 }}/>
              <span style={{ color:ORANGE, fontWeight:600 }}>Sellers</span>
              <i className="bi bi-chevron-right" style={{ fontSize:10 }}/>
              <span>Sellers Graph</span>
            </div>
            <h1 style={{ fontSize: isMobile?20:26, fontWeight:800, color:"#1B2332", margin:0, display:"flex", alignItems:"center", gap:8 }}>
              <i className="bi bi-bar-chart-line-fill" style={{ color:ORANGE, fontSize: isMobile?18:22 }}/>
              Sellers Graph / Analysis
            </h1>
          </div>
          <button style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, padding:"8px 18px", fontSize:13, fontWeight:600, color:"#475569", cursor:"pointer", display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            <i className="bi bi-chevron-left" style={{ fontSize:12 }}/> Back
          </button>
        </div>

        {/* ── Filters Card ── */}
        <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E8EDF5", padding: isMobile?"14px":"18px 22px", marginBottom: isMobile?12:18 }}>
          <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr": isTablet?"1fr 1fr":"1fr 1fr 1fr auto", gap:12, alignItems:"end" }}>

            {/* Seller dropdown */}
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:"#64748B", display:"block", marginBottom:6 }}>
                <i className="bi bi-person" style={{ marginRight:5 }}/>Seller
              </label>
              <BSSelect value={sellerFilter} onChange={v => { setSellerFilter(v); setPage(1); }} options={SELLER_OPTIONS}/>
            </div>

            {/* Filter type + year */}
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:"#64748B", display:"block", marginBottom:6 }}>
                <i className="bi bi-funnel" style={{ marginRight:5 }}/>Filter
              </label>
              <div style={{ display:"flex", gap:8 }}>
                <BSSelect value={filterType} onChange={setFilterType} options={FILTER_OPTIONS} style={{ flex:1 }}/>
                <BSSelect value={filterYear} onChange={setFilterYear} options={YEAR_OPTIONS}   style={{ flex:1 }}/>
              </div>
            </div>

            {/* Date range */}
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:"#64748B", display:"block", marginBottom:6 }}>
                <i className="bi bi-calendar3" style={{ marginRight:5 }}/>Date Range
              </label>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ flex:1, position:"relative" }}>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    style={{ width:"100%", boxSizing:"border-box", border:"1px solid #E2E8F0", borderRadius:8, padding:"8px 10px", fontSize:12, color: fromDate?"#374151":"#94A3B8" }}/>
                </div>
                <span style={{ color:"#94A3B8", fontWeight:600 }}>–</span>
                <div style={{ flex:1, position:"relative" }}>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    style={{ width:"100%", boxSizing:"border-box", border:"1px solid #E2E8F0", borderRadius:8, padding:"8px 10px", fontSize:12, color: toDate?"#374151":"#94A3B8" }}/>
                </div>
              </div>
            </div>

            {/* Apply button */}
            <button style={{ background:ORANGE, color:"#fff", border:"none", borderRadius:9, padding:"10px 22px", fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:7, justifyContent:"center", whiteSpace:"nowrap", height:40 }}>
              <i className="bi bi-funnel-fill" style={{ fontSize:13 }}/> Apply
            </button>
          </div>
          <p style={{ fontSize:11, color:"#94A3B8", marginTop:10, marginBottom:0 }}>
            <i className="bi bi-info-circle" style={{ marginRight:4 }}/>
            Showing analytics for <strong>{filterType}</strong> · <strong>{sellerFilter}</strong> · <strong>{filterYear}</strong>
            {fromDate && toDate && ` · ${fromDate} → ${toDate}`}
          </p>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr": isTablet?"repeat(3,1fr)":"repeat(6,1fr)", gap: isMobile?10:14, marginBottom: isMobile?12:18 }}>
          {STAT_CARDS.map(c => <StatCard key={c.label} {...c}/>)}
        </div>

        {/* ── Chart + Insights ── */}
        <div style={{ display:"grid", gridTemplateColumns: isMobile||isTablet?"1fr":"1fr 320px", gap: isMobile?12:18, marginBottom: isMobile?12:18 }}>

          {/* Chart */}
          <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E8EDF5", padding: isMobile?14:20 }}>
            <div style={{ display:"flex", alignItems: isMobile?"flex-start":"center", justifyContent:"space-between", marginBottom:12, flexWrap:"wrap", gap:8 }}>
              <div>
                <div style={{ fontSize: isMobile?14:16, fontWeight:700, color:"#1B2332", display:"flex", alignItems:"center", gap:6 }}>
                  <i className="bi bi-graph-up" style={{ color:ORANGE }}/> Yearly Overview
                </div>
                <div style={{ fontSize:11, color:"#94A3B8" }}>Performance overview of all sellers for the selected period</div>
              </div>
              <BSSelect value={activeSeries} onChange={setActiveSeries} options={METRIC_OPTIONS} style={{ minWidth:150 }}/>
            </div>
            <div ref={chartRef} style={{ width:"100%" }}>
              <LineChart width={chartW||600} height={chartHeight} activeSeries={activeSeries}/>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap: isMobile?5:10, marginTop:10 }}>
              {SERIES.map(s => (
                <button key={s.key}
                  onClick={() => setActiveSeries(activeSeries === s.label ? "All Metrics" : s.label)}
                  style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color: activeSeries===s.label||activeSeries==="All Metrics" ? "#374151":"#CBD5E1", background:"none", border:"none", cursor:"pointer", padding:"2px 4px", borderRadius:4, transition:"all 0.15s" }}>
                  <svg width={20} height={8}>
                    <line x1={0} y1={4} x2={14} y2={4} stroke={activeSeries===s.label||activeSeries==="All Metrics"?s.color:"#CBD5E1"} strokeWidth={2}/>
                    <circle cx={7} cy={4} r={3} fill={activeSeries===s.label||activeSeries==="All Metrics"?s.color:"#CBD5E1"}/>
                  </svg>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Key Insights */}
          <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E8EDF5", padding: isMobile?14:20 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#1B2332", marginBottom:14, display:"flex", alignItems:"center", gap:6 }}>
              <i className="bi bi-lightbulb-fill" style={{ color:"#F59E0B" }}/> Key Insights
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {INSIGHTS.map((ins,i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:ins.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <i className={`bi ${ins.biIcon}`} style={{ fontSize:18, color:ins.color }}/>
                  </div>
                  <p style={{ fontSize:13, color:"#475569", lineHeight:1.55, margin:0 }}>{ins.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sellers List ── */}
        <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E8EDF5", padding: isMobile?14:20 }}>
          <div style={{ display:"flex", alignItems: isMobile?"flex-start":"center", justifyContent:"space-between", marginBottom:14, flexDirection: isMobile?"column":"row", gap:6 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:"#1B2332", display:"flex", alignItems:"center", gap:6 }}>
                <i className="bi bi-people-fill" style={{ color:ORANGE }}/> Sellers List
              </div>
              <div style={{ fontSize:11, color:"#94A3B8" }}>Shows sellers by onboard date · current statuses for selected range</div>
            </div>
            <div style={{ fontSize:12, color:"#64748B", fontWeight:700, background:"#F1F5F9", borderRadius:8, padding:"4px 10px" }}>
              <i className="bi bi-person-lines-fill" style={{ marginRight:4 }}/> Total {filtered.length}
            </div>
          </div>

          {/* Search bar */}
          <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:200, position:"relative" }}>
              <i className="bi bi-search" style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"#94A3B8" }}/>
              <input
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSearch()}
                placeholder="Search name / email / mobile / business..."
                style={{ width:"100%", boxSizing:"border-box", border:"1px solid #E2E8F0", borderRadius:9, padding:"9px 12px 9px 34px", fontSize:13, color:"#374151" }}
              />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
              <span style={{ fontSize:12, color:"#64748B", whiteSpace:"nowrap" }}>
                <i className="bi bi-list-ol" style={{ marginRight:3 }}/>Per page
              </span>
              <BSSelect value={String(perPage)} onChange={v => { setPerPage(Number(v)); setPage(1); }} options={PERPAGE_OPTIONS.map(String)} style={{ minWidth:70 }}/>
            </div>
            <button onClick={doSearch}
              style={{ background:ORANGE, color:"#fff", border:"none", borderRadius:9, padding:"9px 18px", fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              <i className="bi bi-search"/> Search
            </button>
            <button onClick={doReset}
              style={{ background:"#F1F5F9", color:"#475569", border:"1px solid #E2E8F0", borderRadius:9, padding:"9px 18px", fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              <i className="bi bi-arrow-counterclockwise"/> Reset
            </button>
          </div>

          {/* Desktop / Tablet Table */}
          {!isMobile ? (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#F8FAFC" }}>
                    {[
                      { label:"ID Number",  icon:"bi-hash" },
                      { label:"Seller",     icon:"bi-person" },
                      { label:"Business",   icon:"bi-briefcase" },
                      { label:"Onboard",    icon:"bi-calendar3" },
                      { label:"Status",     icon:"bi-circle-half" },
                      { label:"Profile",    icon:"bi-person-badge" },
                      { label:"KYC",        icon:"bi-shield-check" },
                      { label:"Shiprocket", icon:"bi-cloud-upload" },
                      { label:"Products",   icon:"bi-box-seam" },
                      { label:"Action",     icon:"bi-gear" },
                    ].map(h => (
                      <th key={h.label} style={{ padding:"10px 12px", textAlign:"left", fontWeight:700, fontSize:11, color:"#64748B", letterSpacing:"0.04em", textTransform:"uppercase", borderBottom:"1px solid #E8EDF5", whiteSpace:"nowrap" }}>
                        <i className={`bi ${h.icon}`} style={{ marginRight:4 }}/>{h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign:"center", padding:32, color:"#94A3B8", fontSize:14 }}>
                      <i className="bi bi-inbox" style={{ fontSize:32, display:"block", marginBottom:8 }}/>No sellers found
                    </td></tr>
                  ) : paginated.map((s, idx) => (
                    <tr key={s.id} style={{ borderBottom:"1px solid #F1F5F9", background: idx%2===0?"#fff":"#FAFBFD", transition:"background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background="#FFF7ED"}
                      onMouseLeave={e => e.currentTarget.style.background = idx%2===0?"#fff":"#FAFBFD"}>
                      <td style={{ padding:"12px", fontWeight:700, color:"#94A3B8", fontSize:12 }}>#{s.id}</td>
                      <td style={{ padding:"12px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <Avatar initials={s.initials} color={s.color} size={34}/>
                          <div>
                            <div style={{ fontWeight:700, color:"#1B2332", fontSize:13 }}>{s.name}</div>
                            <div style={{ fontSize:11, color:"#94A3B8" }}>{s.email}</div>
                            <div style={{ fontSize:11, color:"#94A3B8" }}>{s.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:"12px", color:"#475569", fontSize:12 }}>{s.business}</td>
                      <td style={{ padding:"12px", color:"#475569", fontSize:12, whiteSpace:"nowrap" }}>{s.onboard}</td>
                      <td style={{ padding:"12px" }}><StatusBadge status={s.status}/></td>
                      <td style={{ padding:"12px" }}><StatusBadge status={s.profile}/></td>
                      <td style={{ padding:"12px" }}><StatusBadge status={s.kyc}/></td>
                      <td style={{ padding:"12px" }}>
                        <StatusBadge status={s.shiprocket}/>
                        {s.shipDate && <div style={{ fontSize:10, color:"#94A3B8", marginTop:3 }}>{s.shipDate}</div>}
                      </td>
                      <td style={{ padding:"12px", fontWeight:700, color:"#1B2332", textAlign:"center" }}>{s.products}</td>
                      <td style={{ padding:"12px" }}>
                        <button style={{ background:DARK_NAV, color:"#fff", border:"none", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                          <i className="bi bi-eye-fill"/> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Mobile Cards */
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {paginated.length === 0 ? (
                <div style={{ textAlign:"center", padding:32, color:"#94A3B8" }}>
                  <i className="bi bi-inbox" style={{ fontSize:36, display:"block", marginBottom:8 }}/>No sellers found
                </div>
              ) : paginated.map(s => (
                <div key={s.id} style={{ border:"1px solid #E8EDF5", borderRadius:12, padding:14, background:"#FAFBFD" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <Avatar initials={s.initials} color={s.color} size={42}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, color:"#1B2332", fontSize:14 }}>{s.name}</div>
                      <div style={{ fontSize:11, color:"#94A3B8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        <i className="bi bi-envelope" style={{ marginRight:3 }}/>{s.email}
                      </div>
                      <div style={{ fontSize:11, color:"#94A3B8" }}>
                        <i className="bi bi-telephone" style={{ marginRight:3 }}/>{s.phone}
                      </div>
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#94A3B8", flexShrink:0 }}>#{s.id}</div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10 }}>
                    {[
                      { icon:"bi-briefcase",  label:"Business",  val:s.business },
                      { icon:"bi-calendar3",  label:"Onboard",   val:s.onboard  },
                      { icon:"bi-box-seam",   label:"Products",  val:s.products },
                    ].map(({ icon, label, val }) => (
                      <div key={label}>
                        <div style={{ fontSize:10, color:"#94A3B8", fontWeight:600, textTransform:"uppercase", marginBottom:2 }}>
                          <i className={`bi ${icon}`} style={{ marginRight:2 }}/>{label}
                        </div>
                        <div style={{ fontSize:12, color:"#374151", fontWeight:600 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
                    <StatusBadge status={s.status}/>
                    <StatusBadge status={s.profile}/>
                    <StatusBadge status={s.kyc}/>
                    <StatusBadge status={s.shiprocket}/>
                  </div>
                  <button style={{ width:"100%", background:DARK_NAV, color:"#fff", border:"none", borderRadius:9, padding:9, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                    <i className="bi bi-eye-fill"/> View
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Pagination ── */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:16, flexWrap:"wrap", gap:8 }}>
            <span style={{ fontSize:12, color:"#64748B" }}>
              <i className="bi bi-list-check" style={{ marginRight:4 }}/>
              Showing {filtered.length===0?0:(safePage-1)*perPage+1} to {Math.min(safePage*perPage,filtered.length)} of {filtered.length} entries
            </span>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              <button onClick={() => setPage(1)} disabled={safePage===1}
                style={{ width:32, height:32, border:"1px solid #E2E8F0", borderRadius:8, background:"#fff", cursor:safePage===1?"not-allowed":"pointer", color:safePage===1?"#CBD5E1":"#374151", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <i className="bi bi-chevron-double-left" style={{ fontSize:11 }}/>
              </button>
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={safePage===1}
                style={{ width:32, height:32, border:"1px solid #E2E8F0", borderRadius:8, background:"#fff", cursor:safePage===1?"not-allowed":"pointer", color:safePage===1?"#CBD5E1":"#374151", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <i className="bi bi-chevron-left" style={{ fontSize:11 }}/>
              </button>
              {pageNums.map((p,i) => p==="..." ? (
                <span key={"e"+i} style={{ width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"#94A3B8" }}>…</span>
              ) : (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width:32, height:32, border:`1px solid ${safePage===p?ORANGE:"#E2E8F0"}`, borderRadius:8, background:safePage===p?ORANGE:"#fff", color:safePage===p?"#fff":"#374151", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={safePage===totalPages}
                style={{ width:32, height:32, border:"1px solid #E2E8F0", borderRadius:8, background:"#fff", cursor:safePage===totalPages?"not-allowed":"pointer", color:safePage===totalPages?"#CBD5E1":"#374151", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <i className="bi bi-chevron-right" style={{ fontSize:11 }}/>
              </button>
              <button onClick={() => setPage(totalPages)} disabled={safePage===totalPages}
                style={{ width:32, height:32, border:"1px solid #E2E8F0", borderRadius:8, background:"#fff", cursor:safePage===totalPages?"not-allowed":"pointer", color:safePage===totalPages?"#CBD5E1":"#374151", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <i className="bi bi-chevron-double-right" style={{ fontSize:11 }}/>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}