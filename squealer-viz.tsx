import { useState, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart, Sankey } from "recharts";

// ── Palette ───────────────────────────────────────────────────────────────────
const G = {
  g1:"#0d4425",g2:"#1a6b3a",g3:"#2d8a52",g4:"#3fab68",
  gl:"#eaf5ef",gxl:"#f5fbf7",
  ink:"#0c1e12",ink2:"#3d5444",ink3:"#849e8b",
  white:"#fff",bg:"#f4f7f5",err:"#c0392b"
};

const PRESET_PALETTES = {
  "Forest":    ["#0d4425","#1a6b3a","#2d8a52","#3fab68","#8ed4aa","#c9e8d2","#4a8c6a","#235c38"],
  "Ocean":     ["#0077b6","#0096c7","#00b4d8","#48cae4","#90e0ef","#023e8a","#03045e","#caf0f8"],
  "Sunset":    ["#e63946","#f4a261","#e76f51","#264653","#2a9d8f","#e9c46a","#457b9d","#a8dadc"],
  "Monochrome":["#111","#333","#555","#777","#999","#bbb","#ddd","#eee"],
  "Tie-Dye":   ["#e040fb","#00bcd4","#ffeb3b","#ff5722","#4caf50","#3f51b5","#ff4081","#69f0ae"],
  "Gold":      ["#c9a84c","#e8c060","#b8922a","#ffd700","#daa520","#8b6914","#f0c040","#a07828"],
};

// ── Rich sample data: 40 merchants, 3 months ──────────────────────────────────
function generateData() {
  const merchants = [
    "Walmart","Amazon","Target","Shell Gas","McDonald's","Uber Eats","Netflix",
    "CVS Pharmacy","Dollar General","Circle K","Walgreens","Spotify","PayPal Transfer",
    "Chime Transfer","Direct Deposit","Doordash","Starbucks","Chevron","Best Buy",
    "Home Depot","AT&T","Verizon","Planet Fitness","Lyft","Airbnb","Apple.com",
    "Publix","Kroger","T-Mobile","Hulu","Disney+","Xbox","Cash App","Venmo",
    "Zelle","USAA","Allstate","Duke Energy","Comcast","Rent Payment"
  ];
  const amounts = {
    "Walmart":-84,"Amazon":-67,"Target":-93,"Shell Gas":-48,"McDonald's":-12,
    "Uber Eats":-34,"Netflix":-16,"CVS Pharmacy":-22,"Dollar General":-19,
    "Circle K":-41,"Walgreens":-29,"Spotify":-10,"PayPal Transfer":75,
    "Chime Transfer":250,"Direct Deposit":1200,"Doordash":-28,"Starbucks":-18,
    "Chevron":-52,"Best Buy":-120,"Home Depot":-88,"AT&T":-85,"Verizon":-95,
    "Planet Fitness":-25,"Lyft":-22,"Airbnb":-180,"Apple.com":-15,
    "Publix":-76,"Kroger":-64,"T-Mobile":-55,"Hulu":-18,"Disney+":-14,
    "Xbox":-15,"Cash App":50,"Venmo":30,"Zelle":100,"USAA":-200,
    "Allstate":-150,"Duke Energy":-120,"Comcast":-90,"Rent Payment":-950
  };
  const rows = [];
  ["2025-01","2024-12","2024-11"].forEach(mo => {
    merchants.forEach(m => {
      const base = amounts[m] || -30;
      const jitter = base * (0.85 + Math.random() * 0.3);
      const daysInMo = mo === "2025-01" ? 31 : 30;
      const day = String(Math.floor(Math.random() * daysInMo) + 1).padStart(2,"0");
      rows.push({ date:`${mo}-${day}`, merchant:m, amount:parseFloat(jitter.toFixed(2)) });
    });
  });
  return rows.sort((a,b) => a.date.localeCompare(b.date));
}

