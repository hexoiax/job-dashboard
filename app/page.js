export const dynamic = 'force-dynamic'; // Bắt buộc cho Next.js 16 khi dùng API ngoài

import React from 'react';

async function getJobs() {
  try {
    const res = await fetch('https://api.steinhq.com/v1/storages/69b224fbaffba40a625db5bd/Jobs', { 
      cache: 'no-store' 
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.reverse() : [];
  } catch (e) {
    return [];
  }
}

export default async function JobDashboard() {
  const jobs = await getJobs();

  return (
    <div className="min-h-screen bg-white text-slate-900 p-4 md:p-10">
      <header className="max-w-4xl mx-auto mb-10 border-b pb-6">
        <h1 className="text-2xl font-black uppercase tracking-tighter">Ecommerce Job Dashboard</h1>
        <p className="text-[10px] font-mono text-slate-400 mt-2 uppercase">Live Jobs: {jobs.length} | Data: Google Sheets</p>
      </header>

      <div className="max-w-4xl mx-auto grid gap-2">
        {jobs.map((job, index) => (
          <div 
            key={index}
            className="border border-slate-100 p-5 rounded hover:border-black cursor-pointer transition-all flex justify-between items-center group"
          >
            <div>
              <h3 className="font-bold text-lg leading-tight uppercase group-hover:underline">{job.Position}</h3>
              <div className="text-[11px] text-slate-500 mt-1 uppercase font-medium">
                {job.CompanyName} — {job.Location}
              </div>
            </div>
            <div className="text-right">
              <div className="text-black font-black text-sm italic">{job.LươngMin} - {job.LươngMax}</div>
              <a 
                href={job.LINKBÀIVIẾT} 
                target="_blank" 
                className="text-[9px] bg-slate-100 px-2 py-1 rounded font-bold mt-2 inline-block hover:bg-black hover:text-white"
              >
                VIEW DETAILS
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
