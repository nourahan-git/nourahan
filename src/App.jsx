import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from "react";
import { storage } from "./supabaseClient.js";
import {
  LayoutGrid, Mail, Users2, Receipt, Plane, Megaphone,
  HeartHandshake, Baby, BookOpen, GraduationCap, ShieldCheck,
  Plus, Trash2, Pencil, X, Check, Lock, Unlock, Loader2, KeyRound,
  FileDown, Printer, Bell, CalendarClock, Settings, Eye,
  Truck, Paperclip, History, Download, Mic, Square, Sparkles, Palette,
  Phone, ClipboardList, Search, Clock, FileText, UserCheck, ListTodo, BarChart3, Calendar
} from "lucide-react";

/* =================================================================
   بنك إنجازات نورهان — لوحة عمليات اللجنة النسائية
================================================================= */

const THEMES = {
  emerald: { name: "أخضر زمردي", sidebar: "#0F332E", sidebarHover: "#164A42", primary: "#1F6F54", primaryDark: "#154F3B", gold: "#C9A227", goldLight: "#E9D9A0" },
  blue:    { name: "أزرق ملكي",   sidebar: "#0E2A4A", sidebarHover: "#163C63", primary: "#1D4E89", primaryDark: "#143968", gold: "#C9A227", goldLight: "#E9D9A0" },
  maroon:  { name: "عنابي",       sidebar: "#3A0F17", sidebarHover: "#511620", primary: "#8A2432", primaryDark: "#651A25", gold: "#C9A227", goldLight: "#E9D9A0" },
  purple:  { name: "بنفسجي",      sidebar: "#241636", sidebarHover: "#33204C", primary: "#5B3A8E", primaryDark: "#422969", gold: "#C9A227", goldLight: "#E9D9A0" },
};
const BASE = { bg: "#FAF7F0", text: "#1C2A27", textMuted: "#5B6B66", danger: "#A6432E", border: "#E4DCC9", cardBg: "#FFFFFF" };
const ThemeContext = createContext({ ...THEMES.emerald, ...BASE });
const useColors = () => useContext(ThemeContext);

const DEFAULT_CODES = { full: "1111", viewer: "1999" };
const MAX_ATTACH_MB = 3;
const ICONS = { Mail, Users2, Receipt, Plane, Megaphone, HeartHandshake, Baby, BookOpen, GraduationCap, ShieldCheck, Truck, Sparkles, Phone, ClipboardList };

const BUILTIN_SECTIONS = [
  { id: "correspondence", label: "المراسلات", icon: "Mail", dateField: "date", primaryField: "subject",
    fields: [ { key: "date", label: "التاريخ", type: "date" }, { key: "type", label: "نوع الخطاب", type: "text" }, { key: "subject", label: "الموضوع", type: "text" }, { key: "status", label: "الحالة", type: "select", options: ["مرسل", "تحت المراجعة", "معتمد", "مرفوض"] }, { key: "notes", label: "ملاحظات", type: "textarea" } ] },
  { id: "meetings", label: "الاجتماعات ومحاضرها", icon: "Users2", dateField: "date", primaryField: "attendees",
    fields: [ { key: "date", label: "التاريخ", type: "date" }, { key: "attendees", label: "الحاضرون", type: "text" }, { key: "decisions", label: "القرارات", type: "textarea" }, { key: "status", label: "حالة التنفيذ", type: "select", options: ["منجز", "قيد التنفيذ"] } ] },
  { id: "purchases", label: "العهد والمشتريات", icon: "Receipt", dateField: "date", primaryField: "item",
    fields: [ { key: "date", label: "التاريخ", type: "date" }, { key: "invoiceNo", label: "رقم الفاتورة", type: "text" }, { key: "store", label: "المتجر", type: "text" }, { key: "item", label: "البيان", type: "text" }, { key: "mosque", label: "المسجد", type: "text" }, { key: "amount", label: "المبلغ (د.ك)", type: "number" } ], sumField: "amount" },
  { id: "events", label: "الفعاليات والرحلات", icon: "Plane", dateField: "date", primaryField: "name",
    fields: [ { key: "date", label: "التاريخ", type: "date" }, { key: "name", label: "اسم الفعالية", type: "text" }, { key: "registered", label: "عدد المسجلين", type: "number" }, { key: "budget", label: "الميزانية (د.ك)", type: "number" }, { key: "actualSpend", label: "المصروف الفعلي (د.ك)", type: "number" }, { key: "status", label: "الحالة", type: "select", options: ["قادمة", "منتهية"] } ], sumField: "budget",
    computed: [ { label: "الفرق (الميزانية − الفعلي)", fn: (r) => (parseFloat(r.budget || 0) - parseFloat(r.actualSpend || 0)).toFixed(3) } ] },
  { id: "logistics", label: "التوصيل والمناديب", icon: "Truck", dateField: "date", primaryField: "repName",
    fields: [ { key: "date", label: "التاريخ", type: "date" }, { key: "requestType", label: "نوع الطلب", type: "select", options: ["نقل أغراض", "حجز باص لرحلة", "توصيل مستندات", "أخرى"] }, { key: "repName", label: "اسم المندوب", type: "text" }, { key: "from", label: "من", type: "text" }, { key: "to", label: "إلى", type: "text" }, { key: "status", label: "الحالة", type: "select", options: ["قيد التنفيذ", "تم التنفيذ"] }, { key: "notes", label: "ملاحظات", type: "textarea" } ] },
  { id: "content", label: "المحتوى والإعلانات", icon: "Megaphone", dateField: "date", primaryField: "description",
    fields: [ { key: "date", label: "التاريخ", type: "date" }, { key: "type", label: "نوع المحتوى", type: "text" }, { key: "description", label: "الوصف", type: "text" }, { key: "designer", label: "المصمم", type: "text" }, { key: "status", label: "الحالة", type: "select", options: ["منشور", "قيد التصميم"] } ] },
  { id: "donations", label: "التبرعات", icon: "HeartHandshake", locked: true, dateField: "date", primaryField: "donor",
    fields: [ { key: "date", label: "التاريخ", type: "date" }, { key: "donor", label: "اسم المتبرعة", type: "text" }, { key: "amount", label: "المبلغ (د.ك)", type: "number" }, { key: "purpose", label: "الغرض", type: "text" }, { key: "thanked", label: "تم الشكر", type: "select", options: ["نعم", "لا"] } ], sumField: "amount" },
  { id: "sponsorships", label: "الكفالات (الأيتام)", icon: "Baby", locked: true, dateField: "dueDate", primaryField: "orphan",
    fields: [ { key: "orphan", label: "اسم اليتيم", type: "text" }, { key: "sponsor", label: "الكافل", type: "text" }, { key: "amount", label: "قيمة الكفالة (د.ك)", type: "number" }, { key: "startDate", label: "تاريخ البداية", type: "date" }, { key: "dueDate", label: "تاريخ الاستحقاق", type: "date" } ], sumField: "amount" },
  { id: "circles", label: "الحلقات", icon: "BookOpen", primaryField: "name",
    fields: [ { key: "name", label: "اسم الحلقة / المسجد", type: "text" }, { key: "students", label: "عدد الدارسات", type: "number" }, { key: "teachers", label: "عدد المعلمات", type: "number" }, { key: "level", label: "مستوى الإنجاز", type: "text" } ] },
  { id: "teachers", label: "إدارة المعلمات", icon: "GraduationCap", primaryField: "name",
    fields: [ { key: "name", label: "الاسم", type: "text" }, { key: "kind", label: "النوع", type: "select", options: ["أساسية", "متطوعة"] }, { key: "mosque", label: "الحلقة / المسجد", type: "text" }, { key: "reward", label: "المكافأة (د.ك)", type: "number" }, { key: "status", label: "حالة المكافأة", type: "select", options: ["مصروفة", "مستحقة"] } ], sumField: "reward" },
  { id: "licenses", label: "التراخيص والتصاريح", icon: "ShieldCheck", dateField: "expiryDate", primaryField: "name",
    fields: [ { key: "name", label: "اسم المحفظة / الداعية", type: "text" }, { key: "type", label: "نوع الترخيص", type: "text" }, { key: "issueDate", label: "تاريخ الإصدار", type: "date" }, { key: "expiryDate", label: "تاريخ الانتهاء", type: "date" }, { key: "status", label: "الحالة", type: "select", options: ["سارٍ", "يحتاج تجديد", "منتهي"] } ] },
  { id: "contacts", label: "دفتر جهات الاتصال", icon: "Phone", primaryField: "name",
    fields: [ { key: "name", label: "الاسم", type: "text" }, { key: "kind", label: "النوع", type: "select", options: ["مندوب", "مصمم", "مورد", "مشرفة", "أخرى"] }, { key: "phone", label: "رقم الهاتف", type: "text" }, { key: "notes", label: "ملاحظات", type: "textarea" } ] },
  { id: "requirements", label: "طلبات المتطلبات", icon: "ClipboardList", dateField: "date", primaryField: "description",
    fields: [ { key: "date", label: "التاريخ", type: "date" }, { key: "description", label: "الوصف", type: "text" }, { key: "justification", label: "المبرر", type: "textarea" }, { key: "beneficiary", label: "الجهة المستفيدة", type: "text" }, { key: "priority", label: "الأولوية", type: "select", options: ["عالية", "متوسطة", "منخفضة"] }, { key: "status", label: "الحالة", type: "select", options: ["مقترح", "معتمد", "مرفوض"] } ] },
  { id: "attendance", label: "سجل الحضور والساعات", icon: "Clock", dateField: "date", primaryField: "linkedTask", isAttendance: true,
    fields: [ { key: "date", label: "التاريخ", type: "date" }, { key: "timeIn", label: "وقت الحضور", type: "time" }, { key: "timeOut", label: "وقت الانصراف", type: "time" }, { key: "overtimeHours", label: "ساعات إضافية", type: "number" }, { key: "overtimeReason", label: "سبب الساعات الإضافية", type: "text" }, { key: "linkedTask", label: "المهمة المرتبطة", type: "text" } ],
    computed: [ { label: "ساعات العمل", fn: (r) => {
      if (!r.timeIn || !r.timeOut) return "—";
      const [h1, m1] = r.timeIn.split(":").map(Number); const [h2, m2] = r.timeOut.split(":").map(Number);
      let mins = (h2 * 60 + m2) - (h1 * 60 + m1); if (mins < 0) mins += 24 * 60;
      return (mins / 60).toFixed(2);
    } } ] },
];

