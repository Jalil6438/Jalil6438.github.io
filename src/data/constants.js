// ── DATA CONSTANTS — extracted from quran-hifz-tracker.jsx ──

// ── QURAN RECITERS (Al-Quran Al-Karim tab) ──
export const QURAN_RECITERS = [
  { id:"dosari",   name:"Yasser Al-Dosari",       arabic:"ياسر الدوسري",      quranicaudio:"yasser_ad-dussary" },
  { id:"alafasy",  name:"Mishary Rashid Alafasy",  arabic:"مشاري راشد العفاسي", quranicaudio:"mishaari_raashid_al_3afaasy" },
  { id:"juhany",   name:"Abdullah Al-Juhany",     arabic:"عبدالله الجهني",    quranicaudio:"abdullaah_3awwaad_al-juhaynee" },
  { id:"sudais",   name:"Abdul Rahman As-Sudais", arabic:"عبدالرحمن السديس",  quranicaudio:"abdurrahmaan_as-sudays" },
  { id:"shuraim",  name:"Saud Ash-Shuraim",       arabic:"سعود الشريم",       quranicaudio:"sa3ood_al-shuraym" },
  { id:"muaiqly",  name:"Maher Al-Muaiqly",       arabic:"ماهر المعيقلي",     quranicaudio:"maher_almuaiqly" },
  { id:"hudhaify", name:"Ali Al-Hudhaify",        arabic:"علي الحذيفي",       quranicaudio:"huthayfi" },
  { id:"ayyoub",   name:"Muhammad Ayyoub",        arabic:"محمد أيوب",         quranicaudio:"muhammad_ayyoub" },
  { id:"budair",   name:"Salah Al-Budair",        arabic:"صلاح البدير",       quranicaudio:"salahbudair" },
  { id:"shatri",   name:"Abu Bakr Ash-Shatri",   arabic:"أبو بكر الشاطري",   quranicaudio:"abu_bakr_ash-shaatree" },
  { id:"rifai",    name:"Hani Ar-Rifai",          arabic:"هاني الرفاعي",      quranicaudio:"hani_ar-rifai" },
  { id:"qasim",    name:"Abdul Muhsin Al-Qasim",  arabic:"عبدالمحسن القاسم",  quranicaudio:"muhsin_al_qasim" },
  { id:"abbad",    name:"Fares Abbad",            arabic:"فارس عباد",         quranicaudio:"fares_abbad" },
  { id:"qatami",   name:"Nasser Al-Qatami",       arabic:"ناصر القطامي",      quranicaudio:"nasser_alqatami" },
];

// ── RECITERS (My Hifz tab — ayah by ayah confirmed) ──
export const RECITERS = [
  // ── Masjid Al-Haram ──
  { id:"dosari",  name:"Yasser Al-Dosari",       arabic:"ياسر الدوسري",     recitationId:137, everyayah:"Yasser_Ad-Dussary_128kbps",            quranicaudioId:97,  tag:"Masjid Al-Haram",  style:"Emotional · Slow",         dot:"#F0C040" },
  { id:"juhany",  name:"Abdullah Al-Juhany",     arabic:"عبدالله الجهني",   recitationId:140, everyayah:"Abdullaah_3awwaad_Al-Juhaynee_128kbps", quranicaudioId:1,   tag:"Masjid Al-Haram",  style:"Clear · Balanced",         dot:"#4A9EFF" },
  { id:"sudais",  name:"Abdul Rahman As-Sudais", arabic:"عبدالرحمن السديس", recitationId:2,   everyayah:"Abdurrahmaan_As-Sudais_192kbps",        quranicaudioId:7,   tag:"Masjid Al-Haram",  style:"Powerful · Authoritative", dot:"#E5534B" },
  { id:"shuraim", name:"Saud Ash-Shuraim",       arabic:"سعود الشريم",      recitationId:4,   everyayah:"Saood_ash-Shuraym_128kbps",             quranicaudioId:4,   tag:"Masjid Al-Haram",  style:"Strong · Measured",        dot:"#8B9BAA" },
  { id:"muaiqly", name:"Maher Al-Muaiqly",       arabic:"ماهر المعيقلي",    recitationId:128, everyayah:"MaherAlMuaiqly128kbps",                 quranicaudioId:159, tag:"Masjid Al-Haram",  style:"Warm · Melodic",           dot:"#F6A623" },
  { id:"shatri",  name:"Abu Bakr Ash-Shatri",    arabic:"أبو بكر الشاطري",  recitationId:122, everyayah:"Abu_Bakr_Ash-Shaatree_128kbps",         quranicaudioId:94,  tag:"Masjid Al-Haram",  style:"Expressive · Rich",        dot:"#E67E22" },
  { id:"rifai",   name:"Hani Ar-Rifai",          arabic:"هاني الرفاعي",     recitationId:138, everyayah:"Hani_Rifai_192kbps",                    quranicaudioId:47,  tag:"Masjid Al-Haram",  style:"Soft · Heartfelt",         dot:"#1ABC9C" },
  // ── Popular for Hifz ──
  { id:"alafasy", name:"Mishary Rashid Alafasy",  arabic:"مشاري راشد العفاسي",recitationId:7,   everyayah:"Alafasy_128kbps",                       quranicaudioId:6,   tag:"Hifz Favorite",    style:"Clear · Melodic",          dot:"#9B59B6" },
  // ── Masjid An-Nabawi ──
  { id:"hudhaify",name:"Ali Al-Hudhaify",        arabic:"علي الحذيفي",      recitationId:10,  everyayah:"Hudhaify_128kbps",                      quranicaudioId:8,   tag:"Masjid An-Nabawi", style:"Gentle · Precise",         dot:"#3ECC71" },
  { id:"ayyoub",  name:"Muhammad Ayyoub",        arabic:"محمد أيوب",        recitationId:99,  everyayah:"Muhammad_Ayyoub_128kbps",               quranicaudioId:107, tag:"Masjid An-Nabawi", style:"Deep · Meditative",        dot:"#4A9EFF" },
  { id:"budair",  name:"Salah Al-Budair",        arabic:"صلاح البدير",      recitationId:135, everyayah:"Salah_Al_Budair_128kbps",               quranicaudioId:43,  tag:"Masjid An-Nabawi", style:"Smooth · Rhythmic",        dot:"#F0C040" },
  { id:"qasim",   name:"Abdul Muhsin Al-Qasim",  arabic:"عبدالمحسن القاسم", recitationId:215, everyayah:"Muhsin_Al_Qasim_192kbps",               quranicaudioId:215, tag:"Masjid An-Nabawi", style:"Calm · Steady",            dot:"#2ECC71" },
  { id:"abbad",   name:"Fares Abbad",            arabic:"فارس عباد",        recitationId:139, everyayah:"Fares_Abbad_64kbps",                    quranicaudioId:39,  tag:"Masjid An-Nabawi", style:"Gentle · Flowing",         dot:"#3498DB" },
  // ── Other ──
  { id:"qatami",  name:"Nasser Al-Qatami",      arabic:"ناصر القطامي",     recitationId:129, everyayah:"Nasser_Alqatami_128kbps",               quranicaudioId:129, tag:"Popular",           style:"Emotional · Powerful",      dot:"#E74C3C" },
];

