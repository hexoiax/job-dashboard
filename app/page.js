"use client";
import React, { useState, useEffect } from 'react';

export default function JobDashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://api.steinhq.com/v1/storages/69b224fbaffba40a625db5bd/Jobs')
      .then(res => res.json())
      .then(data => {
        setJobs(Array.isArray(data) ? data.reverse() : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-20 text-center font-mono">CONNECTING...</div>;

  return (
    <div className="min-h-screen bg-white text-slate-900 p-4 md:p-10">
      <header className="max-w-4xl mx-auto mb-10 border-b pb-6">
        <h1 className="text-2xl font-black uppercase">Ecommerce Job Dashboard</h1>
        <p className="text-xs font-mono text-slate-400 mt-2">Total Jobs: {jobs.length} | Real-time from Google Sheet</p>
      </header>

      <div className="max-w-4xl mx-auto grid gap-3">
        {jobs.map((job, index) => (
          <div 
            key={index}
            onClick={() => setSelectedJob(job)}
            className="border border-slate-200 p-5 rounded-lg hover:border-black cursor-pointer transition-all flex justify-between items-center bg-white shadow-sm"
          >
            <div>
              <h3 className="font-bold text-lg leading-tight">{job.Position}</h3>
              <div className="text-sm text-slate-500 mt-1 flex gap-3">
                <span>{job.CompanyName}</span>
                <span className="text-slate-300">|</span>
                <span>{job.Location}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-green-600 font-bold text-sm">{job.LươngMin} - {job.LươngMax}</div>
              <div className="text-[10px] text-slate-400 uppercase mt-1">{job.Platform}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Side Panel */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-xl bg-white h-full p-8 shadow-2xl overflow-y-auto">
            <button onClick={() => setSelectedJob(null)} className="text-xs font-bold border px-3 py-1 mb-6 hover:bg-black hover:text-white transition-all uppercase">← Close</button>
            <h2 className="text-3xl font-black uppercase leading-none mb-4">{selectedJob.Position}</h2>
            <p className="text-blue-600 font-bold mb-8 italic">{selectedJob.CompanyName} / {selectedJob.Location}</p>
            <div className="prose text-sm text-slate-600">
              <h4 className="font-bold text-black border-b pb-2 mb-4 uppercase text-xs tracking-widest">Description</h4>
              <p className="whitespace-pre-line mb-8">{selectedJob.NộiDungGốc}</p>
            </div>
            <a href={selectedJob.LINKBÀIVIẾT} target="_blank" className="block w-full bg-black text-white text-center py-4 font-bold uppercase tracking-widest">Apply Directly</a>
          </div>
          <div className="flex-1" onClick={() => setSelectedJob(null)}></div>
        </div>
      )}
    </div>
  );
}
