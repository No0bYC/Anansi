import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY
);

const C = {
  bg:"#FFFFFF",bgSoft:"#F7F7F7",red:"#CC0000",redLight:"#FF1A1A",
  redSoft:"#FFF0F0",redMid:"#FFD6D6",black:"#111111",blackSoft:"#222222",
  gray:"#888888",grayLight:"#DDDDDD",green:"#1A7A4A",amber:"#B85C00",blue:"#1A4A8A",
};

// Contacts are loaded from Supabase — this is just a fallback for dev
const CONTACTS = [];

const MOCK_NOTIFICATIONS = [
  {id:1,type:"urgent",message:"Envoyer la note AfCFTA à Arjun Mehta",contactId:1,due:"Dans 2 jours",read:false,time:"Il y a 1h"},
  {id:2,type:"urgent",message:"Répondre à Marc Fontaine sur la stratégie Q3",contactId:5,due:"Aujourd'hui",read:false,time:"Il y a 2h"},
  {id:3,type:"aVenir",message:"Réunion avec Sophie Delacroix demain à 14h",contactId:2,due:"Demain",read:false,time:"Il y a 3h"},
  {id:4,type:"aVenir",message:"Bot: Nouveau contact détecté — Robert Marie. Validation requise.",contactId:null,due:"À valider",read:false,time:"Il y a 4h"},
  {id:5,type:"aFaire",message:"Jean Pierre Lim — Momentum faible. 21 jours sans contact.",contactId:4,due:"Ce mois",read:true,time:"Il y a 6h"},
  {id:6,type:"aFaire",message:"Explorer une collaboration avec Kevin Ah Kow sur Anansi",contactId:3,due:"Cette semaine",read:true,time:"Hier"},
  {id:7,type:"bonPlan",message:"Arjun et Sophie partagent un intérêt pour l'investissement local — les introduire ?",contactId:null,due:null,read:true,time:"Il y a 2j"},
  {id:8,type:"bonPlan",message:"Kevin cherche un projet tech — TripIn pourrait l'intéresser.",contactId:3,due:null,read:true,time:"Il y a 3j"},
];

const LEVER_CONFIG={statut:{icon:"👑",desc:"Reconnaître sa valeur publiquement"},réciprocité:{icon:"⇄",desc:"Rendre service avant de demander"},appartenance:{icon:"◉",desc:"L'inclure dans un cercle fermé"},intérêt:{icon:"◈",desc:"Montrer ce qu'il y gagne"},cohérence:{icon:"∞",desc:"Relier à ses prises de position passées"}};
const STATE_CONFIG={expansion:{label:"En expansion",color:C.green},stable:{label:"Stable",color:C.blue},stress:{label:"Sous stress",color:C.red},transition:{label:"En transition",color:C.amber}};
const NOTIF_SECTIONS=[
  {key:"urgent",label:"Urgent",color:C.red,bg:C.redSoft,icon:"⚠"},
  {key:"aVenir",label:"À venir",color:C.blue,bg:"#F0F4FF",icon:"◷"},
  {key:"aFaire",label:"À faire",color:C.amber,bg:"#FFF8F0",icon:"↺"},
  {key:"bonPlan",label:"Bons plans",color:C.green,bg:"#F0FFF6",icon:"✦"},
];

function healthScore(c){return Math.round((c.sentiment_score+c.reliability_score+c.reciprocity_score+c.momentum_score)*10/4);}
function healthColor(s){return s>=70?C.green:s>=50?C.amber:s>=30?"#CC5500":C.red;}

// ── HOOK: window width ─────────────────────────────────────────────────────────
function useWindowWidth(){
  const [w,setW]=useState(window.innerWidth);
  useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return w;
}

// ── LOGO ───────────────────────────────────────────────────────────────────────
function Logo({size=40}){
  const s=size,cx=s/2,cy=s/2,r=s*0.46;
  const top={x:cx,y:cy-r*0.52},left={x:cx-r*0.58,y:cy+r*0.05},bot={x:cx-r*0.08,y:cy+r*0.55},right={x:cx+r*0.52,y:cy+r*0.05};
  const nr=s*0.115;
  return(
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111" strokeWidth={s*0.028}/>
      <line x1={top.x} y1={top.y} x2={left.x} y2={left.y} stroke="#111" strokeWidth={s*0.018}/>
      <line x1={top.x} y1={top.y} x2={bot.x} y2={bot.y} stroke="#111" strokeWidth={s*0.018}/>
      <line x1={top.x} y1={top.y} x2={right.x} y2={right.y} stroke="#111" strokeWidth={s*0.018}/>
      <line x1={left.x} y1={left.y} x2={bot.x} y2={bot.y} stroke="#111" strokeWidth={s*0.018}/>
      <circle cx={top.x} cy={top.y} r={nr} fill="#CC0000"/>
      <circle cx={left.x} cy={left.y} r={nr} fill="#111111"/>
      <circle cx={bot.x} cy={bot.y} r={nr} fill="#888888"/>
      <circle cx={right.x} cy={right.y} r={nr} fill="#FFFFFF" stroke="#111111" strokeWidth={s*0.022}/>
    </svg>
  );
}

function AnimatedLogo({size=120}){
  const [phase,setPhase]=useState(0);
  useEffect(()=>{const t1=setTimeout(()=>setPhase(1),200),t2=setTimeout(()=>setPhase(2),650),t3=setTimeout(()=>setPhase(3),1050);return()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);};},[]);
  const s=size,cx=s/2,cy=s/2,r=s*0.46;
  const top={x:cx,y:cy-r*0.52},left={x:cx-r*0.58,y:cy+r*0.05},bot={x:cx-r*0.08,y:cy+r*0.55},right={x:cx+r*0.52,y:cy+r*0.05};
  const nr=s*0.115;
  return(
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111" strokeWidth={s*0.025}
        style={{strokeDasharray:2*Math.PI*r,strokeDashoffset:phase>=1?0:2*Math.PI*r,transition:"stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1)",transformOrigin:`${cx}px ${cy}px`,transform:"rotate(-90deg)"}}/>
      {[[top,left],[top,bot],[top,right],[left,bot]].map(([a,b],i)=>(
        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#111" strokeWidth={s*0.016} style={{opacity:phase>=2?1:0,transition:`opacity 0.25s ease ${i*0.07}s`}}/>
      ))}
      {[{pos:top,fill:"#CC0000",stroke:null},{pos:left,fill:"#111111",stroke:null},{pos:bot,fill:"#888888",stroke:null},{pos:right,fill:"#FFFFFF",stroke:"#111111"}].map((n,i)=>(
        <circle key={i} cx={n.pos.x} cy={n.pos.y} r={nr} fill={n.fill} stroke={n.stroke||"none"} strokeWidth={n.stroke?s*0.02:0}
          style={{transform:phase>=3?"scale(1)":"scale(0)",transformOrigin:`${n.pos.x}px ${n.pos.y}px`,transition:`transform 0.35s cubic-bezier(0.34,1.56,0.64,1) ${i*0.08}s`}}/>
      ))}
    </svg>
  );
}

function Splash({onDone}){
  const [p,setP]=useState(0);
  useEffect(()=>{const t1=setTimeout(()=>setP(1),100),t2=setTimeout(()=>setP(2),1400),t3=setTimeout(()=>setP(3),1900),t4=setTimeout(onDone,3400);return()=>{[t1,t2,t3,t4].forEach(clearTimeout);};},[onDone]);
  return(
    <div style={{position:"fixed",inset:0,background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,zIndex:300}}>
      <style>{`@keyframes pulse{0%,100%{opacity:0.15}50%{opacity:1}}`}</style>
      <div style={{opacity:p>=1?1:0,transition:"opacity 0.4s ease"}}><AnimatedLogo size={120}/></div>
      <div style={{opacity:p>=2?1:0,transform:p>=2?"translateY(0)":"translateY(10px)",transition:"all 0.45s ease",textAlign:"center"}}>
        <div style={{fontSize:36,fontWeight:900,color:C.black,letterSpacing:"-0.01em",fontFamily:"Inter,sans-serif",textTransform:"uppercase"}}>ANANSI <span style={{color:C.red}}>I:R.</span></div>
      </div>
      <div style={{position:"absolute",bottom:40,display:"flex",gap:7,opacity:p>=3?1:0,transition:"opacity 0.4s ease"}}>
        {[0,1,2].map(i=>(<div key={i} style={{width:6,height:6,borderRadius:"50%",background:i===0?C.red:C.grayLight,animation:`pulse 1.3s ease ${i*0.22}s infinite`}}/>))}
      </div>
    </div>
  );
}