const ALL_DATA = generateData();
const ALL_MERCHANTS = [...new Set(ALL_DATA.map(d => d.merchant))].sort();

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n => `$${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtShort = n => `$${Math.abs(n) >= 1000 ? (Math.abs(n)/1000).toFixed(1)+"k" : Math.abs(n).toFixed(0)}`;
const getMonth = d => { const dt = new Date(d+"T12:00:00"); return dt.toLocaleString("default",{month:"short",year:"numeric"}); };
const getAmtRange = a => {
  const v = Math.abs(a);
  if(v < 20) return "Under $20";
  if(v < 50) return "$20–$50";
  if(v < 100) return "$50–$100";
  if(v < 200) return "$100–$200";
  return "Over $200";
};

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:"#fff",border:"1px solid #d4e4d8",borderRadius:10,padding:"10px 14px",boxShadow:"0 4px 20px rgba(0,0,0,.1)",fontSize:".82rem"}}>
      <div style={{fontWeight:700,color:G.ink,marginBottom:6}}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,color:G.ink2}}>
          <div style={{width:8,height:8,borderRadius:2,background:p.color||p.fill}}/>
          {fmt(p.value)}
        </div>
      ))}
    </div>
  );
};

// ── Color Swatch ──────────────────────────────────────────────────────────────
const ColorSwatch = ({ color, onChange, label }) => (
  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
    <label style={{position:"relative",width:24,height:24,borderRadius:6,background:color,border:"2px solid rgba(0,0,0,.1)",cursor:"pointer",flexShrink:0,display:"block"}}>
      <input type="color" value={color} onChange={e=>onChange(e.target.value)}
        style={{opacity:0,position:"absolute",inset:0,width:"100%",height:"100%",cursor:"pointer"}}/>
    </label>
    <span style={{fontSize:".75rem",color:G.ink3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{label}</span>
  </div>
);

// ── Merchant Selector Modal ───────────────────────────────────────────────────
const MerchantSelector = ({ selected, onChange, onClose }) => {
  const [search, setSearch] = useState("");
  const filtered = ALL_MERCHANTS.filter(m => m.toLowerCase().includes(search.toLowerCase()));
  const toggleAll = () => onChange(selected.length === ALL_MERCHANTS.length ? [] : [...ALL_MERCHANTS]);
  const toggle = m => onChange(selected.includes(m) ? selected.filter(x=>x!==m) : [...selected, m]);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:18,width:480,maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 80px rgba(0,0,0,.2)"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"22px 24px 16px",borderBottom:`1px solid ${G.gl}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:"1rem",color:G.ink}}>Select Merchants</div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:".78rem",color:G.g3,fontWeight:700,cursor:"pointer"}} onClick={toggleAll}>
                {selected.length===ALL_MERCHANTS.length?"Deselect all":"Select all"}
              </span>
              <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:G.ink3,fontSize:1.2+"rem",lineHeight:1}}>✕</button>
            </div>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search merchants…"
            style={{width:"100%",padding:"9px 13px",border:`1.5px solid #d4e4d8`,borderRadius:9,fontSize:".88rem",fontFamily:"inherit",outline:"none"}}/>
          <div style={{fontSize:".75rem",color:G.ink3,marginTop:8}}>{selected.length} of {ALL_MERCHANTS.length} selected</div>
        </div>
        <div style={{overflowY:"auto",padding:"8px 16px",flex:1}}>
          {filtered.map(m => (
            <label key={m} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 8px",borderRadius:8,cursor:"pointer",transition:".15s",userSelect:"none"}}>
              <input type="checkbox" checked={selected.includes(m)} onChange={()=>toggle(m)} style={{accentColor:G.g2,width:15,height:15}}/>
              <span style={{fontSize:".88rem",color:G.ink2}}>{m}</span>
            </label>
          ))}
        </div>
        <div style={{padding:"16px 24px",borderTop:`1px solid ${G.gl}`,display:"flex",justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"10px 28px",background:G.g2,color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:".9rem",cursor:"pointer",fontFamily:"inherit"}}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Alluvial (Sankey) ─────────────────────────────────────────────────────────
