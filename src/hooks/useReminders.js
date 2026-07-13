import { useEffect } from "react";
import { autoResync } from "../push/pushClient";

// In-tab reminder scheduler — the clearly-labeled FOREGROUND fallback, not
// background delivery. Reads rihlat-reminders prefs every 30s and fires a
// Notification when the configured time is within the polling window AND
// hasn't already fired today. When background push is enabled the server is
// the delivery mechanism and this timer stands down (see tick guard).
export default function useReminders() {
  // Subscription refresh on app open: if push is enabled, re-assert the
  // subscription and re-sync prefs/timezone so the stored record never goes
  // stale (endpoint rotation is also handled by the SW's
  // pushsubscriptionchange handler while the app is closed).
  useEffect(()=>{ autoResync().catch(()=>{}); },[]);
  useEffect(()=>{
    if(typeof Notification==="undefined") return;
    const SESSION_LABELS={fajr:"Fajr — memorize today's page",dhuhr:"Dhuhr — review last 5 days",asr:"Asr — revise older juz",maghrib:"Maghrib — listen to today's page",isha:"Isha — final review before sleep"};
    const tick=()=>{
      if(Notification.permission!=="granted") return;
      // When background push is enabled the server is the source of truth —
      // skip the in-tab timer so the user doesn't get double notifications.
      try { if(localStorage.getItem("rihlat-push-enabled")==="1") return; } catch { /* ignore */ }
      let prefs;
      try { prefs=JSON.parse(localStorage.getItem("rihlat-reminders")||"null"); } catch { return; }
      if(!prefs||!prefs.sessions) return;
      // Master notifications switch (Reminders page). undefined = on for anyone
      // who set reminders up before the switch existed; explicit false = muted.
      if(prefs.enabled===false) return;
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
          try { new Notification("Al-Hifz",{body:SESSION_LABELS[id]||id,tag:`rihlat-${id}-${today}`}); } catch { /* ignore */ }
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
