"use client";
import React, { useState, useEffect, useMemo } from 'react';

export default function JobDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // State cho bộ lọc
  const [filterLoc, setFilterLoc] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('https://api.steinhq.com/v1/storages/69b224fbaffba40a625db5bd/Jobs');
        const data = await res.json();
        
        // --- SCORE ENGINE ---
        const scoredData = data.map(job => {
          let score = 0;
          
          // 1. Salary Score
          const sMax = parseInt(job["Lương Max"]) || 0;
          if (sMax >= 30000000) score += 30;
          else if (sMax >= 20000000) score += 25;
          else if (sMax >= 15000000) score += 20;
          else if (sMax >= 10000000) score += 15;
          else if (sMax >= 7000000) score += 10;
          else score += 3;

          // 2. Data Completeness Score
          if (job["Lương Min"]) score += 5;
          if (job["Địa chỉ"] && job["Địa chỉ"] !== "Không rõ") score += 3;
          if (job["Email"] && job["Email"] !== "Không rõ") score += 3;
          if (job["SĐT"] && job["SĐT"] !== "Không rõ") score += 2;
          if (job["Phúc Lợi"] && job["Phúc Lợi"] !== "Không rõ") score += 3;

          // 3. Demand Score (Keyword focus)
          const title = (job["Vị Trí"] || "").toUpperCase();
          if (title.includes("POD")) score += 8;
          if (title.includes("ECOMMERCE")) score += 7;
          if (title.includes("MARKETING")) score += 6;
          if (title.includes("DESIGNER")) score += 5;
          if (title.includes("INTERN")) score += 3;

          // 4. Trust Score (Lặp lại công ty)
          const companyCount = data.filter(item => item["Tên Công Ty"] === job["Tên Công Ty"]).length;
          if (companyCount >= 2) score += 5;

          return { ...job, finalScore: score };
        });

        // SORT DESC BY SCORE (Job tốt nhất lên đầu)
        setJobs(scoredData.sort((a, b) => b.finalScore - a.finalScore));
        setLoading(false);
      } catch (e) { console.error(e); setLoading(false); }
    };
    fetchData();
  }, []);

  // --- LOGIC LỌC & TÌM KIẾM ---
  const processedJobs = useMemo(() => {
    return jobs.filter(j => {
      const matchSearch = (j["Vị Trí"] + j["Tên Công Ty"]).toLowerCase().includes(searchTerm.toLowerCase());
      const matchLoc = filterLoc === 'All' || j["Địa chỉ"].includes(filterLoc);
      const matchLevel = filterLevel === 'All' || j["Level"] === filterLevel;
      return matchSearch && matchLoc && matchLevel;
    });
  }, [jobs, searchTerm, filterLoc, filterLevel]);

  // Chia Section dữ liệu
  const topJobs = processedJobs.slice(0, 4); // Top 4 cao điểm nhất
  const podJobs = processedJobs.filter(j => j["Vị Trí"]?.toUpperCase().includes("POD"));
  const internJobs = processedJobs.filter(j => j["Level"] === "Intern");

  if (loading) return <div className="p-20 font-mono text-center animate-pulse tracking-widest text-2xl uppercase">Ranking Jobs...</div>;

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-black font-sans pb-20">
      
      {/* 1. HEADER & SEARCH */}
      <div className="bg-black text-white p-6 md:p-12 mb-8">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-5xl font-black italic tracking-tighter leading-none mb-2 underline decoration-yellow-400">JOB RANKING ENGINE</h1>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Better Salaries. Better Transparency. Faster Hiring.</p>
          </div>
          <div className="w-full max-w-md">
            <input 
              type="text" 
              placeholder="Search: POD, Amazon, Marketing..." 
              className="w-full p-4 bg-white text-black font-bold border-4 border-yellow-400 outline-none shadow-[6px_6px_0px_0px_rgba(255,255,255,0.3)]"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4">
        
        {/* 2. SIDEBAR FILTER (Inline for Desktop) */}
        <div className="flex flex-wrap gap-4 mb-12 items-center bg-white p-4 border-2 border-black">
          <span className="font-black text-[10px] uppercase mr-2">Quick Filter:</span>
          {['All', 'Đà Nẵng', 'Huế', 'Remote'].map(l => (
            <button key={l} onClick={() => setFilterLoc(l)} className={`px-4 py-1 text-xs font-black border-2 ${filterLoc === l ? 'bg-black text-white' : 'border-black hover:bg-yellow-400'}`}>{l.toUpperCase()}</button>
          ))}
          <div className="h-6 w-[2px] bg-black mx-2" />
          {['All', 'Intern', 'Fresher', 'Junior', 'Senior'].map(lv => (
            <button key={lv} onClick={() => setFilterLevel(lv)} className={`px-4 py-1 text-xs font-black border-2 ${filterLevel === lv ? 'bg-black text-white' : 'border-black hover:bg-blue-400'}`}>{lv.toUpperCase()}</button>
          ))}
        </div>

        {/* 3. SECTIONS RENDERING */}
        
        {/* SECTION: TOP JOBS (Ranking Highest) */}
        <section className="mb-16">
          <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-2">
            <span className="bg-red-600 text-white px-2 italic">TOP RANKED</span> 
            <span className="text-xs font-mono text-slate-400">#HighSalary #CompleteData</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topJobs.map((job, i) => <JobCard key={i} job={job} onDetail={() => setSelectedJob(job)} />)}
          </div>
        </section>

        {/* SECTION: POD & ECOMMERCE */}
        <section className="mb-16">
          <h2 className="text-2xl font-black uppercase mb-6 italic underline decoration-blue-500">POD & Ecommerce Specials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {podJobs.slice(0, 4).map((job, i) => <JobCard key={i} job={job} onDetail={() => setSelectedJob(job)} />)}
          </div>
        </section>

        {/* SECTION: ALL LISTING */}
        <section>
          <h2 className="text-2xl font-black uppercase mb-6 border-b-4 border-black inline-block">All Opportunities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {processedJobs.map((job, i) => <JobCard key={i} job={job} onDetail={() => setSelectedJob(job)} />)}
          </div>
        </section>
      </main>

      {/* 4. MODAL DETAIL */}
      {selectedJob && <DetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
}

