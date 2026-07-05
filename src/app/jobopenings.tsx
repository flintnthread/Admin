import React, { useState, useRef, useEffect, useCallback } from "react";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import type { JobOpening as ApiJob } from "@/lib/api/types";
import { createJob, deleteJob, fetchDepartments, fetchJobs, updateJob } from "@/services/hrApi";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    TextInput,
    Modal,
    Platform,
    Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AdminLayout from "@/components/admin-layout";
import Pagination from "@/components/Pagination";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
    orange: "#E8631A",
    orangeLight: "#FEF0E6",
    orangeMid: "#FDDBB9",
    orangeDark: "#B84E14",
    navy: "#1F2937",
    navyLight: "#F3F4F6",
    bg: "#F9FAFB",
    card: "#FFFFFF",
    border: "#E5E7EB",
    textH: "#111827",
    textB: "#111827",
    textM: "#374151",
    textHint: "#6B7280",
    red: "#DC2626",
    redBg: "#FEF2F2",
    green: "#15803D",
    greenBg: "#F0FDF4",
    blue: "#1D4ED8",
    blueBg: "#EFF6FF",
    purple: "#7C3AED",
    purpleBg: "#F5F3FF",
    white: "#FFFFFF",
};

const WebStyles = Platform.OS === 'web' ? (
    <style>{`
      .job-card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
      .job-card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.08); border-color: ${T.orangeMid}; }
    `}</style>
) : null;

// ─── TYPES ────────────────────────────────────────────────────────────────────
type JobStatus = "Active" | "Paused" | "Closed";
type JobType = "Full Time" | "Part Time" | "Contract" | "Internship";

interface Job {
    id: number;
    title: string;
    department: string;
    location: string;
    type: JobType;
    positions: number;
    applications: number;
    postedAt: string;
    status: JobStatus;
    urgent?: boolean;
    description: string;
    requirements: string;
    experience: string;
    salaryRange: string;
}

function mapApiJob(j: ApiJob, deptNames: Record<number, string>): Job {
    const statusRaw = (j.status ?? "open").toLowerCase();
    const status: JobStatus =
        statusRaw === "paused" || statusRaw === "inactive" ? "Paused" :
            statusRaw === "closed" ? "Closed" : "Active";
    const typeRaw = (j.employmentType ?? "full time").toLowerCase();
    const type: JobType =
        typeRaw.includes("part") ? "Part Time" :
            typeRaw.includes("contract") ? "Contract" :
                typeRaw.includes("intern") ? "Internship" : "Full Time";
    return {
        id: j.id,
        title: j.title ?? "Job",
        department: j.departmentId != null ? (deptNames[j.departmentId] ?? `Dept #${j.departmentId}`) : "—",
        location: j.location ?? "—",
        type,
        positions: Number(j.vacancies ?? 1),
        applications: Number(j.applicationCount ?? 0),
        postedAt: formatDate(j.createdAt),
        status,
        description: j.description ?? "",
        requirements: j.requirements ?? "",
        experience: j.experienceRequired ?? "",
        salaryRange: j.salaryRange ?? "",
    };
}

const DEFAULT_DEPARTMENTS = ["All Departments"];
const STATUSES: ("All Status" | JobStatus)[] = ["All Status", "Active", "Paused", "Closed"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
type FeatherName = React.ComponentProps<typeof Feather>["name"];

const DEPT_ICONS: Record<string, FeatherName> = {
    Marketing: "trending-up",
    Finance: "dollar-sign",
    Technology: "cpu",
    "Customer Support": "headphones",
    "Human Resources": "users",
    Sales: "briefcase",
    Operations: "settings",
};
const getDeptIcon = (d: string): FeatherName => DEPT_ICONS[d] || "folder";

const STATUS_COLOR: Record<JobStatus, { bg: string; fg: string }> = {
    Active: { bg: T.greenBg, fg: T.green },
    Paused: { bg: T.orangeLight, fg: T.orange },
    Closed: { bg: T.redBg, fg: T.red },
};

const TYPE_COLOR: Record<JobType, { bg: string; fg: string }> = {
    "Full Time": { bg: T.blueBg, fg: T.blue },
    "Part Time": { bg: T.purpleBg, fg: T.purple },
    Contract: { bg: T.orangeLight, fg: T.orange },
    Internship: { bg: T.navyLight, fg: T.navy },
};

// ─── STAT PILL ────────────────────────────────────────────────────────────────
const StatPill: React.FC<{
    icon: FeatherName;
    value: number;
    label: string;
    iconBg: string;
    iconFg: string;
}> = ({ icon, value, label, iconBg, iconFg }) => (
    <View style={sp.card}>
        <View style={[sp.iconBox, { backgroundColor: iconBg }]}>
            <Feather name={icon} size={15} color={iconFg} />
        </View>
        <View>
            <Text style={sp.val}>{value}</Text>
            <Text style={sp.lbl}>{label}</Text>
        </View>
    </View>
);

const sp = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: T.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        padding: 13,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    iconBox: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    val: {
        fontSize: 19,
        fontWeight: "800",
        color: T.textH,
        letterSpacing: -0.4,
    },
    lbl: {
        fontSize: 10,
        fontWeight: "700",
        color: "#000000",
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
});

// ─── DROPDOWN MODAL ───────────────────────────────────────────────────────────
const DropdownModal: React.FC<{
    visible: boolean;
    options: string[];
    selected: string;
    onSelect: (v: string) => void;
    onClose: () => void;
    title: string;
}> = ({ visible, options, selected, onSelect, onClose, title }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={dm.overlay} activeOpacity={1} onPress={onClose}>
            <View style={dm.sheet}>
                <View style={dm.handle} />
                <Text style={dm.title}>{title}</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {options.map(opt => (
                        <TouchableOpacity
                            key={opt}
                            style={[dm.option, selected === opt && dm.optionActive]}
                            onPress={() => { onSelect(opt); onClose(); }}
                        >
                            <Text style={[dm.optionTxt, selected === opt && dm.optionTxtActive]}>
                                {opt}
                            </Text>
                            {selected === opt && <Feather name="check" size={15} color={T.orange} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </TouchableOpacity>
    </Modal>
);

const dm = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(10,5,0,0.45)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: T.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 36,
        maxHeight: "60%",
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: T.border,
        alignSelf: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 13,
        fontWeight: "700",
        color: T.textM,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 12,
    },
    option: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 13,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
    },
    optionActive: {
        backgroundColor: T.orangeLight,
        borderRadius: 10,
        paddingHorizontal: 12,
        marginHorizontal: -4,
        borderBottomColor: "transparent",
    },
    optionTxt: {
        fontSize: 14,
        color: T.textH,
        fontWeight: "500",
    },
    optionTxtActive: {
        color: T.orange,
        fontWeight: "700",
    },
});

