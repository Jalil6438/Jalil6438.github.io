import { useEffect } from "react";

// In-tab reminder scheduler. Reads rihlat-reminders prefs every 30s and fires a
// Notification when the configured time is within the polling window AND hasn't
// already fired today. "Fired today" is tracked in localStorage so toggling
// sessions or refreshing doesn't re-fire. Background firing requires PWA install
// — this only works while the tab is open, which the Reminders sheet copy makes
// clear. Extracted verbatim from the root component; no state, no props.
export default function useReminders() {
  useEffect(()=>{
    if(typeof Notification==="undefined") return;
    const SESSION_LABELS={fajr:"Fajr — memorize today's page",dhuhr:"Dhuhr — review last 5 days",asr:"Asr — revise older juz",maghrib:"Maghrib — listen to today's page",isha:"Isha — final review before sleep"};
    const tick=()=>{
      if(Notification.permission!=="granted") return;
      let prefs;
      try { prefs=JSON.parse(localStorage.getItem("rihlat-reminders")||"null"); } catch { return; }
      if(!prefs||!prefs.sessions) return;
      const now=new Date();
      const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
      let fired;
      try { fired=JSON.parse(localStorage.getItem("rihlat-reminders-fired")||"{}"); } catch { fired={}; }
      // Reset fired log if it's a new day
      if(fired._date!==today){ fired={_date:today}; }
      const nowMin=now.getHours()*60+now.getMinutes();
      let changed=false;
      for(const [id,s] of Object.entries(prefs.sessions)){
        if(!s.enabled||!s.time||fired[id]) continue;
        const [h,m]=s.time.split(":").map(Number);
        const targetMin=h*60+m;
        // Fire if within the past 60s window (don't fire for old times missed earlier)
        if(nowMin>=targetMin&&nowMin<targetMin+1){
          try { new Notification("Rihlat al-Hifz",{body:SESSION_LABELS[id]||id,tag:`rihlat-${id}-${today}`}); } catch { /* ignore */ }
          fired[id]=true;
          changed=true;
        }
      }
      if(changed){ try { localStorage.setItem("rihlat-reminders-fired",JSON.stringify(fired)); } catch { /* ignore */ } }
    };
    tick();
    const iv=setInterval(tick,30000);
    return ()=>clearInterval(iv);
  },[]);
}
