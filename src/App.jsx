import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY
);

const C = {
  bg:"#FFFFFF",bgSoft:"#F7F7F7",red:"#CC0000",redLight:"#FF1A1A",
  redSoft:"#FFF0F0",redMid:"#FFD6D6",black:"#111111",blackSoft:"#222222",
  gray:"#888888",grayLight:"#DDDDDD",green:"#1A7A4A",amber:"#B85C00",blue:"#1A4A8A",purple:"#6A0DAD",
};

const LEVER_CONFIG={statut:{icon:"👑",desc:"Reconnaître sa valeur publiquement"},réciprocité:{icon:"⇄",desc:"Rendre service avant de demander"},appartenance:{icon:"◉",desc:"L'inclure dans un cercle fermé"},intérêt:{icon:"◈",desc:"Montrer ce qu'il y gagne"},cohérence:{icon:"∞",desc:"Relier à ses prises de position passées"}};
const LEVERS=["statut","réciprocité","appartenance","intérêt","cohérence"];
const EGOS=["faire","avoir","être perçu"];
const RELATION_TYPES=["Famille","Ami(e)","Collègue","Partenaire","Connaissance","Voisin","Mentor","Mentee","Client","Fournisseur","Investisseur","Concurrent"];
const PRO_RELATIONS=["Collègue","Partenaire","Client","Fournisseur","Investisseur","Mentor","Mentee","Concurrent"];
const SECTORS_DEFAULT=["Finance","Tech","Tourisme","Immobilier","Legal","Santé","Éducation","Média","Retail","Agroalimentaire","Énergie","Associatif","Art","Sport","Institutionnel"];
const COUNTRY_CODES=[{code:"+230",flag:"🇲🇺"},{code:"+33",flag:"🇫🇷"},{code:"+1",flag:"🇺🇸"},{code:"+44",flag:"🇬🇧"},{code:"+27",flag:"🇿🇦"},{code:"+91",flag:"🇮🇳"},{code:"+86",flag:"🇨🇳"},{code:"+49",flag:"🇩🇪"},{code:"+971",flag:"🇦🇪"},{code:"+254",flag:"🇰🇪"},{code:"+221",flag:"🇸🇳"},{code:"+225",flag:"🇨🇮"}];

const NOTIF_SECTIONS=[
  {key:"urgent",label:"Urgent",color:C.red,bg:C.redSoft,icon:"⚠"},
  {key:"aVenir",label:"À venir",color:C.blue,bg:"#F0F4FF",icon:"◷"},
  {key:"aFaire",label:"À faire",color:C.amber,bg:"#FFF8F0",icon:"↺"},
  {key:"bonPlan",label:"Bons plans",color:C.green,bg:"#F0FFF6",icon:"✦"},
];
const MOCK_NOTIFICATIONS=[
  {id:1,type:"aVenir",message:"Bot WhatsApp bientôt disponible — Phase 2 en cours.",contactId:null,due:null,read:true,time:"—"},
];

function healthScore(c){return Math.round(((c.sentiment_score??5)+(c.reliability_score??5)+(c.reciprocity_score??5)+(c.momentum_score??5))*10/4);}
function healthColor(s){return s>=70?C.green:s>=50?C.amber:s>=30?"#CC5500":C.red;}
function seededRand(seed){let s=seed%2147483647;if(s<=0)s+=2147483646;s=s*16807%2147483647;return(s-1)/2147483646;}
function idSeed(id,i){if(typeof id==="number")return id;const str=String(id||i+1);let h=0;for(let k=0;k<str.length;k++){h=(h*31+str.charCodeAt(k))|0;}return Math.abs(h)||i+1;}
function contactSectors(c){if(Array.isArray(c.sectors)&&c.sectors.length)return c.sectors;return c.sector?[c.sector]:[];}
function connectedIdsOf(c,contacts){const s=new Set((c.connections||[]).map(String));contacts.forEach(o=>{if((o.connections||[]).map(String).includes(String(c.id)))s.add(String(o.id));});s.delete(String(c.id));return s;}

function useWindowWidth(){
  const [w,setW]=useState(typeof window!=="undefined"?window.innerWidth:1200);
  useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return w;
}

function fileToResizedDataURL(file,max=640,quality=0.82){
  return new Promise((res,rej)=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      const scale=Math.min(1,max/Math.max(img.width,img.height));
      const w=Math.round(img.width*scale),h=Math.round(img.height*scale);
      const cv=document.createElement("canvas");cv.width=w;cv.height=h;
      cv.getContext("2d").drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      res(cv.toDataURL("image/jpeg",quality));
    };
    img.onerror=rej;
    img.src=url;
  });
}

// Parseur CSV robuste (guillemets, virgules internes, retours ligne)
function parseCSVRows(text){
  const rows=[];let cur=[];let field="";let inQ=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(inQ){
      if(ch==='"'){if(text[i+1]==='"'){field+='"';i++;}else inQ=false;}
      else field+=ch;
    }else{
      if(ch==='"')inQ=true;
      else if(ch===","){cur.push(field);field="";}
      else if(ch==="\n"||ch==="\r"){
        if(ch==="\r"&&text[i+1]==="\n")i++;
        cur.push(field);field="";
        if(cur.length>1||cur[0]!=="")rows.push(cur);
        cur=[];
      }
      else field+=ch;
    }
  }
  if(field!==""||cur.length){cur.push(field);rows.push(cur);}
  return rows;
}