// ─── JOB CARD ─────────────────────────────────────────────────────────────────
const JobCard: React.FC<{
    job: Job;
    onPress?: () => void;
    onEdit?: (job: Job) => void;
    onDelete?: (job: Job) => void;
}> = ({ job, onPress, onEdit, onDelete }) => {
    const statusStyle = STATUS_COLOR[job.status];
    const typeStyle = TYPE_COLOR[job.type];
    const deptIcon = getDeptIcon(job.department);
    const isWeb = Platform.OS === 'web';

    return (
        <TouchableOpacity style={[jc.card, isWeb && { height: "100%" }]} onPress={onPress} activeOpacity={0.93} {...(isWeb ? { className: "job-card-hover" } : {})}>
            {isWeb && <View style={{ height: 4, width: "100%", backgroundColor: T.orange }} />}
            {/* Top banner */}
            <View style={[jc.banner, isWeb && { backgroundColor: T.card, borderBottomWidth: 1, borderBottomColor: T.border }]}>
                {/* Decorative blobs */}
                {!isWeb && <View style={jc.blob1} />}
                {!isWeb && <View style={jc.blob2} />}

                {/* Top row: dept icon + status */}
                <View style={jc.bannerTop}>
                    <View style={[jc.deptIconWrap, isWeb && { backgroundColor: T.orangeLight, borderWidth: 1, borderColor: T.orangeMid }]}>
                        <Feather name={deptIcon} size={18} color={T.orange} />
                    </View>
                    <View style={[jc.statusPill, { backgroundColor: statusStyle.bg }]}>
                        <View style={[jc.statusDot, { backgroundColor: statusStyle.fg }]} />
                        <Text style={[jc.statusTxt, { color: statusStyle.fg }]}>{job.status}</Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={[jc.bannerTitle, isWeb && { color: T.textH, textShadowColor: 'transparent' }]} numberOfLines={2}>{job.title}</Text>

                {/* Urgent tag */}
                {job.urgent && (
                    <View style={[jc.urgentTag, isWeb && { backgroundColor: T.orangeLight, borderWidth: 1, borderColor: T.orangeMid }]}>
                        <Feather name="zap" size={10} color={T.orange} />
                        <Text style={jc.urgentTxt}>Urgent Hire</Text>
                    </View>
                )}
            </View>

            {/* Body */}
            <View style={[jc.body, isWeb && { flex: 1, justifyContent: "space-between" }]}>
                <View>
                    {/* Meta row */}
                    <View style={jc.metaGrid}>
                        <View style={jc.metaItem}>
                            <Feather name="grid" size={12} color={T.textHint} />
                            <Text style={jc.metaTxt} numberOfLines={1}>{job.department}</Text>
                        </View>
                        <View style={jc.metaItem}>
                            <Feather name="map-pin" size={12} color={T.textHint} />
                            <Text style={jc.metaTxt} numberOfLines={1}>{job.location}</Text>
                        </View>
                        <View style={jc.metaItem}>
                            <Feather name="clock" size={12} color={T.textHint} />
                            <Text style={jc.metaTxt}>{job.type}</Text>
                        </View>
                        <View style={jc.metaItem}>
                            <Feather name="users" size={12} color={T.textHint} />
                            <Text style={jc.metaTxt}>{job.positions} {job.positions === 1 ? "Position" : "Positions"}</Text>
                        </View>
                    </View>
                </View>

                <View>
                    <View style={jc.divider} />

                    {/* Footer */}
                    <View style={jc.footer}>
                        <View style={jc.footLeft}>
                            <View style={[jc.typePill, { backgroundColor: typeStyle.bg }]}>
                                <Text style={[jc.typeTxt, { color: typeStyle.fg }]}>{job.type}</Text>
                            </View>
                            <View style={jc.dateItem}>
                                <Feather name="calendar" size={11} color={T.textHint} />
                                <Text style={jc.dateTxt}>{job.postedAt}</Text>
                            </View>
                        </View>
                        <View style={[
                            jc.appsBadge,
                            { backgroundColor: job.applications > 0 ? T.navy : T.bg }
                        ]}>
                            <Feather
                                name="file-text"
                                size={11}
                                color={job.applications > 0 ? "#fff" : T.textHint}
                            />
                            <Text style={[
                                jc.appsTxt,
                                { color: job.applications > 0 ? "#fff" : T.textHint }
                            ]}>
                                {job.applications} {job.applications === 1 ? "App" : "Apps"}
                            </Text>
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={jc.actionsRow}>
                        <TouchableOpacity style={jc.actBtn} onPress={() => onEdit?.(job)}>
                            <Feather name="edit-2" size={13} color={T.textM} />
                            <Text style={jc.actTxt}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[jc.actBtn, { borderLeftWidth: 1, borderLeftColor: T.border }]} onPress={() => onDelete?.(job)}>
                            <Feather name="trash-2" size={13} color={T.red} />
                            <Text style={[jc.actTxt, { color: T.red }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const jc = StyleSheet.create({
    card: {
        backgroundColor: T.card,
        borderRadius: 18,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: T.border,
        shadowColor: "#1A1208",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 3,
    },
    banner: {
        backgroundColor: T.orange,
        padding: 16,
        paddingBottom: 18,
        overflow: "hidden",
        position: "relative",
        minHeight: 110,
        justifyContent: "space-between",
    },
    blob1: {
        position: "absolute",
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "rgba(255,255,255,0.07)",
        top: -40,
        right: -30,
    },
    blob2: {
        position: "absolute",
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(0,0,0,0.08)",
        bottom: -30,
        left: -20,
    },
    bannerTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    deptIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.92)",
        alignItems: "center",
        justifyContent: "center",
    },
    statusPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    statusTxt: {
        fontSize: 10,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    bannerTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: "#fff",
        letterSpacing: -0.3,
        lineHeight: 20,
        flex: 1,
        textShadowColor: "rgba(0,0,0,0.15)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    urgentTag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(255,255,255,0.92)",
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        marginTop: 8,
    },
    urgentTxt: {
        fontSize: 10,
        fontWeight: "700",
        color: T.orange,
    },
    body: {
        padding: 14,
    },
    metaGrid: {
        gap: 6,
        marginBottom: 2,
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    metaTxt: {
        fontSize: 12,
        color: T.textM,
        fontWeight: "500",
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: T.border,
        marginVertical: 12,
    },
    footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    footLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flex: 1,
        flexWrap: "wrap",
    },
    typePill: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 6,
    },
    typeTxt: {
        fontSize: 10,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    dateItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    dateTxt: {
        fontSize: 11,
        color: T.textHint,
        fontWeight: "500",
    },
    appsBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        flexShrink: 0,
    },
    appsTxt: {
        fontSize: 11,
        fontWeight: "700",
    },
    actionsRow: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: T.border,
        marginTop: 12,
        marginHorizontal: -14,
        marginBottom: -14,
    },
    actBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        gap: 6,
    },
    actTxt: {
        fontSize: 13,
        fontWeight: "600",
        color: T.textM,
    },
});

