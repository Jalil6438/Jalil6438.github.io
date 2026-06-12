// Global CSS injected once at the app root via <style>{buildGlobalCss(dark, T)}.
// Theme-dependent values (scrollbar, hover backgrounds, asr-shell, range thumb)
// interpolate dark/T, so this stays a function rather than a static string.
// Extracted verbatim from the root component.
export default function buildGlobalCss(dark, T) {
  return `
        *{box-sizing:border-box;margin:0;padding:0;}
        .lm div,.lm span,.lm p,.lm label,.lm textarea,.lm input{color:#2D2A26 !important;}
        .lm .asr-title{color:#D4AF37 !important;text-shadow:none !important;}
        .lm [style*="background: linear-gradient"][style*="#D4AF37"] span,.lm [style*="background: linear-gradient"][style*="#D4AF37"] div{color:#0A0E1A !important;}
        .lm .asr-row-divider{background:linear-gradient(90deg,rgba(139,106,16,0) 0%,rgba(139,106,16,0.15) 50%,rgba(139,106,16,0) 100%) !important;box-shadow:none !important;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-thumb{border-radius:3px;background:${dark?"#2A3446":"#C8C0A8"};}
        .sbtn{transition:opacity .12s;cursor:pointer;user-select:none;}.sbtn:hover{opacity:.72;}
        .jrow{cursor:pointer;border-left:3px solid transparent;transition:background .1s;}.jrow:hover{background:${dark?"#141B27":"#EDE8DC"}!important;}
        .srow{cursor:pointer;transition:background .12s;}.srow:hover{background:${dark?"#141B27":"#EDE8DC"}!important;}
        .chkrow{cursor:pointer;transition:all .13s;}.chkrow:hover{background:${dark?"#141B27":"#EDE8DC"}!important;}
        .ttab{cursor:pointer;transition:all .15s;user-select:none;}.ttab:hover{opacity:.8;}
        @keyframes fi{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}.fi{animation:fi .2s ease;}
        @keyframes asrSlideLeft{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes asrSlideRight{from{transform:translateX(-40px);opacity:0}to{transform:translateX(0);opacity:1}}
        .asr-slide-left{animation:asrSlideLeft .2s ease-out}
        .asr-slide-right{animation:asrSlideRight .2s ease-out}
        @keyframes pageTurnNext{0%{transform:perspective(900px) rotateY(18deg) translateX(30px);opacity:0}60%{opacity:1}100%{transform:perspective(900px) rotateY(0deg) translateX(0);opacity:1}}
        @keyframes pageTurnPrev{0%{transform:perspective(900px) rotateY(-18deg) translateX(-30px);opacity:0}60%{opacity:1}100%{transform:perspective(900px) rotateY(0deg) translateX(0);opacity:1}}
        .page-next{animation:pageTurnNext .4s ease-out;transform-origin:left center;}
        .page-prev{animation:pageTurnPrev .4s ease-out;transform-origin:right center;}
        .asr-surah-btn{transition:all .15s ease;transform:scale(1);}
        .asr-surah-btn:active{transform:scale(0.97);transition:transform .06s ease-out;}
        @keyframes goldPulse{0%,100%{box-shadow:0 0 12px rgba(230,184,74,0.15)}50%{box-shadow:0 0 24px rgba(230,184,74,0.35)}}
        .rep-done-glow{animation:goldPulse 2s ease-in-out infinite;}
        @keyframes goldParticle{0%{transform:translateY(0) scale(1);opacity:0.08}50%{opacity:0.05}100%{transform:translateY(-100vh) scale(0.3);opacity:0}}
        .gold-particles::before,.gold-particles::after{content:"";position:fixed;width:3px;height:3px;border-radius:50%;background:#D4AF37;pointer-events:none;z-index:0;}
        .gold-particles::before{left:15%;bottom:-10px;animation:goldParticle 12s linear infinite;opacity:0.07;}
        .gold-particles::after{left:75%;bottom:-10px;animation:goldParticle 18s linear 4s infinite;opacity:0.05;width:2px;height:2px;}
        @keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .9s linear infinite;}@keyframes slideUpDrawer{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes slideDownDrawer{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes sideMenuIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}.pulse{animation:pulse 1.6s infinite;}

        .pbfill{transition:width .8s cubic-bezier(.4,0,.2,1);}
        input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;background:${dark?"#0C1A0E":"#D0C8B0"};outline:none;}
        .asr-shell{position:relative;border-radius:30px;padding:16px 0px 22px;overflow:visible;background:${dark?"radial-gradient(circle at 50% 12%,rgba(58,92,165,0.16) 0%,rgba(58,92,165,0.05) 18%,rgba(0,0,0,0) 42%),linear-gradient(180deg,#081225 0%,#050A14 100%)":"#EADFC8"};box-shadow:${dark?"0 14px 36px rgba(0,0,0,0.42)":"0 4px 16px rgba(0,0,0,0.08)"};}
        .asr-shell::before{content:"";position:absolute;inset:0;border-radius:30px;padding:1px;background:${dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(217,177,95,0.03) 10%,rgba(232,200,120,0.18) 50%,rgba(217,177,95,0.03) 90%,rgba(217,177,95,0) 100%) top/100% 1px no-repeat,linear-gradient(180deg,rgba(217,177,95,0.05) 0%,rgba(217,177,95,0.015) 30%,rgba(217,177,95,0.035) 100%)":"linear-gradient(90deg,rgba(139,106,16,0) 0%,rgba(139,106,16,0.12) 50%,rgba(139,106,16,0) 100%) top/100% 1px no-repeat,linear-gradient(180deg,rgba(139,106,16,0.08) 0%,rgba(139,106,16,0.03) 100%)"};-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;}
        .asr-title{text-align:center;font-size:15px;letter-spacing:.26em;text-transform:uppercase;font-weight:800;color:${dark?"#E8C878":"#6B645A"};margin-bottom:10px;text-shadow:${dark?"0 0 18px rgba(217,177,95,0.28)":"none"};}
        .asr-title-line{position:relative;height:1px;margin:8px 0 18px;background:linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(217,177,95,0.04) 18%,rgba(232,200,120,0.42) 50%,rgba(217,177,95,0.04) 82%,rgba(217,177,95,0) 100%);}
        .asr-ayah-panel{position:relative;border-radius:0;padding:6px 20px;overflow:visible;background:${dark?"rgba(8,16,34,0.30)":"rgba(0,0,0,0.04)"};}
        .asr-ayah-panel::before{display:none;}
        .asr-row{display:flex;align-items:center;gap:4px;min-height:56px;padding:10px 6px 14px;}
        .asr-row-divider{height:1px;margin:0 18px;background:linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(217,177,95,0.15) 15%,rgba(232,200,120,0.55) 50%,rgba(217,177,95,0.15) 85%,rgba(217,177,95,0) 100%);box-shadow:0 0 6px rgba(217,177,95,0.18),0 1px 3px rgba(217,177,95,0.10);}
        .asr-num{width:30px;height:30px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:rgba(226,188,114,0.72);font-size:11px;font-weight:500;background:transparent;box-shadow:inset 0 0 0 1px rgba(217,177,95,0.18);}
        .asr-arw{position:absolute;top:50%;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;color:rgba(226,188,114,0.52);font-size:28px;font-weight:300;background:transparent;cursor:pointer;user-select:none;transition:all .15s;z-index:5;}
        .asr-arw:hover{opacity:1;color:rgba(226,188,114,0.80);} .asr-arw.left{left:6px;} .asr-arw.right{right:6px;}
        .asr-progress-rule{height:1px;margin:18px 0 16px;background:linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(217,177,95,0.05) 20%,rgba(243,231,200,0.08) 50%,rgba(217,177,95,0.05) 80%,rgba(217,177,95,0) 100%);}

        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${T.accent};cursor:pointer;}
        textarea:focus{outline:none;} select{cursor:pointer;}
      `;
}
