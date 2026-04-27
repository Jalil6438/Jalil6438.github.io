import React from "react";

export default function TwoPageWarningModal({warning,onClose,dark}){
  if(!warning) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(6px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
      <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:20,maxWidth:380,width:"100%",border:"1px solid rgba(217,177,95,0.30)",boxShadow:"0 20px 60px rgba(0,0,0,0.60), 0 0 30px rgba(212,175,55,0.15)",padding:"22px 20px"}} onClick={e=>e.stopPropagation()}>
        <div style={{textAlign:"center",marginBottom:12}}>
          <div style={{fontSize:28,marginBottom:8}}>📖</div>
          <div style={{fontSize:10,color:"#D4AF37",letterSpacing:".16em",textTransform:"uppercase",fontWeight:700,marginBottom:6}}>Sheikh Al-Qasim's Wisdom</div>
        </div>
        <div style={{fontFamily:"'Amiri',serif",fontSize:16,color:dark?"#F6E27A":"#B45309",direction:"rtl",textAlign:"center",lineHeight:1.8,marginBottom:12}}>
          لا تحفظ أكثر من صفحة في اليوم
        </div>
        <div style={{fontSize:13,color:dark?"rgba(243,231,200,0.80)":"#2D2A26",lineHeight:1.7,textAlign:"center",marginBottom:14,fontStyle:"italic"}}>
          "One page a day is the path that lasts. Consistency and quality over quantity."
        </div>
        <div style={{padding:"12px 14px",background:dark?"rgba(212,175,55,0.08)":"rgba(212,175,55,0.10)",border:`1px solid ${dark?"rgba(212,175,55,0.25)":"rgba(180,120,30,0.30)"}`,borderRadius:12,marginBottom:14,textAlign:"center"}}>
          <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.60)":"#6B645A",marginBottom:4}}>Your target was</div>
          <div style={{fontSize:14,fontWeight:700,color:dark?"#F0C040":"#B45309",marginBottom:6}}>{warning.target} ayahs today</div>
          <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.60)":"#6B645A",marginBottom:4}}>Stopped at the page boundary</div>
          <div style={{fontSize:18,fontWeight:700,color:"#4ADE80"}}>{warning.actual} ayahs today</div>
        </div>
        <div className="sbtn" onClick={onClose} style={{width:"100%",padding:"12px",borderRadius:12,textAlign:"center",fontSize:13,fontWeight:700,color:dark?"#0A0E1A":"#fff",background:"linear-gradient(180deg,#E6B84A,#D4A62A)"}}>
          I understand · بارك الله فيك
        </div>
      </div>
    </div>
  );
}
