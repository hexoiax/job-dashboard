"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';

// ============================================================
// UTILS: DATA PIPELINE - Normalize raw Google Sheet data
// ============================================================
function normalizeJob(job, allJobs) {
  // --- Normalize Salary ---
  let salaryMin = 0, salaryMax = 0;
  const rawMin = job["Lương Min"] || "";
  const rawMax = job["Lương Max"] || "";

  const parseSalary = (raw) => {
    if (!raw) return 0;
    const str = raw.toString().replace(/\./g, '').replace(/,/g, '');
    const num = parseInt(str);
    if (!isNaN(num)) {
      if (num < 1000) return num * 1000000; // "15" → 15,000,000
      if (num < 100000) return num * 1000;  // "15000" → 15,000,000
      return num;
    }
    // Handle "10-15 triệu" format
    const match = str.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (match) return parseInt(match[1]) * 1000000;
    return 0;
  };

  salaryMin = parseSalary(rawMin);
  salaryMax = parseSalary(rawMax) || parseSalary(rawMin);

  // --- Normalize Location ---
  const rawAddr = job["Địa chỉ"] || "";
  let district = "Không rõ";
  let area = "Đà Nẵng";
  const districtKeywords = ["Hải Châu","Thanh Khê","Sơn Trà","Ngũ Hành Sơn","Liên Chiểu","Cẩm Lệ","Hòa Vang"];
  for (const d of districtKeywords) {
    if (rawAddr.includes(d)) { district = d; break; }
  }
  if (rawAddr.toLowerCase().includes("remote") || rawAddr.toLowerCase().includes("tại nhà")) area = "Remote";
  else if (rawAddr.includes("Huế")) area = "Huế";

  // --- Freshness Score ---
  let daysOld = 999;
  const rawDate = job["Ngày Đăng"] || job["Date"] || "";
  if (rawDate) {
    const parts = rawDate.split(/[/-]/);
    if (parts.length >= 3) {
      const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (!isNaN(d)) {
        daysOld = Math.floor((Date.now() - d.getTime()) / 86400000);
      }
    }
  }

  let freshnessStatus = "hidden";
  let freshnessScore = 0;
  if (daysOld <= 1) { freshnessStatus = "new"; freshnessScore = 10; }
  else if (daysOld <= 3) { freshnessStatus = "new"; freshnessScore = 7; }
  else if (daysOld <= 7) { freshnessStatus = "active"; freshnessScore = 3; }
  // No date = treat as active (can't hide if no date data)
  if (rawDate === "") { freshnessStatus = "active"; freshnessScore = 0; }

  // --- Auto Tags ---
  const content = `${job["Vị Trí"] || ""} ${job["Nội Dung Gốc"] || ""} ${job["Phúc Lợi"] || ""}`.toLowerCase();
  const tags = [];
  if (salaryMax >= 20000000) tags.push("HIGH SALARY");
  if (area === "Remote") tags.push("REMOTE");
  if (content.includes("tuyển gấp") || content.includes("đi làm ngay") || content.includes("urgent")) tags.push("URGENT");

  // Trust: company repeat
  const companyCount = allJobs.filter(j => j["Tên Công Ty"] === job["Tên Công Ty"]).length;
  const isVerified = companyCount >= 2;

  // --- Score Engine ---
  let score = 0;
  if (salaryMax >= 30000000) score += 30;
  else if (salaryMax >= 15000000) score += 20;
  else if (salaryMax >= 7000000) score += 10;
  if (salaryMin) score += 5;
  if (rawAddr && rawAddr !== "Không rõ") score += 3;
  if (job["Email"] && job["Email"] !== "Không rõ") score += 3;
  if (job["Phúc Lợi"]) score += 5;
  const title = (job["Vị Trí"] || "").toUpperCase();
  if (title.includes("POD")) score += 10;
  if (title.includes("ECOMMERCE") || title.includes("E-COMMERCE")) score += 8;
  if (isVerified) score += 5;
  score += freshnessScore;

  if (score > 45) tags.push("HOT");
  if (freshnessStatus === "new") tags.push("NEW");

  return {
    ...job,
    salaryMin,
    salaryMax,
    district,
    area,
    daysOld,
    freshnessStatus,
    freshnessScore,
    tags,
    isVerified,
    finalScore: score,
  };
}