const emptyRecord = (fields) => Object.fromEntries(fields.map((f) => [f.key, ""]));
const genId = () => Date.now().toString() + Math.random().toString(36).slice(2, 7);
const todayStr = () => new Date().toISOString().slice(0, 10);
const nowHHMM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

function computeHours(row) {
  if (!row.timeIn || !row.timeOut) return 0;
  const [h1, m1] = row.timeIn.split(":").map(Number); const [h2, m2] = row.timeOut.split(":").map(Number);
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1); if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

/* ---------------- سجل الأنشطة / سجل دخول المديرة ---------------- */

async function logActivity(sectionLabel, action, summary) {
  try {
    const res = await storage.get("app:activitylog");
    const log = res ? JSON.parse(res.value) : [];
    log.unshift({ id: genId(), time: new Date().toISOString(), section: sectionLabel, action, summary: summary || "" });
    await storage.set("app:activitylog", JSON.stringify(log.slice(0, 500)));
  } catch {}
}
async function logManagerVisit() {
  try {
    const res = await storage.get("app:managerlog");
    const log = res ? JSON.parse(res.value) : [];
    log.unshift({ id: genId(), time: new Date().toISOString() });
    await storage.set("app:managerlog", JSON.stringify(log.slice(0, 200)));
  } catch {}
}

/* ---------------- تخزين الأقسام ---------------- */

function useSectionData(sectionId) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const storageKey = `section:${sectionId}`;
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const res = await storage.get(storageKey); setRows(res ? JSON.parse(res.value) : []); }
    catch { setRows([]); } finally { setLoading(false); }
  }, [storageKey]);
  useEffect(() => { load(); }, [load]);
  const save = async (newRows) => {
    setRows(newRows);
    try { const res = await storage.set(storageKey, JSON.stringify(newRows)); if (!res) setError("تعذّر الحفظ."); }
    catch { setError("تعذّر الحفظ."); }
  };
  return { rows, loading, error, save, reload: load };
}
async function loadAllSections(sections) {
  const entries = await Promise.all(sections.map(async (s) => {
    try { const res = await storage.get(`section:${s.id}`); return [s.id, res ? JSON.parse(res.value) : []]; }
    catch { return [s.id, []]; }
  }));
  return Object.fromEntries(entries);
}

/* ---------------- مرفقات ---------------- */

function fileToBase64(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); }); }
function base64ToBlob(dataUrl) { const [meta, b64] = dataUrl.split(","); const mime = meta.match(/:(.*?);/)[1]; const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type: mime }); }
async function saveAttachment(sectionId, recordId, file) { const dataUrl = await fileToBase64(file); await storage.set(`attachment:${sectionId}:${recordId}`, JSON.stringify({ name: file.name, type: file.type, data: dataUrl })); }
async function openAttachment(sectionId, recordId) {
  const res = await storage.get(`attachment:${sectionId}:${recordId}`);
  if (!res) return alert("تعذّر العثور على المرفق.");
  const { data, name } = JSON.parse(res.value);
  const blob = base64ToBlob(data); const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function deleteAttachment(sectionId, recordId) { try { await storage.delete(`attachment:${sectionId}:${recordId}`); } catch {} }

function AttachmentField({ sectionId, recordId, currentName, onChange }) {
  const colors = useColors();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const inputRef = useRef(null);
  const handleFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > MAX_ATTACH_MB * 1024 * 1024) { setErr(`الملف كبير، الحد الأقصى ${MAX_ATTACH_MB} ميغابايت.`); return; }
    setErr(""); setBusy(true);
    try { await saveAttachment(sectionId, recordId, file); onChange(file.name); } catch { setErr("تعذّر رفع الملف."); } finally { setBusy(false); }
  };
  return (
    <div>
      <button type="button" onClick={() => inputRef.current.click()} disabled={busy} style={{ ...btnGhost(colors), padding: "6px 10px", fontSize: 12.5 }}>
        {busy ? <Loader2 size={13} className="spin" /> : <Paperclip size={13} />} {currentName ? "تغيير المرفق" : "رفع صورة / PDF"}
      </button>
      <input ref={inputRef} type="file" accept="image/*,application/pdf,audio/*" onChange={handleFile} style={{ display: "none" }} />
      {currentName && <div style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 4 }}>📎 {currentName}</div>}
      {err && <div style={{ fontSize: 11, color: colors.danger, marginTop: 4 }}>{err}</div>}
    </div>
  );
}

/* ---------------- شاشة الدخول ---------------- */

