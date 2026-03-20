"use client";
import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const SHEET_API  = "https://api.steinhq.com/v1/storages/69b224fbaffba40a625db5bd";
const APPLY_API  = "/api/quick-apply"; // backend route nhận POST và gửi mail + ghi sheet

// ─────────────────────────────────────────────────────────────
// NATURE BACKGROUND
// ─────────────────────────────────────────────────────────────
const CloudSVG = ({ w = 90, opacity = 0.18 }) => (
  <svg width={w} height={w * 0.55} viewBox="0 0 120 66" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:"block"}}>
    <ellipse cx="60" cy="44" rx="52" ry="22" fill={`rgba(200,185,165,${opacity})`}/>
    <ellipse cx="42" cy="36" rx="28" ry="20" fill={`rgba(200,185,165,${opacity})`}/>
    <ellipse cx="78" cy="34" rx="24" ry="18" fill={`rgba(200,185,165,${opacity})`}/>
    <ellipse cx="60" cy="28" rx="20" ry="16" fill={`rgba(200,185,165,${opacity})`}/>
  </svg>
);
const BirdSVG = ({ size = 18, color = "rgba(156,140,120,0.45)" }) => (
  <svg width={size * 2.2} height={size} viewBox="0 0 44 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 10 Q14 2 4 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M22 10 Q30 2 40 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
  </svg>
);
const LeafSVG = ({ size = 14, color = "rgba(156,140,120,0.35)" }) => (
  <svg width={size} height={size * 1.4} viewBox="0 0 20 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 2 Q18 10 10 26 Q2 10 10 2Z" fill={color}/>
    <line x1="10" y1="4" x2="10" y2="24" stroke="rgba(156,140,120,0.2)" strokeWidth="0.8"/>
  </svg>
);

const CLOUDS = [
  { id:"c1", w:140, y:"8%",  dur:55, delay:0,   opacity:0.13 },
  { id:"c2", w:90,  y:"4%",  dur:70, delay:-18, opacity:0.10 },
  { id:"c3", w:110, y:"14%", dur:62, delay:-35, opacity:0.11 },
  { id:"c4", w:70,  y:"20%", dur:80, delay:-50, opacity:0.08 },
  { id:"c5", w:120, y:"3%",  dur:48, delay:-8,  opacity:0.09 },
];
const BIRDS = [
  { id:"b1", y:"15%", dur:18, delay:0,   size:16, flip:false },
  { id:"b2", y:"28%", dur:24, delay:-7,  size:12, flip:false },
  { id:"b3", y:"10%", dur:21, delay:-14, size:14, flip:false },
  { id:"b4", y:"22%", dur:30, delay:-20, size:10, flip:true  },
];
const LEAVES = [
  { id:"l1", x:"15%", dur:12, delay:0,   size:13, driftX:40,  rot:200 },
  { id:"l2", x:"45%", dur:16, delay:-5,  size:10, driftX:-30, rot:-240 },
  { id:"l3", x:"72%", dur:14, delay:-10, size:15, driftX:50,  rot:300 },
  { id:"l4", x:"88%", dur:18, delay:-3,  size:11, driftX:-40, rot:-180 },
];

const NatureBackground = memo(() => (
  <div aria-hidden="true" style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
    <style>{NATURE_CSS}</style>
    {CLOUDS.map(c => (
      <div key={c.id} style={{position:"absolute",top:c.y,left:0,willChange:"transform",animation:`cloud-drift ${c.dur}s linear ${c.delay}s infinite`}}>
        <CloudSVG w={c.w} opacity={c.opacity} />
      </div>
    ))}
    {BIRDS.map(b => (
      <div key={b.id} style={{position:"absolute",top:b.y,left:0,willChange:"transform",animation:`bird-fly ${b.dur}s linear ${b.delay}s infinite`,transform:b.flip?"scaleX(-1)":undefined}}>
        <div style={{animation:`wing-flap 0.45s ease-in-out infinite alternate`}}>
          <BirdSVG size={b.size} />
        </div>
      </div>
    ))}
    {LEAVES.map(l => (
      <div key={l.id} style={{position:"absolute",top:"-30px",left:l.x,willChange:"transform, opacity",animation:`leaf-fall ${l.dur}s ease-in ${l.delay}s infinite`,"--drift":`${l.driftX}px`,"--rot":`${l.rot}deg`}}>
        <LeafSVG size={l.size} />
      </div>
    ))}
  </div>
));

const NATURE_CSS = `
  @keyframes cloud-drift { from{transform:translateX(-20vw)} to{transform:translateX(115vw)} }
  @keyframes bird-fly {
    0%  {transform:translateX(-8vw)  translateY(0px)}
    25% {transform:translateX(25vw)  translateY(-18px)}
    50% {transform:translateX(50vw)  translateY(4px)}
    75% {transform:translateX(75vw)  translateY(-12px)}
    100%{transform:translateX(112vw) translateY(0px)}
  }
  @keyframes wing-flap { from{transform:scaleY(1)} to{transform:scaleY(0.72)} }
  @keyframes leaf-fall {
    0%  {transform:translateY(-30px) translateX(0px) rotate(0deg);opacity:0}
    8%  {opacity:0.7}
    90% {opacity:0.5}
    100%{transform:translateY(105vh) translateX(var(--drift)) rotate(var(--rot));opacity:0}
  }
  @media(prefers-reduced-motion:reduce){
    [style*="cloud-drift"],[style*="bird-fly"],[style*="leaf-fall"],[style*="wing-flap"]{animation:none!important}
  }
`;

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const AREA_MAP = {
  "Hải Châu":"Central","Thanh Khê":"Central",
  "Sơn Trà":"Beach","Ngũ Hành Sơn":"Beach",
  "Liên Chiểu":"North","Cẩm Lệ":"Airport",
  "Hòa Vang":"Suburban","Hòa Xuân":"Airport",
};
const AREA_LABELS = {
  Central:"🏙 Central", Beach:"🌊 Beach",
  North:"🏭 North", Airport:"✈ Airport",
  Suburban:"🌿 Suburban", Remote:"💻 Remote",
};
const TAG_CFG = {
  "NEW":        { bg:"#E6F9F0", color:"#1A7F4B", border:"#9FDFBF" },
  "HOT":        { bg:"#FEE9E9", color:"#B53030", border:"#F5AAAA" },
  "URGENT":     { bg:"#FEF6E0", color:"#8A6200", border:"#F5D97A" },
  "HIGH SALARY":{ bg:"#FFF3E0", color:"#B56000", border:"#FFC87A" },
  "REMOTE":     { bg:"#E8F3FC", color:"#1A5A8A", border:"#9ECEF5" },
  "ONSITE":     { bg:"#F0F0F0", color:"#444444", border:"#CCCCCC" },
};

// localStorage key cho apply history (client-side dedupe guard)
const APPLIED_KEY = "dne_applied_jobs";
function getApplied() {
  try { return JSON.parse(localStorage.getItem(APPLIED_KEY) || "{}"); } catch { return {}; }
}
function markApplied(jobId) {
  const a = getApplied(); a[jobId] = Date.now();
  try { localStorage.setItem(APPLIED_KEY, JSON.stringify(a)); } catch {}
}
function hasApplied(jobId) { return !!getApplied()[jobId]; }

// ─────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────
function useIsMobile(bp = 768) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < bp : false
  );
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < bp);
    window.addEventListener("resize", fn, { passive: true });
    return () => window.removeEventListener("resize", fn);
  }, [bp]);
  return mobile;
}

// ─────────────────────────────────────────────────────────────
// DATA UTILS
// ─────────────────────────────────────────────────────────────
function parseSalary(raw) {
  if (!raw) return 0;
  const n = parseInt(raw.toString().replace(/\D/g, ""));
  if (!n) return 0;
  if (n < 1000)    return n * 1_000_000;
  if (n < 500_000) return n * 1_000;
  return n;
}

function detectRemote(job) {
  const remoteCol = (job["Remote"] || "").trim().toLowerCase();
  if (remoteCol === "remote" || remoteCol === "có" || remoteCol === "yes") return true;
  if (remoteCol === "onsite" || remoteCol === "không" || remoteCol === "no") return false;
  const addr = (job["Địa chỉ"] || "").toLowerCase();
  return /remote|tại nhà|work from home|wfh/.test(addr);
}

function getWorkMode(job) {
  const remoteCol = (job["Remote"] || "").trim().toLowerCase();
  if (remoteCol === "onsite") return "Onsite";
  if (remoteCol === "remote") return "Remote";
  if (remoteCol === "hybrid" || remoteCol === "linh hoạt") return "Hybrid";
  return job.isRemote ? "Remote" : "Onsite";
}

// Job có recruiterEmail hợp lệ thì cho Quick Apply
function getApplyEligibility(job) {
  const email = (job["Email"] || "").trim();
  if (!email || email === "Không rõ") return "external_apply_only";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "unavailable";
  return "quick_apply_available";
}

function normalizeJob(job, allJobs) {
  const salaryMin = parseSalary(job["Lương Min"]);
  const salaryMax = parseSalary(job["Lương Max"]) || salaryMin;
  const rawQuan   = job["Quận"] || "";
  const isRemote  = detectRemote(job);
  const district  = rawQuan && rawQuan !== "Không rõ" ? rawQuan : "Không rõ";
  const area      = isRemote ? "Remote" : (AREA_MAP[district] || "Đà Nẵng");
  const workMode  = getWorkMode({ ...job, isRemote });

  let daysOld = 999;
  const rawDate = job["Ngày đăng bài"] || "";
  if (rawDate) {
    const dp = rawDate.split(" ")[1];
    if (dp) {
      const [d, m, y] = dp.split("/");
      const dt = new Date(`${y}-${m?.padStart(2,"0")}-${d?.padStart(2,"0")}`);
      if (!isNaN(dt)) daysOld = Math.floor((Date.now() - dt) / 86_400_000);
    }
  }
  const freshnessStatus = rawDate ? (daysOld<=3?"new":daysOld<=7?"active":"hidden") : "active";
  const freshnessBoost  = daysOld<=1?10:daysOld<=3?7:daysOld<=7?4:0;

  let score = 0;
  if (salaryMax >= 30_000_000) score += 30;
  else if (salaryMax >= 15_000_000) score += 20;
  else if (salaryMax >= 7_000_000)  score += 10;
  if (salaryMin) score += 5;
  if (district !== "Không rõ") score += 3;
  if (job["Email"] && job["Email"] !== "Không rõ") score += 3;
  if (job["Phúc Lợi"]) score += 5;
  const tu = (job["Vị Trí"] || "").toUpperCase();
  if (tu.includes("POD")) score += 10;
  if (/ECOMMERCE|E-COMMERCE|ECOM/.test(tu)) score += 8;
  const cCount = allJobs.filter(j => j["Tên Công Ty"] === job["Tên Công Ty"]).length;
  if (cCount >= 2) score += 5;
  score += freshnessBoost;

  const content = `${job["Vị Trí"]||""} ${job["Nội Dung Gốc"]||""}`.toLowerCase();
  const tags = [];
  if (freshnessStatus === "new") tags.push("NEW");
  if (score > 45) tags.push("HOT");
  if (/tuyển gấp|đi làm ngay|urgent/.test(content)) tags.push("URGENT");
  if (salaryMax >= 20_000_000) tags.push("HIGH SALARY");
  if (isRemote) tags.push("REMOTE");

  // jobId dùng cho dedupe — ưu tiên field jobId, fallback index-based key
  const jobId = job["jobId"] || job["ID"] || `${job["Tên Công Ty"]}_${job["Vị Trí"]}`.replace(/\s/g,"_");
  const applyEligibility = getApplyEligibility(job);

  return {
    ...job,
    jobId,
    salaryMin, salaryMax, district, area,
    isRemote, workMode,
    daysOld, freshnessStatus,
    isVerified: cCount >= 2,
    finalScore: score, tags,
    applyEligibility,
  };
}

function deriveOptions(jobs) {
  return {
    areas:     [...new Set(jobs.map(j => j.area).filter(Boolean))].sort(),
    districts: [...new Set(jobs.map(j => j.district).filter(d => d !== "Không rõ"))].sort(),
    levels:    [...new Set(jobs.map(j => j["Level"]).filter(Boolean))].sort(),
    workModes: [...new Set(jobs.map(j => j.workMode).filter(Boolean))].sort(),
  };
}

