"use client";
import React, { useState, useEffect, useMemo } from 'react';

export default function JobDashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [hoveredJob, setHoveredJob] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State cho bộ lọc
  const [filterLoc, setFilterLoc] = useState('All');
  const [filterPlat, setFilterPlat] = useState('All');

  const fetchData = async () => {
    try {
      const res = await fetch('https://api.steinhq.com/v1/storages/69b224fbaffba40a625db5bd/Jobs');
      const data = await res.json();
      setJobs(Array.isArray(data) ? data.reverse() : []);
      setLoading(false);
    } catch (e) { 
      console.error("API Error:", e); 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- TƯ DUY TỰ ĐỘNG THIẾT LẬP BỘ LỌC (DYNAMIC EXTRACTOR) ---
  const dynamicFilters = useMemo(() => {
    const locations = new Set();
    const platforms = new Set();

    jobs.forEach(j => {
      // Xử lý địa điểm (lấy từ cột "Địa chỉ", tách lấy tên tỉnh thành nếu cần)
      const loc = j["Địa chỉ"];
      if (loc && loc !== "Không rõ") {
        if (loc.includes("Đà Nẵng")) locations.add("Đà Nẵng");
        else if (loc.includes("Huế")) locations.add("Huế");
        else if (loc.includes("Remote")) locations.add("Remote");
        else locations.add(loc.split(',').pop().trim()); // Lấy phần cuối của địa chỉ
      }

      // Xử lý Platform (Tách dấu phẩy nếu một job có nhiều platform)
      const plat = j["Platform"];
      if (plat && plat !== "Không rõ") {
        plat.split(',').forEach(p => platforms.add(p.trim()));
      }
    });

    return {
      locations: ['All', ...Array.from(locations)],
      platforms: ['All', ...Array.from(platforms)]
    };
  }, [jobs]);

  // Logic lọc dữ liệu
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const locValue = j["Địa chỉ"] || "";
      const platValue = j["Platform"] || "";
      const matchLoc = filterLoc === 'All' || locValue.includes(filterLoc);
      const matchPlat = filterPlat === 'All' || platValue.includes(filterPlat);
      return matchLoc && matchPlat;
    });
  }, [jobs, filterLoc, filterPlat]);

  if (loading) return <div className="p-20 font-mono text-center animate-pulse">EXTRACTING DATA...</div>;

  return (
    <div className="min-h-screen bg-[#F0F0F0] text-black p-4 md:p-8 font-sans">
      
      <header className="max-w-[1600px] mx-auto mb-10 border-b-4 border-black pb-4">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Ecommerce Job Grid</h1>
        <p className="text-[10px] font-mono font-bold text-slate-500 mt-2 uppercase">
          Dynamic Filters Active // {filteredJobs.length} Jobs Found
        </p>
      </header>

      <main className="max-w-[1600px] mx-auto">
        
        {/* BỘ LỌC TỰ ĐỘNG (DYNAMIC CHIPS) */}
        <div className="space-y-6 mb-12 bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-[10px] font-black uppercase w-20">Địa điểm:</span>
            {dynamicFilters.locations.map(loc => (
              <button 
                key={loc}
                onClick={() => setFilterLoc(loc)}
                className={`px-4 py-1 text-[11px] font-bold border-2 transition-all ${filterLoc === loc ? 'bg-black text-white' : 'bg-white hover:bg-yellow-300 border-black'}`}
              >
                {loc.toUpperCase()}
              </button>
            ))}
          </div>
          
          <div className="flex flex-wrap gap-3 items-center border-t border-black/10 pt-4">
            <span className="text-[10px] font-black uppercase w-20">Nền tảng:</span>
            {dynamicFilters.platforms.map(plat => (
              <button 
                key={plat}
                onClick={() => setFilterPlat(plat)}
                className={`px-4 py-1 text-[11px] font-bold border-2 transition-all ${filterPlat === plat ? 'bg-black text-white' : 'bg-white hover:bg-blue-400 border-black'}`}
              >
                {plat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* LƯỚI 4X6 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredJobs.map((job, i) => (
            <div 
              key={i}
              onMouseEnter={() => setHoveredJob(job)}
              onMouseLeave={() => setHoveredJob(null)}
              onClick={() => setSelectedJob(job)}
              className="relative aspect-[3/4.2] bg-white border-2 border-black p-4 flex flex-col justify-between hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer overflow-hidden"
            >
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase truncate mb-2">{job["Tên Công Ty"]}</p>
                <h3 className="text-sm font-black leading-tight uppercase line-clamp-4">{job["Vị Trí"]}</h3>
              </div>
              
              <div className="mt-auto pt-4 border-t border-black/5">
                <p className="text-[11px] font-black italic">{job["Lương Min"] ? `${job["Lương Min"]} - ${job["Lương Max"]}` : "Thỏa thuận"}</p>
                <div className="flex justify-between mt-2">
                  <span className="text-[8px] font-bold bg-slate-100 px-1 border border-black">{job["Platform"]}</span>
                  <span className="text-[10px] font-black">→</span>
                </div>
              </div>

              {/* HOVER OVERLAY */}
              {hoveredJob === job && (
                <div className="absolute inset-0 bg-black text-white p-5 flex flex-col justify-center animate-in fade-in zoom-in duration-200">
                  <p className="text-[10px] font-mono leading-relaxed line-clamp-6 italic">
                    {job["Nội Dung Gốc"]}
                  </p>
                  <p className="mt-4 text-[9px] font-black underline text-yellow-400 uppercase tracking-widest">Xem chi tiết</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* SIDE PANEL */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-end">
          <div className="w-full max-w-xl bg-white h-full p-8 md:p-12 overflow-y-auto border-l-8 border-black animate-in slide-in-from-right">
            <button onClick={() => setSelectedJob(null)} className="mb-8 text-xs font-black border-2 border-black px-4 py-2 hover:bg-black hover:text-white uppercase transition-all">← Close</button>
            <p className="text-xs font-mono text-blue-600 font-bold mb-2 uppercase">{selectedJob["Tên Công Ty"]} // {selectedJob["Địa chỉ"]}</p>
            <h2 className="text-4xl font-black uppercase leading-none mb-8 tracking-tighter">{selectedJob["Vị Trí"]}</h2>
            
            <div className="grid grid-cols-2 border-2 border-black mb-8 bg-slate-50">
              <div className="p-4 border-r-2 border-black"><p className="text-[9px] font-black text-slate-400 uppercase">Lương</p><p className="font-bold">{selectedJob["Lương Min"]} - {selectedJob["Lương Max"]}</p></div>
              <div className="p-4"><p className="text-[9px] font-black text-slate-400 uppercase">Platform</p><p className="font-bold uppercase">{selectedJob["Platform"]}</p></div>
            </div>

            <div className="prose">
              <h4 className="text-[10px] font-black uppercase border-b-2 border-black pb-1 mb-4">Chi tiết công việc</h4>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{selectedJob["Nội Dung Gốc"]}</p>
            </div>
            
            <a href={selectedJob["LINK BÀI VIẾT"]} target="_blank" className="mt-12 block w-full bg-black text-white text-center py-6 font-black text-xl hover:bg-yellow-400 hover:text-black transition-all uppercase tracking-widest">Apply Now</a>
          </div>
          <div className="flex-1" onClick={() => setSelectedJob(null)}></div>
        </div>
      )}
    </div>
  );
}