const AlluvialChart = ({ data, colors }) => {
  const merchants = [...new Set(data.map(d=>d.merchant))];
  const W=560, H=320, PAD=32, barW=100, gap=3;
  const credits = data.filter(d=>d.amount>0);
  const debits  = data.filter(d=>d.amount<0);
  const totalAbs = data.reduce((s,d)=>s+Math.abs(d.amount),0);
  const usableH = H - PAD*2;

  const mBlocks = [];
  let my = PAD;
  merchants.slice(0,12).forEach((m,i) => {
    const tot = data.filter(d=>d.merchant===m).reduce((s,d)=>s+Math.abs(d.amount),0);
    const h = (tot/totalAbs)*usableH;
    mBlocks.push({m, y:my, h:Math.max(h,6), color:colors[i%colors.length], tot});
    my += Math.max(h,6) + gap;
  });

  const creditTot = credits.reduce((s,d)=>s+d.amount,0);
  const debitTot  = debits.reduce((s,d)=>s+Math.abs(d.amount),0);
  const grandTot  = creditTot + debitTot;
  const creditH   = (creditTot/grandTot)*usableH;
  const debitH    = (debitTot/grandTot)*usableH;
  const tBlocks   = [
    {t:"Credits", y:PAD, h:creditH, color:G.g4},
    {t:"Debits",  y:PAD+creditH+gap, h:debitH, color:"#e74c3c"},
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",maxHeight:320}}>
      {mBlocks.map((mb,i) => {
        const isCredit = credits.some(d=>d.merchant===mb.m);
        const tBlock   = isCredit ? tBlocks[0] : tBlocks[1];
        const x1=barW, x2=W-barW;
        return (
          <g key={i}>
            <path
              d={`M${x1},${mb.y} C${(x1+x2)/2},${mb.y} ${(x1+x2)/2},${tBlock.y} ${x2},${tBlock.y}
                  L${x2},${tBlock.y+tBlock.h} C${(x1+x2)/2},${tBlock.y+tBlock.h} ${(x1+x2)/2},${mb.y+mb.h} ${x1},${mb.y+mb.h} Z`}
              fill={mb.color} opacity={0.25}/>
            <rect x={0} y={mb.y} width={barW-4} height={mb.h} rx={4} fill={mb.color}/>
            {mb.h > 12 && (
              <text x={(barW-4)/2} y={mb.y+mb.h/2+4} textAnchor="middle"
                fontSize={Math.min(10,mb.h-4)} fontWeight={600} fill="#fff">
                {mb.m.length > 10 ? mb.m.slice(0,9)+"…" : mb.m}
              </text>
            )}
          </g>
        );
      })}
      {tBlocks.map((tb,i) => (
        <g key={i}>
          <rect x={W-barW+4} y={tb.y} width={barW-4} height={tb.h} rx={4} fill={tb.color}/>
          {tb.h > 12 && (
            <text x={W-barW+4+(barW-4)/2} y={tb.y+tb.h/2+4} textAnchor="middle"
              fontSize={Math.min(11,tb.h-4)} fontWeight={700} fill="#fff">
              {tb.t}
            </text>
          )}
        </g>
      ))}
      <text x={barW/2} y={PAD-10} textAnchor="middle" fontSize={9} fontWeight={700} fill={G.ink3} textTransform="uppercase">MERCHANTS</text>
      <text x={W-barW/2} y={PAD-10} textAnchor="middle" fontSize={9} fontWeight={700} fill={G.ink3}>FLOW</text>
    </svg>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Visualizations() {
  const [chartType,   setChartType]   = useState("bar");
  const [groupBy,     setGroupBy]     = useState("merchant");
  const [txType,      setTxType]      = useState("debits");
  const [donut,       setDonut]       = useState(false);
  const [showLabels,  setShowLabels]  = useState(true);
  const [showValues,  setShowValues]  = useState(false);
  const [showArea,    setShowArea]    = useState(true);
  const [topN,        setTopN]        = useState(10);
  const [palette,     setPalette]     = useState("Forest");
  const [colors,      setColors]      = useState(PRESET_PALETTES["Forest"]);
  const [selMerchants,setSelMerchants]= useState([...ALL_MERCHANTS]);
  const [showModal,   setShowModal]   = useState(false);
  const [colorTab,    setColorTab]    = useState("preset");

  const applyPalette = p => { setPalette(p); setColors([...PRESET_PALETTES[p]]); };
  const updateColor  = (i,v) => { const c=[...colors]; c[i]=v; setColors(c); };

  const filtered = useMemo(() => {
    let rows = ALL_DATA.filter(d => selMerchants.includes(d.merchant));
    if(txType==="credits") rows = rows.filter(d=>d.amount>0);
    if(txType==="debits")  rows = rows.filter(d=>d.amount<0);
    return rows;
  }, [selMerchants, txType]);

  const chartData = useMemo(() => {
    const groups = {};
    filtered.forEach(d => {
      let key;
      if(groupBy==="merchant") key = d.merchant;
      else if(groupBy==="month") key = getMonth(d.date);
      else if(groupBy==="type") key = d.amount>=0 ? "Credits" : "Debits";
      else key = getAmtRange(d.amount);
      groups[key] = (groups[key]||0) + Math.abs(d.amount);
    });
    let arr = Object.entries(groups).map(([label,value])=>({label,value:parseFloat(value.toFixed(2))}));
    arr.sort((a,b)=>b.value-a.value);
    if(groupBy==="merchant") arr = arr.slice(0,topN);
    return arr;
  }, [filtered, groupBy, topN]);

  const total = chartData.reduce((s,d)=>s+d.value,0);

  const ctrlStyle = { padding:"8px 11px",borderRadius:8,border:"1.5px solid #d4e4d8",fontSize:".83rem",fontFamily:"inherit",color:G.ink,background:"#fff",outline:"none",width:"100%" };
  const labelStyle = { fontSize:".7rem",fontWeight:700,color:G.ink3,textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:5 };
  const chkStyle = { display:"flex",alignItems:"center",gap:8,fontSize:".83rem",color:G.ink2,cursor:"pointer",userSelect:"none" };
  const tabStyle = active => ({ flex:1,padding:"7px 0",borderRadius:7,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:".78rem",fontWeight:700,background:active?G.g2:"transparent",color:active?"#fff":G.ink3,transition:".2s" });

  return (
    <div style={{fontFamily:"Inter,system-ui,sans-serif",background:G.bg,minHeight:"100vh",padding:28}}>
      {showModal && <MerchantSelector selected={selMerchants} onChange={setSelMerchants} onClose={()=>setShowModal(false)}/>}

      <div style={{marginBottom:22}}>
        <div style={{fontSize:".7rem",fontWeight:700,color:G.g3,textTransform:"uppercase",letterSpacing:".1em",marginBottom:3}}>Dashboard</div>
        <h2 style={{fontSize:"1.35rem",fontWeight:800,color:G.ink,letterSpacing:"-.3px"}}>Visualizations</h2>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"264px 1fr",gap:18,alignItems:"start"}}>

        {/* ── CONTROLS ── */}
        <div style={{background:G.white,borderRadius:16,padding:20,border:`1px solid rgba(45,138,82,.09)`,boxShadow:"0 2px 12px rgba(0,0,0,.04)",position:"sticky",top:16,maxHeight:"calc(100vh - 60px)",overflowY:"auto"}}>

          <div style={{fontSize:".85rem",fontWeight:700,color:G.ink,marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${G.gl}`}}>Chart Controls</div>

          {/* Chart type */}
          <div style={{marginBottom:14}}>
            <label style={labelStyle}>Chart Type</label>
            <select value={chartType} onChange={e=>setChartType(e.target.value)} style={ctrlStyle}>
              <option value="bar">Bar Chart</option>
              <option value="pie">Pie / Donut</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="alluvial">Alluvial Flow</option>
            </select>
          </div>

          {/* Group by */}
          <div style={{marginBottom:14}}>
            <label style={labelStyle}>Group By</label>
            <select value={groupBy} onChange={e=>setGroupBy(e.target.value)} style={ctrlStyle}>
              <option value="merchant">Merchant</option>
              <option value="month">Month</option>
              <option value="type">Credit vs Debit</option>
              <option value="range">Amount Range</option>
            </select>
          </div>

          {/* Transaction type */}
          <div style={{marginBottom:14}}>
            <label style={labelStyle}>Transaction Type</label>
            <select value={txType} onChange={e=>setTxType(e.target.value)} style={ctrlStyle}>
              <option value="all">All</option>
              <option value="credits">Credits Only</option>
              <option value="debits">Debits Only</option>
            </select>
          </div>

          {/* Merchant selector */}
          <div style={{marginBottom:14}}>
            <label style={labelStyle}>Merchants</label>
            <button onClick={()=>setShowModal(true)} style={{...ctrlStyle,cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:G.ink2}}>{selMerchants.length === ALL_MERCHANTS.length ? "All merchants" : `${selMerchants.length} selected`}</span>
              <span style={{color:G.g3,fontSize:".75rem",fontWeight:700}}>Edit →</span>
            </button>
          </div>

          {/* Top N */}
          {groupBy==="merchant" && (
            <div style={{marginBottom:14}}>
              <label style={labelStyle}>Top {topN} by spend</label>
              <input type="range" min={3} max={Math.min(30,selMerchants.length)} value={topN}
                onChange={e=>setTopN(+e.target.value)} style={{width:"100%",accentColor:G.g2}}/>
            </div>
          )}

          {/* Chart-specific toggles */}
          <div style={{marginBottom:14,display:"flex",flexDirection:"column",gap:8}}>
            <label style={labelStyle}>Display</label>
            <label style={chkStyle}><input type="checkbox" checked={showLabels} onChange={e=>setShowLabels(e.target.checked)} style={{accentColor:G.g2}}/> Axis labels</label>
            <label style={chkStyle}><input type="checkbox" checked={showValues} onChange={e=>setShowValues(e.target.checked)} style={{accentColor:G.g2}}/> Value labels</label>
            {chartType==="pie" && <label style={chkStyle}><input type="checkbox" checked={donut} onChange={e=>setDonut(e.target.checked)} style={{accentColor:G.g2}}/> Donut style</label>}
            {(chartType==="area"||chartType==="line") && <label style={chkStyle}><input type="checkbox" checked={showArea} onChange={e=>setShowArea(e.target.checked)} style={{accentColor:G.g2}}/> Fill area</label>}
          </div>

          {/* Color controls */}
          <div style={{marginBottom:14}}>
            <label style={labelStyle}>Colors</label>
            <div style={{display:"flex",background:G.gxl,borderRadius:9,padding:3,marginBottom:12}}>
              <button style={tabStyle(colorTab==="preset")} onClick={()=>setColorTab("preset")}>Presets</button>
              <button style={tabStyle(colorTab==="custom")} onClick={()=>setColorTab("custom")}>Custom</button>
            </div>
            {colorTab==="preset" ? (
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {Object.entries(PRESET_PALETTES).map(([name,pal])=>(
                  <div key={name} onClick={()=>applyPalette(name)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",borderRadius:8,cursor:"pointer",border:`1.5px solid ${palette===name?G.g3:"transparent"}`,background:palette===name?G.gl:"transparent",transition:".15s"}}>
                    <div style={{display:"flex",gap:2}}>
                      {pal.slice(0,6).map((c,i)=><div key={i} style={{width:12,height:12,borderRadius:3,background:c}}/>)}
                    </div>
                    <span style={{fontSize:".8rem",fontWeight:palette===name?700:500,color:palette===name?G.g2:G.ink2}}>{name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{maxHeight:200,overflowY:"auto"}}>
                {chartData.slice(0,colors.length).map((d,i)=>(
                  <ColorSwatch key={i} color={colors[i%colors.length]} onChange={v=>updateColor(i,v)} label={d.label}/>
                ))}
              </div>
            )}
          </div>

          {/* Export */}
          <div style={{borderTop:`1px solid ${G.gl}`,paddingTop:14}}>
            <label style={labelStyle}>Export Chart</label>
            <div style={{display:"flex",gap:8}}>
              {["PNG","SVG","CSV"].map(f=>(
                <button key={f} style={{flex:1,padding:"8px 0",borderRadius:8,border:`1.5px solid #d4e4d8`,background:"#fff",fontSize:".75rem",fontWeight:700,color:G.ink2,cursor:"pointer",fontFamily:"inherit",transition:".2s"}}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── CHART AREA ── */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:G.white,borderRadius:16,padding:24,border:`1px solid rgba(45,138,82,.09)`,boxShadow:"0 2px 12px rgba(0,0,0,.04)"}}>

            {/* Chart header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
              <div>
                <div style={{fontSize:"1rem",fontWeight:700,color:G.ink,marginBottom:3}}>
                  {{bar:"Spending by ",pie:"Breakdown — ",line:"Over Time — ",area:"Trend — ",alluvial:"Flow — "}[chartType]}
                  {{merchant:"Merchant",month:"Month",type:"Transaction Type",range:"Amount Range"}[groupBy]}
                </div>
                <div style={{fontSize:".78rem",color:G.ink3}}>
                  {filtered.length} transactions · Total: {fmt(total)} · {selMerchants.length} merchants included
                </div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{background:G.gl,border:`1px solid rgba(45,138,82,.15)`,borderRadius:100,padding:"3px 11px",fontSize:".72rem",fontWeight:700,color:G.g2}}>
                  {txType==="all"?"All":txType==="credits"?"Credits":"Debits"}
                </div>
              </div>
            </div>

            {/* Charts */}
            {chartData.length === 0 ? (
              <div style={{textAlign:"center",padding:"60px 0",color:G.ink3}}>No data matches your filters.</div>
            ) : (
              <>
                {/* BAR */}
                {chartType==="bar" && (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData} margin={{top:20,right:10,bottom:groupBy==="merchant"?60:20,left:10}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eaf5ef"/>
                      {showLabels && <XAxis dataKey="label" tick={{fontSize:11,fill:G.ink3}} angle={groupBy==="merchant"?-35:0} textAnchor={groupBy==="merchant"?"end":"middle"} interval={0}/>}
                      <YAxis tickFormatter={fmtShort} tick={{fontSize:10,fill:G.ink3}} width={52}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Bar dataKey="value" radius={[5,5,0,0]} label={showValues?{position:"top",fontSize:10,formatter:fmtShort,fill:G.ink3}:false}>
                        {chartData.map((_,i)=><Cell key={i} fill={colors[i%colors.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {/* PIE */}
                {chartType==="pie" && (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="label"
                        cx="50%" cy="50%"
                        outerRadius={130} innerRadius={donut?65:0}
                        label={showLabels?({name,percent})=>`${name} ${(percent*100).toFixed(1)}%`:false}
                        labelLine={showLabels}>
                        {chartData.map((_,i)=><Cell key={i} fill={colors[i%colors.length]}/>)}
                      </Pie>
                      <Tooltip content={<CustomTooltip/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}

                {/* LINE */}
                {chartType==="line" && (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={chartData} margin={{top:20,right:20,bottom:20,left:10}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eaf5ef"/>
                      {showLabels && <XAxis dataKey="label" tick={{fontSize:11,fill:G.ink3}}/>}
                      <YAxis tickFormatter={fmtShort} tick={{fontSize:10,fill:G.ink3}} width={52}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2.5} dot={{fill:colors[0],r:4,strokeWidth:2,stroke:"#fff"}}
                        label={showValues?{fontSize:10,fill:colors[0],formatter:fmtShort}:false}/>
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {/* AREA */}
                {chartType==="area" && (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={chartData} margin={{top:20,right:20,bottom:20,left:10}}>
                      <defs>
                        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={colors[0]} stopOpacity={0.02}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eaf5ef"/>
                      {showLabels && <XAxis dataKey="label" tick={{fontSize:11,fill:G.ink3}}/>}
                      <YAxis tickFormatter={fmtShort} tick={{fontSize:10,fill:G.ink3}} width={52}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Area type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2.5} fill={showArea?"url(#ag)":"transparent"}
                        dot={{fill:colors[0],r:4,strokeWidth:2,stroke:"#fff"}}/>
                    </AreaChart>
                  </ResponsiveContainer>
                )}

                {/* ALLUVIAL */}
                {chartType==="alluvial" && <AlluvialChart data={filtered} colors={colors}/>}
              </>
            )}
          </div>

          {/* Data summary */}
          {chartType!=="alluvial" && chartData.length>0 && (
            <div style={{background:G.white,borderRadius:16,padding:20,border:`1px solid rgba(45,138,82,.09)`,boxShadow:"0 2px 12px rgba(0,0,0,.04)"}}>
              <div style={{fontSize:".72rem",fontWeight:700,color:G.ink3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:14}}>Data Summary</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
                {chartData.slice(0,12).map((d,i)=>(
                  <div key={i} style={{background:G.gxl,borderRadius:10,padding:"11px 13px",borderLeft:`3px solid ${colors[i%colors.length]}`}}>
                    <div style={{fontSize:".7rem",color:G.ink3,marginBottom:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.label}</div>
                    <div style={{fontSize:"1rem",fontWeight:800,color:G.ink}}>{fmt(d.value)}</div>
                    <div style={{fontSize:".68rem",color:G.ink3,marginTop:2}}>{((d.value/total)*100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