// ─── WEB SELECT (for web dropdowns) ──────────────────────────────────────────
const WebSelect: React.FC<{
    value: string;
    options: string[];
    onChange: (v: string) => void;
    placeholder?: string;
}> = ({ value, options, onChange, placeholder }) => (
    <View style={ws.wrap}>
        <Feather name="chevron-down" size={14} color={T.textHint} style={ws.chevron} />
        {/* @ts-ignore – web-only select */}
        <select
            value={value}
            onChange={(e: any) => onChange(e.target.value)}
            style={{
                width: "100%",
                height: "100%",
                border: "none",
                background: "transparent",
                fontSize: 13,
                color: value.startsWith("All") ? T.textHint : T.textH,
                outline: "none",
                fontFamily: "inherit",
                paddingLeft: 12,
                paddingRight: 32,
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none",
            } as any}
        >
            {options.map(o => (
                <option key={o} value={o}>{o}</option>
            ))}
        </select>
    </View>
);

const ws = StyleSheet.create({
    wrap: {
        flex: 1,
        height: 42,
        backgroundColor: T.card,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: T.border,
        position: "relative",
        justifyContent: "center",
        overflow: "hidden",
    },
    chevron: {
        position: "absolute",
        right: 12,
        top: "50%",
        marginTop: -7,
        zIndex: 0,
        pointerEvents: "none",
    } as any,
});

// ─── VIEW TOGGLE ─────────────────────────────────────────────────────────────
const ViewToggle: React.FC<{
    view: "grid" | "list";
    onToggle: (v: "grid" | "list") => void;
}> = ({ view, onToggle }) => (
    <View style={vt.wrap}>
        <TouchableOpacity
            style={[vt.btn, view === "grid" && vt.active]}
            onPress={() => onToggle("grid")}
        >
            <Feather name="grid" size={14} color={view === "grid" ? T.orange : T.textHint} />
        </TouchableOpacity>
        <TouchableOpacity
            style={[vt.btn, view === "list" && vt.active]}
            onPress={() => onToggle("list")}
        >
            <Feather name="list" size={14} color={view === "list" ? T.orange : T.textHint} />
        </TouchableOpacity>
    </View>
);

const vt = StyleSheet.create({
    wrap: {
        flexDirection: "row",
        backgroundColor: T.bg,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: T.border,
        padding: 3,
        gap: 2,
    },
    btn: {
        width: 30,
        height: 30,
        borderRadius: 7,
        alignItems: "center",
        justifyContent: "center",
    },
    active: {
        backgroundColor: T.card,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 1,
    },
});