// ── LOGO ───────────────────────────────────────────────────────────────────────
function Logo({size=40}){
  const s=size,cx=s/2,cy=s/2,r=s*0.46;
  const top={x:cx,y:cy-r*0.52},left={x:cx-r*0.58,y:cy+r*0.05},bot={x:cx-r*0.08,y:cy+r*0.55},right={x:cx+r*0.52,y:cy+r*0.05};
  const nr=s*0.115;
  return(
    <svg width={s} height={s} viewBox={"0 0 "+s+" "+s}>
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
  const dash=2*Math.PI*r;
  return(
    <svg width={s} height={s} viewBox={"0 0 "+s+" "+s}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111" strokeWidth={s*0.025}
        style={{strokeDasharray:dash,strokeDashoffset:phase>=1?0:dash,transition:"stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1)",transformOrigin:cx+"px "+cy+"px",transform:"rotate(-90deg)"}}/>
      {[[top,left],[top,bot],[top,right],[left,bot]].map(([a,b],i)=>(
        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#111" strokeWidth={s*0.016} style={{opacity:phase>=2?1:0,transition:"opacity 0.25s ease "+(i*0.07)+"s"}}/>
      ))}
      {[{pos:top,fill:"#CC0000",stroke:null},{pos:left,fill:"#111111",stroke:null},{pos:bot,fill:"#888888",stroke:null},{pos:right,fill:"#FFFFFF",stroke:"#111111"}].map((n,i)=>(
        <circle key={i} cx={n.pos.x} cy={n.pos.y} r={nr} fill={n.fill} stroke={n.stroke||"none"} strokeWidth={n.stroke?s*0.02:0}
          style={{transform:phase>=3?"scale(1)":"scale(0)",transformOrigin:n.pos.x+"px "+n.pos.y+"px",transition:"transform 0.35s cubic-bezier(0.34,1.56,0.64,1) "+(i*0.08)+"s"}}/>
      ))}
    </svg>
  );
}

function Splash({onDone}){
  const [p,setP]=useState(0);
  useEffect(()=>{const t1=setTimeout(()=>setP(1),100),t2=setTimeout(()=>setP(2),1400),t3=setTimeout(()=>setP(3),1900),t4=setTimeout(onDone,3200);return()=>{[t1,t2,t3,t4].forEach(clearTimeout);};},[onDone]);
  return(
    <div style={{position:"fixed",inset:0,background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,zIndex:300}}>
      <style>{"@keyframes pulse{0%,100%{opacity:0.15}50%{opacity:1}}"}</style>
      <div style={{opacity:p>=1?1:0,transition:"opacity 0.4s ease"}}><AnimatedLogo size={120}/></div>
      <div style={{opacity:p>=2?1:0,transform:p>=2?"translateY(0)":"translateY(10px)",transition:"all 0.45s ease",textAlign:"center"}}>
        <div style={{fontSize:36,fontWeight:900,color:C.black,letterSpacing:"-0.01em",fontFamily:"Inter,sans-serif",textTransform:"uppercase"}}>ANANSI <span style={{color:C.red}}>I:R.</span></div>
      </div>
      <div style={{position:"absolute",bottom:40,display:"flex",gap:7,opacity:p>=3?1:0,transition:"opacity 0.4s ease"}}>
        {[0,1,2].map(i=>(<div key={i} style={{width:6,height:6,borderRadius:"50%",background:i===0?C.red:C.grayLight,animation:"pulse 1.3s ease "+(i*0.22)+"s infinite"}}/>))}
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
    S.snake.forEach((seg,i)=>{ctx.fillStyle=i===0?"#CC0000":"rgba(180,0,0,"+Math.max(0.2,0.9-i*0.04)+")";ctx.fillRect(seg.x*CELL+1,seg.y*CELL+1,CELL-2,CELL-2);if(i===0){ctx.fillStyle="#fff";ctx.fillRect(seg.x*CELL+4,seg.y*CELL+4,3,3);ctx.fillRect(seg.x*CELL+9,seg.y*CELL+4,3,3);}});
    ctx.fillStyle="rgba(255,255,255,0.5)";ctx.font="bold 11px monospace";ctx.fillText("SCORE: "+S.score,4,314);
    if(!S.alive){ctx.fillStyle="rgba(0,0,0,0.88)";ctx.fillRect(0,0,320,320);ctx.fillStyle="#CC0000";ctx.font="bold 22px monospace";ctx.textAlign="center";ctx.fillText("GAME OVER",160,140);ctx.fillStyle="rgba(255,255,255,0.7)";ctx.font="11px monospace";ctx.fillText("SCORE: "+S.score,160,162);ctx.fillStyle="rgba(255,255,255,0.3)";ctx.font="10px monospace";ctx.fillText("↺ pour rejouer",160,184);ctx.textAlign="left";}
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
    <div style={{position:"absolute",right:0,top:8,width:320,background:C.bg,border:"1px solid "+C.grayLight,borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,0.12)",zIndex:50,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderBottom:"1px solid "+C.grayLight}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{fontSize:13,fontWeight:700,color:C.black}}>Notifications</span>
          {unread>0&&<span style={{fontSize:10,fontWeight:700,color:"#fff",background:C.red,padding:"1px 6px",borderRadius:10}}>{unread}</span>}
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.gray,lineHeight:1}}>×</button>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid "+C.grayLight}}>
        {NOTIF_SECTIONS.map(s=>{
          const cnt=notifications.filter(n=>n.type===s.key&&!n.read).length;
          const active=activeSection===s.key;
          return(
            <button key={s.key} onClick={()=>setActiveSection(s.key)} style={{flex:1,padding:"8px 2px",background:"none",border:"none",borderBottom:"2px solid "+(active?s.color:"transparent"),color:active?s.color:C.gray,fontSize:9,fontWeight:active?700:400,cursor:"pointer",fontFamily:"Inter,sans-serif",position:"relative"}}>
              {s.icon} {s.label}
              {cnt>0&&<span style={{position:"absolute",top:3,right:3,width:5,height:5,borderRadius:"50%",background:s.color}}/>}
            </button>
          );
        })}
      </div>
      <div style={{maxHeight:340,overflowY:"auto"}}>
        {filtered.length===0&&<div style={{padding:18,textAlign:"center",color:C.gray,fontSize:12}}>Aucune notification</div>}
        {filtered.map(n=>{
          const sec=NOTIF_SECTIONS.find(s=>s.key===n.type)||NOTIF_SECTIONS[0];
          const rowBg=n.read?C.bg:sec.bg;
          return(
            <div key={n.id} style={{display:"flex",gap:10,padding:"10px 14px",background:rowBg,borderBottom:"1px solid "+C.grayLight,cursor:"pointer"}}
              onClick={()=>{onMarkRead(n.id);if(n.contactId)onContactClick(n.contactId);}}
              onMouseEnter={e=>e.currentTarget.style.background=C.bgSoft}
              onMouseLeave={e=>e.currentTarget.style.background=rowBg}
            >
              <div style={{width:28,height:28,borderRadius:"50%",background:sec.bg,border:"1px solid "+sec.color+"30",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,color:sec.color}}>{sec.icon}</div>
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

// ── IMPORT TERMINAL — insère RÉELLEMENT dans Supabase via onBulkImport ────────
function ImportTerminal({onClose,onBulkImport}){
  const [step,setStep]=useState("idle");
  const [log,setLog]=useState([]);
  const [parsed,setParsed]=useState([]);
  const fileRef=useRef(null);
  const addLog=(msg,type)=>setLog(prev=>[...prev,{msg,type:type||"info",id:Date.now()+Math.random()}]);

  const splitMulti=(v)=>String(v||"").split(";").map(x=>x.trim()).filter(Boolean);
  const toBool=(v)=>["true","oui","yes","1"].includes(String(v||"").trim().toLowerCase());
  const toNum=(v,d)=>{const n=Number(v);return isNaN(n)?d:n;};

  const buildFromAnansiCSV=(headers,cells)=>{
    const get=(name)=>{const idx=headers.indexOf(name);return idx>=0?(cells[idx]||""):"";};
    const first=get("first_name").trim(),last=get("last_name").trim();
    if(!first&&!last)return null;
    const sectors=splitMulti(get("sectors"));
    return{
      _ref:get("ref").trim()||null,
      _connections_refs:splitMulti(get("connections")),
      genre:get("genre").trim()||"M",
      first_name:first,last_name:last,
      alias:get("alias").trim(),maiden_name:get("maiden_name").trim(),
      my_relation:splitMulti(get("my_relation")),
      role:get("role").trim(),company:get("company").trim(),
      sectors,sector:sectors[0]||"",
      location_city:get("location_city").trim(),
      country_code:get("country_code").trim()||"+230",
      phone:get("phone").trim(),email:get("email").trim(),
      known_personally:toBool(get("known_personally")),
      primary_lever:get("primary_lever").trim(),
      secondary_lever:get("secondary_lever").trim(),
      tertiary_lever:get("tertiary_lever").trim(),
      ego_type:get("ego_type").trim(),
      current_desire:get("current_desire").trim(),
      red_lines:get("red_lines").trim(),
      discussion_points:splitMulti(get("discussion_points")),
      topics_to_avoid:splitMulti(get("topics_to_avoid")),
      hobbies:splitMulti(get("hobbies")),
      notes:get("notes").trim(),
      utility_score:toNum(get("utility_score"),5),
      sentiment_score:toNum(get("sentiment_score"),5),
      reliability_score:toNum(get("reliability_score"),5),
      influence_score:toNum(get("influence_score"),5),
      reciprocity_score:toNum(get("reciprocity_score"),5),
      momentum_score:toNum(get("momentum_score"),5),
      potential_score:toNum(get("potential_score"),5),
      relational_debt:toNum(get("relational_debt"),0),
      initials:(first[0]||"")+(last[0]||""),
    };
  };

  const buildFromGenericCSV=(headers,cells)=>{
    const get=(...names)=>{for(const n of names){const idx=headers.indexOf(n);if(idx>=0&&cells[idx])return cells[idx];}return"";};
    const first=get("first_name","first name","prénom","prenom","given name").trim();
    const last=get("last_name","last name","nom","family name").trim();
    if(!first&&!last)return null;
    return{
      first_name:first||last,last_name:first?last:"",
      company:get("company","organisation","organization","entreprise").trim(),
      role:get("title","job title","poste","role").trim(),
      phone:get("phone","phone 1 - value","mobile","téléphone","telephone").trim(),
      email:get("email","e-mail","e-mail 1 - value","courriel").trim(),
      initials:(first[0]||last[0]||"")+((first&&last[0])||""),
      genre:"M",my_relation:[],sectors:[],sector:"",known_personally:false,
    };
  };

  // vCard iPhone/iCloud : dépliage des lignes + champs N/FN/ORG/TITLE/TEL/EMAIL
  const parseVCF=(text)=>{
    const unfolded=text.replace(/\r?\n[ \t]/g,"");
    const cards=unfolded.split(/BEGIN:VCARD/i).slice(1);
    return cards.map(card=>{
      const grab=(re)=>{const m=card.match(re);return m?m[1].trim():"";};
      const nRaw=grab(/^N(?:;[^:]*)?:(.*)$/im);
      let first="",last="";
      if(nRaw){const p=nRaw.split(";");last=(p[0]||"").trim();first=(p[1]||"").trim();}
      if(!first&&!last){
        const fn=grab(/^FN(?:;[^:]*)?:(.*)$/im);
        const parts=fn.split(" ");first=parts[0]||"";last=parts.slice(1).join(" ");
      }
      const org=(grab(/^ORG(?:;[^:]*)?:(.*)$/im).split(";")[0]||"").trim();
      const title=grab(/^TITLE(?:;[^:]*)?:(.*)$/im);
      const tel=grab(/^TEL[^:]*:(.*)$/im).replace(/[^\d+ ]/g,"");
      const email=grab(/^EMAIL[^:]*:(.*)$/im);
      if(!first&&!last)return null;
      return{
        first_name:first,last_name:last,company:org,role:title,
        phone:tel,email,
        initials:(first[0]||"")+(last[0]||""),
        genre:"M",my_relation:[],sectors:[],sector:"",known_personally:true,
      };
    }).filter(Boolean);
  };

  const handleFile=async(file)=>{
    if(!file)return;
    setStep("parsing");setLog([]);
    addLog("📂 "+file.name+" — "+(file.size/1024).toFixed(1)+" KB");
    const text=await file.text();
    const ext=file.name.split(".").pop().toLowerCase();
    let results=[];
    try{
      if(ext==="csv"){
        const rows=parseCSVRows(text);
        if(rows.length<2){addLog("❌ CSV vide.","error");setStep("error");return;}
        const headers=rows[0].map(h=>h.trim().toLowerCase());
        const isAnansi=headers.includes("ref")&&headers.includes("connections");
        addLog(isAnansi?"🔍 Format Anansi CSV (avec relations)":"🔍 Format CSV générique");
        results=rows.slice(1).map(cells=>isAnansi?buildFromAnansiCSV(headers,cells):buildFromGenericCSV(headers,cells)).filter(Boolean);
      }else if(ext==="vcf"||ext==="vcard"){
        addLog("🔍 Format vCard (iPhone/iCloud)");
        results=parseVCF(text);
      }else{
        addLog("❌ Format non supporté. CSV ou VCF uniquement.","error");setStep("error");return;
      }
    }catch(e){
      addLog("❌ Erreur de parsing: "+e.message,"error");setStep("error");return;
    }
    if(results.length===0){addLog("❌ Aucun contact détecté.","error");setStep("error");return;}
    await new Promise(r=>setTimeout(r,300));
    addLog("✓ "+results.length+" contact(s) détecté(s)","success");
    results.slice(0,4).forEach(r=>addLog("  · "+r.first_name+" "+r.last_name+(r.company?" — "+r.company:""),"muted"));
    if(results.length>4)addLog("  · ... et "+(results.length-4)+" autres","muted");
    const withConns=results.filter(r=>(r._connections_refs||[]).length>0).length;
    if(withConns>0)addLog("🔗 "+withConns+" contacts avec relations à recréer","success");
    setParsed(results);setStep("ready");
  };

  const handleImport=async()=>{
    setStep("importing");
    addLog("⚙️ Insertion dans Supabase...");
    try{
      const count=await onBulkImport(parsed);
      addLog("✓ "+count+" cartes créées dans la base","success");
      addLog("🎉 Import terminé !","success");
      setStep("done");
    }catch(e){
      console.error("Bulk import error:",e);
      addLog("❌ Erreur Supabase: "+(e.message||"inconnue"),"error");
      addLog("Vérifie les colonnes de la table (SQL fourni) puis réessaie.","muted");
      setStep("error");
    }
  };

  const logColor={info:"#FFFFFF",muted:"#9A9A9A",success:"#3ADB76",error:"#FF4D4D"};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:20}}>
      <div style={{background:"#111",borderRadius:16,padding:20,width:"100%",maxWidth:440,border:"1px solid rgba(255,255,255,0.1)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:"monospace"}}>{"// Import Contacts"}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:2}}>CSV Anansi (relations) · CSV générique · VCF iPhone</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:20,cursor:"pointer"}}>×</button>
        </div>
        <div style={{background:"#000",borderRadius:10,padding:12,minHeight:150,maxHeight:230,overflowY:"auto",marginBottom:12,fontFamily:"monospace",fontSize:11}}>
          {log.length===0&&<div style={{color:"rgba(255,255,255,0.2)"}}>{"> En attente d'un fichier..."}</div>}
          {log.map(l=>(<div key={l.id} style={{color:logColor[l.type]||"#999",marginBottom:2}}>{l.msg}</div>))}
          {(step==="parsing"||step==="importing")&&<div style={{color:"rgba(255,255,255,0.3)"}}>▋</div>}
        </div>
        {(step==="idle"||step==="error")&&(
          <div onClick={()=>fileRef.current&&fileRef.current.click()} style={{border:"2px dashed rgba(204,0,0,0.35)",borderRadius:10,padding:18,textAlign:"center",cursor:"pointer",background:"rgba(204,0,0,0.05)"}}
            onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}}>
            <div style={{fontSize:22,marginBottom:6}}>📁</div>
            <div style={{fontSize:12,color:"#fff",fontWeight:600}}>Déposer votre fichier ici</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:3}}>.csv ou .vcf — glisser ou cliquer</div>
            <input ref={fileRef} type="file" accept=".csv,.vcf,.vcard" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
          </div>
        )}
        {step==="ready"&&(
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setStep("idle");setLog([]);setParsed([]);}} style={{flex:1,padding:10,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"rgba(255,255,255,0.5)",fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Annuler</button>
            <button onClick={handleImport} style={{flex:2,padding:10,background:C.red,border:"none",borderRadius:10,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Importer {parsed.length} contacts →</button>
          </div>
        )}
        {step==="done"&&(
          <button onClick={onClose} style={{width:"100%",padding:11,background:C.green,border:"none",borderRadius:10,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>✓ Terminé — Voir la toile</button>
        )}
        <div style={{marginTop:10,fontSize:9,color:"rgba(255,255,255,0.25)",textAlign:"center"}}>iPhone : Contacts → Tout sélectionner → Partager → .vcf</div>
      </div>
    </div>
  );
}

// ── MINI RÉSEAU (fiche contact) ────────────────────────────────────────────────
function ContactNetwork({contact,contacts,onSelect,height}){
  const canvasRef=useRef(null);
  const animRef=useRef(null);
  const nodesRef=useRef([]);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const dpr=window.devicePixelRatio||1;
    const W=canvas.offsetWidth||300,H=canvas.offsetHeight||300;
    canvas.width=W*dpr;canvas.height=H*dpr;
    const ctx=canvas.getContext("2d");ctx.scale(dpr,dpr);
    const cx=W/2,cy=H/2;
    const connMeta=contact.connection_types||{};
    const connSet=connectedIdsOf(contact,contacts);
    const connectedContacts=contacts.filter(c=>connSet.has(String(c.id)));
    const related=(contact.related||[]).filter(r=>!connectedContacts.find(c=>String(c.id)===String(r.id)));
    const outer=[
      ...connectedContacts.map(c=>{
        const owned=(contact.connections||[]).map(String).includes(String(c.id));
        const relLabel=owned?(connMeta[String(c.id)]||"connexion"):"connexion";
        return{id:c.id,label:c.initials||"?",name:c.first_name,color:C.red,textColor:"#fff",known:true,contactObj:c,relLabel};
      }),
      ...related.map(r=>({id:r.id,label:r.initials||"?",name:(r.name||"").split(" ")[0],color:r.known?C.red:C.grayLight,textColor:r.known?"#fff":C.gray,known:!!r.known,contactObj:null,relLabel:r.type||"lié"})),
    ];
    const dist=Math.min(W,H)*0.36;
    nodesRef.current=[
      {id:contact.id,x:cx,y:cy,r:26,label:contact.initials||"?",name:contact.first_name,isCenter:true,color:C.red,textColor:"#fff"},
      ...outer.map((item,i)=>{
        const a=(i/Math.max(outer.length,1))*Math.PI*2-Math.PI/2;
        return{...item,x:cx+dist*Math.cos(a),y:cy+dist*Math.sin(a),r:18,isCenter:false};
      })
    ];
    const loop=()=>{
      ctx.clearRect(0,0,W,H);
      nodesRef.current.slice(1).forEach(n=>{
        ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(n.x,n.y);
        ctx.strokeStyle="rgba(0,0,0,0.07)";ctx.lineWidth=1;ctx.stroke();
        const mx=cx*0.35+n.x*0.65,my=cy*0.35+n.y*0.65;
        ctx.fillStyle="rgba(0,0,0,0.35)";ctx.font="8px Inter,sans-serif";ctx.textAlign="center";
        ctx.fillText(n.relLabel,mx,my);
      });
      nodesRef.current.forEach(n=>{
        if(n.isCenter){ctx.beginPath();ctx.arc(n.x,n.y,n.r+7,0,Math.PI*2);ctx.fillStyle="rgba(204,0,0,0.08)";ctx.fill();}
        ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
        ctx.fillStyle=n.isCenter?C.red:n.color;ctx.fill();
        if(!n.isCenter){ctx.strokeStyle=n.known?C.red:C.grayLight;ctx.lineWidth=1.2;ctx.stroke();}
        ctx.fillStyle=n.textColor||"#fff";
        ctx.font="bold "+(n.r*0.52)+"px Inter,sans-serif";
        ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillText(n.label,n.x,n.y);
        ctx.fillStyle=C.gray;ctx.font="9px Inter,sans-serif";
        ctx.fillText(n.name||"",n.x,n.y+n.r+11);
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
  const canvasStyle=height?{width:"100%",height:height+"px",display:"block",cursor:"pointer"}:{width:"100%",height:"100%",display:"block",cursor:"pointer"};
  return <canvas ref={canvasRef} onClick={handleClick} style={canvasStyle}/>;
}

// ── TOILE GLOBALE ──────────────────────────────────────────────────────────────
function NetworkGraph({contacts,onSelect,highlightId}){
  const canvasRef=useRef(null);
  const nodesRef=useRef([]);
  const edgesRef=useRef([]);
  const animRef=useRef(null);
  const hovRef=useRef(null);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const W=canvas.offsetWidth,H=canvas.offsetHeight;
    canvas.width=W;canvas.height=H;
    const cx=W/2,cy=H/2,r=Math.min(W,H)*0.32;
    nodesRef.current=contacts.map((c,i)=>{
      const a=(i/Math.max(contacts.length,1))*Math.PI*2-Math.PI/2;
      const seed=idSeed(c.id,i);
      const jx=(seededRand(seed*3)-0.5)*28;
      const jy=(seededRand(seed*7+1)-0.5)*28;
      return{id:c.id,contact:c,x:cx+r*Math.cos(a)+jx,y:cy+r*Math.sin(a)+jy,vx:0,vy:0,r:(c.utility_score??5)>=9?26:(c.utility_score??5)>=7?21:17};
    });
    const idset=new Set(contacts.map(c=>String(c.id)));
    const seen=new Set();
    const edges=[];
    contacts.forEach(c=>(c.connections||[]).forEach(cid=>{
      const a=String(c.id),b=String(cid);
      if(!idset.has(b))return;
      const key=a<b?a+"|"+b:b+"|"+a;
      if(seen.has(key))return;
      seen.add(key);edges.push([a,b]);
    }));
    edgesRef.current=edges;
    const getN=(id)=>nodesRef.current.find(n=>String(n.id)===String(id));
    let frame=0;
    const loop=()=>{
      const ctx=canvas.getContext("2d");ctx.clearRect(0,0,W,H);
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
        edges.forEach(([a,b])=>{
          const na=getN(a),nb=getN(b);if(!na||!nb)return;
          const dx=nb.x-na.x,dy=nb.y-na.y,d=Math.sqrt(dx*dx+dy*dy)||1,f=(d-120)*0.02;
          na.vx+=f*dx/d;na.vy+=f*dy/d;nb.vx-=f*dx/d;nb.vy-=f*dy/d;
        });
        nodes.forEach(n=>{
          n.vx*=0.85;n.vy*=0.85;n.x+=n.vx;n.y+=n.vy;
          n.x=Math.max(n.r+8,Math.min(W-n.r-8,n.x));
          n.y=Math.max(n.r+8,Math.min(H-n.r-8,n.y));
        });
        if(frame===79)nodes.forEach(n=>{n.vx=0;n.vy=0;});
        frame++;
      }
      edgesRef.current.forEach(([a,b])=>{
        const na=getN(a),nb=getN(b);if(!na||!nb)return;
        const hi=String(hovRef.current)===a||String(hovRef.current)===b||String(highlightId||"")===a||String(highlightId||"")===b;
        ctx.beginPath();ctx.moveTo(na.x,na.y);ctx.lineTo(nb.x,nb.y);
        ctx.strokeStyle=hi?"rgba(204,0,0,0.3)":"rgba(0,0,0,0.07)";
        ctx.lineWidth=hi?1.5:1;ctx.stroke();
      });
      nodesRef.current.forEach(n=>{
        const hov=String(n.id)===String(hovRef.current);
        const isHL=String(n.id)===String(highlightId||"");
        const score=healthScore(n.contact),hcol=healthColor(score);
        const displayR=hov?n.r*1.35:n.r;
        if(hov||isHL){ctx.beginPath();ctx.arc(n.x,n.y,displayR+8,0,Math.PI*2);ctx.fillStyle="rgba(204,0,0,0.08)";ctx.fill();}
        ctx.beginPath();ctx.arc(n.x,n.y,displayR,0,Math.PI*2);
        const fillColor=hov?C.red:(isHL?C.redSoft:"#fff");
        ctx.fillStyle=fillColor;ctx.fill();
        ctx.strokeStyle=(hov||isHL)?C.red:"rgba(0,0,0,0.1)";ctx.lineWidth=(hov||isHL)?2:1;ctx.stroke();
        if(hov){
          const fullName=((n.contact.first_name||"")+" "+(n.contact.last_name||"")).trim();
          ctx.fillStyle="#fff";
          ctx.font="bold "+Math.max(8,displayR*0.3)+"px Inter,sans-serif";
          ctx.textAlign="center";ctx.textBaseline="middle";
          ctx.fillText(fullName,n.x,n.y);
        }else{
          ctx.fillStyle=C.black;
          ctx.font="bold "+(n.r*0.55)+"px Inter,sans-serif";
          ctx.textAlign="center";ctx.textBaseline="middle";
          ctx.fillText(n.contact.initials||"?",n.x,n.y);
        }
        ctx.beginPath();ctx.arc(n.x+displayR*0.65,n.y-displayR*0.65,4,0,Math.PI*2);ctx.fillStyle=hcol;ctx.fill();
      });
      animRef.current=requestAnimationFrame(loop);
    };
    loop();
    return()=>cancelAnimationFrame(animRef.current);
  },[contacts,highlightId]);
  const onMove=useCallback((e)=>{const rect=canvasRef.current.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top,hit=nodesRef.current.find(n=>{const dx=n.x-mx,dy=n.y-my;return Math.sqrt(dx*dx+dy*dy)<n.r+4;});hovRef.current=hit?hit.id:null;canvasRef.current.style.cursor=hit?"pointer":"default";},[]);
  const onTouch=useCallback((e)=>{const rect=canvasRef.current.getBoundingClientRect(),t=e.touches[0];if(!t)return;const mx=t.clientX-rect.left,my=t.clientY-rect.top,hit=nodesRef.current.find(n=>{const dx=n.x-mx,dy=n.y-my;return Math.sqrt(dx*dx+dy*dy)<n.r+16;});hovRef.current=hit?hit.id:null;},[]);
  const onClick=useCallback((e)=>{const rect=canvasRef.current.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top,hit=nodesRef.current.find(n=>{const dx=n.x-mx,dy=n.y-my;return Math.sqrt(dx*dx+dy*dy)<n.r+4;});if(hit)onSelect(hit.contact);},[onSelect]);
  return <canvas ref={canvasRef} onMouseMove={onMove} onTouchStart={onTouch} onTouchMove={onTouch} onTouchEnd={()=>{setTimeout(()=>{hovRef.current=null;},800);}} onClick={onClick} style={{width:"100%",height:"100%",display:"block"}}/>;
}

// ── SCORE RING ─────────────────────────────────────────────────────────────────
function Ring({value,max=10,color,size=44,label}){
  const r=(size-6)/2,circ=2*Math.PI*r,fill=(value/max)*circ;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.grayLight} strokeWidth={3}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3} strokeDasharray={fill+" "+circ} strokeLinecap="round"/>
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fill={C.black} fontSize={size*0.28} fontWeight={700} style={{transform:"rotate(90deg)",transformOrigin:(size/2)+"px "+(size/2)+"px"}}>{value}</text>
      </svg>
      <span style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"center",maxWidth:50}}>{label}</span>
    </div>
  );
}