// ── SNAKE ──────────────────────────────────────────────────────────────────────
function SnakeGame({onExit}){
  const canvasRef=useRef(null);
  const stateRef=useRef({snake:[{x:10,y:10},{x:9,y:10},{x:8,y:10}],dir:{x:1,y:0},nextDir:{x:1,y:0},food:{x:15,y:15},score:0,alive:true,speed:130});
  const timerRef=useRef(null);
  const rf=(s)=>{let p;do{p={x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)}}while(s.some(x=>x.x===p.x&&x.y===p.y));return p;};
  const draw=useCallback(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d"),S=stateRef.current,CELL=16;
    ctx.fillStyle="#111";ctx.fillRect(0,0,320,320);
    ctx.strokeStyle="rgba(200,0,0,0.07)";ctx.lineWidth=0.5;
    for(let i=0;i<=20;i++){ctx.beginPath();ctx.moveTo(i*CELL,0);ctx.lineTo(i*CELL,320);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*CELL);ctx.lineTo(320,i*CELL);ctx.stroke();}
    ctx.fillStyle="#CC0000";ctx.font="14px monospace";ctx.fillText("◆",S.food.x*CELL+1,S.food.y*CELL+13);
    S.snake.forEach((seg,i)=>{ctx.fillStyle=i===0?"#CC0000":`rgba(180,0,0,${Math.max(0.2,0.9-i*0.04)})`;ctx.fillRect(seg.x*CELL+1,seg.y*CELL+1,CELL-2,CELL-2);if(i===0){ctx.fillStyle="#fff";ctx.fillRect(seg.x*CELL+4,seg.y*CELL+4,3,3);ctx.fillRect(seg.x*CELL+9,seg.y*CELL+4,3,3);}});
    ctx.fillStyle="rgba(255,255,255,0.5)";ctx.font="bold 11px monospace";ctx.fillText(`SCORE: ${S.score}`,4,314);
    if(!S.alive){ctx.fillStyle="rgba(0,0,0,0.88)";ctx.fillRect(0,0,320,320);ctx.fillStyle="#CC0000";ctx.font="bold 22px monospace";ctx.textAlign="center";ctx.fillText("GAME OVER",160,140);ctx.fillStyle="rgba(255,255,255,0.7)";ctx.font="11px monospace";ctx.fillText(`SCORE: ${S.score}`,160,162);ctx.fillStyle="rgba(255,255,255,0.3)";ctx.font="10px monospace";ctx.fillText("↺ pour rejouer",160,184);ctx.textAlign="left";}
  },[]);
  const tick=useCallback(()=>{const S=stateRef.current;if(!S.alive)return;S.dir=S.nextDir;const head={x:S.snake[0].x+S.dir.x,y:S.snake[0].y+S.dir.y};if(head.x<0||head.x>=20||head.y<0||head.y>=20||S.snake.some(s=>s.x===head.x&&s.y===head.y)){S.alive=false;draw();return;}S.snake.unshift(head);if(head.x===S.food.x&&head.y===S.food.y){S.score+=10;S.food=rf(S.snake);S.speed=Math.max(60,S.speed-2);clearInterval(timerRef.current);timerRef.current=setInterval(tick,S.speed);}else S.snake.pop();draw();},[draw]);
  const restart=useCallback(()=>{const S=stateRef.current;S.snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];S.dir={x:1,y:0};S.nextDir={x:1,y:0};S.food={x:15,y:15};S.score=0;S.alive=true;S.speed=130;clearInterval(timerRef.current);timerRef.current=setInterval(tick,S.speed);},[tick]);
  useEffect(()=>{timerRef.current=setInterval(tick,stateRef.current.speed);draw();const onKey=(e)=>{const S=stateRef.current;if(!S.alive&&e.code==="Space"){restart();return;}const dirs={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},KeyW:{x:0,y:-1},KeyS:{x:0,y:1},KeyA:{x:-1,y:0},KeyD:{x:1,y:0}};const d=dirs[e.code];if(d&&!(d.x===-S.dir.x&&d.y===-S.dir.y))S.nextDir=d;};window.addEventListener("keydown",onKey);return()=>{clearInterval(timerRef.current);window.removeEventListener("keydown",onKey);};},[tick,draw,restart]);
  const moveDir=(dx,dy)=>{const S=stateRef.current;if(!S.alive){restart();return;}const d={x:dx,y:dy};if(!(d.x===-S.dir.x&&d.y===-S.dir.y))S.nextDir=d;};
  const bs={width:54,height:54,borderRadius:12,background:"rgba(200,0,0,0.1)",border:"1px solid rgba(200,0,0,0.2)",color:"#CC0000",fontSize:24,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",userSelect:"none"};
  return(
    <div style={{position:"fixed",inset:0,background:"#111",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:200,gap:10}}>
      <div style={{color:"rgba(255,255,255,0.12)",fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase"}}>Session invalide</div>
      <div style={{border:"1px solid rgba(200,0,0,0.12)",borderRadius:6,padding:4}}><canvas ref={canvasRef} width={320} height={320} style={{display:"block"}}/></div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,marginTop:4}}>
        <button style={bs} onClick={()=>moveDir(0,-1)}>↑</button>
        <div style={{display:"flex",gap:5}}>
          <button style={bs} onClick={()=>moveDir(-1,0)}>←</button>
          <button style={{...bs,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.3)",fontSize:16}} onClick={restart}>↺</button>
          <button style={bs} onClick={()=>moveDir(1,0)}>→</button>
        </div>
        <button style={bs} onClick={()=>moveDir(0,1)}>↓</button>
      </div>
      <button onClick={onExit} style={{marginTop:6,padding:"7px 18px",background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,color:"rgba(255,255,255,0.2)",fontSize:11,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>← Retour</button>
    </div>
  );
}

// ── NOTIFICATIONS ──────────────────────────────────────────────────────────────
function NotificationsPanel({notifications,onClose,onMarkRead,onContactClick}){
  const [activeSection,setActiveSection]=useState("urgent");
  const unread=notifications.filter(n=>!n.read).length;
  const filtered=notifications.filter(n=>n.type===activeSection);
  return(
    <div style={{position:"absolute",right:0,top:8,width:320,background:C.bg,border:`1px solid ${C.grayLight}`,borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,0.12)",zIndex:50,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderBottom:`1px solid ${C.grayLight}`}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{fontSize:13,fontWeight:700,color:C.black}}>Notifications</span>
          {unread>0&&<span style={{fontSize:10,fontWeight:700,color:"#fff",background:C.red,padding:"1px 6px",borderRadius:10}}>{unread}</span>}
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.gray,lineHeight:1}}>×</button>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${C.grayLight}`}}>
        {NOTIF_SECTIONS.map(s=>{
          const cnt=notifications.filter(n=>n.type===s.key&&!n.read).length;
          return(
            <button key={s.key} onClick={()=>setActiveSection(s.key)} style={{flex:1,padding:"8px 2px",background:"none",border:"none",borderBottom:`2px solid ${activeSection===s.key?s.color:"transparent"}`,color:activeSection===s.key?s.color:C.gray,fontSize:9,fontWeight:activeSection===s.key?700:400,cursor:"pointer",fontFamily:"Inter,sans-serif",position:"relative"}}>
              {s.icon} {s.label}
              {cnt>0&&<span style={{position:"absolute",top:3,right:3,width:5,height:5,borderRadius:"50%",background:s.color}}/>}
            </button>
          );
        })}
      </div>
      <div style={{maxHeight:340,overflowY:"auto"}}>
        {filtered.length===0&&<div style={{padding:"18px",textAlign:"center",color:C.gray,fontSize:12}}>Aucune notification</div>}
        {filtered.map(n=>{
          const sec=NOTIF_SECTIONS.find(s=>s.key===n.type)||NOTIF_SECTIONS[0];
          return(
            <div key={n.id} style={{display:"flex",gap:10,padding:"10px 14px",background:n.read?C.bg:sec.bg,borderBottom:`1px solid ${C.grayLight}`,cursor:"pointer"}}
              onClick={()=>{onMarkRead(n.id);if(n.contactId)onContactClick(n.contactId);}}
              onMouseEnter={e=>e.currentTarget.style.background=C.bgSoft}
              onMouseLeave={e=>e.currentTarget.style.background=n.read?C.bg:sec.bg}
            >
              <div style={{width:28,height:28,borderRadius:"50%",background:sec.bg,border:`1px solid ${sec.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,color:sec.color}}>{sec.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,color:C.black,lineHeight:1.4,marginBottom:3}}>{n.message}</div>
                <div style={{display:"flex",gap:7,alignItems:"center"}}>
                  <span style={{fontSize:10,color:C.gray}}>{n.time}</span>
                  {n.due&&<span style={{fontSize:9,color:sec.color,background:sec.bg,padding:"1px 6px",borderRadius:8,fontWeight:500}}>{n.due}</span>}
                </div>
              </div>
              {!n.read&&<div style={{width:6,height:6,borderRadius:"50%",background:sec.color,flexShrink:0,marginTop:4}}/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── IMPORT TERMINAL ────────────────────────────────────────────────────────────
function ImportTerminal({onClose,onImport}){
  const [step,setStep]=useState("idle");
  const [log,setLog]=useState([]);
  const [parsed,setParsed]=useState([]);
  const fileRef=useRef(null);
  const addLog=(msg,type="info")=>setLog(prev=>[...prev,{msg,type,id:Date.now()+Math.random()}]);
  const parseCSV=(text)=>{const lines=text.split("\n").filter(l=>l.trim());const headers=lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/"/g,""));return lines.slice(1).map(line=>{const vals=line.split(",").map(v=>v.trim().replace(/"/g,""));const obj={};headers.forEach((h,i)=>obj[h]=vals[i]||"");return obj;}).filter(r=>r["first name"]||r["name"]||r["prénom"]);};
  const parseVCF=(text)=>{const cards=text.split("BEGIN:VCARD").slice(1);return cards.map(card=>{const fn=card.match(/FN:(.*)/)?.[1]?.trim()||"";const org=card.match(/ORG:(.*)/)?.[1]?.trim()||"";const title=card.match(/TITLE:(.*)/)?.[1]?.trim()||"";const tel=card.match(/TEL[^:]*:(.*)/)?.[1]?.trim()||"";const email=card.match(/EMAIL[^:]*:(.*)/)?.[1]?.trim()||"";const parts=fn.split(" ");return{first_name:parts[0]||"",last_name:parts.slice(1).join(" ")||"",company:org,role:title,phone:tel,email};}).filter(r=>r.first_name);};
  const handleFile=async(file)=>{
    if(!file)return;setStep("parsing");setLog([]);
    addLog(`📂 ${file.name} — ${(file.size/1024).toFixed(1)} KB`);
    const text=await file.text();
    const ext=file.name.split(".").pop().toLowerCase();
    let results=[];
    if(ext==="csv"){addLog("🔍 Format CSV...");results=parseCSV(text);}
    else if(ext==="vcf"||ext==="vcard"){addLog("🔍 Format vCard...");results=parseVCF(text);}
    else{addLog("❌ Format non supporté.","error");setStep("error");return;}
    await new Promise(r=>setTimeout(r,400));
    addLog(`✓ ${results.length} contacts détectés`,"success");
    results.slice(0,4).forEach(r=>addLog(`  · ${r.first_name} ${r.last_name}${r.company?` — ${r.company}`:""}`,  "muted"));
    if(results.length>4)addLog(`  · ... et ${results.length-4} autres`,"muted");
    addLog(`🚀 Prêt à créer ${results.length} cartes`,"success");
    setParsed(results);setStep("ready");
  };
  const handleImport=async()=>{
    setStep("importing");addLog("⚙️ Création des cartes...");
    for(let i=0;i<Math.min(parsed.length,4);i++){await new Promise(r=>setTimeout(r,180));addLog(`  ✓ ${parsed[i].first_name} ${parsed[i].last_name}`,"success");}
    if(parsed.length>4){await new Promise(r=>setTimeout(r,180));addLog(`  ✓ ... ${parsed.length-4} autres`,"success");}
    await new Promise(r=>setTimeout(r,200));addLog(`🎉 ${parsed.length} cartes créées !`,"success");
    setStep("done");onImport(parsed);
  };
  const logColor={info:C.black,muted:C.gray,success:C.green,error:C.red};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:20}}>
      <div style={{background:"#111",borderRadius:16,padding:20,width:"100%",maxWidth:420,border:"1px solid rgba(255,255,255,0.1)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:"monospace"}}>// Import Contacts</div><div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:2}}>CSV ou VCF (iCloud, Gmail, Outlook)</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:20,cursor:"pointer"}}>×</button>
        </div>
        <div style={{background:"#000",borderRadius:10,padding:12,minHeight:140,marginBottom:12,fontFamily:"monospace",fontSize:11}}>
          {log.length===0&&<div style={{color:"rgba(255,255,255,0.2)"}}>{">"} En attente d'un fichier...</div>}
          {log.map(l=>(<div key={l.id} style={{color:logColor[l.type]||C.gray,marginBottom:2}}>{l.msg}</div>))}
          {(step==="parsing"||step==="importing")&&<div style={{color:"rgba(255,255,255,0.3)"}}>▋</div>}
        </div>
        {(step==="idle"||step==="error")&&(
          <div onClick={()=>fileRef.current?.click()} style={{border:`2px dashed rgba(204,0,0,0.3)`,borderRadius:10,padding:"18px",textAlign:"center",cursor:"pointer",background:"rgba(204,0,0,0.04)"}}
            onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}}>
            <div style={{fontSize:22,marginBottom:6}}>📁</div>
            <div style={{fontSize:12,color:"#fff",fontWeight:600}}>Déposer votre fichier ici</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:3}}>.csv ou .vcf</div>
            <input ref={fileRef} type="file" accept=".csv,.vcf,.vcard" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
          </div>
        )}
        {step==="ready"&&(<div style={{display:"flex",gap:8}}>
          <button onClick={()=>{setStep("idle");setLog([]);setParsed([]);}} style={{flex:1,padding:"10px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"rgba(255,255,255,0.5)",fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Annuler</button>
          <button onClick={handleImport} style={{flex:2,padding:"10px",background:C.red,border:"none",borderRadius:10,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Importer {parsed.length} contacts →</button>
        </div>)}
        {step==="done"&&(<button onClick={onClose} style={{width:"100%",padding:"11px",background:C.green,border:"none",borderRadius:10,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>✓ Terminé — Voir les cartes</button>)}
        <div style={{marginTop:10,fontSize:9,color:"rgba(255,255,255,0.2)",textAlign:"center"}}>iPhone : Contacts → Sélectionner → Partager → .vcf</div>
      </div>
    </div>
  );
}

// ── CONTACT NETWORK CANVAS ────────────────────────────────────────────────────
function ContactNetwork({contact,contacts,onSelect,height=280}){
  const canvasRef=useRef(null);
  const animRef=useRef(null);
  const nodesRef=useRef([]);

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const dpr=window.devicePixelRatio||1;
    const W=canvas.offsetWidth,H=canvas.offsetHeight||height;
    canvas.width=W*dpr;canvas.height=H*dpr;
    const ctx=canvas.getContext("2d");ctx.scale(dpr,dpr);
    const cx=W/2,cy=H/2;
    const connectedContacts=contacts.filter(c=>contact.connections.includes(c.id));
    const related=(contact.related||[]).filter(r=>!connectedContacts.find(c=>c.id===r.id));
    const outerItems=[
      ...connectedContacts.map(c=>({id:c.id,label:c.initials,name:c.first_name,role:c.role,color:C.red,textColor:"#fff",known:true,contactObj:c,relLabel:"connexion"})),
      ...related.map(r=>({id:r.id,label:r.initials,name:r.name.split(" ")[0],role:r.role,color:r.known?C.red:C.grayLight,textColor:r.known?"#fff":C.gray,known:r.known,contactObj:null,relLabel:r.type})),
    ];
    const centerR=26,outerR=18;
    const dist=Math.min(W,H)*0.36;
    nodesRef.current=[
      {id:contact.id,x:cx,y:cy,r:centerR,label:contact.initials,name:contact.first_name,isCenter:true,color:C.red,textColor:"#fff"},
      ...outerItems.map((item,i)=>{
        const a=(i/Math.max(outerItems.length,1))*Math.PI*2-Math.PI/2;
        return{...item,x:cx+dist*Math.cos(a),y:cy+dist*Math.sin(a),r:outerR,isCenter:false};
      })
    ];
    const loop=()=>{
      ctx.clearRect(0,0,W,H);
      nodesRef.current.slice(1).forEach(n=>{
        ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(n.x,n.y);
        ctx.strokeStyle="rgba(0,0,0,0.07)";ctx.lineWidth=1;ctx.stroke();
        const mx=(cx*0.35+n.x*0.65),my=(cy*0.35+n.y*0.65);
        ctx.fillStyle="rgba(0,0,0,0.25)";ctx.font="8px Inter,sans-serif";ctx.textAlign="center";
        ctx.fillText(n.relLabel,mx,my);
      });
      nodesRef.current.forEach(n=>{
        if(n.isCenter){ctx.beginPath();ctx.arc(n.x,n.y,n.r+7,0,Math.PI*2);ctx.fillStyle=`${C.red}12`;ctx.fill();}
        ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
        ctx.fillStyle=n.isCenter?C.red:n.color;ctx.fill();
        if(!n.isCenter&&n.known){ctx.strokeStyle=C.red;ctx.lineWidth=1.5;ctx.stroke();}
        else if(!n.isCenter){ctx.strokeStyle=C.grayLight;ctx.lineWidth=1;ctx.stroke();}
        ctx.fillStyle=n.textColor||"#fff";
        ctx.font=`bold ${n.r*0.52}px Inter,sans-serif`;
        ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillText(n.label,n.x,n.y);
        ctx.fillStyle=C.gray;ctx.font=`9px Inter,sans-serif`;
        ctx.fillText(n.name,n.x,n.y+n.r+11);
      });
      animRef.current=requestAnimationFrame(loop);
    };
    loop();
    return()=>cancelAnimationFrame(animRef.current);
  },[contact,contacts,height]);

  const handleClick=useCallback((e)=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const rect=canvas.getBoundingClientRect();
    const dpr=window.devicePixelRatio||1;
    const scaleX=(canvas.width/dpr)/rect.width,scaleY=(canvas.height/dpr)/rect.height;
    const mx=(e.clientX-rect.left)*scaleX,my=(e.clientY-rect.top)*scaleY;
    const hit=nodesRef.current.find(n=>{if(n.isCenter)return false;const dx=n.x-mx,dy=n.y-my;return Math.sqrt(dx*dx+dy*dy)<n.r+10&&n.known&&n.contactObj;});
    if(hit)onSelect(hit.contactObj);
  },[onSelect]);

  return <canvas ref={canvasRef} onClick={handleClick} style={{width:"100%",height:`${height}px`,display:"block",cursor:"pointer"}}/>;
}

// ── GLOBAL NETWORK ────────────────────────────────────────────────────────────
// Seeded pseudo-random for stable positions across sessions
function seededRand(seed){let s=seed%2147483647;if(s<=0)s+=2147483646;s=s*16807%2147483647;return(s-1)/2147483646;}

function NetworkGraph({contacts,onSelect}){
  const canvasRef=useRef(null);
  const nodesRef=useRef([]);
  const animRef=useRef(null);
  const hovRef=useRef(null);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const W=canvas.offsetWidth,H=canvas.offsetHeight;
    canvas.width=W;canvas.height=H;
    const cx=W/2,cy=H/2,r=Math.min(W,H)*0.32;

    // Deterministic positions: angle from index, jitter from seeded random based on contact id
    nodesRef.current=contacts.map((c,i)=>{
      const a=(i/Math.max(contacts.length,1))*Math.PI*2-Math.PI/2;
      const seed=typeof c.id==="number"?c.id:c.id?.charCodeAt?.(0)||i+1;
      const jx=(seededRand(seed*3)-0.5)*28;
      const jy=(seededRand(seed*7+1)-0.5)*28;
      return{
        id:c.id,contact:c,
        x:cx+r*Math.cos(a)+jx,
        y:cy+r*Math.sin(a)+jy,
        vx:0,vy:0,
        r:c.utility_score>=9?26:c.utility_score>=7?21:17
      };
    });

    const getN=(id)=>nodesRef.current.find(n=>n.id===id);
    let frame=0;
    const loop=()=>{
      const ctx=canvas.getContext("2d");ctx.clearRect(0,0,W,H);
      // Run physics only for first 80 frames to settle, then freeze
      if(frame<80){
        const nodes=nodesRef.current;
        for(let i=0;i<nodes.length;i++){
          for(let j=i+1;j<nodes.length;j++){
            const dx=nodes[j].x-nodes[i].x,dy=nodes[j].y-nodes[i].y;
            const d=Math.sqrt(dx*dx+dy*dy)||1,f=2500/(d*d);
            nodes[i].vx-=f*dx/d;nodes[i].vy-=f*dy/d;
            nodes[j].vx+=f*dx/d;nodes[j].vy+=f*dy/d;
          }
          nodes[i].vx+=(cx-nodes[i].x)*0.004;
          nodes[i].vy+=(cy-nodes[i].y)*0.004;
        }
        contacts.forEach(c=>c.connections.forEach(cid=>{
          const a=getN(c.id),b=getN(cid);if(!a||!b)return;
          const dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)||1,f=(d-120)*0.02;
          a.vx+=f*dx/d;a.vy+=f*dy/d;b.vx-=f*dx/d;b.vy-=f*dy/d;
        }));
        nodes.forEach(n=>{
          n.vx*=0.85;n.vy*=0.85;
          n.x+=n.vx;n.y+=n.vy;
          n.x=Math.max(n.r+8,Math.min(W-n.r-8,n.x));
          n.y=Math.max(n.r+8,Math.min(H-n.r-8,n.y));
        });
        // After physics settles, snap positions so they don't drift on re-render
        if(frame===79) nodes.forEach(n=>{n.vx=0;n.vy=0;});
        frame++;
      }
      contacts.forEach(c=>{
        const a=getN(c.id);if(!a)return;
        c.connections.forEach(cid=>{
          const b=getN(cid);if(!b||cid<c.id)return;
          const hi=c.id===hovRef.current||cid===hovRef.current;
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
          ctx.strokeStyle=hi?"rgba(204,0,0,0.3)":"rgba(0,0,0,0.07)";
          ctx.lineWidth=hi?1.5:1;ctx.stroke();
        });
      });
      nodesRef.current.forEach(n=>{
        const hov=n.id===hovRef.current,score=healthScore(n.contact),hcol=healthColor(score);
        if(hov){ctx.beginPath();ctx.arc(n.x,n.y,n.r+8,0,Math.PI*2);ctx.fillStyle="rgba(204,0,0,0.07)";ctx.fill();}
        ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
        ctx.fillStyle="#fff";ctx.fill();
        ctx.strokeStyle=hov?C.red:"rgba(0,0,0,0.1)";ctx.lineWidth=hov?1.5:1;ctx.stroke();
        ctx.fillStyle=C.black;ctx.font=`bold ${n.r*0.55}px Inter,sans-serif`;
        ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillText(n.contact.initials,n.x,n.y);
        ctx.beginPath();ctx.arc(n.x+n.r*0.65,n.y-n.r*0.65,4,0,Math.PI*2);ctx.fillStyle=hcol;ctx.fill();
        if(hov){ctx.fillStyle=C.black;ctx.font=`500 10px Inter,sans-serif`;ctx.fillText(n.contact.first_name,n.x,n.y+n.r+13);}
      });
      animRef.current=requestAnimationFrame(loop);
    };
    loop();
    return()=>cancelAnimationFrame(animRef.current);
  },[contacts]);
  const onMove=useCallback((e)=>{const rect=canvasRef.current.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top,hit=nodesRef.current.find(n=>{const dx=n.x-mx,dy=n.y-my;return Math.sqrt(dx*dx+dy*dy)<n.r+4;});hovRef.current=hit?hit.id:null;canvasRef.current.style.cursor=hit?"pointer":"default";},[]);
  const onClick=useCallback((e)=>{const rect=canvasRef.current.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top,hit=nodesRef.current.find(n=>{const dx=n.x-mx,dy=n.y-my;return Math.sqrt(dx*dx+dy*dy)<n.r+4;});if(hit)onSelect(hit.contact);},[onSelect]);
  return <canvas ref={canvasRef} onMouseMove={onMove} onClick={onClick} style={{width:"100%",height:"100%",display:"block"}}/>;
}

