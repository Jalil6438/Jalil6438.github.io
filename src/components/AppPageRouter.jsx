import StatsPage from "./pages/StatsPage";
import RemindersPage from "./pages/RemindersPage";
import MethodPage from "./pages/MethodPage";
import HelpPage from "./pages/HelpPage";
import AboutPage from "./pages/AboutPage";
import ExportPage from "./pages/ExportPage";
import SettingsPage from "./pages/SettingsPage";
import TermsPage from "./pages/TermsPage";

// Full-screen drawer pages — rendered below the universal header so the profile
// row stays consistent across all drawer-reachable screens. Pure presentational
// dispatch on appPage; extracted verbatim from the root component. Returns null
// when no drawer page is open so the caller can render it unconditionally.
export default function AppPageRouter({ appPage, setAppPage, dark, T, completedCount, streak, sessionJuz, goalLabel, pct }) {
  if (!appPage) return null;
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,background:dark?"#0B1220":"#F3E9D2"}}>
      {appPage==="stats"&&<StatsPage dark={dark} onBack={()=>setAppPage(null)} completedCount={completedCount} streak={streak} longestStreak={streak} sessionJuz={sessionJuz} goalLabel={goalLabel} pct={pct}/>}
      {appPage==="reminders"&&<RemindersPage dark={dark} onBack={()=>setAppPage(null)}/>}
      {appPage==="method"&&<MethodPage dark={dark} onBack={()=>setAppPage(null)}/>}
      {appPage==="help"&&<HelpPage dark={dark} onBack={()=>setAppPage(null)}/>}
      {appPage==="about"&&<AboutPage dark={dark} onBack={()=>setAppPage(null)}/>}
      {appPage==="settings"&&<SettingsPage dark={dark} T={T} onBack={()=>setAppPage(null)}/>}
      {appPage==="terms"&&<TermsPage dark={dark} T={T} onBack={()=>setAppPage(null)}/>}
      {appPage==="export"&&<ExportPage dark={dark} onBack={()=>setAppPage(null)} onExport={()=>{
        try{
          const KEYS=["jalil-quran-v8","rihlat-username","rihlat-onboarded","rihlat-rep-target","rihlat-fontsize","rihlat-default-reading-mode","rihlat-translation-source","rihlat-tafsir-view","rihlat-plan-mode","rihlat-mushaf-bookmarks","rihlat-reflections","rihlat-daily-progress","rihlat-session-log","rihlat-gallery-view","rihlat-tajweed","jalil-recent-activity","jalil-badge-milestones","jalil-asr-cycle","jalil-quran-lastpage","jalil-wisdom-offset","jalil-hifz-reminder"];
          const data={};
          for(const k of KEYS){ const v=localStorage.getItem(k); if(v!==null) data[k]=v; }
          const payload={app:"rihlat-al-hifz",version:1,exportedAt:new Date().toISOString(),data};
          const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
          const url=URL.createObjectURL(blob);
          const a=document.createElement("a");
          a.href=url;
          const today=new Date().toISOString().slice(0,10);
          a.download=`rihlat-backup-${today}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }catch(e){ alert("Export failed: "+e.message); }
      }}/>}
    </div>
  );
}