// ─────────────────────────────────────────────────────────────
// 10 BỘ TƯ DUY — AI Email Strategy Config
// ─────────────────────────────────────────────────────────────
const MINDSETS = [
  {
    id: "match_jd",
    icon: "🎯",
    label: "Match 1–1 JD",
    short: "Bám sát từng yêu cầu tuyển dụng",
    color: "#B8621A",
    bg: "#FFF8F2",
    border: "#F0C8A0",
    prompt: `Viết email ứng tuyển theo chiến lược "Match 1–1 JD": mỗi yêu cầu trong JD phải được phản ánh trực tiếp bằng 1 câu cụ thể trong email. Bám sát từ khóa trong mô tả công việc, đề cập kỹ năng cụ thể mà JD yêu cầu.`,
  },
  {
    id: "proof",
    icon: "🧠",
    label: "Proof > Claim",
    short: "Chứng minh bằng số liệu, không kể lể",
    color: "#1A5A8A",
    bg: "#EEF6FF",
    border: "#9ECEF5",
    prompt: `Viết email ứng tuyển theo chiến lược "Proof > Claim": thay vì nói "em biết", hãy nói "em đã làm" với ví dụ cụ thể, số liệu, kết quả đo được. Mỗi kỹ năng phải đi kèm bằng chứng thực tế.`,
  },
  {
    id: "ai_native",
    icon: "⚡",
    label: "AI-native",
    short: "Highlight việc dùng AI tools thành thạo",
    color: "#6B3EA8",
    bg: "#F5EEFF",
    border: "#C9A8F5",
    prompt: `Viết email ứng tuyển theo chiến lược "AI-native candidate": làm nổi bật việc ứng viên biết tận dụng AI tools (ChatGPT, Claude…) để làm việc nhanh hơn và hiệu quả hơn. Đây là lợi thế cạnh tranh cần highlight rõ.`,
  },
  {
    id: "builder",
    icon: "🚀",
    label: "Builder mindset",
    short: "Người xây sản phẩm, không chỉ code",
    color: "#3E6B48",
    bg: "#F0F8EC",
    border: "#A8D8A8",
    prompt: `Viết email ứng tuyển theo chiến lược "Builder mindset": không nói "em làm frontend" mà nói "em quan tâm đến trải nghiệm người dùng và xây dựng sản phẩm". Nhấn mạnh tư duy sản phẩm, UX, và đóng góp vào business outcome.`,
  },
  {
    id: "global",
    icon: "🌍",
    label: "Global Ecom Angle",
    short: "Kinh nghiệm thị trường US/EU quốc tế",
    color: "#A83030",
    bg: "#FEF0F0",
    border: "#F5AAAA",
    prompt: `Viết email ứng tuyển theo chiến lược "Global Ecom Angle": nhấn mạnh kinh nghiệm làm việc với thị trường quốc tế, Shopify global, hiểu buyer behavior US/EU, currency, cross-border UX.`,
  },
  {
    id: "self_learner",
    icon: "💡",
    label: "Chủ động – tự học",
    short: "Culture fit: tự research, không cần hand-hold",
    color: "#7A6200",
    bg: "#FFFBEA",
    border: "#F5D97A",
    prompt: `Viết email ứng tuyển theo chiến lược "Tự học – Chủ động": thể hiện ứng viên chủ động tìm giải pháp, tự research, không cần nhiều hỗ trợ. Nhấn mạnh mindset growth và khả năng học nhanh qua documentation, cộng đồng, AI.`,
  },
  {
    id: "scannable",
    icon: "📋",
    label: "Short – Sharp – Scannable",
    short: "Bullet points, HR đọc 10 giây là hiểu ngay",
    color: "#5E5040",
    bg: "#F4F0EC",
    border: "#CFC3B0",
    prompt: `Viết email ứng tuyển theo chiến lược "Short–Sharp–Scannable": cấu trúc ngắn gọn với intro 2 dòng, 3–4 bullet points highlight kỹ năng chính, CTA rõ ràng. HR đọc 10–20 giây phải hiểu ngay ứng viên là ai.`,
  },
  {
    id: "hook",
    icon: "🏆",
    label: "Micro-tailored hook",
    short: "Câu mở khiến HR nghĩ email viết riêng cho họ",
    color: "#B8621A",
    bg: "#FFF8F2",
    border: "#E8C9A0",
    prompt: `Viết email ứng tuyển theo chiến lược "Micro-tailored hook": tạo câu mở cực kỳ cá nhân hóa khiến nhà tuyển dụng cảm giác email viết riêng cho công ty họ. Đề cập tên công ty, sản phẩm cụ thể, hoặc điều gì đó nổi bật về job description.`,
  },
  {
    id: "portfolio",
    icon: "📦",
    label: "Portfolio-first",
    short: "Đẩy link project thực tế lên đầu email",
    color: "#1A7F4B",
    bg: "#E6F9F0",
    border: "#9FDFBF",
    prompt: `Viết email ứng tuyển theo chiến lược "Portfolio-first": đưa link portfolio, GitHub, case study lên sớm trong email. Với dev/designer, portfolio thuyết phục hơn bất kỳ lời nào. Viết email ngắn + dẫn thẳng đến công việc thực tế.`,
  },
  {
    id: "cta",
    icon: "🎯",
    label: "CTA rõ ràng – chốt nhẹ",
    short: "Kết thúc bằng câu action rõ ràng, không mờ nhạt",
    color: "#1A5A8A",
    bg: "#EEF6FF",
    border: "#9ECEF5",
    prompt: `Viết email ứng tuyển theo chiến lược "CTA rõ ràng": kết thúc email bằng câu chốt nhẹ nhưng rõ ràng, mời nhà tuyển dụng phỏng vấn hoặc trao đổi thêm. Không kết thúc mờ nhạt kiểu "em mong nhận được hồi âm".`,
  },
];

// ─────────────────────────────────────────────────────────────
// AI EMAIL GENERATOR
// ─────────────────────────────────────────────────────────────
async function generateEmailAI({ job, profile, mindset, extraNote }) {
  const jobInfo = `
Vị trí: ${job["Vị Trí"] || ""}
Công ty: ${job["Tên Công Ty"] || ""}
Mô tả công việc: ${(job["Nội Dung Gốc"] || "").slice(0, 800)}
Kỹ năng yêu cầu: ${job["Kỹ Năng"] || ""}
Hình thức: ${job.workMode || ""}
Lương: ${job.salaryMax ? `đến ${Math.round(job.salaryMax / 1_000_000)}M VND` : "Thỏa thuận"}
  `.trim();

  const candidateInfo = `
Tên: ${profile.fullName}
Email: ${profile.email}
${profile.phone ? `SĐT: ${profile.phone}` : ""}
${profile.portfolioUrl ? `Portfolio: ${profile.portfolioUrl}` : ""}
${profile.linkedinUrl ? `LinkedIn: ${profile.linkedinUrl}` : ""}
${profile.defaultNote ? `Giới thiệu bản thân: ${profile.defaultNote}` : ""}
  `.trim();

  const systemPrompt = `Bạn là chuyên gia viết email ứng tuyển cho thị trường Việt Nam, đặc biệt ngành E-commerce và Tech.
Nhiệm vụ: Viết email ứng tuyển bằng tiếng Việt, chuyên nghiệp, tự nhiên, không sáo rỗng.
${mindset.prompt}

Quy tắc bắt buộc:
- Viết bằng tiếng Việt, xưng "em" với nhà tuyển dụng
- Không dùng từ sáo rỗng như "nhiệt huyết", "đam mê", "cầu tiến" một mình không có context
- Tự nhiên như người thật viết, không có cảm giác AI-robot
- Độ dài: 150–280 chữ (chiến lược Scannable thì ngắn hơn ~120 chữ)
- KHÔNG viết Subject, chỉ viết phần body email
- Chỉ xuất nội dung email, không giải thích thêm gì`;

  const userMsg = `Thông tin job:\n${jobInfo}\n\nThông tin ứng viên:\n${candidateInfo}${extraNote ? `\n\nGhi chú thêm từ ứng viên: ${extraNote}` : ""}\n\nViết email ứng tuyển theo chiến lược "${mindset.label}".`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "API error");
  return data.content?.find(b => b.type === "text")?.text || "";
}

