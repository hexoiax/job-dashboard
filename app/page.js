"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const AREA_MAP = {
  "Hải Châu": "Central", "Thanh Khê": "Central",
  "Sơn Trà": "Beach", "Ngũ Hành Sơn": "Beach",
  "Liên Chiểu": "North", "Cẩm Lệ": "Airport", "Hòa Vang": "Suburban", "Hòa Xuân": "Airport",
};
const AREA_LABELS = {
  Central: "🏙 Central", Beach: "🌊 Beach", North: "🏭 North", Airport: "✈ Airport", Suburban: "🌿 Suburban", Remote: "💻 Remote",
};

// ─────────────────────────────────────────────
// DATA PIPELINE
// ─────────────────────────────────────────────
function normalizeJob(job, allJobs) {
  // Salary
  const parseSalary = (raw) => {
    if (!raw) return 0;
    const n = parseInt(raw.toString().replace(/\D/g, ''));
    if (!n) return 0;
    if (n < 1000) return n * 1_000_000;
    if (n < 500_000) return n * 1_000;
    return n;
  };
  const salaryMin = parseSalary(job["Lương Min"]);
  const salaryMax = parseSalary(job["Lương Max"]) || salaryMin;

  // Location
  const rawQuan = job["Quận"] || "";
  const rawAddr = job["Địa chỉ"] || "";
  const isRemote = rawAddr.toLowerCase().includes("remote") || rawAddr.toLowerCase().includes("tại nhà");
  const district = (!rawQuan || rawQuan === "Không rõ") ? "Không rõ" : rawQuan;
  const area = isRemote ? "Remote" : (AREA_MAP[district] || (rawAddr.includes("Huế") ? "Huế" : "Đà Nẵng"));

  // Freshness — format: "20:03:44 11/3/2026"
  let daysOld = 999;
  const rawDate = job["Ngày đăng bài"] || "";
  if (rawDate) {
    const datePart = rawDate.split(" ")[1];
    if (datePart) {
      const [d, m, y] = datePart.split("/");
      const parsed = new Date(`${y}-${m?.padStart(2,'0')}-${d?.padStart(2,'0')}`);
      if (!isNaN(parsed)) daysOld = Math.floor((Date.now() - parsed) / 86_400_000);
    }
  }
  let freshnessStatus = rawDate ? (daysOld <= 3 ? "new" : daysOld <= 7 ? "active" : "hidden") : "active";
  let freshnessBoost = daysOld <= 1 ? 10 : daysOld <= 3 ? 7 : daysOld <= 7 ? 4 : 0;

  // Score
  let score = 0;
  if (salaryMax >= 30_000_000) score += 30;
  else if (salaryMax >= 15_000_000) score += 20;
  else if (salaryMax >= 7_000_000) score += 10;
  if (salaryMin) score += 5;
  if (district !== "Không rõ") score += 3;
  if (job["Email"] && job["Email"] !== "Không rõ") score += 3;
  if (job["Phúc Lợi"]) score += 5;
  const titleUp = (job["Vị Trí"] || "").toUpperCase();
  if (titleUp.includes("POD")) score += 10;
  if (titleUp.includes("ECOMMERCE") || titleUp.includes("E-COMMERCE") || titleUp.includes("ECOM")) score += 8;
  const companyCount = allJobs.filter(j => j["Tên Công Ty"] === job["Tên Công Ty"]).length;
  if (companyCount >= 2) score += 5;
  score += freshnessBoost;

  // Tags
  const content = `${job["Vị Trí"] || ""} ${job["Nội Dung Gốc"] || ""}`.toLowerCase();
  const tags = [];
  if (freshnessStatus === "new") tags.push("NEW");
  if (score > 45) tags.push("HOT");
  if (content.includes("tuyển gấp") || content.includes("đi làm ngay") || content.includes("urgent")) tags.push("URGENT");
  if (salaryMax >= 20_000_000) tags.push("HIGH SALARY");
  if (isRemote) tags.push("REMOTE");

  return {
    ...job,
    salaryMin, salaryMax, district, area,
    daysOld, freshnessStatus, freshnessBoost,
    isVerified: companyCount >= 2,
    finalScore: score, tags,
  };
}

