// ── QURAN PAGE RENDERER ────────────────────────────────────────────────────
function QuranPageView({ pageLines, wordMap, fontSize }) {
  const gold = "#E8D5A3";
  const goldDim = "rgba(232,213,163,0.5)";
  if (!pageLines || pageLines.length === 0) return null;
  return (
    <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",
      justifyContent:"space-between",padding:"4px 10px",boxSizing:"border-box"}}>
      {pageLines.map((line,i)=>{
        // Surah name
        if(line.t==="s"){
          return(
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"center",
              flex:1,borderTop:"1px solid rgba(217,177,95,0.25)",
              borderBottom:"1px solid rgba(217,177,95,0.25)",color:gold,
              fontSize:fontSize*0.72,fontFamily:"'DM Sans',sans-serif",
              letterSpacing:"0.08em",direction:"rtl"}}>
              {({"1":"الفاتحة","2":"البقرة","3":"آل عمران","4":"النساء","5":"المائدة",
                "6":"الأنعام","7":"الأعراف","8":"الأنفال","9":"التوبة","10":"يونس",
                "11":"هود","12":"يوسف","13":"الرعد","14":"إبراهيم","15":"الحجر",
                "16":"النحل","17":"الإسراء","18":"الكهف","19":"مريم","20":"طه",
                "21":"الأنبياء","22":"الحج","23":"المؤمنون","24":"النور","25":"الفرقان",
                "26":"الشعراء","27":"النمل","28":"القصص","29":"العنكبوت","30":"الروم",
                "31":"لقمان","32":"السجدة","33":"الأحزاب","34":"سبأ","35":"فاطر",
                "36":"يس","37":"الصافات","38":"ص","39":"الزمر","40":"غافر",
                "41":"فصلت","42":"الشورى","43":"الزخرف","44":"الدخان","45":"الجاثية",
                "46":"الأحقاف","47":"محمد","48":"الفتح","49":"الحجرات","50":"ق",
                "51":"الذاريات","52":"الطور","53":"النجم","54":"القمر","55":"الرحمن",
                "56":"الواقعة","57":"الحديد","58":"المجادلة","59":"الحشر","60":"الممتحنة",
                "61":"الصف","62":"الجمعة","63":"المنافقون","64":"التغابن","65":"الطلاق",
                "66":"التحريم","67":"الملك","68":"القلم","69":"الحاقة","70":"المعارج",
                "71":"نوح","72":"الجن","73":"المزمل","74":"المدثر","75":"القيامة",
                "76":"الإنسان","77":"المرسلات","78":"النبأ","79":"النازعات","80":"عبس",
                "81":"التكوير","82":"الانفطار","83":"المطففين","84":"الانشقاق","85":"البروج",
                "86":"الطارق","87":"الأعلى","88":"الغاشية","89":"الفجر","90":"البلد",
                "91":"الشمس","92":"الليل","93":"الضحى","94":"الشرح","95":"التين",
                "96":"العلق","97":"القدر","98":"البينة","99":"الزلزلة","100":"العاديات",
                "101":"القارعة","102":"التكاثر","103":"العصر","104":"الهمزة","105":"الفيل",
                "106":"قريش","107":"الماعون","108":"الكوثر","109":"الكافرون","110":"النصر",
                "111":"المسد","112":"الإخلاص","113":"الفلق","114":"الناس"})[String(line.s)]||""}
            </div>
          );
        }
        // Basmallah
        if(line.t==="b"){
          return(
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"center",
              flex:1,color:gold,fontSize:fontSize,fontFamily:"'Scheherazade New',serif",
              direction:"rtl",lineHeight:1.2}}>
              بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِيمِ
            </div>
          );
        }
        // Ayah line
        const words=[];
        if(line.f&&line.l&&wordMap){
          for(let wid=line.f;wid<=line.l;wid++){
            const w=wordMap[wid];
            if(w) words.push({id:wid,...w});
          }
        }
        return(
          <div key={i} style={{display:"flex",flexDirection:"row-reverse",
            justifyContent:line.c?"center":"space-between",
            alignItems:"center",flex:1,
            gap:line.c?`${Math.round(fontSize*0.25)}px`:"0",
            overflow:"hidden"}}>
            {words.map(w=>(
              <span key={w.id} style={{
                color:w.type==="end"?goldDim:gold,
                fontSize:w.type==="end"?fontSize*0.62:fontSize,
                fontFamily:"'Scheherazade New',serif",
                lineHeight:1,flexShrink:0,
              }}>{w.text}</span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default QuranPageView;
