// Intro dua screen — shown once after onboarding, before entering My Hifz.
// "Let's Begin" advances to the myhifz tab. Extracted verbatim from the root
// component; the DUAS list and JSX are unchanged.
const DUAS=[
  {arabic:"رَبِّ زِدْنِي عِلْمًا",transliteration:"Rabbi zidni ilma",translation:"My Lord, increase me in knowledge.",source:"Surah Ta-Ha · 20:114"},
  {arabic:"رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",transliteration:"Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina adhaban-nar",translation:"Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",source:"Surah Al-Baqarah · 2:201"},
  {arabic:"رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً",transliteration:"Rabbana la tuzigh qulubana ba'da idh hadaytana wa hab lana min ladunka rahmah",translation:"Our Lord, do not let our hearts deviate after You have guided us, and grant us mercy from Yourself.",source:"Surah Aal-Imran · 3:8"},
  {arabic:"اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا",transliteration:"Allahumma inni as'aluka ilman nafi'an wa rizqan tayyiban wa amalan mutaqabbala",translation:"O Allah, I ask You for beneficial knowledge, pure provision, and accepted deeds.",source:"Morning Dua · Ibn Majah"},
  {arabic:"رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",transliteration:"Rabbi ishrah li sadri wa yassir li amri",translation:"My Lord, expand my chest and ease my affairs.",source:"Surah Ta-Ha · 20:25-26"},
  {arabic:"اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",transliteration:"Allahumma a'inni ala dhikrika wa shukrika wa husni ibadatik",translation:"O Allah, help me to remember You, to be grateful to You, and to worship You in an excellent manner.",source:"Abu Dawud · After every Salah"},
];

export default function DuaScreen({ dark, duaIdx, setShowDua, setDuaIdx, setActiveTab }) {
  const d=DUAS[duaIdx%DUAS.length];
  return (
          <div style={{position:"fixed",inset:0,background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",zIndex:999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{position:"absolute",inset:0,pointerEvents:"none",background:dark?"radial-gradient(circle at 50% 0%,rgba(212,175,55,0.10),transparent 60%)":"radial-gradient(circle at 50% 0%,rgba(139,106,16,0.06),transparent 60%)"}}/>
            {/* Bismillah pinned above the card */}
            <div style={{position:"absolute",top:"8vh",left:0,right:0,textAlign:"center",zIndex:2}}>
              <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(28px,6vw,44px)",color:dark?"#F6E27A":"#2D2A26",direction:"rtl",lineHeight:1.7,textShadow:dark?"0 0 18px rgba(212,175,55,0.18)":"none"}}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>
            </div>
            <div className="fi" style={{position:"relative",background:dark?"linear-gradient(180deg,rgba(15,20,32,0.97) 0%,rgba(9,13,22,0.99) 100%), radial-gradient(circle at 50% 30%,rgba(212,175,55,0.05),transparent 65%)":"linear-gradient(180deg,#D8CCB0 0%,#CCBFA3 100%)",border:dark?"1px solid rgba(212,175,55,0.20)":"1px solid rgba(139,106,16,0.18)",borderRadius:20,padding:"28px 24px",maxWidth:500,width:"100%",textAlign:"center",boxShadow:dark?"0 20px 50px rgba(0,0,0,0.45),0 0 30px rgba(212,175,55,0.08),inset 0 1px 0 rgba(212,175,55,0.10)":"0 10px 30px rgba(0,0,0,0.08),inset 0 1px 0 rgba(255,255,255,0.5)"}}>
              <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(18px,4vw,24px)",color:dark?"rgba(246,226,122,0.85)":"#2D2A26",direction:"rtl",lineHeight:1.7,marginBottom:4,padding:"0 10px"}}>ٱلسَّلَامُ عَلَيْكُمْ وَرَحْمَةُ ٱللَّهِ وَبَرَكَاتُهُ</div>
              <div style={{fontSize:12,color:dark?"rgba(243,231,191,0.55)":"#6B645A",letterSpacing:".08em",marginTop:36,marginBottom:14,fontStyle:"italic",textAlign:"center"}}>Let's begin with a du'a</div>
              <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(20px,4.5vw,32px)",color:dark?"#F6E27A":"#2D2A26",direction:"rtl",lineHeight:2,marginBottom:16,textShadow:dark?"0 0 12px rgba(212,175,55,0.12)":"none"}}>{d.arabic}</div>
              <div style={{fontSize:11,color:dark?"rgba(243,231,191,0.85)":"#2A1A00",lineHeight:1.6,marginBottom:4,opacity:0.85}}>{d.translation}</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:dark?"rgba(212,175,55,0.40)":"#6B645A",marginBottom:20,opacity:0.5}}>{d.source}</div>
              <div style={{display:"flex",justifyContent:"center",gap:5,marginBottom:20}}>
                {[0,1,2,3,4,5].map(i=>(
                  <div key={i} style={{width:i===duaIdx%6?14:5,height:5,borderRadius:3,background:i===duaIdx%6?"linear-gradient(90deg,#D4AF37,#F6E27A)":"rgba(255,255,255,0.08)",boxShadow:i===duaIdx%6?"0 0 8px rgba(212,175,55,0.35)":"none",opacity:i===duaIdx%6?1:0.3,transition:"all .3s"}}/>
                ))}
              </div>
              <div className="sbtn" onClick={()=>{setShowDua(false);setDuaIdx(i=>(i+1)%6);setActiveTab("myhifz");}} style={{padding:"12px 28px",background:"linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)",color:"#060A07",borderRadius:12,fontSize:13,fontWeight:700,display:"inline-block",boxShadow:"0 12px 30px rgba(212,175,55,0.25),inset 0 1px 0 rgba(255,255,255,0.2)"}}>
                Let's Begin →
              </div>
            </div>
          </div>
  );
}
