import StatsPage from "./pages/StatsPage";
import RemindersPage from "./pages/RemindersPage";
import MethodPage from "./pages/MethodPage";
import HelpPage from "./pages/HelpPage";
import AboutPage from "./pages/AboutPage";
import ExportPage from "./pages/ExportPage";
import SettingsPage from "./pages/SettingsPage";
import TermsPage from "./pages/TermsPage";
import RecoveryPage from "./pages/RecoveryPage";
import { buildBackup, readBackup, applyBackup } from "../backup/localBackup";

// Full-screen drawer pages — rendered below the universal header so the profile
// row stays consistent across all drawer-reachable screens. Pure presentational
// dispatch on appPage; extracted verbatim from the root component. Returns null
// when no drawer page is open so the caller can render it unconditionally.
export default function AppPageRouter({ appPage, setAppPage, dark, setDark, T, completedCount, streak, sessionJuz, goalLabel, pct }) {
  if (!appPage) return null;
  // Reminders / About / Terms / Export are now reached only from inside Settings,
  // so their Back returns to Settings rather than the home tab.
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,background:dark?"#0B1220":"#F3E9D2"}}>
      {appPage==="stats"&&<StatsPage dark={dark} onBack={()=>setAppPage(null)} completedCount={completedCount} streak={streak} longestStreak={streak} sessionJuz={sessionJuz} goalLabel={goalLabel} pct={pct}/>}
      {appPage==="reminders"&&<RemindersPage dark={dark} onBack={()=>setAppPage("settings")}/>}
      {appPage==="method"&&<MethodPage dark={dark} onBack={()=>setAppPage(null)}/>}
      {appPage==="help"&&<HelpPage dark={dark} onBack={()=>setAppPage(null)}/>}
      {appPage==="about"&&<AboutPage dark={dark} onBack={()=>setAppPage("settings")}/>}
      {appPage==="settings"&&<SettingsPage dark={dark} setDark={setDark} T={T} setAppPage={setAppPage} onBack={()=>setAppPage(null)}/>}
      {appPage==="terms"&&<TermsPage dark={dark} T={T} onBack={()=>setAppPage("settings")}/>}
      {appPage==="recovery"&&<RecoveryPage dark={dark} onBack={()=>setAppPage("settings")}/>}
      {appPage==="export"&&<ExportPage dark={dark} onBack={()=>setAppPage("settings")} onRecovery={()=>setAppPage("recovery")} onExport={()=>{
        try{
          // Payload is built from the single shared key list in
          // src/backup/localBackup.js, so export and restore can never drift.
          const payload=buildBackup(localStorage,new Date().toISOString());
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
        // Restore from a backup produced by onExport above. Envelope validation,
        // key filtering, core-blob integrity checks, and the all-or-nothing write
        // with rollback all live in the shared pure core (src/backup/localBackup.js).
        // The DOM concerns — reading the file, confirming the overwrite, and
        // reloading so the app re-initialises — stay here.
        if(!file) return;
        const reader=new FileReader();
        reader.onerror=()=>{ alert("Restore failed: couldn't read that file."); };
        reader.onload=()=>{
          let parsed;
          try{ parsed=JSON.parse(reader.result); }
          catch{ alert("Restore failed: that file isn't valid JSON."); return; }
          let backup;
          try{ backup=readBackup(parsed); }
          catch(err){
            const code=err&&err.code;
            alert(
              code==="BAD_ENVELOPE" ? "Restore failed: this doesn't look like an Al-Hifz backup." :
              code==="NO_KEYS" ? "Restore failed: the backup contains no restorable progress." :
              code==="CORRUPT_CORE" ? "Restore failed: the backup's core progress data is corrupted." :
              "Restore failed: this backup could not be read."
            );
            return;
          }
          // Confirm the destructive overwrite.
          const when=backup.exportedAt?new Date(backup.exportedAt).toLocaleString():"an unknown date";
          if(!window.confirm(`Restore this backup from ${when}?\n\nThis will OVERWRITE the progress on this device and reload the app. This cannot be undone.`)) return;
          // All-or-nothing write; rolls back and throws on any write error.
          try{ applyBackup(localStorage,backup.data); }
          catch(e){ alert("Restore failed while writing — your existing data was left unchanged ("+(e&&e.message?e.message:"unknown error")+")."); return; }
          // Re-initialise cleanly from the restored state.
          window.location.reload();
        };
        reader.readAsText(file);
      }}/>}
    </div>
  );
}
