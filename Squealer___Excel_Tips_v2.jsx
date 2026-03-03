import { useState, useMemo } from "react";

const G = {
  g1:"#0d4425",g2:"#1a6b3a",g3:"#2d8a52",g4:"#3fab68",
  gl:"#eaf5ef",gxl:"#f5fbf7",
  ink:"#0c1e12",ink2:"#3d5444",ink3:"#849e8b",
  white:"#fff",bg:"#f4f7f5",err:"#c0392b",
  warn:"#e67e22",
};

const CATEGORIES = ["All","Totals & Sums","Filtering & Lookup","Dates","Text & Clean-up","Pivot & Grouping","Advanced"];

const TIPS = [
  {
    id:1, cat:"Totals & Sums", icon:"➕",
    title:"SUMIF — Total spending at one merchant",
    summary:"Add up every transaction from a specific merchant, like all your Walmart charges.",
    formula:`=SUMIF(B:B,"Walmart",C:C)`,
    explanation:'Searches column B (Merchant) for "Walmart" and sums every matching value in column C (Amount). Change the name in quotes to any merchant.',
    columns:["B = Merchant","C = Amount"],
    result:"Returns a number like -$186.43 — that's how much you spent at Walmart total.",
    tip:'Use ABS() to get a positive number: =ABS(SUMIF(B:B,"Walmart",C:C))',
    examples:[
      { label:"Total Amazon spending", formula:`=SUMIF(B:B,"Amazon",C:C)` },
      { label:"Total gas stations combined", formula:`=SUMIF(B:B,"Shell Gas",C:C)+SUMIF(B:B,"Circle K",C:C)` },
    ]
  },
  {
    id:2, cat:"Totals & Sums", icon:"💰",
    title:"SUM credits vs debits separately",
    summary:"Get your total income and total spending as two separate numbers.",
    formula:`=SUMIF(C:C,">0",C:C)`,
    explanation:'SUMIF with a condition instead of a lookup value. ">0" sums only positive numbers (credits). Change to "<0" for debits.',
    columns:["C = Amount"],
    result:"Total credits = all incoming money. Total debits = all outgoing money.",
    tip:"Put both in adjacent cells for a quick income vs. spending snapshot.",
    examples:[
      { label:"Total credits (income)", formula:`=SUMIF(C:C,">0",C:C)` },
      { label:"Total debits (spending)", formula:`=SUMIF(C:C,"<0",C:C)` },
      { label:"Net cash flow", formula:`=SUMIF(C:C,">0",C:C)+SUMIF(C:C,"<0",C:C)` },
    ]
  },
  {
    id:3, cat:"Totals & Sums", icon:"📅",
    title:"SUMIFS — Total spending in a specific month",
    summary:"Sum transactions that match BOTH a merchant AND a date range simultaneously.",
    formula:`=SUMIFS(C:C,B:B,"Walmart",A:A,">="&DATE(2025,1,1),A:A,"<="&DATE(2025,1,31))`,
    explanation:"SUMIFS (plural) lets you stack multiple conditions: match Walmart in column B AND date in column A must fall within January 2025.",
    columns:["A = Date","B = Merchant","C = Amount"],
    result:"Walmart spending in January 2025 only.",
    tip:'Swap the merchant name for "*" to get all spending in a month regardless of merchant.',
    examples:[
      { label:"All spending in January 2025", formula:`=SUMIFS(C:C,A:A,">="&DATE(2025,1,1),A:A,"<="&DATE(2025,1,31))` },
      { label:"Amazon in Dec 2024", formula:`=SUMIFS(C:C,B:B,"Amazon",A:A,">="&DATE(2024,12,1),A:A,"<="&DATE(2024,12,31))` },
    ]
  },
  {
    id:4, cat:"Totals & Sums", icon:"🏆",
    title:"SUMPRODUCT — Flexible multi-condition sums",
    summary:"A power formula that replaces complex SUMIFS and handles things no other sum function can.",
    formula:`=SUMPRODUCT((B2:B1000="Amazon")*(C2:C1000<0)*ABS(C2:C1000))`,
    explanation:"Multiplies arrays together — each condition produces 1 or 0, so only rows where all conditions are true get counted. No Ctrl+Shift+Enter needed.",
    columns:["B = Merchant","C = Amount"],
    result:"Total debit spending at Amazon.",
    tip:"SUMPRODUCT can also count uniques, calculate weighted averages, and much more.",
    examples:[
      { label:"Count Amazon transactions", formula:`=SUMPRODUCT((B2:B1000="Amazon")*1)` },
      { label:"Average debit amount", formula:`=SUMPRODUCT((C2:C1000<0)*ABS(C2:C1000))/SUMPRODUCT((C2:C1000<0)*1)` },
    ]
  },
  {
    id:5, cat:"Filtering & Lookup", icon:"🔍",
    title:"COUNTIF — How many times did you visit a merchant?",
    summary:"Count the number of separate transactions at a specific merchant.",
    formula:`=COUNTIF(B:B,"McDonald's")`,
    explanation:"Counts every cell in column B that matches the text exactly. Tells you frequency — how many separate visits or charges.",
    columns:["B = Merchant"],
    result:"A number like 8 — meaning 8 separate McDonald's charges.",
    tip:'Divide SUMIF by COUNTIF to get average spend per visit: =SUMIF(B:B,"McDonald\'s",C:C)/COUNTIF(B:B,"McDonald\'s")',
    examples:[
      { label:"Count Uber Eats orders", formula:`=COUNTIF(B:B,"Uber Eats")` },
      { label:"Average per Uber Eats order", formula:`=SUMIF(B:B,"Uber Eats",C:C)/COUNTIF(B:B,"Uber Eats")` },
    ]
  },
  {
    id:6, cat:"Filtering & Lookup", icon:"🎯",
    title:"UNIQUE — List every distinct merchant",
    summary:"Automatically extract a clean, deduplicated list of all merchants from your data.",
    formula:`=UNIQUE(B2:B1000)`,
    explanation:"Spills a list of every unique value in the range. Essential first step before building a summary table. Available in Excel 365 and Google Sheets.",
    columns:["B = Merchant"],
    result:"A vertical list: Amazon, Walmart, Shell Gas… with no repeats.",
    tip:"Combine with SORT to get them alphabetically: =SORT(UNIQUE(B2:B1000))",
    examples:[
      { label:"Unique merchants A-Z", formula:`=SORT(UNIQUE(B2:B1000))` },
      { label:"Count of unique merchants", formula:`=COUNTA(UNIQUE(B2:B1000))` },
    ]
  },
  {
    id:7, cat:"Filtering & Lookup", icon:"📋",
    title:"FILTER — Pull only debits or credits into a new table",
    summary:"Create a live sub-table of just the rows you care about — updates automatically when data changes.",
    formula:`=FILTER(A2:D1000,C2:C1000<0,"No debits found")`,
    explanation:"Returns only rows where the condition is true. C<0 means only debit transactions. The third argument shows if nothing matches.",
    columns:["A = Date","B = Merchant","C = Amount","D = Balance"],
    result:"A separate live table containing only your spending transactions.",
    tip:'Stack conditions with * (AND): =FILTER(A2:D1000,(C2:C1000<0)*(B2:B1000="Amazon"))',
    examples:[
      { label:"Credits only", formula:`=FILTER(A2:D1000,C2:C1000>0)` },
      { label:"Amazon debits only", formula:`=FILTER(A2:D1000,(C2:C1000<0)*(B2:B1000="Amazon"))` },
      { label:"All transactions over $100", formula:`=FILTER(A2:D1000,ABS(C2:C1000)>100)` },
    ]
  },
  {
    id:8, cat:"Filtering & Lookup", icon:"🔗",
    title:"XLOOKUP — Find a transaction by date or merchant",
    summary:"The modern replacement for VLOOKUP. Looks up any value and returns any column you want.",
    formula:`=XLOOKUP("Walmart",B:B,C:C,"Not found",0)`,
    explanation:"Searches column B for Walmart and returns the matching value from column C. More flexible than VLOOKUP — works in any direction.",
    columns:["B = Merchant","C = Amount"],
    result:"The amount of the first Walmart transaction found.",
    tip:"Use FILTER instead of XLOOKUP if you want ALL matches, not just the first one.",
    examples:[
      { label:"Find first Netflix charge", formula:`=XLOOKUP("Netflix",B:B,C:C)` },
      { label:"Find balance on a specific date", formula:`=XLOOKUP("2025-01-15",A:A,D:D)` },
    ]
  },
  {
    id:9, cat:"Dates", icon:"🗓️",
    title:"TEXT — Format dates your way",
    summary:"Convert your date column into month names, weekdays, or any custom format.",
    formula:`=TEXT(A2,"MMMM YYYY")`,
    explanation:`TEXT converts a date value into a string using format codes. "MMMM YYYY" gives "January 2025". Great for building monthly labels.`,
    columns:["A = Date"],
    result:`"January 2025" instead of 2025-01-28.`,
    tip:`Use "DDDD" for Monday/Tuesday/Wednesday to see which days you spend most.`,
    examples:[
      { label:"Short month + year", formula:`=TEXT(A2,"MMM YYYY")` },
      { label:"Day of the week", formula:`=TEXT(A2,"DDDD")` },
      { label:"Month number only", formula:`=MONTH(A2)` },
    ]
  },
  {
    id:10, cat:"Dates", icon:"📆",
    title:"EOMONTH — Group transactions by month",
    summary:"Snap every date to the last day of its month — perfect for monthly grouping and pivot tables.",
    formula:`=EOMONTH(A2,0)`,
    explanation:"Returns the last day of the month for any date. All January dates snap to Jan 31. Use as a helper column, then SUMIF or pivot on it.",
    columns:["A = Date"],
    result:"2025-01-28 becomes 2025-01-31. 2024-12-15 becomes 2024-12-31.",
    tip:"Format the helper column as a date. Then SUMIF on that column for clean monthly totals.",
    examples:[
      { label:"Month helper column", formula:`=EOMONTH(A2,0)` },
      { label:"First day of month instead", formula:`=DATE(YEAR(A2),MONTH(A2),1)` },
    ]
  },
  {
    id:11, cat:"Dates", icon:"⏱️",
    title:"DATEDIF — Days between transactions",
    summary:"Calculate the gap between two dates — useful for spotting subscription billing intervals.",
    formula:`=DATEDIF(A2,A3,"D")`,
    explanation:`Returns the number of days between two dates. "D" = days, "M" = months, "Y" = years. Good for checking if a subscription charges on schedule.`,
    columns:["A = Date"],
    result:"Number of days between consecutive rows.",
    tip:"Sort by merchant first, then apply DATEDIF on consecutive rows to find billing patterns.",
    examples:[
      { label:"Days since last transaction", formula:`=DATEDIF(A2,TODAY(),"D")` },
      { label:"Months of data in your file", formula:`=DATEDIF(MIN(A:A),MAX(A:A),"M")` },
    ]
  },
  {
    id:12, cat:"Text & Clean-up", icon:"✂️",
    title:"TRIM + PROPER — Clean messy merchant names",
    summary:"Remove extra spaces and fix inconsistent capitalization from OCR output.",
    formula:`=PROPER(TRIM(B2))`,
    explanation:"TRIM removes leading, trailing, and double spaces. PROPER capitalizes the first letter of each word. Combined, they standardize messy OCR text.",
    columns:["B = Merchant"],
    result:`"  WALMART  " becomes "Walmart"`,
    tip:"After cleaning, paste as Values (Ctrl+Shift+V) to replace formulas with static text before running SUMIF or COUNTIF.",
    examples:[
      { label:"Trim spaces only", formula:`=TRIM(B2)` },
      { label:"All uppercase", formula:`=UPPER(B2)` },
      { label:"All lowercase", formula:`=LOWER(B2)` },
    ]
  },
  {
    id:13, cat:"Text & Clean-up", icon:"🔎",
    title:"SEARCH + ISNUMBER — Tag transactions by keyword",
    summary:"Check if a merchant name contains a keyword and return a label — great for building categories.",
    formula:`=IF(ISNUMBER(SEARCH("gas",B2)),"Fuel","Other")`,
    explanation:"SEARCH finds the keyword (case-insensitive) and returns its position. ISNUMBER converts that to TRUE/FALSE. IF wraps it into a readable label.",
    columns:["B = Merchant"],
    result:`"Shell Gas" becomes "Fuel". "Walmart" becomes "Other".`,
    tip:"Chain with IFS() to build a full category system: Food, Transport, Entertainment, Income, etc.",
    examples:[
      { label:"Tag food delivery", formula:`=IF(ISNUMBER(SEARCH("eats",B2)),"Food Delivery","Other")` },
      { label:"Multi-category tagger", formula:`=IFS(ISNUMBER(SEARCH("gas",B2)),"Fuel",ISNUMBER(SEARCH("eats",B2)),"Food",ISNUMBER(SEARCH("deposit",B2)),"Income",TRUE,"Other")` },
    ]
  },
  {
    id:14, cat:"Text & Clean-up", icon:"🔢",
    title:"VALUE + SUBSTITUTE — Fix text-formatted amounts",
    summary:`Convert amounts stored as text like "$84.32" back into real numbers Excel can calculate with.`,
    formula:`=VALUE(SUBSTITUTE(SUBSTITUTE(C2,"$",""),",",""))`,
    explanation:"If your export includes dollar signs or commas, Excel treats them as text. SUBSTITUTE strips those characters, then VALUE converts the string to a number.",
    columns:["C = Amount (if imported as text)"],
    result:`"$1,200.00" becomes 1200`,
    tip:"Only needed when cells show a green triangle error in the top-left corner. If amounts are already numbers, skip this.",
    examples:[
      { label:"Strip $ and commas", formula:`=VALUE(SUBSTITUTE(SUBSTITUTE(C2,"$",""),",",""))` },
      { label:"Check if a cell is numeric", formula:`=ISNUMBER(C2)` },
    ]
  },
  {
    id:15, cat:"Pivot & Grouping", icon:"📊",
    title:"PivotTable — Merchant spending summary in seconds",
    summary:"The fastest way to see total spending per merchant. No formulas required.",
    formula:`Insert → PivotTable → Rows: Merchant, Values: Sum of Amount`,
    explanation:"Select your data, Insert → PivotTable. Drag Merchant to Rows, Amount to Values. Excel instantly calculates totals for every merchant. Sort by sum descending to rank spending.",
    columns:["All columns"],
    result:"A ranked table: Rent -$950, Walmart -$186, Amazon -$235…",
    tip:"Add Date to Columns and group by Month to get a merchant × month spending matrix.",
    examples:[
      { label:"Step 1 — Make a Table", formula:`Click any cell in your data → Ctrl+T → OK` },
      { label:"Step 2 — Insert PivotTable", formula:`Insert → PivotTable → New Worksheet → OK` },
      { label:"Step 3 — Build the view", formula:`Drag Merchant → Rows, Amount → Values (Sum)` },
    ]
  },
  {
    id:16, cat:"Pivot & Grouping", icon:"📈",
    title:"AVERAGEIF — Average spend per merchant",
    summary:"Find your average transaction size per merchant — are you going big or staying small?",
    formula:`=AVERAGEIF(B:B,"Uber Eats",C:C)`,
    explanation:"Like SUMIF but divides automatically. Returns the mean of all matching rows.",
    columns:["B = Merchant","C = Amount"],
    result:"Average Uber Eats order size across all your transactions.",
    tip:"High frequency + low average = habit spending. Low frequency + high average = big purchases.",
    examples:[
      { label:"Average monthly deposit", formula:`=AVERAGEIF(B:B,"Direct Deposit",C:C)` },
      { label:"Average debit transaction size", formula:`=AVERAGEIF(C:C,"<0",C:C)` },
    ]
  },
  {
    id:17, cat:"Pivot & Grouping", icon:"🏅",
    title:"RANK — Rank merchants by total spending",
    summary:"Build a leaderboard of your biggest spending categories.",
    formula:`=RANK(E2,$E$2:$E$20,1)`,
    explanation:"First build a summary table with UNIQUE + SUMIF to get a total per merchant in column E. Then RANK assigns each a position. Use 0 for descending (largest = 1).",
    columns:["E = Totals (from SUMIF helper column)"],
    result:"Each merchant gets a rank — 1st = highest spender.",
    tip:"Use LARGE(E:E,1) to pull the top spending amount directly, LARGE(E:E,2) for 2nd, etc.",
    examples:[
      { label:"Top spending amount", formula:`=LARGE(E2:E20,1)` },
      { label:"Name of top spender", formula:`=INDEX(D2:D20,MATCH(LARGE(E2:E20,1),E2:E20,0))` },
    ]
  },
  {
    id:18, cat:"Advanced", icon:"🧮",
    title:"Running balance from scratch",
    summary:"Reconstruct a running balance column if your export only has transaction amounts.",
    formula:`=SUM($C$2:C2)`,
    explanation:"An expanding range sum — $C$2 is locked, C2 moves down as you copy the formula. Each row accumulates all amounts from the top down.",
    columns:["C = Amount"],
    result:"A reconstructed balance column that updates live.",
    tip:"If you have a known starting balance, add it: =$F$1+SUM($C$2:C2)",
    examples:[
      { label:"Running cumulative sum", formula:`=SUM($C$2:C2)` },
      { label:"With a starting balance in F1", formula:`=$F$1+SUM($C$2:C2)` },
    ]
  },
  {
    id:19, cat:"Advanced", icon:"🚨",
    title:"Conditional Formatting — Highlight overdrafts red",
    summary:"Automatically color any row where your balance went negative. No manual work.",
    formula:`=$D2<0  (as a conditional format rule)`,
    explanation:"Select all data rows → Home → Conditional Formatting → New Rule → Use a formula. Enter =$D2<0 and choose a red fill. Every negative balance row lights up automatically.",
    columns:["D = Balance"],
    result:"All overdraft rows are instantly highlighted red.",
    tip:"Add a second rule: =$C2>0 with green fill to highlight all income rows simultaneously.",
    examples:[
      { label:"Highlight big purchases over $50", formula:`=ABS($C2)>50` },
      { label:"Highlight subscription rows", formula:`=ISNUMBER(SEARCH("Netflix",$B2))+ISNUMBER(SEARCH("Spotify",$B2))>0` },
    ]
  },
  {
    id:20, cat:"Advanced", icon:"📉",
    title:"Sparklines — Tiny trend charts inside a cell",
    summary:"Add a mini line chart inside a single cell to visualize monthly spending at a glance.",
    formula:`Insert → Sparklines → Line → point to your monthly totals row`,
    explanation:"First build monthly totals using SUMIFS. Then select an empty cell, Insert → Sparklines → Line, point to your totals row. One cell becomes a tiny trend chart.",
    columns:["Monthly summary row (from SUMIFS)"],
    result:"A tiny line chart in one cell showing your spending trend across months.",
    tip:"Enable High Point and Low Point markers in Sparkline Design to instantly spot your best and worst months.",
    examples:[
      { label:"Monthly debits Jan 2025", formula:`=SUMIFS(C:C,A:A,">="&DATE(2025,1,1),A:A,"<"&DATE(2025,2,1),C:C,"<0")` },
      { label:"Monthly credits Jan 2025", formula:`=SUMIFS(C:C,A:A,">="&DATE(2025,1,1),A:A,"<"&DATE(2025,2,1),C:C,">0")` },
    ]
  },
];