// ── SURAH DATA ──
export const SURAH_EN = {
  1:"Al-Fatiha",2:"Al-Baqarah",3:"Aal Imran",4:"An-Nisa",5:"Al-Ma'idah",6:"Al-An'am",7:"Al-A'raf",8:"Al-Anfal",9:"At-Tawbah",10:"Yunus",
  11:"Hud",12:"Yusuf",13:"Ar-Ra'd",14:"Ibrahim",15:"Al-Hijr",16:"An-Nahl",17:"Al-Isra",18:"Al-Kahf",19:"Maryam",20:"Ta-Ha",
  21:"Al-Anbiya",22:"Al-Hajj",23:"Al-Mu'minun",24:"An-Nur",25:"Al-Furqan",26:"Ash-Shu'ara",27:"An-Naml",28:"Al-Qasas",29:"Al-Ankabut",30:"Ar-Rum",
  31:"Luqman",32:"As-Sajda",33:"Al-Ahzab",34:"Saba",35:"Fatir",36:"Ya-Sin",37:"As-Saffat",38:"Sad",39:"Az-Zumar",40:"Ghafir",
  41:"Fussilat",42:"Ash-Shura",43:"Az-Zukhruf",44:"Ad-Dukhan",45:"Al-Jathiya",46:"Al-Ahqaf",47:"Muhammad",48:"Al-Fath",49:"Al-Hujurat",50:"Qaf",
  51:"Adh-Dhariyat",52:"At-Tur",53:"An-Najm",54:"Al-Qamar",55:"Ar-Rahman",56:"Al-Waqi'ah",57:"Al-Hadid",58:"Al-Mujadila",59:"Al-Hashr",60:"Al-Mumtahina",
  61:"As-Saf",62:"Al-Jumu'ah",63:"Al-Munafiqun",64:"At-Taghabun",65:"At-Talaq",66:"At-Tahrim",67:"Al-Mulk",68:"Al-Qalam",69:"Al-Haqqa",70:"Al-Ma'arij",
  71:"Nuh",72:"Al-Jinn",73:"Al-Muzzammil",74:"Al-Muddathir",75:"Al-Qiyama",76:"Al-Insan",77:"Al-Mursalat",78:"An-Naba",79:"An-Nazi'at",80:"Abasa",
  81:"At-Takwir",82:"Al-Infitar",83:"Al-Mutaffifin",84:"Al-Inshiqaq",85:"Al-Buruj",86:"At-Tariq",87:"Al-A'la",88:"Al-Ghashiya",89:"Al-Fajr",90:"Al-Balad",
  91:"Ash-Shams",92:"Al-Layl",93:"Ad-Duha",94:"Ash-Sharh",95:"At-Tin",96:"Al-Alaq",97:"Al-Qadr",98:"Al-Bayyina",99:"Az-Zalzala",100:"Al-Adiyat",
  101:"Al-Qari'a",102:"At-Takathur",103:"Al-Asr",104:"Al-Humaza",105:"Al-Fil",106:"Quraysh",107:"Al-Ma'un",108:"Al-Kawthar",109:"Al-Kafirun",110:"An-Nasr",
  111:"Al-Masad",112:"Al-Ikhlas",113:"Al-Falaq",114:"An-Nas",
};

