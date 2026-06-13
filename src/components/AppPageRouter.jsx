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
      }} onImport={(file)=>{
        // Restore from a backup produced by onExport above. Validates fully
        // before writing, confirms the overwrite, restores only the known
        // export keys, rolls back on any write error (never a partial
        // restore), then reloads so the app re-initialises from fresh state.
        if(!file) return;
        const KEYS=["jalil-quran-v8","rihlat-username","rihlat-onboarded","rihlat-rep-target","rihlat-fontsize","rihlat-default-reading-mode","rihlat-translation-source","rihlat-tafsir-view","rihlat-plan-mode","rihlat-mushaf-bookmarks","rihlat-reflections","rihlat-daily-progress","rihlat-session-log","rihlat-gallery-view","rihlat-tajweed","jalil-recent-activity","jalil-badge-milestones","jalil-asr-cycle","jalil-quran-lastpage","jalil-wisdom-offset","jalil-hifz-reminder"];
        const reader=new FileReader();
        reader.onerror=()=>{ alert("Restore failed: couldn't read that file."); };
        reader.onload=()=>{
          let parsed;
          try{ parsed=JSON.parse(reader.result); }
          catch{ alert("Restore failed: that file isn't valid JSON."); return; }
          // Validate the envelope.
          if(!parsed||typeof parsed!=="object"||parsed.app!=="rihlat-al-hifz"||!parsed.data||typeof parsed.data!=="object"){
            alert("Restore failed: this doesn't look like an Al-Hifz backup."); return;
          }
          // Collect only known keys with string values (localStorage stores strings).
          const toRestore={};
          for(const k of KEYS){ const v=parsed.data[k]; if(typeof v==="string") toRestore[k]=v; }
          const keys=Object.keys(toRestore);
          if(keys.length===0){ alert("Restore failed: the backup contains no restorable progress."); return; }
          // Integrity check: the core progress blob, if present, must parse.
          if(toRestore["jalil-quran-v8"]!==undefined){
            try{ JSON.parse(toRestore["jalil-quran-v8"]); }
            catch{ alert("Restore failed: the backup's core progress data is corrupted."); return; }
          }
          // Confirm the destructive overwrite.
          const when=parsed.exportedAt?new Date(parsed.exportedAt).toLocaleString():"an unknown date";
          if(!window.confirm(`Restore this backup from ${when}?\n\nThis will OVERWRITE the progress on this device and reload the app. This cannot be undone.`)) return;
          // All-or-nothing write: snapshot current values, restore, roll back on failure.
          const snapshot={};
          for(const k of keys){ snapshot[k]=localStorage.getItem(k); }
          try{
            for(const k of keys){ localStorage.setItem(k,toRestore[k]); }
          }catch(e){
            for(const k of keys){ if(snapshot[k]===null) localStorage.removeItem(k); else localStorage.setItem(k,snapshot[k]); }
            alert("Restore failed while writing — your existing data was left unchanged ("+e.message+")."); return;
          }
          // Re-initialise cleanly from the restored state.
          window.location.reload();
        };
        reader.readAsText(file);
      }}/>}
    </div>
  );
}
