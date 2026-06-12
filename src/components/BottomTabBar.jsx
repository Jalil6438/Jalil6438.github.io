// Bottom tab bar — the app-shell's primary navigation (My Hifz / Al-Qur'an /
// Journey / Haramain). Rendered in-flow with order:99 so it always sits at the
// bottom of the flex column regardless of JSX position, letting scroll
// containers bound naturally above it. Hidden on the Quran tab unless a drawer
// page is open. Pure presentational; extracted verbatim from the root component.
export default function BottomTabBar({ activeTab, appPage, dark, setActiveTab, setRihlahTab }) {
  if (!(activeTab !== "quran" || appPage)) return null;
  return (
    <div style={{order:99,zIndex:80,background:dark?"rgba(8,10,18,0.97)":"#EADFC8",borderTop:`1px solid ${dark?"rgba(212,175,55,0.10)":"rgba(0,0,0,0.08)"}`,display:"flex",flexShrink:0,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
      {[
        {id:"myhifz",  img:"/tab-hifz.png",   label:"My Hifz"},
        {id:"quran",   img:"/tab-quran.png",   label:"Al-Qur'an"},
        {id:"rihlah",  img:"/tab-rihlah.png",  label:"Journey"},
        {id:"masjidayn",icon:"🕋",  label:"Haramain"},
      ].map(t=>(
        <div key={t.id} className="ttab" onClick={()=>{setActiveTab(t.id);if(t.id==="rihlah")setRihlahTab("home");}} style={{flex:1,padding:"2px 4px 2px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
          {t.img?(
            <img src={t.img} alt={t.label} style={{width:64,height:64,objectFit:"contain",transform:t.id==="rihlah"?"translateY(6px)":undefined,opacity:activeTab===t.id?1:0.55,transition:"all .15s",filter:activeTab===t.id?"brightness(1.2) drop-shadow(0 0 6px rgba(212,175,55,0.7))":"brightness(0.8)"}}/>
          ):(
            <span style={{fontSize:40,width:64,height:64,display:"flex",alignItems:"center",justifyContent:"center",opacity:activeTab===t.id?1:0.55}}>{t.icon}</span>
          )}
          <span style={{fontSize:11,fontWeight:activeTab===t.id?700:400,color:activeTab===t.id?"#E6B84A":"#8A9098"}}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}