function LockScreen({ onUnlock }) {
  const colors = useColors();
  const [code, setCode] = useState(""); const [err, setErr] = useState(""); const [checking, setChecking] = useState(false);
  const submit = async () => {
    setChecking(true); setErr("");
    let codes = DEFAULT_CODES;
    try { const res = await storage.get("app:pincodes"); if (res) codes = JSON.parse(res.value); } catch {}
    if (code === codes.full) onUnlock("full");
    else if (code === codes.viewer) { await logManagerVisit(); onUnlock("viewer"); }
    else setErr("الرمز غير صحيح، حاولي مرة أخرى.");
    setChecking(false);
  };
  return (
    <div dir="rtl" style={{ height: "100%", minHeight: 640, display: "flex", alignItems: "center", justifyContent: "center", background: colors.sidebar, fontFamily: "Tahoma, Arial, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "34px 30px", width: 300, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: colors.goldLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><KeyRound size={24} color="#7A5A0A" /></div>
        <div style={{ fontWeight: 700, fontSize: 16, color: colors.text, marginBottom: 4 }}>بنك إنجازات نورهان</div>
        <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 18 }}>اللجنة النسائية — أدخلي رمز الدخول</div>
        <input type="password" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••"
          style={{ width: "100%", textAlign: "center", fontSize: 22, letterSpacing: 6, padding: "10px 0", borderRadius: 10, border: `1px solid ${colors.border}`, marginBottom: 12, outline: "none" }} />
        {err && <div style={{ color: colors.danger, fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
        <button onClick={submit} disabled={checking} style={{ ...btnPrimary(colors), width: "100%", justifyContent: "center" }}>{checking ? <Loader2 size={16} className="spin" /> : "دخول"}</button>
      </div>
    </div>
  );
}

/* ---------------- عناصر عامة ---------------- */

function FieldInput({ field, value, onChange }) {
  const colors = useColors();
  const base = { width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 14, color: colors.text, background: "#fff", outline: "none" };
  if (field.type === "select") return <select style={base} value={value} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{field.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>;
  if (field.type === "textarea") return <textarea style={{ ...base, minHeight: 60, resize: "vertical" }} value={value} onChange={(e) => onChange(e.target.value)} />;
  const htmlType = field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "time" ? "time" : "text";
  return <input style={base} type={htmlType} value={value} onChange={(e) => onChange(e.target.value)} step={field.type === "number" ? "0.001" : undefined} />;
}

function exportCSV(section, rows) {
  const headers = section.fields.map((f) => f.label);
  const lines = [headers.join(",")];
  rows.forEach((r) => lines.push(section.fields.map((f) => `"${(r[f.key] ?? "").toString().replace(/"/g, '""')}"`).join(",")));
  const csv = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${section.label}.csv`; a.click(); URL.revokeObjectURL(url);
}

function btnPrimary(c) { return { display: "flex", alignItems: "center", gap: 6, background: c.primary, color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }; }
function btnGhost(c) { return { display: "flex", alignItems: "center", gap: 6, background: "#fff", color: c.text, border: `1px solid ${c.border}`, borderRadius: 10, padding: "9px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }; }
function th(c) { return { textAlign: "right", padding: "10px 12px", fontWeight: 600, color: c.textMuted, fontSize: 12.5 }; }
function td(c) { return { textAlign: "right", padding: "9px 12px", verticalAlign: "top", color: c.text }; }

function SectionView({ section, role }) {
  const colors = useColors();
  const canEdit = role === "full";
  const { rows, loading, error, save } = useSectionData(section.id);
  const [draft, setDraft] = useState(null);
  const [draftId, setDraftId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const startAdd = () => { setDraftId(genId()); setDraft(emptyRecord(section.fields)); };
  const cancelAdd = () => { setDraft(null); setDraftId(null); };
  const confirmAdd = async () => {
    const rec = { ...draft, id: draftId, approved: false };
    await save([rec, ...rows]);
    logActivity(section.label, "إضافة", draft[section.primaryField] || "سجل جديد");
    setDraft(null); setDraftId(null);
  };
  const startEdit = (row) => { setEditingId(row.id); setEditDraft({ ...row }); };
  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };
  const confirmEdit = async () => {
    await save(rows.map((r) => (r.id === editingId ? editDraft : r)));
    logActivity(section.label, "تعديل", editDraft[section.primaryField] || "سجل");
    cancelEdit();
  };
  const removeRow = async (row) => {
    await save(rows.filter((r) => r.id !== row.id));
    logActivity(section.label, "حذف", row[section.primaryField] || "سجل");
    deleteAttachment(section.id, row.id);
  };
  const toggleApproved = async (row) => {
    await save(rows.map((r) => (r.id === row.id ? { ...r, approved: !r.approved } : r)));
  };

  const quickClockIn = async () => {
    const today = todayStr();
    const existing = rows.find((r) => r.date === today);
    if (existing) { await save(rows.map((r) => (r.id === existing.id ? { ...r, timeIn: nowHHMM() } : r))); }
    else { const rec = { ...emptyRecord(section.fields), id: genId(), date: today, timeIn: nowHHMM(), approved: false }; await save([rec, ...rows]); }
    logActivity(section.label, "تسجيل حضور", today);
  };
  const quickClockOut = async () => {
    const today = todayStr();
    const existing = rows.find((r) => r.date === today);
    if (existing) { await save(rows.map((r) => (r.id === existing.id ? { ...r, timeOut: nowHHMM() } : r))); logActivity(section.label, "تسجيل انصراف", today); }
    else { const rec = { ...emptyRecord(section.fields), id: genId(), date: today, timeOut: nowHHMM(), approved: false }; await save([rec, ...rows]); logActivity(section.label, "تسجيل انصراف", today); }
  };

  const total = section.sumField ? rows.reduce((acc, r) => acc + (parseFloat(r[section.sumField]) || 0), 0) : null;
  const Icon = ICONS[section.icon] || Sparkles;
  const extraCols = 1 + (canEdit ? 1 : 0); // مرفق + (تعديل/حذف)

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon size={22} color={colors.primary} />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text }}>{section.label}</h2>
          {section.locked && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, background: colors.goldLight, color: "#7A5A0A", padding: "3px 9px", borderRadius: 20 }}><Lock size={12} /> خاص</span>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {section.isAttendance && canEdit && (
            <>
              <button onClick={quickClockIn} style={btnPrimary(colors)}><Clock size={15} /> تسجيل حضور الآن</button>
              <button onClick={quickClockOut} style={{ ...btnPrimary(colors), background: colors.gold }}><Clock size={15} /> تسجيل انصراف الآن</button>
            </>
          )}
          <button onClick={() => exportCSV(section, rows)} style={btnGhost(colors)}><FileDown size={15} /> تصدير CSV</button>
          {canEdit && <button onClick={startAdd} style={btnPrimary(colors)}><Plus size={16} /> إضافة يدوي</button>}
        </div>
      </div>

      {error && <div style={{ background: "#FBEAE5", color: colors.danger, padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: colors.textMuted, padding: 30 }}><Loader2 size={18} className="spin" /> جاري التحميل...</div>
      ) : (
        <div style={{ background: colors.cardBg, borderRadius: 14, border: `1px solid ${colors.border}`, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "#F3EFE2" }}>
                {section.fields.map((f) => <th key={f.key} style={th(colors)}>{f.label}</th>)}
                {(section.computed || []).map((c) => <th key={c.label} style={th(colors)}>{c.label}</th>)}
                <th style={th(colors)}>مرفق</th>
                <th style={th(colors)}>اعتماد المديرة</th>
                {canEdit && <th style={{ ...th(colors), width: 90 }}></th>}
              </tr>
            </thead>
            <tbody>
              {draft && canEdit && (
                <tr style={{ background: "#FBF8EF" }}>
                  {section.fields.map((f) => <td key={f.key} style={td(colors)}><FieldInput field={f} value={draft[f.key]} onChange={(v) => setDraft({ ...draft, [f.key]: v })} /></td>)}
                  {(section.computed || []).map((c) => <td key={c.label} style={td(colors)}>—</td>)}
                  <td style={td(colors)}><AttachmentField sectionId={section.id} recordId={draftId} currentName={draft.attachmentName} onChange={(name) => setDraft({ ...draft, attachmentName: name })} /></td>
                  <td style={td(colors)}>—</td>
                  <td style={{ ...td(colors), whiteSpace: "nowrap" }}>
                    <IconBtn onClick={confirmAdd} title="حفظ"><Check size={16} color={colors.primary} /></IconBtn>
                    <IconBtn onClick={cancelAdd} title="إلغاء"><X size={16} color={colors.danger} /></IconBtn>
                  </td>
                </tr>
              )}
              {rows.length === 0 && !draft && <tr><td colSpan={section.fields.length + (section.computed || []).length + 2 + extraCols} style={{ ...td(colors), textAlign: "center", color: colors.textMuted, padding: 30 }}>لا توجد بيانات بعد.</td></tr>}
              {rows.map((row) =>
                editingId === row.id && canEdit ? (
                  <tr key={row.id} style={{ background: "#FBF8EF" }}>
                    {section.fields.map((f) => <td key={f.key} style={td(colors)}><FieldInput field={f} value={editDraft[f.key]} onChange={(v) => setEditDraft({ ...editDraft, [f.key]: v })} /></td>)}
                    {(section.computed || []).map((c) => <td key={c.label} style={td(colors)}>{c.fn(editDraft)}</td>)}
                    <td style={td(colors)}><AttachmentField sectionId={section.id} recordId={row.id} currentName={editDraft.attachmentName} onChange={(name) => setEditDraft({ ...editDraft, attachmentName: name })} /></td>
                    <td style={td(colors)}>{row.approved ? "✅" : "—"}</td>
                    <td style={{ ...td(colors), whiteSpace: "nowrap" }}>
                      <IconBtn onClick={confirmEdit} title="حفظ"><Check size={16} color={colors.primary} /></IconBtn>
                      <IconBtn onClick={cancelEdit} title="إلغاء"><X size={16} color={colors.danger} /></IconBtn>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                    {section.fields.map((f) => <td key={f.key} style={td(colors)}>{f.type === "textarea" ? <span style={{ whiteSpace: "pre-wrap" }}>{row[f.key]}</span> : (row[f.key] || "—")}</td>)}
                    {(section.computed || []).map((c) => <td key={c.label} style={td(colors)}>{c.fn(row)}</td>)}
                    <td style={td(colors)}>{row.attachmentName ? <button onClick={() => openAttachment(section.id, row.id)} style={{ ...btnGhost(colors), padding: "5px 9px", fontSize: 12 }}><Download size={12} /> {row.attachmentName.length > 14 ? row.attachmentName.slice(0, 14) + "…" : row.attachmentName}</button> : "—"}</td>
                    <td style={td(colors)}>
                      {role === "viewer" ? (
                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12.5 }}>
                          <input type="checkbox" checked={!!row.approved} onChange={() => toggleApproved(row)} /> {row.approved ? "معتمد" : "غير معتمد"}
                        </label>
                      ) : (row.approved ? <span style={{ color: colors.primary }}>✅ معتمد</span> : <span style={{ color: colors.textMuted }}>— بانتظار اعتماد المديرة</span>)}
                    </td>
                    {canEdit && (
                      <td style={{ ...td(colors), whiteSpace: "nowrap" }}>
                        <IconBtn onClick={() => startEdit(row)} title="تعديل"><Pencil size={15} color={colors.textMuted} /></IconBtn>
                        <IconBtn onClick={() => removeRow(row)} title="حذف"><Trash2 size={15} color={colors.danger} /></IconBtn>
                      </td>
                    )}
                  </tr>
                )
              )}
            </tbody>
            {section.sumField && rows.length > 0 && (
              <tfoot><tr style={{ background: "#F3EFE2", fontWeight: 700 }}>
                <td style={td(colors)} colSpan={section.fields.length - 1}>الإجمالي</td><td style={td(colors)}>{total.toFixed(3)}</td>
                {(section.computed || []).map((c) => <td key={c.label} style={td(colors)}></td>)}
                <td style={td(colors)}></td><td style={td(colors)}></td>{canEdit && <td style={td(colors)}></td>}
              </tr></tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, title }) {
  return <button onClick={onClick} title={title} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, display: "inline-flex", marginInlineStart: 2 }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "#EFE9D8")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>{children}</button>;
}

/* ---------------- المهام اليومية (Todo) ---------------- */

function TodoWidget() {
  const colors = useColors();
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const res = await storage.get("app:todos"); setTodos(res ? JSON.parse(res.value) : []); } catch { setTodos([]); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (next) => { setTodos(next); try { await storage.set("app:todos", JSON.stringify(next)); } catch {} };
  const add = () => { if (!text.trim()) return; save([{ id: genId(), text: text.trim(), done: false }, ...todos]); setText(""); };
  const toggle = (id) => save(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id) => save(todos.filter((t) => t.id !== id));

  if (loading) return null;
  return (
    <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: colors.text, marginBottom: 10, fontSize: 14 }}><ListTodo size={16} color={colors.primary} /> مهامك اليوم</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="أضيفي مهمة..." style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 13 }} />
        <button onClick={add} style={{ ...btnPrimary(colors), padding: "7px 12px" }}><Plus size={15} /></button>
      </div>
      {todos.length === 0 ? <div style={{ fontSize: 12.5, color: colors.textMuted }}>لا توجد مهام مضافة.</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
          {todos.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
              <span style={{ flex: 1, textDecoration: t.done ? "line-through" : "none", color: t.done ? colors.textMuted : colors.text }}>{t.text}</span>
              <IconBtn onClick={() => remove(t.id)} title="حذف"><X size={14} color={colors.danger} /></IconBtn>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- تنبيهات + متأخرات ---------------- */

function useAlerts(allData) {
  return useMemo(() => {
    const today = new Date(); const in30 = new Date(); in30.setDate(today.getDate() + 30);
    const upcoming = []; const overdue = [];
    const pendingStatuses = ["قيد التنفيذ", "تحت المراجعة", "مقترح"];
    (allData.licenses || []).forEach((r) => { if (r.expiryDate) { const d = new Date(r.expiryDate); if (d >= today && d <= in30) upcoming.push({ label: `ترخيص "${r.name || "—"}" ينتهي بتاريخ ${r.expiryDate}` }); else if (d < today) overdue.push({ label: `ترخيص "${r.name || "—"}" منتهي منذ ${r.expiryDate}` }); } });
    (allData.sponsorships || []).forEach((r) => { if (r.dueDate) { const d = new Date(r.dueDate); if (d >= today && d <= in30) upcoming.push({ label: `استحقاق كفالة "${r.orphan || "—"}" بتاريخ ${r.dueDate}` }); else if (d < today) overdue.push({ label: `استحقاق كفالة "${r.orphan || "—"}" فات موعده (${r.dueDate})` }); } });
    (allData.events || []).forEach((r) => { if (r.date && r.status === "قادمة") { const d = new Date(r.date); if (d >= today && d <= in30) upcoming.push({ label: `فعالية "${r.name || "—"}" بتاريخ ${r.date}` }); } });
    (allData.logistics || []).forEach((r) => { if (r.status === "قيد التنفيذ") upcoming.push({ label: `طلب لوجستي لم يُنجز: ${r.requestType || "—"} (${r.repName || "—"})` }); });
    ["correspondence", "meetings", "requirements"].forEach((sid) => {
      (allData[sid] || []).forEach((r) => {
        if (r.date && r.status && pendingStatuses.includes(r.status)) {
          const d = new Date(r.date);
          if (d < today) { const days = Math.round((today - d) / 86400000); overdue.push({ label: `${sid === "correspondence" ? "خطاب" : sid === "meetings" ? "قرار اجتماع" : "طلب"} "${r[BUILTIN_SECTIONS.find(s=>s.id===sid).primaryField] || "—"}" متأخر ${days} يوم` }); }
        }
      });
    });
    return { upcoming, overdue };
  }, [allData]);
}

/* ---------------- رسم نشاط الأشهر الماضية ---------------- */

function ActivityChart({ sections, allData }) {
  const colors = useColors();
  const months = useMemo(() => {
    const arr = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }
    return arr;
  }, []);
  const counts = months.map((ym) => {
    let c = 0;
    sections.forEach((s) => { if (!s.dateField) return; (allData[s.id] || []).forEach((r) => { if (r[s.dateField] && r[s.dateField].slice(0, 7) === ym) c++; }); });
    return c;
  });
  const max = Math.max(1, ...counts);
  const MN = ["ينا","فبر","مار","أبر","ماي","يون","يول","أغس","سبت","أكت","نوف","ديس"];
  return (
    <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: colors.text, marginBottom: 12, fontSize: 14 }}><BarChart3 size={16} color={colors.primary} /> نشاطك خلال آخر 6 أشهر</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {months.map((ym, i) => {
          const [y, mo] = ym.split("-").map(Number);
          return (
            <div key={ym} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 50, fontSize: 11.5, color: colors.textMuted }}>{MN[mo - 1]} {y}</div>
              <div style={{ flex: 1, background: "#F0EBDB", borderRadius: 6, overflow: "hidden", height: 16 }}>
                <div style={{ width: `${(counts[i] / max) * 100}%`, background: colors.primary, height: "100%", borderRadius: 6 }} />
              </div>
              <div style={{ width: 24, fontSize: 12, color: colors.text, fontWeight: 600 }}>{counts[i]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- لوحة المديرة ---------------- */

function Dashboard({ sections, allData, onNavigate }) {
  const colors = useColors();
  const { upcoming, overdue } = useAlerts(allData);
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: colors.text, marginBottom: 4 }}>لوحة العمليات</h2>
      <p style={{ color: colors.textMuted, fontSize: 14, marginBottom: 20 }}>نظرة عامة على كل أقسام عمل اللجنة النسائية</p>

      <TodoWidget />
      <ActivityChart sections={sections} allData={allData} />

      {overdue.length > 0 && (
        <div style={{ background: "#FBEAE5", border: `1px solid #E3B7AB`, borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: colors.danger, marginBottom: 8, fontSize: 14 }}><Bell size={16} /> متأخرات تحتاج متابعة</div>
          {overdue.map((a, i) => <div key={i} style={{ fontSize: 13, color: "#7A2E20", padding: "4px 0" }}>• {a.label}</div>)}
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ background: "#FFF7E3", border: `1px solid ${colors.goldLight}`, borderRadius: 12, padding: "14px 16px", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#7A5A0A", marginBottom: 8, fontSize: 14 }}><Bell size={16} /> تنبيهات قادمة</div>
          {upcoming.map((a, i) => <div key={i} style={{ fontSize: 13, color: "#5B4A15", padding: "4px 0" }}>• {a.label}</div>)}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
        {sections.map((s) => {
          const rows = allData[s.id] || [];
          const sum = s.sumField ? rows.reduce((a, r) => a + (parseFloat(r[s.sumField]) || 0), 0) : null;
          const Icon = ICONS[s.icon] || Sparkles;
          return (
            <button key={s.id} onClick={() => onNavigate(s.id)} style={{ textAlign: "right", cursor: "pointer", background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><Icon size={20} color={colors.primary} />{s.locked && <Lock size={13} color={colors.gold} />}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: colors.primaryDark }}>{rows.length}</div>
              {sum !== null && <div style={{ fontSize: 12.5, color: colors.textMuted }}>إجمالي: {sum.toFixed(3)} د.ك</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- التقويم الشهري ---------------- */

const MONTH_NAMES = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const WEEKDAYS = ["أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"];

function CalendarView({ sections, allData }) {
  const colors = useColors();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const dayItems = useMemo(() => {
    const map = {};
    sections.forEach((s) => {
      if (!s.dateField) return;
      (allData[s.id] || []).forEach((r) => {
        const dstr = r[s.dateField];
        if (!dstr) return;
        const d = new Date(dstr);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const day = d.getDate();
          if (!map[day]) map[day] = [];
          map[day].push({ label: r[s.primaryField] || s.label, section: s.label });
        }
      });
    });
    return map;
  }, [sections, allData, year, month]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const changeMonth = (delta) => {
    let m = month + delta, y = year;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Calendar size={22} color={colors.primary} /><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text }}>التقويم الشهري</h2></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => changeMonth(-1)} style={btnGhost(colors)}>السابق</button>
          <div style={{ fontWeight: 700, color: colors.text, fontSize: 14 }}>{MONTH_NAMES[month]} {year}</div>
          <button onClick={() => changeMonth(1)} style={btnGhost(colors)}>التالي</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {WEEKDAYS.map((w) => <div key={w} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: colors.textMuted, padding: 6 }}>{w}</div>)}
        {cells.map((d, i) => (
          <div key={i} style={{ minHeight: 84, background: d ? colors.cardBg : "transparent", border: d ? `1px solid ${colors.border}` : "none", borderRadius: 8, padding: 6 }}>
            {d && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.text, marginBottom: 4 }}>{d}</div>
                {(dayItems[d] || []).slice(0, 3).map((it, idx) => (
                  <div key={idx} title={it.section} style={{ fontSize: 10.5, background: "#F0EBDB", color: colors.primaryDark, borderRadius: 4, padding: "1px 5px", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</div>
                ))}
                {(dayItems[d] || []).length > 3 && <div style={{ fontSize: 10, color: colors.textMuted }}>+{dayItems[d].length - 3} أخرى</div>}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- البحث الشامل ---------------- */

function GlobalSearch({ sections, allData }) {
  const colors = useColors();
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const lower = q.trim().toLowerCase();
    const out = [];
    sections.forEach((s) => {
      (allData[s.id] || []).forEach((r) => {
        const hit = s.fields.some((f) => (r[f.key] || "").toString().toLowerCase().includes(lower));
        if (hit) out.push({ section: s.label, row: r, primary: r[s.primaryField] || "—" });
      });
    });
    return out;
  }, [q, sections, allData]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}><Search size={22} color={colors.primary} /><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text }}>البحث الشامل</h2></div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اكتبي أي كلمة (اسم، تاريخ، موضوع...)" style={{ width: "100%", maxWidth: 420, padding: "10px 14px", borderRadius: 10, border: `1px solid ${colors.border}`, fontSize: 14, marginBottom: 18 }} />
      {q.trim() && (
        <div style={{ fontSize: 12.5, color: colors.textMuted, marginBottom: 10 }}>{results.length} نتيجة</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {results.map((r, i) => (
          <div key={i} style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13.5 }}>
            <span style={{ background: "#F0EBDB", color: colors.primaryDark, borderRadius: 6, padding: "2px 8px", fontSize: 11.5, marginLeft: 8 }}>{r.section}</span>
            {r.primary}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- مكتبات القوالب (خطابات / متطلبات متكررة) ---------------- */

function TemplatesLibrary({ storageKey, title, icon: Icon }) {
  const colors = useColors();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const load = useCallback(async () => { try { const res = await storage.get(storageKey); setItems(res ? JSON.parse(res.value) : []); } catch { setItems([]); } setLoading(false); }, [storageKey]);
  useEffect(() => { load(); }, [load]);
  const save = async (next) => { setItems(next); try { await storage.set(storageKey, JSON.stringify(next)); } catch {} };

  const startAdd = () => setDraft({ id: genId(), title: "", body: "" });
  const confirmAdd = async () => { if (!draft.title.trim()) return; await save([draft, ...items]); setDraft(null); };
  const remove = (id) => save(items.filter((i) => i.id !== id));
  const copy = (item) => { navigator.clipboard?.writeText(item.body); setCopiedId(item.id); setTimeout(() => setCopiedId(null), 1500); };

  if (loading) return <Loader2 size={18} className="spin" />;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon size={22} color={colors.primary} /><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text }}>{title}</h2></div>
        <button onClick={startAdd} style={btnPrimary(colors)}><Plus size={16} /> إضافة قالب</button>
      </div>

      {draft && (
        <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="عنوان القالب" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${colors.border}`, marginBottom: 10, fontSize: 13.5, fontWeight: 600 }} />
          <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="نص القالب..." style={{ width: "100%", minHeight: 140, padding: "8px 10px", borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 13.5, marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={confirmAdd} style={btnPrimary(colors)}><Check size={15} /> حفظ</button>
            <button onClick={() => setDraft(null)} style={btnGhost(colors)}><X size={15} /> إلغاء</button>
          </div>
        </div>
      )}

      {items.length === 0 && !draft ? <div style={{ color: colors.textMuted, fontSize: 13 }}>لا توجد قوالب بعد.</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((it) => (
            <div key={it.id} style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: colors.text }}>{it.title}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => copy(it)} style={{ ...btnGhost(colors), padding: "5px 10px", fontSize: 12 }}>{copiedId === it.id ? "تم النسخ ✓" : "نسخ"}</button>
                  <IconBtn onClick={() => remove(it.id)} title="حذف"><Trash2 size={15} color={colors.danger} /></IconBtn>
                </div>
              </div>
              <div style={{ fontSize: 13, color: colors.textMuted, whiteSpace: "pre-wrap" }}>{it.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- التقرير الشهري ---------------- */

function MonthlyReport({ sections, allData }) {
  const colors = useColors();
  const now = new Date();
  const [ym, setYm] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const availableMonths = useMemo(() => {
    const set = new Set([ym]);
    sections.forEach((s) => { if (!s.dateField) return; (allData[s.id] || []).forEach((r) => { if (r[s.dateField]) set.add(r[s.dateField].slice(0, 7)); }); });
    return Array.from(set).sort().reverse();
  }, [allData, ym, sections]);
  const [year, month] = ym.split("-").map(Number);
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const inMonth = (d) => d && d.slice(0, 7) === ym;
  const sectionsWithDates = sections.filter((s) => s.dateField);

  const attendanceRows = (allData.attendance || []).filter((r) => inMonth(r.date));
  const totalHours = attendanceRows.reduce((a, r) => a + computeHours(r) + (parseFloat(r.overtimeHours) || 0), 0);
  const totalOvertime = attendanceRows.reduce((a, r) => a + (parseFloat(r.overtimeHours) || 0), 0);
  const totalTasks = sectionsWithDates.filter((s) => s.id !== "attendance").reduce((a, s) => a + (allData[s.id] || []).filter((r) => inMonth(r[s.dateField])).length, 0);

  return (
    <div>
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><CalendarClock size={22} color={colors.primary} /><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text }}>التقرير الشهري</h2></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={ym} onChange={(e) => setYm(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${colors.border}` }}>
            {availableMonths.map((m) => { const [y, mo] = m.split("-").map(Number); return <option key={m} value={m}>{MONTH_NAMES[mo - 1]} {y}</option>; })}
          </select>
          <button onClick={() => window.print()} style={btnPrimary(colors)}><Printer size={15} /> طباعة / PDF</button>
        </div>
      </div>
      <div id="report-print-area" style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 26 }}>
        <div style={{ textAlign: "center", marginBottom: 18, borderBottom: `2px solid ${colors.gold}`, paddingBottom: 14 }}>
          <div style={{ fontSize: 12, color: colors.textMuted }}>جمعية الهداية الخيرية — اللجنة النسائية</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: colors.primaryDark, marginTop: 4 }}>التقرير الشهري الشامل</div>
          <div style={{ fontSize: 14, color: colors.gold, fontWeight: 700, marginTop: 2 }}>{monthLabel}</div>
        </div>

        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 22, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 800, color: colors.primaryDark }}>{totalTasks}</div><div style={{ fontSize: 11.5, color: colors.textMuted }}>مهمة منجزة</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 800, color: colors.primaryDark }}>{totalHours.toFixed(1)}</div><div style={{ fontSize: 11.5, color: colors.textMuted }}>ساعة عمل</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 800, color: colors.primaryDark }}>{totalOvertime.toFixed(1)}</div><div style={{ fontSize: 11.5, color: colors.textMuted }}>ساعة إضافية</div></div>
        </div>

        {sectionsWithDates.map((s) => {
          const rows = (allData[s.id] || []).filter((r) => inMonth(r[s.dateField]));
          const sum = s.sumField ? rows.reduce((a, r) => a + (parseFloat(r[s.sumField]) || 0), 0) : null;
          const Icon = ICONS[s.icon] || Sparkles;
          return (
            <div key={s.id} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15, color: colors.text, marginBottom: 8 }}>
                <Icon size={16} color={colors.primary} />{s.label}
                <span style={{ fontSize: 12, color: colors.textMuted, fontWeight: 400 }}>({rows.length} سجل{sum !== null ? ` — إجمالي ${sum.toFixed(3)} د.ك` : ""})</span>
                {s.locked && <Lock size={12} color={colors.gold} />}
              </div>
              {rows.length === 0 ? <div style={{ fontSize: 13, color: colors.textMuted, paddingRight: 24 }}>لا يوجد نشاط هذا الشهر.</div> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead><tr style={{ background: "#F3EFE2" }}>{s.fields.map((f) => <th key={f.key} style={th(colors)}>{f.label}</th>)}</tr></thead>
                  <tbody>{rows.map((r) => <tr key={r.id} style={{ borderTop: `1px solid ${colors.border}` }}>{s.fields.map((f) => <td key={f.key} style={td(colors)}>{r[f.key] || "—"}</td>)}</tr>)}</tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- سجل الأنشطة / سجل دخول المديرة ---------------- */

function ActivityLog() {
  const colors = useColors();
  const [log, setLog] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { const res = await storage.get("app:activitylog"); setLog(res ? JSON.parse(res.value) : []); } catch { setLog([]); } setLoading(false); })(); }, []);
  const exportLog = () => {
    const lines = ["الوقت,القسم,الإجراء,التفاصيل"];
    log.forEach((l) => lines.push(`"${new Date(l.time).toLocaleString("ar-KW")}","${l.section}","${l.action}","${(l.summary || "").replace(/"/g, '""')}"`));
    const csv = "\uFEFF" + lines.join("\n"); const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "سجل_الأنشطة.csv"; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><History size={22} color={colors.primary} /><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text }}>سجل الأنشطة</h2></div>
        <button onClick={exportLog} style={btnGhost(colors)}><FileDown size={15} /> تصدير كإثبات</button>
      </div>
      <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>سجل تلقائي بكل إضافة أو تعديل أو حذف، بالتاريخ والوقت — يوثّق إنجازك ويحفظ حقك عند أي مراجعة.</p>
      {loading ? <Loader2 size={18} className="spin" /> : log.length === 0 ? <div style={{ color: colors.textMuted, fontSize: 13 }}>لا توجد أنشطة مسجلة بعد.</div> : (
        <div style={{ background: colors.cardBg, borderRadius: 14, border: `1px solid ${colors.border}`, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "#F3EFE2" }}><th style={th(colors)}>الوقت</th><th style={th(colors)}>القسم</th><th style={th(colors)}>الإجراء</th><th style={th(colors)}>التفاصيل</th></tr></thead>
            <tbody>{log.map((l) => <tr key={l.id} style={{ borderTop: `1px solid ${colors.border}` }}><td style={td(colors)}>{new Date(l.time).toLocaleString("ar-KW")}</td><td style={td(colors)}>{l.section}</td><td style={td(colors)}>{l.action}</td><td style={td(colors)}>{l.summary}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ManagerVisitLog() {
  const colors = useColors();
  const [log, setLog] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { const res = await storage.get("app:managerlog"); setLog(res ? JSON.parse(res.value) : []); } catch { setLog([]); } setLoading(false); })(); }, []);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}><UserCheck size={22} color={colors.primary} /><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text }}>سجل دخول المديرة</h2></div>
      <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>يسجَّل تلقائيًا كل مرة تدخل فيها المديرة برمز العرض.</p>
      {loading ? <Loader2 size={18} className="spin" /> : log.length === 0 ? <div style={{ color: colors.textMuted, fontSize: 13 }}>لم تدخل المديرة بعد.</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {log.map((l) => <div key={l.id} style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>🕓 {new Date(l.time).toLocaleString("ar-KW")}</div>)}
        </div>
      )}
    </div>
  );
}