export const SURAH_AYAH_COUNTS = {
  1:7,2:286,3:200,4:176,5:120,6:165,7:206,8:75,9:129,10:109,11:123,12:111,13:43,14:52,15:99,16:128,17:111,18:110,19:98,20:135,
  21:112,22:78,23:118,24:64,25:77,26:227,27:93,28:88,29:69,30:60,31:34,32:30,33:73,34:54,35:45,36:83,37:182,38:88,39:75,40:85,
  41:54,42:53,43:89,44:59,45:37,46:35,47:38,48:29,49:18,50:45,51:60,52:49,53:62,54:55,55:78,56:96,57:29,58:22,59:24,60:13,
  61:14,62:11,63:11,64:18,65:12,66:12,67:30,68:52,69:52,70:44,71:28,72:28,73:20,74:56,75:40,76:31,77:50,78:40,79:46,80:42,
  81:29,82:19,83:36,84:25,85:22,86:17,87:19,88:26,89:30,90:20,91:15,92:21,93:11,94:8,95:8,96:19,97:5,98:8,99:8,100:11,
  101:11,102:8,103:3,104:9,105:5,106:4,107:7,108:3,109:6,110:3,111:5,112:4,113:5,114:6,
};

// ── JUZ RANGES ──
export const JUZ_RANGES = {
  1:{start:"1:1",  end:"2:141", total:148}, 2:{start:"2:142",end:"2:252", total:111},
  3:{start:"2:253",end:"3:92",  total:126}, 4:{start:"3:93", end:"4:23",  total:131},
  5:{start:"4:24", end:"4:147", total:124}, 6:{start:"4:148",end:"5:81",  total:110},
  7:{start:"5:82", end:"6:110", total:149}, 8:{start:"6:111",end:"7:87",  total:142},
  9:{start:"7:88", end:"8:40",  total:159}, 10:{start:"8:41",end:"9:92",  total:127},
  11:{start:"9:93",end:"11:5",  total:151}, 12:{start:"11:6",end:"12:52", total:170},
  13:{start:"12:53",end:"14:52",total:154}, 14:{start:"15:1",end:"16:128",total:227},
  15:{start:"17:1",end:"18:74", total:185}, 16:{start:"18:75",end:"20:135",total:269},
  17:{start:"21:1",end:"22:78", total:190}, 18:{start:"23:1",end:"25:20", total:202},
  19:{start:"25:21",end:"27:55",total:339}, 20:{start:"27:56",end:"29:45",total:171},
  21:{start:"29:46",end:"33:30",total:178}, 22:{start:"33:31",end:"36:27",total:169},
  23:{start:"36:28",end:"39:31",total:357}, 24:{start:"39:32",end:"41:46",total:175},
  25:{start:"41:47",end:"45:37",total:246}, 26:{start:"46:1", end:"51:30",total:195},
  27:{start:"51:31",end:"57:29",total:399}, 28:{start:"58:1", end:"66:12",total:137},
  29:{start:"67:1", end:"77:50",total:431}, 30:{start:"78:1", end:"114:6",total:564},
};

// ── THEME ──
export const DARK  = {bg:"#04070A",surface:"linear-gradient(180deg,rgba(15,20,32,0.97),rgba(9,13,22,0.99))",surface2:"rgba(255,255,255,0.04)",border:"rgba(212,175,55,0.18)",border2:"rgba(212,175,55,0.10)",text:"#F3E7BF",sub:"rgba(243,231,191,0.70)",dim:"rgba(243,231,191,0.45)",vdim:"rgba(243,231,191,0.25)",accent:"#D4AF37",accentDim:"rgba(212,175,55,0.10)",input:"rgba(15,20,32,0.97)",inputBorder:"rgba(212,175,55,0.25)",inputText:"#F3E7BF"};
export const LIGHT = {bg:"#F3E9D2",surface:"#EADFC8",surface2:"#E0D5BC",border:"rgba(0,0,0,0.08)",border2:"rgba(0,0,0,0.06)",text:"#2D2A26",sub:"#6B645A",dim:"#6B645A",vdim:"#9A9488",accent:"#D4AF37",accentDim:"rgba(212,175,55,0.10)",input:"#EADFC8",inputBorder:"rgba(0,0,0,0.08)",inputText:"#2D2A26"};

export const STATUS_CFG = {
  complete:       {label:"Memorized",    color:"#F0C040"},
  in_progress:    {label:"In Progress",  color:"#F6A623"},
  needs_revision: {label:"Needs Revision",color:"#E5534B"},
  not_started:    {label:"Not Started",  color:"#3A8A50"},
};

export const MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];
export const TODAY=()=>new Date().toDateString();
export const DATEKEY=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
export const FMTDATE=()=>new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
