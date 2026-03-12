"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const AREA_MAP = {
  "Hải Châu":"Central","Thanh Khê":"Central",
  "Sơn Trà":"Beach","Ngũ Hành Sơn":"Beach",
  "Liên Chiểu":"North","Cẩm Lệ":"Airport",
  "Hòa Vang":"Suburban","Hòa Xuân":"Airport",
};
const AREA_LABELS = {
  Central:"🏙 Central", Beach:"🌊 Beach",
  North:"🏭 North", Airport:"✈ Airport",
  Suburban:"🌿 Suburban", Remote:"💻 Remote",
};
const TAG_CFG = {
  "NEW":     { bg:"#E6F9F0", color:"#1A7F4B", border:"#9FDFBF" },
  "HOT":     { bg:"#FEE9E9", color:"#B53030", border:"#F5AAAA" },
  "URGENT":  { bg:"#FEF6E0", color:"#8A6200", border:"#F5D97A" },
  "HIGH SALARY":{ bg:"#FFF3E0", color:"#B56000", border:"#FFC87A" },
  "REMOTE":  { bg:"#E8F3FC", color:"#1A5A8A", border:"#9ECEF5" },
};

// ─────────────────────────────────────────────────────────────
// DATA PIPELINE
// ─────────────────────────────────────────────────────────────
function parseSalary(raw) {
  if (!raw) return 0;
  const n = parseInt(raw.toString().replace(/\D/g,""));
  if (!n) return 0;
  if (n < 1000) return n * 1_000_000;
  if (n < 500_000) return n * 1_000;
  return n;
}

function normalizeJob(job, allJobs) {
  const salaryMin = parseSalary(job["Lương Min"]);
  const salaryMax = parseSalary(job["Lương Max"]) || salaryMin;

  const rawQuan = job["Quận"] || "";
  const rawAddr = job["Địa chỉ"] || "";
  const isRemote = /remote|tại nhà/i.test(rawAddr);
  const district = rawQuan && rawQuan !== "Không rõ" ? rawQuan : "Không rõ";
  const area = isRemote ? "Remote" : (AREA_MAP[district] || (rawAddr.includes("Huế") ? "Huế" : "Đà Nẵng"));

  let daysOld = 999;
  const rawDate = job["Ngày đăng bài"] || "";
  if (rawDate) {
    const dp = rawDate.split(" ")[1];
    if (dp) {
      const [d,m,y] = dp.split("/");
      const dt = new Date(`${y}-${m?.padStart(2,"0")}-${d?.padStart(2,"0")}`);
      if (!isNaN(dt)) daysOld = Math.floor((Date.now()-dt)/86_400_000);
    }
  }
  const freshnessStatus = rawDate ? (daysOld<=3?"new":daysOld<=7?"active":"hidden") : "active";
  const freshnessBoost  = daysOld<=1?10:daysOld<=3?7:daysOld<=7?4:0;

  let score = 0;
  if (salaryMax>=30_000_000) score+=30;
  else if (salaryMax>=15_000_000) score+=20;
  else if (salaryMax>=7_000_000) score+=10;
  if (salaryMin) score+=5;
  if (district!=="Không rõ") score+=3;
  if (job["Email"] && job["Email"]!=="Không rõ") score+=3;
  if (job["Phúc Lợi"]) score+=5;
  const tu = (job["Vị Trí"]||"").toUpperCase();
  if (tu.includes("POD")) score+=10;
  if (/ECOMMERCE|E-COMMERCE|ECOM/.test(tu)) score+=8;
  const cCount = allJobs.filter(j=>j["Tên Công Ty"]===job["Tên Công Ty"]).length;
  if (cCount>=2) score+=5;
  score+=freshnessBoost;

  const content = `${job["Vị Trí"]||""} ${job["Nội Dung Gốc"]||""}`.toLowerCase();
  const tags = [];
  if (freshnessStatus==="new") tags.push("NEW");
  if (score>45) tags.push("HOT");
  if (/tuyển gấp|đi làm ngay|urgent/.test(content)) tags.push("URGENT");
  if (salaryMax>=20_000_000) tags.push("HIGH SALARY");
  if (isRemote) tags.push("REMOTE");

  return { ...job, salaryMin, salaryMax, district, area,
    daysOld, freshnessStatus, isVerified:cCount>=2, finalScore:score, tags };
}