// ─── LIST ROW CARD (list view) ────────────────────────────────────────────────
const JobRow: React.FC<{ job: Job }> = ({ job }) => {
    const statusStyle = STATUS_COLOR[job.status];
    const typeStyle = TYPE_COLOR[job.type];
    const deptIcon = getDeptIcon(job.department);

    return (
        <TouchableOpacity style={jr.row} activeOpacity={0.88}>
            <View style={[jr.colorBar, { backgroundColor: T.orange }]} />
            <View style={[jr.deptIcon, { backgroundColor: T.orangeLight }]}>
                <Feather name={deptIcon} size={16} color={T.orange} />
            </View>
            <View style={jr.content}>
                <View style={jr.titleRow}>
                    <Text style={jr.title} numberOfLines={1}>{job.title}</Text>
                    {job.urgent && (
                        <View style={jr.urgentBadge}>
                            <Feather name="zap" size={9} color={T.orange} />
                            <Text style={jr.urgentTxt}>Urgent</Text>
                        </View>
                    )}
                </View>
                <View style={jr.meta}>
                    <Text style={jr.metaTxt}>{job.department}</Text>
                    <View style={jr.dot} />
                    <Text style={jr.metaTxt}>{job.location}</Text>
                    <View style={jr.dot} />
                    <Text style={jr.metaTxt}>{job.positions} Position{job.positions !== 1 ? "s" : ""}</Text>
                </View>
            </View>
            <View style={jr.right}>
                <View style={[jr.statusPill, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[jr.statusTxt, { color: statusStyle.fg }]}>{job.status}</Text>
                </View>
                <View style={[jr.appsBadge, { backgroundColor: job.applications > 0 ? T.navy : T.bg }]}>
                    <Text style={[jr.appsTxt, { color: job.applications > 0 ? "#fff" : T.textHint }]}>
                        {job.applications} Apps
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const jr = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: T.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: T.border,
        overflow: "hidden",
        paddingRight: 12,
        gap: 12,
    },
    colorBar: { width: 4, height: "100%", alignSelf: "stretch" } as any,
    deptIcon: {
        width: 40,
        height: 40,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    content: { flex: 1, paddingVertical: 14 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
    title: { fontSize: 13, fontWeight: "700", color: T.textH, flex: 1, letterSpacing: -0.2 },
    urgentBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: T.orangeLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 20,
    },
    urgentTxt: { fontSize: 9, fontWeight: "700", color: T.orange },
    meta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    metaTxt: { fontSize: 11, color: T.textHint, fontWeight: "500" },
    dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: T.border },
    right: { alignItems: "flex-end", gap: 6, flexShrink: 0 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    statusTxt: { fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3 },
    appsBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
    appsTxt: { fontSize: 10, fontWeight: "700" },
});

// ─── EDIT JOB MODAL ──────────────────────────────────────────────────────────
const EditJobModal: React.FC<{
    visible: boolean;
    job: Job | null;
    departments: string[];
    onClose: () => void;
    onSave: (job: Job) => void;
}> = ({ visible, job, departments, onClose, onSave }) => {
    const isWeb = Platform.OS === 'web';
    const [statusOpen, setStatusOpen] = useState(false);
    const [deptOpen, setDeptOpen] = useState(false);
    const [empTypeOpen, setEmpTypeOpen] = useState(false);

    const [status, setStatus] = useState<string>(job?.status || "Active");
    const [title, setTitle] = useState(job?.title || "");
    const [department, setDepartment] = useState(job?.department || departments[0] || "");
    const [location, setLocation] = useState(job?.location || "");
    const [empType, setEmpType] = useState<JobType>(job?.type || "Full Time");

    const [description, setDescription] = useState(job?.description || "");
    const [requirements, setRequirements] = useState(job?.requirements || "");
    const [experience, setExperience] = useState(job?.experience || "");
    const [salaryRange, setSalaryRange] = useState(job?.salaryRange || "");
    const [vacancies, setVacancies] = useState(job?.positions?.toString() || "");

    useEffect(() => {
        if (visible) {
            setStatus(job?.status || "Active");
            setTitle(job?.title || "");
            setDepartment(job?.department || departments[0] || "");
            setLocation(job?.location || "");
            setEmpType(job?.type || "Full Time");
            setDescription(job?.description || "");
            setRequirements(job?.requirements || "");
            setExperience(job?.experience || "");
            setSalaryRange(job?.salaryRange || "");
            setVacancies(job?.positions?.toString() || "");
            setStatusOpen(false);
            setDeptOpen(false);
            setEmpTypeOpen(false);
        }
    }, [visible, job, departments]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={em.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <View style={[em.modal, isWeb && { maxWidth: 500, width: "100%" }]}>
                    <View style={em.header}>
                        <Text style={em.title}>{job ? "Edit Job Opening" : "Add New Job Opening"}</Text>
                        <TouchableOpacity onPress={onClose} style={em.closeBtn}>
                            <Feather name="x" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={em.body} contentContainerStyle={em.bodyContent} showsVerticalScrollIndicator={false}>
                        <View style={[em.row, deptOpen && { zIndex: 70, elevation: 70 }]}>
                            <View style={[em.field, deptOpen && { zIndex: 1100, elevation: 1100 }]}>
                                <Text style={em.label}>Department <Text style={{ color: T.red }}>*</Text></Text>
                                <TouchableOpacity
                                    style={[em.inputWrap, deptOpen && { borderColor: T.orange, borderWidth: 1.5 }]}
                                    onPress={() => setDeptOpen(!deptOpen)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={em.inputText}>{department || "Select Department"}</Text>
                                    <Feather name="chevron-down" size={14} color={T.textHint} />
                                </TouchableOpacity>
                                {deptOpen && (
                                    <View style={em.dropdown}>
                                        {departments.map((opt) => (
                                            <TouchableOpacity
                                                key={opt}
                                                style={em.dropItem}
                                                onPress={() => { setDepartment(opt); setDeptOpen(false); }}
                                            >
                                                <Text style={em.dropItemText}>{opt}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                            <View style={em.field}>
                                <Text style={em.label}>Job Title <Text style={{ color: T.red }}>*</Text></Text>
                                <View style={em.inputWrap}>
                                    <TextInput style={em.input} value={title} onChangeText={setTitle} placeholder="Job Title" placeholderTextColor={T.textHint} />
                                </View>
                            </View>
                        </View>

                        <View style={em.field}>
                            <Text style={em.label}>Description <Text style={{ color: T.red }}>*</Text></Text>
                            <View style={[em.inputWrap, { height: 80, alignItems: "flex-start", paddingTop: 10 }]}>
                                <TextInput style={[em.input, { height: "100%", textAlignVertical: "top" }]} multiline placeholder="Job Description" placeholderTextColor={T.textHint} value={description} onChangeText={setDescription} />
                                <Feather name="edit-2" size={12} color={T.textHint} style={{ position: "absolute", bottom: 8, right: 8 }} />
                            </View>
                        </View>

                        <View style={em.field}>
                            <Text style={em.label}>Requirements</Text>
                            <View style={[em.inputWrap, { height: 60, alignItems: "flex-start", paddingTop: 10 }]}>
                                <TextInput style={[em.input, { height: "100%", textAlignVertical: "top" }]} multiline placeholder="Requirements" placeholderTextColor={T.textHint} value={requirements} onChangeText={setRequirements} />
                                <Feather name="edit-2" size={12} color={T.textHint} style={{ position: "absolute", bottom: 8, right: 8 }} />
                            </View>
                        </View>

                        <View style={[em.row, empTypeOpen && { zIndex: 40, elevation: 40 }]}>
                            <View style={em.field}>
                                <Text style={em.label}>Location <Text style={{ color: T.red }}>*</Text></Text>
                                <View style={em.inputWrap}>
                                    <TextInput style={em.input} value={location} onChangeText={setLocation} placeholder="Location" placeholderTextColor={T.textHint} />
                                </View>
                            </View>
                            <View style={[em.field, empTypeOpen && { zIndex: 1100, elevation: 1100 }]}>
                                <Text style={em.label}>Employment Type <Text style={{ color: T.red }}>*</Text></Text>
                                <TouchableOpacity
                                    style={[em.inputWrap, empTypeOpen && { borderColor: T.orange, borderWidth: 1.5 }]}
                                    onPress={() => setEmpTypeOpen(!empTypeOpen)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={em.inputText}>{empType}</Text>
                                    <Feather name="chevron-down" size={14} color={T.textHint} />
                                </TouchableOpacity>
                                {empTypeOpen && (
                                    <View style={em.dropdown}>
                                        {["Full Time", "Part Time", "Contract", "Internship"].map((opt) => (
                                            <TouchableOpacity
                                                key={opt}
                                                style={em.dropItem}
                                                onPress={() => { setEmpType(opt as JobType); setEmpTypeOpen(false); }}
                                            >
                                                <Text style={em.dropItemText}>{opt}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={em.row3}>
                            <View style={em.field}>
                                <Text style={em.label}>Experience</Text>
                                <View style={em.inputWrap}>
                                    <TextInput style={em.input} value={experience} onChangeText={setExperience} placeholder="Yrs" placeholderTextColor={T.textHint} />
                                </View>
                            </View>
                            <View style={em.field}>
                                <Text style={em.label}>Salary Range</Text>
                                <View style={em.inputWrap}>
                                    <TextInput style={em.input} value={salaryRange} onChangeText={setSalaryRange} placeholder="Salary" placeholderTextColor={T.textHint} />
                                </View>
                            </View>
                            <View style={em.field}>
                                <Text style={em.label}>Vacancies <Text style={{ color: T.red }}>*</Text></Text>
                                <View style={em.inputWrap}>
                                    <TextInput style={em.input} value={vacancies} onChangeText={setVacancies} keyboardType="numeric" placeholderTextColor={T.textHint} />
                                </View>
                            </View>
                        </View>

                        <View style={[em.field, statusOpen && { zIndex: 20, elevation: 20 }]}>
                            <Text style={em.label}>Status <Text style={{ color: T.red }}>*</Text></Text>
                            <TouchableOpacity style={[em.inputWrap, statusOpen && { borderColor: T.orange, borderWidth: 1.5 }]} onPress={() => setStatusOpen(!statusOpen)} activeOpacity={0.8}>
                                <Text style={em.inputText}>{status}</Text>
                                <Feather name="chevron-down" size={14} color={T.textHint} />
                            </TouchableOpacity>
                            {statusOpen && (
                                <View style={em.dropdown}>
                                    {["Active", "Paused", "Closed"].map(opt => (
                                        <TouchableOpacity key={opt} style={em.dropItem} onPress={() => { setStatus(opt); setStatusOpen(false); }}>
                                            <Text style={em.dropItemText}>{opt}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={em.footer}>
                            <TouchableOpacity style={em.cancelBtn} onPress={onClose}>
                                <Text style={em.cancelBtnTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={em.saveBtn} onPress={() => {
                                const trimTitle = title.trim() || "New Job Opening";
                                const dept = department || departments[0] || "—";
                                const trimLoc = location.trim() || "—";
                                const trimDesc = description.trim();
                                const trimReq = requirements.trim();
                                const trimExp = experience.trim();
                                const trimSal = salaryRange.trim();
                                const parsedVac = parseInt(vacancies.trim(), 10) || 1;

                                if (job) {
                                    onSave({
                                        ...job,
                                        title: trimTitle,
                                        department: dept,
                                        location: trimLoc,
                                        type: empType,
                                        status: status as JobStatus,
                                        description: trimDesc,
                                        requirements: trimReq,
                                        experience: trimExp,
                                        salaryRange: trimSal,
                                        positions: parsedVac,
                                    });
                                } else {
                                    onSave({
                                        id: 0,
                                        title: trimTitle,
                                        department: dept,
                                        location: trimLoc,
                                        type: empType,
                                        positions: parsedVac,
                                        applications: 0,
                                        status: status as JobStatus,
                                        postedAt: "Just now",
                                        description: trimDesc,
                                        requirements: trimReq,
                                        experience: trimExp,
                                        salaryRange: trimSal,
                                    });
                                }
                            }}>
                                <Text style={em.saveBtnTxt}>{job ? "Save Changes" : "Save Job"}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const em = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(10,5,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modal: {
        backgroundColor: T.card,
        borderRadius: 16,
        width: "100%",
        maxHeight: "90%",
        flexShrink: 1,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    header: { marginHorizontal: 2, marginTop: 12, borderRadius: 22, 
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
        backgroundColor: T.navy,
    },
    title: {
        fontSize: 16,
        fontWeight: "800",
        color: "#fff",
        letterSpacing: -0.3,
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "rgba(255,255,255,0.1)",
        alignItems: "center",
        justifyContent: "center",
    },
    body: {
        padding: 20,
    },
    bodyContent: {
        gap: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    row: {
        flexDirection: Platform.OS === 'web' ? "row" : "column",
        gap: 16,
    },
    row3: {
        flexDirection: Platform.OS === 'web' ? "row" : "column",
        gap: 16,
    },
    field: {
        flex: 1,
        gap: 6,
    },
    label: {
        fontSize: 12,
        fontWeight: "600",
        color: T.textM,
    },
    inputWrap: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: T.border,
        borderRadius: 10,
        backgroundColor: T.card,
        paddingHorizontal: 12,
        height: 42,
    },
    input: {
        flex: 1,
        fontSize: 13,
        color: T.textH,
        height: "100%",
        outlineStyle: "none" as any,
    } as any,
    inputText: {
        flex: 1,
        fontSize: 13,
        color: T.textH,
    },
    dropdown: {
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: T.border,
        borderRadius: 8,
        marginTop: 4,
        zIndex: 9999,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    dropItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
    },
    dropItemText: {
        fontSize: 14,
        color: T.textH,
    },
    footer: {
        flexDirection: "row",
        gap: 12,
        marginTop: 10,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: T.bg,
        borderWidth: 1,
        borderColor: T.border,
        alignItems: "center",
    },
    cancelBtnTxt: {
        fontSize: 14,
        fontWeight: "700",
        color: T.textM,
    },
    saveBtn: {
        flex: 1,
        backgroundColor: T.orange,
        borderRadius: 10,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
    },
    saveBtnTxt: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
});

// ─── CONFIRM MODAL ───────────────────────────────────────────────────────────
const ConfirmModal: React.FC<{
    visible: boolean;
    job: Job | null;
    onCancel: () => void;
    onConfirm: () => void;
}> = ({ visible, job, onCancel, onConfirm }) => (
    <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onCancel}
    >
        <View style={cm.overlay}>
            <View style={cm.box}>
                <View style={cm.iconWrap}>
                    <Feather name="trash-2" size={26} color={T.red} />
                </View>
                <Text style={cm.title}>Delete Job Opening?</Text>
                <Text style={cm.msg}>
                    You're about to permanently remove{" "}
                    <Text style={{ fontWeight: "700", color: T.textH }}>{job?.title}</Text>.
                    {" "}This action cannot be undone.
                </Text>
                <View style={cm.divider} />
                <View style={cm.row}>
                    <TouchableOpacity style={cm.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
                        <Text style={cm.cancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={cm.deleteBtn} onPress={onConfirm} activeOpacity={0.8}>
                        <Feather name="trash-2" size={14} color="#fff" />
                        <Text style={cm.deleteTxt}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

const cm = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(10,5,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    box: {
        backgroundColor: T.card,
        borderRadius: 22,
        padding: 24,
        width: "100%",
        maxWidth: 380,
    },
    iconWrap: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: T.redBg,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: "800",
        color: T.textH,
        marginBottom: 10,
        letterSpacing: -0.4,
    },
    msg: {
        fontSize: 13,
        color: T.textM,
        lineHeight: 20,
    },
    divider: {
        height: 1,
        backgroundColor: T.border,
        marginVertical: 20,
    },
    row: {
        flexDirection: "row",
        gap: 10,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 11,
        backgroundColor: T.bg,
        borderWidth: 1,
        borderColor: T.border,
        alignItems: "center",
    },
    cancelTxt: {
        fontSize: 13,
        fontWeight: "700",
        color: T.textM,
    },
    deleteBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        paddingVertical: 12,
        borderRadius: 11,
        backgroundColor: T.red,
    },
    deleteTxt: {
        fontSize: 13,
        fontWeight: "800",
        color: "#fff",
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const JobOpeningsScreen: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [deptOptions, setDeptOptions] = useState<string[]>(DEFAULT_DEPARTMENTS);
    const [deptIdByName, setDeptIdByName] = useState<Record<string, number>>({});
    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("All Departments");
    const [statusFilter, setStatusFilter] = useState<"All Status" | JobStatus>("All Status");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 6;

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingJob, setEditingJob] = useState<Job | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string }>({ visible: false, title: "", message: "" });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isWeb = Platform.OS === "web";
    const departmentNames = deptOptions.filter((d) => d !== "All Departments");

    const filtered = jobs.filter(j => {
        const matchSearch =
            j.title.toLowerCase().includes(search.toLowerCase()) ||
            j.department.toLowerCase().includes(search.toLowerCase()) ||
            j.location.toLowerCase().includes(search.toLowerCase());
        const matchDept = deptFilter === "All Departments" || j.department === deptFilter;
        const matchStatus = statusFilter === "All Status" || j.status === statusFilter;
        return matchSearch && matchDept && matchStatus;
    });

    const loadJobs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [jobRows, deptRows] = await Promise.all([fetchJobs(), fetchDepartments()]);
            const names: Record<number, string> = {};
            const idByName: Record<string, number> = {};
            const deptList = ["All Departments"];
            deptRows.forEach((d) => {
                if (d.id && d.name) {
                    names[d.id] = d.name;
                    idByName[d.name] = d.id;
                    deptList.push(d.name);
                }
            });
            setDeptOptions(deptList);
            setDeptIdByName(idByName);
            setJobs(jobRows.map((j) => mapApiJob(j, names)));
        } catch (e) {
            setError(getApiErrorMessage(e, "Failed to load job openings."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadJobs();
    }, [loadJobs]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, deptFilter, statusFilter]);

    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

    const handleEdit = (job: Job) => {
        setEditingJob(job);
        setEditModalVisible(true);
    };

    const handleSave = async (updated: Job) => {
        try {
            const apiStatus =
                updated.status === "Paused" ? "paused" :
                    updated.status === "Closed" ? "closed" : "open";
            const payload = {
                title: updated.title,
                location: updated.location,
                employmentType: updated.type,
                status: apiStatus,
                departmentId: deptIdByName[updated.department],
                description: updated.description,
                requirements: updated.requirements,
                experienceRequired: updated.experience,
                salaryRange: updated.salaryRange,
                vacancies: updated.positions,
            };
            if (updated.id > 0 && jobs.find((j) => j.id === updated.id)) {
                await updateJob(updated.id, payload);
                setAlertConfig({ visible: true, title: "Updated!", message: "Job opening updated successfully." });
            } else {
                await createJob(payload);
                setAlertConfig({ visible: true, title: "Added!", message: "New job opening added successfully." });
            }
            await loadJobs();
            setEditModalVisible(false);
            setEditingJob(null);
        } catch (e) {
            setAlertConfig({ visible: true, title: "Error", message: getApiErrorMessage(e, "Failed to save job opening.") });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteJob(deleteTarget.id);
            await loadJobs();
            setAlertConfig({ visible: true, title: "Deleted!", message: "Job opening has been deleted." });
            setDeleteTarget(null);
        } catch (e) {
            setAlertConfig({ visible: true, title: "Error", message: getApiErrorMessage(e, "Failed to delete job opening.") });
        }
    };

    const totalJobs = jobs.length;
    const activeCount = jobs.filter(j => j.status === "Active").length;
    const totalApps = jobs.reduce((s, j) => s + j.applications, 0);
    const urgentCount = jobs.filter(j => j.urgent).length;

    const Container = isWeb ? View : SafeAreaView;

    const MainContent = (
        <Container style={s.safe}>
            {WebStyles}
            <StatusBar barStyle="light-content" backgroundColor="#151D4F" />


            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[s.scroll, !isWeb && { paddingTop: 0, paddingHorizontal: 12 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── PAGE HEADER ── */}
                <View style={[s.pageHead, !isWeb && { flexDirection: 'column', alignItems: 'stretch', padding: 16 }]}>
                    {!isWeb ? (
                        <>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.pageTitle, { fontSize: 20 }]}>Open Positions</Text>
                                    <Text style={s.pageSub}>Manage and track all active job listings</Text>
                                </View>
                                <TouchableOpacity style={[s.addBtn, { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }]} onPress={() => { setEditingJob(null); setEditModalVisible(true); }} activeOpacity={0.85}>
                                    <Feather name="plus" size={14} color="#fff" />
                                    <Text style={[s.addBtnTxt, { fontSize: 12 }]}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={s.pageHeadLeft}>

                                <Text style={s.pageTitle}>Open Positions</Text>
                                <Text style={s.pageSub}>Manage and track all active job listings</Text>
                            </View>
                            <TouchableOpacity style={s.addBtn} onPress={() => { setEditingJob(null); setEditModalVisible(true); }} activeOpacity={0.85}>
                                <Feather name="plus" size={15} color="#fff" />
                                <Text style={s.addBtnTxt}>Add New Job</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* ── STATS ── */}
                <View style={[s.statsRow, !isWeb && s.statsRowMobile]}>
                    <View style={!isWeb ? { width: "48%" as any } : { flex: 1 }}>
                        <StatPill
                            icon="briefcase"
                            value={totalJobs}
                            label="Total Jobs"
                            iconBg={T.orangeLight}
                            iconFg={T.orange}
                        />
                    </View>
                    <View style={!isWeb ? { width: "48%" as any } : { flex: 1 }}>
                        <StatPill
                            icon="check-circle"
                            value={activeCount}
                            label="Active"
                            iconBg={T.greenBg}
                            iconFg={T.green}
                        />
                    </View>
                    <View style={!isWeb ? { width: "48%" as any } : { flex: 1 }}>
                        <StatPill
                            icon="file-text"
                            value={totalApps}
                            label="Applications"
                            iconBg={T.navyLight}
                            iconFg={T.navy}
                        />
                    </View>
                    <View style={!isWeb ? { width: "48%" as any } : { flex: 1 }}>
                        <StatPill
                            icon="zap"
                            value={urgentCount}
                            label="Urgent"
                            iconBg={T.redBg}
                            iconFg={T.red}
                        />
                    </View>
                </View>

                {/* ── SEARCH + FILTERS ── */}
                <View style={s.searchRow}>
                    <View style={s.searchBox}>
                        <Feather name="search" size={15} color="#000000" />
                        <TextInput
                            style={[s.searchInput, { color: "#000000" }]}
                            placeholder="Search jobs, departments, locations…"
                            placeholderTextColor="#000000"
                            value={search}
                            onChangeText={setSearch}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch("")}>
                                <Feather name="x-circle" size={15} color="#000000" />
                            </TouchableOpacity>
                        )}
                    </View>
                    {!isWeb && (
                        <View style={s.viewToggleInline}>
                            <TouchableOpacity
                                style={[s.viewToggleBtn, viewMode === "grid" && s.viewToggleBtnActive]}
                                onPress={() => setViewMode("grid")}
                                activeOpacity={0.8}
                            >
                                <Feather name="grid" size={15} color={viewMode === "grid" ? T.orange : T.textHint} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.viewToggleBtn, viewMode === "list" && s.viewToggleBtnActive]}
                                onPress={() => setViewMode("list")}
                                activeOpacity={0.8}
                            >
                                <Feather name="list" size={15} color={viewMode === "list" ? T.orange : T.textHint} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={s.filterRow}>
                    {/* Department filter */}
                    {isWeb ? (
                        <WebSelect
                            value={deptFilter}
                            options={deptOptions}
                            onChange={setDeptFilter}
                        />
                    ) : (
                        <TouchableOpacity
                            style={s.filterSelect}
                            onPress={() => setDeptDropdownOpen(true)}
                        >
                            <Feather name="grid" size={13} color={T.textHint} />
                            <Text style={[s.filterSelectTxt, deptFilter !== "All Departments" && { color: T.orange }]} numberOfLines={1}>
                                {deptFilter}
                            </Text>
                            <Feather name="chevron-down" size={13} color={T.textHint} />
                        </TouchableOpacity>
                    )}

                    {/* Status filter */}
                    {isWeb ? (
                        <WebSelect
                            value={statusFilter}
                            options={STATUSES}
                            onChange={(v) => setStatusFilter(v as any)}
                        />
                    ) : (
                        <TouchableOpacity
                            style={s.filterSelect}
                            onPress={() => setStatusDropdownOpen(true)}
                        >
                            <Feather name="activity" size={13} color={T.textHint} />
                            <Text style={[s.filterSelectTxt, statusFilter !== "All Status" && { color: T.orange }]} numberOfLines={1}>
                                {statusFilter}
                            </Text>
                            <Feather name="chevron-down" size={13} color={T.textHint} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={s.filterBtn}>
                        <Feather name="sliders" size={14} color={T.orange} />
                        <Text style={s.filterBtnTxt}>Filter</Text>
                    </TouchableOpacity>

                    {isWeb && <ViewToggle view={viewMode} onToggle={setViewMode} />}
                </View>

                {/* ── COUNT LINE ── */}
                <Text style={s.countLine}>
                    <Text style={{ color: T.orange, fontWeight: "700" }}>{filtered.length}</Text>
                    {" "}of {jobs.length} positions
                </Text>

                {/* ── JOB CARDS ── */}
                {loading ? (
                    <View style={s.empty}>
                        <Text style={s.emptyTitle}>Loading job openings…</Text>
                    </View>
                ) : error ? (
                    <View style={s.empty}>
                        <Text style={s.emptyTitle}>{error}</Text>
                        <TouchableOpacity style={s.addBtn} onPress={loadJobs}>
                            <Text style={s.addBtnTxt}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : filtered.length === 0 ? (
                    <View style={s.empty}>
                        <View style={s.emptyIcon}>
                            <Feather name="inbox" size={30} color={T.textHint} />
                        </View>
                        <Text style={s.emptyTitle}>No jobs found</Text>
                        <Text style={s.emptySub}>Try adjusting your search or filters</Text>
                    </View>
                ) : viewMode === "grid" ? (
                    <View style={isWeb
                        ? { flexDirection: "row", flexWrap: "wrap", gap: 16 }
                        : { flexDirection: "row", flexWrap: "wrap", gap: 12 }
                    }>
                        {paginated.map(job => (
                            <View
                                key={job.id}
                                style={isWeb ? { width: "calc(33.33% - 11px)" as any } : { width: "48%" as any }}
                            >
                                <JobCard job={job} onEdit={handleEdit} onDelete={() => setDeleteTarget(job)} />
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={{ gap: 8 }}>
                        {paginated.map(job => (
                            <JobRow key={job.id} job={job} />
                        ))}
                    </View>
                )}

                {/* ── PAGINATION CONTROLS ── */}
                {filtered.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filtered.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        itemName="job openings"
                        onPageChange={setCurrentPage}
                    />
                )}
            </ScrollView>

            {/* ── MOBILE DROPDOWNS ── */}
            {!isWeb && (
                <>
                    <DropdownModal
                        visible={deptDropdownOpen}
                        options={deptOptions}
                        selected={deptFilter}
                        onSelect={setDeptFilter}
                        onClose={() => setDeptDropdownOpen(false)}
                        title="Select Department"
                    />
                    <DropdownModal
                        visible={statusDropdownOpen}
                        options={STATUSES}
                        selected={statusFilter}
                        onSelect={(v) => setStatusFilter(v as any)}
                        onClose={() => setStatusDropdownOpen(false)}
                        title="Select Status"
                    />
                </>
            )}

            {/* ── EDIT MODAL ── */}
            <EditJobModal
                visible={editModalVisible}
                job={editingJob}
                departments={departmentNames}
                onClose={() => setEditModalVisible(false)}
                onSave={handleSave}
            />

            {/* ── CONFIRM MODAL ── */}
            <ConfirmModal
                visible={!!deleteTarget}
                job={deleteTarget}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            />

            {/* ── SWEET ALERT ── */}
            <Modal transparent animationType="fade" visible={alertConfig.visible} onRequestClose={() => setAlertConfig({ ...alertConfig, visible: false })}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 360, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                            <Feather name="check" size={32} color="#10b981" />
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#1f2937', marginBottom: 8, textAlign: 'center' }}>{alertConfig.title}</Text>
                        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>{alertConfig.message}</Text>
                        <TouchableOpacity style={{ backgroundColor: T.orange, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8, width: '100%', alignItems: 'center' }} onPress={() => setAlertConfig({ ...alertConfig, visible: false })}>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </Container>
    );

    return <AdminLayout>{MainContent}</AdminLayout>;
};

export default JobOpeningsScreen;

// ─── MAIN STYLES ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    safe: {
        flex: 1,
        height: "100%",
        backgroundColor: T.bg,
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    },

    // TopBar
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: T.card,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: T.border,
    },
    crumb: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    crumbItem: {
        fontSize: 12,
        color: T.textHint,
        fontWeight: "400",
    },
    topBarRight: {
        flexDirection: "row",
        gap: 8,
    },
    iconBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.card,
        alignItems: "center",
        justifyContent: "center",
    },

    // Scroll
    scroll: {
        paddingTop: 10,
        paddingHorizontal: 16,
        paddingBottom: 48,
        gap: 14,
    },

    // Page Header
    pageHead: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        backgroundColor: "#151D4F", // deep navy
        padding: 24,
        paddingBottom: 48,
        borderRadius: 22,
        marginHorizontal: 2,
        marginTop: 12,
    },
    pageHeadLeft: { flex: 1 },
    pageTag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "rgba(239, 123, 26, 0.15)",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginBottom: 8,
    },
    pageTagTxt: {
        fontSize: 11,
        fontWeight: "700",
        color: T.orange,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    pageTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: -0.5,
        lineHeight: 26,
    },
    pageSub: {
        fontSize: 12,
        color: "#D1D5DB",
        marginTop: 4,
        fontWeight: "400",
    },
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        backgroundColor: T.orange,
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: 11,
        flexShrink: 0,
    },
    addBtnTxt: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "800",
        letterSpacing: -0.2,
    },

    // Stats
    statsRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: -42,
        zIndex: 10,
        maxWidth: 900,
        alignSelf: "center",
        width: "100%",
    },
    statsRowMobile: {
        flexWrap: "wrap" as any,
    },

    // Inline view toggle (mobile, next to search bar)
    viewToggleInline: {
        flexDirection: "row",
        backgroundColor: T.card,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: T.border,
        overflow: "hidden",
    },
    viewToggleBtn: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    viewToggleBtnActive: {
        backgroundColor: T.orangeLight,
    },

    // Search + filters
    searchRow: {
        flexDirection: "row",
        gap: 10,
    },
    searchBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        backgroundColor: T.card,
        borderRadius: 11,
        paddingHorizontal: 13,
        paddingVertical: 11,
        borderWidth: 1.5,
        borderColor: T.border,
    },
    searchInput: {
        flex: 
        1,
        fontSize: 13,
        color: T.textH,
        borderWidth: 0,
        outline: "none" as any,
        outlineStyle: "none" as any,
        outlineWidth: 0 as any,
    } as any,
    filterRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
    },
    filterSelect: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        backgroundColor: T.card,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: T.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minWidth: 120,
    },
    filterSelectTxt: {
        flex: 1,
        fontSize: 13,
        color: T.textHint,
        fontWeight: "500",
    },
    filterBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: T.orangeLight,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: T.orangeMid,
    },
    filterBtnTxt: {
        fontSize: 12,
        fontWeight: "700",
        color: T.orange,
    },

    // Count line
    countLine: {
        fontSize: 12,
        color: T.textHint,
        fontWeight: "400",
    },

    // Empty
    empty: {
        alignItems: "center",
        paddingVertical: 56,
        gap: 8,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: T.card,
        borderWidth: 1,
        borderColor: T.border,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: T.textM,
    },
    emptySub: {
        fontSize: 12,
        color: T.textHint,
    },

    // Pagination
    paginationWrap: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        marginTop: 24,
    },
    pageBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: T.card,
        borderWidth: 1,
        borderColor: T.border,
        alignItems: "center",
        justifyContent: "center",
    },
    pageNumbers: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    pageNumBtn: {
        minWidth: 32,
        height: 32,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: T.card,
        borderWidth: 1,
        borderColor: T.border,
        alignItems: "center",
        justifyContent: "center",
    },
    pageNumBtnActive: {
        backgroundColor: T.orange,
        borderColor: T.orange,
    },
    pageNumTxt: {
        fontSize: 13,
        fontWeight: "600",
        color: T.textM,
    },
    pageNumTxtActive: {
        color: "#fff",
    },
});