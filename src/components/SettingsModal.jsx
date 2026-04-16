import React from "react";

export default function SettingsModal({
  show,
  onClose,
  dark,
  T,
  fontSize,
  setFontSize,
  editName,
  setEditName,
  showNameModal,
  setShowNameModal,
  showResetConfirm,
  setShowResetConfirm,
  showTerms,
  setShowTerms,
  setDark,
  onAdjustPlan,
  onAbout,
}) {
  return (
    <>

      {/* ── NAME CHANGE MODAL ── */}
      {showNameModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.40)",zIndex:1001,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setShowNameModal(false)}>
          <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:20,maxWidth:360,width:"100%",border:"1px solid rgba(217,177,95,0.30)",boxShadow:"0 20px 60px rgba(0,0,0,0.60)",padding:"22px 20px"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:700,color:dark?"#F3E7C8":"#3D2E0A",marginBottom:12,textAlign:"center"}}>Change Your Name</div>
            <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Your name" autoFocus style={{width:"100%",padding:"12px 14px",background:dark?"rgba(0,0,0,0.3)":"#fff",border:`1px solid ${dark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)"}`,borderRadius:10,color:T.text,fontSize:14,outline:"none",marginBottom:14,boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:8}}>
              <div className="sbtn" onClick={()=>setShowNameModal(false)} style={{flex:1,padding:"11px",borderRadius:10,textAlign:"center",fontSize:13,fontWeight:600,color:T.text,background:dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)",border:`1px solid ${dark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)"}`}}>Cancel</div>
              <div className="sbtn" onClick={()=>{if(editName.trim()){localStorage.setItem("rihlat-username",editName.trim());setShowNameModal(false);onClose && onClose();}}} style={{flex:1,padding:"11px",borderRadius:10,textAlign:"center",fontSize:13,fontWeight:700,color:"#0A0E1A",background:"#D4AF37"}}>Save</div>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET CONFIRM MODAL ── */}
      {showResetConfirm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.40)",zIndex:1001,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setShowResetConfirm(false)}>
          <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:20,maxWidth:360,width:"100%",border:"1px solid rgba(229,83,75,0.30)",boxShadow:"0 20px 60px rgba(0,0,0,0.60), 0 0 30px rgba(229,83,75,0.15)",padding:"22px 20px",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:32,marginBottom:8}}>⚠️</div>
            <div style={{fontSize:16,fontWeight:700,color:dark?"#F3E7C8":"#3D2E0A",marginBottom:8}}>Reset All Progress?</div>
            <div style={{fontSize:12,color:dark?"rgba(243,231,200,0.60)":"#6B645A",lineHeight:1.6,marginBottom:18}}>
              This will erase all your memorized juz, streaks, bookmarks, and settings. This cannot be undone.
            </div>
            <div style={{display:"flex",gap:8}}>
              <div className="sbtn" onClick={()=>setShowResetConfirm(false)} style={{flex:1,padding:"11px",borderRadius:10,textAlign:"center",fontSize:13,fontWeight:600,color:T.text,background:dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)",border:`1px solid ${dark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)"}`}}>Cancel</div>
              <div className="sbtn" onClick={()=>{localStorage.clear();sessionStorage.clear();setTimeout(()=>location.reload(),50);}} style={{flex:1,padding:"11px",borderRadius:10,textAlign:"center",fontSize:13,fontWeight:700,color:"#fff",background:"#E5534B",border:"1px solid #E5534B"}}>Reset</div>
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS MODAL ── */}
      {show && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.40)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
          <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",width:"100%",maxWidth:500,maxHeight:"80vh",display:"flex",flexDirection:"column",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"12px 18px 0",textAlign:"center",flexShrink:0,position:"relative"}}>
              <div style={{width:36,height:4,background:dark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)",borderRadius:2,margin:"0 auto 12px"}}/>
              <div className="sbtn" onClick={onClose} style={{position:"absolute",top:10,right:14,width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:T.dim,background:dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)",border:`1px solid ${dark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.10)"}`,lineHeight:1}}>×</div>
              <div style={{fontSize:15,fontWeight:700,color:dark?"#F3E7C8":"#3D2E0A"}}>Settings</div>
              <div style={{fontSize:10,color:T.dim,marginTop:4}}>📅 Joined 2026</div>
            </div>
            <div style={{overflowY:"auto",padding:"14px 18px 28px"}}>
              {/* Dark mode toggle */}
              <div className="sbtn" onClick={()=>setDark(!dark)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)"}`,borderRadius:12,marginBottom:6}}>
                <div style={{fontSize:13,color:T.text}}>{dark?"🌙 Dark Mode":"☀️ Light Mode"}</div>
                <div style={{width:36,height:20,borderRadius:10,background:dark?"#D4AF37":"rgba(0,0,0,0.15)",padding:2,display:"flex",alignItems:`center`,justifyContent:dark?"flex-end":"flex-start"}}>
                  <div style={{width:16,height:16,borderRadius:"50%",background:"#fff",transition:"all .2s"}}/>
                </div>
              </div>
              {/* Font Size */}
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)"}`,borderRadius:12,marginBottom:6}}>
                <div style={{fontSize:12,color:T.text,flexShrink:0}}>🔤 Font Size</div>
                <input type="range" min="14" max="32" value={fontSize} onChange={e=>setFontSize(Number(e.target.value))} style={{flex:1}}/>
                <div style={{fontSize:11,color:"#F0C040",fontWeight:700,flexShrink:0,minWidth:26,textAlign:"right"}}>{fontSize}</div>
              </div>
              {/* Name Change */}
              <div className="sbtn" onClick={()=>{setEditName(localStorage.getItem("rihlat-username")||"");setShowNameModal(true);}} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)"}`,borderRadius:12,marginBottom:6}}>
                <div style={{fontSize:13,color:T.text}}>👤 Name Change</div>
              </div>
              {/* Adjust Plan */}
              <div className="sbtn" onClick={onAdjustPlan} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)"}`,borderRadius:12,marginBottom:6}}>
                <div style={{fontSize:13,color:T.text}}>⚙️ Adjust Plan</div>
              </div>
              {/* About */}
              <div className="sbtn" onClick={onAbout} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)"}`,borderRadius:12,marginBottom:6}}>
                <div style={{fontSize:13,color:T.text}}>ℹ️ About</div>
              </div>
              {/* Terms & Privacy */}
              <div className="sbtn" onClick={()=>{setShowTerms(true);onClose();}} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.10)"}`,borderRadius:12,marginBottom:6}}>
                <div style={{fontSize:13,color:T.text}}>📄 Terms & Privacy</div>
              </div>
              {/* Reset Progress */}
              <div className="sbtn" onClick={()=>setShowResetConfirm(true)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"rgba(229,83,75,0.08)",border:"1px solid rgba(229,83,75,0.30)",borderRadius:12,marginBottom:6,marginTop:10}}>
                <div style={{fontSize:13,color:"#E5534B",fontWeight:600}}>🗑️ Reset All Progress</div>
              </div>
              {/* Version */}
              <div style={{textAlign:"center",marginTop:14,fontSize:10,color:T.dim}}>
                Rihlat Al-Hifz · Version 1.0 · 2026
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