/* ---------------- الإضافة السريعة بالصوت ---------------- */

function VoiceCapture({ sections, onSaved }) {
  const colors = useColors();
  const [sectionId, setSectionId] = useState(sections[0]?.id || "");
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [recordAudio, setRecordAudio] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioBlobRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = "ar-KW";
    rec.onresult = (e) => { let text = ""; for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript; setTranscript(text); };
    rec.onerror = () => setListening(false); rec.onend = () => setListening(false);
    recognitionRef.current = rec;
  }, []);

  const start = async () => {
    setSavedMsg(""); audioChunksRef.current = []; audioBlobRef.current = null;
    if (recordAudio && navigator.mediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        mr.onstop = () => { audioBlobRef.current = new Blob(audioChunksRef.current, { type: "audio/webm" }); stream.getTracks().forEach((t) => t.stop()); };
        mr.start(); mediaRecorderRef.current = mr;
      } catch {}
    }
    if (supported && recognitionRef.current) { try { recognitionRef.current.start(); setListening(true); } catch {} }
  };
  const stop = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
    setListening(false);
  };
  const save = async () => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section || !transcript.trim()) return;
    setSaving(true);
    const id = genId();
    const rec = emptyRecord(section.fields);
    const target = section.fields.find((f) => f.type === "textarea") || section.fields.find((f) => f.key === section.primaryField) || section.fields[0];
    rec[target.key] = transcript.trim();
    if (section.dateField && !rec[section.dateField]) rec[section.dateField] = todayStr();
    rec.id = id; rec.approved = false;
    try {
      const res = await storage.get(`section:${section.id}`);
      const rows = res ? JSON.parse(res.value) : [];
      await storage.set(`section:${section.id}`, JSON.stringify([rec, ...rows]));
      if (audioBlobRef.current) {
        const file = new File([audioBlobRef.current], "ملاحظة-صوتية.webm", { type: "audio/webm" });
        await saveAttachment(section.id, id, file);
        rec.attachmentName = file.name;
        await storage.set(`section:${section.id}`, JSON.stringify([rec, ...rows]));
      }
      logActivity(section.label, "إضافة بالصوت", transcript.trim().slice(0, 60));
      setSavedMsg(`تم الحفظ في «${section.label}» ✓`); setTranscript("");
      onSaved && onSaved();
    } catch { setSavedMsg("تعذّر الحفظ، حاولي مرة أخرى."); } finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}><Mic size={22} color={colors.primary} /><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text }}>إضافة نشاط بالصوت</h2></div>
      {!supported && <div style={{ background: "#FBEAE5", color: colors.danger, padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>متصفحك لا يدعم تحويل الصوت إلى نص مباشرة (جرّبي Chrome). يمكنك كتابة الملاحظة يدويًا بالأسفل.</div>}
      <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 20, maxWidth: 520 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: colors.text, display: "block", marginBottom: 14 }}>
          احفظ الملاحظة ضمن قسم:
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8, border: `1px solid ${colors.border}` }}>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: colors.textMuted, marginBottom: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={recordAudio} onChange={(e) => setRecordAudio(e.target.checked)} /> احفظ التسجيل الصوتي نفسه أيضًا كمرفق (اختياري)
        </label>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          {!listening ? <button onClick={start} style={{ ...btnPrimary(colors), padding: "14px 28px", fontSize: 15 }}><Mic size={18} /> ابدأ التسجيل</button>
            : <button onClick={stop} style={{ ...btnPrimary(colors), background: colors.danger, padding: "14px 28px", fontSize: 15 }}><Square size={18} /> إيقاف</button>}
        </div>
        {listening && <div style={{ textAlign: "center", fontSize: 12.5, color: colors.primary, marginBottom: 10 }}>🎙️ جاري الاستماع... تكلمي الآن</div>}
        <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="سيظهر النص هنا أثناء الكلام، أو اكتبي الملاحظة يدويًا..." style={{ width: "100%", minHeight: 110, padding: "10px 12px", borderRadius: 10, border: `1px solid ${colors.border}`, fontSize: 14, resize: "vertical", marginBottom: 14 }} />
        <button onClick={save} disabled={!transcript.trim() || saving} style={{ ...btnPrimary(colors), width: "100%", justifyContent: "center", opacity: !transcript.trim() ? 0.5 : 1 }}>{saving ? <Loader2 size={16} className="spin" /> : <Check size={16} />} حفظ النشاط</button>
        {savedMsg && <div style={{ textAlign: "center", fontSize: 12.5, color: colors.primary, marginTop: 10 }}>{savedMsg}</div>}
      </div>
    </div>
  );
}