// ── SCORE RING ─────────────────────────────────────────────────────────────────
function Ring({value,max=10,color,size=44,label}){
  const r=(size-6)/2,circ=2*Math.PI*r,fill=(value/max)*circ;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.grayLight} strokeWidth={3}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3} strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"/>
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fill={C.black} fontSize={size*0.28} fontWeight={700} style={{transform:`rotate(90deg)`,transformOrigin:`${size/2}px ${size/2}px`}}>{value}</text>
      </svg>
      <span style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"center",maxWidth:50}}>{label}</span>
    </div>
  );
}

// ── CONTACT CARD CONTENT ──────────────────────────────────────────────────────
function ContactCardContent({contact:c,contacts,onSelect,isMobile}){
  const [tab,setTab]=useState("brief");
  const score=healthScore(c),hcol=healthColor(score);
  const state=STATE_CONFIG[c.emotional_state]||{label:"–",color:C.gray};
  const lever=LEVER_CONFIG[c.primary_lever]||{icon:"·",desc:"–"};
  const shouldMeet=contacts.filter(other=>{
    if(other.id===c.id||c.connections.includes(other.id))return false;
    return other.sector===c.sector||(other.hobbies||[]).some(h=>(c.hobbies||[]).includes(h));
  });
  const Tag=({children})=>(<span style={{display:"inline-flex",padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:500,background:`${C.red}12`,color:C.red,margin:2}}>{children}</span>);

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Header */}
      <div style={{padding:"14px 16px 0",borderBottom:`1px solid ${C.grayLight}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <div style={{width:44,height:44,borderRadius:"50%",background:C.red,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"#fff",flexShrink:0}}>{c.initials}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:16,fontWeight:800,color:C.black}}>{c.first_name} {c.last_name}</div>
            <div style={{fontSize:11,color:C.red}}>{c.role} · {c.company}</div>
            <div style={{fontSize:10,color:C.gray}}>{c.location_city} · {c.last_interaction}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{flex:1,height:3,background:C.grayLight,borderRadius:2}}><div style={{width:`${score}%`,height:"100%",background:hcol,borderRadius:2}}/></div>
          <span style={{fontSize:10,color:hcol,fontWeight:700}}>Santé {score}</span>
        </div>
        <div style={{display:"flex",margin:"0 -16px",overflowX:"auto"}}>
          {["brief","psyché","relation","réseau","historique"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"8px 2px",background:"none",border:"none",borderBottom:`2px solid ${tab===t?C.red:"transparent"}`,color:tab===t?C.red:C.gray,fontSize:10,fontWeight:tab===t?600:400,cursor:"pointer",textTransform:"capitalize",fontFamily:"Inter,sans-serif",whiteSpace:"nowrap",minWidth:52}}>{t}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{flex:1,padding:"12px 16px",overflowY:"auto"}}>
        {tab==="brief"&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:C.redSoft,borderRadius:10,padding:"10px 12px",borderLeft:`3px solid ${C.red}`}}>
            <div style={{fontSize:9,color:C.red,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4,fontWeight:600}}>Levier principal</div>
            <div style={{display:"flex",gap:7,alignItems:"center"}}><span style={{fontSize:16}}>{lever.icon}</span><div><div style={{fontSize:12,fontWeight:700,color:C.red,textTransform:"capitalize"}}>{c.primary_lever}</div><div style={{fontSize:10,color:C.gray,marginTop:1}}>{lever.desc}</div></div></div>
          </div>
          <div style={{background:"#F7F7F7",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Points de discussion</div>
            {c.discussion_points.map((p,i)=>(<div key={i} style={{display:"flex",gap:6,fontSize:12,color:C.blackSoft,marginBottom:4,lineHeight:1.4}}><span style={{color:C.red,flexShrink:0}}>·</span>{p}</div>))}
          </div>
          <div><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5,fontWeight:600}}>À éviter</div>{c.topics_to_avoid.map((t,i)=>(<div key={i} style={{display:"flex",gap:6,fontSize:12,color:"#999",marginBottom:3}}><span style={{color:C.red}}>✕</span>{t}</div>))}</div>
          <div><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5,fontWeight:600}}>Intérêts</div><div>{c.hobbies.map(h=><Tag key={h}>{h}</Tag>)}</div></div>
          <div style={{background:"#F7F7F7",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4,fontWeight:600}}>Note</div><div style={{fontSize:12,color:C.blackSoft,lineHeight:1.6}}>{c.notes}</div></div>
        </div>)}

        {tab==="psyché"&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{background:"#F7F7F7",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>État</div><div style={{fontSize:12,fontWeight:700,color:state.color}}>{state.label}</div></div>
            <div style={{background:"#F7F7F7",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>Ego dominant</div><div style={{fontSize:12,fontWeight:700,color:C.red}}>{c.emotional_state==="expansion"?"Être perçu":"Faire"}</div></div>
          </div>
          {[["Désir actuel",c.current_desire,false],["Ligne rouge",c.red_lines,true]].map(([l,v,d],i)=>(
            <div key={i} style={{background:d?`${C.red}08`:"#F7F7F7",border:d?`1px solid ${C.redMid}`:"none",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:9,color:d?C.red:C.gray,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3,fontWeight:600}}>{l}</div><div style={{fontSize:12,color:d?C.red:C.blackSoft,lineHeight:1.5}}>{v}</div></div>
          ))}
        </div>)}

        {tab==="relation"&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{textAlign:"center",padding:"4px 0 8px"}}><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>Santé globale</div><div style={{fontSize:38,fontWeight:800,color:hcol,letterSpacing:"-0.04em"}}>{score}</div></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}><Ring value={c.sentiment_score} color={C.blue} label="Sentiment"/><Ring value={c.reliability_score} color={C.green} label="Fiabilité"/><Ring value={c.utility_score} color={C.amber} label="Utilité"/><Ring value={c.influence_score} color="#6A0DAD" label="Influence"/></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}><Ring value={c.reciprocity_score} color={C.red} label="Réciprocité"/><Ring value={c.momentum_score} color={C.blue} label="Momentum"/><Ring value={c.potential_score} color={C.green} label="Potentiel"/><Ring value={Math.max(0,c.relational_debt+5)} max={10} color={c.relational_debt<0?C.red:C.green} label="Dette"/></div>
          {c.reminders.length>0&&(<div><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Rappels</div>{c.reminders.map((r,i)=>(<div key={i} style={{display:"flex",gap:8,background:r.urgent?`${C.red}08`:"#F7F7F7",border:`1px solid ${r.urgent?C.redMid:C.grayLight}`,borderRadius:8,padding:"8px 10px",marginBottom:4}}><div style={{width:5,height:5,borderRadius:"50%",background:r.urgent?C.red:C.amber,flexShrink:0,marginTop:4}}/><div><div style={{fontSize:11,color:C.black}}>{r.message}</div><div style={{fontSize:9,color:C.gray,marginTop:1}}>{r.due}</div></div></div>))}</div>)}
        </div>)}

        {tab==="réseau"&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {/* On mobile the network shows ABOVE this section, so just show lists here */}
          <div><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Relations directes</div>
            {c.related.map((r,i)=>(<div key={i} onClick={()=>r.known&&onSelect(contacts.find(x=>x.id===r.id))} style={{display:"flex",alignItems:"center",gap:8,background:"#F7F7F7",borderRadius:8,padding:"8px 10px",marginBottom:4,cursor:r.known?"pointer":"default",border:`1px solid ${C.grayLight}`}}><div style={{width:28,height:28,borderRadius:"50%",background:r.known?C.red:C.grayLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:r.known?"#fff":C.gray,flexShrink:0}}>{r.initials}</div><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:C.black}}>{r.name}</div><div style={{fontSize:10,color:C.gray}}>{r.role}</div></div><span style={{fontSize:9,padding:"2px 7px",borderRadius:10,background:r.known?`${C.red}12`:`${C.gray}12`,color:r.known?C.red:C.gray}}>{r.type}</span>{r.known&&<span style={{fontSize:11,color:C.gray}}>→</span>}</div>))}
            {c.related.length===0&&<div style={{fontSize:12,color:C.gray,textAlign:"center",padding:"10px 0"}}>Aucune relation enregistrée</div>}
          </div>
          <div><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Connexions dans ta base</div>
            {contacts.filter(x=>c.connections.includes(x.id)).map((r,i)=>(<div key={i} onClick={()=>onSelect(r)} style={{display:"flex",alignItems:"center",gap:8,background:"#F7F7F7",borderRadius:8,padding:"8px 10px",marginBottom:4,cursor:"pointer",border:`1px solid ${C.grayLight}`}}><div style={{width:28,height:28,borderRadius:"50%",background:C.red,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>{r.initials}</div><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:C.black}}>{r.first_name} {r.last_name}</div><div style={{fontSize:10,color:C.gray}}>{r.role}</div></div><span style={{fontSize:11,color:C.gray}}>→</span></div>))}
          </div>
          {shouldMeet.length>0&&(<div>
            <div style={{fontSize:9,color:C.green,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:700}}>✦ Devrait rencontrer</div>
            {shouldMeet.map((r,i)=>{const sh=(r.hobbies||[]).filter(h=>(c.hobbies||[]).includes(h));const reason=r.sector===c.sector?`Même secteur`:sh.length>0?`Intérêts communs: ${sh.join(", ")}`:"Profil complémentaire";return(<div key={i} onClick={()=>onSelect(r)} style={{display:"flex",alignItems:"center",gap:8,background:"#F0FFF6",borderRadius:8,padding:"8px 10px",marginBottom:4,cursor:"pointer",border:"1px solid rgba(26,122,74,0.15)"}}><div style={{width:28,height:28,borderRadius:"50%",background:C.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>{r.initials}</div><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:C.black}}>{r.first_name} {r.last_name}</div><div style={{fontSize:10,color:C.green}}>{reason}</div></div><span style={{fontSize:9,padding:"2px 7px",borderRadius:10,background:"rgba(26,122,74,0.12)",color:C.green}}>Introduire</span></div>);})}
          </div>)}
        </div>)}

        {tab==="historique"&&(<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {c.interactions.map((inter,i)=>(<div key={i} style={{borderLeft:`2px solid ${C.red}40`,paddingLeft:10,marginBottom:4}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:10,fontWeight:600,color:C.red,background:`${C.red}12`,padding:"2px 7px",borderRadius:10}}>{inter.type}</span><span style={{fontSize:10,color:C.gray}}>{inter.date}</span></div>
            <div style={{fontSize:12,color:C.black,lineHeight:1.5,marginBottom:inter.follow_up?6:0}}>{inter.summary}</div>
            {inter.follow_up&&(<div style={{display:"flex",gap:5,background:`${C.amber}10`,borderRadius:6,padding:"5px 8px"}}><span style={{color:C.amber,fontSize:11}}>→</span><div style={{fontSize:11,color:C.amber}}>{inter.follow_up}</div></div>)}
          </div>))}
        </div>)}
      </div>

      {/* Actions */}
      <div style={{padding:"10px 16px",borderTop:`1px solid ${C.grayLight}`,display:"flex",gap:8,flexShrink:0}}>
        <button style={{flex:2,padding:"10px",background:C.red,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Contacter</button>
        <button style={{flex:1,padding:"10px",background:"#F7F7F7",border:`1px solid ${C.grayLight}`,borderRadius:10,color:C.black,fontSize:13,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Modifier</button>
      </div>
    </div>
  );
}

// ── HEX FAB BUTTON ────────────────────────────────────────────────────────────
function HexFAB({onClick}){
  const [hovered,setHovered]=useState(false);
  // Hexagon via clip-path
  return(
    <button
      onClick={onClick}
      onMouseEnter={()=>setHovered(true)}
      onMouseLeave={()=>setHovered(false)}
      style={{
        position:"fixed",
        bottom:24,
        right:20,
        width:56,
        height:56,
        background:hovered?C.redLight:C.red,
        border:"none",
        cursor:"pointer",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        clipPath:"polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
        boxShadow:"0 4px 20px rgba(204,0,0,0.4)",
        transition:"background 0.15s, transform 0.15s, box-shadow 0.15s",
        transform:hovered?"scale(1.08)":"scale(1)",
        zIndex:30,
        WebkitTapHighlightColor:"transparent",
      }}
      aria-label="Ajouter un contact"
    >
      <span style={{fontSize:26,color:"#fff",lineHeight:1,fontWeight:300}}>+</span>
    </button>
  );
}

// ── ADD CONTACT MODAL ──────────────────────────────────────────────────────────
const SECTORS=["Finance","Tourisme","Tech","Associatif","Banking","Legal","Santé","Éducation","Autre"];
const LEVERS=["statut","réciprocité","appartenance","intérêt","cohérence"];
const STATES=["expansion","stable","stress","transition"];
const EGOS=["faire","avoir","être perçu"];

function AddContactModal({onClose,onSave}){
  const [step,setStep]=useState(1); // 3 steps
  const [form,setForm]=useState({
    first_name:"",last_name:"",role:"",company:"",sector:"",
    location_city:"",phone:"",email:"",linkedin:"",
    hobbies:"",discussion_points:"",topics_to_avoid:"",notes:"",
    primary_lever:"",emotional_state:"",ego_type:"",
    current_desire:"",red_lines:"",
    utility_score:5,sentiment_score:5,reliability_score:5,
    known_personally:true,
  });

  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const isStep1Valid=form.first_name.trim()&&form.last_name.trim();
  const isStep2Valid=true; // optional fields
  const isStep3Valid=true;

  const handleSave=()=>{
    const contact={
      ...form,
      id:Date.now(),
      initials:(form.first_name[0]||"")+(form.last_name[0]||""),
      hobbies:form.hobbies.split(",").map(h=>h.trim()).filter(Boolean),
      discussion_points:form.discussion_points.split("\n").map(h=>h.trim()).filter(Boolean),
      topics_to_avoid:form.topics_to_avoid.split("\n").map(h=>h.trim()).filter(Boolean),
      connections:[],related:[],interactions:[],reminders:[],tags:[],
      last_interaction:"Aujourd'hui",
      utility_score:Number(form.utility_score),
      sentiment_score:Number(form.sentiment_score),
      reliability_score:Number(form.reliability_score),
      influence_score:5,reciprocity_score:5,momentum_score:5,potential_score:5,relational_debt:0,
    };
    onSave(contact);
    onClose();
  };

  const inp={
    width:"100%",padding:"10px 12px",
    background:"#F7F7F7",border:`1px solid ${C.grayLight}`,
    borderRadius:8,color:C.black,fontSize:13,
    fontFamily:"Inter,sans-serif",outline:"none",
    transition:"border-color 0.15s",
  };
  const label={fontSize:10,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:5,fontWeight:600};
  const field=(l,k,type="text",ph="")=>(
    <div style={{marginBottom:12}}>
      <label style={label}>{l}</label>
      <input type={type} value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph} style={inp}
        onFocus={e=>e.target.style.borderColor=C.red} onBlur={e=>e.target.style.borderColor=C.grayLight}/>
    </div>
  );
  const textarea=(l,k,ph="",rows=3)=>(
    <div style={{marginBottom:12}}>
      <label style={label}>{l}</label>
      <textarea value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph} rows={rows}
        style={{...inp,resize:"vertical"}}
        onFocus={e=>e.target.style.borderColor=C.red} onBlur={e=>e.target.style.borderColor=C.grayLight}/>
    </div>
  );
  const select=(l,k,options)=>(
    <div style={{marginBottom:12}}>
      <label style={label}>{l}</label>
      <select value={form[k]} onChange={e=>set(k,e.target.value)} style={{...inp,appearance:"none",cursor:"pointer"}}>
        <option value="">— Sélectionner —</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
  const chips=(l,k,options)=>(
    <div style={{marginBottom:12}}>
      <label style={label}>{l}</label>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {options.map(o=>(
          <button key={o} onClick={()=>set(k,o)} style={{
            padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif",
            background:form[k]===o?C.red:"#F7F7F7",
            color:form[k]===o?"#fff":C.black,
            border:`1px solid ${form[k]===o?C.red:C.grayLight}`,
            transition:"all 0.15s",
          }}>{o}</button>
        ))}
      </div>
    </div>
  );
  const scoreSlider=(l,k)=>(
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
        <label style={{...label,marginBottom:0}}>{l}</label>
        <span style={{fontSize:13,fontWeight:700,color:healthColor(form[k]*10)}}>{form[k]}</span>
      </div>
      <input type="range" min={0} max={10} value={form[k]} onChange={e=>set(k,Number(e.target.value))}
        style={{width:"100%",accentColor:C.red,cursor:"pointer"}}/>
    </div>
  );

  const stepTitles=["Identité","Psyché & Contexte","Métriques personnelles"];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100,backdropFilter:"blur(2px)"}}>
      <div style={{
        background:C.bg,borderRadius:"20px 20px 0 0",
        width:"100%",maxWidth:520,
        maxHeight:"90vh",display:"flex",flexDirection:"column",
        boxShadow:"0 -8px 40px rgba(0,0,0,0.15)",
        animation:"slideUp 0.3s cubic-bezier(0.34,1.1,0.64,1)",
      }}>
        <style>{`@keyframes slideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* Header */}
        <div style={{padding:"20px 20px 0",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <div style={{fontSize:17,fontWeight:800,color:C.black}}>Nouveau contact</div>
              <div style={{fontSize:11,color:C.gray,marginTop:2}}>{stepTitles[step-1]} — étape {step}/3</div>
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.gray,lineHeight:1,padding:4}}>×</button>
          </div>
          {/* Progress */}
          <div style={{display:"flex",gap:4,marginBottom:20}}>
            {[1,2,3].map(s=>(
              <div key={s} style={{flex:1,height:3,borderRadius:2,background:s<=step?C.red:C.grayLight,transition:"background 0.3s ease"}}/>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"0 20px"}}>

          {step===1&&(
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
                <div style={{paddingRight:6}}>{field("Prénom *","first_name","text","Arjun")}</div>
                <div style={{paddingLeft:6}}>{field("Nom *","last_name","text","Mehta")}</div>
              </div>
              {field("Poste","role","text","CEO")}
              {field("Entreprise","company","text","Nexus Capital")}
              {select("Secteur","sector",SECTORS)}
              {field("Ville","location_city","text","Grand Baie")}
              {field("Téléphone","phone","tel","+230 5xxx xxxx")}
              {field("Email","email","email","arjun@nexus.mu")}
              {field("LinkedIn","linkedin","text","linkedin.com/in/...")}
              <div style={{marginBottom:12}}>
                <label style={label}>Connu personnellement</label>
                <div style={{display:"flex",gap:8}}>
                  {[true,false].map(v=>(
                    <button key={String(v)} onClick={()=>set("known_personally",v)} style={{flex:1,padding:"9px",borderRadius:8,cursor:"pointer",fontFamily:"Inter,sans-serif",fontSize:12,fontWeight:500,border:`1px solid ${form.known_personally===v?C.red:C.grayLight}`,background:form.known_personally===v?C.redSoft:C.bgSoft,color:form.known_personally===v?C.red:C.gray,transition:"all 0.15s"}}>
                      {v?"Oui":"Non — contact indirect"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step===2&&(
            <>
              {chips("État émotionnel","emotional_state",STATES)}
              {chips("Ego dominant","ego_type",EGOS)}
              {chips("Levier principal","primary_lever",LEVERS)}
              {field("Désir actuel","current_desire","text","Ce qu'il cherche en ce moment...")}
              {field("Ligne rouge","red_lines","text","Ce qu'il ne faut jamais faire ou dire...")}
              {textarea("Points de discussion","discussion_points","Un point par ligne...",3)}
              {textarea("Sujets à éviter","topics_to_avoid","Un sujet par ligne...",2)}
              {field("Hobbies & Intérêts","hobbies","text","Golf, Voile, Gastronomie (séparés par virgule)")}
              {textarea("Notes personnelles","notes","Contexte de la rencontre, observations...",3)}
            </>
          )}

          {step===3&&(
            <>
              <div style={{background:C.redSoft,borderRadius:12,padding:"12px 14px",marginBottom:16,borderLeft:`3px solid ${C.red}`}}>
                <div style={{fontSize:11,color:C.red,fontWeight:600,marginBottom:4}}>Métriques subjectives</div>
                <div style={{fontSize:11,color:C.gray,lineHeight:1.5}}>Ces scores sont privés et ne s'affichent que si le contact est connu personnellement. Ils alimentent le score de santé de la relation.</div>
              </div>
              {scoreSlider("Utilité — Pertinence pour mes objectifs","utility_score")}
              {scoreSlider("Sentiment — Mon appréciation personnelle","sentiment_score")}
              {scoreSlider("Fiabilité — Niveau de confiance","reliability_score")}

              {/* Preview card */}
              <div style={{background:"#F7F7F7",borderRadius:12,padding:"14px",marginBottom:16}}>
                <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10,fontWeight:600}}>Aperçu de la carte</div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:C.red,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff",flexShrink:0}}>
                    {(form.first_name[0]||"?")}{ (form.last_name[0]||"")}
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:C.black}}>{form.first_name||"Prénom"} {form.last_name||"Nom"}</div>
                    <div style={{fontSize:11,color:C.red}}>{form.role||"Poste"} · {form.company||"Entreprise"}</div>
                    <div style={{fontSize:10,color:C.gray}}>{form.location_city||"Ville"}</div>
                  </div>
                </div>
                {form.primary_lever&&<div style={{fontSize:11,color:C.red}}>Levier : {LEVER_CONFIG[form.primary_lever]?.icon} {form.primary_lever}</div>}
              </div>
            </>
          )}
          <div style={{height:16}}/>
        </div>

        {/* Footer */}
        <div style={{padding:"12px 20px 28px",borderTop:`1px solid ${C.grayLight}`,display:"flex",gap:8,flexShrink:0}}>
          {step>1&&(
            <button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"12px",background:"#F7F7F7",border:`1px solid ${C.grayLight}`,borderRadius:12,color:C.black,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>← Retour</button>
          )}
          {step<3?(
            <button onClick={()=>isStep1Valid&&setStep(s=>s+1)} style={{flex:2,padding:"12px",background:isStep1Valid||step>1?C.red:"rgba(204,0,0,0.3)",border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:700,cursor:isStep1Valid||step>1?"pointer":"not-allowed",fontFamily:"Inter,sans-serif",transition:"background 0.15s"}}>
              Continuer →
            </button>
          ):(
            <button onClick={handleSave} style={{flex:2,padding:"12px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
              ✓ Créer la carte
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── LOGIN ──────────────────────────────────────────────────────────────────────
const SECRET=["bottom","bottom","top","middle","middle","middle"];
function Login({onUnlock}){
  const [splash,setSplash]=useState(true);
  const [game,setGame]=useState(false);
  const [seq,setSeq]=useState([]);
  const [shake,setShake]=useState(false);
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const pressDot=(which)=>{const next=[...seq,which];const ok=SECRET.slice(0,next.length).every((s,i)=>s===next[i]);if(!ok){setSeq([]);return;}setSeq(next);if(next.length===SECRET.length)setTimeout(onUnlock,250);};
  const tryLogin=(e)=>{e.preventDefault();setShake(true);setTimeout(()=>{setShake(false);setGame(true);},450);};
  if(splash)return <Splash onDone={()=>setSplash(false)}/>;
  if(game)return <SnakeGame onExit={()=>setGame(false)}/>;
  const inp={width:"100%",padding:"11px 14px",background:"#F7F7F7",border:`1px solid ${C.grayLight}`,borderRadius:8,color:C.black,fontSize:13,fontFamily:"Inter,sans-serif",outline:"none"};
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Inter,-apple-system,sans-serif",padding:20}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box;}input:focus{border-color:#CC0000!important;}input::placeholder{color:#BBB;}@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{display:"flex",alignItems:"center",gap:40,animation:"fadeUp 0.5s ease",width:"100%",maxWidth:520,justifyContent:"center"}}>
        <div style={{width:320,animation:shake?"shake 0.4s ease":"none"}}>
          <div style={{textAlign:"center",marginBottom:28}}><Logo size={64}/><div style={{fontSize:28,fontWeight:900,color:C.black,marginTop:12,letterSpacing:"-0.01em",textTransform:"uppercase"}}>ANANSI <span style={{color:C.red}}>I:R.</span></div></div>
          <div style={{background:C.bg,border:`1px solid ${C.grayLight}`,borderRadius:16,padding:"28px 24px",boxShadow:"0 2px 20px rgba(0,0,0,0.06)"}}>
            <div style={{marginBottom:14}}><label style={{fontSize:10,color:C.gray,letterSpacing:"0.08em",textTransform:"uppercase",display:"block",marginBottom:5}}>Identifiant</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.com" style={inp}/></div>
            <div style={{marginBottom:20}}><label style={{fontSize:10,color:C.gray,letterSpacing:"0.08em",textTransform:"uppercase",display:"block",marginBottom:5}}>Mot de passe</label><input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" style={inp}/></div>
            <button onClick={tryLogin} style={{width:"100%",padding:"12px",background:C.red,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}
              onMouseEnter={e=>e.target.style.background=C.redLight} onMouseLeave={e=>e.target.style.background=C.red}>Connexion</button>
          </div>
          {seq.length>0&&<div style={{height:1,background:C.grayLight,borderRadius:1,marginTop:14,overflow:"hidden"}}><div style={{height:"100%",width:`${(seq.length/SECRET.length)*100}%`,background:C.red,transition:"width 0.2s ease"}}/></div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,paddingTop:60}}>
          {["top","middle","bottom"].map(which=>(
            <button key={which} onClick={()=>pressDot(which)} style={{width:20,height:20,borderRadius:"50%",border:"none",cursor:"pointer",padding:0,background:seq.includes(which)?C.red:C.grayLight,transition:"all 0.2s ease",transform:seq.includes(which)?"scale(1.3)":"scale(1)",WebkitTapHighlightColor:"transparent"}}/>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────────
function Dashboard({contacts:baseContacts,onSelect,selected,onDeselect,onSaveContact,onRefresh}){
  const [view,setView]=useState("graph");
  const [search,setSearch]=useState("");
  const [notifications,setNotifications]=useState(MOCK_NOTIFICATIONS);
  const [showNotifs,setShowNotifs]=useState(false);
  const [showImport,setShowImport]=useState(false);
  const [showAddContact,setShowAddContact]=useState(false);
  const [filters,setFilters]=useState({sector:[],emotional_state:[],primary_lever:[],ego_type:[],known_personally:null});
  const windowWidth=useWindowWidth();
  const isMobile=windowWidth<768;

  const contacts=baseContacts;

  // Build filter options from actual contacts
  const opts={
    sector:[...new Set(contacts.map(c=>c.sector).filter(Boolean))],
    emotional_state:[...new Set(contacts.map(c=>c.emotional_state).filter(Boolean))],
    primary_lever:[...new Set(contacts.map(c=>c.primary_lever).filter(Boolean))],
    ego_type:[...new Set(contacts.map(c=>c.ego_type).filter(Boolean))],
  };

  const toggleFilter=(cat,val)=>setFilters(f=>{
    const cur=f[cat];
    return{...f,[cat]:cur.includes(val)?cur.filter(x=>x!==val):[...cur,val]};
  });
  const activeFilterCount=filters.sector.length+filters.emotional_state.length+filters.primary_lever.length+filters.ego_type.length+(filters.known_personally!==null?1:0);
  const clearFilters=()=>setFilters({sector:[],emotional_state:[],primary_lever:[],ego_type:[],known_personally:null});

  const filtered=contacts.filter(c=>{
    const textMatch=`${c.first_name} ${c.last_name} ${c.company} ${c.sector}`.toLowerCase().includes(search.toLowerCase());
    const sectorMatch=filters.sector.length===0||filters.sector.includes(c.sector);
    const stateMatch=filters.emotional_state.length===0||filters.emotional_state.includes(c.emotional_state);
    const leverMatch=filters.primary_lever.length===0||filters.primary_lever.includes(c.primary_lever);
    const egoMatch=filters.ego_type.length===0||filters.ego_type.includes(c.ego_type);
    const knownMatch=filters.known_personally===null||c.known_personally===filters.known_personally;
    return textMatch&&sectorMatch&&stateMatch&&leverMatch&&egoMatch&&knownMatch;
  });

  const unread=notifications.filter(n=>!n.read).length;
  const markRead=(id)=>setNotifications(prev=>prev.map(n=>n.id===id?{...n,read:true}:n));
  const handleNotifContact=(cid)=>{const c=contacts.find(x=>x.id===cid);if(c){onSelect(c);setShowNotifs(false);}};
  const handleSaveContact=(c)=>onSaveContact(c);

  // STATE & LEVER label maps
  const stateLabel={expansion:"En expansion",stable:"Stable",stress:"Sous stress",transition:"En transition"};
  const leverLabel={statut:"Statut",réciprocité:"Réciprocité",appartenance:"Appartenance",intérêt:"Intérêt",cohérence:"Cohérence"};
  const stateColor={expansion:C.green,stable:C.blue,stress:C.red,transition:C.amber};
  const leverColor={statut:C.amber,réciprocité:C.blue,appartenance:"#6A0DAD",intérêt:C.green,cohérence:C.black};

  // Filter sidebar component (inline)
  const FilterSidebar=()=>(
    <div style={{width:isMobile?"100%":180,flexShrink:0,borderRight:isMobile?"none":`1px solid ${C.grayLight}`,background:"#FAFAFA",overflowY:"auto",padding:"12px 10px",display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:10,fontWeight:700,color:C.black,textTransform:"uppercase",letterSpacing:"0.08em"}}>Filtres {activeFilterCount>0&&<span style={{background:C.red,color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:9,marginLeft:4}}>{activeFilterCount}</span>}</span>
        {activeFilterCount>0&&<button onClick={clearFilters} style={{fontSize:10,color:C.red,background:"none",border:"none",cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:600}}>Effacer</button>}
      </div>

      {/* Known personally */}
      <div>
        <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Relation</div>
        {[{label:"Connu personnellement",val:true},{label:"Contact indirect",val:false}].map(({label,val})=>(
          <button key={String(val)} onClick={()=>setFilters(f=>({...f,known_personally:f.known_personally===val?null:val}))} style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"5px 7px",borderRadius:7,background:filters.known_personally===val?`${C.red}12`:"transparent",border:"none",cursor:"pointer",marginBottom:3,textAlign:"left",fontFamily:"Inter,sans-serif"}}>
            <div style={{width:12,height:12,borderRadius:3,border:`1.5px solid ${filters.known_personally===val?C.red:C.grayLight}`,background:filters.known_personally===val?C.red:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {filters.known_personally===val&&<span style={{color:"#fff",fontSize:8,lineHeight:1}}>✓</span>}
            </div>
            <span style={{fontSize:11,color:filters.known_personally===val?C.red:C.black}}>{label}</span>
          </button>
        ))}
      </div>

      {/* Sector */}
      {opts.sector.length>0&&(
        <div>
          <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Secteur</div>
          {opts.sector.map(v=>{const active=filters.sector.includes(v);return(
            <button key={v} onClick={()=>toggleFilter("sector",v)} style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"5px 7px",borderRadius:7,background:active?`${C.red}12`:"transparent",border:"none",cursor:"pointer",marginBottom:3,textAlign:"left",fontFamily:"Inter,sans-serif"}}>
              <div style={{width:12,height:12,borderRadius:3,border:`1.5px solid ${active?C.red:C.grayLight}`,background:active?C.red:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {active&&<span style={{color:"#fff",fontSize:8,lineHeight:1}}>✓</span>}
              </div>
              <span style={{fontSize:11,color:active?C.red:C.black}}>{v}</span>
              <span style={{fontSize:9,color:C.gray,marginLeft:"auto"}}>{contacts.filter(c=>c.sector===v).length}</span>
            </button>
          );})}
        </div>
      )}

      {/* Emotional state */}
      {opts.emotional_state.length>0&&(
        <div>
          <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>État</div>
          {opts.emotional_state.map(v=>{const active=filters.emotional_state.includes(v);const col=stateColor[v]||C.gray;return(
            <button key={v} onClick={()=>toggleFilter("emotional_state",v)} style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"5px 7px",borderRadius:7,background:active?`${col}15`:"transparent",border:"none",cursor:"pointer",marginBottom:3,textAlign:"left",fontFamily:"Inter,sans-serif"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:col,flexShrink:0}}/>
              <span style={{fontSize:11,color:active?col:C.black}}>{stateLabel[v]||v}</span>
              <span style={{fontSize:9,color:C.gray,marginLeft:"auto"}}>{contacts.filter(c=>c.emotional_state===v).length}</span>
            </button>
          );})}
        </div>
      )}

      {/* Primary lever */}
      {opts.primary_lever.length>0&&(
        <div>
          <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Levier</div>
          {opts.primary_lever.map(v=>{const active=filters.primary_lever.includes(v);const col=leverColor[v]||C.gray;return(
            <button key={v} onClick={()=>toggleFilter("primary_lever",v)} style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"5px 7px",borderRadius:7,background:active?`${col}15`:"transparent",border:"none",cursor:"pointer",marginBottom:3,textAlign:"left",fontFamily:"Inter,sans-serif"}}>
              <span style={{fontSize:12,flexShrink:0}}>{LEVER_CONFIG[v]?.icon||"·"}</span>
              <span style={{fontSize:11,color:active?col:C.black}}>{leverLabel[v]||v}</span>
              <span style={{fontSize:9,color:C.gray,marginLeft:"auto"}}>{contacts.filter(c=>c.primary_lever===v).length}</span>
            </button>
          );})}
        </div>
      )}

      {/* Ego type */}
      {opts.ego_type.length>0&&(
        <div>
          <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Ego</div>
          {opts.ego_type.map(v=>{const active=filters.ego_type.includes(v);return(
            <button key={v} onClick={()=>toggleFilter("ego_type",v)} style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"5px 7px",borderRadius:7,background:active?`${C.red}12`:"transparent",border:"none",cursor:"pointer",marginBottom:3,textAlign:"left",fontFamily:"Inter,sans-serif"}}>
              <div style={{width:12,height:12,borderRadius:3,border:`1.5px solid ${active?C.red:C.grayLight}`,background:active?C.red:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {active&&<span style={{color:"#fff",fontSize:8,lineHeight:1}}>✓</span>}
              </div>
              <span style={{fontSize:11,color:active?C.red:C.black}}>{v}</span>
              <span style={{fontSize:9,color:C.gray,marginLeft:"auto"}}>{contacts.filter(c=>c.ego_type===v).length}</span>
            </button>
          );})}
        </div>
      )}

      {/* Active filter summary */}
      {activeFilterCount>0&&(
        <div style={{background:C.redSoft,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.redMid}`}}>
          <div style={{fontSize:10,color:C.red,fontWeight:600,marginBottom:3}}>{filtered.length} contact{filtered.length!==1?"s":""} correspondant{filtered.length!==1?"s":""}</div>
          <div style={{fontSize:9,color:C.red}}>{contacts.length} au total</div>
        </div>
      )}
    </div>
  );

  // Shared topbar
  const Topbar=()=>(
    <div style={{display:"flex",alignItems:"center",padding:"0 12px",height:52,borderBottom:`1px solid ${C.grayLight}`,background:C.bg,gap:10,flexShrink:0,position:"relative",zIndex:20}}>
      {selected?(
        <>
          <button onClick={onDeselect} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:C.red,fontFamily:"Inter,sans-serif",fontSize:13,fontWeight:600,padding:"4px 8px",borderRadius:8,flexShrink:0,WebkitTapHighlightColor:"transparent"}}>← Retour</button>
          <div style={{flex:1,textAlign:"center"}}><span style={{fontSize:14,fontWeight:700,color:C.black}}>{selected.first_name} {selected.last_name}</span></div>
        </>
      ):(
        <>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <Logo size={26}/>
            <span style={{fontSize:14,fontWeight:900,color:C.black,letterSpacing:"-0.01em",textTransform:"uppercase"}}>ANANSI <span style={{color:C.red}}>I:R.</span></span>
          </div>
          <div style={{flex:1,position:"relative"}}>
            <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:C.gray,fontSize:13}}>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." style={{width:"100%",padding:"7px 10px 7px 26px",background:"#F7F7F7",border:`1px solid ${C.grayLight}`,borderRadius:8,fontSize:13,color:C.black,outline:"none",fontFamily:"Inter,sans-serif"}}/>
          </div>
          <div style={{display:"flex",background:"#F7F7F7",border:`1px solid ${C.grayLight}`,borderRadius:8,padding:2,gap:1,flexShrink:0}}>
            {[["graph","⬡"],["list","≡"]].map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)} style={{padding:"5px 9px",borderRadius:6,border:"none",background:view===v?C.red:"transparent",color:view===v?"#fff":C.gray,fontSize:13,cursor:"pointer",fontFamily:"Inter,sans-serif",transition:"all 0.15s"}}>{l}</button>
            ))}
          </div>
        </>
      )}
      <div style={{position:"relative",flexShrink:0}}>
        <button onClick={()=>setShowNotifs(p=>!p)} style={{width:34,height:34,borderRadius:8,background:showNotifs?`${C.red}10`:"#F7F7F7",border:`1px solid ${showNotifs?C.redMid:C.grayLight}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:showNotifs?C.red:C.gray,position:"relative",transition:"all 0.15s",WebkitTapHighlightColor:"transparent"}}>
          🔔{unread>0&&<div style={{position:"absolute",top:4,right:4,width:8,height:8,borderRadius:"50%",background:C.red,border:`2px solid ${C.bg}`}}/>}
        </button>
        {showNotifs&&(<><div style={{position:"fixed",inset:0,zIndex:40}} onClick={()=>setShowNotifs(false)}/><div style={{position:"absolute",right:0,zIndex:50}}><NotificationsPanel notifications={notifications} onClose={()=>setShowNotifs(false)} onMarkRead={markRead} onContactClick={handleNotifContact}/></div></>)}
      </div>
      {!selected&&<button onClick={()=>setShowImport(true)} style={{padding:"6px 9px",background:"#F7F7F7",border:`1px solid ${C.grayLight}`,borderRadius:8,color:C.gray,fontSize:11,cursor:"pointer",flexShrink:0,fontFamily:"Inter,sans-serif",WebkitTapHighlightColor:"transparent"}}>↑</button>}
    </div>
  );

  return(
    <div style={{height:"100vh",background:C.bg,fontFamily:"Inter,-apple-system,sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <Topbar/>

      <div style={{flex:1,overflow:"hidden",position:"relative",display:"flex",flexDirection:"column"}}>
        {!selected?(
          // ── NO CARD: sidebar + main view ──
          <div style={{flex:1,display:"flex",overflow:"hidden"}}>
            {/* Filter sidebar — hidden on mobile when no contacts, always on desktop */}
            {(!isMobile||contacts.length>0)&&<FilterSidebar/>}
            {/* Main area */}
            <div style={{flex:1,position:"relative",overflow:"hidden"}}>
              {view==="graph"?(
                <>
                  <NetworkGraph contacts={filtered} onSelect={onSelect}/>
                  <div style={{position:"absolute",top:10,right:10,display:"flex",gap:8,pointerEvents:"none"}}>
                    {[{l:"Affichés",v:filtered.length},{l:"Total",v:contacts.length}].map(s=>(
                      <div key={s.l} style={{background:"rgba(255,255,255,0.92)",backdropFilter:"blur(8px)",border:`1px solid ${C.grayLight}`,borderRadius:10,padding:"5px 10px",textAlign:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
                        <div style={{fontSize:15,fontWeight:800,color:C.black}}>{s.v}</div>
                        <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  {filtered.length===0&&contacts.length>0&&(
                    <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
                      <div style={{fontSize:13,color:C.gray,marginBottom:8}}>Aucun contact ne correspond aux filtres</div>
                      <button onClick={clearFilters} style={{fontSize:12,color:C.red,background:C.redSoft,border:`1px solid ${C.redMid}`,borderRadius:8,padding:"6px 14px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Effacer les filtres</button>
                    </div>
                  )}
                  {contacts.length===0&&(
                    <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
                      <div style={{fontSize:24,marginBottom:8}}>◎</div>
                      <div style={{fontSize:13,color:C.gray,marginBottom:12}}>Aucun contact pour l'instant</div>
                      <div style={{fontSize:11,color:C.gray}}>Appuyez sur + pour ajouter votre premier contact</div>
                    </div>
                  )}
                  <div style={{position:"absolute",bottom:14,left:"50%",transform:"translateX(-50%)",fontSize:11,color:C.gray,pointerEvents:"none",whiteSpace:"nowrap"}}>Cliquez sur un nœud pour voir la fiche</div>
                </>
              ):(
                <div style={{padding:12,overflowY:"auto",height:"100%"}}>
                  {filtered.map(c=>{const score=healthScore(c),hcol=healthColor(score);return(
                    <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"center",gap:12,background:C.bg,border:`1px solid ${C.grayLight}`,borderRadius:10,padding:"11px 14px",cursor:"pointer",marginBottom:6}}
                      onMouseEnter={e=>e.currentTarget.style.background="#F7F7F7"} onMouseLeave={e=>e.currentTarget.style.background=C.bg}>
                      <div style={{width:38,height:38,borderRadius:"50%",background:"#eee",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.black,flexShrink:0}}>{c.initials}</div>
                      <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:C.black}}>{c.first_name} {c.last_name}</div><div style={{fontSize:11,color:C.gray}}>{c.role} · {c.company}</div></div>
                      <div style={{display:"flex",gap:5,alignItems:"center"}}><div style={{width:6,height:6,borderRadius:"50%",background:hcol}}/><span style={{fontSize:11,fontWeight:700,color:hcol}}>{score}</span></div>
                    </div>
                  );})}
                  {filtered.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:C.gray,fontSize:13}}>Aucun contact correspondant</div>}
                </div>
              )}
            </div>
          </div>
        ) : isMobile ? (
          // ── MOBILE: vertical stack — network on top, card below ──
          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>
            {/* Network mini — fixed height on top */}
            <div style={{flexShrink:0,background:"#FAFAFA",borderBottom:`1px solid ${C.grayLight}`}}>
              <div style={{padding:"8px 12px 4px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:10,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Réseau de {selected.first_name}</span>
                <span style={{fontSize:9,color:C.gray}}>nœuds connus = cliquables</span>
              </div>
              <ContactNetwork contact={selected} contacts={contacts} onSelect={onSelect} height={220}/>
            </div>
            {/* Card below */}
            <div style={{flex:1}}>
              <ContactCardContent contact={selected} contacts={contacts} onSelect={onSelect} isMobile={true}/>
            </div>
          </div>
        ) : (
          // ── DESKTOP: side by side ──
          <div style={{flex:1,display:"flex",overflow:"hidden"}}>
            <div style={{flex:1,background:"#FAFAFA",borderRight:`1px solid ${C.grayLight}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div style={{padding:"10px 14px 4px",borderBottom:`1px solid ${C.grayLight}`,flexShrink:0}}>
                <span style={{fontSize:10,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Réseau de {selected.first_name}</span>
              </div>
              <div style={{flex:1,overflow:"hidden"}}>
                <ContactNetwork contact={selected} contacts={contacts} onSelect={onSelect} height={9999}/>
              </div>
            </div>
            <div style={{width:360,flexShrink:0,overflow:"hidden",display:"flex",flexDirection:"column"}}>
              <ContactCardContent contact={selected} contacts={contacts} onSelect={onSelect} isMobile={false}/>
            </div>
          </div>
        )}
      </div>

      {showImport&&<ImportTerminal onClose={()=>{setShowImport(false);onRefresh();}} onImport={(imported)=>console.log("Imported",imported.length)}/>}
      {showAddContact&&<AddContactModal onClose={()=>setShowAddContact(false)} onSave={handleSaveContact}/>}
      {/* Hex FAB — only visible when no modal is open */}
      {!showAddContact&&!showImport&&<HexFAB onClick={()=>setShowAddContact(true)}/>}
    </div>
  );
}

// ── SUPABASE HELPERS ──────────────────────────────────────────────────────────
function normalizeContact(row) {
  return {
    ...row,
    initials: row.initials || ((row.first_name?.[0]||"")+(row.last_name?.[0]||"")),
    hobbies: row.hobbies || [],
    discussion_points: row.discussion_points || [],
    topics_to_avoid: row.topics_to_avoid || [],
    connections: row.connections || [],
    related: row.related || [],
    interactions: row.interactions || [],
    reminders: row.reminders || [],
    tags: row.tags || [],
    last_interaction: row.last_interaction || "–",
    utility_score: row.utility_score ?? 5,
    sentiment_score: row.sentiment_score ?? 5,
    reliability_score: row.reliability_score ?? 5,
    influence_score: row.influence_score ?? 5,
    reciprocity_score: row.reciprocity_score ?? 5,
    momentum_score: row.momentum_score ?? 5,
    potential_score: row.potential_score ?? 5,
    relational_debt: row.relational_debt ?? 0,
    known_personally: row.known_personally ?? false,
  };
}

// ── ROOT ───────────────────────────────────────────────────────────────────────
export default function App(){
  const [unlocked, setUnlocked] = useState(false);
  const [selected, setSelected] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  // Load contacts from Supabase on unlock
  useEffect(() => {
    if (!unlocked) return;
    loadContacts();
  }, [unlocked]);

  async function loadContacts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setContacts((data || []).map(normalizeContact));
      setDbError(null);
    } catch (e) {
      console.error("Supabase load error:", e);
      setDbError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveContact(contact) {
    // Remove local-only fields before inserting
    const { connections, related, interactions, reminders, ...rest } = contact;
    const toInsert = {
      ...rest,
      connections: connections || [],
      related: related || [],
      interactions: interactions || [],
      reminders: reminders || [],
      last_interaction: new Date().toISOString().split("T")[0],
    };
    try {
      const { data, error } = await supabase
        .from("contacts")
        .insert([toInsert])
        .select()
        .single();
      if (error) throw error;
      const saved = normalizeContact(data);
      setContacts(prev => [saved, ...prev]);
      setSelected(saved);
    } catch (e) {
      console.error("Supabase save error:", e);
      // Still add locally so UX doesn't break
      setContacts(prev => [contact, ...prev]);
      setSelected(contact);
    }
  }

  if (!unlocked) return <Login onUnlock={() => setUnlocked(true)} />;

  if (loading) return (
    <div style={{
      minHeight:"100vh", background:C.bg,
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:16,
      fontFamily:"Inter,sans-serif",
    }}>
      <Logo size={52}/>
      <div style={{fontSize:13, color:C.gray}}>Chargement des contacts...</div>
      <div style={{width:180, height:2, background:C.grayLight, borderRadius:2, overflow:"hidden"}}>
        <div style={{height:"100%", background:C.red, borderRadius:2, animation:"loadbar 1.2s ease infinite"}}/>
      </div>
      <style>{`@keyframes loadbar{0%{width:0%;margin-left:0}50%{width:60%;margin-left:20%}100%{width:0%;margin-left:100%}}`}</style>
    </div>
  );

  if (dbError) return (
    <div style={{
      minHeight:"100vh", background:C.bg,
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:12,
      fontFamily:"Inter,sans-serif", padding:24,
    }}>
      <Logo size={48}/>
      <div style={{fontSize:15, fontWeight:700, color:C.red}}>Erreur de connexion</div>
      <div style={{fontSize:12, color:C.gray, textAlign:"center", maxWidth:320}}>{dbError}</div>
      <button onClick={loadContacts} style={{
        padding:"10px 20px", background:C.red, border:"none",
        borderRadius:10, color:"#fff", fontSize:13, fontWeight:700,
        cursor:"pointer", fontFamily:"Inter,sans-serif", marginTop:8,
      }}>Réessayer</button>
    </div>
  );

  return (
    <Dashboard
      contacts={contacts}
      onSelect={c => setSelected(c)}
      selected={selected}
      onDeselect={() => setSelected(null)}
      onSaveContact={saveContact}
      onRefresh={loadContacts}
    />
  );
}
