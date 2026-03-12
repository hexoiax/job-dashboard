"use client";
import React, { useState, useEffect, useMemo } from 'react';

export default function JobDashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterLoc, setFilterLoc] = useState('All');
  const [filterPlat, setFilterPlat] = useState('All');

  // Fetch dữ liệu
  const fetchData = async () => {
    try {
      const res = await fetch('https://api.steinhq.com/v1/storages/69b224fbaffba40a625db5bd/Jobs');
      const data = await res.json();
      setJobs(Array.isArray(data) ? data.reverse() : []);
      setLoading(false);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Auto-refresh 60s
    return () => clearInterval(interval);
  }, []);

  // Logic Lọc tức thì (Instant Filter)
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const matchLoc = filterLoc === 'All' || (j.Location && j.Location.includes(filterLoc));
      const matchPlat = filterPlat === 'All' || (j.Platform && j.Platform.includes(filterPlat));
      return matchLoc && matchPlat;
    });
  }, [jobs, filterLoc, filterPlat]);

  if (loading) return <div className="p-20 text-center font-mono animate-pulse">SYSTEM BOOTING...</div>;

  return (
    <div className="min-h-screen text-[#1A1A1A] font-sans selection:bg-yellow-200">
      
      {/* 5. HEADER & 16. STATS */}
      <header className="max-w-5xl mx-auto px-4 pt-12 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-black/5">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase">Ecommerce Job Dashboard</h1>
          <div className="flex gap-4 mt-2 text-[11px] font-mono text-slate-400 uppercase">
            <span>● {jobs.length} Total Jobs</span>
            <span className="text-green-600">● Updated 1 min ago</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* 6. FILTER BAR (Quan trọng nhất) */}
        <div className="flex flex-wrap gap-3 mb-12">
          <select 
            onChange={(e) => setFilterLoc(e.target.value)}
            className="appearance-none bg-white border-2 border-black px-4 py-2 text-xs font-bold rounded-none hover:bg-black hover:text-white transition-all cursor-pointer outline-none"
          >
            <option value="All uppercase">Location: All</option>
            <option value="Đà Nẵng">Đà Nẵng</option>
            <option value="Huế">Huế</option>
            <option value="Remote">Remote</option>
          </select>

          <select 
            onChange={(e) => setFilterPlat(e.target.value)}
            className="appearance-none bg-white border-2 border-black px-4 py-2 text-xs font-bold rounded-none hover:bg-black hover:text-white transition-all cursor-pointer outline-none"
          >
            <option value="All">Platform: All</option>
            <option value="Amazon">Amazon/Etsy</option>
            <option value="POD">POD</option>
            <option value="Shopee">Shopee/TikTok</option>
          </select>
        </div>

        {/* 7. JOB LIST LAYOUT */}
        <div className="grid gap-3">
          {filteredJobs.map((job, i) => (
            <div 
              key={i}
              onClick={() => setSelectedJob(job)}
              className="group bg-white border border-slate-200 p-5 flex flex-col md:flex-row justify-between md:items-center hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer relative"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-lg uppercase tracking-tight group-hover:underline">{job.Position}</h3>
                  {/* 17. NEW BADGE */}
                  <span className="text-[9px] bg-yellow-400 text-black px-1.5 py-0.5 font-black uppercase">New</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium uppercase tracking-wider">
                  <span>{job.CompanyName}</span>
                  <span>📍 {job.Location}</span>
                  <span className="text-black font-bold tracking-tighter italic">💰 {job.LươngMin} - {job.LươngMax}</span>
                </div>
              </div>
              <div className="mt-4 md:mt-0 text-right">
                <div className="text-[10px] font-mono text-slate-300 group-hover:text-black uppercase mb-1">{job.Platform}</div>
                <div className="text-[10px] font-bold py-1 px-3 border border-slate-200 group-hover:border-black inline-block">SCAN JOB →</div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* 8. JOB DETAIL PANEL (SIDE PANEL) */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end transition-all">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 border-l-4 border-black">
            
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center">
              <button 
                onClick={() => setSelectedJob(null)}
                className="text-[10px] font-black border-2 border-black px-4 py-2 hover:bg-black hover:text-white transition-all"
              >
                ← BACK TO DASHBOARD
              </button>
              <div className="text-[10px] font-mono text-slate-400 uppercase">JobID: {selectedJob.IDBàiviết}</div>
            </div>

            <div className="p-8 md:p-12">
              <header className="mb-12">
                <p className="text-xs font-mono text-blue-600 font-bold uppercase mb-2">{selectedJob.CompanyName} // {selectedJob.Platform}</p>
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-8">{selectedJob.Position}</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4">
                    <p className="text-[10px] font-mono text-slate-400 uppercase mb-1">Salary Budget</p>
                    <p className="text-sm font-bold tracking-tighter italic">{selectedJob.LươngMin} - {selectedJob.LươngMax}</p>
                  </div>
                  <div className="bg-slate-50 p-4">
                    <p className="text-[10px] font-mono text-slate-400 uppercase mb-1">Work Location</p>
                    <p className="text-sm font-bold tracking-tighter italic">{selectedJob.Location}</p>
                  </div>
                </div>
              </header>

              <article className="prose max-w-none">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] border-b-2 border-black pb-2 mb-6 text-slate-400">Full Description</h4>
                <div className="whitespace-pre-line text-sm md:text-base text-slate-700 font-medium leading-relaxed">
                  {selectedJob.NộiDungGốc}
                </div>
              </article>
              
              <div className="mt-12 sticky bottom-0 bg-gradient-to-t from-white pt-10 pb-4">
                <a 
                  href={selectedJob.LINKBÀIVIẾT}
                  target="_blank"
                  className="block w-full bg-black text-white text-center py-6 font-black text-lg uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-xl"
                >
                  Apply Directly
                </a>
                <p className="text-center text-[9px] font-mono text-slate-400 mt-4 italic">No registration required. Link opens recruiter's original post.</p>
              </div>
            </div>
          </div>
          <div className="flex-1 hidden md:block" onClick={() => setSelectedJob(null)}></div>
        </div>
      )}

      <footer className="max-w-5xl mx-auto px-4 py-20 text-center border-t border-slate-100">
        <p className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">Built with Zero-Friction Logic • Ecommerce Job Dashboard 2026</p>
      </footer>
    </div>
  );
}