/* ---------------- الإعدادات ---------------- */

function SettingsView({ sections, hidden, onHiddenChange, customSections, onCustomSectionsChange, themeName, onThemeChange }) {
  const colors = useColors();
  const [codes, setCodes] = useState(DEFAULT_CODES);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [newSecName, setNewSecName] = useState("");
  const [newFields, setNewFields] = useState([{ label: "", type: "text" }]);
  const [backupMsg, setBackupMsg] = useState("");

  useEffect(() => { (async () => { try { const res = await storage.get("app:pincodes"); if (res) setCodes(JSON.parse(res.value)); } catch {} setLoading(false); })(); }, []);
  const saveCodes = async () => { try { await storage.set("app:pincodes", JSON.stringify(codes)); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch {} };
  const toggleHidden = (id) => onHiddenChange(hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id]);

  const addFieldRow = () => setNewFields([...newFields, { label: "", type: "text" }]);
  const updateFieldRow = (i, key, val) => { const f = [...newFields]; f[i] = { ...f[i], [key]: val }; setNewFields(f); };
  const removeFieldRow = (i) => setNewFields(newFields.filter((_, idx) => idx !== i));

  const createCustomSection = () => {
    if (!newSecName.trim() || newFields.every((f) => !f.label.trim())) return;
    const fields = newFields.filter((f) => f.label.trim()).map((f, i) => ({ key: `f${i}_${f.label.trim().replace(/\s+/g, "_")}`, label: f.label.trim(), type: f.type }));
    const id = "custom_" + genId();
    const newSection = { id, label: newSecName.trim(), icon: "Sparkles", primaryField: fields[0]?.key, dateField: fields.find((f) => f.type === "date")?.key, fields, custom: true };
    onCustomSectionsChange([...customSections, newSection]);
    setNewSecName(""); setNewFields([{ label: "", type: "text" }]);
  };
  const deleteCustomSection = (id) => onCustomSectionsChange(customSections.filter((s) => s.id !== id));

  const fullBackup = async () => {
    setBackupMsg("جاري التجهيز...");
    const data = {};
    const keys = [
      ...sections.map((s) => `section:${s.id}`),
      "app:todos", "app:templates:letters", "app:templates:requirements",
      "app:activitylog", "app:managerlog", "app:customsections", "app:hiddensections", "app:theme",
    ];
    for (const k of keys) { try { const res = await storage.get(k); if (res) data[k] = JSON.parse(res.value); } catch {} }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `نسخة_احتياطية_${todayStr()}.json`; a.click();
    URL.revokeObjectURL(url);
    setBackupMsg("تم تنزيل النسخة الاحتياطية ✓");
    setTimeout(() => setBackupMsg(""), 3000);
  };

  if (loading) return <Loader2 size={18} className="spin" />;

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Settings size={22} color={colors.primary} /><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text }}>الإعدادات</h2></div>

      <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: colors.text, marginBottom: 12 }}>رموز الدخول</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>رمز الدخول الكامل (لك)
            <input value={codes.full} onChange={(e) => setCodes({ ...codes, full: e.target.value })} style={{ display: "block", width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8, border: `1px solid ${colors.border}` }} />
          </label>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>رمز الدخول للمديرة (عرض فقط)
            <input value={codes.viewer} onChange={(e) => setCodes({ ...codes, viewer: e.target.value })} style={{ display: "block", width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8, border: `1px solid ${colors.border}` }} />
          </label>
          <button onClick={saveCodes} style={{ ...btnPrimary(colors), alignSelf: "flex-start" }}>{saved ? <Check size={16} /> : null} حفظ الرموز</button>
        </div>
        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 10, lineHeight: 1.7 }}>⚠️ هذا فاصل تنظيمي بسيط وليس حماية تقنية قوية.</div>
      </div>

      <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15, color: colors.text, marginBottom: 12 }}><Palette size={17} /> ألوان الموقع</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {Object.entries(THEMES).map(([key, t]) => (
            <button key={key} onClick={() => onThemeChange(key)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, border: themeName === key ? `2px solid ${t.primary}` : `1px solid ${colors.border}`, background: "#fff", cursor: "pointer", fontSize: 13 }}>
              <span style={{ width: 16, height: 16, borderRadius: "50%", background: t.primary, display: "inline-block" }} /> {t.name} {themeName === key && <Check size={13} color={t.primary} />}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: colors.text, marginBottom: 12 }}>إظهار / إخفاء الأقسام</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {sections.map((s) => {
            const isHidden = hidden.includes(s.id); const Icon = ICONS[s.icon] || Sparkles;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: colors.text }}><Icon size={15} color={colors.primary} /> {s.label}</div>
                <button onClick={() => toggleHidden(s.id)} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: `1px solid ${colors.border}`, borderRadius: 20, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: isHidden ? colors.textMuted : colors.primary }}>
                  {isHidden ? <Lock size={12} /> : <Unlock size={12} />} {isHidden ? "مخفي" : "ظاهر"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: colors.text, marginBottom: 12 }}>إضافة قسم / جدول مخصص</div>
        <input value={newSecName} onChange={(e) => setNewSecName(e.target.value)} placeholder="اسم القسم الجديد" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${colors.border}`, marginBottom: 12, fontSize: 13.5 }} />
        <div style={{ fontSize: 12.5, color: colors.textMuted, marginBottom: 6 }}>حقول الجدول:</div>
        {newFields.map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={f.label} onChange={(e) => updateFieldRow(i, "label", e.target.value)} placeholder="اسم الحقل" style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 13 }} />
            <select value={f.type} onChange={(e) => updateFieldRow(i, "type", e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 13 }}>
              <option value="text">نص</option><option value="number">رقم</option><option value="date">تاريخ</option><option value="textarea">نص طويل</option>
            </select>
            {newFields.length > 1 && <IconBtn onClick={() => removeFieldRow(i)} title="حذف"><X size={15} color={colors.danger} /></IconBtn>}
          </div>
        ))}
        <button onClick={addFieldRow} style={{ ...btnGhost(colors), fontSize: 12.5, padding: "6px 12px", marginBottom: 14 }}><Plus size={13} /> إضافة حقل</button>
        <div><button onClick={createCustomSection} style={btnPrimary(colors)}><Plus size={16} /> إنشاء القسم</button></div>
        {customSections.length > 0 && (
          <div style={{ marginTop: 16, borderTop: `1px solid ${colors.border}`, paddingTop: 14 }}>
            <div style={{ fontSize: 12.5, color: colors.textMuted, marginBottom: 8 }}>الأقسام المخصصة الحالية:</div>
            {customSections.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span>{s.label} ({s.fields.length} حقول)</span>
                <IconBtn onClick={() => deleteCustomSection(s.id)} title="حذف القسم"><Trash2 size={15} color={colors.danger} /></IconBtn>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: colors.text, marginBottom: 12 }}>النسخ الاحتياطي</div>
        <button onClick={fullBackup} style={btnPrimary(colors)}><FileDown size={16} /> تصدير نسخة احتياطية كاملة</button>
        {backupMsg && <div style={{ fontSize: 12.5, color: colors.primary, marginTop: 10 }}>{backupMsg}</div>}
        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 10 }}>يحمّل ملف JSON واحد يحتوي كل بيانات الموقع، احتفظي به في مكان آمن.</div>
      </div>

      <div style={{ background: "#FFF7E3", border: `1px solid ${colors.goldLight}`, borderRadius: 12, padding: 16, fontSize: 12.5, color: "#5B4A15", lineHeight: 1.9 }}>
        💡 <b>لإرسال رابط مستقل للمديرة:</b> اضغطي زر "نشر / Publish" أعلى نافذة الأداة (خارج هذا الشات). عنوان الصفحة تقدرين تخلينه "بنك إنجازات نورهان"، لكن الرابط نفسه رمز عشوائي من كلود ولا يمكن تخصيصه باسمك.
      </div>
    </div>
  );
}

/* ---------------- التطبيق الرئيسي ---------------- */

function AppInner({ themeName, onThemeChange }) {
  const [access, setAccess] = useState(null);
  const [current, setCurrent] = useState("dashboard");
  const [allData, setAllData] = useState({});
  const [loadingAll, setLoadingAll] = useState(true);
  const [hidden, setHidden] = useState([]);
  const [customSections, setCustomSections] = useState([]);
  const colors = useColors();

  const sections = useMemo(() => [...BUILTIN_SECTIONS, ...customSections], [customSections]);
  const visibleSections = useMemo(() => sections.filter((s) => !hidden.includes(s.id)), [sections, hidden]);

  const refreshAll = useCallback(async () => { setLoadingAll(true); setAllData(await loadAllSections(sections)); setLoadingAll(false); }, [sections]);

  useEffect(() => {
    (async () => {
      try { const h = await storage.get("app:hiddensections"); if (h) setHidden(JSON.parse(h.value)); } catch {}
      try { const c = await storage.get("app:customsections"); if (c) setCustomSections(JSON.parse(c.value)); } catch {}
    })();
  }, []);
  useEffect(() => { if (access) refreshAll(); }, [access, current, refreshAll]);

  const updateHidden = async (next) => { setHidden(next); try { await storage.set("app:hiddensections", JSON.stringify(next)); } catch {} };
  const updateCustomSections = async (next) => { setCustomSections(next); try { await storage.set("app:customsections", JSON.stringify(next)); } catch {} };

  if (!access) return <LockScreen onUnlock={setAccess} />;
  const role = access;
  const activeSection = sections.find((s) => s.id === current);

  return (
    <div dir="rtl" style={{ display: "flex", height: "100%", minHeight: 640, background: colors.bg, fontFamily: "Tahoma, Arial, sans-serif" }}>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print { .no-print, .sidebar-print-hide { display: none !important; } #report-print-area { border: none !important; } }
      `}</style>

      <div className="no-print sidebar-print-hide" style={{ width: 250, background: colors.sidebar, color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>بنك إنجازات نورهان</div>
          <div style={{ fontSize: 12, color: colors.goldLight, marginTop: 2 }}>اللجنة النسائية</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 6 }}><Eye size={12} /> {role === "full" ? "وضع التحرير الكامل" : "وضع العرض فقط"}</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
          <NavItem active={current === "dashboard"} icon={LayoutGrid} label="لوحة المديرة" onClick={() => setCurrent("dashboard")} colors={colors} />
          <NavItem active={current === "calendar"} icon={Calendar} label="التقويم الشهري" onClick={() => setCurrent("calendar")} colors={colors} />
          <NavItem active={current === "search"} icon={Search} label="البحث الشامل" onClick={() => setCurrent("search")} colors={colors} />
          <NavItem active={current === "report"} icon={CalendarClock} label="التقرير الشهري" onClick={() => setCurrent("report")} colors={colors} />
          <NavItem active={current === "voice"} icon={Mic} label="إضافة نشاط بالصوت" onClick={() => setCurrent("voice")} colors={colors} />
          <NavItem active={current === "letters"} icon={FileText} label="قوالب الخطابات" onClick={() => setCurrent("letters")} colors={colors} />
          <NavItem active={current === "reqtemplates"} icon={FileText} label="قوالب متطلبات متكررة" onClick={() => setCurrent("reqtemplates")} colors={colors} />
          <NavItem active={current === "activitylog"} icon={History} label="سجل الأنشطة" onClick={() => setCurrent("activitylog")} colors={colors} />
          {role === "full" && <NavItem active={current === "managerlog"} icon={UserCheck} label="سجل دخول المديرة" onClick={() => setCurrent("managerlog")} colors={colors} />}
          <div style={{ height: 8 }} />
          {visibleSections.map((s) => <NavItem key={s.id} active={current === s.id} icon={ICONS[s.icon] || Sparkles} label={s.label} locked={s.locked} onClick={() => setCurrent(s.id)} colors={colors} />)}
          {role === "full" && (<><div style={{ height: 8 }} /><NavItem active={current === "settings"} icon={Settings} label="الإعدادات" onClick={() => setCurrent("settings")} colors={colors} /></>)}
        </div>
        <div style={{ padding: 14, fontSize: 11, color: "rgba(255,255,255,.5)", borderTop: "1px solid rgba(255,255,255,.1)" }}>البيانات محفوظة ومرتبطة بهذه الأداة.</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "26px 30px" }}>
        {loadingAll ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: colors.textMuted, padding: 30 }}><Loader2 size={18} className="spin" /> جاري التحميل...</div>
        ) : current === "dashboard" ? <Dashboard sections={visibleSections} allData={allData} onNavigate={setCurrent} />
          : current === "calendar" ? <CalendarView sections={sections} allData={allData} />
          : current === "search" ? <GlobalSearch sections={sections} allData={allData} />
          : current === "report" ? <MonthlyReport sections={sections} allData={allData} />
          : current === "voice" ? <VoiceCapture sections={sections} onSaved={refreshAll} />
          : current === "letters" ? <TemplatesLibrary storageKey="app:templates:letters" title="قوالب الخطابات" icon={FileText} />
          : current === "reqtemplates" ? <TemplatesLibrary storageKey="app:templates:requirements" title="قوالب متطلبات متكررة" icon={ClipboardList} />
          : current === "activitylog" ? <ActivityLog />
          : current === "managerlog" && role === "full" ? <ManagerVisitLog />
          : current === "settings" && role === "full" ? (
            <SettingsView sections={sections} hidden={hidden} onHiddenChange={updateHidden} customSections={customSections} onCustomSectionsChange={updateCustomSections} themeName={themeName} onThemeChange={onThemeChange} />
          ) : activeSection ? <SectionView section={activeSection} role={role} />
          : <div style={{ color: colors.textMuted }}>هذا القسم غير متاح.</div>}
      </div>
    </div>
  );
}

function NavItem({ active, icon: Icon, label, onClick, locked, colors }) {
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: active ? colors.sidebarHover : "transparent", color: active ? "#fff" : "rgba(255,255,255,.78)", border: "none", borderRadius: 9, padding: "9px 12px", fontSize: 13, cursor: "pointer", textAlign: "right", marginBottom: 2 }}>
      <Icon size={16} /><span style={{ flex: 1 }}>{label}</span>{locked && <Lock size={12} color={colors.gold} />}
    </button>
  );
}

export default function App() {
  const [themeName, setThemeName] = useState("emerald");
  useEffect(() => { (async () => { try { const t = await storage.get("app:theme"); if (t) setThemeName(JSON.parse(t.value)); } catch {} })(); }, []);
  const changeTheme = async (name) => { setThemeName(name); try { await storage.set("app:theme", JSON.stringify(name)); } catch {} };
  const colors = { ...THEMES[themeName], ...BASE };
  return (
    <ThemeContext.Provider value={colors}>
      <AppInner themeName={themeName} onThemeChange={changeTheme} />
    </ThemeContext.Provider>
  );
}
