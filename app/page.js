"use client";
import React, { useState, useEffect, useMemo } from 'react';

export default function JobDashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filters, setFilters] = useState({ location: 'All', level: 'All' });
  const [loading, setLoading] = useState(true);

  const API_URL = 'https://api.steinhq.com/v1/storages/69b224fbaffba40a625db5bd/Jobs';

  const fetchJobs = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      // Đảo ngược để job mới nhất lên đầu
      setJobs(Array.isArray(data) ? data.reverse() : []);
      setLoading(false);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchLoc = filters.location === 'All' || (job.Location && job.Location.includes(filters.location));
      const matchLevel = filters.level === 'All' || job.Level === filters.level;
      return matchLoc && matchLevel;
    });
  }, [jobs, filters]);

  if (loading) return <div className="p-20 text-center font-mono text-slate-400 animate-pulse">CONNECTING TO SHEET...</div>;

  return (
    <div className="min-h-screen bg-[#FBFBFB] text-[#1A1A1A]">
      {/* HEADER */}
      <header className="max-w-5xl mx-auto pt-12 pb-8 px-4 flex justify-between items-end border-b border-slate-100">
        <div>
          <h1 className="text-xl font-bold tracking-tighter uppercase italic">Ecommerce Job Dashboard</h1>
          <p className="text-[10px] font-mono text-slate-400 mt-1">REAL-TIME DATA FROM GOOGLE SHEETS</p>
        </div>
        <div className="hidden md:block text-right font-mono text-[10px]">
          <span className="text-green-500 font-bold">● {jobs.length} JOBS LIVE</span>
          <p className="text-slate-300">Updated: Just now</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* FILTER BAR - INSTANT FILTER */}
        <div className="flex gap-3 mb-10 overflow-x-auto pb-2">
          <select 
            onChange={(e) => setFilters({...filters, location: e.target.value})}
            className="bg-white border border-slate-200 text-xs font-bold px-4 py-2 rounded shadow-sm outline-none focus:border-black"
          >
            <option value="All">LOCATION: ALL</option>
            <option value="Đà Nẵng">ĐÀ NẴNG</option>
            <option value="Huế">HUẾ</option>
            <option value="Remote">REMOTE</option>
          </select>
          <select 
            onChange={(e) => setFilters({...filters, level: e.target.value})}
            className="bg-white border border-slate-200 text-xs font-bold px-4 py-2 rounded shadow-sm outline-none focus:border-black"
          >
            <option value="All">LEVEL: ALL</option>
            <option value="Intern">INTERN</option>
            <option value="Fresher">FRESHER</option>
            <option value="Junior">JUNIOR</option>
          </select>
        </div>

        {/* JOB LIST */}
        <div className="grid gap-2">
          {filteredJobs.map((job) => (
            <div 
              key={job.JobID}
              onClick={() => setSelectedJob(job)}
              className="group flex justify-between items-center bg-white border border-slate-100 p-5 rounded hover:border-black hover:shadow-xl transition-all cursor-pointer"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-base uppercase tracking-tight">{job.Position}</h3>
                  <span className="text-[9px] bg-black text-white px-2 py-0.5 rounded-full font-bold">NEW</span>
                </div>
                <div className="flex gap-4 text-[11px] font-medium text-slate-400 uppercase">
                  <span>{job.CompanyName}</span>
                  <span>{job.Location}</span>
                  <span className="text-black font-bold tracking-tighter italic">Lương: {job.LươngMin} - {job.LươngMax}</span>
                </div>
              </div>
              <div className="hidden sm:block text-[10px] font-mono text-slate-300 group-hover:text-black transition-colors">
                [ CLICK TO VIEW ]
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* SIDE PANEL */}
      {selectedJob && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full border-l border-slate-100 p-10 overflow-y-auto shadow-2xl relative">
            <button 
              onClick={() => setSelectedJob(null)}
              className="absolute top-10 right-10 text-[10px] font-bold border border-black px-3 py-1 hover:bg-black hover:text-white transition-all"
            >
              CLOSE [ESC]
            </button>
            
            <div className="mt-10">
              <p className="text-xs font-mono text-slate-400 mb-2 uppercase">{selectedJob.CompanyName} / {selectedJob.Platform}</p>
              <h2 className="text-4xl font-black uppercase mb-6 tracking-tighter leading-none">{selectedJob.Position}</h2>
              
              <div className="flex gap-4 mb-12">
                <div className="bg-slate-50 p-4 rounded min-w-[120px]">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Salary Range</p>
                  <p className="text-sm font-bold tracking-tighter">{selectedJob.LươngMin} - {selectedJob.LươngMax}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded min-w-[120px]">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Location</p>
                  <p className="text-sm font-bold tracking-tighter">{selectedJob.Location}</p>
                </div>
              </div>

              <div className="prose max-w-none mb-12">
                <h4 className="text-xs font-black uppercase tracking-widest border-b pb-2 mb-4">Job Details</h4>
                <p className="whitespace-pre-line text-sm text-slate-600 leading-relaxed font-medium">
                  {selectedJob.NộiDungGốc}
                </p>
              </div>
              
              <a 
                href={selectedJob.LINKBÀIVIẾT}
                target="_blank"
                className="inline-block w-full bg-black text-white text-center py-5 font-black uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-95"
              >
                Apply Direct to Recruiter
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