// ── GALERIE MÉDIA ──────────────────────────────────────────────────────────────
function MediaGallery({contact,onUpdate}){
  const fileRef=useRef(null);
  const [videoUrl,setVideoUrl]=useState("");
  const [busy,setBusy]=useState(false);
  const media=contact.media||[];
  const addImage=async(file)=>{
    if(!file)return;
    setBusy(true);
    try{
      const data=await fileToResizedDataURL(file,900,0.8);
      await onUpdate({media:[...media,{type:"image",data,date:new Date().toISOString().split("T")[0]}]});
    }finally{setBusy(false);}
  };
  const addVideo=async()=>{
    const url=videoUrl.trim();
    if(!url)return;
    setVideoUrl("");
    await onUpdate({media:[...media,{type:"video",url,date:new Date().toISOString().split("T")[0]}]});
  };
  const removeAt=async(idx)=>{await onUpdate({media:media.filter((_,i)=>i!==idx)});};
  const isPlayable=(url)=>/\.(mp4|webm|ogg)(\?|$)/i.test(url||"")||String(url||"").startsWith("data:video");
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <button onClick={()=>fileRef.current&&fileRef.current.click()} disabled={busy} style={{padding:9,background:C.red,border:"none",borderRadius:10,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif",opacity:busy?0.6:1}}>
        {busy?"Chargement...":"+ Photo"}
      </button>
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>addImage(e.target.files[0])}/>
      <div style={{display:"flex",gap:6}}>
        <input value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="URL vidéo (mp4, lien...)" style={{flex:1,padding:"9px 11px",background:"#F7F7F7",border:"1px solid "+C.grayLight,borderRadius:8,fontSize:12,outline:"none",fontFamily:"Inter,sans-serif",color:C.black}}/>
        <button onClick={addVideo} style={{padding:"9px 12px",background:"#F7F7F7",border:"1px solid "+C.grayLight,borderRadius:8,color:C.black,fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>+ Vidéo</button>
      </div>
      {media.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:C.gray,fontSize:12}}>Aucun média pour ce contact.</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {media.map((m,i)=>(
          <div key={i} style={{position:"relative",borderRadius:10,overflow:"hidden",border:"1px solid "+C.grayLight,background:"#000",aspectRatio:"1"}}>
            {m.type==="image"
              ?<img src={m.data||m.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              :isPlayable(m.url)
                ?<video src={m.url} controls style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                :<a href={m.url} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%",color:"#fff",fontSize:24,textDecoration:"none"}}>▶</a>
            }
            <button onClick={()=>removeAt(i)} style={{position:"absolute",top:4,right:4,width:22,height:22,borderRadius:"50%",background:"rgba(0,0,0,0.6)",border:"none",color:"#fff",fontSize:12,cursor:"pointer",lineHeight:1}}>×</button>
            <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.5)",color:"#fff",fontSize:9,padding:"2px 6px"}}>{m.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FICHE CONTACT ──────────────────────────────────────────────────────────────
function ContactCardContent({contact:c,contacts,onSelect,onUpdate,onDelete}){
  const [tab,setTab]=useState("brief");
  const [photoErr,setPhotoErr]=useState(false);
  const [showActionMenu,setShowActionMenu]=useState(false);
  const [showEditModal,setShowEditModal]=useState(false);
  const [openRelEditor,setOpenRelEditor]=useState(null);
  const photoRef=useRef(null);
  const score=healthScore(c),hcol=healthColor(score);
  const connSet=connectedIdsOf(c,contacts);
  const shouldMeet=contacts.filter(other=>{
    if(String(other.id)===String(c.id)||connSet.has(String(other.id)))return false;
    const sSec=contactSectors(c),oSec=contactSectors(other);
    return oSec.some(s=>sSec.includes(s))||(other.hobbies||[]).some(h=>(c.hobbies||[]).includes(h));
  });
  const Tag=({children})=>(<span style={{display:"inline-flex",padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:500,background:C.red+"12",color:C.red,margin:2}}>{children}</span>);
  const initials=(c.first_name&&c.first_name[0]||"")+(c.last_name&&c.last_name[0]||"");
  const genreLabel=c.genre==="F"?"Mme":"M.";
  const myRelation=Array.isArray(c.my_relation)?c.my_relation.join(", "):(c.my_relation||"");
  const aliasStr=c.alias?' "'+c.alias+'"':"";
  const maidenStr=(c.genre==="F"&&c.maiden_name)?" (née "+c.maiden_name+")":"";
  const fullName=genreLabel+" "+(c.first_name||"")+" "+(c.last_name||"")+aliasStr+maidenStr;
  const sectors=contactSectors(c);
  const changePhoto=async(file)=>{
    if(!file)return;
    const data=await fileToResizedDataURL(file,320,0.82);
    setPhotoErr(false);
    await onUpdate({photo_url:data});
  };
  const leverRows=[
    {tier:"1º",key:c.primary_lever,color:C.red},
    {tier:"2º",key:c.secondary_lever,color:C.amber},
    {tier:"3º",key:c.tertiary_lever,color:C.gray},
  ].filter(l=>l.key);
  const mainLever=LEVER_CONFIG[c.primary_lever]||{icon:"·",desc:"–"};

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"14px 16px 0",borderBottom:"1px solid "+C.grayLight,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <div style={{position:"relative",flexShrink:0}}>
            <div style={{width:48,height:48,borderRadius:"50%",background:C.red,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"#fff",overflow:"hidden"}}>
              {c.photo_url&&!photoErr
                ?<img src={c.photo_url} alt="" onError={()=>setPhotoErr(true)} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                :<span>{c.initials||initials}</span>
              }
            </div>
            <button onClick={()=>photoRef.current&&photoRef.current.click()} title="Changer la photo" style={{position:"absolute",bottom:-3,right:-3,width:18,height:18,borderRadius:"50%",background:"#fff",border:"1px solid "+C.grayLight,fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>📷</button>
            <input ref={photoRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>changePhoto(e.target.files[0])}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:800,color:C.black,lineHeight:1.2}}>{fullName}</div>
            {myRelation&&<div style={{fontSize:10,color:C.red,marginTop:2,fontWeight:600}}>{myRelation}</div>}
            <div style={{fontSize:11,color:C.gray,marginTop:1}}>{[c.role,c.company].filter(Boolean).join(" · ")}</div>
            <div style={{fontSize:10,color:C.gray}}>{[[c.location_city,c.region,c.country].filter(Boolean).join(", "),sectors.join(" / "),c.last_interaction].filter(Boolean).join(" · ")}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{flex:1,height:3,background:C.grayLight,borderRadius:2}}><div style={{width:score+"%",height:"100%",background:hcol,borderRadius:2}}/></div>
          <span style={{fontSize:10,color:hcol,fontWeight:700}}>Santé {score}</span>
        </div>
        <div style={{display:"flex",margin:"0 -16px",overflowX:"auto"}}>
          {["brief","psyché","relation","réseau","historique","média"].map(t=>{
            const active=tab===t;
            return(<button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"8px 2px",background:"none",border:"none",borderBottom:"2px solid "+(active?C.red:"transparent"),color:active?C.red:C.gray,fontSize:10,fontWeight:active?600:400,cursor:"pointer",textTransform:"capitalize",fontFamily:"Inter,sans-serif",whiteSpace:"nowrap",minWidth:48}}>{t}</button>);
          })}
        </div>
      </div>

      <div style={{flex:1,padding:"12px 16px",overflowY:"auto"}}>
        {tab==="brief"&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:C.redSoft,borderRadius:10,padding:"10px 12px",borderLeft:"3px solid "+C.red}}>
            <div style={{fontSize:9,color:C.red,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4,fontWeight:600}}>Levier principal</div>
            <div style={{display:"flex",gap:7,alignItems:"center"}}>
              <span style={{fontSize:16}}>{mainLever.icon}</span>
              <div><div style={{fontSize:12,fontWeight:700,color:C.red,textTransform:"capitalize"}}>{c.primary_lever||"–"}</div><div style={{fontSize:10,color:C.gray,marginTop:1}}>{mainLever.desc}</div></div>
            </div>
          </div>
          {(c.discussion_points||[]).length>0&&(
            <div style={{background:"#F7F7F7",borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Points de discussion</div>
              {(c.discussion_points||[]).map((p,i)=>(<div key={i} style={{display:"flex",gap:6,fontSize:12,color:C.blackSoft,marginBottom:4,lineHeight:1.4}}><span style={{color:C.red,flexShrink:0}}>·</span>{p}</div>))}
            </div>
          )}
          {(c.topics_to_avoid||[]).length>0&&(
            <div><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5,fontWeight:600}}>À éviter</div>{(c.topics_to_avoid||[]).map((t,i)=>(<div key={i} style={{display:"flex",gap:6,fontSize:12,color:"#999",marginBottom:3}}><span style={{color:C.red}}>✕</span>{t}</div>))}</div>
          )}
          {(c.hobbies||[]).length>0&&(
            <div><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5,fontWeight:600}}>Intérêts</div><div>{(c.hobbies||[]).map(h=><Tag key={h}>{h}</Tag>)}</div></div>
          )}
          {c.notes&&(
            <div style={{background:"#F7F7F7",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4,fontWeight:600}}>Note</div><div style={{fontSize:12,color:C.blackSoft,lineHeight:1.6}}>{c.notes}</div></div>
          )}
        </div>)}

        {tab==="psyché"&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:"#F7F7F7",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>Ego dominant</div>
            <div style={{fontSize:12,fontWeight:700,color:C.red,textTransform:"capitalize"}}>{c.ego_type||"–"}</div>
          </div>
          <div style={{background:"#F7F7F7",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:7,fontWeight:600}}>Hiérarchie des leviers</div>
            {leverRows.length===0&&<div style={{fontSize:11,color:C.gray}}>Aucun levier défini</div>}
            {leverRows.map((l,i)=>{
              const cfg=LEVER_CONFIG[l.key]||{icon:"·",desc:""};
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:10,fontWeight:800,color:l.color,width:18}}>{l.tier}</span>
                  <span style={{fontSize:13}}>{cfg.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:l.color,textTransform:"capitalize"}}>{l.key}</div>
                    <div style={{fontSize:9,color:C.gray}}>{cfg.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {c.current_desire&&(
            <div style={{background:"#F7F7F7",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3,fontWeight:600}}>Désir actuel</div><div style={{fontSize:12,color:C.blackSoft,lineHeight:1.5}}>{c.current_desire}</div></div>
          )}
          {c.red_lines&&(
            <div style={{background:C.red+"08",border:"1px solid "+C.redMid,borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:9,color:C.red,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3,fontWeight:600}}>Ligne rouge</div><div style={{fontSize:12,color:C.red,lineHeight:1.5}}>{c.red_lines}</div></div>
          )}
          {(c.web_insights||[]).length>0&&(
            <div style={{background:"#F0F4FF",border:"1px solid rgba(26,74,138,0.15)",borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:9,color:C.blue,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:7,fontWeight:600}}>🔎 Sources & recherches (via Anansi bot)</div>
              {(c.web_insights||[]).map((ins,i)=>(
                <div key={i} style={{marginBottom:i<(c.web_insights.length-1)?8:0}}>
                  <div style={{fontSize:12,color:C.blackSoft,lineHeight:1.4}}>{ins.text}</div>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginTop:2}}>
                    <span style={{fontSize:9,color:C.gray}}>{ins.date}{ins.source==="internal"?" · trouvé dans une autre fiche":""}</span>
                    {ins.url&&<a href={ins.url} target="_blank" rel="noreferrer" style={{fontSize:9,color:C.blue,textDecoration:"underline"}}>Source ↗</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>)}

        {tab==="relation"&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{textAlign:"center",padding:"4px 0 8px"}}><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>Santé globale</div><div style={{fontSize:38,fontWeight:800,color:hcol,letterSpacing:"-0.04em"}}>{score}</div></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}><Ring value={c.sentiment_score??5} color={C.blue} label="Sentiment"/><Ring value={c.reliability_score??5} color={C.green} label="Fiabilité"/><Ring value={c.utility_score??5} color={C.amber} label="Utilité"/><Ring value={c.influence_score??5} color={C.purple} label="Influence"/></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}><Ring value={c.reciprocity_score??5} color={C.red} label="Réciprocité"/><Ring value={c.momentum_score??5} color={C.blue} label="Momentum"/><Ring value={c.potential_score??5} color={C.green} label="Potentiel"/><Ring value={Math.max(0,(c.relational_debt??0)+5)} max={10} color={(c.relational_debt??0)<0?C.red:C.green} label="Dette"/></div>
          {(c.reminders||[]).length>0&&(
            <div><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Rappels</div>
              {(c.reminders||[]).map((r,i)=>{
                const bg=r.urgent?C.red+"08":"#F7F7F7";
                const bd="1px solid "+(r.urgent?C.redMid:C.grayLight);
                return(<div key={i} style={{display:"flex",gap:8,background:bg,border:bd,borderRadius:8,padding:"8px 10px",marginBottom:4}}><div style={{width:5,height:5,borderRadius:"50%",background:r.urgent?C.red:C.amber,flexShrink:0,marginTop:4}}/><div><div style={{fontSize:11,color:C.black}}>{r.message}</div><div style={{fontSize:9,color:C.gray,marginTop:1}}>{r.due}</div></div></div>);
              })}
            </div>
          )}
        </div>)}

        {tab==="réseau"&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Relations directes</div>
            {(c.related||[]).map((r,i)=>(
              <div key={i} onClick={()=>{if(r.known){const f=contacts.find(x=>String(x.id)===String(r.id));if(f)onSelect(f);}}} style={{display:"flex",alignItems:"center",gap:8,background:"#F7F7F7",borderRadius:8,padding:"8px 10px",marginBottom:4,cursor:r.known?"pointer":"default",border:"1px solid "+C.grayLight}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:r.known?C.red:C.grayLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:r.known?"#fff":C.gray,flexShrink:0}}>{r.initials||"?"}</div>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:C.black}}>{r.name}</div><div style={{fontSize:10,color:C.gray}}>{r.role}</div></div>
                <span style={{fontSize:9,padding:"2px 7px",borderRadius:10,background:C.gray+"12",color:C.gray}}>{r.type}</span>
              </div>
            ))}
            {(c.related||[]).length===0&&<div style={{fontSize:12,color:C.gray,textAlign:"center",padding:"8px 0"}}>Aucune relation annexe</div>}
          </div>
          <div><div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Connexions dans ta base</div>
            {contacts.filter(x=>connSet.has(String(x.id))).map((r,i)=>{
              const owned=(c.connections||[]).map(String).includes(String(r.id));
              const relType=(c.connection_types||{})[String(r.id)]||"";
              const isOpen=openRelEditor===String(r.id);
              return(
                <div key={i} style={{background:"#F7F7F7",borderRadius:8,padding:"8px 10px",marginBottom:4,border:"1px solid "+C.grayLight}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>onSelect(r)}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:C.red,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>{r.initials||"?"}</div>
                    <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:C.black}}>{r.first_name} {r.last_name}</div><div style={{fontSize:10,color:C.gray}}>{r.role}</div></div>
                    <span style={{fontSize:11,color:C.gray}}>→</span>
                  </div>
                  <div style={{marginTop:6,paddingLeft:36}} onClick={e=>e.stopPropagation()}>
                    {owned?(
                      <button onClick={()=>setOpenRelEditor(isOpen?null:String(r.id))} style={{fontSize:9,padding:"3px 9px",borderRadius:10,background:relType?C.red+"12":C.bgSoft,color:relType?C.red:C.gray,border:"1px solid "+(relType?C.redMid:C.grayLight),cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:600}}>
                        {relType||"Définir la relation"} {isOpen?"▲":"▼"}
                      </button>
                    ):(
                      <span style={{fontSize:9,color:C.gray,fontStyle:"italic"}}>connexion entrante — définie depuis la fiche de {r.first_name}</span>
                    )}
                    {owned&&isOpen&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6}}>
                        {RELATION_TYPES.map(rt=>{
                          const active=relType===rt;
                          const rtBorder="1px solid "+(active?C.red:C.grayLight);
                          return(<button key={rt} onClick={()=>{onUpdate({connection_types:{...(c.connection_types||{}),[String(r.id)]:rt}});setOpenRelEditor(null);}} style={{padding:"3px 9px",borderRadius:20,fontSize:10,cursor:"pointer",fontFamily:"Inter,sans-serif",background:active?C.red:"#fff",color:active?"#fff":C.gray,border:rtBorder}}>{rt}</button>);
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {contacts.filter(x=>connSet.has(String(x.id))).length===0&&<div style={{fontSize:12,color:C.gray,textAlign:"center",padding:"8px 0"}}>Aucune connexion</div>}
          </div>
          {shouldMeet.length>0&&(<div>
            <div style={{fontSize:9,color:C.green,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:700}}>✦ Devrait rencontrer</div>
            {shouldMeet.slice(0,6).map((r,i)=>{
              const sSec=contactSectors(c),oSec=contactSectors(r);
              const commonSector=oSec.find(s=>sSec.includes(s));
              const sharedH=(r.hobbies||[]).filter(h=>(c.hobbies||[]).includes(h));
              const reason=commonSector?"Même secteur: "+commonSector:(sharedH.length>0?"Intérêts communs: "+sharedH.join(", "):"Profil complémentaire");
              return(<div key={i} onClick={()=>onSelect(r)} style={{display:"flex",alignItems:"center",gap:8,background:"#F0FFF6",borderRadius:8,padding:"8px 10px",marginBottom:4,cursor:"pointer",border:"1px solid rgba(26,122,74,0.15)"}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:C.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>{r.initials||"?"}</div>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:C.black}}>{r.first_name} {r.last_name}</div><div style={{fontSize:10,color:C.green}}>{reason}</div></div>
                <span style={{fontSize:9,padding:"2px 7px",borderRadius:10,background:"rgba(26,122,74,0.12)",color:C.green}}>Introduire</span>
              </div>);
            })}
          </div>)}
        </div>)}

        {tab==="historique"&&(<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {(c.interactions||[]).map((inter,i)=>(
            <div key={i} style={{borderLeft:"2px solid "+C.red+"40",paddingLeft:10,marginBottom:4}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:10,fontWeight:600,color:C.red,background:C.red+"12",padding:"2px 7px",borderRadius:10}}>{inter.type}</span><span style={{fontSize:10,color:C.gray}}>{inter.date}</span></div>
              <div style={{fontSize:12,color:C.black,lineHeight:1.5,marginBottom:inter.follow_up?6:0}}>{inter.summary}</div>
              {inter.follow_up&&(<div style={{display:"flex",gap:5,background:C.amber+"10",borderRadius:6,padding:"5px 8px"}}><span style={{color:C.amber,fontSize:11}}>→</span><div style={{fontSize:11,color:C.amber}}>{inter.follow_up}</div></div>)}
            </div>
          ))}
          {(c.interactions||[]).length===0&&<div style={{fontSize:12,color:C.gray,textAlign:"center",padding:"12px 0"}}>Aucune interaction — le bot WhatsApp les ajoutera automatiquement.</div>}
        </div>)}

        {tab==="média"&&<MediaGallery contact={c} onUpdate={onUpdate}/>}
      </div>

      <div style={{padding:"10px 16px",borderTop:"1px solid "+C.grayLight,display:"flex",gap:8,flexShrink:0,position:"relative"}}>
        <button style={{flex:2,padding:10,background:C.red,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Contacter</button>
        <button onClick={()=>setShowActionMenu(p=>!p)} style={{flex:1,padding:10,background:"#F7F7F7",border:"1px solid "+C.grayLight,borderRadius:10,color:C.black,fontSize:13,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Modifier</button>
        {showActionMenu&&(
          <>
            <div onClick={()=>setShowActionMenu(false)} style={{position:"fixed",inset:0,zIndex:60}}/>
            <div style={{position:"absolute",right:16,bottom:56,background:C.bg,border:"1px solid "+C.grayLight,borderRadius:12,boxShadow:"0 8px 28px rgba(0,0,0,0.15)",zIndex:61,overflow:"hidden",minWidth:200}}>
              <button onClick={()=>{setShowActionMenu(false);setShowEditModal(true);}} style={{width:"100%",textAlign:"left",padding:"12px 16px",background:"none",border:"none",cursor:"pointer",fontSize:13,color:C.black,fontFamily:"Inter,sans-serif",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid "+C.grayLight}}>✎ Modifier les informations</button>
              <button onClick={()=>{
                setShowActionMenu(false);
                if(window.confirm("Supprimer définitivement la carte de "+(c.first_name||"")+" "+(c.last_name||"")+" ? Cette action est irréversible.")){
                  onDelete&&onDelete();
                }
              }} style={{width:"100%",textAlign:"left",padding:"12px 16px",background:"none",border:"none",cursor:"pointer",fontSize:13,color:C.red,fontWeight:600,fontFamily:"Inter,sans-serif",display:"flex",alignItems:"center",gap:8}}>🗑 Supprimer la carte</button>
            </div>
          </>
        )}
      </div>
      {showEditModal&&(
        <EditContactModal
          contact={c}
          contacts={contacts}
          existingGroups={[...new Set(contacts.flatMap(x=>x.groups||[]))].sort()}
          existingCompanies={[...new Set(contacts.map(x=>x.company).filter(Boolean))].sort()}
          existingCountries={[...new Set(contacts.map(x=>x.country).filter(Boolean))].sort()}
          existingRegions={[...new Set(contacts.map(x=>x.region).filter(Boolean))].sort()}
          existingCities={[...new Set(contacts.map(x=>x.location_city).filter(Boolean))].sort()}
          existingTags={[...new Set(contacts.flatMap(x=>x.tags||[]))].sort()}
          onClose={()=>setShowEditModal(false)}
          onSave={async(patch)=>{await onUpdate(patch);setShowEditModal(false);}}
        />
      )}
    </div>
  );
}

// ── MODAL ÉDITION CONTACT ──────────────────────────────────────────────────────
function EditContactModal({contact,contacts,onClose,onSave,existingGroups,existingCompanies,existingCountries,existingRegions,existingCities,existingTags}){
  const c=contact;
  const others=contacts.filter(x=>String(x.id)!==String(c.id));
  const [customSectors,setCustomSectors]=useState([]);
  const [newSector,setNewSector]=useState("");
  const [showNewSector,setShowNewSector]=useState(false);
  const [customGroups,setCustomGroups]=useState([]);
  const [newGroup,setNewGroup]=useState("");
  const [showNewGroup,setShowNewGroup]=useState(false);
  const [connSearch,setConnSearch]=useState("");
  const [saving,setSaving]=useState(false);
  const [tab,setTab]=useState("identite");
  const [photoData,setPhotoData]=useState(c.photo_url||"");
  const [photoErr,setPhotoErr]=useState(false);
  const photoRef=useRef(null);
  const [form,setForm]=useState({
    genre:c.genre||"M",first_name:c.first_name||"",last_name:c.last_name||"",
    alias:c.alias||"",maiden_name:c.maiden_name||"",
    role:c.role||"",company:c.company||"",sectors:contactSectors(c),
    location_city:c.location_city||"",country:c.country||"",region:c.region||"",
    country_code:c.country_code||"+230",
    phone:(c.phone||"").replace(c.country_code||"+230","").trim(),
    email:c.email||"",linkedin:c.linkedin||"",
    hobbies:(c.hobbies||[]).join(", "),
    discussion_points:(c.discussion_points||[]).join("\n"),
    topics_to_avoid:(c.topics_to_avoid||[]).join("\n"),
    notes:c.notes||"",tags:(c.tags||[]).join(", "),
    primary_lever:c.primary_lever||"",secondary_lever:c.secondary_lever||"",tertiary_lever:c.tertiary_lever||"",
    ego_type:c.ego_type||"",
    current_desire:c.current_desire||"",red_lines:c.red_lines||"",
    utility_score:c.utility_score??5,sentiment_score:c.sentiment_score??5,reliability_score:c.reliability_score??5,
    known_personally:!!c.known_personally,my_relation:c.my_relation||[],
    groups:c.groups||[],
    connections:(c.connections||[]).map(String),
    connection_types:{...(c.connection_types||{})},
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const toggleMulti=(k,v)=>setForm(f=>({...f,[k]:f[k].includes(v)?f[k].filter(x=>x!==v):[...f[k],v]}));
  const allSectors=[...SECTORS_DEFAULT,...customSectors];
  const allGroups=[...(existingGroups||[]),...customGroups];

  const pickPhoto=async(file)=>{
    if(!file)return;
    const data=await fileToResizedDataURL(file,320,0.82);
    setPhotoData(data);setPhotoErr(false);
  };

  const handleSave=async()=>{
    if(!form.first_name.trim()||!form.last_name.trim())return;
    setSaving(true);
    const orEmpty=(v)=>v&&v.trim?(v.trim()||null):(v||null);
    const patch={
      genre:form.genre,first_name:form.first_name.trim(),last_name:form.last_name.trim(),
      alias:form.alias,maiden_name:form.maiden_name,
      role:form.role,company:form.company,
      sectors:form.sectors,sector:form.sectors[0]||"",
      location_city:form.location_city,country:form.country,region:form.region,
      country_code:form.country_code,
      phone:form.phone?form.country_code+" "+form.phone:"",
      email:form.email,linkedin:form.linkedin,
      hobbies:form.hobbies.split(",").map(h=>h.trim()).filter(Boolean),
      discussion_points:form.discussion_points.split("\n").map(h=>h.trim()).filter(Boolean),
      topics_to_avoid:form.topics_to_avoid.split("\n").map(h=>h.trim()).filter(Boolean),
      notes:form.notes,tags:form.tags.split(",").map(h=>h.trim()).filter(Boolean),
      primary_lever:orEmpty(form.primary_lever),secondary_lever:orEmpty(form.secondary_lever),tertiary_lever:orEmpty(form.tertiary_lever),
      ego_type:orEmpty(form.ego_type),
      current_desire:form.current_desire,red_lines:form.red_lines,
      utility_score:Number(form.utility_score),sentiment_score:Number(form.sentiment_score),reliability_score:Number(form.reliability_score),
      known_personally:form.known_personally,my_relation:form.my_relation,
      groups:form.groups,
      connections:form.connections,
      connection_types:form.connection_types,
      photo_url:photoData,
      initials:(form.first_name[0]||"")+(form.last_name[0]||""),
    };
    await onSave(patch);
    setSaving(false);
  };

  const inp={width:"100%",padding:"10px 12px",background:"#F7F7F7",border:"1px solid "+C.grayLight,borderRadius:8,color:C.black,fontSize:13,fontFamily:"Inter,sans-serif",outline:"none",transition:"border-color 0.15s"};
  const lbl={fontSize:10,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:5,fontWeight:600};
  const field=(l,k,type,ph)=>(
    <div style={{marginBottom:12}}>
      <label style={lbl}>{l}</label>
      <input type={type||"text"} value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph||""} style={inp}
        onFocus={e=>e.target.style.borderColor=C.red} onBlur={e=>e.target.style.borderColor=C.grayLight}/>
    </div>
  );
  const textarea=(l,k,ph,rows)=>(
    <div style={{marginBottom:12}}>
      <label style={lbl}>{l}</label>
      <textarea value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph||""} rows={rows||3}
        style={{...inp,resize:"vertical"}}
        onFocus={e=>e.target.style.borderColor=C.red} onBlur={e=>e.target.style.borderColor=C.grayLight}/>
    </div>
  );
  const chipRow=(l,k,options,multi,exclude)=>(
    <div style={{marginBottom:12}}>
      <label style={lbl}>{l}</label>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {options.filter(o=>!(exclude||[]).includes(o)).map(o=>{
          const active=multi?form[k].includes(o):form[k]===o;
          const chipBorder="1px solid "+(active?C.red:C.grayLight);
          return(<button key={o} onClick={()=>multi?toggleMulti(k,o):set(k,form[k]===o?"":o)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif",background:active?C.red:"#F7F7F7",color:active?"#fff":C.black,border:chipBorder,transition:"all 0.15s"}}>{o}</button>);
        })}
      </div>
    </div>
  );
  const scoreSlider=(l,k)=>(
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
        <label style={{...lbl,marginBottom:0}}>{l}</label>
        <span style={{fontSize:13,fontWeight:700,color:healthColor(form[k]*10)}}>{form[k]}</span>
      </div>
      <input type="range" min={0} max={10} value={form[k]} onChange={e=>set(k,Number(e.target.value))} style={{width:"100%",accentColor:C.red,cursor:"pointer"}}/>
    </div>
  );

  const tabs=[["identite","Identité"],["psyche","Psyché"],["metriques","Métriques"],["connexions","Connexions"]];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100,backdropFilter:"blur(2px)"}}>
      <div style={{background:C.bg,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:520,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 -8px 40px rgba(0,0,0,0.15)",animation:"slideUp 0.3s cubic-bezier(0.34,1.1,0.64,1)"}}>
        <style>{"@keyframes slideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}"}</style>
        <div style={{padding:"20px 20px 0",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:17,fontWeight:800,color:C.black}}>Modifier {c.first_name} {c.last_name}</div>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.gray,lineHeight:1,padding:4}}>×</button>
          </div>
          <div style={{display:"flex",gap:4,marginBottom:14,overflowX:"auto"}}>
            {tabs.map(([k,l])=>{
              const active=tab===k;
              return(<button key={k} onClick={()=>setTab(k)} style={{padding:"7px 12px",borderRadius:8,border:"none",background:active?C.red:"#F7F7F7",color:active?"#fff":C.gray,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"Inter,sans-serif",whiteSpace:"nowrap"}}>{l}</button>);
            })}
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"0 20px"}}>
          {tab==="identite"&&(
            <>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div onClick={()=>photoRef.current&&photoRef.current.click()} style={{width:56,height:56,borderRadius:"50%",background:photoData?"transparent":C.bgSoft,border:photoData?"2px solid transparent":"2px dashed "+C.grayLight,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",flexShrink:0}}>
                  {photoData&&!photoErr?<img src={photoData} alt="" onError={()=>setPhotoErr(true)} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:18,color:C.gray}}>📷</span>}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:C.black}}>Photo de profil</div>
                  <div style={{fontSize:10,color:C.gray}}>Cliquer pour changer</div>
                </div>
                <input ref={photoRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>pickPhoto(e.target.files[0])}/>
              </div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Genre</label>
                <div style={{display:"flex",gap:8}}>
                  {[{v:"M",l:"M."},{v:"F",l:"Mme"}].map(({v,l})=>{
                    const active=form.genre===v;
                    const gBorder="1px solid "+(active?C.red:C.grayLight);
                    return(<button key={v} onClick={()=>set("genre",v)} style={{flex:1,padding:9,borderRadius:8,cursor:"pointer",fontFamily:"Inter,sans-serif",fontSize:13,fontWeight:600,border:gBorder,background:active?C.redSoft:C.bgSoft,color:active?C.red:C.gray,transition:"all 0.15s"}}>{l}</button>);
                  })}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div>{field("Prénom *","first_name")}</div>
                <div>{field("Nom *","last_name")}</div>
              </div>
              {field("Alias / Surnom","alias")}
              {form.genre==="F"&&field("Nom de jeune fille","maiden_name")}
              {chipRow("Ma relation avec cette personne (multi)","my_relation",RELATION_TYPES,true)}
              {field("Poste","role")}
              <AutocompleteField label="Entreprise" value={form.company} onChange={v=>set("company",v)} suggestions={existingCompanies||[]} placeholder="Nexus Capital" inp={inp} lbl={lbl}/>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Secteurs (multi)</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
                  {allSectors.map(o=>{
                    const active=form.sectors.includes(o);
                    const sBorder="1px solid "+(active?C.red:C.grayLight);
                    return(<button key={o} onClick={()=>toggleMulti("sectors",o)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif",background:active?C.red:"#F7F7F7",color:active?"#fff":C.black,border:sBorder,transition:"all 0.15s"}}>{o}</button>);
                  })}
                  <button onClick={()=>setShowNewSector(p=>!p)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif",background:"none",color:C.red,border:"1px dashed "+C.red}}>+ Ajouter</button>
                </div>
                {showNewSector&&(
                  <div style={{display:"flex",gap:6}}>
                    <input value={newSector} onChange={e=>setNewSector(e.target.value)} placeholder="Nouveau secteur..." style={{...inp,flex:1}}
                      onKeyDown={e=>{if(e.key==="Enter"&&newSector.trim()){const s=newSector.trim();setCustomSectors(p=>[...p,s]);setForm(f=>({...f,sectors:[...f.sectors,s]}));setNewSector("");setShowNewSector(false);}}}/>
                    <button onClick={()=>{if(newSector.trim()){const s=newSector.trim();setCustomSectors(p=>[...p,s]);setForm(f=>({...f,sectors:[...f.sectors,s]}));setNewSector("");setShowNewSector(false);}}} style={{padding:"10px 14px",background:C.red,border:"none",borderRadius:8,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>OK</button>
                  </div>
                )}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <AutocompleteField label="Pays" value={form.country} onChange={v=>set("country",v)} suggestions={existingCountries||[]} placeholder="Maurice" inp={inp} lbl={lbl}/>
                <AutocompleteField label="Région" value={form.region} onChange={v=>set("region",v)} suggestions={existingRegions||[]} placeholder="Plaines Wilhems" inp={inp} lbl={lbl}/>
              </div>
              <AutocompleteField label="Ville" value={form.location_city} onChange={v=>set("location_city",v)} suggestions={existingCities||[]} placeholder="Grand Baie" inp={inp} lbl={lbl}/>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Groupes / Associations (multi)</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
                  {allGroups.map(o=>{
                    const active=form.groups.includes(o);
                    const gBorder2="1px solid "+(active?C.purple:C.grayLight);
                    return(<button key={o} onClick={()=>toggleMulti("groups",o)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif",background:active?C.purple:"#F7F7F7",color:active?"#fff":C.black,border:gBorder2,transition:"all 0.15s"}}>{o}</button>);
                  })}
                  <button onClick={()=>setShowNewGroup(p=>!p)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif",background:"none",color:C.purple,border:"1px dashed "+C.purple}}>+ Créer</button>
                </div>
                {showNewGroup&&(
                  <div style={{display:"flex",gap:6}}>
                    <input value={newGroup} onChange={e=>setNewGroup(e.target.value)} placeholder="Nom du groupe..." style={{...inp,flex:1}}
                      onKeyDown={e=>{if(e.key==="Enter"&&newGroup.trim()){const g=newGroup.trim();setCustomGroups(p=>[...p,g]);setForm(f=>({...f,groups:[...f.groups,g]}));setNewGroup("");setShowNewGroup(false);}}}/>
                    <button onClick={()=>{if(newGroup.trim()){const g=newGroup.trim();setCustomGroups(p=>[...p,g]);setForm(f=>({...f,groups:[...f.groups,g]}));setNewGroup("");setShowNewGroup(false);}}} style={{padding:"10px 14px",background:C.purple,border:"none",borderRadius:8,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>OK</button>
                  </div>
                )}
              </div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Téléphone</label>
                <div style={{display:"flex",gap:6}}>
                  <select value={form.country_code} onChange={e=>set("country_code",e.target.value)} style={{...inp,width:"auto",flexShrink:0,paddingRight:8,cursor:"pointer"}}>
                    {COUNTRY_CODES.map(cc=>(<option key={cc.code} value={cc.code}>{cc.flag} {cc.code}</option>))}
                  </select>
                  <input type="tel" value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="5xxx xxxx" style={inp} onFocus={e=>e.target.style.borderColor=C.red} onBlur={e=>e.target.style.borderColor=C.grayLight}/>
                </div>
              </div>
              {field("Email","email","email")}
              {field("LinkedIn","linkedin")}
              <div style={{marginBottom:12}}>
                <label style={lbl}>Connu personnellement</label>
                <div style={{display:"flex",gap:8}}>
                  {[{v:true,l:"Oui"},{v:false,l:"Non — indirect"}].map(({v,l})=>{
                    const active=form.known_personally===v;
                    const kBorder="1px solid "+(active?C.red:C.grayLight);
                    return(<button key={String(v)} onClick={()=>set("known_personally",v)} style={{flex:1,padding:9,borderRadius:8,cursor:"pointer",fontFamily:"Inter,sans-serif",fontSize:12,fontWeight:500,border:kBorder,background:active?C.redSoft:C.bgSoft,color:active?C.red:C.gray,transition:"all 0.15s"}}>{l}</button>);
                  })}
                </div>
              </div>
            </>
          )}

          {tab==="psyche"&&(
            <>
              {chipRow("Ego dominant","ego_type",EGOS,false)}
              {chipRow("Levier principal (1º)","primary_lever",LEVERS,false)}
              {chipRow("Levier secondaire (2º)","secondary_lever",LEVERS,false,[form.primary_lever].filter(Boolean))}
              {chipRow("Levier tertiaire (3º)","tertiary_lever",LEVERS,false,[form.primary_lever,form.secondary_lever].filter(Boolean))}
              {field("Désir actuel","current_desire")}
              {field("Ligne rouge","red_lines")}
              {textarea("Points de discussion","discussion_points","Un point par ligne...",3)}
              {textarea("Sujets à éviter","topics_to_avoid","Un sujet par ligne...",2)}
              {field("Hobbies & Intérêts","hobbies","text","Golf, Voile, Gastronomie (virgules)")}
              {field("Tags libres","tags","text","à recontacter, VIP, sportif (virgules)")}
              {(existingTags||[]).length>0&&(
                <div style={{marginBottom:12,marginTop:-6}}>
                  <div style={{fontSize:9,color:C.gray,marginBottom:5}}>Tags existants (clique pour ajouter)</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {(existingTags||[]).map(t=>(
                      <button key={t} onClick={()=>{
                        const current=form.tags.split(",").map(s=>s.trim()).filter(Boolean);
                        if(!current.includes(t))set("tags",[...current,t].join(", "));
                      }} style={{padding:"3px 9px",borderRadius:20,fontSize:11,cursor:"pointer",fontFamily:"Inter,sans-serif",background:"#F7F7F7",color:C.gray,border:"1px solid "+C.grayLight}}>{t}</button>
                    ))}
                  </div>
                </div>
              )}
              {textarea("Notes personnelles","notes","",3)}
            </>
          )}

          {tab==="metriques"&&(
            <>
              {scoreSlider("Utilité — Pertinence pour mes objectifs","utility_score")}
              {scoreSlider("Sentiment — Mon appréciation personnelle","sentiment_score")}
              {scoreSlider("Fiabilité — Niveau de confiance","reliability_score")}
            </>
          )}

          {tab==="connexions"&&(
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:C.gray,lineHeight:1.5,marginBottom:10}}>Gère les connexions de ce contact et le type de relation qui les lie.</div>
              <div style={{position:"relative",marginBottom:10}}>
                <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:C.gray,fontSize:12}}>⌕</span>
                <input value={connSearch} onChange={e=>setConnSearch(e.target.value)} placeholder="Rechercher un contact..." style={{...inp,paddingLeft:28}}/>
              </div>
              {others.filter(ec=>((ec.first_name||"")+" "+(ec.last_name||"")+" "+(ec.company||"")).toLowerCase().includes(connSearch.toLowerCase())).length===0&&(
                <div style={{textAlign:"center",padding:20,color:C.gray,fontSize:12,background:"#F7F7F7",borderRadius:10}}>Aucun contact correspondant.</div>
              )}
              {others.filter(ec=>((ec.first_name||"")+" "+(ec.last_name||"")+" "+(ec.company||"")).toLowerCase().includes(connSearch.toLowerCase())).map(ec=>{
                const sel=form.connections.includes(String(ec.id));
                const cardBorder="1px solid "+(sel?"rgba(26,122,74,0.3)":C.grayLight);
                const btnBorder="1px solid "+(sel?C.green:C.grayLight);
                const currentType=form.connection_types[String(ec.id)]||"";
                return(
                  <div key={ec.id} style={{background:sel?"#F0FFF6":"#F7F7F7",border:cardBorder,borderRadius:10,padding:"10px 12px",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:sel?8:0}}>
                      <div style={{width:30,height:30,borderRadius:"50%",background:sel?C.green:C.grayLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:sel?"#fff":C.gray,flexShrink:0}}>{ec.initials||"?"}</div>
                      <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:C.black}}>{ec.first_name} {ec.last_name}</div><div style={{fontSize:10,color:C.gray}}>{ec.role}</div></div>
                      <button onClick={()=>{
                        if(sel){
                          set("connections",form.connections.filter(x=>x!==String(ec.id)));
                          const nt={...form.connection_types};delete nt[String(ec.id)];set("connection_types",nt);
                        }else{
                          set("connections",[...form.connections,String(ec.id)]);
                        }
                      }} style={{padding:"5px 10px",borderRadius:8,border:btnBorder,background:sel?"rgba(26,122,74,0.1)":"none",color:sel?C.green:C.gray,fontSize:11,cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:600}}>{sel?"✓ Lié":"+ Lier"}</button>
                    </div>
                    {sel&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:5,paddingLeft:40}}>
                        {RELATION_TYPES.map(rt=>{
                          const active=currentType===rt;
                          const rtBorder="1px solid "+(active?C.green:C.grayLight);
                          return(<button key={rt} onClick={()=>set("connection_types",{...form.connection_types,[String(ec.id)]:rt})} style={{padding:"3px 9px",borderRadius:20,fontSize:10,cursor:"pointer",fontFamily:"Inter,sans-serif",background:active?C.green:"#fff",color:active?"#fff":C.gray,border:rtBorder,transition:"all 0.15s"}}>{rt}</button>);
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div style={{height:16}}/>
        </div>

        <div style={{padding:"12px 20px 28px",borderTop:"1px solid "+C.grayLight,display:"flex",gap:8,flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,padding:12,background:"#F7F7F7",border:"1px solid "+C.grayLight,borderRadius:12,color:C.black,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{flex:2,padding:12,background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:700,cursor:saving?"default":"pointer",fontFamily:"Inter,sans-serif",opacity:saving?0.6:1}}>{saving?"Enregistrement...":"✓ Enregistrer les modifications"}</button>
        </div>
      </div>
    </div>
  );
}

// ── HEX FAB ────────────────────────────────────────────────────────────────────
function HexFAB({onClick}){
  const [hovered,setHovered]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{position:"fixed",bottom:24,right:20,width:56,height:56,background:hovered?C.redLight:C.red,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",clipPath:"polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",boxShadow:"0 4px 20px rgba(204,0,0,0.4)",transition:"background 0.15s, transform 0.15s",transform:hovered?"scale(1.08)":"scale(1)",zIndex:30,WebkitTapHighlightColor:"transparent"}}
      aria-label="Ajouter un contact">
      <span style={{fontSize:26,color:"#fff",lineHeight:1,fontWeight:300}}>+</span>
    </button>
  );
}

// ── CHAT ANANSI (widget flottant — même cerveau que le bot WhatsApp) ──────────
function ChatWidget(){
  const [open,setOpen]=useState(false);
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [loadedHistory,setLoadedHistory]=useState(false);
  const scrollRef=useRef(null);

  useEffect(()=>{
    if(open&&!loadedHistory){
      setLoadedHistory(true);
      fetch("/api/chat-history").then(r=>r.json()).then(d=>{
        if(d&&d.messages)setMessages(d.messages.map(m=>({role:m.role,content:m.content,channel:m.channel})));
      }).catch(()=>{});
    }
  },[open,loadedHistory]);

  useEffect(()=>{
    if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;
  },[messages,loading]);

  const send=async()=>{
    const text=input.trim();
    if(!text||loading)return;
    setInput("");
    setMessages(prev=>[...prev,{role:"user",content:text,channel:"app"}]);
    setLoading(true);
    try{
      const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text})});
      const data=await res.json();
      setMessages(prev=>[...prev,{role:"bot",content:data.reply||"(pas de réponse)",channel:"app"}]);
    }catch(e){
      setMessages(prev=>[...prev,{role:"bot",content:"Erreur de connexion au bot. Réessaie dans un instant.",channel:"app"}]);
    }finally{
      setLoading(false);
    }
  };

  return(
    <>
      <button onClick={()=>setOpen(p=>!p)} style={{position:"fixed",bottom:24,left:20,width:52,height:52,borderRadius:"50%",background:open?C.black:C.red,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(0,0,0,0.25)",zIndex:30,WebkitTapHighlightColor:"transparent",transition:"background 0.15s"}}
        aria-label="Chat Anansi">
        <span style={{fontSize:20,color:"#fff"}}>{open?"×":"💬"}</span>
      </button>

      {open&&(
        <div style={{position:"fixed",bottom:86,left:20,width:340,maxWidth:"calc(100vw - 40px)",height:460,maxHeight:"calc(100vh - 140px)",background:C.bg,borderRadius:16,boxShadow:"0 12px 40px rgba(0,0,0,0.2)",border:"1px solid "+C.grayLight,display:"flex",flexDirection:"column",overflow:"hidden",zIndex:31}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.grayLight,display:"flex",alignItems:"center",gap:8,background:C.black}}>
            <Logo size={22}/>
            <div>
              <div style={{fontSize:12,fontWeight:800,color:"#fff"}}>Anansi</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.5)"}}>Assistant CRM — même fil que WhatsApp</div>
            </div>
          </div>

          <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
            {messages.length===0&&!loading&&(
              <div style={{fontSize:11,color:C.gray,textAlign:"center",marginTop:20,lineHeight:1.6}}>
                Parle-moi d'un contact ("Arjun cherche un poste à Londres"), ou tape <b>"interview"</b> pour que je te pose des questions et complète ta base petit à petit.
              </div>
            )}
            {messages.map((m,i)=>(
              <div key={i} style={{alignSelf:m.role==="user"?"flex-end":"flex-start",maxWidth:"85%"}}>
                <div style={{background:m.role==="user"?C.red:"#F7F7F7",color:m.role==="user"?"#fff":C.black,padding:"8px 12px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",fontSize:12,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{m.content}</div>
                {m.channel==="whatsapp"&&<div style={{fontSize:8,color:C.gray,marginTop:2,textAlign:m.role==="user"?"right":"left"}}>via WhatsApp</div>}
              </div>
            ))}
            {loading&&(
              <div style={{alignSelf:"flex-start",background:"#F7F7F7",padding:"8px 12px",borderRadius:"14px 14px 14px 4px",fontSize:12,color:C.gray}}>Anansi réfléchit...</div>
            )}
          </div>

          <div style={{padding:10,borderTop:"1px solid "+C.grayLight,display:"flex",gap:6}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send();}} placeholder="Écris un message..." style={{flex:1,padding:"9px 11px",background:"#F7F7F7",border:"1px solid "+C.grayLight,borderRadius:20,fontSize:12,outline:"none",fontFamily:"Inter,sans-serif",color:C.black}}/>
            <button onClick={send} disabled={loading||!input.trim()} style={{width:36,height:36,borderRadius:"50%",background:(loading||!input.trim())?C.grayLight:C.red,border:"none",color:"#fff",fontSize:14,cursor:(loading||!input.trim())?"default":"pointer",flexShrink:0}}>↑</button>
          </div>
        </div>
      )}
    </>
  );
}

// ── CHAMP AVEC AUTOCOMPLÉTION (ex: Entreprise) ─────────────────────────────────
function AutocompleteField({label,value,onChange,suggestions,placeholder,inp,lbl}){
  const [open,setOpen]=useState(false);
  const filtered=value.trim()
    ?(suggestions||[]).filter(s=>s.toLowerCase().includes(value.trim().toLowerCase())&&s.toLowerCase()!==value.trim().toLowerCase())
    :[];
  return(
    <div style={{marginBottom:12,position:"relative"}}>
      <label style={lbl}>{label}</label>
      <input
        value={value}
        onChange={e=>{onChange(e.target.value);setOpen(true);}}
        onFocus={()=>setOpen(true)}
        onBlur={()=>setTimeout(()=>setOpen(false),150)}
        placeholder={placeholder||""}
        style={inp}
      />
      {open&&filtered.length>0&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1px solid "+C.grayLight,borderRadius:8,marginTop:4,zIndex:30,maxHeight:160,overflowY:"auto",boxShadow:"0 6px 18px rgba(0,0,0,0.12)"}}>
          {filtered.slice(0,6).map(s=>(
            <button key={s} onMouseDown={()=>{onChange(s);setOpen(false);}} style={{display:"flex",alignItems:"center",gap:6,width:"100%",textAlign:"left",padding:"8px 12px",background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.black,fontFamily:"Inter,sans-serif"}}>
              <span style={{color:C.gray,fontSize:11}}>🏢</span>{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MODAL NOUVEAU CONTACT (4 étapes) ──────────────────────────────────────────
function AddContactModal({onClose,onSave,existingContacts,existingGroups,existingCompanies,existingCountries,existingRegions,existingCities,existingTags}){
  const list=existingContacts||[];
  const [step,setStep]=useState(1);
  const [customSectors,setCustomSectors]=useState([]);
  const [newSector,setNewSector]=useState("");
  const [showNewSector,setShowNewSector]=useState(false);
  const [customGroups,setCustomGroups]=useState([]);
  const [newGroup,setNewGroup]=useState("");
  const [showNewGroup,setShowNewGroup]=useState(false);
  const [connSearch,setConnSearch]=useState("");
  const [photoData,setPhotoData]=useState("");
  const photoRef=useRef(null);
  const [form,setForm]=useState({
    genre:"M",first_name:"",last_name:"",alias:"",maiden_name:"",
    role:"",company:"",sectors:[],location_city:"",country:"",region:"",
    country_code:"+230",phone:"",email:"",linkedin:"",
    hobbies:"",discussion_points:"",topics_to_avoid:"",notes:"",tags:"",
    primary_lever:"",secondary_lever:"",tertiary_lever:"",ego_type:"",
    current_desire:"",red_lines:"",
    utility_score:5,sentiment_score:5,reliability_score:5,
    known_personally:true,my_relation:[],groups:[],
    selected_connections:[],
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const toggleMulti=(k,v)=>setForm(f=>({...f,[k]:f[k].includes(v)?f[k].filter(x=>x!==v):[...f[k],v]}));
  const allSectors=[...SECTORS_DEFAULT,...customSectors];
  const allGroups=[...(existingGroups||[]),...customGroups];
  const isStep1Valid=form.first_name.trim()&&form.last_name.trim();

  const pickPhoto=async(file)=>{
    if(!file)return;
    const data=await fileToResizedDataURL(file,320,0.82);
    setPhotoData(data);
  };

  const handleSave=()=>{
    const {selected_connections,...rest}=form;
    const orEmpty=(v)=>(v&&v.trim?(v.trim()||null):(v||null));
    const connection_types={};
    selected_connections.forEach(sc=>{if(sc.relation_type)connection_types[String(sc.id)]=sc.relation_type;});
    const contact={
      ...rest,
      sector:form.sectors[0]||"",
      photo_url:photoData,
      media:[],
      primary_lever:orEmpty(form.primary_lever),
      secondary_lever:orEmpty(form.secondary_lever),
      tertiary_lever:orEmpty(form.tertiary_lever),
      ego_type:orEmpty(form.ego_type),
      initials:(form.first_name[0]||"")+(form.last_name[0]||""),
      hobbies:form.hobbies.split(",").map(h=>h.trim()).filter(Boolean),
      discussion_points:form.discussion_points.split("\n").map(h=>h.trim()).filter(Boolean),
      topics_to_avoid:form.topics_to_avoid.split("\n").map(h=>h.trim()).filter(Boolean),
      phone:form.phone?form.country_code+" "+form.phone:"",
      connections:selected_connections.map(x=>x.id),
      connection_types,
      related:[],interactions:[],reminders:[],tags:form.tags.split(",").map(h=>h.trim()).filter(Boolean),
      utility_score:Number(form.utility_score),
      sentiment_score:Number(form.sentiment_score),
      reliability_score:Number(form.reliability_score),
      influence_score:5,reciprocity_score:5,momentum_score:5,potential_score:5,relational_debt:0,
    };
    onSave(contact);
    onClose();
  };

  const inp={width:"100%",padding:"10px 12px",background:"#F7F7F7",border:"1px solid "+C.grayLight,borderRadius:8,color:C.black,fontSize:13,fontFamily:"Inter,sans-serif",outline:"none",transition:"border-color 0.15s"};
  const lbl={fontSize:10,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:5,fontWeight:600};
  const field=(l,k,type,ph)=>(
    <div style={{marginBottom:12}}>
      <label style={lbl}>{l}</label>
      <input type={type||"text"} value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph||""} style={inp}
        onFocus={e=>e.target.style.borderColor=C.red} onBlur={e=>e.target.style.borderColor=C.grayLight}/>
    </div>
  );
  const textarea=(l,k,ph,rows)=>(
    <div style={{marginBottom:12}}>
      <label style={lbl}>{l}</label>
      <textarea value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph||""} rows={rows||3}
        style={{...inp,resize:"vertical"}}
        onFocus={e=>e.target.style.borderColor=C.red} onBlur={e=>e.target.style.borderColor=C.grayLight}/>
    </div>
  );
  const chipRow=(l,k,options,multi,exclude)=>(
    <div style={{marginBottom:12}}>
      <label style={lbl}>{l}</label>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {options.filter(o=>!(exclude||[]).includes(o)).map(o=>{
          const active=multi?form[k].includes(o):form[k]===o;
          const chipBorder="1px solid "+(active?C.red:C.grayLight);
          return(<button key={o} onClick={()=>multi?toggleMulti(k,o):set(k,form[k]===o?"":o)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif",background:active?C.red:"#F7F7F7",color:active?"#fff":C.black,border:chipBorder,transition:"all 0.15s"}}>{o}</button>);
        })}
      </div>
    </div>
  );
  const scoreSlider=(l,k)=>(
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
        <label style={{...lbl,marginBottom:0}}>{l}</label>
        <span style={{fontSize:13,fontWeight:700,color:healthColor(form[k]*10)}}>{form[k]}</span>
      </div>
      <input type="range" min={0} max={10} value={form[k]} onChange={e=>set(k,Number(e.target.value))} style={{width:"100%",accentColor:C.red,cursor:"pointer"}}/>
    </div>
  );
  const TOTAL=4;
  const stepTitles=["Identité","Psyché & Leviers","Métriques","Connexions"];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100,backdropFilter:"blur(2px)"}}>
      <div style={{background:C.bg,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:520,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 -8px 40px rgba(0,0,0,0.15)",animation:"slideUp 0.3s cubic-bezier(0.34,1.1,0.64,1)"}}>
        <style>{"@keyframes slideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}"}</style>
        <div style={{padding:"20px 20px 0",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <div style={{fontSize:17,fontWeight:800,color:C.black}}>Nouveau contact</div>
              <div style={{fontSize:11,color:C.gray,marginTop:2}}>{stepTitles[step-1]} — étape {step}/{TOTAL}</div>
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:C.gray,lineHeight:1,padding:4}}>×</button>
          </div>
          <div style={{display:"flex",gap:4,marginBottom:20}}>
            {[1,2,3,4].map(s=>(<div key={s} style={{flex:1,height:3,borderRadius:2,background:s<=step?C.red:C.grayLight,transition:"background 0.3s ease"}}/>))}
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"0 20px"}}>
          {step===1&&(
            <>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div onClick={()=>photoRef.current&&photoRef.current.click()} style={{width:56,height:56,borderRadius:"50%",background:photoData?"transparent":C.bgSoft,border:photoData?"2px solid transparent":"2px dashed "+C.grayLight,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",flexShrink:0}}>
                  {photoData?<img src={photoData} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:18,color:C.gray}}>📷</span>}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:C.black}}>Photo de profil</div>
                  <div style={{fontSize:10,color:C.gray}}>Optionnel — les lunettes la captureront plus tard</div>
                </div>
                <input ref={photoRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>pickPhoto(e.target.files[0])}/>
              </div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Genre</label>
                <div style={{display:"flex",gap:8}}>
                  {[{v:"M",l:"M."},{v:"F",l:"Mme"}].map(({v,l})=>{
                    const active=form.genre===v;
                    const gBorder="1px solid "+(active?C.red:C.grayLight);
                    return(<button key={v} onClick={()=>set("genre",v)} style={{flex:1,padding:9,borderRadius:8,cursor:"pointer",fontFamily:"Inter,sans-serif",fontSize:13,fontWeight:600,border:gBorder,background:active?C.redSoft:C.bgSoft,color:active?C.red:C.gray,transition:"all 0.15s"}}>{l}</button>);
                  })}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div>{field("Prénom *","first_name","text","Arjun")}</div>
                <div>{field("Nom *","last_name","text","Mehta")}</div>
              </div>
              {field("Alias / Surnom","alias","text","Ex: Tony, JP...")}
              {form.genre==="F"&&field("Nom de jeune fille","maiden_name","text","Nom de naissance")}
              {chipRow("Ma relation avec cette personne (multi)","my_relation",RELATION_TYPES,true)}
              {field("Poste","role","text","CEO")}
              <AutocompleteField label="Entreprise" value={form.company} onChange={v=>set("company",v)} suggestions={(existingCompanies||[]).filter(c=>c!==contact.company)} placeholder="Nexus Capital" inp={inp} lbl={lbl}/>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Secteurs (multi)</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
                  {allSectors.map(o=>{
                    const active=form.sectors.includes(o);
                    const sBorder="1px solid "+(active?C.red:C.grayLight);
                    return(<button key={o} onClick={()=>toggleMulti("sectors",o)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif",background:active?C.red:"#F7F7F7",color:active?"#fff":C.black,border:sBorder,transition:"all 0.15s"}}>{o}</button>);
                  })}
                  <button onClick={()=>setShowNewSector(p=>!p)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif",background:"none",color:C.red,border:"1px dashed "+C.red}}>+ Ajouter</button>
                </div>
                {showNewSector&&(
                  <div style={{display:"flex",gap:6}}>
                    <input value={newSector} onChange={e=>setNewSector(e.target.value)} placeholder="Nouveau secteur..." style={{...inp,flex:1}}
                      onKeyDown={e=>{if(e.key==="Enter"&&newSector.trim()){const s=newSector.trim();setCustomSectors(p=>[...p,s]);setForm(f=>({...f,sectors:[...f.sectors,s]}));setNewSector("");setShowNewSector(false);}}}/>
                    <button onClick={()=>{if(newSector.trim()){const s=newSector.trim();setCustomSectors(p=>[...p,s]);setForm(f=>({...f,sectors:[...f.sectors,s]}));setNewSector("");setShowNewSector(false);}}} style={{padding:"10px 14px",background:C.red,border:"none",borderRadius:8,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>OK</button>
                  </div>
                )}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <AutocompleteField label="Pays" value={form.country} onChange={v=>set("country",v)} suggestions={(existingCountries||[]).filter(x=>x!==c.country)} placeholder="Maurice" inp={inp} lbl={lbl}/>
                <AutocompleteField label="Région" value={form.region} onChange={v=>set("region",v)} suggestions={(existingRegions||[]).filter(x=>x!==c.region)} placeholder="Plaines Wilhems" inp={inp} lbl={lbl}/>
              </div>
              <AutocompleteField label="Ville" value={form.location_city} onChange={v=>set("location_city",v)} suggestions={(existingCities||[]).filter(x=>x!==c.location_city)} placeholder="Grand Baie" inp={inp} lbl={lbl}/>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Groupes / Associations (multi)</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
                  {allGroups.map(o=>{
                    const active=form.groups.includes(o);
                    const gBorder2="1px solid "+(active?C.purple:C.grayLight);
                    return(<button key={o} onClick={()=>toggleMulti("groups",o)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif",background:active?C.purple:"#F7F7F7",color:active?"#fff":C.black,border:gBorder2,transition:"all 0.15s"}}>{o}</button>);
                  })}
                  <button onClick={()=>setShowNewGroup(p=>!p)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif",background:"none",color:C.purple,border:"1px dashed "+C.purple}}>+ Créer</button>
                </div>
                {showNewGroup&&(
                  <div style={{display:"flex",gap:6}}>
                    <input value={newGroup} onChange={e=>setNewGroup(e.target.value)} placeholder="Nom du groupe..." style={{...inp,flex:1}}
                      onKeyDown={e=>{if(e.key==="Enter"&&newGroup.trim()){const g=newGroup.trim();setCustomGroups(p=>[...p,g]);setForm(f=>({...f,groups:[...f.groups,g]}));setNewGroup("");setShowNewGroup(false);}}}/>
                    <button onClick={()=>{if(newGroup.trim()){const g=newGroup.trim();setCustomGroups(p=>[...p,g]);setForm(f=>({...f,groups:[...f.groups,g]}));setNewGroup("");setShowNewGroup(false);}}} style={{padding:"10px 14px",background:C.purple,border:"none",borderRadius:8,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>OK</button>
                  </div>
                )}
              </div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Téléphone</label>
                <div style={{display:"flex",gap:6}}>
                  <select value={form.country_code} onChange={e=>set("country_code",e.target.value)} style={{...inp,width:"auto",flexShrink:0,paddingRight:8,cursor:"pointer"}}>
                    {COUNTRY_CODES.map(cc=>(<option key={cc.code} value={cc.code}>{cc.flag} {cc.code}</option>))}
                  </select>
                  <input type="tel" value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="5xxx xxxx" style={inp} onFocus={e=>e.target.style.borderColor=C.red} onBlur={e=>e.target.style.borderColor=C.grayLight}/>
                </div>
              </div>
              {field("Email","email","email","arjun@nexus.mu")}
              {field("LinkedIn","linkedin","text","linkedin.com/in/...")}
              <div style={{marginBottom:12}}>
                <label style={lbl}>Connu personnellement</label>
                <div style={{display:"flex",gap:8}}>
                  {[{v:true,l:"Oui"},{v:false,l:"Non — indirect"}].map(({v,l})=>{
                    const active=form.known_personally===v;
                    const kBorder="1px solid "+(active?C.red:C.grayLight);
                    return(<button key={String(v)} onClick={()=>set("known_personally",v)} style={{flex:1,padding:9,borderRadius:8,cursor:"pointer",fontFamily:"Inter,sans-serif",fontSize:12,fontWeight:500,border:kBorder,background:active?C.redSoft:C.bgSoft,color:active?C.red:C.gray,transition:"all 0.15s"}}>{l}</button>);
                  })}
                </div>
              </div>
            </>
          )}

          {step===2&&(
            <>
              {chipRow("Ego dominant","ego_type",EGOS,false)}
              {chipRow("Levier principal (1º)","primary_lever",LEVERS,false)}
              {chipRow("Levier secondaire (2º)","secondary_lever",LEVERS,false,[form.primary_lever].filter(Boolean))}
              {chipRow("Levier tertiaire (3º)","tertiary_lever",LEVERS,false,[form.primary_lever,form.secondary_lever].filter(Boolean))}
              {field("Désir actuel","current_desire","text","Ce qu'il cherche en ce moment...")}
              {field("Ligne rouge","red_lines","text","Ce qu'il ne faut jamais faire ou dire...")}
              {textarea("Points de discussion","discussion_points","Un point par ligne...",3)}
              {textarea("Sujets à éviter","topics_to_avoid","Un sujet par ligne...",2)}
              {field("Hobbies & Intérêts","hobbies","text","Golf, Voile, Gastronomie (virgules)")}
              {field("Tags libres","tags","text","à recontacter, VIP, sportif (virgules)")}
              {(existingTags||[]).length>0&&(
                <div style={{marginBottom:12,marginTop:-6}}>
                  <div style={{fontSize:9,color:C.gray,marginBottom:5}}>Tags existants (clique pour ajouter)</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {(existingTags||[]).map(t=>(
                      <button key={t} onClick={()=>{
                        const current=form.tags.split(",").map(s=>s.trim()).filter(Boolean);
                        if(!current.includes(t))set("tags",[...current,t].join(", "));
                      }} style={{padding:"3px 9px",borderRadius:20,fontSize:11,cursor:"pointer",fontFamily:"Inter,sans-serif",background:"#F7F7F7",color:C.gray,border:"1px solid "+C.grayLight}}>{t}</button>
                    ))}
                  </div>
                </div>
              )}
              {textarea("Notes personnelles","notes","Contexte, observations...",3)}
            </>
          )}

          {step===3&&(
            <>
              <div style={{background:C.redSoft,borderRadius:12,padding:"12px 14px",marginBottom:16,borderLeft:"3px solid "+C.red}}>
                <div style={{fontSize:11,color:C.red,fontWeight:600,marginBottom:4}}>Métriques subjectives</div>
                <div style={{fontSize:11,color:C.gray,lineHeight:1.5}}>Scores privés. Ils alimentent le score de santé de la relation.</div>
              </div>
              {scoreSlider("Utilité — Pertinence pour mes objectifs","utility_score")}
              {scoreSlider("Sentiment — Mon appréciation personnelle","sentiment_score")}
              {scoreSlider("Fiabilité — Niveau de confiance","reliability_score")}
              <div style={{background:"#F7F7F7",borderRadius:12,padding:14,marginBottom:12}}>
                <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10,fontWeight:600}}>Aperçu</div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:C.red,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff",flexShrink:0,overflow:"hidden"}}>
                    {photoData?<img src={photoData} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>{(form.first_name[0]||"?")+(form.last_name[0]||"")}</span>}
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:C.black}}>{form.genre==="F"?"Mme":"M."} {form.first_name||"Prénom"} {form.last_name||"Nom"}</div>
                    <div style={{fontSize:11,color:C.red}}>{[form.role,form.company].filter(Boolean).join(" · ")||"Poste · Entreprise"}</div>
                    {form.sectors.length>0&&<div style={{fontSize:10,color:C.gray}}>{form.sectors.join(" / ")}</div>}
                  </div>
                </div>
              </div>
            </>
          )}

          {step===4&&(
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:C.gray,lineHeight:1.5,marginBottom:10}}>Lie ce contact à des personnes déjà dans ta base, avec le type de relation entre eux.</div>
              {list.length>0&&(
                <div style={{position:"relative",marginBottom:10}}>
                  <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:C.gray,fontSize:12}}>⌕</span>
                  <input value={connSearch} onChange={e=>setConnSearch(e.target.value)} placeholder="Rechercher un contact..." style={{...inp,paddingLeft:28}}/>
                </div>
              )}
              {list.length===0&&(
                <div style={{textAlign:"center",padding:20,color:C.gray,fontSize:12,background:"#F7F7F7",borderRadius:10}}>Aucun contact existant pour l'instant.</div>
              )}
              {list.filter(ec=>((ec.first_name||"")+" "+(ec.last_name||"")+" "+(ec.company||"")).toLowerCase().includes(connSearch.toLowerCase())).map(ec=>{
                const sel=form.selected_connections.find(x=>String(x.id)===String(ec.id));
                const cardBg=sel?"#F0FFF6":"#F7F7F7";
                const cardBorder=sel?"1px solid rgba(26,122,74,0.3)":"1px solid "+C.grayLight;
                const btnBorder=sel?"1px solid "+C.green:"1px solid "+C.grayLight;
                return(
                  <div key={ec.id} style={{background:cardBg,border:cardBorder,borderRadius:10,padding:"10px 12px",marginBottom:8,transition:"all 0.15s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:sel?8:0}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:sel?C.green:C.grayLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:sel?"#fff":C.gray,flexShrink:0}}>{ec.initials||"?"}</div>
                      <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:C.black}}>{ec.first_name} {ec.last_name}</div><div style={{fontSize:10,color:C.gray}}>{ec.role}</div></div>
                      <button onClick={()=>{
                        if(sel){set("selected_connections",form.selected_connections.filter(x=>String(x.id)!==String(ec.id)));}
                        else{set("selected_connections",[...form.selected_connections,{id:ec.id,relation_type:""}]);}
                      }} style={{padding:"5px 10px",borderRadius:8,border:btnBorder,background:sel?"rgba(26,122,74,0.1)":"none",color:sel?C.green:C.gray,fontSize:11,cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:600}}>
                        {sel?"✓ Lié":"+ Lier"}
                      </button>
                    </div>
                    {sel&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:5,paddingLeft:42}}>
                        {RELATION_TYPES.map(rt=>{
                          const active=sel.relation_type===rt;
                          const rtBorder="1px solid "+(active?C.green:C.grayLight);
                          return(<button key={rt} onClick={()=>set("selected_connections",form.selected_connections.map(x=>String(x.id)===String(ec.id)?{...x,relation_type:rt}:x))} style={{padding:"3px 9px",borderRadius:20,fontSize:10,cursor:"pointer",fontFamily:"Inter,sans-serif",background:active?C.green:"#fff",color:active?"#fff":C.gray,border:rtBorder,transition:"all 0.15s"}}>{rt}</button>);
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {form.selected_connections.length>0&&(
                <div style={{background:C.green+"10",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(26,122,74,0.2)"}}>
                  <div style={{fontSize:11,color:C.green,fontWeight:600}}>{form.selected_connections.length} connexion(s) sélectionnée(s)</div>
                </div>
              )}
            </div>
          )}
          <div style={{height:16}}/>
        </div>

        <div style={{padding:"12px 20px 28px",borderTop:"1px solid "+C.grayLight,display:"flex",gap:8,flexShrink:0}}>
          {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:12,background:"#F7F7F7",border:"1px solid "+C.grayLight,borderRadius:12,color:C.black,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>← Retour</button>}
          {step<TOTAL?(
            <button onClick={()=>{if(step===1&&!isStep1Valid)return;setStep(s=>s+1);}} style={{flex:2,padding:12,background:(step===1&&!isStep1Valid)?"rgba(204,0,0,0.3)":C.red,border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:700,cursor:(step===1&&!isStep1Valid)?"not-allowed":"pointer",fontFamily:"Inter,sans-serif",transition:"background 0.15s"}}>Continuer →</button>
          ):(
            <button onClick={handleSave} style={{flex:2,padding:12,background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>✓ Créer la carte</button>
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
  const inp={width:"100%",padding:"11px 14px",background:"#F7F7F7",border:"1px solid "+C.grayLight,borderRadius:8,color:C.black,fontSize:13,fontFamily:"Inter,sans-serif",outline:"none"};
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Inter,-apple-system,sans-serif",padding:20}}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box;}input:focus{border-color:#CC0000!important;}input::placeholder{color:#BBB;}@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}"}</style>
      <div style={{display:"flex",alignItems:"center",gap:40,animation:"fadeUp 0.5s ease",width:"100%",maxWidth:520,justifyContent:"center"}}>
        <div style={{width:320,animation:shake?"shake 0.4s ease":"none"}}>
          <div style={{textAlign:"center",marginBottom:28}}><Logo size={64}/><div style={{fontSize:28,fontWeight:900,color:C.black,marginTop:12,letterSpacing:"-0.01em",textTransform:"uppercase"}}>ANANSI <span style={{color:C.red}}>I:R.</span></div></div>
          <div style={{background:C.bg,border:"1px solid "+C.grayLight,borderRadius:16,padding:"28px 24px",boxShadow:"0 2px 20px rgba(0,0,0,0.06)"}}>
            <div style={{marginBottom:14}}><label style={{fontSize:10,color:C.gray,letterSpacing:"0.08em",textTransform:"uppercase",display:"block",marginBottom:5}}>Identifiant</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.com" style={inp}/></div>
            <div style={{marginBottom:20}}><label style={{fontSize:10,color:C.gray,letterSpacing:"0.08em",textTransform:"uppercase",display:"block",marginBottom:5}}>Mot de passe</label><input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" style={inp}/></div>
            <button onClick={tryLogin} style={{width:"100%",padding:12,background:C.red,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}
              onMouseEnter={e=>e.target.style.background=C.redLight} onMouseLeave={e=>e.target.style.background=C.red}>Connexion</button>
          </div>
          {seq.length>0&&<div style={{height:1,background:C.grayLight,borderRadius:1,marginTop:14,overflow:"hidden"}}><div style={{height:"100%",width:(seq.length/SECRET.length)*100+"%",background:C.red,transition:"width 0.2s ease"}}/></div>}
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

// ── DASHBOARD STATS (vue d'aperçu réseau) ─────────────────────────────────────
function DashboardStats({contacts,tasks,onSelectContact}){
  const total=contacts.length;
  const known=contacts.filter(c=>c.known_personally).length;
  const edgeSet=new Set();
  contacts.forEach(c=>(c.connections||[]).forEach(cid=>{
    const a=String(c.id),b=String(cid);
    edgeSet.add(a<b?a+"|"+b:b+"|"+a);
  }));
  const relations=edgeSet.size;
  const knownC=contacts.filter(c=>c.known_personally);
  const trust=knownC.length?Math.round(knownC.reduce((s,c)=>s+(c.reliability_score??5),0)/knownC.length*10):0;
  const avgHealth=total?Math.round(contacts.reduce((s,c)=>s+healthScore(c),0)/total):0;
  const lowMomentum=contacts.filter(c=>(c.momentum_score??5)<=4);
  const watchlist=contacts.filter(c=>healthScore(c)<50).sort((a,b)=>healthScore(a)-healthScore(b));
  const urgentTasks=tasks.filter(t=>t.urgent);
  const sectorCount={};
  contacts.forEach(c=>contactSectors(c).forEach(s=>{sectorCount[s]=(sectorCount[s]||0)+1;}));
  const topSectors=Object.entries(sectorCount).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxSector=topSectors.length?topSectors[0][1]:1;

  const stat=(label,value,color,sub)=>(
    <div style={{background:C.bg,border:"1px solid "+C.grayLight,borderRadius:12,padding:"12px 14px"}}>
      <div style={{fontSize:22,fontWeight:800,color:color||C.black,letterSpacing:"-0.02em"}}>{value}</div>
      <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.07em",marginTop:2}}>{label}</div>
      {sub&&<div style={{fontSize:9,color:C.gray,marginTop:2}}>{sub}</div>}
    </div>
  );

  return(
    <div style={{padding:16,overflowY:"auto",height:"100%",background:"#FAFAFA"}}>
      <div style={{fontSize:15,fontWeight:800,color:C.black,marginBottom:12}}>Dashboard réseau</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8,marginBottom:16}}>
        {stat("Contacts",total)}
        {stat("Connus perso",known)}
        {stat("Relations",relations)}
        {stat("Trust global",trust+"%",trust>=70?C.green:trust>=50?C.amber:C.red,"Fiabilité moyenne")}
        {stat("Santé moyenne",avgHealth,healthColor(avgHealth))}
        {stat("Momentum faible",lowMomentum.length,lowMomentum.length>0?C.amber:C.green,"À relancer")}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12,marginBottom:16}}>
        <div style={{background:C.bg,border:"1px solid "+C.grayLight,borderRadius:12,padding:14}}>
          <div style={{fontSize:10,fontWeight:700,color:C.red,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>⚠ Tâches urgentes ({urgentTasks.length})</div>
          {urgentTasks.length===0&&<div style={{fontSize:11,color:C.gray}}>Rien d'urgent 🎉</div>}
          {urgentTasks.slice(0,5).map((t,i)=>(
            <div key={i} onClick={()=>onSelectContact(t.contact)} style={{display:"flex",gap:8,padding:"7px 8px",borderRadius:8,cursor:"pointer",background:C.redSoft,marginBottom:5,alignItems:"center"}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:C.red,color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{t.contact.initials||"?"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,color:C.black,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.message}</div>
                <div style={{fontSize:9,color:C.gray}}>{t.contact.first_name} {t.contact.last_name}{t.due?" · "+t.due:""}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{background:C.bg,border:"1px solid "+C.grayLight,borderRadius:12,padding:14}}>
          <div style={{fontSize:10,fontWeight:700,color:C.amber,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>👁 À surveiller ({watchlist.length})</div>
          {watchlist.length===0&&<div style={{fontSize:11,color:C.gray}}>Toutes les relations sont saines</div>}
          {watchlist.slice(0,5).map((c,i)=>{
            const sc=healthScore(c);
            return(
              <div key={i} onClick={()=>onSelectContact(c)} style={{display:"flex",gap:8,padding:"7px 8px",borderRadius:8,cursor:"pointer",background:"#FFF8F0",marginBottom:5,alignItems:"center"}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:C.amber,color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{c.initials||"?"}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:C.black,fontWeight:600}}>{c.first_name} {c.last_name}</div>
                  <div style={{fontSize:9,color:C.gray}}>Santé {sc} · {(c.my_relation||[]).slice(0,2).join(", ")}</div>
                </div>
                <span style={{fontSize:11,fontWeight:800,color:healthColor(sc)}}>{sc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {topSectors.length>0&&(
        <div style={{background:C.bg,border:"1px solid "+C.grayLight,borderRadius:12,padding:14}}>
          <div style={{fontSize:10,fontWeight:700,color:C.black,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>Répartition par secteur</div>
          {topSectors.map(([s,n])=>(
            <div key={s} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:10,color:C.black,width:90,flexShrink:0}}>{s}</span>
              <div style={{flex:1,height:8,background:C.bgSoft,borderRadius:4,overflow:"hidden"}}>
                <div style={{width:(n/maxSector*100)+"%",height:"100%",background:C.red,borderRadius:4}}/>
              </div>
              <span style={{fontSize:10,color:C.gray,width:20,textAlign:"right"}}>{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DASHBOARD SHELL (sidebar rail + panneaux + logout) ─────────────────────────
function Dashboard({contacts,onSelect,selected,onDeselect,onSaveContact,onBulkImport,onUpdateContact,onDeleteContact,onLogout}){
  const [view,setView]=useState("graph");
  const [search,setSearch]=useState("");
  const [notifications,setNotifications]=useState(MOCK_NOTIFICATIONS);
  const [showNotifs,setShowNotifs]=useState(false);
  const [showImport,setShowImport]=useState(false);
  const [showAddContact,setShowAddContact]=useState(false);
  const [showAccountMenu,setShowAccountMenu]=useState(false);
  const [activeSection,setActiveSection]=useState(null); // dashboard | filters | tasks | partners | null
  const [filters,setFilters]=useState({sector:[],primary_lever:[],ego_type:[],known_personally:null,relation:[],groups:[],company:[],lastName:[],hobbies:[],country:[],region:[],city:[],tags:[]});
  const [partnersSector,setPartnersSector]=useState("");
  const [taskFocus,setTaskFocus]=useState(null);
  const [showCreateGroup,setShowCreateGroup]=useState(false);
  const [newGroupName,setNewGroupName]=useState("");
  const [newGroupIds,setNewGroupIds]=useState([]);
  const [groupPickerSearch,setGroupPickerSearch]=useState("");
  const windowWidth=useWindowWidth();
  const isMobile=windowWidth<768;

  const tasks=[];
  contacts.forEach(c=>{
    (c.reminders||[]).forEach(r=>tasks.push({contact:c,message:r.message,due:r.due||"",urgent:!!r.urgent,source:"rappel"}));
    (c.interactions||[]).forEach(it=>{if(it.follow_up)tasks.push({contact:c,message:it.follow_up,due:it.date||"",urgent:false,source:"suivi"});});
  });
  const urgentCount=tasks.filter(t=>t.urgent).length;

  const allSectorsInData=[...new Set(contacts.flatMap(c=>contactSectors(c)))].sort();
  const allGroupsInData=[...new Set(contacts.flatMap(c=>c.groups||[]))].sort();
  const allCompaniesInData=[...new Set(contacts.map(c=>c.company).filter(Boolean))].sort();
  const allCountriesInData=[...new Set(contacts.map(c=>c.country).filter(Boolean))].sort();
  const allRegionsInData=[...new Set(contacts.map(c=>c.region).filter(Boolean))].sort();
  const allCitiesInData=[...new Set(contacts.map(c=>c.location_city).filter(Boolean))].sort();
  const allTagsInData=[...new Set(contacts.flatMap(c=>c.tags||[]))].sort();
  const opts={
    sector:allSectorsInData,
    primary_lever:[...new Set(contacts.map(c=>c.primary_lever).filter(Boolean))],
    ego_type:[...new Set(contacts.map(c=>c.ego_type).filter(Boolean))],
    relation:[...new Set(contacts.flatMap(c=>c.my_relation||[]))].sort(),
    groups:allGroupsInData,
    company:allCompaniesInData,
    lastName:[...new Set(contacts.map(c=>c.last_name).filter(Boolean))].sort(),
    hobbies:[...new Set(contacts.flatMap(c=>c.hobbies||[]))].sort(),
    country:allCountriesInData,
    region:allRegionsInData,
    city:allCitiesInData,
    tags:allTagsInData,
  };
  const toggleFilter=(cat,val)=>setFilters(f=>({...f,[cat]:f[cat].includes(val)?f[cat].filter(x=>x!==val):[...f[cat],val]}));
  const activeFilterCount=filters.sector.length+filters.primary_lever.length+filters.ego_type.length+filters.relation.length+filters.groups.length+filters.company.length+filters.lastName.length+filters.hobbies.length+filters.country.length+filters.region.length+filters.city.length+filters.tags.length+(filters.known_personally!==null?1:0);
  const clearFilters=()=>setFilters({sector:[],primary_lever:[],ego_type:[],known_personally:null,relation:[],groups:[],company:[],lastName:[],hobbies:[],country:[],region:[],city:[],tags:[]});

  async function handleCreateGroup(){
    const name=newGroupName.trim();
    if(!name||newGroupIds.length===0)return;
    await Promise.all(newGroupIds.map(id=>{
      const target=contacts.find(c=>String(c.id)===String(id));
      if(!target)return Promise.resolve();
      const nextGroups=Array.from(new Set([...(target.groups||[]),name]));
      return onUpdateContact(id,{groups:nextGroups});
    }));
    setNewGroupName("");setNewGroupIds([]);setGroupPickerSearch("");setShowCreateGroup(false);
  }

  let filtered=contacts.filter(c=>{
    const textMatch=((c.first_name||"")+" "+(c.last_name||"")+" "+(c.company||"")+" "+contactSectors(c).join(" ")).toLowerCase().includes(search.toLowerCase());
    const sectorMatch=filters.sector.length===0||contactSectors(c).some(s=>filters.sector.includes(s));
    const leverMatch=filters.primary_lever.length===0||filters.primary_lever.includes(c.primary_lever);
    const egoMatch=filters.ego_type.length===0||filters.ego_type.includes(c.ego_type);
    const relMatch=filters.relation.length===0||(c.my_relation||[]).some(r=>filters.relation.includes(r));
    const groupMatch=filters.groups.length===0||(c.groups||[]).some(g=>filters.groups.includes(g));
    const companyMatch=filters.company.length===0||filters.company.includes(c.company);
    const lastNameMatch=filters.lastName.length===0||filters.lastName.includes(c.last_name);
    const hobbiesMatch=filters.hobbies.length===0||(c.hobbies||[]).some(h=>filters.hobbies.includes(h));
    const countryMatch=filters.country.length===0||filters.country.includes(c.country);
    const regionMatch=filters.region.length===0||filters.region.includes(c.region);
    const cityMatch=filters.city.length===0||filters.city.includes(c.location_city);
    const tagsMatch=filters.tags.length===0||(c.tags||[]).some(t=>filters.tags.includes(t));
    const knownMatch=filters.known_personally===null||c.known_personally===filters.known_personally;
    return textMatch&&sectorMatch&&leverMatch&&egoMatch&&relMatch&&groupMatch&&companyMatch&&lastNameMatch&&hobbiesMatch&&countryMatch&&regionMatch&&cityMatch&&tagsMatch&&knownMatch;
  });
  if(activeSection==="partners"){
    filtered=filtered.filter(c=>(c.my_relation||[]).some(r=>PRO_RELATIONS.includes(r))&&(partnersSector===""||contactSectors(c).includes(partnersSector)));
  }
  let highlightId=null;
  if(taskFocus){
    const f=contacts.find(x=>String(x.id)===String(taskFocus));
    if(f){
      const ids=connectedIdsOf(f,contacts);
      ids.add(String(f.id));
      filtered=contacts.filter(c=>ids.has(String(c.id)));
      highlightId=f.id;
    }
  }

  const unread=notifications.filter(n=>!n.read).length;
  const markRead=(id)=>setNotifications(prev=>prev.map(n=>n.id===id?{...n,read:true}:n));
  const handleNotifContact=(cid)=>{const c=contacts.find(x=>String(x.id)===String(cid));if(c){onSelect(c);setShowNotifs(false);}};

  const railItems=[
    {key:"dashboard",icon:"▦",label:"Dashboard"},
    {key:"filters",icon:"⊞",label:"Filtrer",badge:activeFilterCount},
    {key:"tasks",icon:"✓",label:"Tâches",badge:urgentCount,badgeColor:C.red},
    {key:"partners",icon:"◆",label:"Partenaires pro"},
  ];
  const sectionTitle={dashboard:"Dashboard",filters:"Filtrer",tasks:"Tâches & événements",partners:"Partenaires professionnels"};

  const checkRow=(active,label,count,onClick,dotColor)=>{
    const bg=active?C.red+"12":"transparent";
    return(
      <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"5px 7px",borderRadius:7,background:bg,border:"none",cursor:"pointer",marginBottom:3,textAlign:"left",fontFamily:"Inter,sans-serif"}}>
        {dotColor
          ?<div style={{width:8,height:8,borderRadius:"50%",background:dotColor,flexShrink:0}}/>
          :<div style={{width:12,height:12,borderRadius:3,border:"1.5px solid "+(active?C.red:C.grayLight),background:active?C.red:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{active&&<span style={{color:"#fff",fontSize:8,lineHeight:1}}>✓</span>}</div>
        }
        <span style={{fontSize:11,color:active?C.red:C.black,flex:1}}>{label}</span>
        {count!==undefined&&<span style={{fontSize:9,color:C.gray}}>{count}</span>}
      </button>
    );
  };

  const panelContent=()=>{
    if(activeSection==="filters")return(
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {activeFilterCount>0&&<button onClick={clearFilters} style={{fontSize:10,color:C.red,background:C.redSoft,border:"1px solid "+C.redMid,borderRadius:8,padding:6,cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:600}}>Effacer les filtres ({activeFilterCount})</button>}
        <div>
          <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Relation à moi</div>
          {checkRow(filters.known_personally===true,"Connu perso",undefined,()=>setFilters(f=>({...f,known_personally:f.known_personally===true?null:true})))}
          {checkRow(filters.known_personally===false,"Indirect",undefined,()=>setFilters(f=>({...f,known_personally:f.known_personally===false?null:false})))}
          {opts.relation.map(v=>checkRow(filters.relation.includes(v),v,contacts.filter(c=>(c.my_relation||[]).includes(v)).length,()=>toggleFilter("relation",v)))}
        </div>
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Groupes / Associations</span>
            <button onClick={()=>setShowCreateGroup(p=>!p)} style={{fontSize:9,color:C.purple,background:"none",border:"none",cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:700}}>{showCreateGroup?"× Annuler":"+ Créer"}</button>
          </div>
          {opts.groups.map(v=>checkRow(filters.groups.includes(v),v,contacts.filter(c=>(c.groups||[]).includes(v)).length,()=>toggleFilter("groups",v)))}
          {opts.groups.length===0&&!showCreateGroup&&<div style={{fontSize:10,color:C.gray,marginBottom:4}}>Aucun groupe pour l'instant</div>}
          {showCreateGroup&&(
            <div style={{background:"#fff",border:"1px solid "+C.grayLight,borderRadius:10,padding:10,marginTop:6}}>
              <input value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} placeholder="Nom du nouveau groupe..." style={{width:"100%",padding:"7px 9px",background:"#F7F7F7",border:"1px solid "+C.grayLight,borderRadius:7,fontSize:11,outline:"none",fontFamily:"Inter,sans-serif",color:C.black,marginBottom:8}}/>
              <input value={groupPickerSearch} onChange={e=>setGroupPickerSearch(e.target.value)} placeholder="Rechercher des contacts à ajouter..." style={{width:"100%",padding:"7px 9px",background:"#F7F7F7",border:"1px solid "+C.grayLight,borderRadius:7,fontSize:11,outline:"none",fontFamily:"Inter,sans-serif",color:C.black,marginBottom:8}}/>
              <div style={{maxHeight:160,overflowY:"auto",marginBottom:8}}>
                {contacts.filter(c=>((c.first_name||"")+" "+(c.last_name||"")).toLowerCase().includes(groupPickerSearch.toLowerCase())).map(c=>{
                  const checked=newGroupIds.includes(String(c.id));
                  return(
                    <button key={c.id} onClick={()=>setNewGroupIds(ids=>checked?ids.filter(x=>x!==String(c.id)):[...ids,String(c.id)])} style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"4px 6px",borderRadius:6,background:checked?C.purple+"12":"transparent",border:"none",cursor:"pointer",marginBottom:2,textAlign:"left",fontFamily:"Inter,sans-serif"}}>
                      <div style={{width:11,height:11,borderRadius:3,border:"1.5px solid "+(checked?C.purple:C.grayLight),background:checked?C.purple:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{checked&&<span style={{color:"#fff",fontSize:7,lineHeight:1}}>✓</span>}</div>
                      <span style={{fontSize:10,color:checked?C.purple:C.black}}>{c.first_name} {c.last_name}</span>
                    </button>
                  );
                })}
                {contacts.length===0&&<div style={{fontSize:10,color:C.gray}}>Aucun contact</div>}
              </div>
              <button onClick={handleCreateGroup} disabled={!newGroupName.trim()||newGroupIds.length===0} style={{width:"100%",padding:"7px",background:(!newGroupName.trim()||newGroupIds.length===0)?"rgba(106,13,173,0.3)":C.purple,border:"none",borderRadius:7,color:"#fff",fontSize:11,fontWeight:700,cursor:(!newGroupName.trim()||newGroupIds.length===0)?"not-allowed":"pointer",fontFamily:"Inter,sans-serif"}}>Créer le groupe ({newGroupIds.length})</button>
            </div>
          )}
        </div>
        {opts.company.length>0&&(
          <div>
            <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Entreprise</div>
            {opts.company.map(v=>checkRow(filters.company.includes(v),v,contacts.filter(c=>c.company===v).length,()=>toggleFilter("company",v)))}
          </div>
        )}
        {opts.lastName.length>0&&(
          <div>
            <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Famille (nom)</div>
            {opts.lastName.map(v=>checkRow(filters.lastName.includes(v),v,contacts.filter(c=>c.last_name===v).length,()=>toggleFilter("lastName",v)))}
          </div>
        )}
        {opts.hobbies.length>0&&(
          <div>
            <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Intérêts</div>
            {opts.hobbies.map(v=>checkRow(filters.hobbies.includes(v),v,contacts.filter(c=>(c.hobbies||[]).includes(v)).length,()=>toggleFilter("hobbies",v)))}
          </div>
        )}
        {opts.country.length>0&&(
          <div>
            <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Pays</div>
            {opts.country.map(v=>checkRow(filters.country.includes(v),v,contacts.filter(c=>c.country===v).length,()=>toggleFilter("country",v)))}
          </div>
        )}
        {opts.region.length>0&&(
          <div>
            <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Région</div>
            {opts.region.map(v=>checkRow(filters.region.includes(v),v,contacts.filter(c=>c.region===v).length,()=>toggleFilter("region",v)))}
          </div>
        )}
        {opts.city.length>0&&(
          <div>
            <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Ville</div>
            {opts.city.map(v=>checkRow(filters.city.includes(v),v,contacts.filter(c=>c.location_city===v).length,()=>toggleFilter("city",v)))}
          </div>
        )}
        {opts.tags.length>0&&(
          <div>
            <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Tags</div>
            {opts.tags.map(v=>checkRow(filters.tags.includes(v),v,contacts.filter(c=>(c.tags||[]).includes(v)).length,()=>toggleFilter("tags",v)))}
          </div>
        )}
        {opts.sector.length>0&&(
          <div>
            <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Secteur</div>
            {opts.sector.map(v=>checkRow(filters.sector.includes(v),v,contacts.filter(c=>contactSectors(c).includes(v)).length,()=>toggleFilter("sector",v)))}
          </div>
        )}
        {opts.primary_lever.length>0&&(
          <div>
            <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Levier principal</div>
            {opts.primary_lever.map(v=>checkRow(filters.primary_lever.includes(v),v,contacts.filter(c=>c.primary_lever===v).length,()=>toggleFilter("primary_lever",v)))}
          </div>
        )}
        {opts.ego_type.length>0&&(
          <div>
            <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,fontWeight:600}}>Ego</div>
            {opts.ego_type.map(v=>checkRow(filters.ego_type.includes(v),v,contacts.filter(c=>c.ego_type===v).length,()=>toggleFilter("ego_type",v)))}
          </div>
        )}
        <div style={{background:C.bgSoft,borderRadius:8,padding:"8px 10px"}}>
          <div style={{fontSize:10,color:C.black,fontWeight:600}}>{filtered.length} contact(s) affichés</div>
          <div style={{fontSize:9,color:C.gray}}>{contacts.length} au total</div>
        </div>
      </div>
    );
    if(activeSection==="tasks")return(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {taskFocus&&(
          <button onClick={()=>setTaskFocus(null)} style={{fontSize:10,color:C.red,background:C.redSoft,border:"1px solid "+C.redMid,borderRadius:8,padding:6,cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:600}}>× Quitter le focus</button>
        )}
        {tasks.length===0&&<div style={{fontSize:11,color:C.gray,textAlign:"center",padding:"14px 0"}}>Aucune tâche. Les rappels et follow-ups apparaîtront ici.</div>}
        {tasks.map((t,i)=>{
          const collat=contacts.filter(o=>String(o.id)!==String(t.contact.id)&&connectedIdsOf(t.contact,contacts).has(String(o.id)));
          const isFocus=String(taskFocus||"")===String(t.contact.id);
          const bg=t.urgent?C.redSoft:"#F7F7F7";
          const bd="1px solid "+(isFocus?C.red:C.grayLight);
          return(
            <div key={i} onClick={()=>setTaskFocus(isFocus?null:t.contact.id)} style={{background:bg,border:bd,borderRadius:10,padding:"9px 10px",cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                {t.urgent&&<span style={{fontSize:9,fontWeight:800,color:C.red}}>⚠</span>}
                <span style={{fontSize:11,color:C.black,fontWeight:600,flex:1,lineHeight:1.3}}>{t.message}</span>
              </div>
              <div style={{fontSize:9,color:C.gray}}>→ {t.contact.first_name} {t.contact.last_name}{t.due?" · "+t.due:""}</div>
              {collat.length>0&&(
                <div style={{fontSize:9,color:C.amber,marginTop:3}}>
                  Collatéraux : {collat.slice(0,3).map(o=>o.first_name).join(", ")}{collat.length>3?" +"+(collat.length-3):""}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
    if(activeSection==="partners"){
      const proContacts=contacts.filter(c=>(c.my_relation||[]).some(r=>PRO_RELATIONS.includes(r)));
      const proSectors=[...new Set(proContacts.flatMap(c=>contactSectors(c)))].sort();
      return(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:10,color:C.gray,lineHeight:1.4}}>Affiche uniquement : {PRO_RELATIONS.join(", ")}</div>
          <div>
            <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5,fontWeight:600}}>Secteur</div>
            <select value={partnersSector} onChange={e=>setPartnersSector(e.target.value)} style={{width:"100%",padding:"9px 10px",background:"#F7F7F7",border:"1px solid "+C.grayLight,borderRadius:8,fontSize:12,fontFamily:"Inter,sans-serif",color:C.black,cursor:"pointer"}}>
              <option value="">Tous les secteurs</option>
              {proSectors.map(s=>(<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div style={{background:C.bgSoft,borderRadius:8,padding:"8px 10px"}}>
            <div style={{fontSize:10,color:C.black,fontWeight:600}}>{filtered.length} partenaire(s) affichés</div>
          </div>
          {filtered.slice(0,12).map(c=>(
            <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"center",gap:8,background:"#F7F7F7",borderRadius:8,padding:"7px 9px",cursor:"pointer",border:"1px solid "+C.grayLight}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:C.red,color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{c.initials||"?"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:600,color:C.black,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.first_name} {c.last_name}</div>
                <div style={{fontSize:9,color:C.gray}}>{(c.my_relation||[]).filter(r=>PRO_RELATIONS.includes(r)).join(", ")}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const panelOpen=activeSection!==null&&activeSection!=="dashboard";
  const showDashboardView=activeSection==="dashboard"&&!selected;

  return(
    <div style={{height:"100vh",background:C.bg,fontFamily:"Inter,-apple-system,sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;}@keyframes slideRight{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}"}</style>

      {/* TOPBAR */}
      <div style={{display:"flex",alignItems:"center",padding:"0 12px",height:52,borderBottom:"1px solid "+C.grayLight,background:C.bg,gap:10,flexShrink:0,position:"relative",zIndex:20}}>
        {selected?(
          <>
            <button onClick={onDeselect} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:C.red,fontFamily:"Inter,sans-serif",fontSize:13,fontWeight:600,padding:"4px 8px",borderRadius:8,flexShrink:0,WebkitTapHighlightColor:"transparent"}}>← Retour</button>
            <div style={{flex:1,textAlign:"center"}}><span style={{fontSize:14,fontWeight:700,color:C.black}}>{selected.first_name} {selected.last_name}</span></div>
          </>
        ):(
          <>
            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
              <Logo size={26}/>
              {!isMobile&&<span style={{fontSize:14,fontWeight:900,color:C.black,letterSpacing:"-0.01em",textTransform:"uppercase"}}>ANANSI <span style={{color:C.red}}>I:R.</span></span>}
            </div>
            <div style={{flex:1,position:"relative"}}>
              <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:C.gray,fontSize:13}}>⌕</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." style={{width:"100%",padding:"7px 10px 7px 26px",background:"#F7F7F7",border:"1px solid "+C.grayLight,borderRadius:8,fontSize:13,color:C.black,outline:"none",fontFamily:"Inter,sans-serif"}}/>
            </div>
            <div style={{display:"flex",background:"#F7F7F7",border:"1px solid "+C.grayLight,borderRadius:8,padding:2,gap:1,flexShrink:0}}>
              {[["graph","⬡"],["list","≡"]].map(([v,l])=>(
                <button key={v} onClick={()=>{setView(v);if(activeSection==="dashboard")setActiveSection(null);}} style={{padding:"5px 9px",borderRadius:6,border:"none",background:(view===v&&activeSection!=="dashboard")?C.red:"transparent",color:(view===v&&activeSection!=="dashboard")?"#fff":C.gray,fontSize:13,cursor:"pointer",fontFamily:"Inter,sans-serif",transition:"all 0.15s"}}>{l}</button>
              ))}
            </div>
          </>
        )}
        <div style={{position:"relative",flexShrink:0}}>
          <button onClick={()=>setShowNotifs(p=>!p)} style={{width:34,height:34,borderRadius:8,background:showNotifs?C.red+"10":"#F7F7F7",border:"1px solid "+(showNotifs?C.redMid:C.grayLight),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:showNotifs?C.red:C.gray,position:"relative",transition:"all 0.15s",WebkitTapHighlightColor:"transparent"}}>
            🔔{unread>0&&<div style={{position:"absolute",top:4,right:4,width:8,height:8,borderRadius:"50%",background:C.red,border:"2px solid "+C.bg}}/>}
          </button>
          {showNotifs&&(<><div style={{position:"fixed",inset:0,zIndex:40}} onClick={()=>setShowNotifs(false)}/><div style={{position:"absolute",right:0,zIndex:50}}><NotificationsPanel notifications={notifications} onClose={()=>setShowNotifs(false)} onMarkRead={markRead} onContactClick={handleNotifContact}/></div></>)}
        </div>
        {!selected&&<button onClick={()=>setShowImport(true)} title="Importer CSV/VCF" style={{padding:"6px 9px",background:"#F7F7F7",border:"1px solid "+C.grayLight,borderRadius:8,color:C.gray,fontSize:11,cursor:"pointer",flexShrink:0,fontFamily:"Inter,sans-serif",WebkitTapHighlightColor:"transparent"}}>↑</button>}
        {/* Compte / Logout */}
        <div style={{position:"relative",flexShrink:0}}>
          <button onClick={()=>setShowAccountMenu(p=>!p)} style={{width:34,height:34,borderRadius:8,background:showAccountMenu?C.red+"10":"#F7F7F7",border:"1px solid "+(showAccountMenu?C.redMid:C.grayLight),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:showAccountMenu?C.red:C.gray,WebkitTapHighlightColor:"transparent"}}>⏻</button>
          {showAccountMenu&&(
            <>
              <div style={{position:"fixed",inset:0,zIndex:40}} onClick={()=>setShowAccountMenu(false)}/>
              <div style={{position:"absolute",right:0,top:40,background:C.bg,border:"1px solid "+C.grayLight,borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:50,minWidth:150,overflow:"hidden"}}>
                <button onClick={onLogout} style={{width:"100%",textAlign:"left",padding:"10px 14px",background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.red,fontWeight:600,fontFamily:"Inter,sans-serif",display:"flex",alignItems:"center",gap:8}}>⏻ Se déconnecter</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* BODY */}
      <div style={{flex:1,overflow:"hidden",position:"relative",display:"flex"}}>
        {/* SIDEBAR RAIL — icônes seules, toujours visible */}
        {!selected&&(
          <div style={{width:46,flexShrink:0,borderRight:"1px solid "+C.grayLight,background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:8,gap:4,zIndex:25}}>
            {railItems.map(item=>{
              const active=activeSection===item.key;
              return(
                <button key={item.key} onClick={()=>{setActiveSection(p=>p===item.key?null:item.key);if(item.key!=="tasks")setTaskFocus(null);}} title={item.label}
                  style={{width:36,height:36,borderRadius:10,background:active?C.redSoft:"transparent",border:"1px solid "+(active?C.redMid:"transparent"),color:active?C.red:C.gray,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",transition:"all 0.15s",WebkitTapHighlightColor:"transparent"}}>
                  {item.icon}
                  {item.badge>0&&<span style={{position:"absolute",top:2,right:2,minWidth:13,height:13,borderRadius:7,background:item.badgeColor||C.red,color:"#fff",fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{item.badge}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* SIDEBAR PANEL — s'ouvre au clic, ferme si on reclique */}
        {!selected&&panelOpen&&(
          <>
            {isMobile&&<div onClick={()=>setActiveSection(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.25)",zIndex:26}}/>}
            <div style={{width:isMobile?Math.min(windowWidth*0.78,300):228,flexShrink:0,borderRight:"1px solid "+C.grayLight,background:"#FAFAFA",overflowY:"auto",padding:"12px 10px",animation:"slideRight 0.18s ease",position:isMobile?"absolute":"relative",left:isMobile?46:undefined,top:0,bottom:0,zIndex:27}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <span style={{fontSize:11,fontWeight:800,color:C.black,textTransform:"uppercase",letterSpacing:"0.07em"}}>{sectionTitle[activeSection]}</span>
                <button onClick={()=>setActiveSection(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.gray,lineHeight:1}}>×</button>
              </div>
              {panelContent()}
            </div>
          </>
        )}

        {/* MAIN */}
        <div style={{flex:1,overflow:"hidden",position:"relative",display:"flex",flexDirection:"column"}}>
          {!selected?(
            showDashboardView?(
              <DashboardStats contacts={contacts} tasks={tasks} onSelectContact={(c)=>{onSelect(c);}}/>
            ):(
              <div style={{flex:1,position:"relative",overflow:"hidden"}}>
                {view==="graph"?(
                  <>
                    <NetworkGraph contacts={filtered} onSelect={onSelect} highlightId={highlightId}/>
                    <div style={{position:"absolute",top:10,right:10,display:"flex",gap:8,pointerEvents:"none"}}>
                      {[{l:"Affichés",v:filtered.length},{l:"Total",v:contacts.length}].map(s=>(
                        <div key={s.l} style={{background:"rgba(255,255,255,0.92)",backdropFilter:"blur(8px)",border:"1px solid "+C.grayLight,borderRadius:10,padding:"5px 10px",textAlign:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.07)"}}>
                          <div style={{fontSize:15,fontWeight:800,color:C.black}}>{s.v}</div>
                          <div style={{fontSize:9,color:C.gray,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                    {taskFocus&&(
                      <div style={{position:"absolute",top:10,left:10,background:C.redSoft,border:"1px solid "+C.redMid,borderRadius:10,padding:"6px 10px",display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:10,color:C.red,fontWeight:600}}>Focus tâche actif</span>
                        <button onClick={()=>setTaskFocus(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:C.red,lineHeight:1}}>×</button>
                      </div>
                    )}
                    {filtered.length===0&&contacts.length>0&&(
                      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
                        <div style={{fontSize:13,color:C.gray,marginBottom:8}}>Aucun contact ne correspond aux critères</div>
                        <button onClick={()=>{clearFilters();setTaskFocus(null);setPartnersSector("");}} style={{fontSize:12,color:C.red,background:C.redSoft,border:"1px solid "+C.redMid,borderRadius:8,padding:"6px 14px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Réinitialiser</button>
                      </div>
                    )}
                    {contacts.length===0&&(
                      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
                        <div style={{fontSize:24,marginBottom:8}}>◎</div>
                        <div style={{fontSize:13,color:C.gray,marginBottom:6}}>Aucun contact pour l'instant</div>
                        <div style={{fontSize:11,color:C.gray}}>Bouton + pour créer, ou ↑ pour importer un fichier</div>
                      </div>
                    )}
                    <div style={{position:"absolute",bottom:14,left:"50%",transform:"translateX(-50%)",fontSize:11,color:C.gray,pointerEvents:"none",whiteSpace:"nowrap"}}>Cliquez sur un nœud pour voir la fiche</div>
                  </>
                ):(
                  <div style={{padding:12,overflowY:"auto",height:"100%"}}>
                    {filtered.map(c=>{
                      const score=healthScore(c),hcol=healthColor(score);
                      return(
                        <div key={c.id} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"center",gap:12,background:C.bg,border:"1px solid "+C.grayLight,borderRadius:10,padding:"11px 14px",cursor:"pointer",marginBottom:6}}
                          onMouseEnter={e=>e.currentTarget.style.background="#F7F7F7"} onMouseLeave={e=>e.currentTarget.style.background=C.bg}>
                          <div style={{width:38,height:38,borderRadius:"50%",background:"#eee",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.black,flexShrink:0,overflow:"hidden"}}>
                            {c.photo_url?<img src={c.photo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>{c.initials||"?"}</span>}
                          </div>
                          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:C.black}}>{c.first_name} {c.last_name}</div><div style={{fontSize:11,color:C.gray}}>{[c.role,c.company].filter(Boolean).join(" · ")}</div></div>
                          <div style={{display:"flex",gap:5,alignItems:"center"}}><div style={{width:6,height:6,borderRadius:"50%",background:hcol}}/><span style={{fontSize:11,fontWeight:700,color:hcol}}>{score}</span></div>
                        </div>
                      );
                    })}
                    {filtered.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:C.gray,fontSize:13}}>Aucun contact correspondant</div>}
                  </div>
                )}
              </div>
            )
          ):isMobile?(
            <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>
              <div style={{flexShrink:0,background:"#FAFAFA",borderBottom:"1px solid "+C.grayLight}}>
                <div style={{padding:"8px 12px 4px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:10,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Réseau de {selected.first_name}</span>
                  <span style={{fontSize:9,color:C.gray}}>nœuds rouges = cliquables</span>
                </div>
                <ContactNetwork contact={selected} contacts={contacts} onSelect={onSelect} height={220}/>
              </div>
              <div style={{flex:1}}>
                <ContactCardContent contact={selected} contacts={contacts} onSelect={onSelect} onUpdate={(patch)=>onUpdateContact(selected.id,patch)} onDelete={()=>onDeleteContact(selected.id)}/>
              </div>
            </div>
          ):(
            <div style={{flex:1,display:"flex",overflow:"hidden"}}>
              <div style={{flex:1,background:"#FAFAFA",borderRight:"1px solid "+C.grayLight,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <div style={{padding:"10px 14px 4px",borderBottom:"1px solid "+C.grayLight,flexShrink:0}}>
                  <span style={{fontSize:10,color:C.gray,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Réseau de {selected.first_name}</span>
                </div>
                <div style={{flex:1,overflow:"hidden"}}>
                  <ContactNetwork contact={selected} contacts={contacts} onSelect={onSelect}/>
                </div>
              </div>
              <div style={{width:360,flexShrink:0,overflow:"hidden",display:"flex",flexDirection:"column"}}>
                <ContactCardContent contact={selected} contacts={contacts} onSelect={onSelect} onUpdate={(patch)=>onUpdateContact(selected.id,patch)} onDelete={()=>onDeleteContact(selected.id)}/>
              </div>
            </div>
          )}
        </div>
      </div>

      {showImport&&<ImportTerminal onClose={()=>setShowImport(false)} onBulkImport={onBulkImport}/>}
      {showAddContact&&<AddContactModal onClose={()=>setShowAddContact(false)} onSave={onSaveContact} existingContacts={contacts} existingGroups={allGroupsInData} existingCompanies={allCompaniesInData} existingCountries={allCountriesInData} existingRegions={allRegionsInData} existingCities={allCitiesInData} existingTags={allTagsInData}/>}
      {!showAddContact&&!showImport&&!selected&&<HexFAB onClick={()=>setShowAddContact(true)}/>}
      <ChatWidget/>
    </div>
  );
}

// ── NORMALIZE ──────────────────────────────────────────────────────────────────
function normalizeContact(row){
  const sectors=Array.isArray(row.sectors)&&row.sectors.length?row.sectors:(row.sector?[row.sector]:[]);
  return{
    ...row,
    initials:row.initials||((row.first_name&&row.first_name[0]||"")+(row.last_name&&row.last_name[0]||"")),
    sectors,
    sector:row.sector||sectors[0]||"",
    hobbies:row.hobbies||[],
    discussion_points:row.discussion_points||[],
    topics_to_avoid:row.topics_to_avoid||[],
    connections:row.connections||[],
    related:row.related||[],
    interactions:row.interactions||[],
    reminders:row.reminders||[],
    tags:row.tags||[],
    media:row.media||[],
    my_relation:row.my_relation||[],
    groups:row.groups||[],
    connection_types:row.connection_types||{},
    web_insights:row.web_insights||[],
    last_interaction:row.last_interaction||"–",
    genre:row.genre||"M",
    alias:row.alias||"",
    maiden_name:row.maiden_name||"",
    photo_url:row.photo_url||"",
    country:row.country||"",
    region:row.region||"",
    location_city:row.location_city||"",
    country_code:row.country_code||"+230",
    secondary_lever:row.secondary_lever||"",
    tertiary_lever:row.tertiary_lever||"",
    utility_score:row.utility_score??5,
    sentiment_score:row.sentiment_score??5,
    reliability_score:row.reliability_score??5,
    influence_score:row.influence_score??5,
    reciprocity_score:row.reciprocity_score??5,
    momentum_score:row.momentum_score??5,
    potential_score:row.potential_score??5,
    relational_debt:row.relational_debt??0,
    known_personally:row.known_personally??false,
  };
}

// ── ROOT ───────────────────────────────────────────────────────────────────────
export default function App(){
  const [unlocked,setUnlocked]=useState(false);
  const [selected,setSelected]=useState(null);
  const [contacts,setContacts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [dbError,setDbError]=useState(null);

  useEffect(()=>{if(unlocked)loadContacts();},[unlocked]);

  async function loadContacts(){
    setLoading(true);
    try{
      const PAGE=1000;
      let all=[];
      let from=0;
      while(true){
        const {data,error}=await supabase.from("contacts").select("*").order("created_at",{ascending:false}).range(from,from+PAGE-1);
        if(error)throw error;
        all=all.concat(data||[]);
        if(!data||data.length<PAGE)break;
        from+=PAGE;
      }
      setContacts(all.map(normalizeContact));
      setDbError(null);
    }catch(e){
      console.error("Supabase load error:",e);
      setDbError((e&&e.message)||"Erreur inconnue");
    }finally{
      setLoading(false);
    }
  }

  async function saveContact(contact){
    const {id,selected_connections,...rest}=contact;
    const toInsert={...rest,last_interaction:new Date().toISOString().split("T")[0]};
    try{
      const {data,error}=await supabase.from("contacts").insert([toInsert]).select().single();
      if(error)throw error;
      const saved=normalizeContact(data);
      setContacts(prev=>[saved,...prev]);
      setSelected(saved);
    }catch(e){
      console.error("Supabase save error:",e);
      alert("Erreur de sauvegarde: "+((e&&e.message)||"inconnue"));
    }
  }

  async function updateContact(id,patch){
    try{
      const {data,error}=await supabase.from("contacts").update(patch).eq("id",id).select().single();
      if(error)throw error;
      const norm=normalizeContact(data);
      setContacts(prev=>prev.map(c=>String(c.id)===String(id)?norm:c));
      setSelected(s=>(s&&String(s.id)===String(id))?norm:s);
      return norm;
    }catch(e){
      console.error("Supabase update error:",e);
      alert("Erreur de mise à jour: "+((e&&e.message)||"inconnue"));
      return null;
    }
  }

  async function deleteContact(id){
    try{
      const {error}=await supabase.from("contacts").delete().eq("id",id);
      if(error)throw error;
      // Nettoyer aussi les connexions des autres contacts qui pointaient vers celui-ci
      const affected=contacts.filter(c=>(c.connections||[]).map(String).includes(String(id)));
      await Promise.all(affected.map(c=>{
        const nextConns=(c.connections||[]).filter(cid=>String(cid)!==String(id));
        return supabase.from("contacts").update({connections:nextConns}).eq("id",c.id);
      }));
      setContacts(prev=>prev.filter(c=>String(c.id)!==String(id)).map(c=>({...c,connections:(c.connections||[]).filter(cid=>String(cid)!==String(id))})));
      setSelected(s=>(s&&String(s.id)===String(id))?null:s);
      return true;
    }catch(e){
      console.error("Supabase delete error:",e);
      alert("Erreur de suppression: "+((e&&e.message)||"inconnue"));
      return false;
    }
  }

  async function bulkImport(items){
    const CHUNK=500;
    const payload=items.map(item=>{
      const {_ref,_connections_refs,...c}=item;
      return{
        ...c,
        connections:[],related:[],interactions:[],reminders:[],tags:[],media:[],
        last_interaction:new Date().toISOString().split("T")[0],
      };
    });
    let insertedRows=[];
    for(let i=0;i<payload.length;i+=CHUNK){
      const slice=payload.slice(i,i+CHUNK);
      const {data,error}=await supabase.from("contacts").insert(slice).select();
      if(error)throw error;
      insertedRows=insertedRows.concat(data);
    }
    const refToId={};
    insertedRows.forEach((row,i)=>{const ref=items[i]._ref;if(ref!=null&&ref!=="")refToId[ref]=row.id;});
    const updates=[];
    items.forEach((item,i)=>{
      const refs=item._connections_refs||[];
      if(refs.length===0)return;
      const ids=refs.map(r=>refToId[r]).filter(Boolean);
      if(ids.length)updates.push({id:insertedRows[i].id,connections:ids});
    });
    for(let i=0;i<updates.length;i+=CHUNK){
      const slice=updates.slice(i,i+CHUNK);
      await Promise.all(slice.map(u=>supabase.from("contacts").update({connections:u.connections}).eq("id",u.id)));
    }
    await loadContacts();
    return insertedRows.length;
  }

  function logout(){
    setUnlocked(false);
    setSelected(null);
    setContacts([]);
    setDbError(null);
  }

  if(!unlocked)return <Login onUnlock={()=>setUnlocked(true)}/>;

  if(loading)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,fontFamily:"Inter,sans-serif"}}>
      <Logo size={52}/>
      <div style={{fontSize:13,color:C.gray}}>Chargement des contacts...</div>
      <div style={{width:180,height:2,background:C.grayLight,borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",background:C.red,borderRadius:2,animation:"loadbar 1.2s ease infinite"}}/>
      </div>
      <style>{"@keyframes loadbar{0%{width:0%;margin-left:0}50%{width:60%;margin-left:20%}100%{width:0%;margin-left:100%}}"}</style>
    </div>
  );

  if(dbError)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,fontFamily:"Inter,sans-serif",padding:24}}>
      <Logo size={48}/>
      <div style={{fontSize:15,fontWeight:700,color:C.red}}>Erreur de connexion Supabase</div>
      <div style={{fontSize:12,color:C.gray,textAlign:"center",maxWidth:360,lineHeight:1.5}}>{dbError}</div>
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <button onClick={loadContacts} style={{padding:"10px 20px",background:C.red,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Réessayer</button>
        <button onClick={logout} style={{padding:"10px 20px",background:"#F7F7F7",border:"1px solid "+C.grayLight,borderRadius:10,color:C.black,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Se déconnecter</button>
      </div>
    </div>
  );

  return(
    <Dashboard
      contacts={contacts}
      onSelect={c=>setSelected(c)}
      selected={selected}
      onDeselect={()=>setSelected(null)}
      onSaveContact={saveContact}
      onBulkImport={bulkImport}
      onUpdateContact={updateContact}
      onDeleteContact={deleteContact}
      onLogout={logout}
    />
  );
}