// COMPONENT: JOB CARD (Scan 3 giây)
function JobCard({ job, onDetail }) {
  const score = job.finalScore;
  const isHot = score > 45;

  return (
    <div className="group relative bg-white border-2 border-black p-5 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between aspect-[3/4]">
      {isHot && (
        <div className="absolute -top-3 -right-3 bg-red-600 text-white font-black text-[10px] px-2 py-1 rotate-12 border-2 border-black z-10 shadow-md">
          HOT {score}pts
        </div>
      )}
      
      <div>
        <div className="flex justify-between items-start mb-4">
          <span className="text-[10px] font-mono font-bold text-blue-600 truncate max-w-[150px]">{job["Tên Công Ty"]}</span>
          <span className="text-[10px] font-black italic text-slate-400">#{job["Level"]}</span>
        </div>
        <h3 className="text-lg font-black leading-none uppercase mb-4 group-hover:text-red-600 transition-colors line-clamp-3">
          {job["Vị Trí"]}
        </h3>
        
        <div className="space-y-2">
          <p className="text-sm font-black italic bg-yellow-300 inline-block px-1">
            💰 {job["Lương Min"] ? `${Math.round(job["Lương Min"]/1000000)}M - ${Math.round(job["Lương Max"]/1000000)}M` : "Thỏa thuận"}
          </p>
          <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1">📍 {job["Địa chỉ"]}</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap gap-1 mb-4">
          {job["Kỹ Năng"]?.split(',').slice(0, 2).map(s => (
            <span key={s} className="text-[8px] font-black border border-black px-1 uppercase">{s.trim()}</span>
          ))}
        </div>
        <button 
          onClick={onDetail}
          className="w-full bg-black text-white font-black py-3 text-xs uppercase tracking-widest group-hover:bg-red-600 transition-all"
        >
          View Detail →
        </button>
      </div>
    </div>
  );
}

// COMPONENT: DETAIL PANEL
function DetailPanel({ job, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-end">
      <div className="w-full max-w-xl bg-white h-full p-8 md:p-12 overflow-y-auto border-l-8 border-red-600 animate-in slide-in-from-right duration-300">
        <button onClick={onClose} className="mb-8 font-black text-xs border-2 border-black px-4 py-2 hover:bg-black hover:text-white uppercase transition-all">← Back to Dashboard</button>
        
        <header className="mb-10">
          <p className="font-mono text-red-600 font-black text-xs uppercase mb-2">{job["Tên Công Ty"]} // HR Contact: {job["Email"]}</p>
          <h2 className="text-4xl font-black uppercase leading-tight tracking-tighter italic">{job["Vị Trí"]}</h2>
        </header>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-slate-100 p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-[10px] font-black uppercase opacity-40">Salary Range</p>
            <p className="font-black text-xl italic">{job["Lương Max"] ? `${job["Lương Max"]} VND` : "Contact HR"}</p>
          </div>
          <div className="bg-slate-100 p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-[10px] font-black uppercase opacity-40">Location</p>
            <p className="font-black text-sm italic uppercase">{job["Địa chỉ"]}</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h4 className="font-black text-xs uppercase border-b-2 border-black pb-1 mb-4">Job Description</h4>
            <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700 font-medium">{job["Nội Dung Gốc"]}</p>
          </div>
          <div className="p-4 bg-yellow-50 border-2 border-dashed border-black">
            <h4 className="font-black text-xs uppercase mb-2">Perks & Benefits</h4>
            <p className="text-xs font-bold italic">{job["Phúc Lợi"]}</p>
          </div>
        </div>

        <a 
          href={job["LINK BÀI VIẾT"]} 
          target="_blank" 
          className="mt-12 block w-full bg-red-600 text-white text-center py-6 font-black text-2xl uppercase tracking-widest hover:bg-black transition-all shadow-xl"
        >
          Quick Apply Now
        </a>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