function deriveOptions(jobs) {
  const areas = [...new Set(jobs.map(j => j.area).filter(Boolean))].sort();
  const districts = [...new Set(jobs.map(j => j.district).filter(d => d !== "Không rõ"))].sort();
  const levels = [...new Set(jobs.map(j => j["Level"]).filter(Boolean))].sort();
  return { areas, districts, levels };
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
export default function JobDiscoveryV3() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [salaryRange, setSalaryRange] = useState([0, 50]);
  const [options, setOptions] = useState({ areas: [], districts: [], levels: [] });
  const [filters, setFilters] = useState({
    preset: "All", areas: [], districts: [], levels: [],
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('https://api.steinhq.com/v1/storages/69b224fbaffba40a625db5bd/Jobs');
        const data = await res.json();
        const normalized = data
          .map(j => normalizeJob(j, data))
          .filter(j => j.freshnessStatus !== "hidden")
          .sort((a, b) => b.finalScore - a.finalScore);
        setJobs(normalized);
        setOptions(deriveOptions(normalized));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const toggleFilter = useCallback((cat, val) => {
    setFilters(prev => {
      const list = prev[cat];
      return { ...prev, [cat]: list.includes(val) ? list.filter(i => i !== val) : [...list, val] };
    });
  }, []);

  const resetFilters = () => {
    setFilters({ preset: "All", areas: [], districts: [], levels: [] });
    setSalaryRange([0, 50]);
    setSearchTerm("");
  };

  const processed = useMemo(() => jobs.filter(j => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || `${j["Vị Trí"]} ${j["Tên Công Ty"]} ${j["Kỹ Năng"] || ""} ${j.district}`.toLowerCase().includes(q);
    const matchArea = !filters.areas.length || filters.areas.includes(j.area);
    const matchDist = !filters.districts.length || filters.districts.includes(j.district);
    const matchLevel = !filters.levels.length || filters.levels.includes(j["Level"]);
    const matchSalary = j.salaryMax === 0 || (j.salaryMax >= salaryRange[0] * 1_000_000 && j.salaryMax <= salaryRange[1] * 1_000_000);
    let matchPreset = true;
    if (filters.preset === "New") matchPreset = j.freshnessStatus === "new";
    if (filters.preset === "HighSalary") matchPreset = j.salaryMax >= 15_000_000;
    if (filters.preset === "Remote") matchPreset = j.area === "Remote";
    if (filters.preset === "POD") matchPreset = (j["Vị Trí"] || "").toUpperCase().includes("POD");
    if (filters.preset === "EasyApply") matchPreset = j["Email"] && j["Email"] !== "Không rõ";
    return matchSearch && matchArea && matchDist && matchLevel && matchSalary && matchPreset;
  }), [jobs, searchTerm, filters, salaryRange]);

  const isFiltering = searchTerm || filters.preset !== "All" || filters.areas.length || filters.districts.length || filters.levels.length || salaryRange[0] > 0 || salaryRange[1] < 50;

  // Intent sections
  const newJobs     = useMemo(() => processed.filter(j => j.freshnessStatus === "new").slice(0, 8), [processed]);
  const highSalary  = useMemo(() => [...processed].sort((a,b) => b.salaryMax - a.salaryMax).filter(j => j.salaryMax > 0).slice(0, 8), [processed]);
  const podJobs     = useMemo(() => processed.filter(j => (j["Vị Trí"]||"").toUpperCase().includes("POD") || (j["Platform"]||"").toUpperCase().includes("POD")).slice(0, 8), [processed]);
  const centralJobs = useMemo(() => processed.filter(j => j.area === "Central").slice(0, 8), [processed]);

  const activeCount = jobs.length;
  const todayCount  = jobs.filter(j => j.daysOld <= 1).length;
  const verifiedCount = jobs.filter(j => j.isVerified).length;

  if (loading) return (
    <div style={{ background: "#F5F0EB", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Playfair Display, serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
        <p style={{ color: "#8B7D6B", fontSize: 13, letterSpacing: "0.3em", textTransform: "uppercase" }}>Loading jobs...</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#F5F0EB", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: "#2C2416" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --sand: #F5F0EB;
          --sand-dark: #EDE6DC;
          --sand-border: #D9CFC3;
          --ink: #2C2416;
          --ink-light: #6B5E4E;
          --ink-faint: #A8998A;
          --accent: #C4773B;
          --accent-light: #F0E4D4;
          --green: #4A7C59;
          --red: #B94040;
          --gold: #C4A135;
        }
        .tag { display:inline-flex; align-items:center; padding:2px 8px; font-size:9px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; border-radius:2px; }
        .tag-new { background:#D4EDDA; color:#2D6A4F; border:1px solid #A8D5B5; }
        .tag-hot { background:#FDECEA; color:#B94040; border:1px solid #F5B8B8; }
        .tag-urgent { background:#FEF3CD; color:#856404; border:1px solid #F8D775; }
        .tag-salary { background:#FFF3E0; color:#C4773B; border:1px solid #FFD9A8; }
        .tag-remote { background:#E8F4F8; color:#1A5276; border:1px solid #AED6F1; }
        .job-card { background:#FDFAF7; border:1px solid var(--sand-border); padding:20px; cursor:pointer; transition:all 0.2s; display:flex; flex-direction:column; gap:12px; position:relative; }
        .job-card:hover { border-color:var(--accent); box-shadow:0 8px 32px rgba(44,36,22,0.08); transform:translateY(-2px); }
        .chip { padding:5px 12px; font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; border:1.5px solid var(--sand-border); background:var(--sand-dark); color:var(--ink-light); cursor:pointer; transition:all 0.15s; white-space:nowrap; }
        .chip:hover { border-color:var(--accent); color:var(--accent); }
        .chip.active { background:var(--ink); color:var(--sand); border-color:var(--ink); }
        .filter-btn { padding:4px 10px; font-size:10px; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; border:1px solid var(--sand-border); background:white; color:var(--ink-light); cursor:pointer; transition:all 0.15s; }
        .filter-btn:hover { border-color:var(--ink-light); color:var(--ink); }
        .filter-btn.active { background:var(--ink); color:var(--sand); border-color:var(--ink); }
        .scroll-row { display:flex; gap:16px; overflow-x:auto; padding-bottom:8px; scrollbar-width:none; }
        .scroll-row::-webkit-scrollbar { display:none; }
        .apply-btn { display:block; width:100%; padding:16px; background:var(--ink); color:var(--sand); font-weight:700; font-size:13px; letter-spacing:0.15em; text-transform:uppercase; text-align:center; text-decoration:none; transition:background 0.2s; border:none; cursor:pointer; }
        .apply-btn:hover { background:var(--accent); }
        .panel-overlay { position:fixed; inset:0; background:rgba(44,36,22,0.5); z-index:100; display:flex; }
        .panel { background:var(--sand); height:100%; overflow-y:auto; display:flex; flex-direction:column; animation:panelIn 0.35s cubic-bezier(0.16,1,0.3,1); }
        @keyframes panelIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        .stat-item { display:flex; flex-direction:column; gap:2px; }
        input[type=range] { -webkit-appearance:none; width:100%; height:3px; background:var(--sand-border); outline:none; cursor:pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; background:var(--ink); border-radius:50%; cursor:pointer; }
        .section-title { font-family:'Playfair Display',serif; font-size:22px; font-weight:700; color:var(--ink); margin-bottom:4px; }
        .divider { height:1px; background:var(--sand-border); margin:0; }
        .img-fallback { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-family:'Playfair Display',serif; font-size:32px; font-weight:900; color:rgba(255,255,255,0.4); }
      `}</style>

      {/* ══════ HEADER ══════ */}
      <header style={{ background:"#FDFAF7", borderBottom:"1px solid var(--sand-border)", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"16px 24px" }}>

          {/* Row 1: Brand + Search + Presets */}
          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", marginBottom:14 }}>
            <div style={{ flexShrink:0 }}>
              <div style={{ fontFamily:"Playfair Display,serif", fontSize:24, fontWeight:900, letterSpacing:"-0.02em", color:"var(--ink)" }}>
                Job<span style={{ color:"var(--accent)" }}>Radar</span>
              </div>
              <div style={{ fontSize:9, letterSpacing:"0.25em", color:"var(--ink-faint)", textTransform:"uppercase", fontFamily:"DM Mono,monospace", marginTop:1 }}>
                {activeCount} active · <span style={{ color:"var(--green)" }}>{todayCount} hôm nay</span>
              </div>
            </div>

            <div style={{ flex:1, minWidth:200, position:"relative" }}>
              <input
                type="text" value={searchTerm}
                placeholder="Tìm vị trí, công ty, kỹ năng, quận..."
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width:"100%", padding:"10px 14px", border:"1.5px solid var(--sand-border)", background:"var(--sand)", outline:"none", fontSize:13, color:"var(--ink)", fontFamily:"DM Sans,sans-serif", transition:"border 0.15s" }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--sand-border)"}
              />
            </div>

            {/* Layer 1: Quick Presets */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[
                { key:"New", label:"🕐 Mới nhất" },
                { key:"HighSalary", label:"💰 >15M" },
                { key:"Remote", label:"💻 Remote" },
                { key:"POD", label:"🚀 POD" },
                { key:"EasyApply", label:"🎯 Easy Apply" },
              ].map(({ key, label }) => (
                <button key={key} className={`chip ${filters.preset === key ? "active" : ""}`}
                  onClick={() => setFilters(f => ({ ...f, preset: f.preset === key ? "All" : key }))}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="divider" style={{ marginBottom:12 }} />

          {/* Row 2: Layer 2-4 Filters */}
          <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>

            {/* Layer 2a: Area */}
            {options.areas.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.15em", color:"var(--ink-faint)", whiteSpace:"nowrap" }}>Vùng:</span>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  {options.areas.map(a => (
                    <button key={a} className={`filter-btn ${filters.areas.includes(a) ? "active" : ""}`}
                      onClick={() => toggleFilter("areas", a)}>
                      {AREA_LABELS[a] || a}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ height:20, width:1, background:"var(--sand-border)" }} />

            {/* Layer 2b: District */}
            {options.districts.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.15em", color:"var(--ink-faint)", whiteSpace:"nowrap" }}>Quận:</span>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  {options.districts.map(d => (
                    <button key={d} className={`filter-btn ${filters.districts.includes(d) ? "active" : ""}`}
                      onClick={() => toggleFilter("districts", d)}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ height:20, width:1, background:"var(--sand-border)" }} />

            {/* Layer 4: Level */}
            {options.levels.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.15em", color:"var(--ink-faint)", whiteSpace:"nowrap" }}>Level:</span>
                <div style={{ display:"flex", gap:4 }}>
                  {options.levels.map(l => (
                    <button key={l} className={`filter-btn ${filters.levels.includes(l) ? "active" : ""}`}
                      onClick={() => toggleFilter("levels", l)}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ height:20, width:1, background:"var(--sand-border)" }} />

            {/* Layer 3: Salary Slider */}
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.15em", color:"var(--ink-faint)", whiteSpace:"nowrap" }}>Lương:</span>
              <span style={{ fontSize:10, fontWeight:700, color:"var(--accent)", fontFamily:"DM Mono,monospace", whiteSpace:"nowrap" }}>{salaryRange[0]}M</span>
              <input type="range" min={0} max={50} step={1} value={salaryRange[0]} style={{ width:70 }}
                onChange={e => setSalaryRange([+e.target.value, salaryRange[1]])} />
              <span style={{ fontSize:10, color:"var(--ink-faint)" }}>–</span>
              <input type="range" min={0} max={50} step={1} value={salaryRange[1]} style={{ width:70 }}
                onChange={e => setSalaryRange([salaryRange[0], +e.target.value])} />
              <span style={{ fontSize:10, fontWeight:700, color:"var(--accent)", fontFamily:"DM Mono,monospace", whiteSpace:"nowrap" }}>{salaryRange[1]}M</span>
            </div>

            {isFiltering && (
              <button onClick={resetFilters} style={{ marginLeft:"auto", fontSize:10, fontWeight:700, color:"var(--red)", background:"none", border:"none", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.1em" }}>
                ✕ Reset
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ══════ TRUST BAR ══════ */}
      <div style={{ background:"var(--sand-dark)", borderBottom:"1px solid var(--sand-border)", padding:"10px 24px" }}>
        <div style={{ maxWidth:1400, margin:"0 auto", display:"flex", gap:32, alignItems:"center", flexWrap:"wrap" }}>
          <StatItem label="Active Jobs" value={activeCount} />
          <StatItem label="Mới hôm nay" value={todayCount} color="var(--green)" />
          <StatItem label="Verified Recruiter" value={verifiedCount} />
          <StatItem label="Có Email HR" value={jobs.filter(j => j["Email"] && j["Email"] !== "Không rõ").length} />
          {isFiltering && <span style={{ marginLeft:"auto", fontSize:11, fontWeight:700, color:"var(--accent)", fontFamily:"DM Mono,monospace" }}>{processed.length} kết quả</span>}
        </div>
      </div>

      {/* ══════ MAIN ══════ */}
      <main style={{ maxWidth:1400, margin:"0 auto", padding:"32px 24px" }}>

        {isFiltering ? (
          // ── FILTERED VIEW ──
          <section>
            <div style={{ marginBottom:24 }}>
              <div className="section-title">Kết quả tìm kiếm</div>
              <div style={{ fontSize:11, color:"var(--ink-faint)", fontFamily:"DM Mono,monospace", marginTop:4 }}>{processed.length} vị trí phù hợp</div>
            </div>
            {processed.length === 0 ? (
              <div style={{ textAlign:"center", padding:"80px 0", color:"var(--ink-faint)" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
                <p style={{ fontWeight:600, textTransform:"uppercase", letterSpacing:"0.1em", fontSize:13 }}>Không tìm thấy kết quả</p>
                <button onClick={resetFilters} style={{ marginTop:12, color:"var(--accent)", background:"none", border:"none", cursor:"pointer", fontWeight:700, fontSize:13, textDecoration:"underline" }}>Reset bộ lọc</button>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:16 }}>
                {processed.map((job, i) => <JobCard key={i} job={job} onClick={() => setSelectedJob(job)} />)}
              </div>
            )}
          </section>
        ) : (
          // ── INTENT SECTIONS ──
          <>
            {newJobs.length > 0 && <IntentSection icon="🕐" title="Job Mới Nhất" subtitle={`${newJobs.length} vị trí trong 3 ngày qua`} jobs={newJobs} onSelect={setSelectedJob} />}
            {highSalary.length > 0 && <IntentSection icon="💰" title="Top Lương Cao" subtitle="Sắp xếp theo mức lương cao nhất" jobs={highSalary} onSelect={setSelectedJob} />}
            {podJobs.length > 0 && <IntentSection icon="🚀" title="POD & E-Commerce" subtitle="Niche tăng trưởng — Thị trường quốc tế" jobs={podJobs} onSelect={setSelectedJob} />}
            {centralJobs.length > 0 && <IntentSection icon="📍" title="Khu Trung Tâm" subtitle="Hải Châu · Thanh Khê — Dễ đi làm" jobs={centralJobs} onSelect={setSelectedJob} />}

            <section style={{ marginTop:48 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20 }}>
                <div>
                  <div className="section-title">Tất Cả Cơ Hội</div>
                  <div style={{ fontSize:11, color:"var(--ink-faint)", fontFamily:"DM Mono,monospace", marginTop:4 }}>{processed.length} vị trí · Sắp xếp theo điểm</div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:16 }}>
                {processed.map((job, i) => <JobCard key={i} job={job} onClick={() => setSelectedJob(job)} />)}
              </div>
            </section>
          </>
        )}
      </main>

      {/* ══════ DETAIL PANEL ══════ */}
      {selectedJob && <DetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────

function StatItem({ label, value, color }) {
  return (
    <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
      <span style={{ fontSize:18, fontWeight:700, color: color || "var(--ink)", fontFamily:"Playfair Display,serif" }}>{value}</span>
      <span style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.15em", color:"var(--ink-faint)" }}>{label}</span>
    </div>
  );
}

function TagBadge({ tag }) {
  const cls = { "NEW":"tag-new", "HOT":"tag-hot", "URGENT":"tag-urgent", "HIGH SALARY":"tag-salary", "REMOTE":"tag-remote" }[tag] || "";
  return <span className={`tag ${cls}`}>{tag}</span>;
}

function IntentSection({ icon, title, subtitle, jobs, onSelect }) {
  return (
    <section style={{ marginBottom:40 }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:20 }}>{icon}</span>
          <span className="section-title">{title}</span>
        </div>
        <div style={{ fontSize:11, color:"var(--ink-faint)", fontFamily:"DM Mono,monospace", marginTop:3, marginLeft:28 }}>{subtitle}</div>
      </div>
      <div className="scroll-row">
        {jobs.map((job, i) => (
          <div key={i} style={{ flexShrink:0, width:260 }}>
            <JobCard job={job} onClick={() => onSelect(job)} />
          </div>
        ))}
      </div>
    </section>
  );
}

function JobCard({ job, onClick }) {
  const salary = job.salaryMax ? `${Math.round(job.salaryMax/1_000_000)}M` : "Cạnh tranh";
  const freshLabel = job.daysOld === 0 ? "Hôm nay" : job.daysOld === 1 ? "Hôm qua" : job.daysOld < 99 ? `${job.daysOld} ngày trước` : "";

  return (
    <div className="job-card" onClick={onClick}>
      {/* Tags */}
      {job.tags.length > 0 && (
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {job.tags.slice(0, 3).map(t => <TagBadge key={t} tag={t} />)}
        </div>
      )}

      {/* Company */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ fontSize:10, fontWeight:700, color:"var(--accent)", textTransform:"uppercase", letterSpacing:"0.06em" }}>
            {job["Tên Công Ty"]}
          </span>
          {job.isVerified && (
            <span style={{ fontSize:8, fontWeight:700, background:"var(--accent)", color:"white", padding:"1px 5px", borderRadius:2 }}>✓</span>
          )}
        </div>
        <span style={{ fontSize:9, color:"var(--ink-faint)", textTransform:"uppercase", letterSpacing:"0.1em" }}>{job["Level"]}</span>
      </div>

      {/* Title */}
      <h3 style={{ fontFamily:"Playfair Display,serif", fontSize:16, fontWeight:700, lineHeight:1.2, color:"var(--ink)" }}>
        {job["Vị Trí"]}
      </h3>

      {/* Salary + Location */}
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        <div style={{ fontSize:18, fontWeight:700, color:"var(--accent)", fontFamily:"DM Mono,monospace" }}>
          {salary}
          {job.salaryMin > 0 && job.salaryMax > job.salaryMin && (
            <span style={{ fontSize:10, fontWeight:500, color:"var(--ink-faint)", marginLeft:6 }}>
              ({Math.round(job.salaryMin/1_000_000)}M–{Math.round(job.salaryMax/1_000_000)}M)
            </span>
          )}
        </div>
        <div style={{ fontSize:11, color:"var(--ink-light)", display:"flex", gap:8 }}>
          <span>📍 {job.district !== "Không rõ" ? `${job.district}` : job.area}</span>
          {freshLabel && <span style={{ color:"var(--ink-faint)" }}>· {freshLabel}</span>}
        </div>
      </div>

      {/* Skills */}
      {job["Kỹ Năng"] && (
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {job["Kỹ Năng"].split(",").slice(0, 3).map(s => s.trim()).filter(Boolean).map(s => (
            <span key={s} style={{ fontSize:9, padding:"2px 7px", border:"1px solid var(--sand-border)", color:"var(--ink-faint)", textTransform:"uppercase", letterSpacing:"0.05em" }}>
              {s}
            </span>
          ))}
        </div>
      )}

      <div style={{ marginTop:"auto", paddingTop:12, borderTop:"1px solid var(--sand-border)" }}>
        <div style={{ fontSize:10, fontWeight:700, color:"var(--ink-light)", textTransform:"uppercase", letterSpacing:"0.12em", textAlign:"right" }}>
          Xem chi tiết →
        </div>
      </div>
    </div>
  );
}

// ─── SPLIT SCREEN DETAIL PANEL ───
function DetailPanel({ job, onClose }) {
  const [imgError, setImgError] = useState(false);
  const imgUrl = job["LINK ẢNH"];
  const salary = job.salaryMax
    ? (job.salaryMin && job.salaryMin !== job.salaryMax
        ? `${Math.round(job.salaryMin/1_000_000)}M – ${Math.round(job.salaryMax/1_000_000)}M VND`
        : `Đến ${Math.round(job.salaryMax/1_000_000)}M VND`)
    : "Thỏa thuận";

  // Fallback gradient from company name
  const gradients = [
    "linear-gradient(135deg,#C4773B,#E8A86A)",
    "linear-gradient(135deg,#4A7C59,#8FBC8F)",
    "linear-gradient(135deg,#6B5E4E,#A8998A)",
    "linear-gradient(135deg,#B94040,#E07070)",
    "linear-gradient(135deg,#2C6E8A,#5BA4C0)",
  ];
  const fallbackGrad = gradients[(job["Tên Công Ty"] || "").length % gradients.length];

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div style={{ flex:1 }} />
      <div className="panel" style={{ width:"min(90vw,900px)" }} onClick={e => e.stopPropagation()}>

        {/* SPLIT LAYOUT */}
        <div style={{ display:"flex", flex:1, minHeight:0 }}>

          {/* LEFT: IMAGE */}
          <div style={{ width:"42%", flexShrink:0, position:"sticky", top:0, height:"100vh", overflow:"hidden" }}>
            {imgUrl && !imgError ? (
              <img
                src={imgUrl}
                alt={job["Tên Công Ty"]}
                onError={() => setImgError(true)}
                style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
              />
            ) : (
              <div style={{ width:"100%", height:"100%", background:fallbackGrad, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
                <span style={{ fontSize:48, opacity:0.3 }}>🏢</span>
                <span style={{ fontFamily:"Playfair Display,serif", fontSize:18, fontWeight:700, color:"rgba(255,255,255,0.5)", textAlign:"center", padding:"0 24px" }}>
                  {job["Tên Công Ty"]}
                </span>
              </div>
            )}
          </div>

          {/* RIGHT: DETAIL */}
          <div style={{ flex:1, overflowY:"auto", padding:"32px 32px 40px", background:"var(--sand)" }}>

            {/* Close */}
            <button onClick={onClose} style={{ marginBottom:24, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.15em", background:"none", border:"1px solid var(--sand-border)", padding:"7px 16px", cursor:"pointer", color:"var(--ink-light)", transition:"all 0.15s" }}
              onMouseEnter={e => { e.target.style.background="var(--ink)"; e.target.style.color="var(--sand)"; }}
              onMouseLeave={e => { e.target.style.background="none"; e.target.style.color="var(--ink-light)"; }}>
              ← Đóng
            </button>

            {/* Tags */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
              {job.tags.map(t => <TagBadge key={t} tag={t} />)}
              {job.isVerified && (
                <span className="tag" style={{ background:"#E8F4FD", color:"#1A5276", border:"1px solid #AED6F1" }}>✓ Verified Recruiter</span>
              )}
            </div>

            {/* Title */}
            <h2 style={{ fontFamily:"Playfair Display,serif", fontSize:34, fontWeight:900, lineHeight:1.05, color:"var(--ink)", marginBottom:6 }}>
              {job["Vị Trí"]}
            </h2>
            <p style={{ fontSize:14, fontWeight:700, color:"var(--accent)", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:28 }}>
              @ {job["Tên Công Ty"]}
            </p>

            <div className="divider" style={{ marginBottom:24 }} />

            {/* Key Info Grid */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:28 }}>
              <InfoBox label="Mức lương" value={salary} accent="var(--accent)" />
              <InfoBox label="Địa điểm" value={job.district !== "Không rõ" ? `${job.district}, ${job.area}` : job["Địa chỉ"] || job.area} accent="var(--green)" />
              <InfoBox label="Level" value={job["Level"] || "—"} accent="var(--ink-light)" />
              <InfoBox label="Platform" value={job["Platform"] && job["Platform"] !== "Không rõ" ? job["Platform"] : "—"} accent="var(--ink-light)" />
            </div>

            {/* Freshness */}
            {job.daysOld < 99 && (
              <div style={{ fontSize:10, color:"var(--ink-faint)", fontFamily:"DM Mono,monospace", marginBottom:24 }}>
                Đăng {job.daysOld === 0 ? "hôm nay" : job.daysOld === 1 ? "hôm qua" : `${job.daysOld} ngày trước`} · Score: {job.finalScore}
              </div>
            )}

            <div className="divider" style={{ marginBottom:24 }} />

            {/* Description */}
            {job["Nội Dung Gốc"] && (
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.2em", color:"var(--ink-faint)", marginBottom:12 }}>Mô tả công việc</div>
                <p style={{ fontSize:13, lineHeight:1.8, color:"var(--ink-light)", whiteSpace:"pre-line" }}>{job["Nội Dung Gốc"]}</p>
              </div>
            )}

            {/* Benefits */}
            {job["Phúc Lợi"] && (
              <div style={{ background:"var(--accent-light)", border:"1px solid #E8C9A8", padding:"20px", marginBottom:28 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.2em", color:"var(--accent)", marginBottom:10 }}>Phúc lợi & Quyền lợi</div>
                <p style={{ fontSize:13, lineHeight:1.7, color:"var(--ink-light)" }}>{job["Phúc Lợi"]}</p>
              </div>
            )}

            {/* CTA */}
            <a href={job["LINK BÀI VIẾT"]} target="_blank" rel="noopener noreferrer" className="apply-btn">
              Apply Ngay →
            </a>

            {/* Contact */}
            <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:4 }}>
              {job["Email"] && job["Email"] !== "Không rõ" && (
                <p style={{ fontSize:10, color:"var(--ink-faint)", fontFamily:"DM Mono,monospace" }}>📧 {job["Email"]}</p>
              )}
              {job["SĐT"] && job["SĐT"] !== "Không rõ" && (
                <p style={{ fontSize:10, color:"var(--ink-faint)", fontFamily:"DM Mono,monospace" }}>📞 {job["SĐT"]}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value, accent }) {
  return (
    <div style={{ background:"var(--sand-dark)", border:"1px solid var(--sand-border)", padding:"14px 16px" }}>
      <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.2em", color: accent, opacity:0.7, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:700, color:"var(--ink)", lineHeight:1.3 }}>{value}</div>
    </div>
  );
}