// ─────────────────────────────────────────────────────────────
// MINDSET CARD
// ─────────────────────────────────────────────────────────────
function MindsetCard({ m, selected, onClick }) {
  const active = selected === m.id;
  return (
    <button
      onClick={() => onClick(m.id)}
      style={{
        display:"flex", alignItems:"flex-start", gap:10,
        padding:"11px 14px",
        border:`1.5px solid ${active ? m.color : "var(--border)"}`,
        borderRadius:8,
        background: active ? m.bg : "white",
        cursor:"pointer", textAlign:"left",
        transition:"all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
        transform: active ? "scale(1.02)" : "scale(1)",
        boxShadow: active ? `0 4px 16px ${m.color}22` : "var(--shadow)",
        fontFamily:"'Jost',sans-serif", width:"100%",
      }}
    >
      <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{m.icon}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
          <span style={{fontSize:13,fontWeight:700,color:active?m.color:"var(--ink)",transition:"color 0.15s"}}>{m.label}</span>
          {active && (
            <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.1em",background:m.color,color:"white",borderRadius:3,padding:"2px 6px",fontFamily:"Inconsolata,monospace",textTransform:"uppercase"}}>CHỌN</span>
          )}
        </div>
        <span style={{fontSize:11,color:"var(--ink3)",lineHeight:1.4}}>{m.short}</span>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPOSE STEP — AI-powered (thay thế bước soạn email cũ)
// ─────────────────────────────────────────────────────────────
function ComposeStep({ job, profile, subject, setSubject, body, setBody, setDirty, onBack, onNext }) {
  const [selectedMindset, setSelectedMindset] = useState("match_jd");
  const [extraNote, setExtraNote]             = useState("");
  const [generating, setGenerating]           = useState(false);
  const [genError, setGenError]               = useState("");
  const [phase, setPhase]                     = useState("select"); // "select" | "edit"
  const [showAll, setShowAll]                 = useState(false);

  const visibleMindsets = showAll ? MINDSETS : MINDSETS.slice(0, 6);
  const activeMindset   = MINDSETS.find(m => m.id === selectedMindset);

  const handleGenerate = useCallback(async () => {
    setGenerating(true); setGenError("");
    try {
      const emailBody = await generateEmailAI({ job, profile, mindset: activeMindset, extraNote });
      setSubject(`Ứng tuyển ${job["Vị Trí"]} - ${profile.fullName}`);
      setBody(emailBody);
      setDirty(true);
      setPhase("edit");
    } catch(e) {
      setGenError(e.message || "Có lỗi xảy ra, thử lại.");
    } finally {
      setGenerating(false);
    }
  }, [job, profile, activeMindset, extraNote, setSubject, setBody, setDirty]);

  const handleRegenerate = useCallback(async () => {
    setGenerating(true); setGenError("");
    try {
      const emailBody = await generateEmailAI({ job, profile, mindset: activeMindset, extraNote });
      setBody(emailBody);
      setDirty(true);
    } catch(e) {
      setGenError(e.message || "Có lỗi xảy ra, thử lại.");
    } finally {
      setGenerating(false);
    }
  }, [job, profile, activeMindset, extraNote, setBody, setDirty]);

  // ── PHASE: chọn chiến lược ──
  if (phase === "select") {
    return (
      <div style={{padding:"20px 24px 28px",flex:1,display:"flex",flexDirection:"column"}}>
        <p style={{fontFamily:"Inconsolata,monospace",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.14em",color:"var(--ink3)",marginBottom:14}}>
          Chọn chiến lược email
        </p>

        {/* Mindset list */}
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
          {visibleMindsets.map(m => (
            <MindsetCard key={m.id} m={m} selected={selectedMindset} onClick={setSelectedMindset} />
          ))}
        </div>

        {/* Show more */}
        <button
          onClick={() => setShowAll(v => !v)}
          style={{fontSize:12,fontWeight:600,color:"var(--ink3)",background:"none",border:"none",cursor:"pointer",fontFamily:"'Jost',sans-serif",padding:"4px 0",textDecoration:"underline",textAlign:"left",marginBottom:16}}
        >
          {showAll ? "Thu gọn ↑" : `Xem thêm ${MINDSETS.length - 6} chiến lược khác ↓`}
        </button>

        {/* Extra note */}
        <div style={{marginBottom:16}}>
          <p style={{fontFamily:"Inconsolata,monospace",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.14em",color:"var(--ink3)",marginBottom:8}}>
            Ghi chú thêm cho AI (tuỳ chọn)
          </p>
          <textarea
            value={extraNote}
            onChange={e => setExtraNote(e.target.value)}
            placeholder="VD: Em có 2 năm kinh nghiệm Shopify, portfolio tại shopify.dev/abc, muốn nhấn mạnh kinh nghiệm mobile UX..."
            rows={3}
            style={{width:"100%",padding:"12px 14px",border:"1.5px solid var(--border)",borderRadius:6,fontSize:13,fontFamily:"'Jost',sans-serif",color:"var(--ink)",background:"white",outline:"none",resize:"vertical",lineHeight:1.6,boxSizing:"border-box"}}
          />
        </div>

        {/* Error */}
        {genError && (
          <div style={{background:"#FEF0F0",border:"1px solid #F5AAAA",borderRadius:6,padding:"10px 14px",marginBottom:14,fontSize:12,color:"var(--red)",fontFamily:"Inconsolata,monospace"}}>
            ⚠️ {genError}
          </div>
        )}

        {/* Active mindset badge */}
        {activeMindset && (
          <div style={{display:"flex",alignItems:"center",gap:8,background:activeMindset.bg,border:`1px solid ${activeMindset.border}`,borderRadius:6,padding:"10px 14px",marginBottom:16}}>
            <span style={{fontSize:16}}>{activeMindset.icon}</span>
            <div>
              <span style={{fontSize:12,fontWeight:700,color:activeMindset.color}}>{activeMindset.label}</span>
              <span style={{fontSize:11,color:"var(--ink3)",marginLeft:8}}>{activeMindset.short}</span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{display:"flex",gap:10}}>
          <button onClick={onBack} style={{flex:1,padding:"14px",border:"1.5px solid var(--border)",borderRadius:6,background:"white",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Jost',sans-serif",color:"var(--ink2)"}}>
            ← Quay lại
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{flex:2,padding:"14px",background:generating?"var(--ink3)":"var(--ink)",color:"var(--bg)",border:"none",borderRadius:6,fontSize:14,fontWeight:700,cursor:generating?"not-allowed":"pointer",fontFamily:"'Jost',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s ease"}}
          >
            {generating
              ? <><span style={{display:"inline-block",animation:"spin 1s linear infinite",fontSize:16}}>✦</span> Đang tạo email…</>
              : <>✦ AI Generate Email</>
            }
          </button>
        </div>
      </div>
    );
  }

  // ── PHASE: chỉnh sửa email đã generate ──
  return (
    <div style={{padding:"20px 24px 28px",flex:1,display:"flex",flexDirection:"column"}}>

      {/* Top bar: badge + actions */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,gap:10,flexWrap:"wrap"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:activeMindset.bg,border:`1px solid ${activeMindset.border}`,borderRadius:20,padding:"5px 12px"}}>
          <span style={{fontSize:13}}>{activeMindset.icon}</span>
          <span style={{fontSize:11,fontWeight:700,color:activeMindset.color,fontFamily:"Inconsolata,monospace"}}>{activeMindset.label}</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={() => setPhase("select")} style={{fontSize:11,fontWeight:600,color:"var(--ink2)",background:"white",border:"1px solid var(--border)",borderRadius:20,padding:"5px 12px",cursor:"pointer",fontFamily:"'Jost',sans-serif"}}>
            ↩ Đổi chiến lược
          </button>
          <button onClick={handleRegenerate} disabled={generating} style={{fontSize:11,fontWeight:700,color:generating?"var(--ink3)":"var(--acc)",background:generating?"var(--bg2)":"#FFF8F2",border:`1px solid ${generating?"var(--border)":"#E8C9A0"}`,borderRadius:20,padding:"5px 12px",cursor:generating?"not-allowed":"pointer",fontFamily:"'Jost',sans-serif"}}>
            {generating ? "…" : "✦ Viết lại"}
          </button>
        </div>
      </div>

      {/* Error */}
      {genError && (
        <div style={{background:"#FEF0F0",border:"1px solid #F5AAAA",borderRadius:6,padding:"10px 14px",marginBottom:12,fontSize:12,color:"var(--red)",fontFamily:"Inconsolata,monospace"}}>
          ⚠️ {genError} — Nội dung cũ vẫn còn, bạn có thể sửa tay.
        </div>
      )}

      {/* Subject */}
      <div style={{marginBottom:12}}>
        <p style={{fontSize:11,fontFamily:"Inconsolata,monospace",color:"var(--ink3)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.1em"}}>Tiêu đề *</p>
        <input
          value={subject}
          onChange={e => { setSubject(e.target.value); setDirty(true); }}
          style={{width:"100%",padding:"12px 14px",border:"1.5px solid var(--border)",borderRadius:6,fontSize:14,fontFamily:"'Jost',sans-serif",color:"var(--ink)",background:"white",outline:"none",boxSizing:"border-box"}}
        />
      </div>

      {/* Body */}
      <div style={{marginBottom:8,flex:1}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <p style={{fontSize:11,fontFamily:"Inconsolata,monospace",color:"var(--ink3)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Nội dung *</p>
          <span style={{fontFamily:"Inconsolata,monospace",fontSize:10,color:"var(--ink3)"}}>{body.length} ký tự</span>
        </div>
        <textarea
          value={body}
          onChange={e => { setBody(e.target.value); setDirty(true); }}
          rows={12}
          style={{width:"100%",padding:"12px 14px",border:"1.5px solid var(--border)",borderRadius:6,fontSize:13,fontFamily:"'Jost',sans-serif",color:"var(--ink)",background:"white",outline:"none",resize:"vertical",lineHeight:1.75,boxSizing:"border-box"}}
        />
      </div>

      <p style={{fontSize:11,color:"var(--ink3)",fontFamily:"Inconsolata,monospace",marginBottom:18,lineHeight:1.5}}>
        💡 Bạn có thể chỉnh sửa trực tiếp — AI tạo nháp, bạn hoàn thiện.
      </p>

      {/* Nav */}
      <div style={{display:"flex",gap:10}}>
        <button onClick={() => setPhase("select")} style={{flex:1,padding:"14px",border:"1.5px solid var(--border)",borderRadius:6,background:"white",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Jost',sans-serif",color:"var(--ink2)"}}>
          ← Chiến lược
        </button>
        <button onClick={onNext} style={{flex:2,padding:"14px",background:"var(--ink)",color:"var(--bg)",border:"none",borderRadius:6,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Jost',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase"}}>
          Xem trước →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// QUICK APPLY MODAL
// ─────────────────────────────────────────────────────────────
// step: "profile" | "compose" | "preview" | "sending" | "success" | "error"
function QuickApplyModal({ job, onClose, onSuccess }) {
  const isMobile = useIsMobile();
  const [step, setStep]       = useState("profile");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [dirty, setDirty]     = useState(false); // unsaved compose changes

  // Profile fields
  const [profile, setProfile] = useState({
    fullName: "", email: "", phone: "",
    defaultNote: "", portfolioUrl: "", linkedinUrl: "",
  });
  const [profileErrors, setProfileErrors] = useState({});

  // CV upload
  const [cvFile, setCvFile]   = useState(null);
  const [cvError, setCvError] = useState("");
  const fileRef = useRef();

  // Email compose
  const [subject, setSubject] = useState("");
  const [body, setBody]       = useState("");

  // Validate profile rồi chuyển sang bước compose (AI sẽ generate email)
  function goToCompose() {
    const errs = {};
    if (!profile.fullName.trim()) errs.fullName = "Bắt buộc";
    if (!profile.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) errs.email = "Email không hợp lệ";
    if (!cvFile) { setCvError("Vui lòng chọn CV PDF"); return; }
    if (Object.keys(errs).length) { setProfileErrors(errs); return; }
    setStep("compose");
  }

  function handleCvChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") { setCvError("Chỉ nhận file PDF"); return; }
    if (f.size > 5 * 1024 * 1024) { setCvError("File tối đa 5MB"); return; }
    setCvFile(f); setCvError("");
  }

  async function handleSend() {
    if (sending) return; // anti double-submit
    setSending(true);
    setStep("sending");

    try {
      // Upload CV lên backend, backend sẽ relay lên Drive + gửi mail + ghi sheet
      const fd = new FormData();
      fd.append("cv", cvFile);
      fd.append("jobId", job.jobId);
      fd.append("jobTitle", job["Vị Trí"] || "");
      fd.append("companyName", job["Tên Công Ty"] || "");
      fd.append("recruiterEmail", job["Email"] || "");
      fd.append("subject", subject);
      fd.append("body", body);
      fd.append("candidateName", profile.fullName);
      fd.append("candidateEmail", profile.email);
      fd.append("candidatePhone", profile.phone || "");

      const res = await fetch(APPLY_API, { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok || json.error) throw new Error(json.error?.message || "Gửi thất bại");

      markApplied(job.jobId);
      setStep("success");
      setTimeout(() => { onSuccess(job.jobId); onClose(); }, 2200);
    } catch(e) {
      setErrorMsg(e.message || "Có lỗi xảy ra, thử lại sau.");
      setStep("error");
      setSending(false);
    }
  }

  function tryClose() {
    if (step === "compose" && dirty) {
      if (!window.confirm("Bạn đang soạn email, thoát sẽ mất nội dung. Xác nhận?")) return;
    }
    onClose();
  }

  const overlayStyle = {
    position:"fixed",inset:0,zIndex:400,
    background:"rgba(40,32,15,0.6)",
    backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",
    display:"flex",alignItems:isMobile?"flex-end":"center",
    justifyContent:"center",
    animation:"overlayIn 0.2s ease",
  };
  const sheetStyle = {
    background:"var(--bg)",
    width: isMobile ? "100%" : "min(92vw,560px)",
    maxHeight: isMobile ? "92dvh" : "90vh",
    borderRadius: isMobile ? "20px 20px 0 0" : "12px",
    overflowY:"auto",
    animation: isMobile ? "sheetUp 0.32s cubic-bezier(0.16,1,0.3,1)" : "modalIn 0.28s cubic-bezier(0.16,1,0.3,1)",
    display:"flex",flexDirection:"column",
  };

  const inp = (val, onChange, placeholder, err) => (
    <div style={{marginBottom:14}}>
      <input
        value={val} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:"100%",padding:"12px 14px",border:`1.5px solid ${err?"var(--red)":"var(--border)"}`,
          borderRadius:6,fontSize:14,fontFamily:"'Jost',sans-serif",color:"var(--ink)",
          background:"white",outline:"none",boxSizing:"border-box",
        }}
      />
      {err && <p style={{fontSize:11,color:"var(--red)",marginTop:4,fontFamily:"Inconsolata,monospace"}}>{err}</p>}
    </div>
  );

  return (
    <div style={overlayStyle} onClick={e => e.target===e.currentTarget && tryClose()}>
      <div style={sheetStyle}>
        {isMobile && <div style={{width:36,height:4,background:"var(--border)",borderRadius:2,margin:"12px auto 4px",flexShrink:0}} />}

        {/* Header */}
        <div style={{padding:"20px 24px 16px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <p style={{fontFamily:"Inconsolata,monospace",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.18em",color:"var(--acc)",marginBottom:3}}>
                Quick Apply
              </p>
              <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:"var(--ink)",lineHeight:1.2}}>
                {job["Vị Trí"]}
              </h3>
              <p style={{fontSize:13,color:"var(--ink3)",marginTop:2}}>@ {job["Tên Công Ty"]}</p>
            </div>
            <button onClick={tryClose} style={{width:32,height:32,borderRadius:"50%",border:"1.5px solid var(--border)",background:"white",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--ink2)",flexShrink:0}}>✕</button>
          </div>
          {/* Step indicator */}
          {(step === "profile" || step === "compose" || step === "preview") && (
            <div style={{display:"flex",gap:6,marginTop:14,alignItems:"center"}}>
              {["profile","compose","preview"].map((s,i) => (
                <React.Fragment key={s}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{
                      width:22,height:22,borderRadius:"50%",fontSize:10,fontWeight:700,
                      fontFamily:"Inconsolata,monospace",display:"flex",alignItems:"center",justifyContent:"center",
                      background:step===s?"var(--ink)":(["profile","compose","preview"].indexOf(step)>i?"var(--green)":"var(--bg3)"),
                      color:step===s||["profile","compose","preview"].indexOf(step)>i?"white":"var(--ink3)",
                    }}>{i+1}</div>
                    <span style={{fontSize:11,fontFamily:"Inconsolata,monospace",color:step===s?"var(--ink)":"var(--ink3)",fontWeight:step===s?700:400}}>
                      {s==="profile"?"Hồ sơ":s==="compose"?"Email":"Xem lại"}
                    </span>
                  </div>
                  {i<2 && <div style={{flex:1,height:1,background:"var(--border)"}} />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* STEP: profile */}
        {step === "profile" && (
          <div style={{padding:"20px 24px 24px",flex:1}}>
            <p style={{fontFamily:"Inconsolata,monospace",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.14em",color:"var(--ink3)",marginBottom:16}}>Thông tin ứng viên</p>
            {inp(profile.fullName, v => setProfile(p=>({...p,fullName:v})), "Họ và tên *", profileErrors.fullName)}
            {inp(profile.email,    v => setProfile(p=>({...p,email:v})),    "Email của bạn *", profileErrors.email)}
            {inp(profile.phone,    v => setProfile(p=>({...p,phone:v})),    "Số điện thoại")}
            {inp(profile.portfolioUrl, v => setProfile(p=>({...p,portfolioUrl:v})), "Portfolio URL (không bắt buộc)")}
            {inp(profile.linkedinUrl,  v => setProfile(p=>({...p,linkedinUrl:v})),  "LinkedIn URL (không bắt buộc)")}
            <div style={{marginBottom:14}}>
              <textarea
                value={profile.defaultNote}
                onChange={e => setProfile(p=>({...p,defaultNote:e.target.value}))}
                placeholder="Giới thiệu ngắn (sẽ được chèn vào email)"
                rows={3}
                style={{width:"100%",padding:"12px 14px",border:"1.5px solid var(--border)",borderRadius:6,fontSize:14,fontFamily:"'Jost',sans-serif",color:"var(--ink)",background:"white",outline:"none",resize:"vertical",boxSizing:"border-box"}}
              />
            </div>

            {/* CV Upload */}
            <div style={{marginBottom:20}}>
              <p style={{fontFamily:"Inconsolata,monospace",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.14em",color:"var(--ink3)",marginBottom:10}}>CV của bạn *</p>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border:`2px dashed ${cvError?"var(--red)":cvFile?"var(--green)":"var(--border)"}`,
                  borderRadius:8,padding:"18px 20px",cursor:"pointer",textAlign:"center",
                  background:cvFile?"#F0F8EC":"white",transition:"all 0.2s ease",
                }}
              >
                <input ref={fileRef} type="file" accept="application/pdf" onChange={handleCvChange} style={{display:"none"}} />
                {cvFile ? (
                  <div>
                    <div style={{fontSize:20,marginBottom:4}}>📄</div>
                    <p style={{fontSize:13,fontWeight:700,color:"var(--green)"}}>{cvFile.name}</p>
                    <p style={{fontSize:11,color:"var(--ink3)",marginTop:2}}>{(cvFile.size/1024/1024).toFixed(1)} MB · Nhấn để đổi</p>
                  </div>
                ) : (
                  <div>
                    <div style={{fontSize:28,marginBottom:6,opacity:0.4}}>📎</div>
                    <p style={{fontSize:13,fontWeight:600,color:"var(--ink2)"}}>Chọn file CV</p>
                    <p style={{fontSize:11,color:"var(--ink3)",marginTop:2}}>PDF · Tối đa 5MB</p>
                  </div>
                )}
              </div>
              {cvError && <p style={{fontSize:11,color:"var(--red)",marginTop:4,fontFamily:"Inconsolata,monospace"}}>{cvError}</p>}
            </div>

            <button className="apply-btn" onClick={goToCompose}>Tiếp theo → Soạn email</button>
          </div>
        )}

        {/* STEP: compose — AI-powered */}
        {step === "compose" && (
          <ComposeStep
            job={job}
            profile={profile}
            subject={subject}   setSubject={setSubject}
            body={body}         setBody={setBody}
            setDirty={setDirty}
            onBack={() => setStep("profile")}
            onNext={() => setStep("preview")}
          />
        )}

        {/* STEP: preview */}
        {step === "preview" && (
          <div style={{padding:"20px 24px 24px",flex:1}}>
            <p style={{fontFamily:"Inconsolata,monospace",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.14em",color:"var(--ink3)",marginBottom:16}}>Xem lại trước khi gửi</p>

            <div style={{background:"white",border:"1.5px solid var(--border)",borderRadius:8,padding:"18px 20px",marginBottom:16,fontSize:13,lineHeight:1.7}}>
              <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                <span style={{fontFamily:"Inconsolata,monospace",fontSize:11,color:"var(--ink3)",textTransform:"uppercase"}}>Tới:</span>
                <span style={{fontFamily:"Inconsolata,monospace",fontSize:11,fontWeight:700,color:"var(--ink)"}}>{job["Email"]}</span>
              </div>
              <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                <span style={{fontFamily:"Inconsolata,monospace",fontSize:11,color:"var(--ink3)",textTransform:"uppercase"}}>Tiêu đề:</span>
                <span style={{fontFamily:"Inconsolata,monospace",fontSize:11,fontWeight:700,color:"var(--ink)"}}>{subject}</span>
              </div>
              <div style={{height:1,background:"var(--border)",marginBottom:12}} />
              <p style={{whiteSpace:"pre-line",color:"var(--ink2)",fontSize:13}}>{body}</p>
            </div>

            {cvFile && (
              <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#F0F8EC",border:"1px solid #A8D8A8",borderRadius:6,padding:"8px 14px",marginBottom:20,fontSize:12,color:"var(--green)"}}>
                📎 {cvFile.name} · {(cvFile.size/1024/1024).toFixed(1)} MB
              </div>
            )}

            <div style={{background:"#FFF8F0",border:"1.5px solid #E8C9A0",borderRadius:6,padding:"12px 16px",marginBottom:20,fontSize:12,color:"var(--ink2)",lineHeight:1.6}}>
              ⚠️ Email sẽ được gửi từ hệ thống DaNangEcom với reply-to là địa chỉ email của bạn. Nhà tuyển dụng trả lời sẽ đến thẳng hộp thư của bạn.
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={() => setStep("compose")} style={{flex:1,padding:"14px",border:"1.5px solid var(--border)",borderRadius:6,background:"white",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Jost',sans-serif",color:"var(--ink2)"}}>← Sửa lại</button>
              <button className="apply-btn" style={{flex:2}} onClick={handleSend} disabled={sending}>
                {sending ? "Đang gửi..." : "Gửi ngay ✉️"}
              </button>
            </div>
          </div>
        )}

        {/* STEP: sending */}
        {step === "sending" && (
          <div style={{padding:"60px 24px",textAlign:"center",flex:1}}>
            <div style={{fontSize:44,marginBottom:16,animation:"spin 1.2s linear infinite",display:"inline-block"}}>📤</div>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:"var(--ink)"}}>Đang gửi...</p>
            <p style={{fontSize:13,color:"var(--ink3)",marginTop:8}}>Đang upload CV và gửi email đến nhà tuyển dụng</p>
          </div>
        )}

        {/* STEP: success */}
        {step === "success" && (
          <div style={{padding:"60px 24px",textAlign:"center",flex:1}}>
            <div style={{fontSize:52,marginBottom:16}}>🎉</div>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:700,color:"var(--green)"}}>Đã gửi thành công!</p>
            <p style={{fontSize:14,color:"var(--ink2)",marginTop:8,lineHeight:1.6}}>Email ứng tuyển đã được gửi đến<br/><strong>{job["Email"]}</strong></p>
            <p style={{fontSize:12,color:"var(--ink3)",marginTop:10}}>Nhà tuyển dụng sẽ trả lời vào email của bạn.</p>
          </div>
        )}

        {/* STEP: error */}
        {step === "error" && (
          <div style={{padding:"40px 24px 28px",flex:1}}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:44,marginBottom:12}}>⚠️</div>
              <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:"var(--red)"}}>Gửi thất bại</p>
              <p style={{fontSize:13,color:"var(--ink2)",marginTop:8,lineHeight:1.6}}>{errorMsg}</p>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={onClose} style={{flex:1,padding:"14px",border:"1.5px solid var(--border)",borderRadius:6,background:"white",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Jost',sans-serif",color:"var(--ink2)"}}>Đóng</button>
              <button className="apply-btn" style={{flex:2}} onClick={() => { setStep("preview"); setSending(false); }}>Thử lại →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────
export default function JobDiscovery() {
  const isMobile = useIsMobile();
  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState("");
  const [salary, setSalary]     = useState([0, 50]);
  const [opts, setOpts]         = useState({ areas:[], districts:[], levels:[], workModes:[] });
  const [filters, setFilters]   = useState({ preset:"All", areas:[], districts:[], levels:[], workModes:[] });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Quick Apply state
  const [applyJob, setApplyJob]   = useState(null);  // job đang apply
  const [appliedIds, setAppliedIds] = useState(() => {
    try { return Object.keys(JSON.parse(localStorage.getItem(APPLIED_KEY) || "{}")); } catch { return []; }
  });

  useEffect(() => {
    if (isMobile && (selected || drawerOpen || applyJob)) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, selected, drawerOpen, applyJob]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${SHEET_API}/Jobs`);
        const data = await r.json();
        const norm = data
          .map(j => normalizeJob(j, data))
          .filter(j => j.freshnessStatus !== "hidden")
          .sort((a, b) => b.finalScore - a.finalScore);
        setJobs(norm);
        setOpts(deriveOptions(norm));
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const toggle = useCallback((cat, val) => {
    setFilters(p => ({
      ...p,
      [cat]: p[cat].includes(val) ? p[cat].filter(i => i !== val) : [...p[cat], val]
    }));
  }, []);

  const reset = () => {
    setFilters({ preset:"All", areas:[], districts:[], levels:[], workModes:[] });
    setSalary([0, 50]);
    setSearch("");
  };

  const processed = useMemo(() => jobs.filter(j => {
    const q = search.toLowerCase();
    if (q && !`${j["Vị Trí"]} ${j["Tên Công Ty"]} ${j["Kỹ Năng"]||""} ${j.district} ${j.workMode}`.toLowerCase().includes(q)) return false;
    if (filters.areas.length      && !filters.areas.includes(j.area))          return false;
    if (filters.districts.length  && !filters.districts.includes(j.district))  return false;
    if (filters.levels.length     && !filters.levels.includes(j["Level"]))     return false;
    if (filters.workModes.length  && !filters.workModes.includes(j.workMode))  return false;
    if (j.salaryMax > 0 && (j.salaryMax < salary[0]*1_000_000 || j.salaryMax > salary[1]*1_000_000)) return false;
    const p = filters.preset;
    if (p === "New"        && j.freshnessStatus !== "new")                      return false;
    if (p === "HighSalary" && j.salaryMax < 15_000_000)                         return false;
    if (p === "Remote"     && !j.isRemote)                                      return false;
    if (p === "POD"        && !(j["Vị Trí"]||"").toUpperCase().includes("POD")) return false;
    if (p === "EasyApply"  && (!j["Email"] || j["Email"] === "Không rõ"))       return false;
    return true;
  }), [jobs, search, filters, salary]);

  const isFiltering = search || filters.preset !== "All" || filters.areas.length ||
    filters.districts.length || filters.levels.length || filters.workModes.length ||
    salary[0] > 0 || salary[1] < 50;
  const activeCount = filters.areas.length + filters.districts.length + filters.levels.length
    + filters.workModes.length
    + (filters.preset !== "All" ? 1 : 0)
    + (salary[0] > 0 || salary[1] < 50 ? 1 : 0);

  const newJobs    = useMemo(() => processed.filter(j => j.freshnessStatus === "new").slice(0,8), [processed]);
  const topSalary  = useMemo(() => [...processed].sort((a,b) => b.salaryMax - a.salaryMax).filter(j => j.salaryMax > 0).slice(0,8), [processed]);
  const podJobs    = useMemo(() => processed.filter(j => (j["Vị Trí"]||"").toUpperCase().includes("POD")).slice(0,8), [processed]);
  const central    = useMemo(() => processed.filter(j => j.area === "Central").slice(0,8), [processed]);
  const remoteJobs = useMemo(() => processed.filter(j => j.isRemote).slice(0,8), [processed]);

  const todayN  = jobs.filter(j => j.daysOld <= 1).length;
  const emailN  = jobs.filter(j => j["Email"] && j["Email"] !== "Không rõ").length;
  const remoteN = jobs.filter(j => j.isRemote).length;

  const P = isMobile ? "16px" : "32px";

  // Callback khi apply thành công
  const handleApplySuccess = useCallback((jobId) => {
    setAppliedIds(prev => [...prev, jobId]);
    setApplyJob(null);
    // Cập nhật lại job trong danh sách nếu đang xem
    if (selected?.jobId === jobId) setSelected(prev => prev ? {...prev, _applied: true} : null);
  }, [selected]);

  if (loading) return (
    <div style={{background:"#F4EFE8",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:52,marginBottom:14,animation:"spin 1.5s linear infinite",display:"inline-block"}}>⚙️</div>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:"#7A6A58",letterSpacing:"0.2em",textTransform:"uppercase"}}>Loading…</p>
      </div>
    </div>
  );

  return (
    <div style={{background:"linear-gradient(180deg,#EDE5D5 0%,#F4EFE8 30%,#F0EAE0 100%)",minHeight:"100vh",fontFamily:"'Jost',sans-serif",color:"#28200F",position:"relative"}}>
      <style>{CSS}</style>
      <NatureBackground />

      {/* ══════════ HEADER ══════════ */}
      <header style={{background:"rgba(255,252,248,0.88)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderBottom:"1.5px solid var(--border)",boxShadow:"0 2px 16px rgba(40,32,15,0.06)",position:"relative",zIndex:10}}>
        <div style={{maxWidth:1440,margin:"0 auto",padding:`${isMobile?"14px":"24px"} ${P}`}}>
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            {/* Brand */}
            <div style={{flexShrink:0,paddingRight:isMobile?0:20,borderRight:isMobile?"none":"1.5px solid var(--border)"}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMobile?26:34,fontWeight:700,letterSpacing:"-0.01em",color:"var(--ink)",lineHeight:1}}>
                DA NANG<span style={{color:"var(--acc)"}}>Ecom</span>
              </div>
              <div style={{fontFamily:"Inconsolata,monospace",fontSize:10,color:"var(--ink3)",letterSpacing:"0.16em",textTransform:"uppercase",marginTop:4}}>
                {jobs.length} jobs · <span style={{color:"var(--green)"}}>{todayN} mới hôm nay</span>
              </div>
            </div>

            {/* Search */}
            <div style={{flex:1,minWidth:180,position:"relative"}}>
              <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16,opacity:0.35,pointerEvents:"none"}}>🔍</span>
              <input className="sinput" style={{paddingLeft:44}} type="text" value={search}
                placeholder={isMobile?"Tìm vị trí, kỹ năng...":"Tìm vị trí, công ty, kỹ năng, quận, remote..."}
                onChange={e => setSearch(e.target.value)} />
              {search && <button className="search-clear" onClick={() => setSearch("")}>✕</button>}
            </div>

            {/* Stats desktop */}
            {!isMobile && (
              <div style={{display:"flex",gap:24,flexShrink:0,paddingLeft:20,borderLeft:"1.5px solid var(--border)"}}>
                {[
                  {v:jobs.length, l:"Active",   c:"var(--ink)"},
                  {v:todayN,      l:"Hôm nay",  c:"var(--green)"},
                  {v:remoteN,     l:"Remote",   c:"var(--acc)"},
                  {v:emailN,      l:"Có Email", c:"var(--ink)"},
                ].map(({v,l,c}) => (
                  <div key={l} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,color:c,lineHeight:1}}>{v}</span>
                    <span style={{fontFamily:"Inconsolata,monospace",fontSize:10,color:"var(--ink3)",textTransform:"uppercase",letterSpacing:"0.12em"}}>{l}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Toggle filter */}
            {!isMobile && (
              <button onClick={() => setFiltersOpen(o => !o)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:7,padding:"10px 16px",background:filtersOpen?"var(--ink)":"white",color:filtersOpen?"var(--bg)":"var(--ink2)",border:"1.5px solid var(--border)",borderRadius:6,cursor:"pointer",fontFamily:"'Jost',sans-serif",fontSize:13,fontWeight:600,letterSpacing:"0.04em",transition:"all 0.2s ease"}}>
                <span style={{fontSize:14}}>⚙️</span>
                Bộ lọc
                {activeCount > 0 && (
                  <span style={{background:filtersOpen?"rgba(255,255,255,0.25)":"var(--acc)",color:"white",borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:700}}>{activeCount}</span>
                )}
              </button>
            )}
          </div>

          {/* Filter panel collapsible desktop */}
          {!isMobile && (
            <div style={{maxHeight:filtersOpen?"600px":"0px",opacity:filtersOpen?1:0,overflow:"hidden",transition:"max-height 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease"}}>
              <div style={{borderTop:"1px solid var(--border)",paddingTop:18,marginTop:16,display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start"}}>
                <div style={{display:"flex",flexDirection:"column",gap:10,flexShrink:0}}>
                  <span style={{fontFamily:"Inconsolata,monospace",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.18em",color:"var(--ink3)"}}>Quick</span>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {[
                      {k:"New",e:"🕐",l:"Mới nhất"},
                      {k:"HighSalary",e:"💰",l:"Lương >15M"},
                      {k:"Remote",e:"💻",l:"Remote"},
                      {k:"POD",e:"🚀",l:"POD Only"},
                      {k:"EasyApply",e:"🎯",l:"Easy Apply"},
                    ].map(({k,e,l}) => (
                      <button key={k} className={`preset-chip${filters.preset===k?" on":""}`}
                        onClick={() => setFilters(f => ({...f,preset:f.preset===k?"All":k}))}>
                        <span>{e}</span>{l}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{width:1,background:"var(--border)",alignSelf:"stretch"}} />
                {opts.workModes.length > 0 && (
                  <FilterBlock label="Hình thức">
                    {opts.workModes.map(m => (
                      <button key={m} className={`fpill${filters.workModes.includes(m)?" on":""}`} onClick={() => toggle("workModes",m)}>
                        {m === "Remote" ? "💻 Remote" : m === "Onsite" ? "🏢 Onsite" : m === "Hybrid" ? "🔀 Hybrid" : m}
                      </button>
                    ))}
                  </FilterBlock>
                )}
                <div style={{width:1,background:"var(--border)",alignSelf:"stretch"}} />
                {opts.areas.length > 0 && (
                  <FilterBlock label="Khu vực">
                    {opts.areas.map(a => (
                      <button key={a} className={`fpill${filters.areas.includes(a)?" on":""}`} onClick={() => toggle("areas",a)}>
                        {AREA_LABELS[a]||a}
                      </button>
                    ))}
                  </FilterBlock>
                )}
                <div style={{width:1,background:"var(--border)",alignSelf:"stretch"}} />
                {opts.districts.length > 0 && (
                  <FilterBlock label="Quận">
                    {opts.districts.map(d => (
                      <button key={d} className={`fpill${filters.districts.includes(d)?" on":""}`} onClick={() => toggle("districts",d)}>{d}</button>
                    ))}
                  </FilterBlock>
                )}
                <div style={{width:1,background:"var(--border)",alignSelf:"stretch"}} />
                {opts.levels.length > 0 && (
                  <FilterBlock label="Level">
                    {opts.levels.map(l => (
                      <button key={l} className={`fpill${filters.levels.includes(l)?" on":""}`} onClick={() => toggle("levels",l)}>{l}</button>
                    ))}
                  </FilterBlock>
                )}
                <div style={{width:1,background:"var(--border)",alignSelf:"stretch"}} />
                <SalaryFilter salary={salary} setSalary={setSalary} />
                {isFiltering && (
                  <button onClick={reset} className="reset-btn" style={{alignSelf:"flex-end"}}>✕ Reset</button>
                )}
              </div>
            </div>
          )}

          {/* Active filter chips desktop collapsed */}
          {!isMobile && !filtersOpen && activeCount > 0 && (
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:12,flexWrap:"wrap"}}>
              <span style={{fontFamily:"Inconsolata,monospace",fontSize:11,color:"var(--ink3)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Lọc:</span>
              {filters.preset !== "All" && <Chip>{filters.preset}</Chip>}
              {filters.workModes.map(m => <Chip key={m}>{m}</Chip>)}
              {filters.areas.map(a => <Chip key={a}>{a}</Chip>)}
              {filters.districts.map(d => <Chip key={d}>{d}</Chip>)}
              {filters.levels.map(l => <Chip key={l}>{l}</Chip>)}
              {(salary[0]>0||salary[1]<50) && <Chip>{salary[0]}M–{salary[1]}M</Chip>}
              <span style={{fontFamily:"Inconsolata,monospace",fontSize:11,color:"var(--green)",fontWeight:700,marginLeft:4}}>{processed.length} kết quả</span>
              <button onClick={reset} style={{fontSize:11,fontWeight:700,color:"var(--red)",background:"#FEF0F0",border:"1px solid #F5AAAA",borderRadius:4,padding:"3px 10px",cursor:"pointer",fontFamily:"'Jost',sans-serif",marginLeft:4}}>✕</button>
            </div>
          )}
        </div>
      </header>

      {/* ══════════ MAIN ══════════ */}
      <main style={{maxWidth:1440,margin:"0 auto",padding:`${isMobile?"20px":"40px"} ${P} ${isMobile?"100px":"80px"}`,position:"relative",zIndex:1}}>
        {isMobile && isFiltering && (
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            <span style={{fontFamily:"Inconsolata,monospace",fontSize:12,color:"var(--ink3)"}}>{processed.length} kết quả</span>
            {activeCount > 0 && (
              <span style={{fontFamily:"Inconsolata,monospace",fontSize:11,background:"var(--acc)",color:"white",borderRadius:20,padding:"2px 9px"}}>{activeCount} lọc</span>
            )}
            <button onClick={reset} style={{fontSize:12,fontWeight:700,color:"var(--red)",background:"#FEF0F0",border:"1px solid #F5AAAA",borderRadius:4,padding:"4px 10px",cursor:"pointer",fontFamily:"'Jost',sans-serif",marginLeft:"auto"}}>✕ Reset</button>
          </div>
        )}

        {isFiltering ? (
          <section>
            <SectionHead icon="🔍" title={isMobile?"Kết Quả":"Kết Quả Tìm Kiếm"} sub={`${processed.length} vị trí phù hợp`} isMobile={isMobile} />
            {processed.length === 0
              ? <Empty onReset={reset} />
              : <div className="card-grid">{processed.map((j,i) => <JobCard key={i} job={j} onClick={() => setSelected(j)} onQuickApply={() => setApplyJob(j)} appliedIds={appliedIds} isMobile={isMobile} idx={i} />)}</div>
            }
          </section>
        ) : (
          <>
            {newJobs.length > 0    && <Shelf icon="🕐" title="Job Mới Nhất"     sub={`${newJobs.length} vị trí trong 3 ngày qua`}     jobs={newJobs}    onSel={setSelected} onQuickApply={setApplyJob} appliedIds={appliedIds} isMobile={isMobile} />}
            {topSalary.length > 0  && <Shelf icon="💰" title="Top Lương Cao"    sub="Sắp xếp theo lương cao nhất"                     jobs={topSalary}  onSel={setSelected} onQuickApply={setApplyJob} appliedIds={appliedIds} isMobile={isMobile} />}
            {remoteJobs.length > 0 && <Shelf icon="💻" title="Làm Việc Remote"  sub={`${remoteJobs.length} vị trí work from anywhere`} jobs={remoteJobs} onSel={setSelected} onQuickApply={setApplyJob} appliedIds={appliedIds} isMobile={isMobile} />}
            {podJobs.length > 0    && <Shelf icon="🚀" title="POD & E-Commerce" sub="Niche tăng trưởng — Thị trường quốc tế"          jobs={podJobs}    onSel={setSelected} onQuickApply={setApplyJob} appliedIds={appliedIds} isMobile={isMobile} />}
            {central.length > 0    && <Shelf icon="📍" title="Khu Trung Tâm"    sub="Hải Châu · Thanh Khê — Dễ đi làm"               jobs={central}    onSel={setSelected} onQuickApply={setApplyJob} appliedIds={appliedIds} isMobile={isMobile} />}
            <section style={{marginTop:isMobile?32:56}}>
              <SectionHead icon="📋" title="Tất Cả Cơ Hội" sub={`${processed.length} vị trí · Điểm cao nhất lên đầu`} isMobile={isMobile} />
              <div className="card-grid">
                {processed.map((j,i) => <JobCard key={i} job={j} onClick={() => setSelected(j)} onQuickApply={() => setApplyJob(j)} appliedIds={appliedIds} isMobile={isMobile} idx={i} />)}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Mobile FAB */}
      {isMobile && (
        <button className="filter-fab" onClick={() => setDrawerOpen(true)}>
          <span style={{fontSize:16}}>⚙️</span>
          Lọc{activeCount > 0 ? ` · ${activeCount}` : ""}
        </button>
      )}

      {/* Mobile Drawer */}
      {isMobile && drawerOpen && (
        <FilterDrawer
          opts={opts} filters={filters} salary={salary}
          toggle={toggle} setFilters={setFilters} setSalary={setSalary}
          reset={reset} processed={processed}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/* Detail Panel */}
      {selected && (
        <DetailPanel
          job={selected}
          onClose={() => setSelected(null)}
          isMobile={isMobile}
          onQuickApply={() => setApplyJob(selected)}
          appliedIds={appliedIds}
        />
      )}

      {/* Quick Apply Modal */}
      {applyJob && (
        <QuickApplyModal
          job={applyJob}
          onClose={() => setApplyJob(null)}
          onSuccess={handleApplySuccess}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Jost:wght@400;500;600;700&family=Inconsolata:wght@600&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root {
    --bg:#F4EFE8; --bg2:#EDE5D8; --bg3:#E4D9CA;
    --border:#CFC3B0; --ink:#28200F; --ink2:#5E5040; --ink3:#9C8C78;
    --acc:#B8621A; --acc2:#F0DCC8; --green:#3E6B48; --red:#A83030;
    --blue:#1A5A8A;
    --shadow:0 2px 12px rgba(40,32,15,0.07);
    --shadow2:0 8px 32px rgba(40,32,15,0.12);
  }
  html { -webkit-text-size-adjust:100%; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:var(--bg2); }
  ::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }

  .sinput {
    width:100%; padding:12px 18px; border:1.5px solid var(--border);
    background:white; font-size:16px; font-family:'Jost',sans-serif;
    color:var(--ink); outline:none; border-radius:6px;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    -webkit-appearance:none;
  }
  .sinput:focus { border-color:var(--acc); box-shadow:0 0 0 3px rgba(184,98,26,0.08); }
  .sinput::placeholder { color:var(--ink3); }

  .search-clear {
    position:absolute; right:14px; top:50%; transform:translateY(-50%);
    width:24px; height:24px; border-radius:50%; background:var(--bg3);
    border:none; font-size:11px; cursor:pointer; color:var(--ink3);
    display:flex; align-items:center; justify-content:center;
    transition: background 0.15s, color 0.15s;
  }
  .search-clear:hover { background:var(--ink); color:white; }

  .preset-chip {
    display:inline-flex; align-items:center; gap:7px;
    padding:9px 16px; font-size:13px; font-weight:600; letter-spacing:0.02em;
    border:1.5px solid var(--border); background:white; color:var(--ink2);
    cursor:pointer; border-radius:6px; font-family:'Jost',sans-serif; flex-shrink:0;
    transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
    white-space:nowrap; -webkit-tap-highlight-color:transparent;
  }
  .preset-chip:hover { border-color:var(--acc); color:var(--acc); background:#FFF8F2; transform:translateY(-1px); box-shadow:0 4px 12px rgba(184,98,26,0.15); }
  .preset-chip.on { background:var(--ink); color:var(--bg); border-color:var(--ink); transform:scale(1.02); box-shadow:0 4px 14px rgba(40,32,15,0.2); }
  .preset-chip:active { transform:scale(0.97); }

  .fpill {
    display:inline-flex; align-items:center;
    padding:7px 16px; font-size:13px; font-weight:600;
    border:1.5px solid var(--border); background:white; color:var(--ink2);
    cursor:pointer; border-radius:40px; font-family:'Jost',sans-serif;
    transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
    white-space:nowrap; min-height:38px; -webkit-tap-highlight-color:transparent;
  }
  .fpill:hover { border-color:var(--acc); color:var(--acc); transform:translateY(-1px); box-shadow:0 3px 10px rgba(184,98,26,0.12); }
  .fpill.on { background:var(--ink); color:var(--bg); border-color:var(--ink); box-shadow:0 4px 14px rgba(40,32,15,0.2); }
  .fpill:active { transform:scale(0.97); }

  .reset-btn {
    padding:9px 16px; font-size:12px; font-weight:700;
    color:var(--red); background:#FEF0F0; border:1.5px solid #F5AAAA;
    border-radius:4px; cursor:pointer; font-family:'Jost',sans-serif; letter-spacing:0.06em;
    transition: all 0.18s ease;
  }
  .reset-btn:hover { background:var(--red); color:white; border-color:var(--red); }

  input[type=range] {
    -webkit-appearance:none; width:100%; height:4px;
    background:var(--bg3); outline:none; cursor:pointer; border-radius:2px;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance:none; width:22px; height:22px;
    background:var(--ink); border-radius:50%; cursor:pointer;
    border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.18);
    transition:transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
  }
  input[type=range]::-webkit-slider-thumb:hover { transform:scale(1.2); }

  .jcard {
    background:white; border:1.5px solid var(--border); border-radius:8px;
    cursor:pointer; display:flex; flex-direction:column;
    transition: border-color 0.2s ease, box-shadow 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
    box-shadow:var(--shadow); -webkit-tap-highlight-color:transparent;
    animation: cardIn 0.4s cubic-bezier(0.16,1,0.3,1) both;
  }
  @keyframes cardIn { from{opacity:0;transform:translateY(14px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
  .jcard:hover { border-color:var(--acc); box-shadow:var(--shadow2); transform:translateY(-3px) scale(1.005); }
  @media(hover:none) { .jcard:hover { transform:none; } }
  .jcard:active { transform:scale(0.99); }

  .card-grid {
    display:grid;
    grid-template-columns:repeat(auto-fill,minmax(300px,1fr));
    gap:16px; align-items:stretch;
  }
  @media(max-width:767px) { .card-grid { grid-template-columns:1fr; gap:12px; } }

  .srow {
    display:grid;
    grid-template-columns:repeat(var(--cols,3),1fr);
    gap:16px; align-items:stretch;
  }
  @media(max-width:767px) { .srow { grid-template-columns:1fr !important; gap:12px; } }

  .shelf-nav { display:flex; justify-content:flex-end; gap:8px; margin-top:14px; }
  .nav-btn {
    width:40px; height:40px; border-radius:50%; background:white;
    border:1.5px solid var(--border); box-shadow:0 2px 8px rgba(40,32,15,0.08);
    cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center;
    transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); color:var(--ink); flex-shrink:0;
    -webkit-tap-highlight-color:transparent;
  }
  .nav-btn:hover { background:var(--ink); color:var(--bg); border-color:var(--ink); transform:scale(1.1); }
  .nav-btn:disabled { opacity:0.3; cursor:default; transform:none !important; }
  .nav-btn:disabled:hover { background:white; color:var(--ink); border-color:var(--border); }
  .nav-btn:active { transform:scale(0.95) !important; }

  .overlay {
    position:fixed; inset:0; background:rgba(40,32,15,0.55); z-index:200;
    display:flex; justify-content:flex-end;
    backdrop-filter:blur(2px); -webkit-backdrop-filter:blur(2px);
    animation: overlayIn 0.25s ease;
  }
  @keyframes overlayIn { from{opacity:0} to{opacity:1} }
  .panel {
    background:var(--bg); height:100%; overflow-y:auto; display:flex;
    flex-direction:column; animation:slideIn 0.32s cubic-bezier(0.16,1,0.3,1);
  }
  @keyframes slideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
  @keyframes modalIn { from{opacity:0;transform:scale(0.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @media(max-width:767px) {
    .overlay { align-items:flex-end; justify-content:center; }
    .panel { width:100% !important; height:92dvh !important; border-radius:20px 20px 0 0; animation:slideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
    @keyframes slideUp { from{opacity:0;transform:translateY(50px)} to{opacity:1;transform:translateY(0)} }
  }

  .filter-overlay {
    position:fixed; inset:0; z-index:300;
    background:rgba(40,32,15,0.5); backdrop-filter:blur(2px); -webkit-backdrop-filter:blur(2px);
    animation: overlayIn 0.2s ease;
  }
  .filter-sheet {
    position:absolute; bottom:0; left:0; right:0;
    background:var(--bg); border-radius:20px 20px 0 0;
    max-height:88dvh; overflow-y:auto;
    animation:sheetUp 0.3s cubic-bezier(0.16,1,0.3,1);
    padding-bottom:env(safe-area-inset-bottom,16px);
  }
  @keyframes sheetUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
  .sheet-handle { width:36px; height:4px; background:var(--border); border-radius:2px; margin:12px auto 0; }

  .filter-fab {
    position:fixed; bottom:24px; right:20px; z-index:90;
    background:var(--ink); color:var(--bg); border:none;
    border-radius:50px; padding:14px 22px;
    font-size:14px; font-weight:700; font-family:'Jost',sans-serif;
    box-shadow:0 8px 24px rgba(40,32,15,0.28); cursor:pointer;
    display:inline-flex; align-items:center; gap:8px; letter-spacing:0.04em;
    -webkit-tap-highlight-color:transparent;
    bottom:calc(24px + env(safe-area-inset-bottom,0px));
    transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;
  }
  .filter-fab:hover { transform:translateY(-2px) scale(1.04); box-shadow:0 12px 32px rgba(40,32,15,0.36); }
  .filter-fab:active { transform:scale(0.96); }

  .apply-btn {
    display:block; width:100%; padding:18px; background:var(--ink);
    color:var(--bg); font-weight:700; font-size:16px; letter-spacing:0.1em;
    text-transform:uppercase; text-align:center; text-decoration:none;
    transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
    border:none; cursor:pointer; border-radius:6px; font-family:'Jost',sans-serif;
    -webkit-tap-highlight-color:transparent;
  }
  .apply-btn:hover:not(:disabled) { background:var(--acc); transform:translateY(-1px); box-shadow:0 6px 20px rgba(184,98,26,0.3); }
  .apply-btn:disabled { opacity:0.6; cursor:not-allowed; }
  @media(max-width:767px) { .apply-btn { padding:20px; font-size:17px; border-radius:10px; } }

  .quick-apply-btn {
    display:inline-flex; align-items:center; justify-content:center; gap:6px;
    padding:10px 18px; background:var(--acc); color:white;
    font-weight:700; font-size:13px; letter-spacing:0.06em; text-transform:uppercase;
    border:none; cursor:pointer; border-radius:6px; font-family:'Jost',sans-serif;
    transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
    -webkit-tap-highlight-color:transparent; flex-shrink:0;
  }
  .quick-apply-btn:hover { background:#9A4E10; transform:translateY(-1px); box-shadow:0 4px 14px rgba(184,98,26,0.35); }
  .quick-apply-btn:active { transform:scale(0.97); }
  .quick-apply-btn.applied { background:var(--green); cursor:default; pointer-events:none; }

  /* Work mode badge */
  .work-badge-remote  { background:#E8F3FC; color:#1A5A8A; border:1px solid #9ECEF5; }
  .work-badge-onsite  { background:#F2F2F0; color:#5E5040; border:1px solid #CFC3B0; }
  .work-badge-hybrid  { background:#F0F8EC; color:#3E6B48; border:1px solid #A8D8A8; }

  @keyframes spin { to{transform:rotate(360deg)} }

  .card-grid > *:nth-child(1)  { animation-delay:0.02s }
  .card-grid > *:nth-child(2)  { animation-delay:0.04s }
  .card-grid > *:nth-child(3)  { animation-delay:0.06s }
  .card-grid > *:nth-child(4)  { animation-delay:0.08s }
  .card-grid > *:nth-child(5)  { animation-delay:0.10s }
  .card-grid > *:nth-child(6)  { animation-delay:0.12s }
  .card-grid > *:nth-child(7)  { animation-delay:0.14s }
  .card-grid > *:nth-child(8)  { animation-delay:0.16s }
  .card-grid > *:nth-child(n+9){ animation-delay:0.18s }
`;

// ─────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────
function Chip({ children }) {
  return (
    <span style={{display:"inline-flex",alignItems:"center",padding:"3px 10px",fontSize:11,fontWeight:700,fontFamily:"Inconsolata,monospace",background:"var(--ink)",color:"var(--bg)",borderRadius:20,whiteSpace:"nowrap",letterSpacing:"0.04em"}}>
      {children}
    </span>
  );
}

function FilterBlock({ label, children }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <span style={{fontFamily:"Inconsolata,monospace",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.18em",color:"var(--ink3)"}}>{label}</span>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>{children}</div>
    </div>
  );
}

function SalaryFilter({ salary, setSalary }) {
  return (
    <FilterBlock label={`Lương: ${salary[0]}M – ${salary[1]}M`}>
      <div style={{display:"flex",flexDirection:"column",gap:8,minWidth:180}}>
        {[0,1].map(i => (
          <div key={i} style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontFamily:"Inconsolata,monospace",fontSize:12,color:"var(--acc)",width:30,textAlign:"right"}}>{salary[i]}M</span>
            <input type="range" min={0} max={50} step={1} value={salary[i]} style={{flex:1}}
              onChange={e => { const v = +e.target.value; setSalary(s => i===0?[v,s[1]]:[s[0],v]); }} />
          </div>
        ))}
      </div>
    </FilterBlock>
  );
}

function DrawerBlock({ label, children }) {
  return (
    <div style={{marginBottom:24}}>
      <div style={{fontFamily:"Inconsolata,monospace",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.16em",color:"var(--ink3)",marginBottom:12}}>{label}</div>
      {children}
    </div>
  );
}

function SectionHead({ icon, title, sub, isMobile }) {
  return (
    <div style={{marginBottom:isMobile?14:24}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
        <span style={{fontSize:isMobile?20:24}}>{icon}</span>
        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMobile?22:30,fontWeight:700,color:"var(--ink)"}}>{title}</span>
      </div>
      {sub && <p style={{fontFamily:"Inconsolata,monospace",fontSize:isMobile?10:12,color:"var(--ink3)",letterSpacing:"0.1em",textTransform:"uppercase",marginLeft:isMobile?30:34}}>{sub}</p>}
    </div>
  );
}

function Tag({ name }) {
  const cfg = TAG_CFG[name] || {bg:"#EEE",color:"#444",border:"#CCC"};
  return (
    <span style={{display:"inline-flex",alignItems:"center",padding:"4px 9px",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",borderRadius:3,fontFamily:"Inconsolata,monospace",background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`}}>
      {name}
    </span>
  );
}

function WorkModeBadge({ mode }) {
  const cls = mode === "Remote" ? "work-badge-remote" : mode === "Hybrid" ? "work-badge-hybrid" : "work-badge-onsite";
  const icon = mode === "Remote" ? "💻" : mode === "Hybrid" ? "🔀" : "🏢";
  return (
    <span className={cls} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",fontSize:10,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",borderRadius:20,fontFamily:"Inconsolata,monospace"}}>
      {icon} {mode}
    </span>
  );
}

// Quick Apply Button — hiển thị trạng thái applied / eligible / external
function QuickApplyButton({ job, appliedIds, onQuickApply, size = "normal" }) {
  const isApplied = appliedIds.includes(job.jobId);
  const eligible  = job.applyEligibility === "quick_apply_available";
  const pad = size === "small" ? "8px 14px" : "10px 18px";
  const fz  = size === "small" ? 12 : 13;

  if (isApplied) {
    return (
      <span className="quick-apply-btn applied" style={{padding:pad,fontSize:fz}}>
        ✓ Đã apply
      </span>
    );
  }
  if (eligible) {
    return (
      <button className="quick-apply-btn" style={{padding:pad,fontSize:fz}}
        onClick={e => { e.stopPropagation(); onQuickApply(job); }}>
        ✉ Apply nhanh
      </button>
    );
  }
  return null; // external only hoặc unavailable → không hiện nút
}

// ─────────────────────────────────────────────────────────────
// SHELF
// ─────────────────────────────────────────────────────────────
function Shelf({ icon, title, sub, jobs, onSel, onQuickApply, appliedIds, isMobile }) {
  const [page, setPage] = useState(0);
  const PER = isMobile ? 2 : 3;
  const total = Math.ceil(jobs.length / PER);
  const visible = jobs.slice(page * PER, (page+1) * PER);
  return (
    <section style={{marginBottom:isMobile?32:52}}>
      <SectionHead icon={icon} title={title} sub={sub} isMobile={isMobile} />
      <div className="srow" style={{"--cols": PER}}>
        {visible.map((j,i) => (
          <div key={`${page}-${i}`} style={{height:"100%"}}>
            <JobCard job={j} onClick={() => onSel(j)} onQuickApply={onQuickApply} appliedIds={appliedIds} isMobile={isMobile} idx={i} />
          </div>
        ))}
        {Array.from({length: PER - visible.length}).map((_,i) => <div key={`e${i}`} />)}
      </div>
      {total > 1 && (
        <div className="shelf-nav">
          <span style={{fontSize:12,color:"var(--ink3)",fontFamily:"Inconsolata,monospace",alignSelf:"center",marginRight:4}}>{page+1}/{total}</span>
          <button className="nav-btn" disabled={page===0} onClick={() => setPage(p => p-1)}>←</button>
          <button className="nav-btn" disabled={page>=total-1} onClick={() => setPage(p => p+1)}>→</button>
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// JOB CARD
// ─────────────────────────────────────────────────────────────
function JobCard({ job, onClick, onQuickApply, appliedIds, isMobile, idx = 0 }) {
  const { salaryMax:sMax, salaryMin:sMin } = job;
  const salLabel = sMax
    ? (sMin && sMin !== sMax ? `${Math.round(sMin/1_000_000)}M – ${Math.round(sMax/1_000_000)}M` : `${Math.round(sMax/1_000_000)}M`)
    : "Cạnh tranh";
  const freshLabel = job.daysOld===0?"Hôm nay":job.daysOld===1?"Hôm qua":job.daysOld<99?`${job.daysOld}n`:"";
  const pad = isMobile ? "14px 16px 0" : "20px 22px 0";
  const eligible = job.applyEligibility === "quick_apply_available";
  const isApplied = appliedIds.includes(job.jobId);

  return (
    <div className="jcard" onClick={onClick} style={{height:"100%",animationDelay:`${Math.min(idx*0.04,0.3)}s`}}>
      <div style={{padding:pad}}>
        {/* Tags row */}
        <div style={{display:"flex",gap:5,flexWrap:"wrap",minHeight:22,marginBottom:10}}>
          {job.tags.slice(0,3).map(t => <Tag key={t} name={t} />)}
          <WorkModeBadge mode={job.workMode} />
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:13,fontWeight:700,color:"var(--acc)",textTransform:"uppercase",letterSpacing:"0.04em"}}>{job["Tên Công Ty"]}</span>
            {job.isVerified && <span style={{fontSize:9,fontWeight:700,background:"var(--acc)",color:"white",padding:"2px 6px",borderRadius:3}}>✓</span>}
          </div>
          <span style={{fontSize:11,fontWeight:600,color:"var(--ink3)",textTransform:"uppercase",background:"var(--bg2)",padding:"2px 9px",borderRadius:20}}>{job["Level"]}</span>
        </div>
        <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMobile?20:22,fontWeight:700,lineHeight:1.2,color:"var(--ink)",marginBottom:10}}>
          {job["Vị Trí"]}
        </h3>
        <div style={{display:"flex",alignItems:"baseline",gap:5,marginBottom:8}}>
          <span style={{fontFamily:"Inconsolata,monospace",fontSize:isMobile?22:24,fontWeight:600,color:"var(--acc)"}}>{salLabel}</span>
          {sMax > 0 && <span style={{fontSize:11,color:"var(--ink3)"}}>VND</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <span style={{fontSize:13,color:"var(--ink2)"}}>
            {job.isRemote ? "💻 Làm từ xa" : `📍 ${job.district && job.district !== "Không rõ" ? job.district : (job.area && job.area !== "Không rõ" ? job.area : "")}`}
          </span>
          {freshLabel && <span style={{fontFamily:"Inconsolata,monospace",fontSize:10,color:"var(--ink3)",background:"var(--bg2)",padding:"2px 8px",borderRadius:20}}>{freshLabel}</span>}
        </div>
        {job["Kỹ Năng"] && (
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:12}}>
            {job["Kỹ Năng"].split(",").slice(0,3).map(s=>s.trim()).filter(Boolean).map(s=>(
              <span key={s} style={{fontSize:10,padding:"3px 9px",border:"1px solid var(--border)",color:"var(--ink3)",borderRadius:20,fontWeight:500}}>{s}</span>
            ))}
          </div>
        )}
      </div>
      <div style={{flex:1}} />
      <div style={{padding:isMobile?"0 16px 16px":"0 22px 20px",marginTop:4}}>
        <div style={{borderTop:"1px solid var(--border)",paddingTop:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,color:"var(--ink3)",fontFamily:"Inconsolata,monospace",flexShrink:0}}>Score {job.finalScore}</span>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {(eligible || isApplied) && (
                <QuickApplyButton
                  job={job} appliedIds={appliedIds}
                  onQuickApply={onQuickApply} size="small"
                />
              )}
              <span style={{fontSize:13,fontWeight:700,color:"var(--acc)",letterSpacing:"0.04em",flexShrink:0}}>Xem →</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DETAIL PANEL
// ─────────────────────────────────────────────────────────────
function DetailPanel({ job, onClose, isMobile, onQuickApply, appliedIds }) {
  const [imgErr, setImgErr] = useState(false);
  const imgUrl = job["LINK ẢNH"];
  const grads = [
    "linear-gradient(145deg,#B8621A,#E09060)","linear-gradient(145deg,#3E6B48,#7DB88A)",
    "linear-gradient(145deg,#5E5040,#A08870)","linear-gradient(145deg,#A83030,#D88080)",
    "linear-gradient(145deg,#2A5E7A,#60A0C0)",
  ];
  const grad = grads[(job["Tên Công Ty"]||"").length % grads.length];
  const salLabel = job.salaryMax
    ? (job.salaryMin && job.salaryMin !== job.salaryMax
        ? `${Math.round(job.salaryMin/1_000_000)}M – ${Math.round(job.salaryMax/1_000_000)}M VND`
        : `Đến ${Math.round(job.salaryMax/1_000_000)}M VND`)
    : "Thỏa thuận";
  const rawDate = job["Ngày đăng bài"] || "";
  const postedDate = rawDate ? (rawDate.split(" ")[1] || rawDate) : "";
  const freshLabel = job.daysOld===0?"hôm nay":job.daysOld===1?"hôm qua":job.daysOld<99?`${job.daysOld} ngày trước`:"";

  const _d = job.district && job.district !== "Không rõ" ? job.district : "";
  const _a = job.area && job.area !== "Không rõ" ? job.area : "";
  const _addr = job["Địa chỉ"] && job["Địa chỉ"] !== "Không rõ" ? job["Địa chỉ"] : "";
  const locationDisplay = job.isRemote ? "Làm việc từ xa" : _d ? (_a && _a !== _d ? `${_d}, ${_a}` : _d) : _addr || _a || "";

  const isApplied = appliedIds.includes(job.jobId);
  const eligible  = job.applyEligibility === "quick_apply_available";

  const ImageBlock = () => (
    imgUrl && !imgErr
      ? <img src={imgUrl} alt="" onError={() => setImgErr(true)} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />
      : <div style={{width:"100%",height:"100%",background:grad,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:24}}>
          <span style={{fontSize:56,opacity:0.2}}>🏢</span>
          <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:"rgba(255,255,255,0.55)",textAlign:"center",lineHeight:1.3}}>{job["Tên Công Ty"]}</span>
        </div>
  );

  const Content = ({ padH }) => (
    <div style={{padding:`${isMobile?"18px":40}px ${padH}px ${isMobile?40:64}px`}}>
      {!isMobile && (
        <button onClick={onClose}
          style={{marginBottom:32,padding:"11px 24px",fontSize:14,fontWeight:600,fontFamily:"'Jost',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase",background:"white",border:"1.5px solid var(--border)",cursor:"pointer",color:"var(--ink2)",borderRadius:4,transition:"all 0.18s ease"}}
          onMouseEnter={e=>{e.currentTarget.style.background="var(--ink)";e.currentTarget.style.color="var(--bg)";}}
          onMouseLeave={e=>{e.currentTarget.style.background="white";e.currentTarget.style.color="var(--ink2)";}}>
          ← Đóng
        </button>
      )}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:isMobile?14:20}}>
        {job.tags.map(t => <Tag key={t} name={t} />)}
        <WorkModeBadge mode={job.workMode} />
        {job.isVerified && (
          <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 11px",fontSize:11,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",borderRadius:3,fontFamily:"Inconsolata,monospace",background:"#E8F3FC",color:"#1A5A8A",border:"1px solid #9ECEF5"}}>✓ Verified</span>
        )}
      </div>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMobile?30:44,fontWeight:700,lineHeight:1.05,color:"var(--ink)",marginBottom:6}}>{job["Vị Trí"]}</h2>
      <p style={{fontSize:isMobile?15:17,fontWeight:600,color:"var(--acc)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:isMobile?12:14}}>@ {job["Tên Công Ty"]}</p>
      {postedDate && (
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:24,padding:"6px 14px",marginBottom:isMobile?20:28}}>
          <span style={{fontSize:13}}>📅</span>
          <span style={{fontFamily:"Inconsolata,monospace",fontSize:isMobile?12:14,fontWeight:600,color:"var(--ink2)"}}>Đăng ngày {postedDate}</span>
          {freshLabel && <span style={{fontSize:12,color:"var(--ink3)"}}>· {freshLabel}</span>}
        </div>
      )}
      <div style={{height:1,background:"var(--border)",marginBottom:isMobile?18:28}} />

      {/* Info grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:isMobile?10:14,marginBottom:isMobile?22:32}}>
        {[
          {l:"Mức lương", v:salLabel,               a:"var(--acc)"},
          {l:"Địa điểm",  v:locationDisplay,         a:"var(--green)"},
          {l:"Level",     v:job["Level"]||"—",       a:"var(--ink2)"},
          {l:"Hình thức", v:job.workMode||"—",       a:job.isRemote?"var(--blue)":"var(--ink2)"},
        ].map(({l,v,a}) => (
          <div key={l} style={{background:"white",border:"1.5px solid var(--border)",borderRadius:6,padding:isMobile?"12px 14px":"16px 18px"}}>
            <div style={{fontFamily:"Inconsolata,monospace",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.14em",color:a,opacity:0.85,marginBottom:5}}>{l}</div>
            <div style={{fontSize:isMobile?14:16,fontWeight:700,color:"var(--ink)",lineHeight:1.3}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Platform */}
      {job["Platform"] && job["Platform"] !== "Không rõ" && (
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#FFF8F0",border:"1px solid #E8C9A0",borderRadius:6,padding:"8px 14px",marginBottom:isMobile?14:20}}>
          <span style={{fontFamily:"Inconsolata,monospace",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em",color:"var(--acc)"}}>Platform:</span>
          <span style={{fontSize:13,fontWeight:700,color:"var(--ink)"}}>{job["Platform"]}</span>
        </div>
      )}
      <div style={{height:1,background:"var(--border)",marginBottom:isMobile?18:28}} />

      {/* Nội dung */}
      {job["Nội Dung Gốc"] && (
        <div style={{marginBottom:isMobile?18:28}}>
          <div style={{fontFamily:"Inconsolata,monospace",fontSize:12,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.14em",color:"var(--ink3)",marginBottom:12}}>Mô tả công việc</div>
          <p style={{fontSize:isMobile?15:16,lineHeight:1.9,color:"var(--ink2)",whiteSpace:"pre-line"}}>{job["Nội Dung Gốc"]}</p>
        </div>
      )}
      {job["Phúc Lợi"] && (
        <div style={{background:"#FFF8F0",border:"1.5px solid #E8C9A0",borderRadius:6,padding:isMobile?"16px 18px":"22px 24px",marginBottom:isMobile?24:32}}>
          <div style={{fontFamily:"Inconsolata,monospace",fontSize:12,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.14em",color:"var(--acc)",marginBottom:10}}>Phúc lợi & Quyền lợi</div>
          <p style={{fontSize:isMobile?15:16,lineHeight:1.85,color:"var(--ink2)"}}>{job["Phúc Lợi"]}</p>
        </div>
      )}

      {/* Action buttons — Quick Apply + Apply gốc */}
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        {(eligible || isApplied) && (
          <QuickApplyButton
            job={job} appliedIds={appliedIds}
            onQuickApply={onQuickApply}
          />
        )}
        {job["LINK BÀI VIẾT"] && (
          <a href={job["LINK BÀI VIẾT"]} target="_blank" rel="noopener noreferrer"
            style={{display:"block",width:"100%",padding:"14px",background:"white",border:"1.5px solid var(--border)",color:"var(--ink2)",fontWeight:700,fontSize:14,letterSpacing:"0.06em",textTransform:"uppercase",textAlign:"center",textDecoration:"none",borderRadius:6,fontFamily:"'Jost',sans-serif",boxSizing:"border-box",transition:"all 0.18s ease"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--acc)";e.currentTarget.style.color="var(--acc)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.color="var(--ink2)";}}>
            Xem bài gốc ↗
          </a>
        )}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {job["Email"]&&job["Email"]!=="Không rõ" && <p style={{fontFamily:"Inconsolata,monospace",fontSize:isMobile?13:14,color:"var(--ink3)"}}>📧 {job["Email"]}</p>}
        {job["SĐT"]&&job["SĐT"]!=="Không rõ"     && <p style={{fontFamily:"Inconsolata,monospace",fontSize:isMobile?13:14,color:"var(--ink3)"}}>📞 {job["SĐT"]}</p>}
      </div>
    </div>
  );

  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel" style={{width:isMobile?"100%":"min(92vw,960px)"}} onClick={e => e.stopPropagation()}>
        {isMobile && <div style={{width:36,height:4,background:"var(--border)",borderRadius:2,margin:"12px auto 0",flexShrink:0}} />}
        {isMobile ? (
          <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0,overflowY:"auto"}}>
            <div style={{height:220,flexShrink:0,position:"relative",overflow:"hidden"}}>
              <ImageBlock />
              <div style={{position:"absolute",bottom:0,left:0,right:0,height:80,background:"linear-gradient(transparent,var(--bg))",pointerEvents:"none"}} />
              <button onClick={onClose} style={{position:"absolute",top:14,left:14,width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,0.92)",border:"none",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 10px rgba(0,0,0,0.15)"}}>←</button>
            </div>
            <Content padH={20} />
          </div>
        ) : (
          <div style={{display:"flex",height:"100%"}}>
            <div style={{width:"40%",flexShrink:0,position:"sticky",top:0,height:"100vh",overflow:"hidden"}}>
              <ImageBlock />
            </div>
            <div style={{flex:1,overflowY:"auto",background:"var(--bg)"}}>
              <Content padH={44} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FILTER DRAWER (mobile)
// ─────────────────────────────────────────────────────────────
function FilterDrawer({ opts, filters, salary, toggle, setFilters, setSalary, reset, processed, onClose }) {
  return (
    <div className="filter-overlay" onClick={onClose}>
      <div className="filter-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div style={{padding:"20px 20px 8px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
            <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:700,color:"var(--ink)"}}>Bộ lọc</span>
            <div style={{display:"flex",gap:8}}>
              <button onClick={reset} style={{fontSize:12,fontWeight:700,color:"var(--red)",background:"#FEF0F0",border:"1px solid #F5AAAA",borderRadius:4,padding:"7px 13px",cursor:"pointer",fontFamily:"'Jost',sans-serif"}}>✕ Xoá</button>
              <button onClick={onClose} style={{fontSize:13,fontWeight:700,color:"white",background:"var(--ink)",border:"none",borderRadius:4,padding:"7px 16px",cursor:"pointer",fontFamily:"'Jost',sans-serif"}}>Xong ✓</button>
            </div>
          </div>
          <DrawerBlock label="Quick filter">
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[{k:"New",e:"🕐",l:"Mới nhất"},{k:"HighSalary",e:"💰",l:"Lương >15M"},{k:"Remote",e:"💻",l:"Remote"},{k:"POD",e:"🚀",l:"POD Only"},{k:"EasyApply",e:"🎯",l:"Easy Apply"}].map(({k,e,l}) => (
                <button key={k} className={`preset-chip${filters.preset===k?" on":""}`} onClick={() => setFilters(f => ({...f,preset:f.preset===k?"All":k}))}><span>{e}</span>{l}</button>
              ))}
            </div>
          </DrawerBlock>
          {opts.workModes.length > 0 && (
            <DrawerBlock label="Hình thức làm việc">
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {opts.workModes.map(m => (
                  <button key={m} className={`fpill${filters.workModes.includes(m)?" on":""}`} onClick={() => toggle("workModes",m)}>
                    {m === "Remote" ? "💻 Remote" : m === "Onsite" ? "🏢 Onsite" : m === "Hybrid" ? "🔀 Hybrid" : m}
                  </button>
                ))}
              </div>
            </DrawerBlock>
          )}
          {opts.areas.length > 0 && (
            <DrawerBlock label="Khu vực">
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {opts.areas.map(a => <button key={a} className={`fpill${filters.areas.includes(a)?" on":""}`} onClick={() => toggle("areas",a)}>{AREA_LABELS[a]||a}</button>)}
              </div>
            </DrawerBlock>
          )}
          {opts.districts.length > 0 && (
            <DrawerBlock label="Quận">
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {opts.districts.map(d => <button key={d} className={`fpill${filters.districts.includes(d)?" on":""}`} onClick={() => toggle("districts",d)}>{d}</button>)}
              </div>
            </DrawerBlock>
          )}
          {opts.levels.length > 0 && (
            <DrawerBlock label="Level">
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {opts.levels.map(l => <button key={l} className={`fpill${filters.levels.includes(l)?" on":""}`} onClick={() => toggle("levels",l)}>{l}</button>)}
              </div>
            </DrawerBlock>
          )}
          <DrawerBlock label={`Lương: ${salary[0]}M – ${salary[1]}M`}>
            <div style={{display:"flex",flexDirection:"column",gap:14,paddingTop:4}}>
              {[0,1].map(i => (
                <div key={i} style={{display:"flex",gap:12,alignItems:"center"}}>
                  <span style={{fontFamily:"Inconsolata,monospace",fontSize:13,color:"var(--acc)",width:32,flexShrink:0,textAlign:"right"}}>{salary[i]}M</span>
                  <input type="range" min={0} max={50} step={1} value={salary[i]} style={{flex:1}}
                    onChange={e => { const v = +e.target.value; setSalary(s => i===0?[v,s[1]]:[s[0],v]); }} />
                </div>
              ))}
            </div>
          </DrawerBlock>
          <div style={{padding:"8px 0 16px"}}>
            <button className="apply-btn" onClick={onClose}>Xem {processed.length} kết quả →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty({ onReset }) {
  return (
    <div style={{textAlign:"center",padding:"80px 0"}}>
      <div style={{fontSize:48,marginBottom:12}}>🔍</div>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:"var(--ink2)"}}>Không tìm thấy kết quả</p>
      <p style={{fontSize:13,color:"var(--ink3)",marginTop:6,marginBottom:20}}>Thử thay đổi bộ lọc hoặc từ khóa</p>
      <button onClick={onReset} style={{padding:"12px 28px",background:"var(--ink)",color:"var(--bg)",border:"none",cursor:"pointer",fontSize:14,fontWeight:600,borderRadius:6,fontFamily:"'Jost',sans-serif",letterSpacing:"0.06em"}}>
        Reset bộ lọc
      </button>
    </div>
  );
}
