"use client";
import React, { useState, useEffect, useMemo } from 'react';

export default function JobDiscoverySystem() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. STATE BỘ LỌC ĐA TẦNG (Primary & Power Filters)
  const [filters, setFilters] = useState({
    locations: [],
    levels: [],
    platforms: [],
    presets: "All" // All, HighSalary, POD, EasyApply
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('https://api.steinhq.com/v1/storages/69b224fbaffba40a625db5bd/Jobs');
        const data = await res.json();
        
        // 2. SCORE ENGINE - Nâng cấp tư duy Ranking
        const scoredData = data.map(job => {
          let score = 0;
          
          // Salary Score (Max 30)
          const sMax = parseInt(job["Lương Max"]) || 0;
          if (sMax >= 30000000) score += 30;
          else if (sMax >= 15000000) score += 20;
          else if (sMax >= 7000000) score += 10;

          // Data Completeness (Max 16)
          if (job["Lương Min"]) score += 5;
          if (job["Địa chỉ"] && job["Địa chỉ"] !== "Không rõ") score += 3;
          if (job["Email"] && job["Email"] !== "Không rõ") score += 3;
          if (job["Phúc Lợi"]) score += 5;

          // Demand & Trust Score
          const title = (job["Vị Trí"] || "").toUpperCase();
          if (title.includes("POD")) score += 10;
          if (title.includes("ECOMMERCE")) score += 8;
          
          const isTrusted = data.filter(item => item["Tên Công Ty"] === job["Tên Công Ty"]).length >= 2;
          if (isTrusted) score += 5;

          return { ...job, finalScore: score };
        });

        // Mặc định sắp xếp theo điểm cao nhất lên đầu
        setJobs(scoredData.sort((a, b) => b.finalScore - a.finalScore));
        setLoading(false);
      } catch (e) { console.error(e); setLoading(false); }
    };
    fetchData();
  }, []);

  // 3. INSTANT FILTERING LOGIC (Lọc tại chỗ - Không load lại trang)
  const processedJobs = useMemo(() => {
    return jobs.filter(j => {
      // Fuzzy Search (Title + Company)
      const matchSearch = `${j["Vị Trí"]} ${j["Tên Công Ty"]}`.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Primary Filters (Multi-select)
      const matchLoc = filters.locations.length === 0 || filters.locations.some(l => j["Địa chỉ"]?.includes(l));
      const matchLevel = filters.levels.length === 0 || filters.levels.includes(j["Level"]);
      const matchPlat = filters.platforms.length === 0 || filters.platforms.some(p => j["Platform"]?.includes(p));
      
      // Smart Presets (Power Filter)
      let matchPreset = true;
      if (filters.presets === "HighSalary") matchPreset = parseInt(j["Lương Max"]) >= 15000000;
      if (filters.presets === "POD") matchPreset = j["Vị Trí"]?.toUpperCase().includes("POD");
      if (filters.presets === "EasyApply") matchPreset = j["Email"] && j["Email"] !== "Không rõ";

      return matchSearch && matchLoc && matchLevel && matchPlat && matchPreset;
    });
  }, [jobs, searchTerm, filters]);

  // Chia Section logic khám phá
  const topRankedJobs = processedJobs.slice(0, 4); 
  const newJobs = [...processedJobs].reverse().slice(0, 8); // Giả lập job mới bằng reverse

  const toggleFilter = (category, value) => {
    setFilters(prev => {
      const currentList = prev[category];
      const isExist = currentList.includes(value);
      return {
        ...prev,
        [category]: isExist ? currentList.filter(i => i !== value) : [...currentList, value]
      };
    });
  };

  if (loading) return <div className="p-20 font-black text-center animate-pulse text-4xl italic">RANKING ENGINE...</div>;

  return (
    <div className="min-h-screen bg-[#F0F0F0] text-black font-sans pb-20">
      
      {/* HEADER: SEARCH & SMART PRESETS */}
      <div className="bg-black text-white p-6 md:p-10 sticky top-0 z-40 border-b-4 border-yellow-400">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row gap-6 items-center">
          <div className="shrink-0">
            <h1 className="text-4xl font-black italic tracking-tighter underline decoration-yellow-400">DISCOVERY</h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">Find job in &lt; 10 seconds</p>
          </div>
          
          <input 
            type="text" 
            placeholder="Search: Position, Skill, Company..." 
            className="flex-1 p-4 bg-white text-black font-bold border-4 border-yellow-400 outline-none shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)]"
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="flex gap-2">
            {["HighSalary", "POD", "EasyApply"].map(p => (
              <button 
                key={p}
                onClick={() => setFilters({...filters, presets: filters.presets === p ? "All" : p})}
                className={`px-3 py-2 text-[10px] font-black uppercase border-2 transition-all ${filters.presets === p ? 'bg-yellow-400 text-black border-black' : 'border-white hover:bg-white hover:text-black'}`}
              >
                {p === "HighSalary" ? "🔥 High Salary" : p === "POD" ? "🚀 POD Only" : "🎯 Easy Apply"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 mt-8">
        
        {/* TẦNG LỌC CHÍNH (PRIMARY FILTERS) */}
        <div className="bg-white border-4 border-black p-4 mb-12 flex flex-wrap gap-8 items-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <FilterGroup label="Location" options={['Đà Nẵng', 'Huế', 'Remote']} activeItems={filters.locations} onToggle={(v) => toggleFilter('locations', v)} />
          <div className="h-8 w-1 bg-black hidden md:block" />
          <FilterGroup label="Level" options={['Intern', 'Fresher', 'Junior', 'Senior']} activeItems={filters.levels} onToggle={(v) => toggleFilter('levels', v)} />
          <div className="h-8 w-1 bg-black hidden md:block" />
          <FilterGroup label="Platform" options={['Amazon', 'TikTok', 'POD', 'Shopee']} activeItems={filters.platforms} onToggle={(v) => toggleFilter('platforms', v)} />
          
          <button 
            onClick={() => setFilters({locations: [], levels: [], platforms: [], presets: "All"})}
            className="ml-auto text-[10px] font-black underline uppercase hover:text-red-600"
          >
            Reset Filters
          </button>
        </div>

        {/* SECTION: TOP DISCOVERY (Best match) */}
        <section className="mb-16">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-3xl font-black italic uppercase underline decoration-red-600 decoration-8">🔥 Top Ranked Jobs</h2>
            <span className="text-[10px] font-mono font-bold">MATCHED: {processedJobs.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topRankedJobs.map((job, i) => <JobCard key={i} job={job} onDetail={() => setSelectedJob(job)} />)}
          </div>
        </section>

        {/* SECTION: ALL LISTINGS */}
        <section>
          <h2 className="text-2xl font-black uppercase mb-8 border-l-8 border-black pl-4">All Opportunities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {processedJobs.slice(4).map((job, i) => <JobCard key={i} job={job} onDetail={() => setSelectedJob(job)} />)}
          </div>
        </section>
      </main>

      {/* QUICK VIEW PANEL (Lọc tại chỗ - Không chuyển trang) */}
      {selectedJob && <DetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
}

// COMPONENT: FILTER GROUP
function FilterGroup({ label, options, activeItems, onToggle }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-black uppercase opacity-40">{label}:</span>
      <div className="flex gap-1">
        {options.map(opt => (
          <button 
            key={opt} 
            onClick={() => onToggle(opt)}
            className={`px-3 py-1 text-[10px] font-bold border-2 border-black transition-all ${activeItems.includes(opt) ? 'bg-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)]' : 'bg-white hover:bg-yellow-100'}`}
          >
            {opt.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

// COMPONENT: JOB CARD (Tư duy Scan 3 giây)
function JobCard({ job, onDetail }) {
  const score = job.finalScore;
  const isHot = score > 45;

  return (
    <div className="group relative bg-white border-2 border-black p-5 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all flex flex-col justify-between aspect-[3/4.2]">
      {isHot && (
        <div className="absolute -top-3 -right-2 bg-red-600 text-white font-black text-[9px] px-2 py-1 rotate-12 border-2 border-black z-10">
          RANK #{score}
        </div>
      )}
      
      <div>
        <div className="flex justify-between items-start mb-3">
          <span className="text-[10px] font-black text-blue-600 truncate max-w-[120px] uppercase tracking-tighter">{job["Tên Công Ty"]}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase italic">{job["Level"]}</span>
        </div>
        
        <h3 className="text-lg font-black leading-tight uppercase mb-4 group-hover:text-red-600 transition-colors line-clamp-3">
          {job["Vị Trí"]}
        </h3>
        
        <div className="space-y-3">
          <p className="text-xs font-black italic bg-yellow-300 inline-block px-2 py-0.5 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            💰 {job["Lương Max"] ? `${Math.round(job["Lương Max"]/1000000)}M` : "Cạnh tranh"}
          </p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase">
            📍 {job["Địa chỉ"]?.split(',').pop() || "Việt Nam"}
          </div>
        </div>
      </div>

      <div className="mt-6 border-t-2 border-black pt-4">
        <div className="flex flex-wrap gap-1 mb-4 h-10 overflow-hidden">
          {job["Kỹ Năng"]?.split(',').slice(0, 3).map(s => (
            <span key={s} className="text-[8px] font-black border border-black px-1.5 py-0.5 uppercase bg-slate-50">{s.trim()}</span>
          ))}
        </div>
        <button 
          onClick={onDetail}
          className="w-full bg-black text-white font-black py-3 text-xs uppercase tracking-widest group-hover:bg-red-600 transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-1 active:translate-y-1"
        >
          View Detail →
        </button>
      </div>
    </div>
  );
}

// COMPONENT: DETAIL PANEL (Quick View)
function DetailPanel({ job, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex justify-end backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white h-full p-8 md:p-16 overflow-y-auto border-l-[12px] border-red-600 animate-in slide-in-from-right duration-500">
        <button onClick={onClose} className="mb-10 font-black text-[10px] border-4 border-black px-6 py-2 hover:bg-black hover:text-white uppercase transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">← Close Discovery</button>
        
        <header className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-black text-white text-[10px] font-black px-2 py-1 uppercase tracking-widest">{job["Platform"]}</span>
            <span className="text-[10px] font-bold text-slate-400">SCORE: {job.finalScore}</span>
          </div>
          <h2 className="text-6xl font-black uppercase leading-[0.9] tracking-tighter italic mb-4">{job["Vị Trí"]}</h2>
          <p className="text-xl font-bold text-red-600 uppercase tracking-tighter">@ {job["Tên Công Ty"]}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <DetailBox label="Salary Range" value={job["Lương Max"] ? `${job["Lương Max"]} VND` : "Thỏa thuận"} color="bg-yellow-300" />
          <DetailBox label="Primary Location" value={job["Địa chỉ"]} color="bg-slate-100" />
        </div>

        <div className="space-y-10">
          <div className="border-l-4 border-black pl-6">
            <h4 className="font-black text-xs uppercase opacity-30 mb-4">Mô tả công việc</h4>
            <p className="text-base leading-relaxed whitespace-pre-line text-slate-800 font-medium italic">{job["Nội Dung Gốc"]}</p>
          </div>
          
          <div className="p-6 bg-red-50 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h4 className="font-black text-xs uppercase mb-3 text-red-600">Quyền lợi & Phúc lợi</h4>
            <p className="text-sm font-bold leading-relaxed uppercase italic">{job["Phúc Lợi"]}</p>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4">
          <a 
            href={job["LINK BÀI VIẾT"]} 
            target="_blank" 
            className="w-full bg-red-600 text-white text-center py-6 font-black text-3xl uppercase tracking-widest hover:bg-black transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]"
          >
            Apply Via Platform →
          </a>
          <p className="text-center text-[10px] font-bold opacity-30 uppercase tracking-[0.3em]">HR Email: {job["Email"] || "N/A"}</p>
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}

function DetailBox({ label, value, color }) {
  return (
    <div className={`${color} p-5 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`}>
      <p className="text-[10px] font-black uppercase opacity-40 mb-1">{label}</p>
      <p className="font-black text-lg leading-tight uppercase">{value}</p>
    </div>
  );
}