function deriveOptions(jobs) {
  return {
    areas:    [...new Set(jobs.map(j=>j.area).filter(Boolean))].sort(),
    districts:[...new Set(jobs.map(j=>j.district).filter(d=>d!=="Không rõ"))].sort(),
    levels:   [...new Set(jobs.map(j=>j["Level"]).filter(Boolean))].sort(),
  };
}

// ─────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────
export default function JobDiscoveryFinal() {
  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState("");
  const [salary, setSalary]     = useState([0,50]);
  const [opts, setOpts]         = useState({areas:[],districts:[],levels:[]});
  const [filters, setFilters]   = useState({ preset:"All", areas:[], districts:[], levels:[] });

  useEffect(()=>{
    (async()=>{
      try {
        const r = await fetch("https://api.steinhq.com/v1/storages/69b224fbaffba40a625db5bd/Jobs");
        const data = await r.json();
        const norm = data
          .map(j=>normalizeJob(j,data))
          .filter(j=>j.freshnessStatus!=="hidden")
          .sort((a,b)=>b.finalScore-a.finalScore);
        setJobs(norm);
        setOpts(deriveOptions(norm));
      } catch(e){ console.error(e); }
      finally { setLoading(false); }
    })();
  },[]);

  const toggle = useCallback((cat,val)=>{
    setFilters(p=>({ ...p, [cat]: p[cat].includes(val)?p[cat].filter(i=>i!==val):[...p[cat],val] }));
  },[]);

  const reset = ()=>{ setFilters({preset:"All",areas:[],districts:[],levels:[]}); setSalary([0,50]); setSearch(""); };

  const processed = useMemo(()=>jobs.filter(j=>{
    const q = search.toLowerCase();
    if (q && !`${j["Vị Trí"]} ${j["Tên Công Ty"]} ${j["Kỹ Năng"]||""} ${j.district}`.toLowerCase().includes(q)) return false;
    if (filters.areas.length    && !filters.areas.includes(j.area))          return false;
    if (filters.districts.length && !filters.districts.includes(j.district))  return false;
    if (filters.levels.length   && !filters.levels.includes(j["Level"]))      return false;
    if (j.salaryMax>0 && (j.salaryMax<salary[0]*1_000_000 || j.salaryMax>salary[1]*1_000_000)) return false;
    const p = filters.preset;
    if (p==="New"        && j.freshnessStatus!=="new")                     return false;
    if (p==="HighSalary" && j.salaryMax<15_000_000)                        return false;
    if (p==="Remote"     && j.area!=="Remote")                             return false;
    if (p==="POD"        && !(j["Vị Trí"]||"").toUpperCase().includes("POD")) return false;
    if (p==="EasyApply"  && (!j["Email"]||j["Email"]==="Không rõ"))        return false;
    return true;
  }),[jobs,search,filters,salary]);

  const isFiltering = search||filters.preset!=="All"||filters.areas.length||filters.districts.length||filters.levels.length||salary[0]>0||salary[1]<50;

  const newJobs    = useMemo(()=>processed.filter(j=>j.freshnessStatus==="new").slice(0,8),[processed]);
  const topSalary  = useMemo(()=>[...processed].sort((a,b)=>b.salaryMax-a.salaryMax).filter(j=>j.salaryMax>0).slice(0,8),[processed]);
  const podJobs    = useMemo(()=>processed.filter(j=>(j["Vị Trí"]||"").toUpperCase().includes("POD")).slice(0,8),[processed]);
  const central    = useMemo(()=>processed.filter(j=>j.area==="Central").slice(0,8),[processed]);

  const todayN  = jobs.filter(j=>j.daysOld<=1).length;
  const verN    = jobs.filter(j=>j.isVerified).length;
  const emailN  = jobs.filter(j=>j["Email"]&&j["Email"]!=="Không rõ").length;

  if (loading) return (
    <div style={{background:"#F4EFE8",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:56,marginBottom:16,animation:"spin 1.5s linear infinite",display:"inline-block"}}>⚙️</div>
        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:"#7A6A58",letterSpacing:"0.2em",textTransform:"uppercase"}}>Loading…</p>
      </div>
    </div>
  );

  return (
    <div style={{background:"#F4EFE8",minHeight:"100vh",fontFamily:"'Jost',sans-serif",color:"#28200F"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Jost:wght@400;500;600;700&family=Inconsolata:wght@600&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :root {
          --bg:      #F4EFE8;
          --bg2:     #EDE5D8;
          --bg3:     #E4D9CA;
          --border:  #CFC3B0;
          --ink:     #28200F;
          --ink2:    #5E5040;
          --ink3:    #9C8C78;
          --acc:     #B8621A;
          --acc2:    #F0DCC8;
          --green:   #3E6B48;
          --red:     #A83030;
          --shadow:  0 2px 12px rgba(40,32,15,0.07);
          --shadow2: 0 8px 32px rgba(40,32,15,0.12);
        }
        html { scroll-behavior:smooth; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:var(--bg2); }
        ::-webkit-scrollbar-thumb { background:var(--border); border-radius:3px; }
        .preset-chip {
          display:inline-flex; align-items:center; gap:7px;
          padding:12px 22px; font-size:15px; font-weight:600;
          letter-spacing:0.03em; border:1.5px solid var(--border);
          background:white; color:var(--ink2); cursor:pointer;
          transition:all 0.15s; white-space:nowrap; border-radius:4px;
          font-family:'Jost',sans-serif;
        }
        .preset-chip:hover { border-color:var(--acc); color:var(--acc); background:#FFF8F2; }
        .preset-chip.on { background:var(--ink); color:var(--bg); border-color:var(--ink); }
        .fpill {
          display:inline-flex; align-items:center;
          padding:9px 18px; font-size:14px; font-weight:600;
          border:1.5px solid var(--border); background:white;
          color:var(--ink2); cursor:pointer; border-radius:40px;
          transition:all 0.15s; white-space:nowrap; font-family:'Jost',sans-serif;
        }
        .fpill:hover { border-color:var(--acc); color:var(--acc); }
        .fpill.on { background:var(--ink); color:var(--bg); border-color:var(--ink); }
        .jcard {
          background:white; border:1.5px solid var(--border);
          border-radius:8px; cursor:pointer; display:flex;
          flex-direction:column; transition:all 0.2s;
          box-shadow:var(--shadow);
        }
        .jcard:hover { border-color:var(--acc); box-shadow:var(--shadow2); transform:translateY(-3px); }
        .card-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(300px,1fr));
          gap:20px;
          align-items:stretch;
        }
        .card-grid > * { height:100%; }
        .srow-wrap { position:relative; padding:0 0 8px; }
        .srow {
          display:grid;
          grid-template-columns:repeat(var(--cols,3),1fr);
          gap:20px;
          align-items:stretch;
        }
        .shelf-nav { display:flex; justify-content:flex-end; gap:8px; margin-top:16px; }
        .nav-btn {
          width:42px; height:42px; border-radius:50%;
          background:white; border:1.5px solid var(--border);
          box-shadow:0 2px 10px rgba(40,32,15,0.1);
          cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center;
          transition:all 0.15s; color:var(--ink); flex-shrink:0;
        }
        .nav-btn:hover { background:var(--ink); color:var(--bg); border-color:var(--ink); }
        .nav-btn:disabled { opacity:0.3; cursor:default; }
        .nav-btn:disabled:hover { background:white; color:var(--ink); border-color:var(--border); }
        .overlay { position:fixed;inset:0;background:rgba(40,32,15,0.55);z-index:200;display:flex;justify-content:flex-end; backdrop-filter:blur(2px); }
        .panel { background:var(--bg); height:100%; overflow-y:auto; display:flex; flex-direction:column; animation:slideIn 0.32s cubic-bezier(0.16,1,0.3,1); }
        @keyframes slideIn { from{opacity:0;transform:translateX(48px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .sinput {
          width:100%; padding:14px 20px; border:1.5px solid var(--border);
          background:white; font-size:16px; font-family:'Jost',sans-serif;
          color:var(--ink); outline:none; border-radius:6px; transition:border 0.15s;
        }
        .sinput:focus { border-color:var(--acc); box-shadow:0 0 0 3px rgba(184,98,26,0.08); }
        .sinput::placeholder { color:var(--ink3); }
        input[type=range] { -webkit-appearance:none; width:100%; height:4px; background:var(--bg3); outline:none; cursor:pointer; border-radius:2px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:20px; height:20px; background:var(--ink); border-radius:50%; cursor:pointer; border:2px solid white; box-shadow:0 1px 4px rgba(0,0,0,0.2); }
        .apply-btn {
          display:block; width:100%; padding:20px; background:var(--ink);
          color:var(--bg); font-weight:700; font-size:16px; letter-spacing:0.12em;
          text-transform:uppercase; text-align:center; text-decoration:none;
          transition:all 0.2s; border:none; cursor:pointer; border-radius:4px;
          font-family:'Jost',sans-serif;
        }
        .apply-btn:hover { background:var(--acc); }
        .stat { display:flex; flex-direction:column; align-items:center; gap:2px; }
      `}</style>

      {/* ══════════════════════ HEADER ══════════════════════ */}
      <header style={{background:"white",borderBottom:"1.5px solid var(--border)",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 16px rgba(40,32,15,0.06)"}}>
        <div style={{maxWidth:1440,margin:"0 auto",padding:"20px 32px"}}>
          <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:20,flexWrap:"wrap"}}>
            <div style={{flexShrink:0,paddingRight:20,borderRight:"1.5px solid var(--border)"}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:700,letterSpacing:"-0.01em",color:"var(--ink)",lineHeight:1}}>
                Job<span style={{color:"var(--acc)"}}>Radar</span>
              </div>
              <div style={{fontFamily:"Inconsolata,monospace",fontSize:11,color:"var(--ink3)",letterSpacing:"0.2em",textTransform:"uppercase",marginTop:3}}>
                {jobs.length} jobs · <span style={{color:"var(--green)"}}>{todayN} mới hôm nay</span>
              </div>
            </div>
            <div style={{flex:1,minWidth:240,position:"relative"}}>
              <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16,opacity:0.4,pointerEvents:"none"}}>🔍</span>
              <input className="sinput" style={{paddingLeft:42}} type="text" value={search}
                placeholder="Tìm vị trí, công ty, kỹ năng, quận..."
                onChange={e=>setSearch(e.target.value)} />
            </div>
            <div style={{display:"flex",gap:24,flexShrink:0,paddingLeft:20,borderLeft:"1.5px solid var(--border)"}}>
              <div className="stat">
                <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,color:"var(--ink)"}}>{jobs.length}</span>
                <span style={{fontFamily:"Inconsolata,monospace",fontSize:11,color:"var(--ink3)",textTransform:"uppercase",letterSpacing:"0.12em"}}>Active</span>
              </div>
              <div className="stat">
                <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,color:"var(--green)"}}>{todayN}</span>
                <span style={{fontFamily:"Inconsolata,monospace",fontSize:11,color:"var(--ink3)",textTransform:"uppercase",letterSpacing:"0.12em"}}>Hôm nay</span>
              </div>
              <div className="stat">
                <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,color:"var(--acc)"}}>{verN}</span>
                <span style={{fontFamily:"Inconsolata,monospace",fontSize:11,color:"var(--ink3)",textTransform:"uppercase",letterSpacing:"0.12em"}}>Verified</span>
              </div>
              <div className="stat">
                <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,color:"var(--ink)"}}>{emailN}</span>
                <span style={{fontFamily:"Inconsolata,monospace",fontSize:11,color:"var(--ink3)",textTransform:"uppercase",letterSpacing:"0.12em"}}>Có Email</span>
              </div>
            </div>
          </div>

          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
            {[
              {k:"New",e:"🕐",l:"Mới nhất"},
              {k:"HighSalary",e:"💰",l:"Lương >15M"},
              {k:"Remote",e:"💻",l:"Remote"},
              {k:"POD",e:"🚀",l:"POD Only"},
              {k:"EasyApply",e:"🎯",l:"Easy Apply"},
            ].map(({k,e,l})=>(
              <button key={k} className={`preset-chip ${filters.preset===k?"on":""}`}
                onClick={()=>setFilters(f=>({...f,preset:f.preset===k?"All":k}))}>
                <span>{e}</span>{l}
              </button>
            ))}
            {isFiltering && (
              <button onClick={reset} style={{marginLeft:"auto",padding:"10px 16px",fontSize:12,fontWeight:700,color:"var(--red)",background:"#FEF0F0",border:"1.5px solid #F5AAAA",borderRadius:4,cursor:"pointer",fontFamily:"'Jost',sans-serif",letterSpacing:"0.06em"}}>
                ✕ Reset Filter
              </button>
            )}
          </div>

          <div style={{display:"flex",gap:24,flexWrap:"wrap",alignItems:"flex-start"}}>
            {opts.areas.length>0 && (
              <FilterBlock label="Khu vực">
                {opts.areas.map(a=>(
                  <button key={a} className={`fpill ${filters.areas.includes(a)?"on":""}`}
                    onClick={()=>toggle("areas",a)}>{AREA_LABELS[a]||a}</button>
                ))}
              </FilterBlock>
            )}
            <div style={{width:1,background:"var(--border)",alignSelf:"stretch"}} />
            {opts.districts.length>0 && (
              <FilterBlock label="Quận">
                {opts.districts.map(d=>(
                  <button key={d} className={`fpill ${filters.districts.includes(d)?"on":""}`}
                    onClick={()=>toggle("districts",d)}>{d}</button>
                ))}
              </FilterBlock>
            )}
            <div style={{width:1,background:"var(--border)",alignSelf:"stretch"}} />
            {opts.levels.length>0 && (
              <FilterBlock label="Level">
                {opts.levels.map(l=>(
                  <button key={l} className={`fpill ${filters.levels.includes(l)?"on":""}`}
                    onClick={()=>toggle("levels",l)}>{l}</button>
                ))}
              </FilterBlock>
            )}
            <div style={{width:1,background:"var(--border)",alignSelf:"stretch"}} />
            <FilterBlock label={`Lương: ${salary[0]}M – ${salary[1]}M`}>
              <div style={{display:"flex",flexDirection:"column",gap:8,minWidth:200}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontFamily:"Inconsolata,monospace",fontSize:12,color:"var(--acc)",width:28,textAlign:"right"}}>{salary[0]}M</span>
                  <input type="range" min={0} max={50} step={1} value={salary[0]} style={{flex:1}}
                    onChange={e=>setSalary([+e.target.value,salary[1]])} />
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontFamily:"Inconsolata,monospace",fontSize:12,color:"var(--acc)",width:28,textAlign:"right"}}>{salary[1]}M</span>
                  <input type="range" min={0} max={50} step={1} value={salary[1]} style={{flex:1}}
                    onChange={e=>setSalary([salary[0],+e.target.value])} />
                </div>
              </div>
            </FilterBlock>
          </div>
        </div>
      </header>

      {/* ══════════════════════ MAIN ══════════════════════ */}
      <main style={{maxWidth:1440,margin:"0 auto",padding:"40px 32px 80px"}}>
        {isFiltering ? (
          <section>
            <SectionHead icon="🔍" title="Kết Quả Tìm Kiếm" sub={`${processed.length} vị trí phù hợp`} />
            {processed.length===0 ? (
              <Empty onReset={reset} />
            ) : (
              <div className="card-grid">
                {processed.map((j,i)=><JobCard key={i} job={j} onClick={()=>setSelected(j)} />)}
              </div>
            )}
          </section>
        ) : (
          <>
            {newJobs.length>0   && <Shelf icon="🕐" title="Job Mới Nhất"     sub={`${newJobs.length} vị trí trong 3 ngày qua`} jobs={newJobs}   onSel={setSelected} />}
            {topSalary.length>0 && <Shelf icon="💰" title="Top Lương Cao"    sub="Sắp xếp theo lương cao nhất"              jobs={topSalary} onSel={setSelected} />}
            {podJobs.length>0   && <Shelf icon="🚀" title="POD & E-Commerce" sub="Niche tăng trưởng — Thị trường quốc tế"  jobs={podJobs}   onSel={setSelected} />}
            {central.length>0   && <Shelf icon="📍" title="Khu Trung Tâm"    sub="Hải Châu · Thanh Khê — Dễ đi làm"        jobs={central}   onSel={setSelected} />}
            <section style={{marginTop:56}}>
              <SectionHead icon="📋" title="Tất Cả Cơ Hội" sub={`${processed.length} vị trí · Điểm cao nhất lên đầu`} />
              <div className="card-grid">
                {processed.map((j,i)=><JobCard key={i} job={j} onClick={()=>setSelected(j)} />)}
              </div>
            </section>
          </>
        )}
      </main>

      {selected && <DetailPanel job={selected} onClose={()=>setSelected(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS (unchanged from doc)
// ─────────────────────────────────────────────────────────────

function FilterBlock({ label, children }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <span style={{fontFamily:"Inconsolata,monospace",fontSize:12,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.18em",color:"var(--ink3)"}}>
        {label}
      </span>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        {children}
      </div>
    </div>
  );
}

function SectionHead({ icon, title, sub }) {
  return (
    <div style={{marginBottom:24}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
        <span style={{fontSize:24}}>{icon}</span>
        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:700,color:"var(--ink)"}}>{title}</span>
      </div>
      {sub && <p style={{fontFamily:"Inconsolata,monospace",fontSize:12,color:"var(--ink3)",letterSpacing:"0.12em",textTransform:"uppercase",marginLeft:34}}>{sub}</p>}
    </div>
  );
}

function Shelf({ icon, title, sub, jobs, onSel }) {
  const [page, setPage] = useState(0);
  const PER_PAGE = 3;
  const totalPages = Math.ceil(jobs.length / PER_PAGE);
  const visible = jobs.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <section style={{marginBottom:52}}>
      <SectionHead icon={icon} title={title} sub={sub} />
      <div className="srow-wrap">
        <div className="srow" style={{"--cols": PER_PAGE}}>
          {visible.map((j,i) => (
            <div key={`${page}-${i}`} style={{height:"100%"}}>
              <JobCard job={j} onClick={()=>onSel(j)} />
            </div>
          ))}
          {Array.from({length: PER_PAGE - visible.length}).map((_,i) => (
            <div key={`empty-${i}`} />
          ))}
        </div>
      </div>
      {totalPages > 1 && (
        <div className="shelf-nav">
          <span style={{fontSize:13,color:"var(--ink3)",fontFamily:"Inconsolata,monospace",alignSelf:"center",marginRight:4}}>
            {page+1} / {totalPages}
          </span>
          <button className="nav-btn" disabled={page===0} onClick={()=>setPage(p=>p-1)}>←</button>
          <button className="nav-btn" disabled={page>=totalPages-1} onClick={()=>setPage(p=>p+1)}>→</button>
        </div>
      )}
    </section>
  );
}

function Tag({ name }) {
  const cfg = TAG_CFG[name] || {bg:"#EEE",color:"#444",border:"#CCC"};
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",
      padding:"4px 10px",fontSize:11,fontWeight:700,
      letterSpacing:"0.1em",textTransform:"uppercase",
      borderRadius:3,fontFamily:"Inconsolata,monospace",
      background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`,
    }}>{name}</span>
  );
}

function JobCard({ job, onClick }) {
  const salMax = job.salaryMax;
  const salMin = job.salaryMin;
  const salLabel = salMax
    ? (salMin && salMin!==salMax
        ? `${Math.round(salMin/1_000_000)}M – ${Math.round(salMax/1_000_000)}M`
        : `${Math.round(salMax/1_000_000)}M`)
    : "Cạnh tranh";
  const freshLabel = job.daysOld===0?"Hôm nay":job.daysOld===1?"Hôm qua":job.daysOld<99?`${job.daysOld} ngày trước`:"";

  return (
    <div className="jcard" onClick={onClick} style={{height:"100%"}}>
      <div style={{padding:"20px 22px 0"}}>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",minHeight:24,marginBottom:14}}>
          {job.tags.slice(0,4).map(t=><Tag key={t} name={t} />)}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:13,fontWeight:700,color:"var(--acc)",textTransform:"uppercase",letterSpacing:"0.05em"}}>
              {job["Tên Công Ty"]}
            </span>
            {job.isVerified && (
              <span style={{fontSize:10,fontWeight:700,background:"var(--acc)",color:"white",padding:"2px 7px",borderRadius:3}}>✓</span>
            )}
          </div>
          <span style={{fontSize:12,fontWeight:600,color:"var(--ink3)",textTransform:"uppercase",letterSpacing:"0.08em",background:"var(--bg2)",padding:"3px 10px",borderRadius:20}}>
            {job["Level"]}
          </span>
        </div>
        <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,lineHeight:1.2,color:"var(--ink)",marginBottom:14}}>
          {job["Vị Trí"]}
        </h3>
        <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:8}}>
          <span style={{fontFamily:"Inconsolata,monospace",fontSize:24,fontWeight:600,color:"var(--acc)"}}>
            {salLabel}
          </span>
          {salMax>0 && <span style={{fontSize:12,color:"var(--ink3)"}}>VND</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <span style={{fontSize:14,color:"var(--ink2)"}}>📍 {job.district!=="Không rõ"?job.district:job.area}</span>
          {freshLabel && (
            <span style={{fontFamily:"Inconsolata,monospace",fontSize:11,color:"var(--ink3)",background:"var(--bg2)",padding:"3px 9px",borderRadius:20}}>
              {freshLabel}
            </span>
          )}
        </div>
        {job["Kỹ Năng"] && (
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:16}}>
            {job["Kỹ Năng"].split(",").slice(0,3).map(s=>s.trim()).filter(Boolean).map(s=>(
              <span key={s} style={{fontSize:11,padding:"4px 10px",border:"1px solid var(--border)",color:"var(--ink3)",borderRadius:20,fontWeight:500}}>
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{flex:1}} />
      <div style={{padding:"0 22px 22px",marginTop:4}}>
        <div style={{borderTop:"1px solid var(--border)",paddingTop:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,color:"var(--ink3)",fontFamily:"Inconsolata,monospace"}}>Score {job.finalScore}</span>
            <span style={{fontSize:13,fontWeight:700,color:"var(--acc)",letterSpacing:"0.06em"}}>Xem chi tiết →</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DETAIL PANEL — upgraded fonts + posted date
// ─────────────────────────────────────────────────────────────
function DetailPanel({ job, onClose }) {
  const [imgErr, setImgErr] = useState(false);
  const imgUrl = job["LINK ẢNH"];
  const grads = [
    "linear-gradient(145deg,#B8621A,#E09060)",
    "linear-gradient(145deg,#3E6B48,#7DB88A)",
    "linear-gradient(145deg,#5E5040,#A08870)",
    "linear-gradient(145deg,#A83030,#D88080)",
    "linear-gradient(145deg,#2A5E7A,#60A0C0)",
  ];
  const grad = grads[(job["Tên Công Ty"]||"").length % grads.length];
  const salLabel = job.salaryMax
    ? (job.salaryMin && job.salaryMin!==job.salaryMax
        ? `${Math.round(job.salaryMin/1_000_000)}M – ${Math.round(job.salaryMax/1_000_000)}M VND`
        : `Đến ${Math.round(job.salaryMax/1_000_000)}M VND`)
    : "Thỏa thuận";

  // Parse posted date: "20:03:44 11/3/2026" → "11/3/2026"
  const rawDate = job["Ngày đăng bài"] || "";
  const postedDate = rawDate ? (rawDate.split(" ")[1] || rawDate) : "";
  const freshLabel = job.daysOld===0 ? "hôm nay"
    : job.daysOld===1 ? "hôm qua"
    : job.daysOld<99 ? `${job.daysOld} ngày trước` : "";

  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel" style={{width:"min(92vw,960px)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",height:"100%"}}>

          {/* LEFT: IMAGE */}
          <div style={{width:"40%",flexShrink:0,position:"sticky",top:0,height:"100vh",overflow:"hidden"}}>
            {imgUrl && !imgErr ? (
              <img src={imgUrl} alt="" onError={()=>setImgErr(true)}
                style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />
            ) : (
              <div style={{width:"100%",height:"100%",background:grad,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:32}}>
                <span style={{fontSize:72,opacity:0.2}}>🏢</span>
                <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:700,color:"rgba(255,255,255,0.55)",textAlign:"center",lineHeight:1.3}}>
                  {job["Tên Công Ty"]}
                </span>
              </div>
            )}
          </div>

          {/* RIGHT: CONTENT */}
          <div style={{flex:1,overflowY:"auto",background:"var(--bg)",padding:"40px 44px 64px"}}>

            {/* Close button */}
            <button onClick={onClose} style={{
              marginBottom:32,padding:"11px 24px",fontSize:14,fontWeight:600,
              fontFamily:"'Jost',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase",
              background:"white",border:"1.5px solid var(--border)",cursor:"pointer",
              color:"var(--ink2)",borderRadius:4,transition:"all 0.15s",
            }}
              onMouseEnter={e=>{e.target.style.background="var(--ink)";e.target.style.color="var(--bg)";}}
              onMouseLeave={e=>{e.target.style.background="white";e.target.style.color="var(--ink2)";}}>
              ← Đóng
            </button>

            {/* Tags + Verified */}
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:20}}>
              {job.tags.map(t=><Tag key={t} name={t} />)}
              {job.isVerified && (
                <span style={{
                  display:"inline-flex",alignItems:"center",gap:4,
                  padding:"4px 12px",fontSize:12,fontWeight:700,
                  letterSpacing:"0.08em",textTransform:"uppercase",
                  borderRadius:3,fontFamily:"Inconsolata,monospace",
                  background:"#E8F3FC",color:"#1A5A8A",border:"1px solid #9ECEF5",
                }}>✓ Verified Recruiter</span>
              )}
            </div>

            {/* Title */}
            <h2 style={{
              fontFamily:"'Cormorant Garamond',serif",fontSize:44,fontWeight:700,
              lineHeight:1.05,color:"var(--ink)",marginBottom:8,
            }}>
              {job["Vị Trí"]}
            </h2>

            {/* Company */}
            <p style={{fontSize:17,fontWeight:600,color:"var(--acc)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>
              @ {job["Tên Công Ty"]}
            </p>

            {/* Posted date pill */}
            {postedDate && (
              <div style={{
                display:"inline-flex",alignItems:"center",gap:7,
                background:"var(--bg2)",border:"1px solid var(--border)",
                borderRadius:24,padding:"7px 16px",marginBottom:28,
              }}>
                <span style={{fontSize:15}}>📅</span>
                <span style={{fontFamily:"Inconsolata,monospace",fontSize:14,fontWeight:600,color:"var(--ink2)"}}>
                  Đăng ngày {postedDate}
                </span>
                {freshLabel && (
                  <span style={{fontSize:13,color:"var(--ink3)"}}>· {freshLabel}</span>
                )}
              </div>
            )}

            <div style={{height:1,background:"var(--border)",marginBottom:28}} />

            {/* Info grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:32}}>
              {[
                {l:"Mức lương", v:salLabel,    a:"var(--acc)"},
                {l:"Địa điểm", v:job.district!=="Không rõ"?`${job.district}, ${job.area}`:job["Địa chỉ"]||job.area, a:"var(--green)"},
                {l:"Level",    v:job["Level"]||"—", a:"var(--ink2)"},
                {l:"Platform", v:job["Platform"]&&job["Platform"]!=="Không rõ"?job["Platform"]:"—", a:"var(--ink2)"},
              ].map(({l,v,a})=>(
                <div key={l} style={{background:"white",border:"1.5px solid var(--border)",borderRadius:6,padding:"16px 18px"}}>
                  <div style={{fontFamily:"Inconsolata,monospace",fontSize:12,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.16em",color:a,opacity:0.85,marginBottom:6}}>{l}</div>
                  <div style={{fontSize:16,fontWeight:700,color:"var(--ink)",lineHeight:1.3}}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{height:1,background:"var(--border)",marginBottom:28}} />

            {/* Job description */}
            {job["Nội Dung Gốc"] && (
              <div style={{marginBottom:28}}>
                <div style={{fontFamily:"Inconsolata,monospace",fontSize:13,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.16em",color:"var(--ink3)",marginBottom:14}}>
                  Mô tả công việc
                </div>
                <p style={{fontSize:16,lineHeight:1.9,color:"var(--ink2)",whiteSpace:"pre-line"}}>
                  {job["Nội Dung Gốc"]}
                </p>
              </div>
            )}

            {/* Benefits */}
            {job["Phúc Lợi"] && (
              <div style={{background:"#FFF8F0",border:"1.5px solid #E8C9A0",borderRadius:6,padding:"22px 24px",marginBottom:32}}>
                <div style={{fontFamily:"Inconsolata,monospace",fontSize:13,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.16em",color:"var(--acc)",marginBottom:12}}>
                  Phúc lợi & Quyền lợi
                </div>
                <p style={{fontSize:16,lineHeight:1.85,color:"var(--ink2)"}}>{job["Phúc Lợi"]}</p>
              </div>
            )}

            {/* CTA */}
            <a href={job["LINK BÀI VIẾT"]} target="_blank" rel="noopener noreferrer" className="apply-btn">
              Apply Ngay →
            </a>

            {/* Contacts */}
            <div style={{marginTop:20,display:"flex",flexDirection:"column",gap:8}}>
              {job["Email"]&&job["Email"]!=="Không rõ" && (
                <p style={{fontFamily:"Inconsolata,monospace",fontSize:14,color:"var(--ink3)"}}>📧 {job["Email"]}</p>
              )}
              {job["SĐT"]&&job["SĐT"]!=="Không rõ" && (
                <p style={{fontFamily:"Inconsolata,monospace",fontSize:14,color:"var(--ink3)"}}>📞 {job["SĐT"]}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty({ onReset }) {
  return (
    <div style={{textAlign:"center",padding:"100px 0"}}>
      <div style={{fontSize:56,marginBottom:16}}>🔍</div>
      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,color:"var(--ink2)"}}>Không tìm thấy kết quả</p>
      <p style={{fontSize:13,color:"var(--ink3)",marginTop:6,marginBottom:20}}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
      <button onClick={onReset} style={{padding:"10px 24px",background:"var(--ink)",color:"var(--bg)",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,borderRadius:4,fontFamily:"'Jost',sans-serif",letterSpacing:"0.08em"}}>
        Reset bộ lọc
      </button>
    </div>
  );
}
