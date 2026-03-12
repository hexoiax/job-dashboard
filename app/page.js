"use client";
import React, { useState, useEffect, useMemo } from 'react';

export default function JobDashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [hoveredJob, setHoveredJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterLoc, setFilterLoc] = useState('All');
  const [filterPlat, setFilterPlat] = useState('All');

  const fetchData = async () => {
    try {
      // Gọi trực tiếp đến API Stein của bạn
      const res = await fetch('https://api.steinhq.com/v1/storages/69b224fbaffba40a625db5bd/Jobs');
      const data = await res.json();
      setJobs(Array.isArray(data) ? data.reverse() : []);
      setLoading(false);
    } catch (e) { console.error("API Error:", e); setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const matchLoc = filterLoc === 'All' || (j.Location && j.Location.includes(filterLoc));
      const matchPlat = filterPlat === 'All' || (j.Platform && j.Platform.includes(filterPlat));
      return matchLoc && matchPlat;
    });
  }, [jobs, filterLoc, filterPlat]);

  if (loading) return <div className="p-20 text-center font-mono text-black animate-pulse uppercase tracking-widest">Initialising Terminal...</div>;

  return (
    <div className="min-h-screen bg-[#F0F0F0] text-black font-sans p-4 md:p-8">
      
      {/* HEADER & STATS */}
      <header className="max-w-[1600px] mx-auto mb-8 flex justify-between items-end border-b-2 border-black pb-4">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Ecommerce Job Grid</h1>
          <p className="text-[10px] font-mono mt-2 uppercase font-bold text-slate-500">
            Total Listing: {jobs.length} — Online: {filteredJobs.length} — Updated: 2026-03-12
          </p>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto">
        
        {/* QUICK-CLICK FILTER BAR */}
        <div className="space-y-4 mb-10">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-black uppercase w-20">Location:</span>
            {['All', 'Đà Nẵng', 'Huế', 'Remote'].map(loc => (
              <button 
                key={loc}
                onClick={() => setFilterLoc(loc)}
                className={`px-4 py-1.5 text-[11px] font-bold border-2 transition-all ${filterLoc === loc ? 'bg-black text-white border-black' : 'bg-white border-black hover:bg-yellow-300'}`}
              >
                {loc.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-black uppercase w-20">Platform:</span>
            {['All', 'Amazon', 'POD', 'TikTok'].map(plat => (
              <button 
                key={plat}
                onClick={() => setFilterPlat(plat)}
                className={`px-4 py-1.5 text-[11px] font-bold border-2 transition-all ${filterPlat === plat ? 'bg-black text-white border-black' : 'bg-white border-black hover:bg-blue-400'}`}
              >
                {plat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* JOB GRID 4X6 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredJobs.map((job, i) => (
            <div 
              key={i}
              onMouseEnter={() => setHoveredJob(job)}
              onMouseLeave={() => setHoveredJob(null)}
              onClick={() => setSelectedJob(job)}
              className="relative aspect-[3/4] bg-white border-2 border-black p-4 flex flex-col justify-between hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all cursor-crosshair group"
            >
              <div>
                <div className="text-[9px] font-mono mb-2 text-slate-400 uppercase tracking-tighter line-clamp-1 border-b pb-1">
                  {job.CompanyName}
                </div>
                <h3 className="text-sm font-black leading-tight uppercase group-hover:text-blue-600 line-clamp-3">
                  {job.Position}
                </h3>
              </div>
              
              <div className="mt-auto">
                <div className="text-[10px] font-black italic mb-1">{job.LươngMin}</div>
                <div className="flex justify-between items-center">
                   <span className="text-[8px] bg-slate-100 px-1 font-bold">{job.Platform}</span>
                   <span className="text-[10px] font-black">→</span>
                </div>
              </div>

              {/* HOVER DATA OVERLAY */}
              {hoveredJob === job && (
                <div className="absolute inset-0 bg-black text-white p-4 z-10 flex flex-col justify-center animate-in fade-in duration-200">
                  <p className="text-[10px] font-mono leading-tight italic">
                    {job.NộiDungGốc?.substring(0, 150)}...
                  </p>
                  <p className="mt-4 text-[9px] font-black underline italic">CLICK TO FULL DETAILS</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* SIDE PANEL (Click to View) */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-end">
          <div className="w-full max-w-xl bg-white h-full p-8 md:p-12 overflow-y-auto relative border-l-8 border-yellow-400">
            <button 
              onClick={() => setSelectedJob(null)}
              className="mb-8 text-xs font-black border-2 border-black px-4 py-2 hover:bg-red-500 hover:text-white transition-all uppercase"
            >
              [ESC] Close Panel
            </button>
            
            <p className="text-xs font-mono text-blue-600 font-bold mb-2">{selectedJob.CompanyName} // {selectedJob.Location}</p>
            <h2 className="text-4xl font-black uppercase leading-[0.85] tracking-tighter mb-8">{selectedJob.Position}</h2>
            
            <div className="grid grid-cols-2 border-2 border-black mb-8">
              <div className="p-4 border-r-2 border-black">
                <p className="text-[9px] font-black uppercase mb-1">Budget</p>
                <p className="font-bold text-sm italic">{selectedJob.LươngMin} - {selectedJob.LươngMax}</p>
              </div>
              <div className="p-4">
                <p className="text-[9px] font-black uppercase mb-1">Platform</p>
                <p className="font-bold text-sm italic">{selectedJob.Platform}</p>
              </div>
            </div>

            <div className="prose">
              <h4 className="text-[10px] font-black uppercase border-b-2 border-black pb-1 mb-4">Description</h4>
              <p className="whitespace-pre-line text-sm text-slate-700 leading-relaxed">
                {selectedJob.NộiDungGốc}
              </p>
            </div>
            
            <a 
              href={selectedJob.LINKBÀIVIẾT} 
              target="_blank"
              className="mt-12 block w-full bg-black text-white text-center py-6 font-black text-xl uppercase tracking-widest hover:bg-yellow-400 hover:text-black transition-all"
            >
              Apply Now
            </a>
          </div>
          <div className="flex-1" onClick={() => setSelectedJob(null)}></div>
        </div>
      )}
    </div>
  );
}
