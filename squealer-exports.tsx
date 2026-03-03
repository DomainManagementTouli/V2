import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

const G = {
  g1:"#0d4425",g2:"#1a6b3a",g3:"#2d8a52",g4:"#3fab68",
  gl:"#eaf5ef",gxl:"#f5fbf7",
  ink:"#0c1e12",ink2:"#3d5444",ink3:"#849e8b",
  white:"#fff",bg:"#f4f7f5",err:"#c0392b"
};

// ── Sample data ───────────────────────────────────────────────────────────────
const SAMPLE = [
  {id:1,date:"2025-01-28",merchant:"Walmart",amount:-84.32,balance:412.18},
  {id:2,date:"2025-01-27",merchant:"Direct Deposit",amount:1200.00,balance:496.50},
  {id:3,date:"2025-01-25",merchant:"Shell Gas",amount:-48.00,balance:-703.50},
  {id:4,date:"2025-01-24",merchant:"McDonald's",amount:-12.47,balance:-655.50},
  {id:5,date:"2025-01-22",merchant:"Netflix",amount:-15.49,balance:-643.03},
  {id:6,date:"2025-01-20",merchant:"Amazon",amount:-67.99,balance:-627.54},
  {id:7,date:"2025-01-18",merchant:"Uber Eats",amount:-34.22,balance:-559.55},
  {id:8,date:"2025-01-15",merchant:"CVS Pharmacy",amount:-22.14,balance:-525.33},
  {id:9,date:"2025-01-14",merchant:"Chime Transfer",amount:250.00,balance:-503.19},
  {id:10,date:"2025-01-12",merchant:"Dollar General",amount:-18.76,balance:-753.19},
  {id:11,date:"2025-01-10",merchant:"Circle K",amount:-41.00,balance:-734.43},
  {id:12,date:"2025-01-08",merchant:"Target",amount:-93.41,balance:-693.43},
  {id:13,date:"2025-01-06",merchant:"Walgreens",amount:-29.00,balance:-600.02},
  {id:14,date:"2025-01-04",merchant:"Spotify",amount:-9.99,balance:-571.02},
  {id:15,date:"2025-01-02",merchant:"PayPal Transfer",amount:75.00,balance:-561.03},
  {id:16,date:"2024-12-28",merchant:"Walmart",amount:-102.11,balance:210.44},
  {id:17,date:"2024-12-24",merchant:"Amazon",amount:-54.99,balance:312.55},
  {id:18,date:"2024-12-22",merchant:"Shell Gas",amount:-52.00,balance:367.54},
  {id:19,date:"2024-12-20",merchant:"McDonald's",amount:-9.87,balance:419.54},
  {id:20,date:"2024-12-15",merchant:"Direct Deposit",amount:1200.00,balance:429.41},
];

const fmt = n => `$${Math.abs(n).toFixed(2)}`;
const fmtSigned = n => `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(2)}`;

// ── Column config ─────────────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key:"date",     label:"Date",     required:true  },
  { key:"merchant", label:"Merchant", required:true  },
  { key:"amount",   label:"Amount",   required:true  },
  { key:"balance",  label:"Balance",  required:false },
];