// ============================================================
// DYNAMIC FILTER OPTIONS — auto-derive from data
// ============================================================
function deriveFilterOptions(jobs) {
  const areas = [...new Set(jobs.map(j => j.area).filter(Boolean))].sort();
  const districts = [...new Set(jobs.map(j => j.district).filter(d => d !== "Không rõ"))].sort();
  const levels = [...new Set(jobs.map(j => j["Level"]).filter(Boolean))].sort();
  const platforms = [...new Set(jobs.flatMap(j => (j["Platform"] || "").split(",").map(p => p.trim())).filter(Boolean))].sort();
  return { areas, districts, levels, platforms };
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function JobDiscoveryV2() {
  const [rawJobs, setRawJobs] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [salaryRange, setSalaryRange] = useState([0, 50]);
  const [filterOptions, setFilterOptions] = useState({ areas: [], districts: [], levels: [], platforms: [] });

  const [filters, setFilters] = useState({
    areas: [],
    districts: [],
    levels: [],
    platforms: [],
    preset: "All", // All | Today | HighSalary | POD
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('https://api.steinhq.com/v1/storages/69b224fbaffba40a625db5bd/Jobs');
        const data = await res.json();
        setRawJobs(data);
        const normalized = data.map(j => normalizeJob(j, data));
        const sorted = normalized
          .filter(j => j.freshnessStatus !== "hidden")
          .sort((a, b) => b.finalScore - a.finalScore);
        setJobs(sorted);
        setFilterOptions(deriveFilterOptions(sorted));
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleFilter = (category, value) => {
    setFilters(prev => {
      const list = prev[category];
      return {
        ...prev,
        [category]: list.includes(value) ? list.filter(i => i !== value) : [...list, value],
      };
    });
  };

  const resetFilters = () => {
    setFilters({ areas: [], districts: [], levels: [], platforms: [], preset: "All" });
    setSalaryRange([0, 50]);
    setSearchTerm("");
  };

  // ---- FILTER LOGIC ----
  const processedJobs = useMemo(() => {
    return jobs.filter(j => {
      const matchSearch = `${j["Vị Trí"]} ${j["Tên Công Ty"]} ${j["Kỹ Năng"] || ""}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchArea = filters.areas.length === 0 || filters.areas.includes(j.area);
      const matchDistrict = filters.districts.length === 0 || filters.districts.includes(j.district);
      const matchLevel = filters.levels.length === 0 || filters.levels.includes(j["Level"]);
      const matchPlatform = filters.platforms.length === 0 || filters.platforms.some(p => (j["Platform"] || "").includes(p));
      const matchSalary = j.salaryMax === 0 || (j.salaryMax >= salaryRange[0] * 1000000 && j.salaryMax <= salaryRange[1] * 1000000);
      
      let matchPreset = true;
      if (filters.preset === "Today") matchPreset = j.daysOld <= 1 || j.freshnessStatus === "new";
      if (filters.preset === "HighSalary") matchPreset = j.salaryMax >= 15000000;
      if (filters.preset === "POD") matchPreset = (j["Vị Trí"] || "").toUpperCase().includes("POD");
      if (filters.preset === "EasyApply") matchPreset = j["Email"] && j["Email"] !== "Không rõ";

      return matchSearch && matchArea && matchDistrict && matchLevel && matchPlatform && matchSalary && matchPreset;
    });
  }, [jobs, searchTerm, filters, salaryRange]);

  // ---- INTENT SECTIONS ----
  const todayJobs = useMemo(() => processedJobs.filter(j => j.freshnessStatus === "new").slice(0, 6), [processedJobs]);
  const highSalaryJobs = useMemo(() => [...processedJobs].sort((a,b) => b.salaryMax - a.salaryMax).slice(0, 6), [processedJobs]);
  const podJobs = useMemo(() => processedJobs.filter(j => (j["Vị Trí"]||"").toUpperCase().includes("POD") || (j["Platform"]||"").toUpperCase().includes("POD")), [processedJobs]);
  const nearbyJobs = useMemo(() => processedJobs.filter(j => ["Hải Châu","Thanh Khê"].includes(j.district)).slice(0, 6), [processedJobs]);

  const activeCount = jobs.length;
  const todayCount = jobs.filter(j => j.daysOld <= 1).length;

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="text-yellow-400 font-black text-6xl italic mb-4 animate-pulse">⚡</div>
        <p className="text-white font-mono text-sm uppercase tracking-widest animate-pulse">Loading Discovery Engine...</p>
      </div>
    </div>
  );

  const showSections = processedJobs.length === jobs.length && filters.preset === "All" && searchTerm === "";

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans pb-24" style={{fontFamily: "'DM Sans', sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;900&family=Space+Mono:wght@700&display=swap');
        .tag-new { background: #00FF88; color: #000; }
        .tag-hot { background: #FF3B30; color: #fff; }
        .tag-urgent { background: #FF9500; color: #000; }
        .tag-salary { background: #FFD60A; color: #000; }
        .tag-remote { background: #30D158; color: #000; }
        .card-hover { transition: transform 0.2s, box-shadow 0.2s; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.6); }
        .slider-thumb::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; background: #FFD60A; border-radius: 50%; cursor: pointer; border: 3px solid #000; }
        .slider-thumb { accent-color: #FFD60A; }
        .chip-active { background: #FFD60A; color: #000; }
        .section-scroll { overflow-x: auto; scrollbar-width: none; }
        .section-scroll::-webkit-scrollbar { display: none; }
        .badge-verified { background: linear-gradient(135deg, #00C6FF, #0072FF); }
        .animate-slide-in { animation: slideIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>

      {/* ====== STICKY HEADER ====== */}
      <header className="sticky top-0 z-50 bg-[#0D0D0D]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 py-4">
          
          {/* Top Row */}
          <div className="flex items-center gap-4 mb-4">
            <div className="shrink-0">
              <h1 className="text-2xl font-black italic tracking-tighter" style={{fontFamily:"Space Mono, monospace"}}>
                JOB<span className="text-yellow-400">⚡</span>RADAR
              </h1>
              <p className="text-[9px] text-white/40 font-mono uppercase tracking-widest">
                {activeCount} active · {todayCount > 0 ? <span className="text-green-400">{todayCount} mới hôm nay</span> : "0 mới hôm nay"}
              </p>
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                placeholder="🔍  Tìm vị trí, kỹ năng, công ty..."
                className="w-full bg-white/8 border border-white/20 text-white placeholder-white/30 px-4 py-3 text-sm font-medium outline-none focus:border-yellow-400 transition-colors rounded-none"
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Layer 1: Preset Chips */}
            <div className="flex gap-2 shrink-0">
              {[
                { key: "Today", label: "🕐 Hôm nay" },
                { key: "HighSalary", label: "💰 >15M" },
                { key: "POD", label: "🚀 POD" },
                { key: "EasyApply", label: "🎯 Easy Apply" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilters(f => ({ ...f, preset: f.preset === key ? "All" : key }))}
                  className={`px-3 py-2 text-[10px] font-black uppercase border transition-all whitespace-nowrap ${filters.preset === key ? "chip-active border-yellow-400" : "border-white/20 text-white/60 hover:border-white/50 hover:text-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Row: Layers 2-4 */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Layer 2: Area */}
            <DynamicFilterGroup
              label="Khu vực"
              options={filterOptions.areas}
              activeItems={filters.areas}
              onToggle={v => toggleFilter('areas', v)}
              colorActive="bg-blue-500"
            />
            <Divider />
            {/* Layer 2b: District */}
            {filterOptions.districts.length > 0 && <>
              <DynamicFilterGroup
                label="Quận"
                options={filterOptions.districts}
                activeItems={filters.districts}
                onToggle={v => toggleFilter('districts', v)}
                colorActive="bg-purple-500"
              />
              <Divider />
            </>}
            {/* Layer 4: Level */}
            <DynamicFilterGroup
              label="Level"
              options={filterOptions.levels}
              activeItems={filters.levels}
              onToggle={v => toggleFilter('levels', v)}
              colorActive="bg-orange-500"
            />
            <Divider />
            {/* Layer 3: Salary Slider */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-white/40">Lương:</span>
              <span className="text-[10px] font-mono text-yellow-400">{salaryRange[0]}M</span>
              <input
                type="range" min={0} max={50} step={1}
                value={salaryRange[0]}
                onChange={e => setSalaryRange([+e.target.value, salaryRange[1]])}
                className="w-20 slider-thumb"
              />
              <span className="text-white/40 text-[10px]">–</span>
              <input
                type="range" min={0} max={50} step={1}
                value={salaryRange[1]}
                onChange={e => setSalaryRange([salaryRange[0], +e.target.value])}
                className="w-20 slider-thumb"
              />
              <span className="text-[10px] font-mono text-yellow-400">{salaryRange[1]}M</span>
            </div>

            <button onClick={resetFilters} className="ml-auto text-[10px] font-black uppercase text-red-400 hover:text-red-300 transition-colors">
              ✕ Reset
            </button>
          </div>
        </div>
      </header>

      {/* ====== MAIN CONTENT ====== */}
      <main className="max-w-[1400px] mx-auto px-4 mt-8">

        {/* Trust Bar */}
        <div className="flex items-center gap-6 mb-10 p-4 border border-white/10 bg-white/3">
          <span className="text-[11px] font-black uppercase text-white/40 tracking-widest">Live Stats</span>
          <Stat label="Active Jobs" value={activeCount} />
          <Stat label="Mới Hôm Nay" value={todayCount} highlight />
          <Stat label="Công Ty Verified" value={jobs.filter(j => j.isVerified).length} />
          <Stat label="Có Email HR" value={jobs.filter(j => j["Email"] && j["Email"] !== "Không rõ").length} />
          {searchTerm || filters.preset !== "All" ? (
            <span className="ml-auto text-[11px] font-black uppercase text-yellow-400">{processedJobs.length} kết quả</span>
          ) : null}
        </div>

        {/* ======= INTENT SECTIONS (when no filter active) ======= */}
        {showSections ? (
          <>
            {todayJobs.length > 0 && (
              <IntentSection
                icon="🕐" title="JOB MỚI NHẤT HÔM NAY"
                subtitle={`${todayJobs.length} vị trí vừa đăng`}
                accent="#00FF88"
                jobs={todayJobs}
                onSelect={setSelectedJob}
              />
            )}

            {highSalaryJobs.length > 0 && (
              <IntentSection
                icon="💰" title="TOP LƯƠNG CAO ĐÀ NẴNG"
                subtitle="Dành cho Senior & Lead"
                accent="#FFD60A"
                jobs={highSalaryJobs}
                onSelect={setSelectedJob}
              />
            )}

            {podJobs.length > 0 && (
              <IntentSection
                icon="🚀" title="THẾ GIỚI POD & E-COMMERCE"
                subtitle="Niche đặc thù · Tăng trưởng nhanh"
                accent="#BF5AF2"
                jobs={podJobs}
                onSelect={setSelectedJob}
              />
            )}

            {nearbyJobs.length > 0 && (
              <IntentSection
                icon="📍" title="GẦN BẠN (HẢI CHÂU · THANH KHÊ)"
                subtitle="Trung tâm Đà Nẵng · Đi làm dễ dàng"
                accent="#30D158"
                jobs={nearbyJobs}
                onSelect={setSelectedJob}
              />
            )}

            {/* All */}
            <section className="mt-16">
              <SectionHeader icon="📋" title="TẤT CẢ CƠ HỘI" subtitle={`${processedJobs.length} vị trí · Sắp xếp theo điểm`} accent="#fff" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {processedJobs.map((job, i) => (
                  <JobCard key={i} job={job} onDetail={() => setSelectedJob(job)} />
                ))}
              </div>
            </section>
          </>
        ) : (
          /* ======= FILTERED VIEW ======= */
          <section>
            <div className="flex items-center justify-between mb-6">
              <SectionHeader icon="🔍" title="KẾT QUẢ TÌM KIẾM" subtitle={`${processedJobs.length} vị trí phù hợp`} accent="#FFD60A" />
            </div>
            {processedJobs.length === 0 ? (
              <div className="text-center py-32">
                <p className="text-5xl mb-4">😔</p>
                <p className="font-black uppercase text-white/30">Không tìm thấy kết quả</p>
                <button onClick={resetFilters} className="mt-4 text-yellow-400 font-bold underline text-sm">Reset bộ lọc</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {processedJobs.map((job, i) => (
                  <JobCard key={i} job={job} onDetail={() => setSelectedJob(job)} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ====== DETAIL PANEL ====== */}
      {selectedJob && <DetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
}

// ============================================================
// COMPONENTS
// ============================================================

function Divider() {
  return <div className="h-5 w-px bg-white/15 hidden md:block" />;
}

function Stat({ label, value, highlight }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`font-black text-lg ${highlight ? "text-green-400" : "text-white"}`}>{value}</span>
      <span className="text-[9px] uppercase text-white/30 font-bold">{label}</span>
    </div>
  );
}

// Dynamic Filter Group — auto-renders options from data
function DynamicFilterGroup({ label, options, activeItems, onToggle, colorActive = "bg-yellow-400" }) {
  if (!options || options.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-black uppercase text-white/40 shrink-0">{label}:</span>
      <div className="flex gap-1 flex-wrap">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`px-2 py-1 text-[9px] font-black border transition-all uppercase ${activeItems.includes(opt) ? `${colorActive} text-black border-transparent` : "border-white/20 text-white/50 hover:border-white/40 hover:text-white"}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, accent }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: accent, fontFamily: "Space Mono, monospace" }}>
          {title}
        </h2>
      </div>
      {subtitle && <p className="text-[11px] text-white/40 font-mono uppercase tracking-widest mt-1 ml-9">{subtitle}</p>}
    </div>
  );
}

function IntentSection({ icon, title, subtitle, accent, jobs, onSelect }) {
  return (
    <section className="mb-16">
      <SectionHeader icon={icon} title={title} subtitle={subtitle} accent={accent} />
      <div className="section-scroll flex gap-4 pb-4">
        {jobs.map((job, i) => (
          <div key={i} className="shrink-0 w-72">
            <JobCard job={job} onDetail={() => onSelect(job)} />
          </div>
        ))}
      </div>
    </section>
  );
}

// TAG COMPONENT
const TAG_STYLES = {
  "NEW": "tag-new",
  "HOT": "tag-hot",
  "URGENT": "tag-urgent",
  "HIGH SALARY": "tag-salary",
  "REMOTE": "tag-remote",
};

function TagBadge({ tag }) {
  return (
    <span className={`text-[8px] font-black uppercase px-2 py-0.5 ${TAG_STYLES[tag] || "bg-white/20 text-white"}`}>
      {tag}
    </span>
  );
}

// JOB CARD
function JobCard({ job, onDetail }) {
  const salaryDisplay = job.salaryMax
    ? `${Math.round(job.salaryMax / 1000000)}M`
    : "Cạnh tranh";

  return (
    <div
      className="card-hover bg-white/5 border border-white/10 p-5 flex flex-col justify-between cursor-pointer hover:border-yellow-400/50 h-full"
      style={{ minHeight: 260 }}
      onClick={onDetail}
    >
      {/* Tags Row */}
      <div className="flex flex-wrap gap-1 mb-3 min-h-[18px]">
        {job.tags.slice(0, 4).map(tag => <TagBadge key={tag} tag={tag} />)}
      </div>

      {/* Company + Level */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter truncate max-w-[110px]">
            {job["Tên Công Ty"]}
          </span>
          {job.isVerified && (
            <span className="badge-verified text-[7px] font-black px-1 py-0.5 rounded-sm text-white">✓</span>
          )}
        </div>
        <span className="text-[9px] font-bold text-white/30 uppercase">{job["Level"]}</span>
      </div>

      {/* Job Title */}
      <h3 className="text-sm font-black uppercase leading-snug mb-4 text-white line-clamp-2 group-hover:text-yellow-400 flex-1">
        {job["Vị Trí"]}
      </h3>

      {/* Salary + Location */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 font-black text-base">{salaryDisplay}</span>
          {job.salaryMin > 0 && job.salaryMax > 0 && (
            <span className="text-[9px] text-white/30 font-mono">
              {Math.round(job.salaryMin/1000000)}M–{Math.round(job.salaryMax/1000000)}M
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-white/40 font-medium">
          <span>📍</span>
          <span>{job.district !== "Không rõ" ? `${job.district}, ` : ""}{job.area}</span>
        </div>
        {job.daysOld < 99 && (
          <div className="text-[9px] text-white/25 font-mono">
            {job.daysOld === 0 ? "Hôm nay" : job.daysOld === 1 ? "Hôm qua" : `${job.daysOld} ngày trước`}
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1 mb-4 min-h-[20px]">
        {(job["Kỹ Năng"] || "").split(',').slice(0, 3).map(s => s.trim()).filter(Boolean).map(s => (
          <span key={s} className="text-[8px] font-bold border border-white/15 px-1.5 py-0.5 text-white/40 uppercase">
            {s}
          </span>
        ))}
      </div>

      <button className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest border border-white/20 text-white/60 hover:bg-yellow-400 hover:text-black hover:border-yellow-400 transition-all">
        Chi tiết →
      </button>
    </div>
  );
}

// DETAIL PANEL
function DetailPanel({ job, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.85)" }} onClick={onClose}>
      <div
        className="animate-slide-in w-full max-w-2xl bg-[#111] h-full overflow-y-auto border-l border-white/10 p-8 md:p-12"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="mb-10 text-[10px] font-black uppercase border border-white/20 px-4 py-2 text-white/50 hover:text-white hover:border-white transition-all"
        >
          ← Đóng
        </button>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {job.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
          {job.isVerified && (
            <span className="badge-verified text-[8px] font-black px-2 py-0.5 rounded-sm text-white uppercase">✓ Verified Recruiter</span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-4xl font-black uppercase leading-tight mb-2 tracking-tighter" style={{ fontFamily: "Space Mono, monospace" }}>
          {job["Vị Trí"]}
        </h2>
        <p className="text-red-400 font-bold uppercase tracking-widest text-sm mb-10">@ {job["Tên Công Ty"]}</p>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <InfoBox label="Lương" value={
            job.salaryMin && job.salaryMax
              ? `${Math.round(job.salaryMin/1000000)}M – ${Math.round(job.salaryMax/1000000)}M VND`
              : job.salaryMax ? `Đến ${Math.round(job.salaryMax/1000000)}M VND` : "Thỏa thuận"
          } accent="#FFD60A" />
          <InfoBox label="Địa điểm" value={job["Địa chỉ"] || job.area} accent="#30D158" />
          <InfoBox label="Level" value={job["Level"] || "—"} accent="#BF5AF2" />
          <InfoBox label="Platform" value={job["Platform"] || "—"} accent="#0A84FF" />
        </div>

        {/* Description */}
        {job["Nội Dung Gốc"] && (
          <div className="mb-10">
            <h4 className="text-[10px] font-black uppercase text-white/30 mb-4 tracking-widest">Mô tả công việc</h4>
            <p className="text-sm leading-relaxed text-white/70 whitespace-pre-line">{job["Nội Dung Gốc"]}</p>
          </div>
        )}

        {/* Benefits */}
        {job["Phúc Lợi"] && (
          <div className="border border-white/10 p-6 mb-10 bg-white/3">
            <h4 className="text-[10px] font-black uppercase text-yellow-400 mb-3 tracking-widest">Phúc lợi & Quyền lợi</h4>
            <p className="text-sm font-medium leading-relaxed text-white/60">{job["Phúc Lợi"]}</p>
          </div>
        )}

        {/* Freshness info */}
        {job.daysOld < 99 && (
          <p className="text-[10px] text-white/25 font-mono mb-8">
            Đăng {job.daysOld === 0 ? "hôm nay" : job.daysOld === 1 ? "hôm qua" : `${job.daysOld} ngày trước`} · Score: {job.finalScore}
          </p>
        )}

        {/* CTA */}
        <a
          href={job["LINK BÀI VIẾT"]}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center py-5 font-black text-xl uppercase tracking-widest bg-yellow-400 text-black hover:bg-white transition-all"
        >
          Apply Ngay →
        </a>
        {job["Email"] && job["Email"] !== "Không rõ" && (
          <p className="text-center text-[10px] font-mono text-white/25 mt-4">
            HR Email: {job["Email"]}
          </p>
        )}
      </div>
    </div>
  );
}

function InfoBox({ label, value, accent }) {
  return (
    <div className="p-4 border border-white/10 bg-white/3">
      <p className="text-[9px] font-black uppercase mb-1" style={{ color: accent, opacity: 0.8 }}>{label}</p>
      <p className="text-sm font-black uppercase text-white leading-tight">{value}</p>
    </div>
  );
}