function CodeBlock({ code, copied, onCopy }) {
  return (
    <div style={{ background:"#0c1e12", borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, fontFamily:"'Fira Mono','Consolas',monospace", fontSize:".82rem", color:"#8ed4aa", overflowX:"auto" }}>
      <span style={{ flex:1, whiteSpace:"pre-wrap", wordBreak:"break-all" }}>{code}</span>
      <button onClick={() => onCopy(code)} style={{ flexShrink:0, background: copied ? "#2d8a52" : "rgba(255,255,255,.1)", border:"none", borderRadius:7, padding:"5px 11px", color:"#fff", fontSize:".72rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:".2s", whiteSpace:"nowrap" }}>
        {copied ? "✓ Copied" : "Copy"}
      </button>
    </div>
  );
}

function TipCard({ tip, isOpen, onToggle }) {
  const [copied, setCopied] = useState(null);
  const handleCopy = (code) => {
    try { navigator.clipboard.writeText(code); } catch(e) {}
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={{ background:G.white, border:`1.5px solid ${isOpen ? G.g3 : "rgba(45,138,82,.1)"}`, borderRadius:14, overflow:"hidden", boxShadow: isOpen ? "0 4px 24px rgba(45,138,82,.1)" : "0 2px 10px rgba(0,0,0,.04)", transition:".2s" }}>
      <div onClick={onToggle} style={{ padding:"18px 20px", display:"flex", alignItems:"center", gap:14, cursor:"pointer", background: isOpen ? G.gxl : G.white, borderBottom: isOpen ? `1px solid rgba(45,138,82,.08)` : "none" }}>
        <div style={{ width:42, height:42, borderRadius:11, background: isOpen ? G.gl : "#f4f7f5", display:"grid", placeItems:"center", fontSize:"1.25rem", flexShrink:0, border:`1px solid rgba(45,138,82,.1)` }}>{tip.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:".93rem", color:G.ink, marginBottom:4 }}>{tip.title}</div>
          <div style={{ fontSize:".8rem", color:G.ink3, lineHeight:1.45 }}>{tip.summary}</div>
        </div>
        <div style={{ width:28, height:28, borderRadius:8, background: isOpen ? G.gl : "#f4f7f5", display:"grid", placeItems:"center", flexShrink:0, border:`1px solid rgba(45,138,82,.1)`, color:G.g3, fontSize:"1.1rem", fontWeight:700, transition:".2s", transform: isOpen ? "rotate(45deg)" : "none" }}>+</div>
      </div>

      {isOpen && (
        <div style={{ padding:"20px 20px 24px" }}>
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:".7rem", fontWeight:700, color:G.ink3, textTransform:"uppercase", letterSpacing:".07em", marginBottom:8 }}>Formula</div>
            <CodeBlock code={tip.formula} copied={copied===tip.formula} onCopy={handleCopy}/>
          </div>

          <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:16 }}>
            {tip.columns.map((c,i) => (
              <span key={i} style={{ background:"#f0f4f2", border:`1px solid rgba(45,138,82,.12)`, borderRadius:7, padding:"4px 10px", fontSize:".75rem", color:G.ink2, fontFamily:"'Fira Mono',monospace" }}>{c}</span>
            ))}
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:".7rem", fontWeight:700, color:G.ink3, textTransform:"uppercase", letterSpacing:".07em", marginBottom:6 }}>How It Works</div>
            <div style={{ fontSize:".85rem", color:G.ink2, lineHeight:1.65 }}>{tip.explanation}</div>
          </div>

          <div style={{ background:G.gxl, borderRadius:10, padding:"11px 15px", border:`1px solid rgba(45,138,82,.1)`, marginBottom:16, display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ fontSize:"1rem", flexShrink:0 }}>📋</span>
            <div>
              <div style={{ fontSize:".7rem", fontWeight:700, color:G.g3, textTransform:"uppercase", letterSpacing:".06em", marginBottom:3 }}>Expected Result</div>
              <div style={{ fontSize:".83rem", color:G.ink2 }}>{tip.result}</div>
            </div>
          </div>

          <div style={{ background:"#fff8f0", borderRadius:10, padding:"11px 15px", border:`1px solid rgba(230,126,34,.15)`, marginBottom:18, display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ fontSize:"1rem", flexShrink:0 }}>💡</span>
            <div>
              <div style={{ fontSize:".7rem", fontWeight:700, color:G.warn, textTransform:"uppercase", letterSpacing:".06em", marginBottom:3 }}>Pro Tip</div>
              <div style={{ fontSize:".83rem", color:"#7a4a10", lineHeight:1.55 }}>{tip.tip}</div>
            </div>
          </div>

          {tip.examples?.length > 0 && (
            <div>
              <div style={{ fontSize:".7rem", fontWeight:700, color:G.ink3, textTransform:"uppercase", letterSpacing:".07em", marginBottom:10 }}>More Examples</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {tip.examples.map((ex,i) => (
                  <div key={i}>
                    <div style={{ fontSize:".75rem", color:G.ink3, marginBottom:4 }}>{ex.label}</div>
                    <CodeBlock code={ex.formula} copied={copied===ex.formula} onCopy={handleCopy}/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExcelTips() {
  const [activeCat, setActiveCat] = useState("All");
  const [openId,    setOpenId]    = useState(null);

  const counts = useMemo(() => {
    const c = {};
    CATEGORIES.forEach(cat => { c[cat] = cat === "All" ? TIPS.length : TIPS.filter(t => t.cat === cat).length; });
    return c;
  }, []);

  const visible = useMemo(() => {
    return activeCat === "All" ? TIPS : TIPS.filter(t => t.cat === activeCat);
  }, [activeCat]);

  return (
    <div style={{ fontFamily:"Inter,system-ui,sans-serif", background:G.bg, minHeight:"100vh", padding:28 }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:".7rem", fontWeight:700, color:G.g3, textTransform:"uppercase", letterSpacing:".1em", marginBottom:3 }}>Dashboard</div>
        <h2 style={{ fontSize:"1.35rem", fontWeight:800, color:G.ink, letterSpacing:"-.3px", marginBottom:6 }}>Excel Tips</h2>
        <div style={{ fontSize:".88rem", color:G.ink3, maxWidth:560, lineHeight:1.6 }}>
          20 formulas and techniques for exploring your exported Chime data in Excel or Google Sheets. Click any card to expand the full explanation and examples.
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)} style={{ padding:"7px 14px", borderRadius:100, border:"1.5px solid", borderColor: activeCat===cat ? G.g2 : "rgba(45,138,82,.15)", background: activeCat===cat ? G.g2 : G.white, color: activeCat===cat ? "#fff" : G.ink3, fontWeight: activeCat===cat ? 700 : 500, fontSize:".8rem", cursor:"pointer", fontFamily:"inherit", transition:".15s", display:"flex", alignItems:"center", gap:6 }}>
            {cat}
            <span style={{ background: activeCat===cat ? "rgba(255,255,255,.2)" : G.gxl, color: activeCat===cat ? "#fff" : G.ink3, borderRadius:100, padding:"1px 7px", fontSize:".7rem", fontWeight:700 }}>{counts[cat]}</span>
          </button>
        ))}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {visible.map(tip => (
          <TipCard key={tip.id} tip={tip} isOpen={openId === tip.id} onToggle={() => setOpenId(prev => prev===tip.id ? null : tip.id)}/>
        ))}
      </div>

      <div style={{ marginTop:40, background:G.g1, borderRadius:16, padding:"24px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
        <div>
          <div style={{ fontSize:"1rem", fontWeight:800, color:"#fff", marginBottom:4 }}>Ready to try these on your data?</div>
          <div style={{ fontSize:".85rem", color:"rgba(255,255,255,.6)", lineHeight:1.5 }}>Export your transactions as CSV or XLSX, then open in Excel or Google Sheets.</div>
        </div>
        <button style={{ padding:"11px 24px", borderRadius:10, border:"2px solid rgba(255,255,255,.25)", background:"rgba(255,255,255,.1)", color:"#fff", fontWeight:700, fontSize:".88rem", cursor:"pointer", fontFamily:"inherit" }}>
          Go to Export Center →
        </button>
      </div>
    </div>
  );
}