// ── Download helpers ──────────────────────────────────────────────────────────
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildRows(data, cols, opts) {
  return data.map(r => {
    const row = {};
    cols.forEach(c => {
      if(c.key === "amount")  row[c.label] = opts.signedAmounts ? fmtSigned(r.amount) : fmt(r.amount);
      else if(c.key === "balance" && r.balance != null) row[c.label] = fmt(r.balance);
      else row[c.label] = r[c.key] ?? "";
    });
    return row;
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, show }) {
  return (
    <div style={{
      position:"fixed",bottom:28,right:28,background:G.ink,color:"#fff",
      padding:"11px 20px",borderRadius:10,fontSize:".85rem",fontWeight:500,
      zIndex:999,opacity:show?1:0,transform:show?"translateY(0)":"translateY(10px)",
      transition:".3s",pointerEvents:"none",
    }}>{msg}</div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────
function FilterBar({ filters, setFilters, data }) {
  const merchants = [...new Set(data.map(d => d.merchant))].sort();
  const months    = [...new Set(data.map(d => d.date.slice(0,7)))].sort().reverse();
  const inp = { padding:"8px 11px",borderRadius:8,border:"1.5px solid #d4e4d8",fontSize:".83rem",fontFamily:"inherit",color:G.ink,background:"#fff",outline:"none" };
  return (
    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:16}}>
      <input placeholder="Search merchant…" value={filters.q} onChange={e=>setFilters(f=>({...f,q:e.target.value}))}
        style={{...inp,width:180}}/>
      <select value={filters.merchant} onChange={e=>setFilters(f=>({...f,merchant:e.target.value}))} style={inp}>
        <option value="">All merchants</option>
        {merchants.map(m=><option key={m} value={m}>{m}</option>)}
      </select>
      <select value={filters.month} onChange={e=>setFilters(f=>({...f,month:e.target.value}))} style={inp}>
        <option value="">All months</option>
        {months.map(m=><option key={m} value={m}>{m}</option>)}
      </select>
      <select value={filters.type} onChange={e=>setFilters(f=>({...f,type:e.target.value}))} style={inp}>
        <option value="">All types</option>
        <option value="credit">Credits</option>
        <option value="debit">Debits</option>
      </select>
      <span style={{fontSize:".78rem",color:G.g3,cursor:"pointer",fontWeight:600,textDecoration:"underline"}}
        onClick={()=>setFilters({q:"",merchant:"",month:"",type:""})}>Clear</span>
    </div>
  );
}

// ── Preview Table ─────────────────────────────────────────────────────────────
function PreviewTable({ data, cols }) {
  return (
    <div style={{overflowX:"auto",borderRadius:12,border:`1px solid rgba(45,138,82,.09)`}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:".83rem"}}>
        <thead>
          <tr style={{background:G.gxl}}>
            {cols.map(c=>(
              <th key={c.key} style={{padding:"10px 16px",textAlign:"left",fontWeight:700,color:G.ink3,fontSize:".7rem",textTransform:"uppercase",letterSpacing:".06em",borderBottom:`1px solid rgba(45,138,82,.08)`,whiteSpace:"nowrap"}}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0,8).map((r,i)=>(
            <tr key={i} style={{borderBottom:`1px solid rgba(45,138,82,.05)`}}>
              {cols.map(c=>(
                <td key={c.key} style={{padding:"11px 16px",color:c.key==="amount"?(r.amount>=0?G.g2:G.err):G.ink2,fontWeight:c.key==="amount"?700:400}}>
                  {c.key==="amount" ? fmtSigned(r.amount) : c.key==="balance" ? fmt(r.balance) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 8 && (
        <div style={{padding:"10px 16px",fontSize:".75rem",color:G.ink3,borderTop:`1px solid rgba(45,138,82,.06)`}}>
          Showing 8 of {data.length} rows in preview — full dataset exports
        </div>
      )}
    </div>
  );
}

// ── Export Card ───────────────────────────────────────────────────────────────
function ExportCard({ icon, title, desc, badge, onExport, loading }) {
  return (
    <div style={{background:G.white,border:`1px solid rgba(45,138,82,.09)`,borderRadius:14,padding:22,display:"flex",flexDirection:"column",gap:12,boxShadow:"0 2px 10px rgba(0,0,0,.04)",transition:".2s"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
        <div style={{width:44,height:44,background:G.gl,borderRadius:12,display:"grid",placeItems:"center",fontSize:"1.3rem",flexShrink:0}}>{icon}</div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
            <span style={{fontWeight:700,fontSize:".95rem",color:G.ink}}>{title}</span>
            {badge && <span style={{background:G.gl,color:G.g2,fontSize:".68rem",fontWeight:700,padding:"2px 8px",borderRadius:100,border:`1px solid rgba(45,138,82,.15)`}}>{badge}</span>}
          </div>
          <div style={{fontSize:".8rem",color:G.ink3,lineHeight:1.55}}>{desc}</div>
        </div>
      </div>
      <button onClick={onExport} disabled={loading}
        style={{padding:"10px 0",borderRadius:9,border:"none",background:loading?"#a0c4ac":G.g2,color:"#fff",fontWeight:700,fontSize:".875rem",cursor:loading?"not-allowed":"pointer",fontFamily:"inherit",transition:".2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        {loading ? "Exporting…" : `Download ${title}`}
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ExportCenter() {
  const [filters,      setFilters]      = useState({q:"",merchant:"",month:"",type:""});
  const [cols,         setCols]         = useState(ALL_COLUMNS);
  const [signedAmounts,setSignedAmounts]= useState(true);
  const [dateFormat,   setDateFormat]   = useState("iso");
  const [sheetName,    setSheetName]    = useState("Transactions");
  const [loading,      setLoading]      = useState("");
  const [toast,        setToast]        = useState({show:false,msg:""});

  const showToast = msg => {
    setToast({show:true,msg});
    setTimeout(()=>setToast({show:false,msg:""}),3000);
  };

  const filtered = useMemo(()=>{
    return SAMPLE.filter(r=>{
      const q = filters.q.toLowerCase();
      if(q && !r.merchant.toLowerCase().includes(q)) return false;
      if(filters.merchant && r.merchant !== filters.merchant) return false;
      if(filters.month && !r.date.startsWith(filters.month)) return false;
      if(filters.type==="credit" && r.amount < 0) return false;
      if(filters.type==="debit"  && r.amount >= 0) return false;
      return true;
    });
  },[filters]);

  const activeCols = cols.filter(c=>c.required || c.enabled !== false);

  const formatDate = d => {
    if(dateFormat==="iso") return d;
    const [y,m,day] = d.split("-");
    if(dateFormat==="us")  return `${m}/${day}/${y}`;
    if(dateFormat==="eu")  return `${day}.${m}.${y}`;
    return d;
  };

  const preparedData = useMemo(()=>{
    return filtered.map(r=>({...r, date:formatDate(r.date)}));
  },[filtered, dateFormat]);

  const toggleCol = key => {
    setCols(cs=>cs.map(c=>c.key===key && !c.required ? {...c, enabled:c.enabled===false?true:false} : c));
  };

  // ── Export functions ────────────────────────────────────────────────────────
  const exportCSV = () => {
    setLoading("csv");
    const rows = buildRows(preparedData, activeCols, {signedAmounts});
    const csv = Papa.unparse(rows);
    downloadBlob(new Blob([csv],{type:"text/csv"}), "squealer_transactions.csv");
    setLoading(""); showToast("CSV downloaded");
  };

  const exportXLSX = () => {
    setLoading("xlsx");
    const rows = buildRows(preparedData, activeCols, {signedAmounts});
    const ws = XLSX.utils.json_to_sheet(rows);
    // Column widths
    ws["!cols"] = activeCols.map(c=>({wch: c.key==="merchant"?28:c.key==="date"?14:14}));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName || "Transactions");
    XLSX.writeFile(wb, "squealer_transactions.xlsx");
    setLoading(""); showToast("Excel file downloaded");
  };

  const exportJSON = () => {
    setLoading("json");
    const out = {
      exported_at: new Date().toISOString(),
      total_transactions: filtered.length,
      filters: filters,
      transactions: preparedData.map(r=>{
        const obj = {};
        activeCols.forEach(c=>{ obj[c.key] = r[c.key]; });
        return obj;
      })
    };
    downloadBlob(new Blob([JSON.stringify(out,null,2)],{type:"application/json"}), "squealer_transactions.json");
    setLoading(""); showToast("JSON downloaded");
  };

  const exportTSV = () => {
    setLoading("tsv");
    const rows = buildRows(preparedData, activeCols, {signedAmounts});
    const tsv = [activeCols.map(c=>c.label).join("\t"), ...rows.map(r=>activeCols.map(c=>r[c.label]).join("\t"))].join("\n");
    downloadBlob(new Blob([tsv],{type:"text/tab-separated-values"}), "squealer_transactions.tsv");
    setLoading(""); showToast("TSV downloaded");
  };

  const creditTotal  = filtered.filter(r=>r.amount>0).reduce((s,r)=>s+r.amount,0);
  const debitTotal   = filtered.filter(r=>r.amount<0).reduce((s,r)=>s+Math.abs(r.amount),0);
  const netTotal     = filtered.reduce((s,r)=>s+r.amount,0);

  const ctrlStyle = { padding:"7px 11px",borderRadius:8,border:"1.5px solid #d4e4d8",fontSize:".83rem",fontFamily:"inherit",color:G.ink,background:"#fff",outline:"none" };
  const labelStyle = { fontSize:".7rem",fontWeight:700,color:G.ink3,textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:5 };
  const chkStyle = { display:"flex",alignItems:"center",gap:8,fontSize:".83rem",color:G.ink2,cursor:"pointer",userSelect:"none",padding:"4px 0" };

  return (
    <div style={{fontFamily:"Inter,system-ui,sans-serif",background:G.bg,minHeight:"100vh",padding:28}}>
      <Toast msg={toast.msg} show={toast.show}/>

      <div style={{marginBottom:22}}>
        <div style={{fontSize:".7rem",fontWeight:700,color:G.g3,textTransform:"uppercase",letterSpacing:".1em",marginBottom:3}}>Dashboard</div>
        <h2 style={{fontSize:"1.35rem",fontWeight:800,color:G.ink,letterSpacing:"-.3px"}}>Export Center</h2>
      </div>

      {/* Summary strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22}}>
        {[
          {label:"Rows to Export",  val:filtered.length, sub:"matching filters"},
          {label:"Total Credits",   val:`$${creditTotal.toFixed(2)}`, sub:"incoming", color:G.g2},
          {label:"Total Debits",    val:`$${debitTotal.toFixed(2)}`,  sub:"outgoing", color:G.err},
          {label:"Net",             val:`${netTotal>=0?"+":"-"}$${Math.abs(netTotal).toFixed(2)}`, sub:"net flow", color:netTotal>=0?G.g2:G.err},
        ].map((s,i)=>(
          <div key={i} style={{background:G.white,borderRadius:13,padding:"16px 18px",border:`1px solid rgba(45,138,82,.08)`,boxShadow:"0 2px 10px rgba(0,0,0,.04)"}}>
            <div style={{fontSize:".7rem",fontWeight:700,color:G.ink3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:"1.5rem",fontWeight:800,color:s.color||G.ink,letterSpacing:"-.5px"}}>{s.val}</div>
            <div style={{fontSize:".72rem",color:G.ink3,marginTop:3}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:18,alignItems:"start"}}>

        {/* ── OPTIONS PANEL ── */}
        <div style={{background:G.white,borderRadius:16,padding:20,border:`1px solid rgba(45,138,82,.09)`,boxShadow:"0 2px 12px rgba(0,0,0,.04)",position:"sticky",top:16}}>
          <div style={{fontSize:".85rem",fontWeight:700,color:G.ink,marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${G.gl}`}}>Export Options</div>

          {/* Columns */}
          <div style={{marginBottom:16}}>
            <label style={labelStyle}>Columns to Include</label>
            {ALL_COLUMNS.map(c=>(
              <label key={c.key} style={chkStyle}>
                <input type="checkbox"
                  checked={c.required || cols.find(x=>x.key===c.key)?.enabled !== false}
                  disabled={c.required}
                  onChange={()=>toggleCol(c.key)}
                  style={{accentColor:G.g2,width:14,height:14}}/>
                <span style={{color:c.required?G.ink3:G.ink2}}>{c.label}{c.required&&<span style={{fontSize:".7rem",color:G.ink3}}> (required)</span>}</span>
              </label>
            ))}
          </div>

          {/* Amount format */}
          <div style={{marginBottom:16}}>
            <label style={labelStyle}>Amount Format</label>
            <label style={chkStyle}>
              <input type="radio" name="amtfmt" checked={signedAmounts} onChange={()=>setSignedAmounts(true)} style={{accentColor:G.g2}}/>
              Signed (+$12.00 / -$84.32)
            </label>
            <label style={chkStyle}>
              <input type="radio" name="amtfmt" checked={!signedAmounts} onChange={()=>setSignedAmounts(false)} style={{accentColor:G.g2}}/>
              Absolute ($12.00 / $84.32)
            </label>
          </div>

          {/* Date format */}
          <div style={{marginBottom:16}}>
            <label style={labelStyle}>Date Format</label>
            <select value={dateFormat} onChange={e=>setDateFormat(e.target.value)} style={{...ctrlStyle,width:"100%"}}>
              <option value="iso">ISO — 2025-01-28</option>
              <option value="us">US — 01/28/2025</option>
              <option value="eu">EU — 28.01.2025</option>
            </select>
          </div>

          {/* Sheet name (xlsx) */}
          <div style={{marginBottom:16}}>
            <label style={labelStyle}>Excel Sheet Name</label>
            <input value={sheetName} onChange={e=>setSheetName(e.target.value)} placeholder="Transactions"
              style={{...ctrlStyle,width:"100%"}}/>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>

          {/* Filters */}
          <div style={{background:G.white,borderRadius:16,padding:20,border:`1px solid rgba(45,138,82,.09)`,boxShadow:"0 2px 12px rgba(0,0,0,.04)"}}>
            <div style={{fontSize:".82rem",fontWeight:700,color:G.ink,marginBottom:12}}>Filter Data to Export</div>
            <FilterBar filters={filters} setFilters={setFilters} data={SAMPLE}/>
          </div>

          {/* Preview */}
          <div style={{background:G.white,borderRadius:16,padding:20,border:`1px solid rgba(45,138,82,.09)`,boxShadow:"0 2px 12px rgba(0,0,0,.04)"}}>
            <div style={{fontSize:".82rem",fontWeight:700,color:G.ink,marginBottom:12}}>Preview</div>
            <PreviewTable data={preparedData} cols={activeCols}/>
          </div>

          {/* Export formats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <ExportCard
              icon="📊" title="Excel (XLSX)" badge="Recommended"
              desc="Formatted spreadsheet with adjustable column widths. Opens directly in Excel or Google Sheets."
              onExport={exportXLSX} loading={loading==="xlsx"}/>
            <ExportCard
              icon="📄" title="CSV"
              desc="Universal comma-separated format. Compatible with any spreadsheet, database, or data tool."
              onExport={exportCSV} loading={loading==="csv"}/>
            <ExportCard
              icon="🗂️" title="JSON"
              desc="Structured data with metadata. Includes export timestamp, filter state, and transaction count."
              onExport={exportJSON} loading={loading==="json"}/>
            <ExportCard
              icon="📋" title="TSV"
              desc="Tab-separated format. Useful for pasting directly into spreadsheets or importing into databases."
              onExport={exportTSV} loading={loading==="tsv"}/>
          </div>
        </div>
      </div>
    </div>
  );
}
