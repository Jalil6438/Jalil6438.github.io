import { useState, useEffect, useRef, useMemo } from "react";
// react-quran removed — custom renderer
// Font via Google Fonts (injected in QuranPageView)
// Mushaf images served from github.com/Jalil6438/mushaf-images
function mushafImageUrl(page) {
  // Repo has 3 cover pages before Al-Fatiha, so page 1 = file page-004
  return `https://raw.githubusercontent.com/Jalil6438/mushaf-images/master/page-${String(page + 3).padStart(3,"0")}.png`;
}

// ── QURAN RECITERS (Al-Quran Al-Karim tab) ────────────────────────────────────
const QURAN_RECITERS = [
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

// ── RECITERS (My Hifz tab — ayah by ayah confirmed) ──────────────────────────
const RECITERS = [
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

function audioUrl(recitationId, verseKey) {
  const [surah, ayah] = verseKey.split(":");
  const s = String(surah).padStart(3,"0");
  const a = String(ayah).padStart(3,"0");
  return `https://audio.qurancdn.com/wbw/${s}_${a}_${String(recitationId).padStart(3,"0")}.mp3`;
}

function audioUrlFallback(verseKey, recitationId) {
  return `https://verses.quran.com/${verseKey}.mp3?recitation=${recitationId}`;
}

// ── SESSIONS ──────────────────────────────────────────────────────────────────
const SESSIONS = [
  { id:"fajr",    time:"Fajr",    arabic:"الفجر",  icon:"🌅", color:"#F0C040",
    title:"New Memorization",
    desc:"Your peak retention window. Memorize new ayahs right after salah while the mind is completely fresh.",
    steps:["Read each ayah with its translation first","Recite aloud until the words feel natural","Cover the text and recite from memory","Repeat until you can recite without hesitation","Write it once to solidify the connection"] },
  { id:"dhuhr",   time:"Dhuhr",   arabic:"الظهر",  icon:"☀️", color:"#F6A623",
    title:"Review Yesterday's Ayahs",
    desc:"New ayahs fade fastest in 24 hours. Revision only — no new memorization.",
    steps:["Recite yesterday's ayahs from memory","If you stumble, revisit and repeat until smooth","Connect yesterday's ayahs to today's as one passage"] },
  { id:"asr",     time:"Asr",     arabic:"العصر",  icon:"🌤️", color:"#4ECDC4",
    title:"Review Previous Juz",
    desc:"Cycle through completed Juz. Every Juz should be touched every 7-10 days.",
    steps:["Choose a Juz you haven't reviewed recently","Recite a full page and notice what needs attention","This keeps older memorization strong and accessible"] },
  { id:"maghrib", time:"Maghrib", arabic:"المغرب", icon:"🌆", color:"#B794F4",
    title:"Listening",
    desc:"Follow along with your chosen reciter. Your ear reinforces what your tongue is learning.",
    steps:["Listen to each ayah with full attention","Follow along in the mushaf without reciting","This strengthens your ear and pronunciation"] },
  { id:"isha",    time:"Isha",    arabic:"العشاء", icon:"🌙", color:"#68D391",
    title:"Full Day Review",
    desc:"Recite everything from today before sleep. Sleep consolidates what you review right before it.",
    steps:["Recite today's new ayahs one final time","Go over yesterday's ayahs to keep them fresh","End with dua — ask Allah to preserve the Quran in your heart"] },
];

const SURAH_EN = {
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
const SURAH_AR = {
  1:"الفاتحة",2:"البقرة",3:"آل عمران",4:"النساء",5:"المائدة",6:"الأنعام",7:"الأعراف",8:"الأنفال",9:"التوبة",10:"يونس",
  11:"هود",12:"يوسف",13:"الرعد",14:"إبراهيم",15:"الحجر",16:"النحل",17:"الإسراء",18:"الكهف",19:"مريم",20:"طه",
  21:"الأنبياء",22:"الحج",23:"المؤمنون",24:"النور",25:"الفرقان",26:"الشعراء",27:"النمل",28:"القصص",29:"العنكبوت",30:"الروم",
  31:"لقمان",32:"السجدة",33:"الأحزاب",34:"سبأ",35:"فاطر",36:"يس",37:"الصافات",38:"ص",39:"الزمر",40:"غافر",
  41:"فصلت",42:"الشورى",43:"الزخرف",44:"الدخان",45:"الجاثية",46:"الأحقاف",47:"محمد",48:"الفتح",49:"الحجرات",50:"ق",
  51:"الذاريات",52:"الطور",53:"النجم",54:"القمر",55:"الرحمن",56:"الواقعة",57:"الحديد",58:"المجادلة",59:"الحشر",60:"الممتحنة",
  61:"الصف",62:"الجمعة",63:"المنافقون",64:"التغابن",65:"الطلاق",66:"التحريم",67:"الملك",68:"القلم",69:"الحاقة",70:"المعارج",
  71:"نوح",72:"الجن",73:"المزمل",74:"المدثر",75:"القيامة",76:"الإنسان",77:"المرسلات",78:"النبأ",79:"النازعات",80:"عبس",
  81:"التكوير",82:"الانفطار",83:"المطففين",84:"الانشقاق",85:"البروج",86:"الطارق",87:"الأعلى",88:"الغاشية",89:"الفجر",90:"البلد",
  91:"الشمس",92:"الليل",93:"الضحى",94:"الشرح",95:"التين",96:"العلق",97:"القدر",98:"البينة",99:"الزلزلة",100:"العاديات",
  101:"القارعة",102:"التكاثر",103:"العصر",104:"الهمزة",105:"الفيل",106:"قريش",107:"الماعون",108:"الكوثر",109:"الكافرون",110:"النصر",
  111:"المسد",112:"الإخلاص",113:"الفلق",114:"الناس",
};
const JUZ_OPENERS={1:"الم",2:"سَيَقُولُ السُّفَهَاءُ",3:"تِلْكَ الرُّسُلُ",4:"لَنْ تَنَالُوا الْبِرَّ",5:"وَالْمُحْصَنَاتُ",6:"لَا يُحِبُّ اللَّهُ",7:"وَإِذَا سَمِعُوا",8:"وَلَوْ أَنَّنَا",9:"قَالَ الْمَلَأُ",10:"وَاعْلَمُوا",11:"يَعْتَذِرُونَ",12:"وَمَا مِنْ دَابَّةٍ",13:"وَمَا أُبَرِّئُ",14:"رُبَمَا",15:"سُبْحَانَ الَّذِي",16:"قَالَ أَلَمْ",17:"اقْتَرَبَ لِلنَّاسِ",18:"قَدْ أَفْلَحَ",19:"وَقَالَ الَّذِينَ",20:"أَمَّنْ خَلَقَ",21:"اتْلُ مَا أُوحِيَ",22:"وَمَنْ يَقْنُتْ",23:"وَمَا لِيَ",24:"فَمَنْ أَظْلَمُ",25:"إِلَيْهِ يُرَدُّ",26:"حم",27:"قَالَ فَمَا خَطْبُكُمْ",28:"قَدْ سَمِعَ اللَّهُ",29:"تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ",30:"عَمَّ يَتَسَاءَلُونَ"};

const JUZ_META = [
  {num:1,arabic:"الم",roman:"Alif Lam Mim",order:30},{num:2,arabic:"سَيَقُولُ",roman:"Sayaqool",order:29},
  {num:3,arabic:"تِلْكَ الرُّسُل",roman:"Tilkal Rusul",order:28},{num:4,arabic:"لَن تَنَالُوا",roman:"Lan Tanaloo",order:27},
  {num:5,arabic:"وَالْمُحْصَنَات",roman:"Wal Mohsanat",order:26},{num:6,arabic:"لَا يُحِبُّ",roman:"La Yuhibbu",order:25},
  {num:7,arabic:"وَإِذَا سَمِعُوا",roman:"Wa Iza Samiu",order:24},{num:8,arabic:"وَلَوْ أَنَّنَا",roman:"Wa Lau Annana",order:23},
  {num:9,arabic:"قَالَ الْمَلَأُ",roman:"Qalal Mala",order:22},{num:10,arabic:"وَاعْلَمُوا",roman:"Wa A'lamu",order:21},
  {num:11,arabic:"يَعْتَذِرُونَ",roman:"Ya'taziroon",order:20},{num:12,arabic:"وَمَا مِن دَآبَّة",roman:"Wa Mamin Dabbah",order:19},
  {num:13,arabic:"وَمَا أُبَرِّئُ",roman:"Wa Ma Ubarri'u",order:18},{num:14,arabic:"رُبَمَا",roman:"Rubama",order:17},
  {num:15,arabic:"سُبْحَانَ الَّذِي",roman:"Subhanalladhi",order:16},{num:16,arabic:"قَالَ أَلَمْ",roman:"Qala Alam",order:15},
  {num:17,arabic:"اقْتَرَبَ",roman:"Iqtaraba",order:14},{num:18,arabic:"قَدْ أَفْلَحَ",roman:"Qad Aflaha",order:13},
  {num:19,arabic:"وَقَالَ الَّذِينَ",roman:"Wa Qalallazina",order:12},{num:20,arabic:"أَمَّنْ خَلَقَ",roman:"Amman Khalaq",order:11},
  {num:21,arabic:"اتْلُ مَا أُوحِيَ",roman:"Utlu Ma Oohiya",order:10},{num:22,arabic:"وَمَن يَقْنُتْ",roman:"Wa Manyaqnut",order:9},
  {num:23,arabic:"وَمَا لِيَ",roman:"Wa Mali",order:8},{num:24,arabic:"فَمَنْ أَظْلَمُ",roman:"Faman Azlam",order:7},
  {num:25,arabic:"إِلَيْهِ يُرَدُّ",roman:"Ilayhi Yuraddu",order:6},{num:26,arabic:"حم",roman:"Ha Mim",order:5},
  {num:27,arabic:"قَالَ فَمَا",roman:"Qala Fama Khatbukum",order:4},{num:28,arabic:"قَدْ سَمِعَ",roman:"Qad Sami'Allah",order:3},
  {num:29,arabic:"تَبَارَكَ",roman:"Tabarakalladhi",order:2},{num:30,arabic:"عَمَّ",roman:"Amma",order:1},
];

// ── V9 AYAH ENGINE ───────────────────────────────────────────────────────────
// Source of truth: every surah's exact ayah count. Verified against Quran MCP.
const SURAH_AYAH_COUNTS = {
  1:7,2:286,3:200,4:176,5:120,6:165,7:206,8:75,9:129,10:109,
  11:123,12:111,13:43,14:52,15:99,16:128,17:111,18:110,19:98,20:135,
  21:112,22:78,23:118,24:64,25:77,26:227,27:93,28:88,29:69,30:60,
  31:34,32:30,33:73,34:54,35:45,36:83,37:182,38:88,39:75,40:85,
  41:54,42:53,43:89,44:59,45:37,46:35,47:38,48:29,49:18,50:45,
  51:60,52:49,53:62,54:55,55:78,56:96,57:29,58:22,59:24,60:13,
  61:14,62:11,63:11,64:18,65:12,66:12,67:30,68:52,69:52,70:44,
  71:28,72:28,73:20,74:56,75:40,76:31,77:50,78:40,79:46,80:42,
  81:29,82:19,83:36,84:25,85:22,86:17,87:19,88:26,89:30,90:20,
  91:15,92:21,93:11,94:8,95:8,96:19,97:5,98:8,99:8,100:11,
  101:11,102:8,103:3,104:9,105:5,106:4,107:7,108:3,109:6,110:3,
  111:5,112:4,113:5,114:6
}; // Total: 6236 verified

// Juz boundaries — verified against Quran MCP. total = exact ayah count per juz.
const JUZ_RANGES = {
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


// Expand a verse range into individual ayah keys e.g. "2:142" → "2:252"
function expandRangeToKeys(startKey, endKey) {
  const keys = [];
  let [s,a] = startKey.split(":").map(Number);
  const [es,ea] = endKey.split(":").map(Number);
  while(s < es || (s === es && a <= ea)) {
    keys.push(`${s}:${a}`);
    if(s===es && a===ea) break;
    a++;
    if(a > SURAH_AYAH_COUNTS[s]) { s++; a=1; }
  }
  return keys;
}

// Cached juz key lists — computed once per session
const _juzKeyCache = {};
function getJuzKeys(juzNum) {
  if(!juzNum || !JUZ_RANGES[juzNum]) return [];
  if(!_juzKeyCache[juzNum]) {
    const {start,end} = JUZ_RANGES[juzNum];
    _juzKeyCache[juzNum] = expandRangeToKeys(start, end);
  }
  return _juzKeyCache[juzNum];
}

// V9 storage
const V9_KEY = "jalil-quran-v9";
function loadCompletedAyahs() {
  try { const s=localStorage.getItem(V9_KEY); return s?new Set(JSON.parse(s)):new Set(); } catch { return new Set(); }
}
function saveCompletedAyahs(set) {
  try { localStorage.setItem(V9_KEY, JSON.stringify([...set])); } catch {}
}

// ── JUZ → SURAH MAPPING ──────────────────────────────────────────────────────
const JUZ_SURAHS = {
  1:[{s:1,name:"Al-Fatiha",a:7},{s:2,name:"Al-Baqarah",a:141}],
  2:[{s:2,name:"Al-Baqarah",a:92}],
  3:[{s:2,name:"Al-Baqarah",a:37},{s:3,name:"Aal Imran",a:92}],
  4:[{s:3,name:"Aal Imran",a:88},{s:4,name:"An-Nisa",a:23}],
  5:[{s:4,name:"An-Nisa",a:147}],
  6:[{s:4,name:"An-Nisa",a:57},{s:5,name:"Al-Maidah",a:82}],
  7:[{s:5,name:"Al-Maidah",a:38},{s:6,name:"Al-Anam",a:110}],
  8:[{s:6,name:"Al-Anam",a:51},{s:7,name:"Al-Araf",a:87}],
  9:[{s:7,name:"Al-Araf",a:87},{s:8,name:"Al-Anfal",a:40}],
  10:[{s:8,name:"Al-Anfal",a:40},{s:9,name:"At-Tawbah",a:92}],
  11:[{s:9,name:"At-Tawbah",a:40},{s:10,name:"Yunus",a:109},{s:11,name:"Hud",a:5}],
  12:[{s:11,name:"Hud",a:78},{s:12,name:"Yusuf",a:52}],
  13:[{s:12,name:"Yusuf",a:52},{s:13,name:"Ar-Rad",a:43},{s:14,name:"Ibrahim",a:52}],
  14:[{s:15,name:"Al-Hijr",a:99},{s:16,name:"An-Nahl",a:128}],
  15:[{s:17,name:"Al-Isra",a:111},{s:18,name:"Al-Kahf",a:74}],
  16:[{s:18,name:"Al-Kahf",a:36},{s:19,name:"Maryam",a:98},{s:20,name:"Ta-Ha",a:135}],
  17:[{s:21,name:"Al-Anbiya",a:112},{s:22,name:"Al-Hajj",a:78}],
  18:[{s:23,name:"Al-Muminun",a:118},{s:24,name:"An-Nur",a:64},{s:25,name:"Al-Furqan",a:20}],
  19:[{s:25,name:"Al-Furqan",a:57},{s:26,name:"Ash-Shuara",a:227},{s:27,name:"An-Naml",a:55}],
  20:[{s:27,name:"An-Naml",a:26},{s:28,name:"Al-Qasas",a:88},{s:29,name:"Al-Ankabut",a:45}],
  21:[{s:29,name:"Al-Ankabut",a:24},{s:30,name:"Ar-Rum",a:60},{s:31,name:"Luqman",a:34},{s:32,name:"As-Sajda",a:30},{s:33,name:"Al-Ahzab",a:30}],
  22:[{s:33,name:"Al-Ahzab",a:43},{s:34,name:"Saba",a:54},{s:35,name:"Fatir",a:45},{s:36,name:"Ya-Sin",a:27}],
  23:[{s:36,name:"Ya-Sin",a:56},{s:37,name:"As-Saffat",a:182},{s:38,name:"Sad",a:88},{s:39,name:"Az-Zumar",a:31}],
  24:[{s:39,name:"Az-Zumar",a:44},{s:40,name:"Ghafir",a:85},{s:41,name:"Fussilat",a:46}],
  25:[{s:41,name:"Fussilat",a:8},{s:42,name:"Ash-Shura",a:53},{s:43,name:"Az-Zukhruf",a:89},{s:44,name:"Ad-Dukhan",a:59},{s:45,name:"Al-Jathiya",a:37}],
  26:[{s:46,name:"Al-Ahqaf",a:35},{s:47,name:"Muhammad",a:38},{s:48,name:"Al-Fath",a:29},{s:49,name:"Al-Hujurat",a:18},{s:50,name:"Qaf",a:45},{s:51,name:"Adh-Dhariyat",a:30}],
  27:[{s:51,name:"Adh-Dhariyat",a:30},{s:52,name:"At-Tur",a:49},{s:53,name:"An-Najm",a:62},{s:54,name:"Al-Qamar",a:55},{s:55,name:"Ar-Rahman",a:78},{s:56,name:"Al-Waqiah",a:96},{s:57,name:"Al-Hadid",a:29}],
  28:[{s:58,name:"Al-Mujadila",a:22},{s:59,name:"Al-Hashr",a:24},{s:60,name:"Al-Mumtahina",a:13},{s:61,name:"As-Saf",a:14},{s:62,name:"Al-Jumuah",a:11},{s:63,name:"Al-Munafiqun",a:11},{s:64,name:"At-Taghabun",a:18},{s:65,name:"At-Talaq",a:12},{s:66,name:"At-Tahrim",a:12}],
  29:[{s:67,name:"Al-Mulk",a:30},{s:68,name:"Al-Qalam",a:52},{s:69,name:"Al-Haqqa",a:52},{s:70,name:"Al-Maarij",a:44},{s:71,name:"Nuh",a:28},{s:72,name:"Al-Jinn",a:28},{s:73,name:"Al-Muzzammil",a:20},{s:74,name:"Al-Muddathir",a:56},{s:75,name:"Al-Qiyama",a:40},{s:76,name:"Al-Insan",a:31},{s:77,name:"Al-Mursalat",a:50}],
  30:[{s:78,name:"An-Naba",a:40},{s:79,name:"An-Naziat",a:46},{s:80,name:"Abasa",a:42},{s:81,name:"At-Takwir",a:29},{s:82,name:"Al-Infitar",a:19},{s:83,name:"Al-Mutaffifin",a:36},{s:84,name:"Al-Inshiqaq",a:25},{s:85,name:"Al-Buruj",a:22},{s:86,name:"At-Tariq",a:17},{s:87,name:"Al-Ala",a:19},{s:88,name:"Al-Ghashiya",a:26},{s:89,name:"Al-Fajr",a:30},{s:90,name:"Al-Balad",a:20},{s:91,name:"Ash-Shams",a:15},{s:92,name:"Al-Layl",a:21},{s:93,name:"Ad-Duha",a:11},{s:94,name:"Ash-Sharh",a:8},{s:95,name:"At-Tin",a:8},{s:96,name:"Al-Alaq",a:19},{s:97,name:"Al-Qadr",a:5},{s:98,name:"Al-Bayyina",a:8},{s:99,name:"Az-Zalzala",a:8},{s:100,name:"Al-Adiyat",a:11},{s:101,name:"Al-Qaria",a:11},{s:102,name:"At-Takathur",a:8},{s:103,name:"Al-Asr",a:3},{s:104,name:"Al-Humaza",a:9},{s:105,name:"Al-Fil",a:5},{s:106,name:"Quraysh",a:4},{s:107,name:"Al-Maun",a:7},{s:108,name:"Al-Kawthar",a:3},{s:109,name:"Al-Kafirun",a:6},{s:110,name:"An-Nasr",a:3},{s:111,name:"Al-Masad",a:5},{s:112,name:"Al-Ikhlas",a:4},{s:113,name:"Al-Falaq",a:5},{s:114,name:"An-Nas",a:6}],
};

const STATUS_CFG = {
  complete:       {label:"Memorized",    color:"#F0C040"},
  in_progress:    {label:"In Progress",  color:"#F6A623"},
  needs_revision: {label:"Needs Revision",color:"#E5534B"},
  not_started:    {label:"Not Started",  color:"#3A8A50"},
};function calcTimeline(years,memorizedAyahs,months,nextJuzAyahs,completedJuzCount) {
  const totalAyahs=6236;
  const remainingAyahs=Math.max(0,totalAyahs-memorizedAyahs);
  const totalMonths=(years*12)+(months||0);
  const totalDays=totalMonths*30;
  const apd=totalDays>0?Math.max(1,remainingAyahs/totalDays):1;
  // Juz math — derived from ayah truth
  const juzDone=completedJuzCount||0;
  const juzLeft=Math.max(0,30-juzDone);
  // Use actual next juz size for days-per-juz estimate
  const avgJuzSize=totalAyahs/30;
  const juzSizeForDisplay=nextJuzAyahs||avgJuzSize;
  const daysPerJuz=apd>0?Math.ceil(juzSizeForDisplay/apd):0;
  const juzPerMonth=totalMonths>0?(juzLeft/totalMonths):0;
  return { ayahsPerDay:apd.toFixed(1), daysPerJuz,
           juzPerMonth:juzPerMonth.toFixed(1),
           revDuhr:Math.max(1,Math.round(apd*0.3)), revAsr:Math.max(1,Math.round(apd*0.2)),
           activeDays:totalDays, ayahsLeft:remainingAyahs,
           memorizedAyahs, pct:Math.round((memorizedAyahs/totalAyahs)*100),
           juzDone, juzLeft };
}

const DARK  = {bg:"#04070A",surface:"linear-gradient(180deg,rgba(15,20,32,0.97),rgba(9,13,22,0.99))",surface2:"rgba(255,255,255,0.04)",border:"rgba(212,175,55,0.18)",border2:"rgba(212,175,55,0.10)",text:"#F3E7BF",sub:"rgba(243,231,191,0.70)",dim:"rgba(243,231,191,0.45)",vdim:"rgba(243,231,191,0.25)",accent:"#D4AF37",accentDim:"rgba(212,175,55,0.10)",input:"rgba(15,20,32,0.97)",inputBorder:"rgba(212,175,55,0.25)",inputText:"#F3E7BF"};
const LIGHT = {bg:"#F3E9D2",surface:"#EADFC8",surface2:"#E0D5BC",border:"rgba(0,0,0,0.08)",border2:"rgba(0,0,0,0.06)",text:"#2D2A26",sub:"#6B645A",dim:"#6B645A",vdim:"#9A9488",accent:"#D4AF37",accentDim:"rgba(212,175,55,0.10)",input:"#EADFC8",inputBorder:"rgba(0,0,0,0.08)",inputText:"#2D2A26"};
const MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];
const TODAY=()=>new Date().toDateString();
const DATEKEY=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const FMTDATE=()=>new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});

// ── LIVE STREAMS DATA ─────────────────────────────────────────────────────────
// Source: haramain.info sidebar — official Saudi Broadcasting Authority streams
const LIVE_STREAMS = [
  {
    id:"makkah",
    name:"Masjid Al-Haram — Makkah",
    arabic:"قناة القرآن الكريم",
    color:"#E5534B",
    icon:"🕋",
    label:"Makkah",
    aloula:"https://www.aloula.sa/live/qurantvsa",
    aloulaEmbed:"https://www.aloula.sa/live/qurantvsa",
    yt:"https://www.youtube.com/@saudiqurantv/live",
    ytEmbed:"https://www.youtube-nocookie.com/embed/live_stream?channel=UCZ3E3TZHovVAbqKAJoTMUlw&autoplay=1",
    desc:"Saudi Quran Channel (aloula.sa) · 24/7 Live",
  },
  {
    id:"madinah",
    name:"Masjid An-Nabawi — Madinah",
    arabic:"قناة السنة النبوية",
    color:"#F0C040",
    icon:"🌙",
    label:"Madinah",
    aloula:"https://www.aloula.sa/live/sunnatvsa",
    aloulaEmbed:"https://www.aloula.sa/live/sunnatvsa",
    yt:"https://www.youtube.com/@saudisunnahtv/live",
    ytEmbed:"https://www.youtube-nocookie.com/embed/live_stream?channel=UCnVN_JQAPCNbwFdDe7bNL4w&autoplay=1",
    desc:"Saudi Sunnah Channel (aloula.sa) · 24/7 Live",
  },
];

// ── RAMADAN 1446 DATA ─────────────────────────────────────────────────────────
// Ramadan 1446 AH ≈ March 1–30, 2025 CE
// Full Taraweeh collections on archive.org — per surah audio from complete 1446 recording
// Makkah: archive.org/details/MakkahTaraweeh1446  | Madinah: archive.org/details/MadeenahTaraweeh1446
// Audio URL format: https://archive.org/download/[collection]/[NNN].mp3

const RAMADAN_NIGHTS_MAKKAH = Array.from({length:30},(_,i)=>{
  const n = i+1;
  const date = new Date(2025,2,n);
  const dateStr = date.toLocaleDateString("en-US",{month:"short",day:"numeric"});
  const isLastTen = n >= 21;
  const isOdd = n % 2 !== 0;
  const isQadr = isLastTen && isOdd;
  const isNight27 = n === 27;
  // mirrors.quranicaudio.com Taraweeh URL pattern for 1446 Makkah
  const dateStr2025 = `2025-03-${String(n).padStart(2,"0")}`;
  return {
    night: n,
    date: dateStr,
    isLastTen,
    isQadr,
    isNight27,
    mirrorBase:`https://mirrors.quranicaudio.com/haramain/2025/03/makkah/`,
    dateStr2025,
    haramainLink:`https://www.haramain.info/${dateStr2025.replace(/-/g,"/").replace("2025/","2025/")}`,
    ytSearch:`https://www.youtube.com/results?search_query=تراويح+مكة+رمضان+1446+ليلة+${n}`,
  };
});

const RAMADAN_NIGHTS_MADINAH = Array.from({length:30},(_,i)=>{
  const n = i+1;
  const date = new Date(2025,2,n);
  const dateStr = date.toLocaleDateString("en-US",{month:"short",day:"numeric"});
  const isLastTen = n >= 21;
  const isOdd = n % 2 !== 0;
  const isQadr = isLastTen && isOdd;
  const isNight27 = n === 27;
  const dateStr2025 = `2025-03-${String(n).padStart(2,"0")}`;
  return {
    night: n,
    date: dateStr,
    isLastTen,
    isQadr,
    isNight27,
    mirrorBase:`https://mirrors.quranicaudio.com/haramain/2025/03/madinah/`,
    dateStr2025,
    ytSearch:`https://www.youtube.com/results?search_query=تراويح+المدينة+رمضان+1446+ليلة+${n}`,
  };
});

// ── HARAMAIN IMAMS DATA (cross-referenced with haramain.info) ────────────────
const MAKKAH_IMAMS = [
  { id:"sudais2",   name:"Abdul Rahman As-Sudais", arabic:"عبدالرحمن السديس",  quranicaudio:"abdurrahmaan_as-sudays",          surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"shuraim2",  name:"Saud Ash-Shuraim",       arabic:"سعود الشريم",       quranicaudio:"sa3ood_al-shuraym",               surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"muaiqly2",  name:"Maher Al-Muaiqly",       arabic:"ماهر المعيقلي",     quranicaudio:"maher_almuaiqly",                 surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"baleela",   name:"Bandar Baleela",          arabic:"بندر بليلة",        quranicaudio:"bandar_baleela/complete",         surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"turki",     name:"Badr Al-Turki",           arabic:"بدر التركي",        quranicaudio:"badr_al_turki/mp3",               surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"dossary2",  name:"Yasser Al-Dosari",        arabic:"ياسر الدوسري",      quranicaudio:"yasser_ad-dussary",               surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"juhany2",   name:"Abdullah Al-Juhany",      arabic:"عبدالله الجهني",    quranicaudio:"abdullaah_3awwaad_al-juhaynee",   surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"kalbani",   name:"Adel Kalbani",            arabic:"عادل الكلباني",     quranicaudio:"adel_kalbani",                    surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"khayat",    name:"Abdullah Khayat",         arabic:"عبدالله خياط",      quranicaudio:"khayat",                          surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"ghamdi",    name:"Khalid Al-Ghamdi",        arabic:"خالد الغامدي",      quranicaudio:"khalid_alghamdi",                 surahCount:null, note:"Partial — not all surahs available" },
  { id:"salehtaleb",name:"Saleh Al-Taleb",          arabic:"صالح آل طالب",      quranicaudio:"saleh_al_taleb",                  surahCount:null, note:"Partial — not all surahs available" },
  { id:"humaid",    name:"Saleh Bin Humaid",        arabic:"صالح بن حميد",      archive:"HaramainHumaid",                       surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"shamsan",   name:"Waleed Al-Shamsan",       arabic:"وليد الشمسان",      archive:null,                                   surahCount:null, note:"Prayer recordings — no full Quran archive" },
];
const MADINAH_IMAMS = [
  { id:"hudhaify2", name:"Ali Al-Hudhaify",         arabic:"علي الحذيفي",       quranicaudio:"huthayfi",                        surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"budair2",   name:"Salah Al-Budair",         arabic:"صلاح البدير",       quranicaudio:"salahbudair",                     surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"thubaity",  name:"Abdul Bari Ath-Thubaity", arabic:"عبدالباري الثبيتي", quranicaudio:"thubaity",                        surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"qasim",     name:"Abdul Muhsin Al-Qasim",   arabic:"عبدالمحسن القاسم",  quranicaudio:"abdul_muhsin_alqasim",            surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"imadhafez", name:"Imad Zuhair Hafez",       arabic:"عماد زهير حافظ",    quranicaudio:"imad_zuhair_hafez",               surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"alakhdar",  name:"Ibrahim Al-Akhdar",       arabic:"إبراهيم الأخضر",    quranicaudio:"ibrahim_al_akhdar",               surahCount:114, note:"Full Quran (114 surahs)" },
   { id:"alijaber",  name:"Ali Jaber",               arabic:"علي جابر",          quranicaudio:"ali_jaber",                       surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"ahmadhudhayfi",name:"Ahmad Al-Hudhaify",    arabic:"أحمد الحذيفي",      quranicaudio:"ahmad_alhuthayfi",                surahCount:null, note:"Partial — not all surahs available" },
  { id:"ayyoub2",   name:"Muhammad Ayyoub",         arabic:"محمد أيوب",         archive:"HaramainAyub",                         surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"buayjaan",  name:"Abdullah Bu'ayjaan",      arabic:"عبدالله البعيجان",  archive:"HaramainBuayjaan",                     surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"muhanna",   name:"Khalid Al-Muhanna",       arabic:"خالد المهنا",       archive:"HaramainMuhanna",                      surahCount:114, note:"Full Quran (114 surahs)" },
  { id:"qarafi2",   name:"Abdullah Al-Qarafi",      arabic:"عبدالله القرافي",   archive:"HaramainQuraafi",                      surahCount:114, note:"Full Quran (114 surahs)" },
];

const HARAMAIN_SURAHS = [
  "Al-Fatiha","Al-Baqarah","Aal Imran","An-Nisa","Al-Ma'idah","Al-An'am","Al-A'raf","Al-Anfal","At-Tawbah","Yunus",
  "Hud","Yusuf","Ar-Ra'd","Ibrahim","Al-Hijr","An-Nahl","Al-Isra","Al-Kahf","Maryam","Ta-Ha",
  "Al-Anbiya","Al-Hajj","Al-Mu'minun","An-Nur","Al-Furqan","Ash-Shu'ara","An-Naml","Al-Qasas","Al-Ankabut","Ar-Rum",
  "Luqman","As-Sajda","Al-Ahzab","Saba","Fatir","Ya-Sin","As-Saffat","Sad","Az-Zumar","Ghafir",
  "Fussilat","Ash-Shura","Az-Zukhruf","Ad-Dukhan","Al-Jathiya","Al-Ahqaf","Muhammad","Al-Fath","Al-Hujurat","Qaf",
  "Adh-Dhariyat","At-Tur","An-Najm","Al-Qamar","Ar-Rahman","Al-Waqi'ah","Al-Hadid","Al-Mujadila","Al-Hashr","Al-Mumtahina",
  "As-Saf","Al-Jumu'ah","Al-Munafiqun","At-Taghabun","At-Talaq","At-Tahrim","Al-Mulk","Al-Qalam","Al-Haqqa","Al-Ma'arij",
  "Nuh","Al-Jinn","Al-Muzzammil","Al-Muddathir","Al-Qiyama","Al-Insan","Al-Mursalat","An-Naba","An-Nazi'at","Abasa",
  "At-Takwir","Al-Infitar","Al-Mutaffifin","Al-Inshiqaq","Al-Buruj","At-Tariq","Al-A'la","Al-Ghashiya","Al-Fajr","Al-Balad",
  "Ash-Shams","Al-Layl","Ad-Duha","Ash-Sharh","At-Tin","Al-Alaq","Al-Qadr","Al-Bayyina","Az-Zalzala","Al-Adiyat",
  "Al-Qari'a","At-Takathur","Al-Asr","Al-Humaza","Al-Fil","Quraysh","Al-Ma'un","Al-Kawthar","Al-Kafirun","An-Nasr",
  "Al-Masad","Al-Ikhlas","Al-Falaq","An-Nas"
];

// ── HLS PLAYER COMPONENT (standalone — clean) ────────────────────────────────
function HlsPlayer({ src, T }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setStatus("loading");

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().then(()=>setStatus("playing")).catch(()=>setStatus("error"));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.7/hls.min.js";
    script.onload = () => {
      if (!window.Hls || !window.Hls.isSupported()) { setStatus("error"); return; }
      const hls = new window.Hls({ lowLatencyMode:true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(()=>setStatus("playing")).catch(()=>setStatus("error"));
      });
      hls.on(window.Hls.Events.ERROR, (_, d) => { if (d.fatal) setStatus("error"); });
    };
    script.onerror = () => setStatus("error");
    document.head.appendChild(script);

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      video.src = "";
    };
  }, [src]);

  return (
    <div style={{flex:1,background:"#000",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",minHeight:220}}>
      <video ref={videoRef} style={{width:"100%",height:"100%",maxHeight:380,objectFit:"contain"}} controls playsInline />
      {status==="loading"&&(
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.75)",gap:10}}>
          <div className="spin" style={{width:28,height:28,border:"3px solid #333",borderTopColor:T.accent,borderRadius:"50%"}}/>
          <div style={{fontSize:11,color:"#aaa"}}>Connecting to stream...</div>
        </div>
      )}
      {status==="error"&&(
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.88)",gap:10,padding:20}}>
          <div style={{fontSize:24}}>📡</div>
          <div style={{fontSize:13,color:"#ccc",textAlign:"center"}}>Stream unavailable in this browser</div>
          <div style={{fontSize:11,color:"#777",textAlign:"center"}}>Use the YouTube button below to watch live</div>
        </div>
      )}
    </div>
  );
}

// ── ASR SESSION VIEW (must be outside parent to avoid remount on every render) ─
function AsrSessionView({
    asrSelectionSummary,asrSafePage,asrPages,asrPageStart,asrPageEnd,
    asrVisibleAyahs,asrBatch,asrExpandedAyah,setAsrExpandedAyah,asrTouchStartRef,
    setAsrPage,asrSlideDir,setAsrSlideDir,translations,fetchTranslations,playAyah,playingKey,
    audioLoading,asrSurahProgress,onComplete,onChangeSelection,asrIsCustomized,dark,
  }) {
    const T2={
      gold:"#D2A85A",goldBright:"#E2BC72",
      ivory:"#F3E7C8",ivoryDim:"rgba(243,231,200,0.74)",ivoryFaint:"rgba(243,231,200,0.46)",
      green:"#59D98A",greenSoft:"rgba(89,217,138,0.16)",
    };
    return (
      <div className="fi" style={{fontFamily:"'DM Sans',sans-serif",position:"fixed",inset:0,display:"flex",flexDirection:"column",zIndex:100,overflowY:"auto",padding:"16px 0 36px",background:dark?"radial-gradient(circle at 50% 10%,rgba(44,72,130,0.12) 0%,rgba(44,72,130,0.04) 18%,rgba(0,0,0,0) 42%),linear-gradient(180deg,#060C18 0%,#040814 100%)":"#F3E9D2"}}>
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          {/* Exit button */}
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:4}}>
            <div className="sbtn" onClick={onChangeSelection} style={{padding:"6px 10px",fontSize:18,color:"rgba(232,200,120,0.40)",lineHeight:1}}>×</div>
          </div>
          <div className="asr-title">ASR SESSION</div>
          <div className="asr-title-line"/>

          {/* Reviewing + selection + customize */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:T2.green,boxShadow:"0 0 10px rgba(89,217,138,0.26)",flexShrink:0}}/>
              <div style={{color:"rgba(243,231,200,0.52)",fontSize:11,letterSpacing:".12em",textTransform:"uppercase",fontWeight:500}}>{asrIsCustomized?"Customized":"Auto"}</div>
            </div>
            <div className="sbtn" onClick={onChangeSelection}
              style={{fontSize:9,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",
              padding:"3px 9px",borderRadius:20,border:"1px solid rgba(217,177,95,0.22)",
              color:"rgba(217,177,95,0.55)"}}>
              Customize
            </div>
          </div>
          <div style={{color:T2.ivory,fontSize:14,fontWeight:600,marginBottom:16,lineHeight:1.25,maxWidth:"90%"}}>{asrSelectionSummary||"Asr Review"}</div>

          {/* Ayah panel — frame is static, only content slides */}
          <div
            className="asr-ayah-panel"
            style={{padding:"6px 0",marginBottom:0,borderRadius:0,borderTop:"1px solid rgba(217,177,95,0.32)",borderBottom:"1px solid rgba(217,177,95,0.32)",position:"relative",overflow:"hidden"}}
            onTouchStart={e=>{asrTouchStartRef.current=e.touches[0].clientX;}}
            onTouchEnd={e=>{
              if(asrTouchStartRef.current==null) return;
              const delta=e.changedTouches[0].clientX-asrTouchStartRef.current;
              asrTouchStartRef.current=null;
              if(Math.abs(delta)<40) return;
              if(delta>0&&asrSafePage<asrPages-1){ setAsrSlideDir("left"); setAsrPage(p=>Math.min(asrPages-1,p+1)); }
              else if(delta<0&&asrSafePage>0){ setAsrSlideDir("right"); setAsrPage(p=>Math.max(0,p-1)); }
            }}
          >
            <div className="asr-arw left" onClick={()=>{if(asrSafePage===0)return;setAsrSlideDir("right");setAsrPage(p=>Math.max(0,p-1));}} style={{opacity:asrSafePage===0?0.25:1,pointerEvents:asrSafePage===0?"none":"auto"}}>‹</div>
            <div className="asr-arw right" onClick={()=>{if(asrSafePage>=asrPages-1)return;setAsrSlideDir("left");setAsrPage(p=>Math.min(asrPages-1,p+1));}} style={{opacity:asrSafePage>=asrPages-1?0.25:1,pointerEvents:asrSafePage>=asrPages-1?"none":"auto"}}>›</div>

            {/* Ayah list — slides on page change */}
            <div key={asrSafePage} className={asrSlideDir==="left"?"asr-slide-left":asrSlideDir==="right"?"asr-slide-right":""} style={{display:"flex",flexDirection:"column",gap:8,padding:"4px 0"}}>
              {asrVisibleAyahs.map((v,idx)=>{
                const vKey=v.verse_key;
                const sNum=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);
                return (
                  <div key={vKey} className="sbtn" onClick={()=>{setAsrExpandedAyah(vKey);if(!translations[vKey])fetchTranslations([v]);}}
                    style={{borderRadius:14,padding:"12px 14px",background:"rgba(14,22,40,0.80)",border:"1px solid rgba(217,177,95,0.08)",boxShadow:"0 2px 8px rgba(0,0,0,0.20)",transition:"all .15s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(217,177,95,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:"rgba(217,177,95,0.60)",flexShrink:0}}>
                        {asrPageStart+idx+1}
                      </div>
                      <span style={{flex:1,fontSize:12,color:"rgba(243,231,200,0.50)"}}>{SURAH_EN[sNum]||`Surah ${sNum}`} · {vKey}</span>
                      <span style={{fontSize:12,color:"rgba(243,231,200,0.20)"}}>›</span>
                    </div>
                    <div style={{fontFamily:"'Amiri',serif",fontSize:20,color:"rgba(243,231,200,0.88)",direction:"rtl",textAlign:"right",lineHeight:1.7,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {v.text_uthmani}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          <div className="asr-progress-rule" style={{margin:"18px 20px 16px"}}/>

          {/* Progress */}
          <div style={{marginBottom:6,padding:"0 20px"}}>
            <div style={{color:T2.goldBright,fontSize:12,fontWeight:800,marginBottom:8}}>Progress</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
              <div style={{padding:"6px 12px",borderRadius:999,background:T2.greenSoft,border:"1px solid rgba(89,217,138,0.16)",color:"#B8F5D0",fontSize:12,fontWeight:700}}>
                {asrSurahProgress.filter(s=>s.state==="complete").length} Memorized
              </div>
              {asrSurahProgress.find(s=>s.state==="current")&&(
                <div style={{padding:"6px 12px",borderRadius:999,background:"transparent",border:"1px solid rgba(210,168,90,0.18)",color:"rgba(226,188,114,0.65)",fontSize:11,fontWeight:400}}>
                  {asrSurahProgress.find(s=>s.state==="current")?.label}
                </div>
              )}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{color:T2.ivoryFaint,fontSize:12}}>Pages</div>
              <div style={{color:T2.goldBright,fontSize:12,fontWeight:600}}>Page {asrSafePage+1} of {asrPages}</div>
            </div>
            <div style={{height:6,background:"rgba(255,255,255,0.08)",borderRadius:999,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.round(((asrSafePage+1)/asrPages)*100)}%`,background:"linear-gradient(90deg,#D2A85A,#E2BC72)",borderRadius:999}}/>
            </div>
          </div>

          {/* Buttons */}
          <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:22,padding:"0 20px"}}>
            <div className="sbtn" onClick={onComplete} style={{width:"100%",padding:"15px 16px",borderRadius:18,textAlign:"center",fontSize:14,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",background:"linear-gradient(180deg,#E0BD78 0%,#CEAA60 100%)",color:"#0A1020",boxShadow:"0 8px 18px rgba(210,168,90,0.10),inset 0 1px 0 rgba(255,255,255,0.10)"}}>
              Complete Asr Session
            </div>
            <div className="sbtn" onClick={onChangeSelection} style={{width:"100%",padding:"13px 16px",borderRadius:18,textAlign:"center",fontSize:13,fontWeight:600,color:"rgba(226,188,114,0.82)",border:"1px solid rgba(210,170,95,0.14)",background:"rgba(8,16,30,0.22)"}}>
              Change Selection
            </div>
          </div>
        </div>{/* end flex column wrapper */}

        {/* Ayah popup modal — outside scroll container */}
        {asrExpandedAyah&&(()=>{
          const ev=asrBatch.find(v=>v.verse_key===asrExpandedAyah);
          if(!ev) return null;
          const evKey=ev.verse_key;
          const evSurah=ev.surah_number||parseInt(evKey.split(":")[0],10);
          const evAyah=evKey.split(":")[1];
          const evTrans=translations[evKey];
          const evPlaying=playingKey===evKey;
          const evLoading=audioLoading===evKey;
          return (
            <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",background:"rgba(0,0,0,0.70)",backdropFilter:"blur(6px)"}} onClick={()=>setAsrExpandedAyah(null)}>
              <div className="fi" style={{position:"relative",width:"100%",maxWidth:400,borderRadius:24,padding:"28px 24px 24px",background:dark?"radial-gradient(circle at 50% 0%,rgba(58,92,165,0.12) 0%,rgba(0,0,0,0) 40%),linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",border:"1px solid rgba(217,177,95,0.15)",boxShadow:"0 24px 60px rgba(0,0,0,0.50),0 0 30px rgba(217,177,95,0.06)"}} onClick={e=>e.stopPropagation()}>
                <div className="sbtn" onClick={()=>setAsrExpandedAyah(null)} style={{position:"absolute",top:14,right:18,fontSize:18,color:"rgba(243,231,200,0.30)"}}>×</div>
                <div style={{direction:"rtl",textAlign:"center",fontFamily:"'Amiri Quran','Amiri',serif",fontSize:26,lineHeight:2,color:"#F3E7C8",marginBottom:16}}>
                  {ev.text_uthmani}
                </div>
                <div style={{textAlign:"center",fontSize:12,color:"rgba(243,231,200,0.45)",marginBottom:20}}>
                  Ayah {evAyah} of Surah {SURAH_EN[evSurah]||evSurah}
                </div>
                <div style={{color:"rgba(243,231,200,0.78)",fontSize:14,lineHeight:1.8,textAlign:"center",marginBottom:18}}>
                  {evTrans===undefined?<span style={{color:"rgba(243,231,200,0.42)"}}>Loading...</span>:evTrans||<span style={{color:"rgba(243,231,200,0.42)"}}>Translation unavailable</span>}
                </div>
                <div style={{display:"flex",justifyContent:"center"}}>
                  <div className="sbtn" onClick={()=>playAyah(evKey,evKey)} style={{width:42,height:42,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:evPlaying?"rgba(217,177,95,0.14)":"rgba(255,255,255,0.04)",border:`1px solid ${evPlaying?"rgba(217,177,95,0.30)":"rgba(255,255,255,0.08)"}`,color:evPlaying?T2.goldBright:"rgba(243,231,200,0.56)",fontSize:16}}>
                    {evLoading?"…":evPlaying?"⏸":"▶"}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

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

export default function RihlatAlHifz() {
  const [dark,setDark]=useState(true);
  const [showDua,setShowDua]=useState(true);
  const [showOnboarding, setShowOnboarding]=useState(()=>!localStorage.getItem("rihlat-onboarded"));
  const [onboardStep,setOnboardStep]=useState(1);
  const [visibleOnboardJuzCount,setVisibleOnboardJuzCount]=useState(5);
  const [userName,setUserName]=useState("");
  const [openJuzPanel,setOpenJuzPanel]=useState(null);
  const [repCounts,setRepCounts]=useState({});
  const [looping, setLooping]=useState(false);
  const [openAyah,setOpenAyah]=useState(null);
  const [activeSessionIndex,setActiveSessionIndex]=useState(0);
  const SESSION_CTA=["Complete Fajr Memorization","Complete Dhuhr Revision","Complete Asr Revision","Complete Maghrib Listening","Complete Isha Review"];
  const [sessionsCompleted,setSessionsCompleted]=useState({fajr:false,dhuhr:false,asr:false,maghrib:false,isha:false});
  const [duaIdx,setDuaIdx]=useState(()=>Math.floor(Math.random()*6));
  const [activeTab,setActiveTab]=useState("myhifz");
  const [selectedJuz,setSelectedJuz]=useState(30);
  const [allVerses,setAllVerses]=useState([]);
  const [loading,setLoading]=useState(false);
  const [loadMsg,setLoadMsg]=useState("");
  const [fetchError,setFetchError]=useState(false);
  const [juzStatus,setJuzStatus]=useState({});
  // V9 — ayah-based source of truth
  const [completedAyahs,setCompletedAyahs]=useState(()=>loadCompletedAyahs());
  const [notes,setNotes]=useState({});
  const [loaded,setLoaded]=useState(false);
  const [fontSize,setFontSize]=useState(20);
  const [quranShowCount,setQuranShowCount]=useState(5);
  const [quranPage,setQuranPage]=useState(0);
  const [quranPageDir,setQuranPageDir]=useState(null);
  const quranTouchRef=useRef(0);
  const mushafImgRef=useRef(null);
  const quranContentRef=useRef(null);
  const quranPageRef=useRef(null);
  const [quranContainerH,setQuranContainerH]=useState(0);
  const [mushafPage,setMushafPage]=useState(1);
  const [mushafSwipeAnim,setMushafSwipeAnim]=useState("idle"); // "idle"|"exit-left"|"exit-right"
  const [croppedPages,setCroppedPages]=useState({});
  const [quranMode,setQuranMode]=useState("interactive"); // "mushaf" | "interactive"
  const [selectedAyah,setSelectedAyah]=useState(null);
  const [drawerView,setDrawerView]=useState("default"); // "default"|"tafsir"|"reflect"
  const [showTranslation,setShowTranslation]=useState(true);
  const [showReflect,setShowReflect]=useState(false); // legacy, replaced by drawerView
  const [reflections,setReflections]=useState(()=>{try{return JSON.parse(localStorage.getItem("rihlat-reflections")||"{}");}catch{return {};}});
  const [tafsirOn,setTafsirOn]=useState(false);
  const [tafsirAyah,setTafsirAyah]=useState(null);
  const [tafsirData,setTafsirData]=useState({});
  const [tafsirTab,setTafsirTab]=useState("sadi");
  const [mushafVerses,setMushafVerses]=useState([]);
  const [mushafLoading,setMushafLoading]=useState(false);
  const [mushafSurahInfo,setMushafSurahInfo]=useState("");
  const [showSurahPicker,setShowSurahPicker]=useState(false);
  const [showQuranJuzModal,setShowQuranJuzModal]=useState(false);
  const [showQuranSurahModal,setShowQuranSurahModal]=useState(false);
  const [selectedSurahNum,setSelectedSurahNum]=useState(1);
  const [mushafLayout,setMushafLayout]=useState(null); // loaded from /quran-layout.json
  const [mushafWords,setMushafWords]=useState([]);
  const [mushafPageLines,setMushafPageLines]=useState([]);
  const [mushafAudioPlaying,setMushafAudioPlaying]=useState(false);
  const [showMushafSheet,setShowMushafSheet]=useState(false);
  const [mushafBookmarks,setMushafBookmarks]=useState(()=>{try{return JSON.parse(localStorage.getItem("rihlat-mushaf-bookmarks")||"[]");}catch{return [];}});
  
  const [showMushafRangePicker,setShowMushafRangePicker]=useState(false);
  const [mushafRangeStart,setMushafRangeStart]=useState(null);
  const [mushafRangeEnd,setMushafRangeEnd]=useState(null);
  const [mushafJuzNum,setMushafJuzNum]=useState(1);
  const [mushafSurahNum,setMushafSurahNum]=useState(1);
  const [quranPageBreaks,setQuranPageBreaks]=useState([0]);
  const [openSurah,setOpenSurah]=useState(null);
  const [goalYears,setGoalYears]=useState(3);
  const [goalMonths,setGoalMonths]=useState(1);
  const [openMethod,setOpenMethod]=useState(null);
  const [sessionJuz,setSessionJuz]=useState(null);
  const [sessionIdx,setSessionIdx]=useState(0);
  const [juzProgress,setJuzProgress]=useState({});
  const [sessionDone,setSessionDone]=useState([]);
  const [sessionVerses,setSessionVerses]=useState([]);
  const [yesterdayBatch,setYesterdayBatch]=useState([]);
  const [asrSelectedSurahs,setAsrSelectedSurahs]=useState([]);
  const [asrSelectedJuz,setAsrSelectedJuz]=useState([]);
  const [asrReviewBatch,setAsrReviewBatch]=useState([]);
  const [sessLoading,setSessLoading]=useState(false);
  const [sessError,setSessError]=useState(false);
  const AYAHS_PER_PAGE = 5;
  const [ayahPage, setAyahPage] = useState(0);
  const [asrStarted,setAsrStarted]=useState(false);
  const [asrIsCustomized,setAsrIsCustomized]=useState(false); // session-scoped, never persisted
  const [asrActiveJuzPanel,setAsrActiveJuzPanel]=useState(null);
  const [asrSurahShowCount,setAsrSurahShowCount]=useState(10);
  const [memSections,setMemSections]=useState({completed:false,inprogress:true,upcoming:false,upcomingAll:false});
  const [asrPage,setAsrPage]=useState(0);
  const [asrSlideDir,setAsrSlideDir]=useState(null);
  const [asrExpandedAyah,setAsrExpandedAyah]=useState(null);
  const [juzCompletedInSession,setJuzCompletedInSession]=useState(new Set());
  const asrTouchStartRef=useRef(null);
  const [dailyChecks,setDailyChecks]=useState({date:TODAY()});

  const JUZ_PAGES=[1,22,42,62,82,102,121,142,162,182,201,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582,605];
  const SURAH_PAGES={1:1,2:2,3:50,4:77,5:106,6:128,7:151,8:177,9:187,10:208,11:221,12:235,13:249,14:255,15:262,16:267,17:282,18:293,19:305,20:312,21:322,22:332,23:342,24:350,25:359,26:367,27:377,28:385,29:396,30:404,31:411,32:415,33:418,34:428,35:434,36:440,37:446,38:453,39:458,40:467,41:477,42:483,43:489,44:496,45:499,46:502,47:507,48:511,49:515,50:518,51:520,52:523,53:526,54:528,55:531,56:534,57:537,58:542,59:545,60:549,61:551,62:553,63:554,64:556,65:558,66:560,67:562,68:564,69:566,70:568,71:570,72:572,73:574,74:575,75:577,76:578,77:580,78:582,79:583,80:585,81:586,82:587,83:587,84:589,85:590,86:591,87:591,88:592,89:593,90:594,91:595,92:595,93:596,94:596,95:597,96:597,97:598,98:598,99:599,100:599,101:600,102:600,103:601,104:601,105:601,106:602,107:602,108:602,109:603,110:603,111:603,112:604,113:604,114:604};
  const TAFSIR_SOURCES=[{id:"sadi",apiId:91,name:"As-Sa'di",lang:"ar"},{id:"muyassar",apiId:16,name:"Al-Muyassar",lang:"ar"},{id:"kathir",apiId:169,name:"Ibn Kathir",lang:"en"}];

  // Load mushaf layout once
  useEffect(()=>{
    fetch("/quran-layout.json").then(r=>r.json()).then(d=>setMushafLayout(d)).catch(()=>{});
  },[]);

  useEffect(() => {
    if (activeTab !== "quran") return;
    let cancelled = false;
    (async () => {
      setMushafLoading(true);
      try {
        // Use same source as My Hifz — qurancdn returns clean text_uthmani, no stray tokens
        const [textRes, transRes] = await Promise.all([
          fetch(`https://api.qurancdn.com/api/qdc/verses/by_page/${mushafPage}?words=false&fields=text_uthmani,verse_key,juz_number&per_page=50`),
          fetch(`https://api.quran.com/api/v4/verses/by_page/${mushafPage}?per_page=50&translations=203&fields=verse_key`)
        ]);
        if (!textRes.ok) throw new Error();
        const textData = await textRes.json();
        if (cancelled) return;
        const vs = textData.verses || [];
        // Merge translations if available
        if (transRes.ok) {
          const transData = await transRes.json();
          const transMap = {};
          (transData.verses||[]).forEach(v => { transMap[v.verse_key] = v.translations?.[0]?.text || ""; });
          vs.forEach(v => { v._translation = (transMap[v.verse_key]||"").replace(/<[^>]*>/g,"").trim(); });
        }
        // Fix U+06DF (small high rounded zero) → remove it for UthmanicHafs compatibility
        vs.forEach(v => { if(v.text_uthmani) v.text_uthmani = v.text_uthmani.replace(/\u06DF/g, "\u0652"); });
        setMushafVerses(vs);
        setMushafPageLines([]);
        if (vs.length > 0) {
          setMushafJuzNum(vs[0].juz_number || 1);
          const surahNums = [...new Set(vs.map(v => parseInt(v.verse_key.split(":")[0], 10)))];
          setMushafSurahNum(surahNums[0]||1);
          setMushafSurahInfo(surahNums.map(n => SURAH_EN[n] || "").filter(Boolean).join(" · "));
          if(surahNums.length>0) setSelectedSurahNum(surahNums[0]);
        } else {
          setMushafJuzNum(1); setMushafSurahInfo("");
        }
      } catch(err) {
        setMushafVerses([]); setMushafPageLines([]);
      } finally {
        if (!cancelled) setMushafLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, mushafPage]);

  // Auto-crop white margins from mushaf page image
  function cropMushafImage(imgUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imgUrl;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        let imageData;
        try { imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); }
        catch(e) { resolve(imgUrl); return; }
        const data = imageData.data;
        let top = 0, bottom = canvas.height - 1, left = 0, right = canvas.width - 1;
        const isWhite = (r,g,b) => r > 240 && g > 240 && b > 240;
        outer: for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if (!isWhite(data[i],data[i+1],data[i+2])) { top = y; break outer; }
          }
        }
        outer: for (let y = canvas.height - 1; y >= 0; y--) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if (!isWhite(data[i],data[i+1],data[i+2])) { bottom = y; break outer; }
          }
        }
        outer: for (let x = 0; x < canvas.width; x++) {
          for (let y = 0; y < canvas.height; y++) {
            const i = (y * canvas.width + x) * 4;
            if (!isWhite(data[i],data[i+1],data[i+2])) { left = x; break outer; }
          }
        }
        outer: for (let x = canvas.width - 1; x >= 0; x--) {
          for (let y = 0; y < canvas.height; y++) {
            const i = (y * canvas.width + x) * 4;
            if (!isWhite(data[i],data[i+1],data[i+2])) { right = x; break outer; }
          }
        }
        const w = right - left;
        const h = bottom - top;
        const out = document.createElement("canvas");
        out.width = w; out.height = h;
        out.getContext("2d").drawImage(canvas, left, top, w, h, 0, 0, w, h);
        resolve(out.toDataURL());
      };
      img.onerror = () => resolve(imgUrl);
    });
  }

  // Crop on page change (cache result so we don't re-crop)
  useEffect(() => {
    if (activeTab !== "quran" || quranMode !== "mushaf") return;
    if (croppedPages[mushafPage]) return;
    const url = mushafImageUrl(mushafPage);
    cropMushafImage(url).then(cropped => {
      setCroppedPages(prev => ({...prev, [mushafPage]: cropped}));
    });
  }, [mushafPage, activeTab, quranMode]);

  // Measure custom Quran page container for font size calculation
  useEffect(()=>{
    if(!quranPageRef.current) return;
    const obs=new ResizeObserver(([entry])=>{
      const h=entry.contentRect.height;
      if(h>0) setQuranContainerH(h);
    });
    obs.observe(quranPageRef.current);
    return()=>obs.disconnect();
  },[quranMode,activeTab]);

  // Parse tafsir text into styled blocks (Arabic vs English/commentary)
  function parseTafsirBlocks(text) {
    if(!text) return [];
    // Arabic Unicode range detection
    const isArabic = (str) => /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str);
    const isMainlyArabic = (str) => {
      const arabicChars = (str.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g)||[]).length;
      return arabicChars > str.replace(/\s/g,"").length * 0.4;
    };
    // Split by double newlines or periods followed by Arabic
    const raw = text.split(/\n\n+|\r\n\r\n+/).filter(Boolean);
    if(raw.length <= 1) {
      // Single block — try splitting by sentences
      const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z\u0600])/);
      if(sentences.length > 1) {
        return sentences.map(s => ({type: isMainlyArabic(s.trim()) ? "arabic" : "english", text: s.trim()})).filter(b => b.text);
      }
      // Try splitting by detecting Arabic chunks inline
      const parts = [];
      let remaining = text;
      const arabicPattern = /([\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s\u060C\u061B\u061F.,،؛؟]+)/g;
      let lastIdx = 0;
      let match;
      while((match = arabicPattern.exec(remaining)) !== null) {
        if(match[0].replace(/\s/g,"").length < 5) continue;
        if(match.index > lastIdx) {
          const eng = remaining.slice(lastIdx, match.index).trim();
          if(eng) parts.push({type:"english", text:eng});
        }
        parts.push({type:"arabic", text:match[0].trim()});
        lastIdx = match.index + match[0].length;
      }
      if(lastIdx < remaining.length) {
        const tail = remaining.slice(lastIdx).trim();
        if(tail) parts.push({type:"english", text:tail});
      }
      return parts.length > 0 ? parts : [{type: isMainlyArabic(text) ? "arabic" : "english", text}];
    }
    return raw.map(p => ({type: isMainlyArabic(p.trim()) ? "arabic" : "english", text: p.trim()})).filter(b => b.text);
  }

  async function fetchTafsir(verseKey){
    setTafsirAyah(verseKey);
    const sources=TAFSIR_SOURCES;
    const updates={};
    for(const src of sources){
      const cacheKey=`${src.id}-${verseKey}`;
      if(tafsirData[cacheKey]) continue;
      try {
        const res=await fetch(`https://api.quran.com/api/v4/tafsirs/${src.apiId}/by_ayah/${verseKey}`);
        if(!res.ok) continue;
        const data=await res.json();
        const text=(data.tafsir?.text||"").replace(/<[^>]+>/g,"").trim();
        updates[cacheKey]=text;
      } catch {}
    }
    if(Object.keys(updates).length) setTafsirData(prev=>({...prev,...updates}));
  }

  useEffect(()=>{
    if(!loaded) return;
    const isJuzDone=(juzNum)=>{
      if(juzStatus[juzNum]==="complete") return true;
      const surahs=JUZ_SURAHS[juzNum]||[];
      return surahs.length>0&&surahs.every(s=>juzStatus[`s${s.s}`]==="complete");
    };
    let next=null;
    for(let j=30;j>=1;j--){
      if(!isJuzDone(j)){ next=j; break; }
    }
    const target=next||30;
    console.log('[INIT]', {target, sessionJuz, willUpdate: target!==sessionJuz, juz30done: isJuzDone(30), juz29done: isJuzDone(29), juz28done: isJuzDone(28), s67: juzStatus['s67'], s68: juzStatus['s68'], juz29status: juzStatus[29], juz30status: juzStatus[30]});
    if(target!==sessionJuz) setSessionJuz(target);
  },[loaded,juzStatus]);


  const [streak,setStreak]=useState(0);
  const [checkHistory,setCheckHistory]=useState({});
  const [calMonth,setCalMonth]=useState(new Date().getMonth());
  const [calYear,setCalYear]=useState(new Date().getFullYear());
  const [reciter,setReciter]=useState("dosari");
  const [quranReciter,setQuranReciter]=useState("dosari");
  const [showReciterModal,setShowReciterModal]=useState(false);
  const [reciterMode,setReciterMode]=useState("hifz");
  const [showJuzModal,setShowJuzModal]=useState(false);
  const [activeStream,setActiveStream]=useState(0);
  const [masjidaynTab, setMasjidaynTab]=useState("live");
  const [rihlahTab, setRihlahTab_]=useState("juz");
  const rihlahScrollRef=useRef(null);
  const setRihlahTab=(tab)=>{setRihlahTab_(tab);setTimeout(()=>{if(rihlahScrollRef.current)rihlahScrollRef.current.scrollTop=0;},0);};
  const [haramainMosque,setHaramainMosque]=useState("makkah");
  const [openImam,setOpenImam]=useState(null);
  const [haramainPlaying,setHaramainPlaying]=useState(null);
  const haramainRef=useRef(null);
  const [showTrans,setShowTrans]=useState(true);
  const [translations,setTranslations]=useState({});
  const [playingKey,setPlayingKey]=useState(null);
  const [audioLoading,setAudioLoading]=useState(null);
  const audioRef=useRef(null);
  const touchStartRef=useRef(0);
  const [ramadanMosque,setRamadanMosque]=useState("makkah");
  const [liveSource,setLiveSource]=useState("aloula");
  const [selectedRamadanNight,setSelectedRamadanNight]=useState(null);
  const [ramadanVideoType,setRamadanVideoType]=useState("taraweeh"); // "taraweeh" | "tahajjud"
  const T=dark?DARK:LIGHT;

  useEffect(()=>{
    const l=document.createElement("link"); l.rel="stylesheet";
    l.href="https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&family=Playfair+Display:wght@600;700&family=IBM+Plex+Mono:wght@400;600&family=DM+Sans:wght@400;500;600&display=swap";
    // Load UthmanicHafs for Interactive Quran mode — served locally to avoid CORS
    const ufs=document.createElement("style");
    ufs.textContent="@font-face{font-family:'UthmanicHafs';src:url('/UthmanicHafs1Ver18.woff2') format('woff2');font-display:swap;}";
    document.head.appendChild(ufs);
    document.head.appendChild(l);
  },[]);

  useEffect(()=>{
    try {
      const d=localStorage.getItem("jalil-quran-v8");
      if(d){
        const p=JSON.parse(d);
        setJuzStatus(p.juzStatus||{});
        setNotes(p.notes||{});
        setGoalYears(p.goalYears||3);
        if(p.goalMonths!==undefined) setGoalMonths(p.goalMonths);
        setSessionJuz(p.sessionJuz ?? null);
        setSessionIdx(p.sessionIdx||0);
        setJuzProgress(p.juzProgress||{});
        setSessionDone(p.sessionDone||[]);
        setYesterdayBatch(p.yesterdayBatch||[]);
        setAsrSelectedSurahs(p.asrSelectedSurahs||[]);
        setAsrSelectedJuz(p.asrSelectedJuz||[]);
        setAsrReviewBatch(p.asrReviewBatch||[]);
        if(p.dark!==undefined) setDark(p.dark);
        if(p.streak!==undefined) setStreak(p.streak);
        if(p.checkHistory) setCheckHistory(p.checkHistory);
        if(p.reciter) setReciter(p.reciter);
        if(p.showTrans!==undefined) setShowTrans(p.showTrans);
        if(p.activeSessionIndex!==undefined) setActiveSessionIndex(p.activeSessionIndex);
        if(p.sessionsCompleted) setSessionsCompleted(p.sessionsCompleted);
        const today=TODAY();
        if(p.dailyChecks?.date===today) setDailyChecks(p.dailyChecks);
        else {
          const prev=p.dailyChecks||{};
          const wasComplete=SESSIONS.every(s=>prev[s.id]);
          setStreak(wasComplete?(p.streak||0)+1:0);
          setDailyChecks({date:today});
        }
      }
    } catch {}
    // One-time backfill: sync juzStatus into completedAyahs
    try {
      const p=JSON.parse(localStorage.getItem("jalil-quran-v8")||"{}");
      const jp=p.juzProgress||{};
      const js=p.juzStatus||{};
      const ca=loadCompletedAyahs();
      const prevSize=ca.size;
      // Add all ayahs for completed juz (numeric keys like 30: "complete")
      Object.entries(js).forEach(([k,v])=>{
        const n=Number(k);
        if(v==="complete"&&!isNaN(n)&&n>=1&&n<=30){
          getJuzKeys(n).forEach(key=>ca.add(key));
        }
      });
      // Add all ayahs for completed surahs (keys like s77: "complete")
      Object.entries(js).forEach(([k,v])=>{
        if(v==="complete"&&k.startsWith("s")){
          const sn=Number(k.slice(1));
          if(sn>=1&&sn<=114){
            const total=SURAH_AYAH_COUNTS[sn]||0;
            for(let i=1;i<=total;i++) ca.add(`${sn}:${i}`);
          }
        }
      });
      const added=ca.size-prevSize;
      console.log('[V9 BACKFILL]',{juzStatus:js,prevSize,newSize:ca.size,added});
      if(added>0){saveCompletedAyahs(ca);setCompletedAyahs(ca);}
    } catch(e){console.error('[V9 BACKFILL ERROR]',e);}
    setLoaded(true);
  },[]);

  useEffect(()=>{
    if(!loaded) return;
    try { localStorage.setItem("jalil-quran-v8",JSON.stringify({juzStatus,notes,goalYears,goalMonths,sessionJuz,sessionIdx,juzProgress,sessionDone,yesterdayBatch,asrSelectedSurahs,asrSelectedJuz,asrReviewBatch,dark,dailyChecks,streak,checkHistory,reciter,showTrans,activeSessionIndex,sessionsCompleted})); } catch {}
  },[juzStatus,notes,goalYears,goalMonths,sessionJuz,sessionIdx,juzProgress,sessionDone,yesterdayBatch,asrSelectedSurahs,asrSelectedJuz,asrReviewBatch,dark,dailyChecks,streak,checkHistory,reciter,showTrans,loaded,activeSessionIndex,sessionsCompleted]);

  // Reset sessionDone when Juz changes so stale batch keys don't show completion screen
  useEffect(()=>{
    if(!sessionJuz) return;
    setSessionDone([]);
  },[sessionJuz]);

  // Fetch session verses (wait for loaded so backfill completes first)
  useEffect(()=>{
    if(!sessionJuz||!loaded) return;
    console.log('[FETCH START]', {sessionJuz, 'juzProgress[sessionJuz]': juzProgress[sessionJuz]});
    let cancelled=false;
    (async()=>{
      setSessLoading(true); setSessionVerses([]); setSessError(false);
      try {
        let page=1,all=[],tp=1;
        do {
          const res=await fetch(`https://api.qurancdn.com/api/qdc/verses/by_juz/${sessionJuz}?words=false&fields=text_uthmani,verse_key,surah_number&per_page=50&page=${page}`);
          if(!res.ok) throw new Error();
          const data=await res.json();
          if(cancelled) return;
          all=[...all,...(data.verses||[])]; tp=data.pagination?.total_pages||1; page++;
        } while(page<=tp);

        // 1) Get this juz's surahs in descending memorization order
        const descendingSurahOrder=[...(JUZ_SURAHS[sessionJuz]||[])].map(item=>item.s).reverse();

        // If whole Juz is already complete (verify all surahs too), show full progress
        const juzSurahList=JUZ_SURAHS[sessionJuz]||[];
        const allSurahsActuallyDone=juzSurahList.length>0&&juzSurahList.every(s=>juzStatus[`s${s.s}`]==="complete");
        if(juzStatus[sessionJuz]==="complete"&&allSurahsActuallyDone){
          if(!cancelled){ setSessionVerses(all); setSessionIdx(all.length); }
          if(!cancelled) setSessLoading(false);
          return;
        }

        // 2) Remove surahs already marked complete
        const unfinishedVerses=all.filter(v=>{
          const surahNum=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);
          return juzStatus[`s${surahNum}`]!=="complete";
        });

        // 3) Sort by descending surah order, then ayah ASC inside each surah
        const orderedVerses=unfinishedVerses.sort((a,b)=>{
          const surahA=a.surah_number||parseInt(a.verse_key?.split(":")?.[0],10);
          const surahB=b.surah_number||parseInt(b.verse_key?.split(":")?.[0],10);
          const ayahA=parseInt(a.verse_key?.split(":")?.[1],10);
          const ayahB=parseInt(b.verse_key?.split(":")?.[1],10);
          const idxA=descendingSurahOrder.indexOf(surahA);
          const idxB=descendingSurahOrder.indexOf(surahB);
          if(idxA!==idxB) return idxA-idxB;
          return ayahA-ayahB;
        });

        if(!cancelled){
          const surahsInOrder=[...new Set(orderedVerses.map(v=>v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10)))];
          // Calculate progress from completedAyahs — read fresh from localStorage to avoid stale closure
          const freshCompleted = loadCompletedAyahs();
          let newIdx=0;
          for(let i=0;i<orderedVerses.length;i++){
            if(freshCompleted.has(orderedVerses[i].verse_key)) newIdx=i+1;
            else break;
          }
          // Fallback: if V9 is empty but juzProgress has data, use that and backfill
          const savedProgress=juzProgress[sessionJuz]||0;
          if(newIdx===0 && savedProgress>0 && savedProgress<=orderedVerses.length){
            newIdx=savedProgress;
            // Backfill these ayahs into V9 now
            const toBackfill=orderedVerses.slice(0,newIdx);
            toBackfill.forEach(v=>{if(v.verse_key) freshCompleted.add(v.verse_key);});
            saveCompletedAyahs(freshCompleted);
            setCompletedAyahs(freshCompleted);
            console.log('[PROGRESS BACKFILL]',{savedProgress,backfilled:toBackfill.length});
          }
          console.log('[FETCH DONE]', {sessionJuz, totalVerses: all.length, unfinished: unfinishedVerses.length, ordered: orderedVerses.length, surahsInOrder, newSessionIdx: newIdx, completedAyahsSize: freshCompleted.size, first5: orderedVerses.slice(0,5).map(v=>v.verse_key), verseAtIdx: orderedVerses[newIdx]?.verse_key});
          setSessionVerses(orderedVerses); setSessionIdx(newIdx);
          // Backfill: add already-progressed ayahs to completedAyahs
          if(newIdx>0){
            const toAdd=orderedVerses.slice(0,newIdx);
            console.log('[BACKFILL]', {newIdx, toAdd: toAdd.length, keys: toAdd.slice(0,3).map(v=>v.verse_key)});
            setCompletedAyahs(prev=>{
              const next=new Set(prev);
              let added=0;
              toAdd.forEach(v=>{if(v.verse_key&&!next.has(v.verse_key)){next.add(v.verse_key);added++;}});
              console.log('[BACKFILL RESULT]', {added, totalNow: next.size});
              if(added>0) saveCompletedAyahs(next);
              return added>0?next:prev;
            });
          }
        }

      } catch { if(!cancelled) setSessError(true); }
      if(!cancelled) setSessLoading(false);
    })();
    return()=>{cancelled=true;};
  },[sessionJuz,loaded,juzStatus]);

  // Auto-mark Juz complete when sessionVerses goes to 0 after having verses
  // This catches the case where all surahs are marked done via individual surah completion
  useEffect(()=>{
    if(sessLoading) return;
    if(sessError) return;
    if(sessionVerses.length>0) return;
    if(!sessionJuz) return;
    if(juzStatus[sessionJuz]==="complete") return;
    // Only fire if juzProgress shows actual work was done in this Juz
    if((juzProgress[sessionJuz]||0)===0) return;
    const juzSurahs=JUZ_SURAHS[sessionJuz]||[];
    const allSurahsDone=juzSurahs.length>0&&juzSurahs.every(s=>juzStatus[`s${s.s}`]==="complete");
    if(allSurahsDone){
      setJuzStatus(p=>({...p,[sessionJuz]:"complete"}));
    }
  },[sessLoading,sessionVerses.length,sessionJuz,juzStatus]);

  // Auto-fix: if juz marked complete but not all surahs are done, unmark juz but seed juzProgress from completed surahs
  useEffect(()=>{
    if(!loaded) return;
    const juzToUnmark=[];
    const progressUpdates={};
    JUZ_META.forEach(j=>{
      const surahs=JUZ_SURAHS[j.num]||[];
      if(juzStatus[j.num]==="complete"){
        const allDone=surahs.length>0&&surahs.every(s=>juzStatus[`s${s.s}`]==="complete");
        if(!allDone&&!juzCompletedInSession.has(j.num)) juzToUnmark.push(j.num);
      }
      // Note: juzProgress is only written by actual session progress, not seeded here
      // pct calculation uses surah keys directly via memorizedAyahs formula
    });
    if(juzToUnmark.length>0){
      console.log('[AUTO-FIX] UNMARKING JUZ:', juzToUnmark, 'juzCompletedInSession:', [...juzCompletedInSession]);
      juzToUnmark.forEach(n=>{const surahs=JUZ_SURAHS[n]||[];console.log(`[AUTO-FIX] Juz ${n} surahs:`, surahs.map(s=>({s:s.s, status:juzStatus[`s${s.s}`]})));});
      setJuzStatus(prev=>{
        const next={...prev};
        juzToUnmark.forEach(n=>delete next[n]);
        return next;
      });
    }
    if(Object.keys(progressUpdates).length>0){
      setJuzProgress(prev=>({...prev,...progressUpdates}));
    }
  },[loaded,juzStatus,juzCompletedInSession]);

  const fetchTranslations=async(verses)=>{
    const needed=verses.filter(v=>!translations[v.verse_key]);
    if(!needed.length) return;
    const surahSet=new Set(needed.map(v=>v.verse_key.split(":")[0]));
    const updated={};
    for(const surahNum of surahSet){
      try{
        const res=await fetch(`https://api.quran.com/api/v4/quran/translations/203?chapter_number=${surahNum}`);
        if(!res.ok) continue;
        const data=await res.json();
        if(!data.translations?.length) continue;
        data.translations.forEach((t,i)=>{
          const key=`${surahNum}:${i+1}`;
          updated[key]=(t.text||"").replace(/<sup[^>]*>.*?<\/sup>/gi,"").replace(/<[^>]+>/g,"").trim();
        });
      }catch{}
    }
    if(Object.keys(updated).length) setTranslations(prev=>({...prev,...updated}));
  };

  // Fetch quran text tab
  useEffect(()=>{
    if(activeTab!=="quran") return;
    let cancelled=false;
    setOpenSurah(null);
    (async()=>{
      setLoading(true); setFetchError(false); setAllVerses([]);
      try {
        let page=1,all=[],tp=1;
        do {
          setLoadMsg(`Loading page ${page} of ${tp}`);
          const res=await fetch(`https://api.qurancdn.com/api/qdc/verses/by_juz/${selectedJuz}?words=false&fields=text_uthmani,verse_key,surah_number&per_page=50&page=${page}`);
          if(!res.ok) throw new Error();
          const data=await res.json();
          if(cancelled) return;
          all=[...all,...(data.verses||[])]; tp=data.pagination?.total_pages||1; page++;
        } while(page<=tp);
        if(!cancelled){setAllVerses(all);const f=all[0]?.surah_number||parseInt(all[0]?.verse_key?.split(":")?.[0]);if(f)setOpenSurah(f);}
      } catch{if(!cancelled)setFetchError(true);}
      if(!cancelled){setLoading(false);setLoadMsg("");}
    })();
    return()=>{cancelled=true;};
  },[selectedJuz,activeTab]);

  const surahGroups=[];let cur=null;
  allVerses.forEach(v=>{const s=v.surah_number||parseInt(v.verse_key?.split(":")?.[0]);if(s!==cur){cur=s;surahGroups.push({surahNum:s,verses:[]});}surahGroups[surahGroups.length-1].verses.push(v);});

  // ── V9 MATH — single source of truth (ayah-level) ──────────────────────
  const memorizedAyahs = completedAyahs?.size ?? 0;
  const totalAyahsInQuran = 6236;
  const pct = totalAyahsInQuran>0?Math.round((memorizedAyahs / totalAyahsInQuran) * 100):0;
  // Juz count — derived from ayah truth (every ayah in the juz must be in completedAyahs)
  const completedCount = Object.keys(JUZ_RANGES).filter(j => v9IsJuzComplete(Number(j))).length;
  // Surah count — derived from ayah truth
  const completedSurahCount = Object.keys(SURAH_AYAH_COUNTS).filter(s => {
    const total=SURAH_AYAH_COUNTS[s]||0;
    if(total===0) return false;
    for(let i=1;i<=total;i++){if(!completedAyahs.has(`${s}:${i}`)) return false;}
    return true;
  }).length;
  const nextIncompleteJuz = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30].find(j=>!v9IsJuzComplete(j));
  const nextJuzAyahs = nextIncompleteJuz ? (JUZ_RANGES[nextIncompleteJuz]?.total ?? null) : null;
  const nextJuz=[...JUZ_META].sort((a,b)=>a.order-b.order).find(j=>!v9IsJuzComplete(j.num));
  const meta=JUZ_META.find(j=>j.num===selectedJuz);
  const curStatus=juzStatus[selectedJuz]||"not_started";
  const curCfg=STATUS_CFG[curStatus];
  const timeline=calcTimeline(goalYears,memorizedAyahs,goalMonths,nextJuzAyahs,completedCount);
  const dailyNew=Math.round(parseFloat(timeline.ayahsPerDay));

    const totalSV=sessionVerses.length;
  const bStart=sessionIdx;
  const bEnd=Math.min(sessionIdx+dailyNew,totalSV);
  const fajrBatch=sessionVerses.slice(bStart,bEnd);
  const currentSessionId=SESSIONS[activeSessionIndex]?.id;
  const isDhuhr=currentSessionId==="dhuhr";
  const isAsr=currentSessionId==="asr";
  const isMaghrib=currentSessionId==="maghrib";
  const isIsha=currentSessionId==="isha";

  let batch=fajrBatch;
  if(isDhuhr){ batch=yesterdayBatch.length>0?yesterdayBatch:[]; }
  else if(isAsr){ batch=asrReviewBatch.length>0?asrReviewBatch:[]; }
  else if(isMaghrib||isIsha){ batch=fajrBatch; }

  const totalPages=Math.max(1,Math.ceil(batch.length/AYAHS_PER_PAGE));
  const safePage=Math.min(ayahPage,totalPages-1);
  const pageStart=safePage*AYAHS_PER_PAGE;
  const pageEnd=Math.min(pageStart+AYAHS_PER_PAGE,batch.length);
  const visibleAyahs=batch.slice(pageStart,pageEnd);

  useEffect(()=>{setAyahPage(0);},[currentSessionId,sessionJuz,sessionIdx,dailyNew,batch.length]);

  useEffect(() => {
    if (currentSessionId !== "asr") {
      setAsrStarted(false);
      setAsrPage(0);
      setAsrExpandedAyah(null);
      setAsrIsCustomized(false);
      return;
    }
    // Don't auto-build during onboarding — it would interfere with the flow
    if (showOnboarding) return;
    setAsrPage(0);
    setAsrExpandedAyah(null);
    if (!asrIsCustomized) {
      buildAsrAutoPool();
    }
  }, [currentSessionId, sessionJuz, showOnboarding]);

  const bKey=`${sessionJuz}-${bStart}`;
  const bDone=sessionDone.includes(bKey);
  const sessM=JUZ_META.find(j=>j.num===sessionJuz);
  const sessPct=totalSV>0?Math.round((sessionIdx/totalSV)*100):0;
  const checkedCount=SESSIONS.filter(s=>dailyChecks[s.id]).length;
  const allChecked=checkedCount===SESSIONS.length;
  const currentReciter=RECITERS.find(r=>r.id===reciter)||RECITERS[0];

  const ASR_PAGE_SIZE = 5;
  const asrPages = Math.max(1, Math.ceil(batch.length / ASR_PAGE_SIZE));
  const asrSafePage = Math.min(asrPage, Math.max(0, asrPages - 1));
  const asrPageStart = asrSafePage * ASR_PAGE_SIZE;
  const asrPageEnd = Math.min(asrPageStart + ASR_PAGE_SIZE, batch.length);
  const asrVisibleAyahs = batch.slice(asrPageStart, asrPageEnd);

  const asrCanStart =
    currentSessionId === "asr" &&
    !sessLoading &&
    batch.length > 0 &&
    (asrSelectedSurahs.length > 0 || asrSelectedJuz.length > 0);

  const asrSelectionSummary = (() => {
    const parts = [];
    if (asrSelectedJuz.length) parts.push(...asrSelectedJuz.map(j => `Juz ${j}`));
    if (asrSelectedSurahs.length) parts.push(...asrSelectedSurahs.map(s => SURAH_EN[s]).filter(Boolean));
    if (!parts.length) return "";
    const label = asrIsCustomized ? "Customized" : "Reviewing";
    return `${label}: ${parts.join(" · ")}`;
  })();

  const asrSurahProgress = (() => {
    if (currentSessionId !== "asr" || !batch.length) return [];

    const surahOrder = [];
    const surahLastIndex = {};

    batch.forEach((v, idx) => {
      const sNum = v.surah_number || parseInt(v.verse_key?.split(":")?.[0], 10);
      if (!surahOrder.includes(sNum)) surahOrder.push(sNum);
      surahLastIndex[sNum] = idx;
    });

    const viewedThrough = asrPageEnd - 1;

    return surahOrder.map((sNum, idx) => {
      const lastIdx = surahLastIndex[sNum];
      let state = "pending";

      if (viewedThrough >= lastIdx) state = "complete";
      else if (idx === surahOrder.findIndex(n => viewedThrough <= surahLastIndex[n])) state = "current";

      return {
        surahNum: sNum,
        label: SURAH_EN[sNum] || `Surah ${sNum}`,
        state,
      };
    });
  })();

  const completedSurahOptions=Object.entries(juzStatus).filter(([key,value])=>String(key).startsWith("s")&&value==="complete").map(([key])=>{const surahNum=Number(String(key).replace("s",""));return{num:surahNum,en:SURAH_EN[surahNum],ar:SURAH_AR?.[surahNum]||""};}).sort((a,b)=>b.num-a.num);

  const currentMemorizationSurahNum=sessionVerses[0]?.surah_number||parseInt(sessionVerses[0]?.verse_key?.split(":")?.[0]||"0",10);
  const descendingSurahOrderForCurrentJuz=[...(JUZ_SURAHS[sessionJuz]||[])].map(item=>item.s).reverse();

  // Compute surahs fully passed in the current session (based on sessionIdx)
  const asrPassedSurahs=useMemo(()=>{
    const passed=new Set();
    if(!sessionVerses.length||!sessionIdx) return passed;
    const surahOrder=[];
    const surahVerseCount={};
    sessionVerses.forEach(v=>{
      const sn=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);
      if(!surahOrder.includes(sn)) surahOrder.push(sn);
      surahVerseCount[sn]=(surahVerseCount[sn]||0)+1;
    });
    let cursor=0;
    for(const sn of surahOrder){
      const count=surahVerseCount[sn]||0;
      if(cursor+count<=sessionIdx) passed.add(sn);
      cursor+=count;
    }
    return passed;
  },[sessionVerses,sessionIdx]);

  const completedJuzOptions=JUZ_META.filter(j=>{
    if(juzStatus[j.num]==="complete") return true;
    const surahs=JUZ_SURAHS[j.num]||[];
    if(surahs.some(s=>juzStatus[`s${s.s}`]==="complete")) return true;
    // Include current juz if any surahs have been passed through in session
    if(j.num===sessionJuz&&asrPassedSurahs.size>0) return true;
    return false;
  }).map(j=>({num:j.num,name:j.roman||`Juz ${j.num}`,arabic:j.arabic||""})).sort((a,b)=>b.num-a.num);

  useEffect(()=>{if(batch.length)fetchTranslations(batch);},[batch]);

  function toggleCheck(id){
    const updated={...dailyChecks,[id]:!dailyChecks[id]};
    setDailyChecks(updated);
    const dk=DATEKEY();
    setCheckHistory(prev=>({...prev,[dk]:{...(prev[dk]||{}),[id]:!dailyChecks[id]}}));
    if(SESSIONS.every(s=>updated[s.id]))setStreak(p=>p+1);
  }
  function markJuzAndSurahsComplete(prev,juzNum){
    const next={...prev};
    const surahs=JUZ_SURAHS[juzNum]||[];
    surahs.forEach(s=>{ next[`s${s.s}`]="complete"; });
    next[juzNum]="complete";
    return next;
  }

  // ── V9 ayah-based mark functions ─────────────────────────────────────────
  function v9MarkJuzComplete(juzNum) {
    const keys = getJuzKeys(juzNum);
    setCompletedAyahs(prev => {
      const next = new Set(prev);
      keys.forEach(k => next.add(k));
      saveCompletedAyahs(next);
      return next;
    });
  }

  function v9MarkJuzIncomplete(juzNum) {
    const keys = new Set(getJuzKeys(juzNum));
    setCompletedAyahs(prev => {
      const next = new Set([...prev].filter(k => !keys.has(k)));
      saveCompletedAyahs(next);
      return next;
    });
  }

  function v9MarkSurahComplete(surahNum) {
    setCompletedAyahs(prev => {
      const next = new Set(prev);
      const total = SURAH_AYAH_COUNTS[surahNum] || 0;
      for(let i=1;i<=total;i++) next.add(`${surahNum}:${i}`);
      saveCompletedAyahs(next);
      return next;
    });
  }

  function v9MarkSurahIncomplete(surahNum) {
    setCompletedAyahs(prev => {
      const total = SURAH_AYAH_COUNTS[surahNum] || 0;
      const remove = new Set();
      for(let i=1;i<=total;i++) remove.add(`${surahNum}:${i}`);
      const next = new Set([...prev].filter(k => !remove.has(k)));
      saveCompletedAyahs(next);
      return next;
    });
  }

  // V9 math helpers — O(1) or O(juz size), always ayah-based
  function v9JuzProgress(juzNum) {
    const keys = getJuzKeys(juzNum);
    const done = keys.filter(k => completedAyahs.has(k)).length;
    return { done, total: JUZ_RANGES[juzNum].total, pct: done / JUZ_RANGES[juzNum].total };
  }

  function v9IsJuzComplete(juzNum) {
    if(!juzNum || !JUZ_RANGES[juzNum]) return false;
    return getJuzKeys(juzNum).every(k => completedAyahs.has(k));
  }

  // ── Asr auto-pool helpers ─────────────────────────────────────────────────
  function isSurahComplete(surahNum) {
    const total = SURAH_AYAH_COUNTS[surahNum] || 0;
    for(let i=1;i<=total;i++) {
      if(!completedAyahs.has(`${surahNum}:${i}`)) return false;
    }
    return total > 0;
  }

  function hasAnyAyahsInJuz(juzNum) {
    return getJuzKeys(juzNum).some(k => completedAyahs.has(k));
  }

  async function buildAsrAutoPool() {
    if(sessLoading) return;
    setSessLoading(true);
    try {
      // Read fresh from localStorage to avoid stale React state
      const freshCA = loadCompletedAyahs();
      const freshIsJuzComplete = (jn) => { if(!jn||!JUZ_RANGES[jn]) return false; return getJuzKeys(jn).every(k=>freshCA.has(k)); };
      const freshIsSurahComplete = (sn) => { const t=SURAH_AYAH_COUNTS[sn]||0; for(let i=1;i<=t;i++){if(!freshCA.has(`${sn}:${i}`)) return false;} return t>0; };
      const freshHasAny = (jn) => getJuzKeys(jn).some(k=>freshCA.has(k));

      // Also check juzStatus for surahs marked complete in onboarding
      const freshJS = juzStatus;

      // Step 1 — collect eligible juz and surahs
      const eligibleJuz = [];    // fully complete juz nums
      const eligibleSurahs = []; // complete surahs from started-but-incomplete juz

      for(let j=1;j<=30;j++) {
        if(freshIsJuzComplete(j) || freshJS[j]==="complete") {
          eligibleJuz.push(j);
        } else if(freshHasAny(j) || (JUZ_SURAHS[j]||[]).some(({s})=>freshJS[`s${s}`]==="complete")) {
          const juzSurahList = JUZ_SURAHS[j] || [];
          juzSurahList.forEach(({s}) => {
            if((freshIsSurahComplete(s) || freshJS[`s${s}`]==="complete") && !eligibleSurahs.includes(s)) {
              eligibleSurahs.push(s);
            }
          });
        }
      }

      console.log('[ASR POOL]',{freshCASize:freshCA.size,eligibleJuz,eligibleSurahs,juzStatusKeys:Object.keys(freshJS).filter(k=>freshJS[k]==="complete")});
      if(eligibleJuz.length === 0 && eligibleSurahs.length === 0) {
        // Nothing eligible — leave batch empty, show empty state
        setAsrReviewBatch([]);
        setAsrSelectedJuz([]);
        setAsrSelectedSurahs([]);
        setSessLoading(false);
        return;
      }

      // Step 2 — cap: max 2 juz, rotate by day of year
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(),0,0)) / 86400000);
      const juzPool = eligibleJuz.length <= 2
        ? eligibleJuz
        : [
            eligibleJuz[dayOfYear % eligibleJuz.length],
            eligibleJuz[(dayOfYear + 1) % eligibleJuz.length],
          ].filter((v,i,a)=>a.indexOf(v)===i);

      // Step 3 — fetch verses for selected juz
      const allVerses = [];
      const seenKeys = new Set();

      for(const juzNum of juzPool) {
        let page=1, tp=1;
        do {
          const res = await fetch(`https://api.qurancdn.com/api/qdc/verses/by_juz/${juzNum}?words=false&fields=text_uthmani,verse_key,surah_number&per_page=50&page=${page}`);
          if(!res.ok) break;
          const data = await res.json();
          (data.verses||[]).forEach(v => {
            if(!seenKeys.has(v.verse_key)) { seenKeys.add(v.verse_key); allVerses.push(v); }
          });
          tp = data.pagination?.total_pages || 1; page++;
        } while(page <= tp);
      }

      // Step 4 — fetch verses for eligible surahs
      for(const surahNum of eligibleSurahs) {
        const res = await fetch(`https://api.qurancdn.com/api/qdc/verses/by_chapter/${surahNum}?words=false&fields=text_uthmani,verse_key,surah_number&per_page=300&page=1`);
        if(!res.ok) continue;
        const data = await res.json();
        (data.verses||[]).forEach(v => {
          if(!seenKeys.has(v.verse_key)) { seenKeys.add(v.verse_key); allVerses.push(v); }
        });
      }

      // Step 5 — sort by descending surah then ascending ayah (backwards memorization order)
      allVerses.sort((a,b)=>{
        const sa=a.surah_number||parseInt(a.verse_key?.split(":")?.[0],10);
        const sb=b.surah_number||parseInt(b.verse_key?.split(":")?.[0],10);
        if(sa!==sb) return sb-sa; // higher surah first (114 → 78)
        const aa=parseInt(a.verse_key?.split(":")?.[1],10);
        const ab=parseInt(b.verse_key?.split(":")?.[1],10);
        return aa-ab; // ayahs ascending within surah
      });
      setAsrSelectedJuz(juzPool);
      setAsrSelectedSurahs(eligibleSurahs);
      setAsrReviewBatch(allVerses);
      setAsrStarted(true);
      setAsrPage(0);
      setAsrExpandedAyah(null);
    } catch(e) {
      console.error('[buildAsrAutoPool]', e.message, e.stack);
      setAsrReviewBatch([]);
    } finally {
      setSessLoading(false);
    }
  }

  function markBatchDone(){
    setSessionDone(d=>[...d,bKey]);
    if(bEnd>=totalSV){
      setJuzStatus(prev=>markJuzAndSurahsComplete(prev,sessionJuz));
      setJuzProgress(p=>({...p,[sessionJuz]:totalSV}));
      setJuzCompletedInSession(prev=>new Set([...prev,sessionJuz]));
      v9MarkJuzComplete(sessionJuz); // V9: add all ayahs of this juz to completedAyahs
    } else {
      setSessionIdx(bEnd);
      setJuzProgress(p=>({...p,[sessionJuz]:bEnd}));
      // V9: add all completed ayahs up to bEnd (not just current batch)
      setCompletedAyahs(prev=>{const next=new Set(prev);sessionVerses.slice(0,bEnd).forEach(v=>{if(v.verse_key)next.add(v.verse_key);});saveCompletedAyahs(next);return next;});
      setJuzStatus(prev=>{
        const next={...prev};
        let changed=false;
        // Group sessionVerses by surah in the order they appear (descending surah order)
        const surahOrder=[];
        const surahVerseCount={};
        sessionVerses.forEach(v=>{
          const sn=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);
          if(!surahOrder.includes(sn)) surahOrder.push(sn);
          surahVerseCount[sn]=(surahVerseCount[sn]||0)+1;
        });
        let cursor=0;
        for(const sn of surahOrder){
          const count=surahVerseCount[sn]||0;
          if(next[`s${sn}`]==="complete"){ cursor+=count; continue; }
          if(count===0) continue;
          if(cursor+count<=bEnd){ next[`s${sn}`]="complete"; changed=true; v9MarkSurahComplete(sn); }
          cursor+=count;
        }
        return changed?next:prev;
      });
    }
  }

  async function playAyah(verseKey,key){
    if(playingKey===key){ audioRef.current?.pause(); setPlayingKey(null); return; }
    if(audioRef.current){audioRef.current.pause();audioRef.current=null;}
    setAudioLoading(key);
    const [surah,ayah]=verseKey.split(":");

    function playDirect(url){
      const audio=new Audio(url);
      audioRef.current=audio;
      audio.oncanplay=()=>{setAudioLoading(null);setPlayingKey(key);};
      audio.onended=()=>{
        setRepCounts(prev=>{
          const newCount=Math.min(20,(prev[verseKey]||0)+1);
          if(newCount>=20 && !completedAyahs.has(verseKey)){
            setCompletedAyahs(ca=>{const next=new Set(ca);next.add(verseKey);saveCompletedAyahs(next);return next;});
          }
          return {...prev,[verseKey]:newCount};
        });
        if(looping){
          audio.currentTime=0;
          audio.play().catch(()=>{setPlayingKey(null);});
        } else {
          setPlayingKey(null);
        }
      };
      audio.onerror=()=>{setAudioLoading(null);setPlayingKey(null);};
      audio.play().catch(()=>{setAudioLoading(null);setPlayingKey(null);});
    }

    const everyayahUrl=`https://everyayah.com/data/${getEveryayahFolder(reciter)}/${String(surah).padStart(3,"0")}${String(ayah).padStart(3,"0")}.mp3`;
    if(!currentReciter.recitationId){ playDirect(everyayahUrl); return; }

    try {
      const res=await fetch(`https://api.qurancdn.com/api/qdc/audio/reciters/${currentReciter.recitationId}/audio_files?chapter_number=${surah}&juz_number=0&page_number=0&hizb_number=0&rub_el_hizb_number=0&verse_key=${verseKey}`);
      if(res.ok){
        const data=await res.json();
        const url=data.audio_files?.[0]?.url;
        if(url){ playDirect(url.startsWith("http")?url:`https://audio.qurancdn.com/${url}`); return; }
      }
    } catch {}
    playDirect(everyayahUrl);
  }

  const [playingSurah, setPlayingSurah] = useState(null);
  const surahQueueRef = useRef([]);
  const surahIdxRef = useRef(0);

  function playSurahQueue(verses, surahNum, startIdx=0, reciterId=reciter) {
    if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; }
    if(playingSurah===surahNum){ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); return; }
    surahQueueRef.current=verses; surahIdxRef.current=startIdx;
    setPlayingSurah(surahNum);
    playNextInQueue(verses,startIdx,surahNum,reciterId);
  }

  function playNextInQueue(verses, idx, surahNum, reciterId=reciter) {
    if(idx>=verses.length){ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); return; }
    if(!hasPerAyah(reciterId)){
      const archiveUrl=getArchiveUrl(reciterId,surahNum);
      if(!archiveUrl){ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); return; }
      if(idx>0) return;
      setPlayingKey(verses[0]?.verse_key); setAudioLoading(verses[0]?.verse_key);
      const audio=new Audio(archiveUrl); audioRef.current=audio;
      audio.oncanplay=()=>setAudioLoading(null);
      audio.onended=()=>{ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); };
      audio.onerror=()=>{ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); };
      audio.play().catch(()=>{ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); });
      return;
    }
    const v=verses[idx]; const vKey=v.verse_key; const [surah,ayah]=vKey.split(":");
    setPlayingKey(vKey); setAudioLoading(vKey);
    const folder=getEveryayahFolder(reciterId);
    const url=`https://everyayah.com/data/${folder}/${String(surah).padStart(3,"0")}${String(ayah).padStart(3,"0")}.mp3`;
    // preload next 2 ayahs
    for(let offset=1;offset<=2;offset++){
      if(idx+offset<verses.length){
        const nv=verses[idx+offset]; const [ns,na]=nv.verse_key.split(":");
        const pre=new Audio(`https://everyayah.com/data/${folder}/${String(ns).padStart(3,"0")}${String(na).padStart(3,"0")}.mp3`);
        pre.preload="auto";
      }
    }
    const audio=new Audio(url); audio.preload="auto"; audioRef.current=audio;
    audio.oncanplay=()=>setAudioLoading(null);
    audio.onended=()=>{ surahIdxRef.current=idx+1; playNextInQueue(surahQueueRef.current,idx+1,surahNum,reciterId); };
    audio.onerror=()=>{ surahIdxRef.current=idx+1; playNextInQueue(surahQueueRef.current,idx+1,surahNum,reciterId); };
    audio.play().catch(()=>{ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); });
  }

  function getEveryayahFolder(id){
    const r=RECITERS.find(x=>x.id===id);
    if(r?.everyayah) return r.everyayah;
    // Extra reciters only in QURAN_RECITERS
    const extras={"alijaber":"Ali_Jaber_128kbps"};
    return extras[id]||RECITERS[0].everyayah;
  }

  function stopMushafAudio(){
    if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; }
    setPlayingKey(null); setAudioLoading(null); setMushafAudioPlaying(false);
  }

  function playMushafRange(verses){
    if(!verses||verses.length===0) return;
    if(mushafAudioPlaying){ stopMushafAudio(); return; }
    stopMushafAudio();
    setMushafAudioPlaying(true);

    const folder=getEveryayahFolder(quranReciter);
    function urlFor(vKey){
      const [s,a]=vKey.split(":");
      return `https://everyayah.com/data/${folder}/${String(s).padStart(3,"0")}${String(a).padStart(3,"0")}.mp3`;
    }

    // Pre-load all ayahs upfront so transitions are instant
    const preloaded=verses.map(v=>{
      const a=new Audio(urlFor(v.verse_key));
      a.preload="auto";
      return a;
    });

    let nextTriggered=false;

    function playIdx(idx){
      if(idx>=verses.length){ setMushafAudioPlaying(false); setPlayingKey(null); setAudioLoading(null); return; }
      const vKey=verses[idx].verse_key;
      const audio=preloaded[idx];
      nextTriggered=false;
      audioRef.current=audio;
      setPlayingKey(vKey);
      setAudioLoading(vKey);

      audio.oncanplay=()=>setAudioLoading(null);
      audio.onended=()=>playIdx(idx+1);
      audio.onerror=()=>playIdx(idx+1);

      // Start next ayah 0.25s before current ends — eliminates the gap
      audio.ontimeupdate=()=>{
        if(!nextTriggered && audio.duration>0 && audio.currentTime >= audio.duration - 0.25){
          nextTriggered=true;
          if(idx+1<verses.length){
            const nextAudio=preloaded[idx+1];
            nextAudio.currentTime=0;
            nextAudio.play().catch(()=>{});
          }
        }
      };

      audio.play().catch(()=>{ setMushafAudioPlaying(false); setPlayingKey(null); });
    }

    playIdx(0);
  }
  function getArchiveUrl(id, surahNum){ const r=RECITERS.find(x=>x.id===id); if(!r?.archive) return null; return `https://archive.org/download/${r.archive}/${String(surahNum).padStart(3,"0")}.mp3`; }

  const MID_SURAH_JUZ=new Set([2,3,4,5,6,7,8,11,12,16,19,20,21,22,23,24,25,27]);

  function getQuranSurahUrl(reciterId,surahNum){
    const r=QURAN_RECITERS.find(x=>x.id===reciterId);
    if(!r?.quranicaudio) return null;
    return `https://download.quranicaudio.com/quran/${r.quranicaudio}/${String(surahNum).padStart(3,"0")}.mp3`;
  }

  function playQuranSurah(surahNum){
    if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; }
    if(playingSurah===surahNum){ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); return; }
    const url=getQuranSurahUrl(quranReciter,surahNum);
    if(!url) return;
    setPlayingSurah(surahNum); setPlayingKey(`surah-${surahNum}`); setAudioLoading(`surah-${surahNum}`);
    const audio=new Audio(url);
    audioRef.current=audio;
    audio.oncanplay=()=>{ setAudioLoading(null); };
    audio.onended=()=>{ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); };
    audio.onerror=()=>{ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); };
    audio.play().catch(()=>{ setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null); });
  }
  function hasPerAyah(id){ const r=RECITERS.find(x=>x.id===id); return !!r?.everyayah; }

  async function toggleAsrSurahReview(surahNum){
    try {
      setSessLoading(true);
      if(asrSelectedSurahs.includes(surahNum)){
        const nextSelected=asrSelectedSurahs.filter(n=>n!==surahNum);
        setAsrSelectedSurahs(nextSelected);
        setAsrReviewBatch(prev=>prev.filter(v=>{
          const sNum=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);
          return sNum!==surahNum;
        }));
        return;
      }
      const res=await fetch(`https://api.qurancdn.com/api/qdc/verses/by_chapter/${surahNum}?words=false&fields=text_uthmani,verse_key,surah_number&per_page=300&page=1`);
      if(!res.ok) throw new Error();
      const data=await res.json();
      const verses=data.verses||[];
      setAsrSelectedSurahs(prev=>[...prev,surahNum]);
      setAsrReviewBatch(prev=>{
        const merged=[...prev,...verses];
        const seen=new Set();
        return merged.filter(v=>{ if(seen.has(v.verse_key)) return false; seen.add(v.verse_key); return true; });
      });
    } catch {}
    finally { setSessLoading(false); }
  }

  async function loadAsrJuzReview(juzNum){
    try {
      setSessLoading(true);
      if(asrSelectedJuz.includes(juzNum)){
        // Deselect — remove Juz and its verses from batch
        setAsrSelectedJuz(prev=>prev.filter(n=>n!==juzNum));
        const juzSurahNums=(JUZ_SURAHS[juzNum]||[]).map(s=>s.s);
        setAsrReviewBatch(prev=>prev.filter(v=>{
          const sNum=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);
          return !juzSurahNums.includes(sNum);
        }));
        return;
      }
      let page=1,all=[],tp=1;
      do {
        const res=await fetch(`https://api.qurancdn.com/api/qdc/verses/by_juz/${juzNum}?words=false&fields=text_uthmani,verse_key,surah_number&per_page=50&page=${page}`);
        if(!res.ok) throw new Error();
        const data=await res.json();
        all=[...all,...(data.verses||[])]; tp=data.pagination?.total_pages||1; page++;
      } while(page<=tp);
      const juzSurahNums=(JUZ_SURAHS[juzNum]||[]).map(s=>s.s);
      // Remove individually selected surahs from this Juz before adding whole Juz
      setAsrSelectedSurahs(prev=>prev.filter(n=>!juzSurahNums.includes(n)));
      setAsrSelectedJuz(prev=>[...prev,juzNum]);
      setAsrReviewBatch(prev=>{
        // Remove any verses from this Juz's surahs already in batch (from individual selections)
        const withoutJuz=prev.filter(v=>{
          const sNum=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);
          return !juzSurahNums.includes(sNum);
        });
        const merged=[...withoutJuz,...all];
        const seen=new Set();
        return merged.filter(v=>{ if(seen.has(v.verse_key)) return false; seen.add(v.verse_key); return true; });
      });
    } catch {}
    finally { setSessLoading(false); }
  }

  function playHaramainSurah(imam, surahNum, key) {
    if(haramainPlaying===key){ haramainRef.current?.pause(); setHaramainPlaying(null); return; }
    if(haramainRef.current){ haramainRef.current.pause(); haramainRef.current=null; }
    let url;
    if(imam.quranicaudio){
      url = `https://download.quranicaudio.com/quran/${imam.quranicaudio}/${String(surahNum).padStart(3,"0")}.mp3`;
    } else if(imam.archive){
      url = `https://archive.org/download/${imam.archive}/${String(surahNum).padStart(3,"0")}.mp3`;
    } else { return; }
    const audio = new Audio(url);
    haramainRef.current = audio;
    audio.play().catch(()=>{});
    setHaramainPlaying(key);
    audio.onended = () => setHaramainPlaying(null);
    audio.onerror = () => setHaramainPlaying(null);
  }

  const TABS=[
    {id:"myhifz",     label:"My Hifz"},
    {id:"rihlah",     label:"My Rihlah"},
    {id:"quran",      label:"Al-Quran Al-Karim"},
    {id:"masjidayn",  label:"🕋 Al-Masjidayn"},
  ];


  function toArabicDigits(num) {
    return String(num).replace(/[0-9]/g, d => "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669"[d]);
  }

  return (
    <div className={dark?"":"lm"} style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:"100vh",color:T.text,display:"flex",flexDirection:"column",transition:"background .25s,color .25s"}}>
      <style>{`
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
        @keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .9s linear infinite;}@keyframes slideUpDrawer{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
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
      `}</style>

      {/* ── ASR FULL-SCREEN MODE ── */}
      {!sessLoading&&activeTab==="myhifz"&&currentSessionId==="asr"&&asrStarted&&batch.length>0&&(
        <AsrSessionView
          dark={dark}
          asrSelectionSummary={asrSelectionSummary}
          asrSafePage={asrSafePage}
          asrPages={asrPages}
          asrPageStart={asrPageStart}
          asrPageEnd={asrPageEnd}
          asrVisibleAyahs={asrVisibleAyahs}
          asrBatch={batch}
          asrExpandedAyah={asrExpandedAyah}
          setAsrExpandedAyah={setAsrExpandedAyah}
          asrTouchStartRef={asrTouchStartRef}
          setAsrPage={setAsrPage}
          asrSlideDir={asrSlideDir}
          setAsrSlideDir={setAsrSlideDir}
          translations={translations}
          fetchTranslations={fetchTranslations}
          playAyah={playAyah}
          playingKey={playingKey}
          audioLoading={audioLoading}
          asrSurahProgress={asrSurahProgress}
          onComplete={()=>{
            const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];
            console.log('[ASR COMPLETE]', {activeSessionIndex, nextIndex: Math.min(SESSIONS.length-1,activeSessionIndex+1)});
            setSessionsCompleted(prev=>({...prev,[sess.id]:true}));
            toggleCheck(sess.id);
            setAsrStarted(false);
            setAsrPage(0);
            setAsrExpandedAyah(null);
            setActiveSessionIndex(i=>Math.min(SESSIONS.length-1,i+1));
          }}
          onChangeSelection={()=>{
            setAsrStarted(false);
            setAsrPage(0);
            setAsrExpandedAyah(null);
            setAsrIsCustomized(true); // open customize picker
          }}
          asrIsCustomized={asrIsCustomized}
        />
      )}

      {/* Everything below is hidden during Asr full-screen */}
      {!(activeTab==="myhifz"&&currentSessionId==="asr"&&asrStarted&&batch.length>0)&&(<>

      {/* ── ONBOARDING FLOW ── */}
      {showOnboarding&&(
        <div style={{position:"fixed",inset:0,background:"#060A07",zIndex:1000,display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* ── STEP 1 — BISMILLAH ── */}
                    {onboardStep===1&&(
            <div className="fi" style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 28px",textAlign:"center",position:"relative",overflow:"hidden",background:"linear-gradient(180deg,#04070A 0%,#0A1120 50%,#0C1526 100%)"}}>
              {/* Top ambient glow */}
              <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 50% 0%,rgba(212,175,55,0.10),transparent 60%)",zIndex:0}}/>
              {/* Star field */}
              <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(1px 1px at 15% 20%,rgba(212,175,55,0.20) 0%,transparent 100%),radial-gradient(1px 1px at 75% 15%,rgba(255,255,255,0.08) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 45% 8%,rgba(212,175,55,0.18) 0%,transparent 100%),radial-gradient(1px 1px at 85% 35%,rgba(255,255,255,0.06) 0%,transparent 100%),radial-gradient(1px 1px at 25% 65%,rgba(212,175,55,0.08) 0%,transparent 100%)",pointerEvents:"none",zIndex:0}}/>
              <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",width:"100%"}}>
                <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(28px,6vw,44px)",color:"#F6E27A",direction:"rtl",lineHeight:1.7,marginBottom:24,textShadow:"0 0 22px rgba(212,175,55,0.18)"}}>
                  بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
                </div>
                <div style={{width:50,height:1,background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.5),transparent)",margin:"0 auto 24px"}}/>
                <div style={{fontFamily:"'Amiri',serif",fontSize:18,color:"#D4AF37",direction:"rtl",lineHeight:2,marginBottom:8,opacity:.85,textShadow:"0 0 10px rgba(212,175,55,0.12)"}}>
                  وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ
                </div>
                <div style={{fontSize:11,color:"rgba(243,231,191,0.5)",fontStyle:"italic",marginBottom:4}}>"And We have certainly made the Quran easy for remembrance"</div>
                <div style={{fontSize:9,color:"rgba(212,175,55,0.35)",marginBottom:40}}>Al-Qamar · 54:17</div>

                <div className="sbtn" onClick={()=>setOnboardStep(3)} style={{width:"100%",maxWidth:360,padding:"15px",background:"linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)",borderRadius:12,fontSize:14,fontWeight:700,color:"#060A07",letterSpacing:".02em",boxShadow:"0 12px 24px rgba(212,175,55,0.22)"}}>
                  Begin Your Journey →
                </div>
                <div style={{width:40,height:1,background:"rgba(212,175,55,0.25)",margin:"16px auto 10px"}}/><div style={{fontSize:9,color:"rgba(243,231,191,0.7)",fontWeight:500,letterSpacing:".08em",textShadow:"0 0 8px rgba(212,175,55,0.12)"}}>© 2026 NoorTech Studio</div>
              </div>
            </div>
          )}


          {/* ── STEP 3 — NAME INPUT ── */}
          {onboardStep===3&&(
            <div className="fi" style={{flex:1,display:"flex",flexDirection:"column",padding:"24px 24px 32px",overflow:"auto",background:"linear-gradient(180deg,#04070A 0%,#0A1120 50%,#0C1526 100%)",minHeight:0,position:"relative"}}>
              <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 50% 0%,rgba(212,175,55,0.08),transparent 55%)",zIndex:0}}/>
              <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",flex:1,justifyContent:"space-between"}}>
                {/* TOP — progress + welcome + question + input */}
                <div>
                  <div style={{display:"flex",gap:5,marginBottom:32}}>
                    {[1,2,3].map(i=>(<div key={i} style={{flex:1,height:3,borderRadius:2,background:"linear-gradient(90deg,#C8961E,#F6E27A,#D4AF37)",boxShadow:"0 0 12px rgba(212,175,55,0.40)"}}/>))}
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontFamily:"'Amiri',serif",fontSize:28,color:"#F6E27A",direction:"rtl",lineHeight:1.7,marginBottom:10,textShadow:"0 0 10px rgba(212,175,55,0.12)"}}>أَهْلًا وَسَهْلًا</div>
                    <div style={{fontSize:14,color:"rgba(243,231,191,0.85)",marginBottom:24}}>Welcome to your Hifz journey</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#F3E7BF",textShadow:"0 0 14px rgba(212,175,55,0.10)",marginBottom:20}}>What should we call you?</div>
                    <input
                      type="text"
                      value={userName}
                      onChange={e=>setUserName(e.target.value)}
                      placeholder="Enter your name"
                      style={{width:"100%",background:"linear-gradient(180deg,rgba(15,20,32,0.97),rgba(9,13,22,0.99))",border:`1px solid ${userName?"rgba(212,175,55,0.35)":"rgba(255,255,255,0.08)"}`,borderRadius:12,padding:"14px 16px",fontSize:18,color:"#F3E7BF",fontFamily:"'DM Sans',sans-serif",outline:"none",transition:"border .2s",textAlign:"center",boxShadow:userName?"0 0 14px rgba(212,175,55,0.08),inset 0 0 12px rgba(212,175,55,0.06)":"inset 0 0 12px rgba(212,175,55,0.04)"}}
                    />
                  </div>
                </div>
                {/* MIDDLE — preview card floats centered */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {userName&&(
                    <div className="fi" style={{width:"100%",padding:"14px 18px",background:"linear-gradient(180deg,rgba(15,20,32,0.97),rgba(9,13,22,0.99)), radial-gradient(circle at 50% 30%,rgba(212,175,55,0.05),transparent 65%)",border:"1px solid rgba(212,175,55,0.20)",borderRadius:14,textAlign:"center",boxShadow:"0 0 18px rgba(212,175,55,0.08),inset 0 1px 0 rgba(212,175,55,0.10)"}}>
                      <div style={{fontSize:9,color:"rgba(212,175,55,0.55)",marginBottom:6,letterSpacing:".10em",textTransform:"uppercase"}}>Your name</div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#F6E27A",marginBottom:4,textShadow:"0 0 16px rgba(212,175,55,0.18)"}}>{userName}</div>
                      <div style={{fontSize:10,color:"rgba(243,231,191,0.50)",fontStyle:"italic"}}>May Allah make it easy for you 🤲</div>
                    </div>
                  )}
                </div>
                {/* BOTTOM — buttons */}
                <div>
                  <div style={{display:"flex",gap:8,marginBottom:0}}>
                    <div className="sbtn" onClick={()=>setOnboardStep(1)} style={{padding:"14px 18px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,fontSize:14,color:"rgba(243,231,191,0.50)"}}>←</div>
                    <div className="sbtn" onClick={()=>setOnboardStep(4)} style={{flex:1,padding:"14px",background:"linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)",borderRadius:12,fontSize:14,fontWeight:700,color:"#060A07",textAlign:"center",boxShadow:"0 12px 24px rgba(212,175,55,0.22)"}}>
                      Continue →
                    </div>
                  </div>
                  <div className="sbtn" onClick={()=>setOnboardStep(4)} style={{textAlign:"center",fontSize:11,color:"rgba(212,175,55,0.35)",marginTop:10,opacity:0.5}}>Skip for now</div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4 — GOAL + JUZ TRACKER ── */}
          {onboardStep===4&&!loaded&&(
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(180deg,#04070A 0%,#0A1120 50%,#0C1526 100%)"}}>
              <div className="spin" style={{width:24,height:24,border:"2px solid rgba(212,175,55,0.15)",borderTopColor:"#D4AF37",borderRadius:"50%"}}/>
            </div>
          )}
          {onboardStep===4&&loaded&&(()=>{
            try {
            const tl=calcTimeline(goalYears,memorizedAyahs,goalMonths,null,completedCount);
            const remainingJuz=tl.juzLeft;
            const apd=Math.round(parseFloat(tl.ayahsPerDay));
            const daysPerJuz=tl.daysPerJuz;
            const displayedJuz=JUZ_META.slice().reverse().slice(0,visibleOnboardJuzCount);
            return (
              <div className="fi" style={{flex:1,display:"flex",flexDirection:"column",padding:"20px 20px 24px",overflow:"auto",background:"linear-gradient(180deg,#04070A 0%,#0A1120 50%,#0C1526 100%)",position:"relative"}}>
                <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 50% 0%,rgba(212,175,55,0.10),transparent 60%)",zIndex:0}}/>
                <div style={{position:"relative",zIndex:1,display:"flex",gap:5,marginBottom:20}}>
                  {[1,2,3].map(i=>(<div key={i} style={{flex:1,height:3,borderRadius:2,background:"linear-gradient(90deg,#C8961E,#F6E27A,#D4AF37)",boxShadow:"0 0 12px rgba(212,175,55,0.40)"}}/>))}
                </div>
                <div style={{textAlign:"center",marginBottom:18}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:"#F3E7BF",lineHeight:1.2,marginBottom:8,textShadow:"0 0 18px rgba(212,175,55,0.15)"}}>Choose Your Timeline</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"rgba(243,231,191,0.75)",lineHeight:1.2}}>Mark Your Memorization</div>
                </div>
                <div style={{background:"linear-gradient(180deg,rgba(15,20,32,0.97) 0%,rgba(9,13,22,0.99) 100%), radial-gradient(circle at 50% 30%,rgba(212,175,55,0.05),transparent 65%)",border:"1px solid rgba(212,175,55,0.18)",borderRadius:20,padding:"18px 16px",marginBottom:18,textAlign:"center",boxShadow:"0 0 18px rgba(212,175,55,0.08),0 12px 35px rgba(0,0,0,0.40),inset 0 1px 0 rgba(212,175,55,0.10)"}}>
                  <div style={{fontSize:9,color:"#D4AF37",letterSpacing:".18em",textTransform:"uppercase",marginBottom:8}}>Your Goal</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#F6E27A",marginBottom:10}}>{goalYears} Year{goalYears!==1?"s":""}{goalMonths>0?" • "+goalMonths+" Month"+(goalMonths!==1?"s":""):""}</div>
                  <div style={{fontSize:13,color:"rgba(243,231,191,0.75)",lineHeight:1.7,marginBottom:10}}>
                    <span style={{color:"#F6E27A",fontWeight:700}}>{apd} ayahs per day</span><span style={{opacity:0.7}}>{" • "}{daysPerJuz} days per juz</span><span style={{opacity:0.7}}>{" • "}{remainingJuz} juz remaining</span>
                  </div>
                  <div className="sbtn" onClick={()=>setOpenMethod(openMethod==="timeline-adjust"?null:"timeline-adjust")} style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:"#D4AF37",padding:"6px 12px",borderRadius:999,border:"1px solid rgba(212,175,55,0.22)",background:"rgba(212,175,55,0.05)"}}>
                    Adjust timeline <span style={{fontSize:11}}>{openMethod==="timeline-adjust"?"▴":"▾"}</span>
                  </div>
                </div>
                {openMethod==="timeline-adjust"&&(
                  <div className="fi" style={{background:"rgba(12,18,30,0.92)",border:"1px solid rgba(212,175,55,0.16)",borderRadius:16,padding:"14px 14px 12px",marginBottom:18}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:9,color:"#A8B89A",letterSpacing:".1em",textTransform:"uppercase"}}>Years</span><span style={{fontSize:12,color:"#F6E27A",fontWeight:700}}>{goalYears}</span></div>
                        <input type="range" min="1" max="10" value={goalYears} onChange={e=>setGoalYears(Number(e.target.value))} style={{width:"100%"}}/>
                      </div>
                      <div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:9,color:"#A8B89A",letterSpacing:".1em",textTransform:"uppercase"}}>Months</span><span style={{fontSize:12,color:"#F6E27A",fontWeight:700}}>{goalMonths}</span></div>
                        <input type="range" min="0" max="11" value={goalMonths} onChange={e=>setGoalMonths(Number(e.target.value))} style={{width:"100%"}}/>
                      </div>
                    </div>
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:9,color:"rgba(243,231,191,0.65)",letterSpacing:".16em",textTransform:"uppercase"}}>Mark Your Memorization</div>
                  <div style={{fontSize:11,color:"rgba(212,175,55,0.75)",fontWeight:700}}>{completedCount} Juz completed</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12}}>
                  {displayedJuz.map(j=>{
                    const isOpen=openJuzPanel===j.num;
                    const surahs=JUZ_SURAHS[j.num]||[];
                    const allChecked=surahs.every(s=>juzStatus[`s${s.s}`]==="complete");
                    const someChecked=surahs.some(s=>juzStatus[`s${s.s}`]==="complete");
                    const juzComplete=v9IsJuzComplete(j.num);
                    return (
                      <div key={j.num} style={{borderRadius:18,overflow:"hidden",border:juzComplete?"1px solid rgba(246,226,122,0.45)":someChecked?"1px solid rgba(212,175,55,0.22)":"1px solid rgba(212,175,55,0.12)",background:juzComplete?"linear-gradient(180deg,rgba(18,22,34,0.97) 0%,rgba(10,13,22,0.99) 100%), radial-gradient(circle at 50% 40%,rgba(212,175,55,0.07),transparent 60%)":"linear-gradient(180deg,rgba(14,18,28,0.97) 0%,rgba(8,11,20,0.99) 100%), radial-gradient(circle at 50% 40%,rgba(212,175,55,0.04),transparent 60%)",transition:"all .18s ease",boxShadow:juzComplete?"0 0 20px rgba(212,175,55,0.14),0 12px 28px rgba(0,0,0,0.38),inset 0 1px 0 rgba(212,175,55,0.12)":"0 0 12px rgba(212,175,55,0.05),0 8px 22px rgba(0,0,0,0.32),inset 0 1px 0 rgba(212,175,55,0.06)"}}>
                        {/* Juz header — tap to expand, long-press or ✓ button to mark complete */}
                        <div className="sbtn" onClick={()=>setOpenJuzPanel(isOpen?null:j.num)} style={{padding:"16px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:11,color:juzComplete?"#F6E27A":"rgba(255,255,255,0.40)",marginBottom:6,letterSpacing:".08em"}}>Juz {j.num}</div>
                            <div style={{fontFamily:"'Amiri',serif",fontSize:24,lineHeight:1.5,color:juzComplete?"#FFF6D6":"#E8DFC0",textShadow:juzComplete?"0 0 16px rgba(212,175,55,0.18)":"0 0 10px rgba(255,240,200,0.12)",letterSpacing:"0.5px"}}>{JUZ_OPENERS[j.num]}</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div className="sbtn" onClick={e=>{e.stopPropagation();const completing=!v9IsJuzComplete(j.num);setJuzStatus(prev=>{const next={...prev};if(!completing)delete next[j.num];else next[j.num]="complete";return next;});if(completing)v9MarkJuzComplete(j.num);else v9MarkJuzIncomplete(j.num);}} style={{width:22,height:22,borderRadius:"50%",background:juzComplete?"rgba(246,226,122,0.14)":"rgba(255,255,255,0.04)",border:`1px solid ${juzComplete?"rgba(246,226,122,0.45)":"rgba(212,175,55,0.25)"}`,display:"flex",alignItems:"center",justifyContent:"center",color:juzComplete?"#F6E27A":"rgba(212,175,55,0.4)",fontSize:11,fontWeight:700}}>{juzComplete?"✓":"○"}</div>
                            <div style={{color:"rgba(212,175,55,0.7)",fontSize:14,transition:"transform .2s",transform:isOpen?"rotate(180deg) translateY(-2px)":"translateY(2px)"}}>▾</div>
                          </div>
                        </div>
                        {/* Surah list */}
                        {isOpen&&(
                          <div style={{borderTop:"1px solid rgba(212,175,55,0.12)",padding:"14px 14px 16px",background:"rgba(0,0,0,0.18)"}}>
                            {/* Select All */}
                            <div className="sbtn" onClick={()=>{
                              const completing=!allChecked;
                              setJuzStatus(prev=>{
                                const next={...prev};
                                if(!completing){ surahs.forEach(s=>{delete next[`s${s.s}`];}); delete next[j.num]; }
                                else { surahs.forEach(s=>{next[`s${s.s}`]="complete";}); next[j.num]="complete"; }
                                return next;
                              });
                              // V9: add/remove all ayahs for every surah in this juz
                              if(completing) surahs.forEach(s=>v9MarkSurahComplete(s.s));
                              else v9MarkJuzIncomplete(j.num);
                            }} style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"8px 10px",borderRadius:10,background:"rgba(212,175,55,0.03)",border:"1px solid rgba(212,175,55,0.16)",boxShadow:"0 0 10px rgba(212,175,55,0.05)"}}>
                              <div style={{width:18,height:18,borderRadius:5,background:allChecked?"linear-gradient(135deg,#D4AF37,#F6E27A)":"transparent",border:allChecked?"1px solid rgba(246,226,122,0.7)":"1.5px solid rgba(212,175,55,0.35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#060A07",fontWeight:700,flexShrink:0,boxShadow:allChecked?"0 0 10px rgba(212,175,55,0.35)":"none"}}>{allChecked?"✓":""}</div>
                              <div style={{fontSize:12,color:allChecked?"#F6E27A":"rgba(212,175,55,0.8)",fontWeight:700,letterSpacing:".02em"}}>Select all surahs in Juz {j.num}</div>
                            </div>
                            {/* Surah grid */}
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                              {surahs.map((s,si)=>{
                                const checked=juzStatus[`s${s.s}`]==="complete";
                                return (
                                  <div key={s.s} className="sbtn" onClick={()=>{
                                    const completing=!checked;
                                    setJuzStatus(prev=>{
                                      const next={...prev,[`s${s.s}`]:completing?"complete":undefined};
                                      if(!completing) delete next[`s${s.s}`];
                                      const allNow=surahs.every(sr=>next[`s${sr.s}`]==="complete");
                                      if(allNow) next[j.num]="complete"; else delete next[j.num];
                                      return next;
                                    });
                                    // V9: add/remove this surah's ayahs
                                    if(completing) v9MarkSurahComplete(s.s);
                                    else v9MarkSurahIncomplete(s.s);
                                  }} style={{display:"flex",alignItems:"center",gap:7,padding:"9px 10px",borderRadius:10,background:checked?"linear-gradient(180deg,rgba(212,175,55,0.08) 0%,rgba(12,16,26,0.96) 100%)":"rgba(255,255,255,0.02)",border:checked?"1px solid rgba(212,175,55,0.38)":"1px solid rgba(255,255,255,0.05)",boxShadow:checked?"0 0 14px rgba(212,175,55,0.12)":"none",transform:checked?"scale(1.01)":"scale(1)",transition:"all .18s ease"}}>
                                    <div style={{width:14,height:14,borderRadius:4,background:checked?"linear-gradient(135deg,#D4AF37,#F6E27A)":"transparent",border:checked?"1px solid rgba(246,226,122,0.7)":"1.5px solid rgba(212,175,55,0.35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#060A07",fontWeight:800,flexShrink:0,boxShadow:checked?"0 0 10px rgba(212,175,55,0.35)":"none"}}>{checked?"✓":""}</div>
                                    <div style={{fontSize:10,color:checked?"#F6E27A":"rgba(255,255,255,0.65)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:checked?600:400}}>{s.name}</div>
                                    <div style={{fontSize:8,color:"rgba(255,255,255,0.25)",flexShrink:0}}>{s.a}v</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {visibleOnboardJuzCount<30&&(
                  <div style={{textAlign:"center",marginBottom:18}}>
                    <div className="sbtn" onClick={()=>setVisibleOnboardJuzCount(v=>Math.min(v+7,30))} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"10px 16px",borderRadius:999,background:"rgba(212,175,55,0.03)",border:"1px solid rgba(212,175,55,0.12)",color:"rgba(212,175,55,0.85)",fontSize:12,fontWeight:600}}>
                      Load More <span style={{fontSize:11}}>↓</span>
                    </div>
                  </div>
                )}
                <div style={{flex:1}}/>
                <div style={{display:"flex",gap:8}}>
                  <div className="sbtn" onClick={()=>setOnboardStep(3)} style={{padding:"14px 18px",background:"#0D1008",border:"1px solid #1E2A18",borderRadius:12,fontSize:14,color:"#A8B89A"}}>←</div>
                  <div className="sbtn" onClick={()=>{if(userName) localStorage.setItem("rihlat-username",userName);localStorage.setItem("rihlat-onboarded","1");setShowOnboarding(false);}} style={{flex:1,padding:"14px",background:"linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)",borderRadius:12,fontSize:14,fontWeight:700,color:"#060A07",textAlign:"center",boxShadow:"0 12px 24px rgba(212,175,55,0.22)"}}>
                    Select your starting point
                  </div>
                </div>
              </div>
            );
            } catch(e) {
              return <div style={{flex:1,padding:"24px",background:"#060A07",color:"#E5534B",fontSize:11,fontFamily:"monospace",whiteSpace:"pre-wrap",overflowY:"auto"}}>
                ERROR IN STEP 4:{"\n"}{e?.message}{"\n\n"}{e?.stack}
              </div>;
            }
          })()}

        </div>
      )}

      {/* ── DAILY DUA MODAL (every launch, after onboarding) ── */}
      {!showOnboarding&&showDua&&(()=>{
        const DUAS=[
          {arabic:"رَبِّ زِدْنِي عِلْمًا",transliteration:"Rabbi zidni ilma",translation:"My Lord, increase me in knowledge.",source:"Surah Ta-Ha · 20:114"},
          {arabic:"رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",transliteration:"Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina adhaban-nar",translation:"Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",source:"Surah Al-Baqarah · 2:201"},
          {arabic:"رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً",transliteration:"Rabbana la tuzigh qulubana ba'da idh hadaytana wa hab lana min ladunka rahmah",translation:"Our Lord, do not let our hearts deviate after You have guided us, and grant us mercy from Yourself.",source:"Surah Aal-Imran · 3:8"},
          {arabic:"اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا",transliteration:"Allahumma inni as'aluka ilman nafi'an wa rizqan tayyiban wa amalan mutaqabbala",translation:"O Allah, I ask You for beneficial knowledge, pure provision, and accepted deeds.",source:"Morning Dua · Ibn Majah"},
          {arabic:"رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",transliteration:"Rabbi ishrah li sadri wa yassir li amri",translation:"My Lord, expand my chest and ease my affairs.",source:"Surah Ta-Ha · 20:25-26"},
          {arabic:"اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",transliteration:"Allahumma a'inni ala dhikrika wa shukrika wa husni ibadatik",translation:"O Allah, help me to remember You, to be grateful to You, and to worship You in an excellent manner.",source:"Abu Dawud · After every Salah"},
        ];
        const d=DUAS[duaIdx%DUAS.length];
        return (
          <div style={{position:"fixed",inset:0,background:dark?"linear-gradient(180deg,#04070A 0%,#0A1120 50%,#0C1526 100%)":"linear-gradient(180deg,#F7F0DC 0%,#EDE4CC 50%,#E8DCBE 100%)",zIndex:999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{position:"absolute",inset:0,pointerEvents:"none",background:dark?"radial-gradient(circle at 50% 0%,rgba(212,175,55,0.10),transparent 60%)":"radial-gradient(circle at 50% 0%,rgba(139,106,16,0.06),transparent 60%)"}}/>
            <div className="fi" style={{position:"relative",background:dark?"linear-gradient(180deg,rgba(15,20,32,0.97) 0%,rgba(9,13,22,0.99) 100%), radial-gradient(circle at 50% 30%,rgba(212,175,55,0.05),transparent 65%)":"linear-gradient(180deg,#D8CCB0 0%,#CCBFA3 100%)",border:dark?"1px solid rgba(212,175,55,0.20)":"1px solid rgba(139,106,16,0.18)",borderRadius:20,padding:"28px 24px",maxWidth:500,width:"100%",textAlign:"center",boxShadow:dark?"0 20px 50px rgba(0,0,0,0.45),0 0 30px rgba(212,175,55,0.08),inset 0 1px 0 rgba(212,175,55,0.10)":"0 10px 30px rgba(0,0,0,0.08),inset 0 1px 0 rgba(255,255,255,0.5)"}}>
              <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(20px,4.5vw,30px)",color:dark?"#F6E27A":"#2D2A26",direction:"rtl",lineHeight:1.8,marginBottom:20,textShadow:dark?"0 0 18px rgba(212,175,55,0.18)":"none"}}>
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
              </div>
              <div style={{fontSize:8,color:dark?"rgba(212,175,55,0.65)":"#6B645A",letterSpacing:".12em",textTransform:"uppercase",marginBottom:14,opacity:0.75}}>Begin With Dua</div>
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
      })()}

      {/* TOP BAR */}
      {activeTab!=="quran"&&activeTab!=="masjidayn"&&(
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"10px 16px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:8,color:T.accent,letterSpacing:".2em",textTransform:"uppercase",marginBottom:1}}>{localStorage.getItem("rihlat-username")||"Abdul Jalil"} · Hifz Journey</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:T.text}}>Al-Hifz · <span style={{fontSize:12,fontStyle:"italic",opacity:.7}}>Your journey to memorizing the Qur'an</span></div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            {nextJuz&&<div style={{textAlign:"right"}}><div style={{fontSize:12,color:"#8FA3B8",letterSpacing:"1px",marginBottom:1}}>Next Target</div><div style={{fontSize:11,color:T.sub}}>Juz {nextJuz.num}</div></div>}
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:34,fontWeight:700,color:"#F0C040",lineHeight:1}}>{pct}%</div>
              <div style={{fontSize:12,color:"#6B7280"}}>{memorizedAyahs} of {totalAyahsInQuran} ayahs</div>
              <div style={{height:3,width:60,background:T.surface2,borderRadius:2,overflow:"hidden",marginTop:2}}><div className="pbfill" style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#156A30,#F0C040)",borderRadius:2}}/></div>
            </div>
            <div className="sbtn" onClick={()=>setDark(d=>!d)} style={{padding:"5px 10px",background:T.surface2,border:`1px solid ${T.border}`,borderRadius:20,display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.dim}}>
              <span>{dark?"🌙":"☀️"}</span><span>{dark?"Dark":"Light"}</span>
            </div>
            <div className="sbtn" onClick={()=>setShowDua(true)} style={{width:28,height:28,borderRadius:"50%",background:T.accentDim,border:`1px solid ${T.accent}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🤲</div>
          </div>
        </div>
      </div>
      )}

      {/* TABS — fixed bottom bar with icons */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:80,background:dark?"rgba(8,10,18,0.97)":"#EADFC8",borderTop:`1px solid ${dark?"rgba(212,175,55,0.10)":"rgba(0,0,0,0.08)"}`,display:"flex",flexShrink:0,paddingBottom:"env(safe-area-inset-bottom,0px)",backdropFilter:"blur(10px)"}}>
        {[
          {id:"myhifz",  img:"/tab-hifz.jpg",   label:"My Hifz"},
          {id:"rihlah",  img:"/tab-rihlah.jpg",  label:"My Rihlah"},
          {id:"quran",   img:"/tab-quran.jpg",   label:"Al-Qur'an"},
          {id:"masjidayn",icon:"\uD83D\uDD4B",  label:"More"},
        ].map(t=>(
          <div key={t.id} className="ttab" onClick={()=>{setActiveTab(t.id);if(t.id==="rihlah")setRihlahTab("home");}} style={{flex:1,padding:"10px 4px 8px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            {t.img?(
              <div style={{width:38,height:38,borderRadius:9,overflow:"hidden",opacity:activeTab===t.id?1:0.65,transition:"all .15s",boxShadow:activeTab===t.id?"0 0 20px rgba(212,175,55,0.60), 0 0 8px rgba(212,175,55,0.35), 0 0 40px rgba(212,175,55,0.20)":"0 0 8px rgba(212,175,55,0.15)",border:activeTab===t.id?"1px solid rgba(212,175,55,0.50)":"1px solid rgba(212,175,55,0.10)"}}>
                <img src={t.img} alt={t.label} style={{width:"100%",height:"100%",objectFit:"cover",filter:activeTab===t.id?"brightness(1.3)":"brightness(0.85)"}}/>
              </div>
            ):(
              <span style={{fontSize:24,opacity:activeTab===t.id?1:0.55}}>{t.icon}</span>
            )}
            <span style={{fontSize:10,fontWeight:activeTab===t.id?700:400,color:activeTab===t.id?"#E6B84A":"#8A9098"}}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* ═══ TODAY SESSION ═══ */}
      {activeTab==="myhifz"&&(
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",position:"relative"}} className="fi gold-particles">

          {/* ── STICKY RECITER BUTTON ── */}
          <div style={{position:"sticky",top:0,zIndex:10,background:T.bg,paddingBottom:2}}>
            <div className="sbtn" onClick={()=>{setReciterMode("hifz");setShowReciterModal(true);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,margin:"0 0 0 0"}}>
              <div style={{fontSize:16}}>🎙️</div>
              <div style={{flex:1,textAlign:"center"}}>
                <div style={{fontSize:13,fontWeight:600,color:T.text,textAlign:"center"}}>{currentReciter.name}</div>
                <div style={{fontFamily:"'Amiri',serif",fontSize:12,color:"#9CA3AF",textAlign:"center"}}>{currentReciter.arabic}</div>
              </div>
              <div style={{fontSize:9,color:T.accent,background:T.accentDim,border:`1px solid ${T.accent}30`,padding:"4px 10px",fontSize:12,borderRadius:8}}>Selected ✓</div>
              <div style={{fontSize:12,color:T.dim}}>▼</div>
            </div>
          </div>

          <div style={{flex:1,padding:"10px 16px 64px"}}>

            {/* ── SESSION JUZ ROW ── */}
            <div className="sbtn" onClick={()=>setShowJuzModal(true)} style={{padding:"12px 14px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Session Juz · Juz {sessionJuz||""}</div>
                  <div style={{fontSize:12,color:T.sub}}>Progress: {sessionIdx} of {totalSV} ayahs</div>
                </div>
                <div style={{color:T.dim,fontSize:14}}>›</div>
              </div>
              <div style={{height:4,marginTop:6,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${totalSV>0?Math.round((sessionIdx/totalSV)*100):0}%`,background:"linear-gradient(90deg,#E6B84A,#F0C040)",borderRadius:999,transition:"width .5s"}}/>
              </div>
            </div>

            {/* ── CURRENT SESSION ── */}
            {(()=>{
              const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];
              if(!sess) return null;
              const sid=sess.id;
              const isDone=sessionsCompleted[sid];
              const hasStarted=batch.some(v=>(repCounts[v.verse_key]||0)>0);
              const dhuhrLocked=sid==="dhuhr"&&yesterdayBatch.length===0;

              const sessionLabel=(()=>{
                if(sid==="fajr") return isDone?"Fajr — Completed · Alhamdulillah":hasStarted?"Fajr — Continue your memorization":"Fajr — Start your new ayahs";
                if(sid==="dhuhr") return dhuhrLocked?"Complete Fajr to unlock review":"Dhuhr — Review what you learned";
                if(sid==="asr") return "Asr — Strengthen your memorization";
                if(sid==="maghrib") return "Maghrib — Review again for retention";
                if(sid==="isha") return "Isha — Lock in today's memorization";
                return `${sess.time} — ${sess.title}`;
              })();

              const microGuide=(()=>{
                if(isDone) return null;
                if(sid==="fajr") return "Repeat each ayah until it sticks";
                if(sid==="dhuhr") return dhuhrLocked?null:"Go over what you memorized earlier";
                if(sid==="asr") return "Cycle through completed sections";
                if(sid==="maghrib") return "Listen carefully and follow along";
                if(sid==="isha") return "Recite everything one final time";
                return null;
              })();

              return (
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:8,color:"rgba(230,184,74,0.40)",letterSpacing:".18em",textTransform:"uppercase",marginBottom:5}}>Current Session</div>
                  <div style={{padding:"11px 14px",
                    background:dark?"linear-gradient(180deg,rgba(15,26,43,0.95) 0%,rgba(12,21,38,0.98) 100%)":"#EADFC8",
                    border:`1px solid ${isDone?"rgba(74,222,128,0.20)":(dark?"rgba(230,184,74,0.18)":"rgba(0,0,0,0.18)")}`,borderLeft:`3px solid ${isDone?"#4ADE80":(dark?"#E6B84A":"#B83A1A")}`,borderRadius:"0 10px 10px 0",
                    boxShadow:dark?"0 4px 16px rgba(0,0,0,0.20),0 0 12px rgba(230,184,74,0.06)":"0 2px 8px rgba(0,0,0,0.06)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:700,color:isDone?"#4ADE80":(dark?"#F0E6D0":"#2D2A26")}}>{sessionLabel}</div>
                      </div>
                      <div style={{fontSize:12,color:dark?"rgba(230,184,74,0.60)":"#6B645A",fontFamily:"'IBM Plex Mono',monospace"}}>{isDone?"✓":batch.filter(v=>repCounts[v.verse_key]>=20).length} of {batch.length||dailyNew}</div>
                    </div>
                    {microGuide&&<div style={{fontSize:11,color:dark?"rgba(243,231,200,0.35)":"#6B645A",marginTop:5}}>{microGuide}</div>}
                  </div>
                </div>
              );
            })()}

            {/* ── ASR EMPTY STATE — shown when auto-pool has nothing ── */}
            {SESSIONS[activeSessionIndex]?.id==="asr"&&!sessLoading&&!asrStarted&&batch.length===0&&!asrIsCustomized&&(
              <div className="fi" style={{position:"fixed",inset:0,zIndex:90,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:dark?"linear-gradient(180deg,#060C18 0%,#040814 100%)":"#F3E9D2",padding:"32px 24px"}}>
                <div style={{fontSize:36,marginBottom:16}}>📖</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#F3E7C8",fontWeight:700,textAlign:"center",marginBottom:10}}>Nothing to review yet</div>
                <div style={{fontSize:13,color:"rgba(243,231,200,0.45)",textAlign:"center",lineHeight:1.8,maxWidth:280,marginBottom:28}}>
                  Complete a surah or a full juz to unlock Asr review.
                </div>
                <div className="sbtn" onClick={()=>setAsrIsCustomized(true)}
                  style={{padding:"12px 28px",borderRadius:14,border:"1px solid rgba(217,177,95,0.30)",color:"rgba(217,177,95,0.80)",fontSize:12,fontWeight:700,letterSpacing:".10em",textTransform:"uppercase",marginBottom:14}}>
                  Customize Review
                </div>
                <div className="sbtn" onClick={()=>{const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];setSessionsCompleted(prev=>({...prev,[sess.id]:true}));toggleCheck(sess.id);setActiveSessionIndex(i=>Math.min(SESSIONS.length-1,i+1));}}
                  style={{fontSize:11,color:"rgba(243,231,200,0.25)",letterSpacing:".08em"}}>
                  Skip for now ›
                </div>
              </div>
            )}

            {/* ── ASR PICKER — shown only when customizing ── */}
            {SESSIONS[activeSessionIndex]?.id==="asr"&&asrIsCustomized&&(()=>{
              const activeJuz=asrActiveJuzPanel||(completedJuzOptions.length>0?completedJuzOptions[0].num:null);
              const activeJuzSurahs=activeJuz?(JUZ_SURAHS[activeJuz]||[]).filter(s=>isSurahComplete(s.s)||v9IsJuzComplete(activeJuz)):[];
              const isJuzSelected=asrSelectedJuz.includes(activeJuz);
              return (
              <div className="fi" style={{position:"fixed",inset:0,zIndex:90,display:"flex",flexDirection:"column",background:dark?"radial-gradient(circle at 50% 10%,rgba(44,72,130,0.12) 0%,rgba(44,72,130,0.04) 18%,rgba(0,0,0,0) 42%),linear-gradient(180deg,#060C18 0%,#040814 100%)":"#F3E9D2",overflowY:"auto",padding:"32px 20px 40px"}}>

                {/* Header */}
                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:4}}>
                  <div className="sbtn" onClick={()=>{const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];setSessionsCompleted(prev=>({...prev,[sess.id]:true}));toggleCheck(sess.id);setActiveSessionIndex(i=>Math.min(SESSIONS.length-1,i+1));}} style={{padding:"6px 12px",fontSize:20,color:"rgba(232,200,120,0.40)",lineHeight:1}}>×</div>
                </div>
                <div style={{textAlign:"center",marginBottom:8}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:"#F3E7C8",fontWeight:700,fontStyle:"italic",marginBottom:6}}>Customize Asr Review</div>
                  <div style={{fontSize:13,color:"rgba(243,231,200,0.45)"}}>Override the recommended set for this session.</div>
                </div>

                {/* ── SELECT JUZ ── */}
                <div style={{display:"flex",alignItems:"center",gap:12,margin:"20px 0 14px"}}>
                  <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.50) 100%)"}}/>
                  <div style={{fontSize:9,color:"rgba(217,177,95,0.70)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600,whiteSpace:"nowrap"}}>Select Juz</div>
                  <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(232,200,120,0.50) 0%,rgba(217,177,95,0) 100%)"}}/>
                </div>

                {completedJuzOptions.length===0?(
                  <div style={{textAlign:"center",fontSize:12,color:"rgba(243,231,200,0.40)",marginBottom:16}}>No completed Juz yet</div>
                ):(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4}}>
                    {completedJuzOptions.map(j=>{
                      const isSel=j.num===activeJuz;
                      const hasSelections=asrSelectedJuz.includes(j.num)||(JUZ_SURAHS[j.num]||[]).some(s=>asrSelectedSurahs.includes(s.s));
                      return (
                        <div key={j.num} className="sbtn" onClick={()=>{setAsrActiveJuzPanel(j.num);setAsrSurahShowCount(10);}}
                          style={{padding:"13px 16px",borderRadius:14,textAlign:"center",
                            background:isSel?"rgba(217,177,95,0.12)":"rgba(255,255,255,0.03)",
                            border:`1px solid ${isSel?"rgba(232,200,120,0.65)":hasSelections?"rgba(217,177,95,0.35)":"rgba(217,177,95,0.12)"}`,
                            boxShadow:isSel?"0 0 28px rgba(232,200,120,0.30),0 0 8px rgba(217,177,95,0.20),inset 0 0 14px rgba(217,177,95,0.08)":"none",
                            transition:"all .18s"}}>
                          <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:isSel?"#F6E27A":hasSelections?"#E2BC72":"rgba(243,231,200,0.70)",fontWeight:600}}>Juz {j.num}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── SURAHS IN JUZ ── */}
                {activeJuz&&activeJuzSurahs.length>0&&(()=>{
                  const visibleSurahs=activeJuzSurahs.slice(0,asrSurahShowCount);
                  const hasMore=activeJuzSurahs.length>asrSurahShowCount;
                  return (<>
                  <div style={{display:"flex",alignItems:"center",gap:12,margin:"18px 0 10px"}}>
                    <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.50) 100%)"}}/>
                    <div style={{fontSize:9,color:"rgba(217,177,95,0.70)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600,whiteSpace:"nowrap"}}>Surahs in Juz {activeJuz}</div>
                    <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(232,200,120,0.50) 0%,rgba(217,177,95,0) 100%)"}}/>
                  </div>

                  {/* Select All — control row */}
                  <div className="sbtn" onClick={()=>loadAsrJuzReview(activeJuz)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"4px 4px",marginBottom:6}}>
                    <div style={{width:15,height:15,borderRadius:3,background:isJuzSelected?"linear-gradient(135deg,#D4AF37,#F6E27A)":"transparent",border:`1.5px solid ${isJuzSelected?"#D4AF37":"rgba(212,175,55,0.30)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#060A07",fontWeight:700,flexShrink:0}}>{isJuzSelected?"✓":""}</div>
                    <div style={{fontSize:11,color:isJuzSelected?"rgba(217,177,95,0.85)":"rgba(217,177,95,0.50)",fontWeight:500}}>Select all</div>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:4}}>
                    {visibleSurahs.map(s=>{
                      const checked=asrSelectedSurahs.includes(s.s)||isJuzSelected;
                      return (
                        <div key={s.s} className="asr-surah-btn sbtn" onClick={()=>{ if(!isJuzSelected) toggleAsrSurahReview(s.s); }}
                          style={{padding:"10px 14px",borderRadius:12,textAlign:"center",
                            background:checked?"rgba(217,177,95,0.10)":"rgba(255,255,255,0.03)",
                            border:`1px solid ${checked?"rgba(232,200,120,0.55)":"rgba(255,255,255,0.05)"}`,
                            boxShadow:checked?"0 0 22px rgba(217,177,95,0.20),0 0 6px rgba(217,177,95,0.12),inset 0 0 10px rgba(217,177,95,0.05)":"none"}}>
                          <div style={{fontSize:13,color:checked?"#F6E27A":"rgba(243,231,200,0.65)",fontWeight:checked?600:400}}>{s.name}</div>
                        </div>
                      );
                    })}
                  </div>

                  {hasMore&&(
                    <div className="sbtn" onClick={()=>setAsrSurahShowCount(c=>c+10)}
                      style={{textAlign:"center",padding:"8px",marginTop:8,borderRadius:8,fontSize:11,fontWeight:500,
                        color:"rgba(217,177,95,0.40)",letterSpacing:".03em",
                        border:"1px dashed rgba(217,177,95,0.10)",background:"transparent"}}>
                      Load more · {activeJuzSurahs.length-asrSurahShowCount} remaining
                    </div>
                  )}
                </>);})()}

                {/* Summary */}
                <div style={{textAlign:"center",margin:"18px 0 0",minHeight:20}}>
                  {asrSelectionSummary
                    ?<div style={{fontSize:13,color:"rgba(243,231,200,0.65)"}}><span style={{fontSize:10,color:"rgba(243,231,200,0.28)",letterSpacing:".08em",textTransform:"uppercase"}}>Selected:</span><br/><span style={{color:"#F6E27A",fontWeight:700,textShadow:"0 0 12px rgba(217,177,95,0.20)"}}>{asrSelectionSummary}</span></div>
                    :<div style={{fontSize:12,color:"rgba(243,231,200,0.30)"}}>Select a Juz or individual surahs to begin</div>
                  }
                </div>

                {/* CTA */}
                <div className="sbtn" onClick={()=>{if(!asrCanStart)return;setAsrStarted(true);setAsrPage(0);setAsrExpandedAyah(null);}}
                  style={{width:"100%",marginTop:16,padding:"16px",borderRadius:18,textAlign:"center",fontSize:15,fontWeight:800,letterSpacing:".04em",
                    background:asrCanStart?"linear-gradient(180deg,#E3C07A 0%,#D1A659 100%)":"rgba(255,255,255,0.05)",
                    color:asrCanStart?"#0A1020":"rgba(255,255,255,0.25)",
                    boxShadow:asrCanStart?"0 10px 22px rgba(210,168,90,0.22),inset 0 1px 0 rgba(255,255,255,0.14)":"none",
                    border:asrCanStart?"none":"1px solid rgba(255,255,255,0.06)",
                    pointerEvents:asrCanStart?"auto":"none"}}>
                  Start Custom Review
                </div>
              </div>
              );
            })()}


            {/* ── LOADING / ERROR STATES ── */}
            {sessLoading&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:40,gap:12}}><div className="spin" style={{width:26,height:26,border:`2px solid ${T.border}`,borderTopColor:"#F0C040",borderRadius:"50%"}}/><div style={{fontSize:12,color:T.dim}}>Loading ayahs...</div></div>}
            {!sessLoading&&sessError&&(
              <div style={{background:dark?"linear-gradient(180deg,#0F1A2B 0%,#0C1526 100%)":"#EADFC8",border:dark?"1px solid rgba(230,184,74,0.10)":"1px solid rgba(139,106,16,0.15)",borderRadius:20,boxShadow:"0 10px 28px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.03)",padding:"30px 22px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center"}}>
                <div style={{width:74,height:74,borderRadius:"50%",background:"rgba(230,184,74,0.08)",border:"1px solid rgba(230,184,74,0.12)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18,boxShadow:"0 0 10px rgba(230,184,74,0.10)",fontSize:30}}>📖</div>
                <div style={{fontSize:20,fontWeight:700,color:"#F8FAFC",marginBottom:10}}>Unable to load ayahs</div>
                <div style={{fontSize:14,lineHeight:1.7,color:"rgba(255,255,255,0.60)",maxWidth:320,marginBottom:22}}>Please check your connection and try again.</div>
                <div className="sbtn" onClick={()=>setSessionJuz(n=>n)} style={{background:"linear-gradient(180deg,#F0C040 0%,#D89A10 100%)",color:"#0B1220",border:"none",borderRadius:14,padding:"12px 28px",fontWeight:700,fontSize:16,boxShadow:"0 6px 14px rgba(240,192,64,0.14)",cursor:"pointer"}}>Retry</div>
              </div>
            )}

            {/* ── AYAH BATCH ── */}
            {!sessLoading&&batch.length>0&&!isAsr&&(
              <div>
                {/* Batch header */}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase"}}>{currentSessionId==="fajr"?"Fajr":currentSessionId==="dhuhr"?"Dhuhr Review":currentSessionId==="asr"?"Asr Review":currentSessionId==="maghrib"?"Listening":"Isha Review"} — Ayah Batch</div>
                </div>

                {/* No per-ayah audio warning */}
                {!hasPerAyah(reciter)&&(
                  <div style={{marginBottom:10,padding:"8px 12px",background:T.surface,border:`1px solid ${T.accent}30`,borderLeft:`3px solid ${T.accent}`,borderRadius:"0 6px 6px 0",fontSize:11,color:T.sub}}>
                    🎵 <strong style={{color:T.accent}}>{currentReciter.name}</strong> — full surah only. Switch reciter for per-ayah audio.
                  </div>
                )}

                {/* ── AYAH ROWS (5 per page, swipeable) ── */}
                {(()=>{
                  const APS=5;
                  const aPages=Math.max(1,Math.ceil(batch.length/APS));
                  const aSafe=Math.min(ayahPage,aPages-1);
                  const aStart=aSafe*APS;
                  const aEnd=Math.min(aStart+APS,batch.length);
                  const pageAyahs=batch.slice(aStart,aEnd);
                  return (
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}
                  onTouchStart={e=>{touchStartRef.current=e.touches[0].clientX;}}
                  onTouchEnd={e=>{const dx=e.changedTouches[0].clientX-touchStartRef.current;if(dx>40&&aSafe<aPages-1)setAyahPage(p=>p+1);else if(dx<-40&&aSafe>0)setAyahPage(p=>p-1);}}>
                  {pageAyahs.map((v,i)=>{
                    const sNum=v.surah_number||parseInt(v.verse_key?.split(":")?.[0]);
                    const vKey=v.verse_key;
                    const reps=repCounts[vKey]||0;
                    const repsDone=reps>=20;

                    return (
                      <div key={vKey} className="sbtn" onClick={()=>{setOpenAyah(vKey);fetchTranslations([v]);}}
                        style={{borderRadius:14,padding:"12px 14px",background:dark?"#0F1A2B":"#EADFC8",border:`1px solid ${repsDone?"rgba(230,184,74,0.35)":"rgba(230,184,74,0.08)"}`,boxShadow:repsDone?"0 0 14px rgba(230,184,74,0.10)":"0 2px 8px rgba(0,0,0,0.20)",transition:"all .15s"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                          <div style={{width:28,height:28,borderRadius:"50%",background:repsDone?"rgba(230,184,74,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${repsDone?"rgba(230,184,74,0.45)":"rgba(255,255,255,0.08)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:repsDone?"#E6B84A":"#888",flexShrink:0}}>
                            {repsDone?"✓":aStart+i+1}
                          </div>
                          <span style={{flex:1,fontSize:12,color:"#9CA3AF"}}>{SURAH_EN[sNum]} · {vKey}</span>
                          <span style={{fontSize:11,color:repsDone?"#2ECC71":reps>0?"#E6B84A":"rgba(255,255,255,0.25)",fontFamily:"'IBM Plex Mono',monospace"}}>{reps} of 20 Repetitions</span>
                          <span style={{fontSize:12,color:"rgba(255,255,255,0.18)"}}>›</span>
                        </div>
                        <div style={{fontFamily:"'Amiri',serif",fontSize:20,color:"rgba(255,255,255,0.88)",direction:"rtl",textAlign:"right",lineHeight:1.7,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {v.text_uthmani}
                        </div>
                      </div>
                    );
                  })}
                  {aPages>1&&(
                    <div style={{textAlign:"center",fontSize:10,color:"rgba(230,184,74,0.35)",marginTop:4}}>
                      Page {aSafe+1} of {aPages}
                    </div>
                  )}
                </div>);})()}

                {/* ── AYAH POPUP MODAL (all non-ASR sessions) ── */}
                {currentSessionId!=="asr"&&openAyah&&(()=>{
                  const mv=batch.find(v=>v.verse_key===openAyah);
                  if(!mv) return null;
                  const mvKey=mv.verse_key;
                  const mvSurah=mv.surah_number||parseInt(mvKey.split(":")[0],10);
                  const mvAyah=mvKey.split(":")[1];
                  const mvTrans=translations[mvKey];
                  const mvPlaying=playingKey===mvKey;
                  const mvLoading=audioLoading===mvKey;
                  const mvReps=repCounts[mvKey]||0;
                  const mvRepsDone=mvReps>=20;
                  const mvPct=Math.min((mvReps/20)*100,100);
                  return (
                    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",background:"rgba(0,0,0,0.70)",backdropFilter:"blur(6px)"}} onClick={()=>setOpenAyah(null)}>
                      <div className="fi" style={{position:"relative",width:"100%",maxWidth:400,maxHeight:"85vh",overflowY:"auto",borderRadius:24,padding:"28px 22px 22px",background:dark?"radial-gradient(circle at 50% 0%,rgba(58,92,165,0.10) 0%,rgba(0,0,0,0) 40%),linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",border:"1px solid rgba(217,177,95,0.15)",boxShadow:"0 24px 60px rgba(0,0,0,0.50),0 0 30px rgba(217,177,95,0.06)"}} onClick={e=>e.stopPropagation()}>
                        <div className="sbtn" onClick={()=>setOpenAyah(null)} style={{position:"absolute",top:14,right:18,fontSize:18,color:"rgba(243,231,200,0.30)"}}>×</div>
                        {/* Arabic */}
                        <div style={{direction:"rtl",textAlign:"center",fontFamily:"'Amiri Quran','Amiri',serif",fontSize:26,lineHeight:2,color:"#F3E7C8",marginBottom:16}}>
                          {mv.text_uthmani}
                        </div>
                        {/* Reference */}
                        <div style={{textAlign:"center",fontSize:12,color:"rgba(243,231,200,0.45)",marginBottom:20}}>
                          Ayah {mvAyah} of Surah {SURAH_EN[mvSurah]||mvSurah}
                        </div>
                        {/* Translation */}
                        <div style={{color:"rgba(243,231,200,0.78)",fontSize:14,lineHeight:1.8,textAlign:"center",marginBottom:18}}>
                          {mvTrans===undefined?<span style={{color:"rgba(243,231,200,0.42)"}}>Loading...</span>:mvTrans||<span style={{color:"rgba(243,231,200,0.42)"}}>Translation unavailable</span>}
                        </div>
                        {/* Audio controls */}
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16}}>
                          <div className="sbtn" onClick={()=>hasPerAyah(reciter)?playAyah(mvKey,mvKey):null} style={{width:56,height:56,borderRadius:"50%",background:dark?(mvPlaying?"radial-gradient(circle at 50% 40%,rgba(212,175,55,0.12),rgba(12,20,34,0.95))":"radial-gradient(circle at 50% 40%,rgba(212,175,55,0.06),rgba(12,20,34,0.95))"):(mvPlaying?"radial-gradient(circle at 50% 40%,rgba(139,106,16,0.10),rgba(228,216,184,0.95))":"radial-gradient(circle at 50% 40%,rgba(139,106,16,0.04),rgba(228,216,184,0.95))"),border:`1.5px solid ${mvPlaying?"rgba(212,175,55,0.40)":"rgba(212,175,55,0.30)"}`,boxShadow:"0 0 12px rgba(212,175,55,0.18), 0 4px 14px rgba(0,0,0,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:mvPlaying?(dark?"#F0C040":"#6B645A"):(dark?"rgba(243,231,200,0.75)":"#5A4A20"),opacity:hasPerAyah(reciter)?1:0.4}}>
                            {mvLoading?<div className="spin" style={{width:14,height:14,border:"2px solid rgba(212,175,55,0.3)",borderTopColor:"#D4AF37",borderRadius:"50%"}}/>:(mvPlaying?"⏸":"▶")}
                          </div>
                          <div className="sbtn" onClick={()=>{setLooping(l=>{const next=!l;if(audioRef.current)audioRef.current.loop=next;return next;});}} style={{width:56,height:56,borderRadius:"50%",background:dark?(looping?"radial-gradient(circle at 50% 40%,rgba(212,175,55,0.12),rgba(12,20,34,0.95))":"radial-gradient(circle at 50% 40%,rgba(212,175,55,0.06),rgba(12,20,34,0.95))"):(looping?"radial-gradient(circle at 50% 40%,rgba(139,106,16,0.10),rgba(228,216,184,0.95))":"radial-gradient(circle at 50% 40%,rgba(139,106,16,0.04),rgba(228,216,184,0.95))"),border:`1.5px solid ${looping?"rgba(212,175,55,0.40)":"rgba(212,175,55,0.30)"}`,boxShadow:"0 0 12px rgba(212,175,55,0.18), 0 4px 14px rgba(0,0,0,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:looping?(dark?"#F0C040":"#6B645A"):(dark?"rgba(243,231,200,0.75)":"#5A4A20")}}>🔁</div>
                        </div>
                        {/* Rep counter */}
                        <div className={mvRepsDone?"rep-done-glow":""} onClick={()=>{setRepCounts(prev=>{const newCount=Math.min(20,(prev[mvKey]||0)+1);if(newCount>=20&&!completedAyahs.has(mvKey)){setCompletedAyahs(ca=>{const next=new Set(ca);next.add(mvKey);saveCompletedAyahs(next);return next;});}return{...prev,[mvKey]:newCount};});}}
                          style={{width:"100%",padding:"14px",borderRadius:14,textAlign:"center",cursor:"pointer",transition:"all .3s ease",
                            background:dark?(mvRepsDone?"rgba(212,175,55,0.10)":"rgba(212,175,55,0.04)"):(mvRepsDone?"rgba(0,0,0,0.08)":"rgba(0,0,0,0.03)"),
                            border:`1.5px solid ${mvRepsDone?"rgba(212,175,55,0.45)":"rgba(212,175,55,0.25)"}`,
                            boxShadow:mvRepsDone?"0 0 16px rgba(212,175,55,0.20), 0 4px 14px rgba(0,0,0,0.15)":"0 0 12px rgba(212,175,55,0.12), 0 4px 14px rgba(0,0,0,0.10)"}}>
                          {mvRepsDone?(
                            <div style={{fontSize:13,fontWeight:700,color:"#E6B84A"}}>✓ 20/20 Complete — MashaAllah!</div>
                          ):(
                            <div>
                              <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.7)",marginBottom:8}}>Repeat <span style={{color:"#F0C040",fontWeight:700,transition:"all .2s"}}>{mvReps}/20</span></div>
                              <div style={{width:"100%",height:5,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                                <div style={{width:`${mvPct}%`,height:"100%",borderRadius:999,background:mvPct>=100?"linear-gradient(90deg,#D4AF37,#F6E27A)":"linear-gradient(90deg,rgba(220,90,90,0.85) 0%,rgba(224,178,66,0.9) 55%,rgba(56,214,126,0.9) 100%)",transition:"width 0.4s cubic-bezier(.4,0,.2,1)"}}/>
                              </div>
                            </div>
                          )}
                        </div>
                        {mvReps>0&&<div className="sbtn" onClick={()=>setRepCounts(prev=>({...prev,[mvKey]:0}))} style={{textAlign:"center",fontSize:10,color:"rgba(255,255,255,0.2)",marginTop:8}}>Restart</div>}
                      </div>
                    </div>
                  );
                })()}

                {/* ── BATCH DONE ── */}
                {bDone?(
                  <div style={{textAlign:"center",padding:"20px",background:T.surface,border:"1px solid #F0C04030",borderRadius:8}}>
                    <div style={{fontSize:22,marginBottom:8}}>✅</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:"#F0C040",marginBottom:4}}>Batch Complete — MashaAllah!</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.45)"}}>Session complete — MashaAllah! 🤲</div>
                  </div>
                ):(()=>{
                  const batchPages=Math.max(1,Math.ceil(batch.length/5));
                  const onLastPage=ayahPage>=batchPages-1;
                  const isFinal=onLastPage;
                  return (<div>
                  <div className="sbtn" onClick={()=>{
                    if(!onLastPage){
                      // Not on last page — advance to next batch of ayahs
                      setAyahPage(p=>p+1);
                      // V9: add current page's ayahs to completedAyahs
                      const pageSize=5;
                      const pageStart2=ayahPage*pageSize;
                      const pageEnd2=Math.min(pageStart2+pageSize,batch.length);
                      setCompletedAyahs(prev=>{const next=new Set(prev);batch.slice(pageStart2,pageEnd2).forEach(v=>{if(v.verse_key)next.add(v.verse_key);});saveCompletedAyahs(next);return next;});
                      return;
                    }
                    // On last page — complete the session + add last page ayahs to V9
                    {const ps=5;const ps2=ayahPage*ps;const pe2=Math.min(ps2+ps,batch.length);
                    setCompletedAyahs(prev=>{const next=new Set(prev);batch.slice(ps2,pe2).forEach(v=>{if(v.verse_key)next.add(v.verse_key);});saveCompletedAyahs(next);return next;});}
                    const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];
                    setSessionsCompleted(prev=>({...prev,[sess.id]:true}));
                    toggleCheck(sess.id);
                    setRepCounts({});
                    setOpenAyah(null);
                    setAyahPage(0);
                    if(activeSessionIndex>=SESSIONS.length-1){
                      setYesterdayBatch(fajrBatch);
                      if(bEnd>=totalSV&&totalSV>0&&sessionJuz){
                        setSessionIdx(totalSV);
                        setJuzProgress(prev=>({...prev,[sessionJuz]:totalSV}));
                        setJuzStatus(prev=>markJuzAndSurahsComplete(prev,sessionJuz));
                        setJuzCompletedInSession(prev=>new Set([...prev,sessionJuz]));
                        v9MarkJuzComplete(sessionJuz); // V9
                        setSessionJuz(null);
                      } else if(sessionJuz) {
                        setSessionIdx(bEnd);
                        setJuzProgress(prev=>({...prev,[sessionJuz]:bEnd}));
                        // V9: add all completed ayahs up to bEnd + mark completed surahs
                        setCompletedAyahs(prev=>{const next=new Set(prev);sessionVerses.slice(0,bEnd).forEach(v=>{if(v.verse_key)next.add(v.verse_key);});saveCompletedAyahs(next);return next;});
                        // Mark completed surahs in V9
                        const surahCounts={};const surahTotals={};
                        sessionVerses.forEach(v=>{const sn=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);surahTotals[sn]=(surahTotals[sn]||0)+1;});
                        let cursor=0;const surahOrder=[];
                        sessionVerses.forEach(v=>{const sn=v.surah_number||parseInt(v.verse_key?.split(":")?.[0],10);if(!surahOrder.includes(sn))surahOrder.push(sn);});
                        for(const sn of surahOrder){const count=surahTotals[sn]||0;if(cursor+count<=bEnd)v9MarkSurahComplete(sn);cursor+=count;}
                      }
                      setActiveSessionIndex(0);
                      setSessionsCompleted({fajr:false,dhuhr:false,asr:false,maghrib:false,isha:false});
                    } else {
                      setActiveSessionIndex(i=>i+1);
                    }
                  }} style={{width:"100%",padding:"14px",borderRadius:12,fontSize:14,fontWeight:700,textAlign:"center",transition:"all .2s",
                    background:"linear-gradient(180deg,#E6B84A,#D4A62A)",
                    color:"#0B1220",
                    boxShadow:"0 6px 18px rgba(230,184,74,0.30),0 0 14px rgba(230,184,74,0.15)"}}>
                    {isFinal?"Complete Session":"Next →"}
                  </div>
                  {!isFinal&&<div style={{textAlign:"center",fontSize:10,color:"rgba(243,231,200,0.28)",marginTop:6}}>{ayahPage+1} of {batchPages} · keep going</div>}
                  </div>);
                })()}
              </div>
            )}

            {/* ── JUZ COMPLETE ── */}
            {!sessLoading&&currentSessionId==="dhuhr"&&batch.length===0&&(
              <div style={{padding:"16px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:6}}>No Dhuhr review batch yet</div>
                <div style={{fontSize:11,color:T.sub,lineHeight:1.6,marginBottom:12}}>Complete a full day through Isha so tomorrow's Dhuhr can review the previous Fajr batch.</div>
                <div className="sbtn" onClick={()=>{
                  const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];
                  setSessionsCompleted(prev=>({...prev,[sess.id]:true}));
                  toggleCheck(sess.id);
                  setRepCounts({});
                  setOpenAyah(null);
                  setActiveSessionIndex(i=>i+1);
                }} style={{width:"100%",padding:"14px",background:"linear-gradient(180deg,#E6B84A,#D4A62A)",borderRadius:12,fontSize:14,fontWeight:700,color:"#0B1220",textAlign:"center",boxShadow:"0 6px 14px rgba(230,184,74,0.2)"}}>
                  Complete Dhuhr Revision
                </div>
              </div>
            )}

            {!sessLoading&&currentSessionId==="fajr"&&batch.length===0&&totalSV>0&&juzCompletedInSession.has(sessionJuz)&&(
              <div style={{textAlign:"center",paddingTop:40}}>
                <div style={{fontSize:26,marginBottom:10}}>🎉</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:T.accent,marginBottom:6}}>Juz {sessionJuz} Complete — Alhamdulillah!</div>
                <div style={{fontSize:13,color:T.sub}}>Select the next Juz above to continue.</div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ═══ MY RIHLAH — PROFILE HOME ═══ */}
      {activeTab==="rihlah"&&rihlahTab==="home"&&(()=>{
        const username=localStorage.getItem("rihlat-username")||"Abdul Jalil";
        const initials=username.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
        const joinYear=2025;
        const goalLabel=goalYears<=1?"1-Year Hafiz":goalYears<=3?"3-Year Hafiz":"Long-Term Hafiz";
        const radius=52, circ=2*Math.PI*radius;
        const filled=circ*(pct/100);
        const activeSess=SESSIONS.find(s=>!dailyChecks[s.id])||SESSIONS[SESSIONS.length-1];
        const activeDone=!!dailyChecks[activeSess.id];
        const activeSteps=activeSess?.steps||[];

        // ── Enhanced Badge Components ──
        const JuzBadge=({count,earned})=>(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",opacity:earned?1:0.15,filter:earned?"none":"grayscale(0.8)",background:earned?"rgba(212,175,55,0.06)":"transparent",borderRadius:16,padding:"12px",boxShadow:earned?"0 0 18px rgba(212,175,55,0.22)":"none"}}>
            <div style={{position:"relative",width:52,height:52,marginBottom:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {earned&&<div style={{position:"absolute",inset:0,borderRadius:"50%",background:"rgba(52,211,153,0.2)",filter:"blur(6px)"}}/>}
              <div style={{position:"relative",width:52,height:52,borderRadius:"50%",background:"linear-gradient(180deg,#34D399 0%,#059669 50%,#064E3B 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:"1.5px solid rgba(110,231,183,0.4)"}}>
                <span style={{fontSize:18,fontWeight:700,color:"#fff",lineHeight:1,position:"relative",zIndex:1}}>{count}</span>
                <span style={{fontSize:8,fontWeight:600,color:"rgba(167,243,208,0.9)",position:"relative",zIndex:1}}>Juz</span>
              </div>
            </div>
            <div style={{fontSize:9,fontWeight:700,color:earned?"rgba(255,255,255,0.88)":"rgba(255,255,255,0.18)",textAlign:"center"}}>{count} Juz Memorized</div>
          </div>
        );
        const HabituatedBadge=({earned})=>(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,opacity:earned?1:0.15,filter:earned?"none":"grayscale(0.8)",background:earned?"rgba(245,158,11,0.06)":"transparent",borderRadius:16,padding:"12px",boxShadow:earned?"0 0 18px rgba(245,158,11,0.2)":"none"}}>
            <svg viewBox="0 0 64 64" style={{width:48,height:48,filter:earned?"drop-shadow(0 2px 8px rgba(245,158,11,0.4))":"none"}}>
              <defs><linearGradient id="hg1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#FCD34D"/><stop offset="50%" stopColor="#F59E0B"/><stop offset="100%" stopColor="#B45309"/></linearGradient></defs>
              <path d="M20 50 Q15 40 18 32 Q12 35 10 28 Q15 28 18 25 Q12 22 12 15 Q18 18 22 18 Q20 12 24 8 Q26 14 28 18 Q28 12 32 10" fill="none" stroke="url(#hg1)" strokeWidth="3" strokeLinecap="round"/>
              <path d="M44 50 Q49 40 46 32 Q52 35 54 28 Q49 28 46 25 Q52 22 52 15 Q46 18 42 18 Q44 12 40 8 Q38 14 36 18 Q36 12 32 10" fill="none" stroke="url(#hg1)" strokeWidth="3" strokeLinecap="round"/>
              <ellipse cx="14" cy="30" rx="4" ry="2" fill="url(#hg1)" transform="rotate(-30 14 30)"/><ellipse cx="16" cy="22" rx="4" ry="2" fill="url(#hg1)" transform="rotate(-45 16 22)"/><ellipse cx="22" cy="15" rx="4" ry="2" fill="url(#hg1)" transform="rotate(-60 22 15)"/><ellipse cx="18" cy="38" rx="4" ry="2" fill="url(#hg1)" transform="rotate(-15 18 38)"/><ellipse cx="50" cy="30" rx="4" ry="2" fill="url(#hg1)" transform="rotate(30 50 30)"/><ellipse cx="48" cy="22" rx="4" ry="2" fill="url(#hg1)" transform="rotate(45 48 22)"/><ellipse cx="42" cy="15" rx="4" ry="2" fill="url(#hg1)" transform="rotate(60 42 15)"/><ellipse cx="46" cy="38" rx="4" ry="2" fill="url(#hg1)" transform="rotate(15 46 38)"/>
            </svg>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.5)",fontWeight:500,letterSpacing:".02em"}}>Habituated</span>
          </div>
        );
        const StreakBadge=({earned})=>(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,opacity:earned?1:0.15,filter:earned?"none":"grayscale(0.8)",background:earned?"rgba(249,115,22,0.06)":"transparent",borderRadius:16,padding:"12px",boxShadow:earned?"0 0 18px rgba(249,115,22,0.2)":"none"}}>
            <svg viewBox="0 0 24 24" style={{width:48,height:48,filter:earned?"drop-shadow(0 2px 10px rgba(249,115,22,0.5))":"none"}}>
              <defs><linearGradient id="fg1" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#DC2626"/><stop offset="40%" stopColor="#F97316"/><stop offset="80%" stopColor="#FBBF24"/><stop offset="100%" stopColor="#FEF08A"/></linearGradient></defs>
              <path d="M12 2C10 6 6 8 6 13C6 16.5 8.5 19 12 19C15.5 19 18 16.5 18 13C18 8 14 6 12 2ZM12 17C10.5 17 9 15.5 9 14C9 12 10 11 12 9C14 11 15 12 15 14C15 15.5 13.5 17 12 17Z" fill="url(#fg1)"/>
            </svg>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.5)",fontWeight:500,letterSpacing:".02em"}}>7 Day Streak</span>
          </div>
        );
        const HifzGoalBadge=({earned})=>(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",opacity:earned?1:0.15,filter:earned?"none":"grayscale(0.8)"}}>
            <div style={{position:"relative",width:64,height:64,marginBottom:4,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {earned&&<div style={{position:"absolute",inset:0,background:"rgba(245,158,11,0.2)",filter:"blur(8px)"}}/>}
              <svg viewBox="0 0 64 64" style={{width:56,height:56,position:"relative",zIndex:1,filter:earned?"drop-shadow(0 2px 10px rgba(245,158,11,0.5))":"none"}}>
                <defs>
                  <linearGradient id="sg1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#FCD34D"/><stop offset="50%" stopColor="#D97706"/><stop offset="100%" stopColor="#92400E"/></linearGradient>
                  <linearGradient id="bg1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#FEF3C7"/><stop offset="100%" stopColor="#F59E0B"/></linearGradient>
                </defs>
                <path d="M32 4 L54 12 L54 32 Q54 52 32 60 Q10 52 10 32 L10 12 Z" fill="url(#sg1)" stroke="#B45309" strokeWidth="1"/>
                <path d="M32 6 L52 13 L52 20 Q40 18 32 20 Q24 18 12 20 L12 13 Z" fill="white" fillOpacity="0.25"/>
                <g transform="translate(18,20)">
                  <path d="M14 2 L2 6 L2 24 L14 20 Z" fill="url(#bg1)" stroke="#92400E" strokeWidth="0.5"/>
                  <path d="M14 2 L26 6 L26 24 L14 20 Z" fill="url(#bg1)" stroke="#92400E" strokeWidth="0.5"/>
                  <line x1="4" y1="10" x2="12" y2="8" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
                  <line x1="4" y1="14" x2="12" y2="12" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
                  <line x1="16" y1="8" x2="24" y2="10" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
                  <line x1="16" y1="12" x2="24" y2="14" stroke="#92400E" strokeWidth="0.5" opacity="0.5"/>
                  <line x1="14" y1="2" x2="14" y2="20" stroke="#92400E" strokeWidth="1"/>
                </g>
              </svg>
            </div>
            <div style={{background:"linear-gradient(180deg,#F59E0B,#B45309)",padding:"2px 8px",borderRadius:4,border:"1px solid rgba(253,230,138,0.5)"}}>
              <span style={{fontSize:8,fontWeight:700,color:"#fff",letterSpacing:".05em"}}>Hifz Goal</span>
            </div>
          </div>
        );

        return (
          <div ref={rihlahScrollRef} style={{flex:1,overflowY:"auto",background:"radial-gradient(circle at top, rgba(32,44,90,0.35) 0%, rgba(8,12,24,1) 45%, rgba(4,7,15,1) 100%)"}} className="fi">

            {/* ── AMBIENT GLOW ── */}
            <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
              <div style={{position:"absolute",top:"10%",left:"15%",width:300,height:300,background:"rgba(14,40,60,0.12)",borderRadius:"50%",filter:"blur(60px)"}}/>
              <div style={{position:"absolute",bottom:"25%",right:"10%",width:250,height:250,background:"rgba(212,175,55,0.05)",borderRadius:"50%",filter:"blur(60px)"}}/>
            </div>

            {/* ── 1. PROFILE HEADER ── */}
            <div style={{background:dark?"linear-gradient(160deg,#0A1628 0%,#0E1E3A 50%,#081220 100%)":"#EADFC8",padding:"20px 16px 24px",position:"relative",overflow:"hidden",zIndex:1}}>
              <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 12% 18%, rgba(212,175,55,0.08) 0, transparent 18%), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.04) 0, transparent 14%)"}}/>
              <div style={{display:"flex",alignItems:"center",gap:14,position:"relative",zIndex:1}}>
                <div style={{position:"relative"}}>
                  <div style={{width:64,height:64,borderRadius:"50%",background:dark?"linear-gradient(135deg,#0E1E3A,#162D50)":"#EADFC8",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"2px solid rgba(212,175,55,0.45)",boxShadow:"0 0 20px rgba(212,175,55,0.15)"}}>
                    <span style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#E6B84A"}}>{initials}</span>
                  </div>
                  <div style={{position:"absolute",bottom:-2,right:-2,width:20,height:20,background:"linear-gradient(135deg,#D4AF37,#E6B84A)",borderRadius:"50%",border:dark?"2px solid #0D1020":"2px solid #EDE4CC",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:9,fontWeight:700,color:"#0B1220"}}>1</span>
                  </div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:19,fontWeight:700,color:"#EDE8DC",fontFamily:"'Playfair Display',serif",marginBottom:2}}>{username}</div>
                  <div style={{fontSize:11,color:"#E6B84A",marginBottom:8,letterSpacing:".06em"}}>Al-Hifz · رحلة الحفظ</div>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                    {[
                      {label:"📅 Joined "+joinYear, bg:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.6)", border:"rgba(255,255,255,0.1)"},
                      {label:"🎯 "+goalLabel, bg:"rgba(56,189,248,0.12)", color:"#38BDF8", border:"rgba(56,189,248,0.25)"},
                      {label:"🔥 "+streak+"-Day Streak", bg:"rgba(246,166,35,0.12)", color:"#F6A623", border:"rgba(246,166,35,0.25)"},
                    ].map((pill,i)=>(
                      <div key={i} style={{fontSize:10,color:pill.color,background:pill.bg,padding:"3px 9px",borderRadius:20,border:`1px solid ${pill.border}`}}>{pill.label}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{padding:"12px 14px 64px",position:"relative",zIndex:1}}>

            {/* ── 2 & 3. OVERALL PROGRESS + DAILY GOALS — single card ── */}
            <div style={{background:dark?"linear-gradient(135deg,rgba(30,35,50,0.9) 0%,rgba(20,25,40,0.7) 100%)":"#EADFC8",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,boxShadow:dark?"0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)":"0 4px 16px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.5)",padding:"16px",marginBottom:10}}>

              {/* ── Overall Progress ── */}
              <div style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.7)",fontWeight:700,marginBottom:12}}>Overall Progress</div>
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
                <svg width={100} height={100} style={{flexShrink:0,overflow:"visible"}}>
                  <defs>
                    <linearGradient id="ringgrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F6E27A"/>
                      <stop offset="100%" stopColor="#D4AF37"/>
                    </linearGradient>
                    <filter id="glow2"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                  </defs>
                  <circle cx={50} cy={50} r={40} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={9}/>
                  <circle cx={50} cy={50} r={40} fill="none" stroke="url(#ringgrad)" strokeWidth={9}
                    strokeDasharray={`${2*Math.PI*40*(pct/100)} ${2*Math.PI*40}`} strokeLinecap="round"
                    transform="rotate(-90 50 50)" filter="url(#glow2)" style={{transition:"stroke-dasharray 1s ease"}}/>
                  <text x={50} y={46} textAnchor="middle" fill="#E6B84A" fontSize={18} fontWeight={700} fontFamily="'IBM Plex Mono',monospace">{pct}%</text>
                  <text x={50} y={61} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={9} fontFamily="'DM Sans',sans-serif">{memorizedAyahs} ayahs</text>
                </svg>
                <div style={{flex:1}}>
                  {[{label:"Memorized",val:`${memorizedAyahs} ayahs`,color:"#E6B84A"},{label:"Juz",val:`${completedCount} of 30`,color:"#E6B84A"},{label:"Surahs",val:`${completedSurahCount} of 114`,color:"#E6B84A"},{label:"Remaining",val:`${totalAyahsInQuran-memorizedAyahs} ayahs`,color:"rgba(255,255,255,0.3)"}].map((s,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:i<3?"1px solid rgba(255,255,255,0.06)":"none"}}>
                      <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{s.label}</span>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:s.color,fontWeight:700}}>{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Gold divider ── */}
              <div style={{position:"relative",height:1,marginBottom:16}}>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent 0%,rgba(201,166,70,0.6) 50%,transparent 100%)"}}/>
              </div>

              {/* ── Daily Goals ── */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.7)",fontWeight:700}}>Daily Goals</div>
                <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:24,color:"#F0C040",fontWeight:700,lineHeight:1}}>{checkedCount}</span>
                  <span style={{fontSize:13,color:"rgba(255,255,255,0.35)"}}> of {SESSIONS.length}</span>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginLeft:4}}>Sessions Completed</span>
                </div>
              </div>
              <div style={{height:5,background:"rgba(255,255,255,0.08)",borderRadius:999,overflow:"hidden",marginBottom:12}}>
                <div style={{height:"100%",width:`${Math.round((checkedCount/SESSIONS.length)*100)}%`,background:"linear-gradient(90deg,#D4AF37,#E6B84A)",borderRadius:999,boxShadow:"0 0 10px rgba(212,175,55,0.3)",transition:"width .5s"}}/>
              </div>
              <div style={{background:"rgba(255,255,255,0.02)",padding:"12px",borderRadius:16,boxShadow:"inset 0 0 10px rgba(255,255,255,0.02)"}}>
                {SESSIONS.map((s,i)=>{
                  const done=!!dailyChecks[s.id];
                  const isActive=s.id===activeSess?.id&&!done;
                  const isInactive=!done&&!isActive;
                  return (
                    <div key={s.id} className="sbtn" onClick={()=>toggleCheck(s.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:12,marginBottom:i<SESSIONS.length-1?(isActive?14:10):0,background:isActive?"linear-gradient(180deg,rgba(240,192,64,0.08),rgba(240,192,64,0.02))":done?"rgba(34,197,94,0.06)":"transparent",border:isActive?"1.5px solid rgba(240,192,64,0.6)":done?"1px solid rgba(34,197,94,0.15)":"1px solid transparent",boxShadow:isActive?"0 0 35px rgba(240,192,64,0.18),0 0 30px rgba(240,192,64,0.25),inset 0 0 12px rgba(240,192,64,0.08)":"none",opacity:isInactive?0.2:1,filter:isInactive?"grayscale(0.7)":"none",transition:"all .2s"}}>
                      <div style={{width:18,height:18,borderRadius:"50%",background:done?s.color:"rgba(255,255,255,0.08)",border:done?`2px solid ${s.color}`:"1px solid rgba(255,255,255,0.1)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:done?`0 0 8px ${s.color}60`:"none",filter:isActive?"drop-shadow(0 0 6px rgba(240,192,64,0.4))":"none",transition:"all .2s"}}>
                        {done&&<span style={{fontSize:8,color:"#fff",fontWeight:700}}>✓</span>}
                      </div>
                      <span style={{fontSize:12,color:isActive?"#F0C040":done?s.color:"rgba(255,255,255,0.6)",fontWeight:isActive||done?600:400,flex:1,transition:"color .2s"}}>{s.icon} {s.time} — {s.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 4. HIFZ JOURNEY ── */}
            <div style={{background:dark?"linear-gradient(180deg,#0F1A2B 0%,#0C1526 100%)":"#D8CCB0",border:dark?"1px solid rgba(230,184,74,0.10)":"1px solid rgba(160,136,72,0.25)",borderRadius:20,boxShadow:dark?"0 10px 28px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.03)":"0 4px 12px rgba(0,0,0,0.08)",padding:"16px",marginBottom:10,overflow:"hidden",position:"relative"}}>
              <div style={{position:"absolute",inset:0,pointerEvents:"none",background:dark?"radial-gradient(circle at 10% 20%, rgba(46,230,197,0.05) 0, transparent 40%), radial-gradient(circle at 85% 75%, rgba(230,184,74,0.05) 0, transparent 40%)":"none"}}/>
              <div style={{position:"relative",zIndex:1,marginBottom:12}}>
                <div style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:dark?"rgba(255,255,255,0.5)":"#2D2A26",fontWeight:700}}>Your Hifz Journey</div>
                <div style={{fontSize:10,color:"rgba(230,184,74,0.45)",marginTop:3}}>You are currently on Juz {sessionJuz||"—"}</div>
              </div>
              {(()=>{
                const journeyPct=Math.round((completedCount/30)*100);
                const pathD="M20 110 C 55 105, 78 78, 110 72 S 175 45, 210 42 S 265 28, 300 18";
                const pathLength=320;
                const revealed=(journeyPct/100)*pathLength;
                const hidden=pathLength-revealed;
                // Interpolate position along the path curve using sampled points
                const pathPoints=[{p:0,x:20,y:110},{p:10,x:50,y:102},{p:20,x:75,y:85},{p:33,x:110,y:72},{p:50,x:160,y:52},{p:67,x:210,y:42},{p:80,x:245,y:32},{p:90,x:275,y:24},{p:100,x:300,y:18}];
                let cp={x:20,y:110};
                for(let i=0;i<pathPoints.length-1;i++){
                  if(journeyPct>=pathPoints[i].p&&journeyPct<=pathPoints[i+1].p){
                    const t=(journeyPct-pathPoints[i].p)/(pathPoints[i+1].p-pathPoints[i].p);
                    cp={x:pathPoints[i].x+(pathPoints[i+1].x-pathPoints[i].x)*t,y:pathPoints[i].y+(pathPoints[i+1].y-pathPoints[i].y)*t};
                    break;
                  }
                }
                if(journeyPct>=100) cp={x:300,y:18};
                return (
                  <svg width="100%" viewBox="0 0 320 140" style={{display:"block",marginBottom:8}}>
                    <defs>
                      <linearGradient id="journeyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#2EE6C5"/>
                        <stop offset="75%" stopColor="#8EF0A8"/>
                        <stop offset="100%" stopColor="#E6B84A"/>
                      </linearGradient>
                      <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4.5" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                      </filter>
                      <filter id="currentGlow" x="-80%" y="-80%" width="260%" height="260%">
                        <feGaussianBlur stdDeviation="4" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                      </filter>
                      <filter id="goalGlow" x="-80%" y="-80%" width="260%" height="260%">
                        <feGaussianBlur stdDeviation="5" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                      </filter>
                    </defs>
                    <path d={pathD} fill="none" stroke={dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.15)"} strokeWidth="3" strokeLinecap="round"/>
                    <path d={pathD} fill="none" stroke="url(#journeyGradient)" strokeWidth="6" strokeLinecap="round" filter="url(#lineGlow)" strokeDasharray={`${revealed} ${hidden}`}/>
                    {[{x:105,y:73,juz:10,label:"Juz 10"},{x:170,y:50,juz:20,label:"Juz 20"},{x:245,y:32,juz:30,label:"Juz 30"}].map((m,i)=>{
                      const reached=completedCount>=m.juz;
                      return (
                        <g key={i} opacity={reached?1:0.4}>
                          <circle cx={m.x} cy={m.y} r="5.5" fill={dark?"rgba(255,255,255,0.22)":"rgba(0,0,0,0.25)"}/>
                          <text x={m.x} y={m.y+16} textAnchor="middle" fontSize="8" fill={dark?"rgba(255,255,255,0.5)":"#6B645A"}>{m.label}</text>
                        </g>
                      );
                    })}
                    {completedCount>0&&(
                      <g>
                        <circle cx={cp.x} cy={cp.y} r="9" fill="#E6B84A" filter="url(#currentGlow)"/>
                        <circle cx={cp.x} cy={cp.y} r="5.5" fill="#FFF6D6"/>
                        <text x={cp.x} y={cp.y-13} textAnchor="middle" fontSize="8" fontWeight="700" fill="#E6B84A">{completedCount}</text>
                      </g>
                    )}
                    <g transform="translate(300 18)">
                      <circle cx="0" cy="0" r="16" fill="rgba(230,184,74,0.10)" stroke="rgba(230,184,74,0.70)" strokeWidth="1.5" filter="url(#goalGlow)"/>
                      <text x="0" y="5" textAnchor="middle" fontSize="13" fill="#F0C040">📖</text>
                    </g>
                    <text x="20" y="126" textAnchor="middle" fontSize="8" fill={dark?"rgba(255,255,255,0.4)":"#6B645A"}>Juz 1</text>
                  </svg>
                );
              })()}
              <div style={{display:"flex",justifyContent:"space-between",position:"relative",zIndex:1,marginTop:4}}>
                <div style={{fontSize:10,color:dark?"rgba(255,255,255,0.3)":"#6B645A"}}>Goal: Complete Qur'an in {goalYears} year{goalYears!==1?"s":""}{goalMonths>0?` ${goalMonths} month${goalMonths!==1?"s":""}`:""}</div>
                <div style={{fontSize:10,color:dark?"rgba(230,184,74,0.6)":"#6B645A",fontWeight:600}}>{timeline.juzLeft} Juz remaining</div>
              </div>
            </div>


            {/* ── 5. ACTIVE SESSION CHECKLIST ── */}
            <div style={{background:dark?"linear-gradient(135deg,rgba(30,35,50,0.9) 0%,rgba(20,25,40,0.7) 100%)":"#EADFC8",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,boxShadow:dark?"0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)":"0 4px 16px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.5)",padding:"16px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:36,height:36,borderRadius:12,background:`linear-gradient(135deg,${activeSess.color}88,${activeSess.color}44)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 12px ${activeSess.color}40`}}>
                    <span style={{fontSize:18}}>{activeSess.icon}</span>
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.9)",letterSpacing:".05em",textTransform:"uppercase"}}>{activeSess.time}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:1}}>{activeSess.title}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{display:"flex",gap:3}}>
                    {SESSIONS.map(s=>(
                      <div key={s.id} style={{width:6,height:6,borderRadius:"50%",background:dailyChecks[s.id]?s.color:"rgba(255,255,255,0.12)",transition:"background .3s"}}/>
                    ))}
                  </div>
                  <div className="sbtn" onClick={()=>toggleCheck(activeSess.id)} style={{fontSize:9,padding:"5px 14px",background:activeDone?"#4ADE80":"rgba(255,255,255,0.06)",border:activeDone?"1px solid rgba(74,222,128,0.4)":"1px solid rgba(255,255,255,0.1)",borderRadius:20,color:activeDone?"#052e16":"rgba(255,255,255,0.5)",fontWeight:700,boxShadow:activeDone?"0 0 12px rgba(74,222,128,0.3)":"none",transition:"all .2s"}}>
                    {activeDone?"✓ Done":`Complete ${activeSess.time}`}
                  </div>
                </div>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5}}>
                  <span>{checkedCount} / {SESSIONS.length} sessions complete</span>
                  {activeSess.id==="fajr"&&<span style={{color:"#F0C040",fontWeight:600}}>{dailyNew} ayahs today</span>}
                </div>
                <div style={{height:6,background:"rgba(255,255,255,0.08)",borderRadius:999,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${Math.round((checkedCount/SESSIONS.length)*100)}%`,background:"linear-gradient(90deg,rgba(240,192,64,0.95),rgba(240,192,64,0.75))",borderRadius:999,boxShadow:"0 0 10px rgba(240,192,64,0.3)",transition:"width .5s"}}/>
                </div>
              </div>
              {allChecked?(
                <div style={{textAlign:"center",padding:"14px 0"}}>
                  <div style={{fontSize:24,marginBottom:6}}>🌙</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#F0C040",marginBottom:4}}>All Sessions Complete — MashaAllah!</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>May Allah accept your worship today.</div>
                </div>
              ):(
                activeSteps.map((step,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 10px",borderRadius:12,marginBottom:4,background:activeDone?"rgba(74,222,128,0.06)":"rgba(255,255,255,0.02)",border:activeDone?"1px solid rgba(74,222,128,0.1)":"1px solid transparent"}}>
                    <div style={{width:24,height:24,borderRadius:7,background:activeDone?"linear-gradient(135deg,#4ADE80,#22C55E)":"rgba(255,255,255,0.07)",border:activeDone?"none":"1px solid rgba(255,255,255,0.1)",boxShadow:activeDone?"0 0 10px rgba(74,222,128,0.3)":"inset 0 0 0 1px rgba(255,255,255,0.02)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,color:"#fff"}}>
                      {activeDone&&"✓"}
                    </div>
                    <span style={{fontSize:12,color:activeDone?"rgba(245,231,184,0.7)":"rgba(255,255,255,0.85)",textDecoration:activeDone?"line-through":"none",opacity:activeDone?0.6:1}}>{step}</span>
                  </div>
                ))
              )}
            </div>

            {/* ── 6. BADGES ── */}
            <div style={{background:dark?"linear-gradient(135deg,rgba(30,35,50,0.9) 0%,rgba(20,25,40,0.7) 100%)":"#EADFC8",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,boxShadow:dark?"0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)":"0 4px 16px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.5)",padding:"18px 14px",marginBottom:10,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 12% 18%, rgba(240,192,64,0.08) 0, transparent 20%), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.04) 0, transparent 16%)"}}/>
              <div style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.7)",fontWeight:700,marginBottom:18,position:"relative",zIndex:1}}>Badges Earned</div>
              <div style={{display:"flex",justifyContent:"space-around",gap:8,position:"relative",zIndex:1,background:"linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.2))",borderRadius:16,padding:"12px",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.05)"}}>
                <JuzBadge count={completedCount||0} earned={completedCount>0}/>
                <HabituatedBadge earned={streak>=14}/>
                <StreakBadge earned={streak>=7}/>
                <HifzGoalBadge earned={goalYears>0}/>
              </div>
            </div>

            {/* ── 7. NAV BUTTONS ── */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div className="sbtn" onClick={()=>setRihlahTab("juz")} style={{padding:"16px",background:dark?"linear-gradient(145deg,#0B1020,#111A33)":"#EADFC8",border:"1px solid rgba(74,222,128,0.2)",borderRadius:18,textAlign:"center",boxShadow:"0 10px 25px rgba(0,0,0,0.25)",filter:"drop-shadow(0 0 10px rgba(255,255,255,0.15))",transition:"all .2s"}}>
                <div style={{fontSize:24,marginBottom:4}}>📖</div>
                <div style={{fontSize:13,fontWeight:700,color:"#EDE8DC"}}>My Memorization</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:2}}>Track your progress</div>
              </div>
              <div className="sbtn" onClick={()=>setRihlahTab("timeline")} style={{padding:"16px",background:dark?"linear-gradient(145deg,#0B1020,#111A33)":"#EADFC8",border:"1px solid rgba(240,192,64,0.2)",borderRadius:18,textAlign:"center",boxShadow:"0 10px 25px rgba(0,0,0,0.25)",filter:"drop-shadow(0 0 10px rgba(255,255,255,0.15))",transition:"all .2s"}}>
                <div style={{fontSize:24,marginBottom:4}}>⏱️</div>
                <div style={{fontSize:13,fontWeight:700,color:"#EDE8DC"}}>My Plan</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:2}}>Your hifz timeline</div>
              </div>
            </div>

            </div>
          </div>
        );
      })()}

      {/* ═══ MY MEMORIZATION — JOURNEY VIEW ═══ */}
      {activeTab==="rihlah"&&rihlahTab==="juz"&&(()=>{
        const isJDone=(n)=>juzStatus[n]==="complete"||(JUZ_SURAHS[n]||[]).every(s=>juzStatus[`s${s.s}`]==="complete");
        const currentJuz=sessionJuz||30;
        const currentMeta=JUZ_META.find(j=>j.num===currentJuz)||JUZ_META[0];
        const currentSurahs=JUZ_SURAHS[currentJuz]||[];
        const currentSurah=currentSurahs.find(s=>juzStatus[`s${s.s}`]!=="complete")||currentSurahs[0];
        const curProg=juzProgress[currentJuz]||0;
        const curTotal=totalSV||currentSurahs.reduce((n,s)=>n+s.a,0);

        const completedJuz=JUZ_META.filter(j=>j.num!==currentJuz&&isJDone(j.num)).sort((a,b)=>b.num-a.num);
        const inProgressJuz=JUZ_META.filter(j=>j.num!==currentJuz&&!isJDone(j.num)&&(juzStatus[`s${(JUZ_SURAHS[j.num]||[])[0]?.s}`]==="complete"||(juzProgress[j.num]||0)>0)).sort((a,b)=>b.num-a.num);
        const upcomingJuz=JUZ_META.filter(j=>j.num!==currentJuz&&!isJDone(j.num)&&!inProgressJuz.find(ip=>ip.num===j.num)).sort((a,b)=>b.num-a.num);

        const openSection=memSections;
        const toggleSection=(key)=>setMemSections(p=>({...p,[key]:!p[key]}));

        // Journey strip: sorted descending 30→29→28→27
        const allJourneyNums=new Set([...completedJuz.map(j=>j.num),currentJuz,...upcomingJuz.slice(0,2).map(j=>j.num)]);
        const journeyItems=[...allJourneyNums].sort((a,b)=>b-a).slice(0,6).map(num=>({
          num,state:num===currentJuz?"current":isJDone(num)?"completed":"upcoming"
        }));

        return (
        <div ref={rihlahScrollRef} style={{flex:1,overflowY:"auto",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",padding:"14px 16px 64px"}} className="fi gold-particles">

          {/* Header */}
          <div style={{marginBottom:20}}>
            <div className="sbtn" onClick={()=>setRihlahTab("home")} style={{display:"inline-block",padding:"6px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(217,177,95,0.12)",borderRadius:8,fontSize:11,color:"rgba(243,231,200,0.50)",marginBottom:10}}>← Back</div>
            <div style={{fontSize:9,color:"rgba(217,177,95,0.60)",letterSpacing:".18em",textTransform:"uppercase",fontWeight:600}}>My Memorization</div>
          </div>

          {/* ── 1. CURRENT FOCUS CARD ── */}
          <div style={{padding:"20px 18px",borderRadius:18,marginBottom:18,position:"relative",overflow:"hidden",
            background:"linear-gradient(180deg,rgba(15,26,43,0.97) 0%,rgba(12,21,38,0.99) 100%)",
            border:"1px solid rgba(230,184,74,0.28)",
            boxShadow:"0 10px 40px rgba(0,0,0,0.40),0 0 24px rgba(230,184,74,0.10),inset 0 1px 0 rgba(255,255,255,0.03)"}}>
            <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 20% 30%,rgba(212,175,55,0.08) 0%,transparent 50%),radial-gradient(circle at 80% 70%,rgba(212,175,55,0.03) 0%,transparent 40%)"}}/>
            <div style={{position:"relative",zIndex:1}}>
              <div style={{fontSize:11,color:"rgba(230,184,74,0.45)",marginBottom:4}}>Juz {currentJuz} · {currentMeta.roman||currentMeta.arabic}</div>
              {(()=>{const nv=sessionVerses[sessionIdx];const sn=nv?.surah_number||parseInt(nv?.verse_key?.split(":")[0]||"0",10);const name=SURAH_EN[sn]||currentSurah?.name;return name?<div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:"#F3E7C8",fontWeight:700,marginBottom:12,lineHeight:1.2}}>Surah {name}</div>:null;})()}
              <div style={{fontSize:11,color:"rgba(243,231,200,0.40)",marginBottom:8}}><span style={{color:"#E6B84A"}}>In Progress</span></div>
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <div style={{fontSize:11,color:"rgba(243,231,200,0.35)"}}>Progress</div>
                  <div style={{fontSize:12,color:"rgba(230,184,74,0.65)",fontFamily:"'IBM Plex Mono',monospace"}}>{curProg} / {curTotal} ayahs</div>
                </div>
                <div style={{height:6,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                  <div className="pbfill" style={{height:"100%",width:`${curTotal>0?Math.round((curProg/curTotal)*100):0}%`,background:"linear-gradient(90deg,#D4AF37,#F6E27A)",borderRadius:999,boxShadow:"0 0 8px rgba(212,175,55,0.30)"}}/>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontSize:11,color:"rgba(243,231,200,0.28)"}}>Next: {(()=>{const nv=sessionVerses[sessionIdx];if(!nv) return "—";const sn=nv.surah_number||parseInt(nv.verse_key?.split(":")[0],10);return `${SURAH_EN[sn]||""} ${nv.verse_key}`;})()}</div>
                <div style={{fontSize:10,color:"rgba(243,231,200,0.22)"}}>Last session: Today</div>
              </div>
              <div className="sbtn" onClick={()=>{setActiveTab("myhifz");}} style={{display:"inline-block",padding:"11px 22px",borderRadius:12,fontSize:13,fontWeight:700,color:"#0B1220",background:"linear-gradient(180deg,#E6B84A,#D4A62A)",boxShadow:"0 6px 18px rgba(230,184,74,0.25),0 0 12px rgba(230,184,74,0.12)"}}>
                Continue Memorization
              </div>
            </div>
          </div>

          {/* ── 2. JOURNEY STRIP ── */}
          <div style={{marginBottom:18}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:"#F3E7C8",marginBottom:12}}>Your Journey Through the Qur'an</div>
            <div style={{display:"flex",alignItems:"center",overflowX:"auto",gap:0,padding:"8px 0"}}>
              {journeyItems.map((item,i)=>{
                const isCur=item.state==="current";
                const isDone=item.state==="completed";
                return (
                  <div key={item.num} style={{display:"flex",alignItems:"center",flexShrink:0}}>
                    {i>0&&<div style={{width:24,height:2,background:isDone||isCur?"rgba(212,175,55,0.35)":"rgba(255,255,255,0.06)"}}/>}
                    <div style={{padding:isCur?"10px 18px":"8px 14px",borderRadius:12,textAlign:"center",
                      background:isCur?"rgba(217,177,95,0.12)":isDone?"rgba(217,177,95,0.04)":"rgba(255,255,255,0.02)",
                      border:`1px solid ${isCur?"rgba(232,200,120,0.55)":isDone?"rgba(217,177,95,0.18)":"rgba(255,255,255,0.04)"}`,
                      boxShadow:isCur?"0 0 20px rgba(230,184,74,0.20)":"none"}}>
                      <div style={{fontSize:isCur?15:12,fontWeight:isCur?700:400,color:isCur?"#F6E27A":isDone?"rgba(230,184,74,0.55)":"rgba(255,255,255,0.25)"}}>{`Juz ${item.num}`}</div>
                      <div style={{fontSize:9,color:isCur?"rgba(230,184,74,0.65)":isDone?"rgba(230,184,74,0.35)":"rgba(255,255,255,0.15)",marginTop:2}}>
                        {isCur?"Current":isDone?"Completed":"Next"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 3. COMPLETED JUZ ── */}
          {completedJuz.length>0&&(
            <div style={{marginBottom:12}}>
              <div className="sbtn" onClick={()=>toggleSection("completed")} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
                <div style={{fontSize:12,color:"rgba(243,231,200,0.55)",fontWeight:600}}>Completed Juz <span style={{color:"rgba(243,231,200,0.30)"}}>({completedJuz.length})</span></div>
                <div style={{color:"rgba(217,177,95,0.40)",fontSize:14,transition:"transform .2s",transform:openSection.completed?"rotate(180deg)":"rotate(0deg)"}}>▾</div>
              </div>
              {openSection.completed&&(
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {completedJuz.map(j=>{
                    const jMeta=JUZ_META.find(m=>m.num===j.num);
                    return (
                      <div key={j.num} style={{padding:"16px 16px",borderRadius:14,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(217,177,95,0.12)"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:14,fontWeight:600,color:"rgba(243,231,200,0.75)"}}>Juz {j.num} <span style={{fontSize:11,color:"rgba(243,231,200,0.35)",fontWeight:400}}>({jMeta?.roman?.split(" ")[0]||""})</span></div>
                            <div style={{fontSize:11,color:"rgba(230,184,74,0.45)",marginTop:4,textShadow:"0 0 6px rgba(230,184,74,0.10)"}}>Complete — Alhamdulillah</div>
                          </div>
                          <div className="sbtn" onClick={()=>{setSessionJuz(j.num);setActiveTab("myhifz");}} style={{padding:"6px 12px",borderRadius:10,fontSize:10,fontWeight:500,color:"rgba(243,231,200,0.30)",background:"transparent",border:"1px solid rgba(217,177,95,0.08)"}}>
                            Review
                          </div>
                        </div>
                        <div style={{height:3,borderRadius:999,background:"rgba(255,255,255,0.06)",marginTop:12,overflow:"hidden"}}>
                          <div style={{height:"100%",width:"100%",background:"linear-gradient(90deg,rgba(212,175,55,0.40),rgba(246,226,122,0.30))",borderRadius:999}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 4. IN PROGRESS ── */}
          {inProgressJuz.length>0&&(
            <div style={{marginBottom:12}}>
              <div className="sbtn" onClick={()=>toggleSection("inprogress")} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
                <div style={{fontSize:12,color:"rgba(243,231,200,0.55)",fontWeight:600}}>In Progress <span style={{color:"rgba(243,231,200,0.30)"}}>({inProgressJuz.length})</span></div>
                <div style={{color:"rgba(217,177,95,0.40)",fontSize:14,transition:"transform .2s",transform:openSection.inprogress?"rotate(180deg)":"rotate(0deg)"}}>▾</div>
              </div>
              {openSection.inprogress&&(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {inProgressJuz.map(j=>{
                    const jMeta=JUZ_META.find(m=>m.num===j.num);
                    const jp=juzProgress[j.num]||0;
                    const jTotal=(JUZ_SURAHS[j.num]||[]).reduce((n,s)=>n+s.a,0);
                    return (
                      <div key={j.num} style={{padding:"14px 16px",borderRadius:14,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(217,177,95,0.10)"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:14,fontWeight:600,color:"rgba(243,231,200,0.75)"}}>Juz {j.num} <span style={{fontSize:11,color:"rgba(243,231,200,0.35)",fontWeight:400}}>({jMeta?.roman?.split(" ")[0]||""})</span></div>
                            <div style={{fontSize:11,color:"rgba(243,231,200,0.35)",marginTop:3}}>Progress</div>
                          </div>
                          <div className="sbtn" onClick={()=>{setSessionJuz(j.num);setActiveTab("myhifz");}} style={{padding:"7px 14px",borderRadius:10,fontSize:11,fontWeight:600,color:"#E6B84A",background:"rgba(230,184,74,0.08)",border:"1px solid rgba(230,184,74,0.20)"}}>
                            Continue
                          </div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
                          <div style={{flex:1,height:4,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${jTotal>0?Math.round((jp/jTotal)*100):0}%`,background:"linear-gradient(90deg,#D4AF37,#E6B84A)",borderRadius:999}}/>
                          </div>
                          <div style={{fontSize:11,color:"rgba(243,231,200,0.35)",fontFamily:"'IBM Plex Mono',monospace"}}>{jp} / {jTotal}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 5. UPCOMING JUZ ── */}
          {upcomingJuz.length>0&&(
          <div style={{marginBottom:12}}>
            <div className="sbtn" onClick={()=>toggleSection("upcoming")} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
              <div style={{fontSize:12,color:"rgba(243,231,200,0.55)",fontWeight:600}}>Upcoming Juz</div>
              <div style={{color:"rgba(217,177,95,0.40)",fontSize:14,transition:"transform .2s",transform:openSection.upcoming?"rotate(180deg)":"rotate(0deg)"}}>▾</div>
            </div>
            {openSection.upcoming&&(<>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {upcomingJuz.slice(0,3).map(j=>(
                  <div key={j.num} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.04)"}}>
                    <div style={{fontSize:13,color:"rgba(243,231,200,0.40)",fontWeight:500}}>Juz {j.num}</div>
                    <div style={{fontSize:11,color:"rgba(243,231,200,0.20)"}}>Ready to start</div>
                  </div>
                ))}
              </div>
              {upcomingJuz.length>3&&(
                <div className="sbtn" onClick={()=>toggleSection("upcomingAll")}
                  style={{textAlign:"center",padding:"8px",marginTop:6,borderRadius:8,fontSize:10,fontWeight:500,
                    color:"rgba(217,177,95,0.30)",border:"1px dashed rgba(217,177,95,0.08)",background:"transparent"}}>
                  {openSection.upcomingAll?"Show less":"View all "+upcomingJuz.length+" upcoming"}
                </div>
              )}
              {openSection.upcomingAll&&upcomingJuz.length>3&&(
                <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:6}}>
                  {upcomingJuz.slice(3).map(j=>(
                    <div key={j.num} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.04)"}}>
                      <div style={{fontSize:13,color:"rgba(243,231,200,0.40)",fontWeight:500}}>Juz {j.num}</div>
                      <div style={{fontSize:11,color:"rgba(243,231,200,0.20)"}}>Ready to start</div>
                    </div>
                  ))}
                </div>
              )}
            </>)}
          </div>
          )}

        </div>
        );
      })()}

      {/* ═══ QURAN TEXT ═══ */}
      {activeTab==="quran"&&(()=>{
        const curSurahNum=mushafSurahNum;
        const curSurahPage=SURAH_PAGES[curSurahNum]||1;
        const parchment=dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2";
        const goldColor="#E8D5A3";
        const inkColor="#E8D5A3";

        return (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:parchment,paddingBottom:52}}>

          {/* Header — Asr session style */}
          <div style={{flexShrink:0,padding:"14px 16px 0",background:dark?"#060C18":"#EADFC8"}}>
            <div style={{fontSize:10,color:dark?"rgba(217,177,95,0.50)":"#6B645A",letterSpacing:".18em",textTransform:"uppercase",fontWeight:600,marginBottom:8}}>AL-QUR'AN AL-KARIM</div>
            {/* Picker buttons row */}
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
              <div className="sbtn" onClick={()=>setShowQuranJuzModal(true)} style={{flex:1,padding:"7px 12px",background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)",border:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(139,106,16,0.20)",borderRadius:10,fontSize:11,fontWeight:700,color:dark?"rgba(217,177,95,0.90)":"#6B645A",display:"flex",alignItems:"center",justifyContent:"center",gap:5,height:32}}>
                Juz {mushafJuzNum} <span style={{fontSize:9,opacity:0.5}}>▾</span>
              </div>
              <div className="sbtn" onClick={()=>setShowQuranSurahModal(true)} style={{flex:1,padding:"7px 12px",background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)",border:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(139,106,16,0.20)",borderRadius:10,fontSize:11,color:dark?"rgba(243,231,191,0.70)":"#4A3A10",display:"flex",alignItems:"center",justifyContent:"center",gap:4,overflow:"hidden",height:32}}>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{SURAH_EN[curSurahNum]||"Surah"}</span>
                <span style={{fontSize:9,opacity:0.5,flexShrink:0}}>▾</span>
              </div>
              <div style={{position:"relative",display:"flex",borderRadius:999,flex:1,background:dark?"rgba(12,20,34,0.80)":"rgba(0,0,0,0.08)",border:dark?"1px solid rgba(212,175,55,0.15)":"1px solid rgba(139,106,16,0.20)",padding:2,height:32}}>
                {/* Sliding gold pill */}
                <div style={{position:"absolute",top:2,left:quranMode==="mushaf"?2:"calc(50% + 1px)",width:"calc(50% - 3px)",height:28,borderRadius:999,background:"linear-gradient(160deg,#D4AF37 0%,#8B6A10 100%)",boxShadow:"0 0 14px rgba(212,175,55,0.45), 0 0 6px rgba(212,175,55,0.25)",transition:"left .25s ease"}}/>
                <div className="sbtn" onClick={()=>setQuranMode("mushaf")} style={{position:"relative",zIndex:1,flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:quranMode==="mushaf"?"#0A0E1A":dark?"rgba(212,175,55,0.35)":"rgba(0,0,0,0.40)",transition:"color .2s ease",fontWeight:700}}>🕌</div>
                <div className="sbtn" onClick={()=>setQuranMode("interactive")} style={{position:"relative",zIndex:1,flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:quranMode==="interactive"?"#0A0E1A":dark?"rgba(212,175,55,0.35)":"rgba(0,0,0,0.40)",transition:"color .2s ease",fontWeight:700}}>✋</div>
              </div>

            </div>
            <div style={{height:1,background:dark?"linear-gradient(to right,transparent,rgba(217,177,95,0.35),transparent)":"linear-gradient(to right,transparent,rgba(139,106,16,0.20),transparent)"}}/>
          </div>

          {/* Viewer */}
          {quranMode==="mushaf"?(
            <div style={{flex:1,overflow:"hidden",backgroundColor:dark?"#0b1a2b":"#F3E9D2",display:"flex",justifyContent:"center",alignItems:"center",position:"relative"}}
              onTouchStart={e=>{ quranTouchRef.current=e.touches[0].clientX; }}
              onTouchEnd={e=>{
                const dx=e.changedTouches[0].clientX-quranTouchRef.current;
                if(Math.abs(dx)<40) return;
                if(dx<0){ setMushafSwipeAnim("left"); setMushafPage(p=>Math.max(1,p-1)); }
                else { setMushafSwipeAnim("right"); setMushafPage(p=>Math.min(604,p+1)); }
              }}
            >
              <img
                key={mushafPage}
                src={croppedPages[mushafPage] || mushafImageUrl(mushafPage)}
                alt={`Mushaf page ${mushafPage}`}
                draggable={false}
                onClick={()=>setShowMushafSheet(true)}
                className={mushafSwipeAnim==="left"?"asr-slide-left":mushafSwipeAnim==="right"?"asr-slide-right":""}
                style={{width:"100%",height:"100%",objectFit:"contain",display:"block",userSelect:"none",cursor:"pointer"}}
              />
              {/* Playing indicator — subtle, non-intrusive */}
              {mushafAudioPlaying&&(
                <div style={{position:"absolute",bottom:10,left:0,right:0,display:"flex",justifyContent:"center",pointerEvents:"none"}}>
                  <div className="sbtn" onClick={(e)=>{e.stopPropagation();stopMushafAudio();}} style={{pointerEvents:"auto",padding:"6px 16px",borderRadius:20,background:"rgba(8,16,34,0.90)",border:"1px solid rgba(217,177,95,0.40)",color:"#E8D5A3",fontSize:12,display:"flex",alignItems:"center",gap:8}}>
                    <span style={{color:"#E6B84A"}}>▶</span> Playing · tap to stop
                  </div>
                </div>
              )}
            </div>
          ):(
            <div
              onTouchStart={(e)=>{ quranTouchRef.current=e.touches[0].clientX; }}
              onTouchEnd={(e)=>{
                const dx=e.changedTouches[0].clientX-quranTouchRef.current;
                if(dx < -40){ setMushafSwipeAnim("left"); setMushafPage(p=>Math.max(1,p-1)); }
                if(dx > 40){ setMushafSwipeAnim("right"); setMushafPage(p=>Math.min(604,p+1)); }
              }}
              style={{position:"relative",flex:1,overflowY:"auto",background:dark?"#060C18":"#F3E9D2",padding:"10px 12px 80px"}}
            >
              {/* ── CONTINUOUS READING SURFACE ── */}
              {mushafLoading?(
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:"rgba(232,213,163,0.25)",fontSize:11,letterSpacing:".12em"}}>Loading...</div>
              ):(
                <div style={{padding:"0 4px"}}>
                  {(()=>{
                    let lastSurah = null;
                    const playAyahAudio = (vk) => {
                      if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; setPlayingKey(null); }
                      const [s,a]=vk.split(":");
                      const folder=getEveryayahFolder(quranReciter);
                      const url=`https://everyayah.com/data/${folder}/${String(s).padStart(3,"0")}${String(a).padStart(3,"0")}.mp3`;
                      const au=new Audio(url);
                      audioRef.current=au;
                      setPlayingKey(vk);
                      au.play();
                      au.onended=()=>setPlayingKey(null);
                    };
                    return (mushafVerses||[]).map((verse,vi)=>{
                      const [sNum,aNum] = verse.verse_key.split(":");
                      const surahN = parseInt(sNum,10);
                      const isSelected = selectedAyah === verse.verse_key;
                      const showSurahHeader = surahN !== lastSurah;
                      const isFirstAyah = aNum === "1";
                      lastSurah = surahN;

                      return (
                        <div key={verse.verse_key}>
                          {/* Surah header */}
                          {showSurahHeader&&(
                            <div style={{textAlign:"center",padding:"16px 16px 12px"}}>
                              <div style={{fontFamily:"'Amiri',serif",fontSize:20,color:dark?"#E8C878":"#6B645A",fontWeight:700,marginBottom:2}}>{SURAH_AR[surahN]||""}</div>
                              <div style={{fontSize:8,color:dark?"rgba(217,177,95,0.40)":"rgba(0,0,0,0.50)",letterSpacing:".22em",fontWeight:600,textTransform:"uppercase"}}>{SURAH_EN[surahN]||""}</div>
                              {isFirstAyah&&surahN!==9&&surahN!==1&&(
                                <div style={{fontFamily:"'Amiri Quran','Amiri',serif",fontSize:17,color:dark?"rgba(232,200,120,0.55)":"rgba(0,0,0,0.45)",marginTop:10,direction:"rtl",lineHeight:2,textAlign:"center"}}>
                                  بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِيمِ
                                </div>
                              )}
                              <div style={{height:1,margin:"10px 16px 0",background:dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.28) 50%,rgba(217,177,95,0) 100%)":"linear-gradient(90deg,rgba(139,106,16,0) 0%,rgba(139,106,16,0.18) 50%,rgba(139,106,16,0) 100%)"}}/>
                            </div>
                          )}

                          {/* Ayah reading block — tap to open bottom drawer */}
                          <div
                            onClick={()=>{setSelectedAyah(isSelected?null:verse.verse_key);setShowReflect(false);setDrawerView("default");}}
                            style={{
                              padding:"14px 12px",
                              background:isSelected?(dark?"rgba(212,175,55,0.05)":"rgba(0,0,0,0.06)"):"transparent",
                              transition:"background .15s",
                              cursor:"pointer",
                              direction:"rtl",
                            }}
                          >
                            {/* Ayah: number badge inline at start (RTL = right side), then Arabic text */}
                            <div style={{display:"flex",alignItems:"flex-start",gap:8,direction:"rtl"}}>
                              {/* Ayah ornament — Quranic end-marker with Arabic-Indic digits */}
                              <div style={{flexShrink:0,marginTop:4,lineHeight:1}}>
                                <span style={{
                                  fontFamily:"'Amiri Quran','Amiri',serif",
                                  fontSize:20,
                                  color:isSelected?(dark?"rgba(212,175,55,0.80)":"#7A5C0E"):(dark?"rgba(212,175,55,0.38)":"#A08848"),
                                }}>﴿{toArabicDigits(aNum)}﴾</span>
                              </div>
                              {/* Arabic text */}
                              <div style={{
                                flex:1,
                                fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",
                                fontSize:22,
                                lineHeight:2.2,
                                color:isSelected?(dark?"#F5E6B3":"#3A2200"):(dark?"#E8DFC0":"#2D2A26"),
                                textAlign:"right",
                              }}>
                                {(verse.text_uthmani||"").replace(/\u06DF/g,"\u0652")}
                              </div>
                            </div>
                          </div>

                          {/* Divider removed — continuous flow */}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* ── UNIFIED 50% DRAWER ── */}
              {selectedAyah&&(()=>{
                const [sNum,aNum] = selectedAyah.split(":");
                const surahN = parseInt(sNum,10);
                const selVerse = (mushafVerses||[]).find(v=>v.verse_key===selectedAyah);
                const transText = selVerse?._translation || translations[selectedAyah] || "";
                if(!transText && selVerse) fetchTranslations([selVerse]);
                const isPlaying = playingKey === selectedAyah;
                const isSaved = mushafBookmarks.includes(selectedAyah);
                const isBookmarkedPage = mushafBookmarks.includes(mushafPage);
                const playAyahAudio = (vk) => {
                  if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; setPlayingKey(null); }
                  const [s,a]=vk.split(":");
                  const folder=getEveryayahFolder(quranReciter);
                  const url=`https://everyayah.com/data/${folder}/${String(s).padStart(3,"0")}${String(a).padStart(3,"0")}.mp3`;
                  const au=new Audio(url); audioRef.current=au; setPlayingKey(vk);
                  au.play(); au.onended=()=>setPlayingKey(null);
                };
                return (
                  <div
                    onClick={e=>e.stopPropagation()}
                    style={{
                      position:"fixed",bottom:drawerView==="tafsir"?0:62,left:0,right:0,zIndex:200,
                      height:drawerView==="tafsir"?"100vh":"50vh",
                      transition:"height .25s ease, bottom .25s ease",
                      background:dark?"linear-gradient(180deg,#0C1422 0%,#060E1A 100%)":"linear-gradient(180deg,#E0D5BC 0%,#D8CCB0 100%)",
                      borderTop:dark?"1px solid rgba(212,175,55,0.22)":"1px solid rgba(139,106,16,0.18)",
                      borderRadius:"20px 20px 0 0",
                      boxShadow:dark?"0 -12px 40px rgba(0,0,0,0.70)":"0 -12px 40px rgba(0,0,0,0.12)",
                      animation:"slideUpDrawer .22s ease-out",
                      display:"flex",flexDirection:"column",
                    }}
                  >
                    {/* Drag handle + header row */}
                    <div style={{flexShrink:0,padding:"10px 20px 0"}}>
                      <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
                        <div style={{width:36,height:4,borderRadius:2,background:dark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.20)"}}/>
                      </div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        {drawerView!=="default"?(
                          <div className="sbtn" onClick={()=>setDrawerView("default")}
                            style={{fontSize:11,color:"rgba(212,175,55,0.60)",display:"flex",alignItems:"center",gap:4,fontFamily:"'DM Sans',sans-serif"}}>
                            ← Back
                          </div>
                        ):(
                          <div style={{fontSize:10,color:dark?"rgba(217,177,95,0.50)":"#6B645A",letterSpacing:".14em",fontWeight:700,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>
                            {SURAH_EN[surahN]||""} · {sNum}:{aNum}
                          </div>
                        )}
                        <div className="sbtn" onClick={()=>{setSelectedAyah(null);setDrawerView("default");if(audioRef.current){audioRef.current.pause();audioRef.current=null;setPlayingKey(null);}}}
                          style={{fontSize:18,color:dark?"rgba(243,231,200,0.20)":"rgba(0,0,0,0.30)",lineHeight:1,padding:"0 4px"}}>×</div>
                      </div>
                    </div>

                    {/* ── VIEW: DEFAULT ── */}
                    {drawerView==="default"&&(
                      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",padding:"8px 20px 0"}}>
                        {/* Translation */}
                        <div style={{flex:1,overflowY:"auto",marginBottom:10}}>
                          {transText?(
                            <div style={{fontSize:15,color:dark?"rgba(243,231,200,0.78)":"#2D2A26",lineHeight:1.85,fontFamily:"'DM Sans',sans-serif",textAlign:"center",padding:"12px 8px",display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}>
                              {transText}
                            </div>
                          ):(
                            <div style={{height:12}}/>
                          )}
                        </div>

                        {/* Ayah action buttons */}
                        <div style={{flexShrink:0,display:"flex",justifyContent:"center",gap:12,marginBottom:10}}>
                          {[
                            {icon:isPlaying?"⏹":"▶", label:isPlaying?"Stop":"Play",
                              action:()=>{ if(isPlaying){audioRef.current?.pause();audioRef.current=null;setPlayingKey(null);}else{playAyahAudio(selectedAyah);} }},
                            {icon:"📖", label:"Tafsir",
                              action:()=>{ if(!selectedAyah)return; setTafsirAyah(selectedAyah); fetchTafsir(selectedAyah); setDrawerView("tafsir"); }},
                            {icon:isSaved?"✦":"🔖", label:isSaved?"Saved":"Save",
                              action:()=>{ const bm=[...mushafBookmarks]; const idx=bm.indexOf(selectedAyah); if(idx>=0)bm.splice(idx,1); else bm.push(selectedAyah); setMushafBookmarks(bm); localStorage.setItem("rihlat-mushaf-bookmarks",JSON.stringify(bm)); }},
                            {icon:"✏️", label:"Reflect", action:()=>setDrawerView("reflect")},
                          ].map(btn=>(
                            <div key={btn.label} className="sbtn"
                              onClick={e=>{e.stopPropagation();btn.action();}}
                              style={{
                                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,
                                width:56,height:56,borderRadius:999,fontSize:9,fontWeight:700,
                                letterSpacing:".06em",textTransform:"uppercase",
                                border:dark?"1.5px solid rgba(212,175,55,0.30)":"1.5px solid rgba(139,106,16,0.25)",
                                color:isSaved&&btn.label==="Saved"?(dark?"#E8C878":"#6B645A"):(dark?"rgba(243,231,200,0.75)":"#5A4A20"),
                                background:isSaved&&btn.label==="Saved"?(dark?"radial-gradient(circle at 50% 40%,rgba(212,175,55,0.12),rgba(12,20,34,0.95))":"radial-gradient(circle at 50% 40%,rgba(139,106,16,0.10),rgba(240,230,210,0.95))"):(dark?"radial-gradient(circle at 50% 40%,rgba(212,175,55,0.06),rgba(12,20,34,0.95))":"radial-gradient(circle at 50% 40%,rgba(139,106,16,0.04),rgba(240,230,210,0.95))"),
                                boxShadow:dark?"0 0 12px rgba(212,175,55,0.18), 0 4px 14px rgba(0,0,0,0.40)":"0 0 8px rgba(139,106,16,0.10), 0 2px 8px rgba(0,0,0,0.08)",
                                fontFamily:"'DM Sans',sans-serif",
                                transition:"all .15s ease",
                              }}
                            >
                              <span style={{fontSize:16}}>{btn.icon}</span>
                              <span style={{fontSize:7}}>{btn.label}</span>
                            </div>
                          ))}
                        </div>

                        {/* Page action row */}
                        <div style={{flexShrink:0,display:"flex",gap:6,paddingBottom:12,borderTop:"1px solid rgba(139,106,16,0.15)",paddingTop:8}}>
                          {[
                            {icon:mushafAudioPlaying?"⏹":"▶", label:mushafAudioPlaying?"Stop":"Page",
                              action:()=>{ if(mushafAudioPlaying){stopMushafAudio();}else{setMushafRangeStart(null);setMushafRangeEnd(null);playMushafRange(mushafVerses);} }},
                            {icon:"⏭", label:"Range", action:()=>{ stopMushafAudio();setMushafRangeStart(null);setMushafRangeEnd(null);setShowMushafRangePicker(true); }},
                            {icon:"🎙️", label:"Reciter", action:()=>{ setReciterMode("quran");setShowReciterModal(true); }},
                            {icon:isBookmarkedPage?"✦":"🔖", label:isBookmarkedPage?"Saved":"Bookmark",
                              action:()=>{ const updated=isBookmarkedPage?mushafBookmarks.filter(p=>p!==mushafPage):[...mushafBookmarks,mushafPage].sort((a,b)=>a-b); setMushafBookmarks(updated); try{localStorage.setItem("rihlat-mushaf-bookmarks",JSON.stringify(updated));}catch{} }},
                          ].map(btn=>(
                            <div key={btn.label} className="sbtn" onClick={e=>{e.stopPropagation();btn.action();}}
                              style={{
                                flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,
                                padding:"8px 4px",borderRadius:10,fontSize:8,fontWeight:700,
                                letterSpacing:".06em",textTransform:"uppercase",
                                color:"rgba(0,0,0,0.70)",
                                fontFamily:"'DM Sans',sans-serif",
                              }}
                            >
                              <span style={{fontSize:14}}>{btn.icon}</span>
                              <span>{btn.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── VIEW: TAFSIR (full screen with pinned ayah) ── */}
                    {drawerView==="tafsir"&&(
                      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",padding:"8px 0 0"}}>
                        {/* Pinned ayah */}
                        <div style={{flexShrink:0,padding:"12px 20px 10px",borderBottom:dark?"1px solid rgba(212,175,55,0.12)":"1px solid rgba(0,0,0,0.08)",background:dark?"rgba(0,0,0,0.15)":"rgba(0,0,0,0.03)"}}>
                          <div style={{fontFamily:"'UthmanicHafs','Amiri Quran','Amiri',serif",fontSize:20,lineHeight:2,color:dark?"#E8DFC0":"#2D2A26",direction:"rtl",textAlign:"center"}}>
                            {(selVerse?.text_uthmani||"").replace(/\u06DF/g,"\u0652")}
                          </div>
                          {transText&&<div style={{fontSize:12,color:dark?"rgba(243,231,200,0.50)":"#6B645A",textAlign:"center",marginTop:4,lineHeight:1.6,fontFamily:"'DM Sans',sans-serif"}}>{transText}</div>}
                        </div>
                        {/* Tab selector */}
                        <div style={{display:"flex",borderBottom:dark?"1px solid rgba(212,175,55,0.10)":"1px solid rgba(0,0,0,0.06)",padding:"0 20px",flexShrink:0,gap:4}}>
                          {TAFSIR_SOURCES.map(src=>(
                            <div key={src.id} className="sbtn" onClick={()=>{setTafsirTab(src.id);if(!tafsirData[`${src.id}-${selectedAyah}`])fetchTafsir(selectedAyah);}}
                              style={{flex:1,textAlign:"center",padding:"10px 4px 8px",fontSize:11,fontWeight:tafsirTab===src.id?700:500,
                              letterSpacing:".02em",
                              color:tafsirTab===src.id?(dark?"#E8C76A":"#D4AF37"):(dark?"rgba(243,231,200,0.30)":"#9A9488"),
                              borderBottom:`2.5px solid ${tafsirTab===src.id?(dark?"#E8C76A":"#D4AF37"):"transparent"}`,
                              transition:"all .2s ease"}}>
                              {src.name}
                            </div>
                          ))}
                        </div>
                        {/* Tafsir content — parsed into blocks */}
                        <div style={{flex:1,overflowY:"auto",padding:"20px 20px 60px"}}>
                          {(()=>{
                            const rawText = tafsirData[`${tafsirTab}-${selectedAyah}`];
                            if(!rawText) return <div style={{textAlign:"center",padding:40,color:dark?"rgba(243,231,200,0.20)":"#6B645A",fontSize:11}}>Loading...</div>;
                            const isFullArabic = TAFSIR_SOURCES.find(s=>s.id===tafsirTab)?.lang==="ar";
                            if(isFullArabic) {
                              // Full Arabic tafsir — render as one styled block
                              return <div style={{fontFamily:"'Amiri',serif",fontSize:16,lineHeight:2.2,color:dark?"rgba(243,231,200,0.85)":"#2D2A26",direction:"rtl",textAlign:"right"}}>{rawText}</div>;
                            }
                            const blocks = parseTafsirBlocks(rawText);
                            return blocks.map((block,i) => (
                              block.type==="arabic" ? (
                                <div key={i} style={{
                                  fontFamily:"'Amiri Quran','Amiri',serif",fontSize:20,lineHeight:2.2,
                                  color:dark?"#E8C76A":"#2D2A26",
                                  direction:"rtl",textAlign:"center",
                                  padding:"20px 16px",margin:"16px 0",
                                  background:dark?"rgba(212,175,55,0.04)":"rgba(212,175,55,0.06)",
                                  borderRadius:12,
                                  border:dark?"1px solid rgba(212,175,55,0.10)":"1px solid rgba(0,0,0,0.06)",
                                }}>{block.text}</div>
                              ) : (
                                <div key={i} style={{
                                  fontFamily:"'DM Sans',sans-serif",fontSize:14,lineHeight:1.85,
                                  color:dark?"rgba(243,231,200,0.75)":"#2D2A26",
                                  marginBottom:18,
                                  direction:"ltr",textAlign:"left",
                                }}>{block.text}</div>
                              )
                            ));
                          })()}
                        </div>
                      </div>
                    )}

                    {/* ── VIEW: REFLECT ── */}
                    {drawerView==="reflect"&&(
                      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 16px",overflow:"hidden"}}>
                        <div style={{fontSize:9,color:"rgba(217,177,95,0.45)",letterSpacing:".14em",textTransform:"uppercase",fontWeight:700,marginBottom:8,fontFamily:"'DM Sans',sans-serif"}}>
                          Your Reflection · {SURAH_EN[surahN]||""} {sNum}:{aNum}
                        </div>
                        <textarea
                          value={reflections[selectedAyah]||""}
                          onChange={e=>{
                            const updated={...reflections,[selectedAyah]:e.target.value};
                            setReflections(updated);
                            try{localStorage.setItem("rihlat-reflections",JSON.stringify(updated));}catch{}
                          }}
                          placeholder="Write your thoughts on this ayah..."
                          style={{
                            flex:1,width:"100%",background:"rgba(255,255,255,0.03)",
                            border:"1px solid rgba(212,175,55,0.15)",borderRadius:12,
                            padding:"12px",outline:"none",
                            color:"rgba(243,231,200,0.80)",fontSize:13,lineHeight:1.75,
                            fontFamily:"'DM Sans',sans-serif",resize:"none",
                          }}
                        />
                        {reflections[selectedAyah]&&(
                          <div style={{fontSize:9,color:"rgba(217,177,95,0.35)",textAlign:"right",fontFamily:"'DM Sans',sans-serif",marginTop:4}}>Saved ✓</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Page nav */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px",borderTop:dark?"1px solid rgba(217,177,95,0.12)":"1px solid rgba(139,106,16,0.15)",flexShrink:0,background:dark?"#060C18":"#EADFC8"}}>
            <div className="sbtn" onClick={()=>{setMushafSwipeAnim("left");setMushafPage(p=>Math.min(604,p+1));}} style={{padding:"10px 22px",fontSize:22,color:mushafPage<604?(dark?"rgba(217,177,95,0.60)":"#6B645A"):(dark?"rgba(217,177,95,0.15)":"rgba(0,0,0,0.20)"),borderRadius:10,border:dark?"1px solid rgba(217,177,95,0.15)":"1px solid rgba(139,106,16,0.18)",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.05)"}}>‹</div>
            <div style={{fontSize:11,color:dark?"rgba(217,177,95,0.45)":"#6B645A",fontFamily:"'DM Sans',sans-serif",letterSpacing:".08em"}}>Page {mushafPage} · Juz {mushafJuzNum}</div>
            <div className="sbtn" onClick={()=>{setMushafSwipeAnim("right");setMushafPage(p=>Math.max(1,p-1));}} style={{padding:"10px 22px",fontSize:22,color:mushafPage>1?(dark?"rgba(217,177,95,0.60)":"#6B645A"):(dark?"rgba(217,177,95,0.15)":"rgba(0,0,0,0.20)"),borderRadius:10,border:dark?"1px solid rgba(217,177,95,0.15)":"1px solid rgba(139,106,16,0.18)",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.05)"}}>›</div>
          </div>


        </div>
        );
      })()}

      {/* ═══ TIMELINE ═══ */}
      {activeTab==="rihlah"&&rihlahTab==="timeline"&&(
        <div ref={rihlahScrollRef} style={{flex:1,overflowY:"auto",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",padding:"16px 16px 64px"}} className="fi gold-particles">

          {/* Header */}
          <div style={{marginBottom:22}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div className="sbtn" onClick={()=>setRihlahTab("home")} style={{padding:"6px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(217,177,95,0.12)",borderRadius:8,fontSize:11,color:"rgba(243,231,200,0.50)"}}>← Back</div>
              <div className="sbtn" onClick={()=>setRihlahTab("adjust")} style={{padding:"6px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(217,177,95,0.12)",borderRadius:8,fontSize:11,color:"rgba(243,231,200,0.50)"}}>⚙️ Adjust</div>
            </div>
            <div style={{fontSize:9,color:"rgba(217,177,95,0.60)",letterSpacing:".18em",textTransform:"uppercase",fontWeight:600}}>My Plan</div>
          </div>

          {/* ── GOAL SECTION ── */}
          <div style={{marginBottom:24}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#F3E7C8",fontWeight:700,lineHeight:1.2,marginBottom:6}}>
              {goalYears}-Year{goalMonths>0?` ${goalMonths}-Month`:""} Hifz Plan
            </div>
            <div style={{fontSize:13,color:"rgba(243,231,200,0.45)"}}>
              {dailyNew} ayahs per day · {timeline.juzLeft} juz remaining
            </div>
            <div style={{fontSize:12,color:"rgba(230,184,74,0.40)",marginTop:6}}>
              You are on track — Alhamdulillah
            </div>
            <div style={{marginTop:12,position:"relative"}}>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:5}}>
                <div style={{fontSize:11,color:"rgba(230,184,74,0.55)",fontFamily:"'IBM Plex Mono',monospace"}}>{pct}% · Juz {sessionJuz||"\u2014"}</div>
              </div>
              {/* Gold dust glow behind bar */}
              <div style={{position:"absolute",top:"50%",left:`${Math.max(5,pct/2)}%`,width:`${Math.max(30,pct)}%`,height:60,transform:"translateY(-40%)",background:`radial-gradient(ellipse at center,rgba(212,175,55,${(0.06+pct*0.002).toFixed(3)}) 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>
              <div style={{position:"relative",zIndex:1,height:10,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                <div className="pbfill" style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,#8B7030,#D4AF37 ${Math.max(40,pct)}%,#F6E27A)`,borderRadius:999,boxShadow:`0 0 ${8+Math.round(pct*0.18)}px rgba(212,175,55,${(0.20+pct*0.006).toFixed(2)}), 0 0 ${3+Math.round(pct*0.08)}px rgba(246,226,122,${(0.10+pct*0.004).toFixed(2)})`}}/>
              </div>
            </div>
          </div>

          {/* ── YOUR PACE ── */}
          <div style={{padding:"16px",borderRadius:16,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(217,177,95,0.18)",marginBottom:14,boxShadow:"0 4px 16px rgba(0,0,0,0.22),0 0 10px rgba(217,177,95,0.06)"}}>
            <div style={{fontSize:11,color:"rgba(217,177,95,0.55)",fontWeight:600,letterSpacing:".08em",marginBottom:12}}>Your Pace</div>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0"}}>
              <span style={{fontSize:14}}>📖</span>
              <span style={{fontSize:14,color:"#F3E7C8",fontWeight:600}}>{dailyNew} ayahs / day</span>
            </div>
            <div style={{height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.35) 50%,rgba(217,177,95,0) 100%)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0"}}>
              <span style={{fontSize:14}}>📆</span>
              <span style={{fontSize:14,color:"#F3E7C8",fontWeight:600}}>{timeline.juzPerMonth} juz / month</span>
            </div>
          </div>

          {/* ── TODAY'S FLOW ── */}
          <div style={{padding:"16px",borderRadius:16,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(217,177,95,0.18)",marginBottom:14,boxShadow:"0 4px 16px rgba(0,0,0,0.22),0 0 10px rgba(217,177,95,0.06)"}}>
            <div style={{fontSize:11,color:"rgba(217,177,95,0.55)",fontWeight:600,letterSpacing:".08em",marginBottom:14}}>Your Daily Plan</div>
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {[
                {icon:"\u{1F305}",name:"Fajr",label:"Begin your memorization",desc:`Memorize ${dailyNew} new ayahs \u2014 repeat each until it sticks`,glow:"rgba(240,192,64,0.35)"},
                {icon:"\u2600\uFE0F",name:"Dhuhr",label:"Review what you learned",desc:"Go over what you memorized earlier",glow:"rgba(246,166,35,0.30)"},
                {icon:"\u{1F324}\uFE0F",name:"Asr",label:"Strengthen your memorization",desc:"Cycle through completed sections",glow:"rgba(78,205,196,0.25)"},
                {icon:"\u{1F306}",name:"Maghrib",label:"Listen carefully and follow along",desc:"Listen and follow along (15\u201320 min)",glow:"rgba(183,148,244,0.25)"},
                {icon:"\u{1F319}",name:"Isha",label:"Complete today's journey",desc:"Recite everything one final time",glow:"rgba(104,211,145,0.25)"},
              ].map((s,i,arr)=>(
                <div key={s.name}>
                  <div style={{padding:"12px 0"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:30,height:30,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,background:`radial-gradient(circle,${s.glow} 0%,transparent 70%)`,filter:`drop-shadow(0 0 6px ${s.glow})`}}>{s.icon}</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}><span style={{color:"#E6B84A",textShadow:"0 0 10px rgba(230,184,74,0.25)"}}>{s.name}</span> <span style={{fontWeight:400,color:"rgba(243,231,200,0.55)"}}>{"\u2014"} {s.label}</span></div>
                        <div style={{fontSize:11,color:"rgba(243,231,200,0.30)",marginTop:2}}>{s.desc}</div>
                      </div>
                    </div>
                  </div>
                  {i<arr.length-1&&<div style={{height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.30) 50%,rgba(217,177,95,0) 100%)"}}/>}
                </div>
              ))}
            </div>
          </div>

          {/* ── GUIDANCE ── */}
          <div style={{padding:"16px",borderRadius:16,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(217,177,95,0.15)",marginBottom:18,boxShadow:"0 4px 16px rgba(0,0,0,0.20),0 0 8px rgba(217,177,95,0.05)"}}>
            <div style={{fontSize:11,color:"rgba(217,177,95,0.70)",fontWeight:700,letterSpacing:".08em",marginBottom:12}}>Principles of Memorization</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                "Memorization becomes firm with constant repetition",
                "Reviewing what you have memorized is more important than taking on new material",
                "Do not move forward until what you have memorized is solid",
                "Small, consistent efforts lead to great results",
              ].map((t,i)=>(
                <div key={i} style={{display:"flex",gap:8,fontSize:12,color:"rgba(243,231,200,0.55)",lineHeight:1.6}}>
                  <span style={{flexShrink:0,color:"rgba(217,177,95,0.45)"}}>·</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,fontSize:10,color:"rgba(217,177,95,0.30)",fontStyle:"italic"}}>Based on the methodology of Shaykh Abdul Muhsin al-Qasim</div>
          </div>

          {/* ── QURAN VERSE (rotates daily) ── */}
          {(()=>{
            const verses=[
              {ar:"\u0648\u064E\u0644\u064E\u0642\u064E\u062F\u0652 \u064A\u064E\u0633\u0651\u064E\u0631\u0652\u0646\u064E\u0627 \u0627\u0644\u0652\u0642\u064F\u0631\u0652\u0622\u0646\u064E \u0644\u0650\u0644\u0630\u0651\u0650\u0643\u0652\u0631\u0650",en:"\"And We have certainly made the Quran easy for remembrance\"",ref:"Al-Qamar 54:17"},
              {ar:"\u0625\u0650\u0646\u0651\u064E\u0627 \u0646\u064E\u062D\u0652\u0646\u064F \u0646\u064E\u0632\u0651\u064E\u0644\u0652\u0646\u064E\u0627 \u0627\u0644\u0630\u0651\u0650\u0643\u0652\u0631\u064E \u0648\u064E\u0625\u0650\u0646\u0651\u064E\u0627 \u0644\u064E\u0647\u064F \u0644\u064E\u062D\u064E\u0627\u0641\u0650\u0638\u064F\u0648\u0646\u064E",en:"\"Indeed, it is We who sent down the reminder and We will be its guardian\"",ref:"Al-Hijr 15:9"},
              {ar:"\u0641\u064E\u0627\u0630\u0652\u0643\u064F\u0631\u064F\u0648\u0646\u0650\u064A \u0623\u064E\u0630\u0652\u0643\u064F\u0631\u0652\u0643\u064F\u0645\u0652",en:"\"So remember Me; I will remember you\"",ref:"Al-Baqarah 2:152"},
              {ar:"\u0631\u064E\u0628\u0651\u0650 \u0632\u0650\u062F\u0652\u0646\u0650\u064A \u0639\u0650\u0644\u0652\u0645\u064B\u0627",en:"\"My Lord, increase me in knowledge\"",ref:"Ta-Ha 20:114"},
              {ar:"\u0648\u064E\u0631\u064E\u062A\u0651\u0650\u0644\u0650 \u0627\u0644\u0652\u0642\u064F\u0631\u0652\u0622\u0646\u064E \u062A\u064E\u0631\u0652\u062A\u0650\u064A\u0644\u064B\u0627",en:"\"And recite the Quran with measured recitation\"",ref:"Al-Muzzammil 73:4"},
              {ar:"\u0648\u064E\u0627\u0635\u0652\u0628\u0650\u0631\u0652 \u0641\u064E\u0625\u0650\u0646\u0651\u064E \u0627\u0644\u0644\u0651\u064E\u0647\u064E \u0644\u064E\u0627 \u064A\u064F\u0636\u0650\u064A\u0639\u064F \u0623\u064E\u062C\u0652\u0631\u064E \u0627\u0644\u0652\u0645\u064F\u062D\u0652\u0633\u0650\u0646\u0650\u064A\u0646\u064E",en:"\"Be patient, for Allah does not let the reward of the good be lost\"",ref:"Hud 11:115"},
              {ar:"\u0625\u0650\u0646\u0651\u064E \u0645\u064E\u0639\u064E \u0627\u0644\u0652\u0639\u064F\u0633\u0652\u0631\u0650 \u064A\u064F\u0633\u0652\u0631\u064B\u0627",en:"\"Indeed, with hardship comes ease\"",ref:"Ash-Sharh 94:6"},
            ];
            const dayIdx=Math.floor(Date.now()/3600000)%verses.length;
            const v=verses[dayIdx];
            return (
          <div style={{padding:"18px",borderRadius:16,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(217,177,95,0.18)",textAlign:"center",marginBottom:18,boxShadow:"0 4px 16px rgba(0,0,0,0.22),0 0 10px rgba(217,177,95,0.06)"}}>
            <div style={{fontFamily:"'Amiri',serif",fontSize:22,color:"#E6B84A",direction:"rtl",marginBottom:8}}>{v.ar}</div>
            <div style={{fontSize:12,color:"rgba(243,231,200,0.45)",fontStyle:"italic",marginBottom:3}}>{v.en}</div>
            <div style={{fontSize:10,color:"rgba(243,231,200,0.22)"}}>{v.ref}</div>
          </div>
            );
          })()}

        </div>
      )}

      {/* ═══ ADJUST PLAN ═══ */}
      {activeTab==="rihlah"&&rihlahTab==="adjust"&&(
        <div ref={rihlahScrollRef} style={{flex:1,overflowY:"auto",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2",padding:"16px 16px 64px"}} className="fi gold-particles">
          {/* Header */}
          <div style={{marginBottom:20}}>
            <div className="sbtn" onClick={()=>setRihlahTab("timeline")} style={{display:"inline-block",padding:"6px 12px",background:dark?"rgba(255,255,255,0.04)":"#EADFC8",border:dark?"1px solid rgba(217,177,95,0.12)":"1px solid rgba(0,0,0,0.08)",borderRadius:8,fontSize:11,color:dark?"rgba(243,231,200,0.50)":"#6B645A",marginBottom:10}}>← Back to My Plan</div>
          </div>

          {/* ── HERO CARD ── */}
          <div style={{padding:"22px 18px",borderRadius:20,marginBottom:16,textAlign:"center",position:"relative",overflow:"hidden",
            background:dark?"linear-gradient(180deg,rgba(15,26,43,0.97) 0%,rgba(12,21,38,0.99) 100%)":"#EADFC8",
            border:dark?"1px solid rgba(217,177,95,0.22)":"1px solid rgba(0,0,0,0.08)",boxShadow:dark?"0 10px 40px rgba(0,0,0,0.40),0 0 20px rgba(217,177,95,0.08)":"0 4px 16px rgba(0,0,0,0.06)"}}>
            <div style={{position:"absolute",inset:0,pointerEvents:"none",background:dark?"radial-gradient(circle at 50% 20%,rgba(212,175,55,0.08) 0%,transparent 50%)":"none"}}/>
            <div style={{position:"relative",zIndex:1}}>
              <div style={{fontSize:13,color:dark?"rgba(243,231,200,0.50)":"#6B645A",marginBottom:8}}>Complete Your Hifz In</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,color:dark?"#F6E27A":"#D4AF37",fontWeight:700,marginBottom:10,textShadow:dark?"0 0 18px rgba(246,226,122,0.15)":"none"}}>
                {goalYears} Year{goalYears!==1?"s":""}{goalMonths>0?<span style={{fontSize:24,marginLeft:8}}>{goalMonths} Month{goalMonths!==1?"s":""}</span>:""}
              </div>
              <div style={{fontSize:11,color:dark?"rgba(243,231,200,0.35)":"#6B645A"}}>Your path to completion</div>
            </div>
          </div>

          {/* ── SLIDERS ── */}
          <div style={{padding:"16px 18px",borderRadius:16,background:dark?"rgba(255,255,255,0.02)":"#EADFC8",border:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(0,0,0,0.08)",marginBottom:16,boxShadow:dark?"0 4px 16px rgba(0,0,0,0.22),0 0 10px rgba(217,177,95,0.05)":"0 2px 8px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:12,color:dark?"rgba(243,231,200,0.50)":"#6B645A"}}>Base Timeline</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,color:dark?"#E6B84A":"#D4AF37",fontWeight:600}}>{goalYears} Year{goalYears!==1?"s":""}</span>
            </div>
            <input type="range" min={1} max={10} value={goalYears} onChange={e=>setGoalYears(Number(e.target.value))} style={{width:"100%",marginBottom:16}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:12,color:dark?"rgba(243,231,200,0.50)":"#6B645A"}}>Extra Buffer</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,color:dark?"#E6B84A":"#D4AF37",fontWeight:600}}>+{goalMonths} Month{goalMonths!==1?"s":""}</span>
            </div>
            <input type="range" min={0} max={11} value={goalMonths} onChange={e=>setGoalMonths(Number(e.target.value))} style={{width:"100%"}}/>
          </div>

          {/* ── STATS ── */}
          <div style={{padding:"16px 18px",borderRadius:16,background:dark?"rgba(255,255,255,0.02)":"#EADFC8",border:dark?"1px solid rgba(217,177,95,0.18)":"1px solid rgba(0,0,0,0.08)",marginBottom:16,boxShadow:dark?"0 4px 16px rgba(0,0,0,0.22),0 0 10px rgba(217,177,95,0.05)":"0 2px 8px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}>
              <span style={{fontSize:14}}>{"\uD83D\uDCD6"}</span>
              <span style={{fontSize:13,color:dark?"rgba(243,231,200,0.60)":"#2D2A26"}}>{dailyNew} ayahs per day</span>
            </div>
            <div style={{height:1,background:dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.25) 50%,rgba(217,177,95,0) 100%)":"linear-gradient(90deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0.08) 50%,rgba(0,0,0,0) 100%)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",position:"relative"}}>
              <div style={{position:"absolute",inset:0,pointerEvents:"none",background:dark?"radial-gradient(ellipse at 30% 50%,rgba(212,175,55,0.06) 0%,transparent 60%)":"none"}}/>
              <span style={{fontSize:16,position:"relative",zIndex:1}}>{"\uD83D\uDCC6"}</span>
              <span style={{fontSize:16,color:dark?"#F6E27A":"#D4AF37",fontWeight:700,position:"relative",zIndex:1,textShadow:dark?"0 0 10px rgba(246,226,122,0.20)":"none"}}>~{timeline.daysPerJuz} days per juz</span>
            </div>
            <div style={{height:1,background:dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.25) 50%,rgba(217,177,95,0) 100%)":"linear-gradient(90deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0.08) 50%,rgba(0,0,0,0) 100%)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}>
              <span style={{fontSize:14}}>{"\uD83D\uDCCA"}</span>
              <span style={{fontSize:13,color:dark?"rgba(243,231,200,0.45)":"#2D2A26"}}>{timeline.juzPerMonth} juz per month</span>
            </div>
          </div>

          {/* ── CHOOSE YOUR PACE ── */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:dark?"rgba(217,177,95,0.55)":"#6B645A",fontWeight:600,letterSpacing:".08em",marginBottom:12}}>Choose Your Pace</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              {[
                {y:1,label:"Intense",icon:"\u26A1"},
                {y:2,label:"Focused",icon:"\uD83D\uDD25"},
              ].map(p=>{
                const t=calcTimeline(p.y,memorizedAyahs,0,null,completedCount);
                const isA=p.y===goalYears;
                return (
                  <div key={p.y} className="sbtn" onClick={()=>{setGoalYears(p.y);setGoalMonths(0);}}
                    style={{padding:"12px 8px",borderRadius:14,textAlign:"center",
                      background:isA?(dark?"rgba(230,184,74,0.10)":"rgba(212,175,55,0.12)"):(dark?"rgba(255,255,255,0.02)":"#EADFC8"),
                      border:`1px solid ${isA?(dark?"rgba(232,200,120,0.50)":"#D4AF37"):(dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.08)")}`,
                      boxShadow:isA?"0 0 16px rgba(230,184,74,0.15)":"none",transition:"all .18s"}}>
                    <div style={{fontSize:13,color:isA?(dark?"#F6E27A":"#D4AF37"):(dark?"rgba(243,231,200,0.50)":"#2D2A26"),fontWeight:700}}>{p.y} Year{p.y!==1?"s":""}</div>
                    <div style={{fontSize:11,color:isA?(dark?"#E6B84A":"#D4AF37"):(dark?"rgba(243,231,200,0.30)":"#6B645A"),fontWeight:600,marginTop:2}}>{Math.round(parseFloat(t.ayahsPerDay))} ayahs/day</div>
                    <div style={{height:1,margin:"6px 8px 0",background:dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.20) 50%,rgba(217,177,95,0) 100%)":"linear-gradient(90deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0.06) 50%,rgba(0,0,0,0) 100%)"}}/>
                    <div style={{fontSize:9,color:isA?(dark?"rgba(230,184,74,0.65)":"#D4AF37"):(dark?"rgba(243,231,200,0.22)":"#6B645A"),marginTop:6}}>{p.icon} {p.label}</div>
                  </div>
                );
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[
                {y:3,label:"Balanced",icon:"\u2705"},
                {y:5,label:"Light",icon:"\uD83E\uDDD8"},
                {y:7,label:"Gentle",icon:"\uD83C\uDF19"},
              ].map(p=>{
                const t=calcTimeline(p.y,memorizedAyahs,0,null,completedCount);
                const isA=p.y===goalYears;
                return (
                  <div key={p.y} className="sbtn" onClick={()=>{setGoalYears(p.y);setGoalMonths(0);}}
                    style={{padding:"12px 8px",borderRadius:14,textAlign:"center",
                      background:isA?(dark?"rgba(230,184,74,0.10)":"rgba(212,175,55,0.12)"):(dark?"rgba(255,255,255,0.02)":"#EADFC8"),
                      border:`1px solid ${isA?(dark?"rgba(232,200,120,0.50)":"#D4AF37"):(dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.08)")}`,
                      boxShadow:isA?"0 0 16px rgba(230,184,74,0.15)":"none",transition:"all .18s"}}>
                    <div style={{fontSize:13,color:isA?(dark?"#F6E27A":"#D4AF37"):(dark?"rgba(243,231,200,0.50)":"#2D2A26"),fontWeight:700}}>{p.y} Year{p.y!==1?"s":""}</div>
                    <div style={{fontSize:11,color:isA?(dark?"#E6B84A":"#D4AF37"):(dark?"rgba(243,231,200,0.30)":"#6B645A"),fontWeight:600,marginTop:2}}>{Math.round(parseFloat(t.ayahsPerDay))} ayahs/day</div>
                    <div style={{height:1,margin:"6px 8px 0",background:dark?"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.20) 50%,rgba(217,177,95,0) 100%)":"linear-gradient(90deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0.06) 50%,rgba(0,0,0,0) 100%)"}}/>
                    <div style={{fontSize:9,color:isA?(dark?"rgba(230,184,74,0.65)":"#D4AF37"):(dark?"rgba(243,231,200,0.22)":"#6B645A"),marginTop:6}}>{p.icon} {p.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── MOTIVATIONAL LINE ── */}
          <div style={{textAlign:"center",padding:"14px 10px",marginBottom:20}}>
            <div style={{fontSize:12,color:"rgba(243,231,200,0.35)",lineHeight:1.7}}>
              This plan requires consistency, not perfection.<br/>
              Small daily effort leads to completion — <span style={{fontFamily:"'Amiri',serif",fontSize:14,color:"rgba(230,184,74,0.50)"}}>{"\u0628\u0650\u0625\u0630\u0652\u0646\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650"}</span>
            </div>
          </div>

          {/* ── SAVE CTA ── */}
          <div className="sbtn" onClick={()=>setRihlahTab("timeline")}
            style={{width:"100%",padding:"15px",borderRadius:16,textAlign:"center",fontSize:15,fontWeight:700,
              color:"#0B1220",background:"linear-gradient(180deg,#E6B84A,#D4A62A)",boxShadow:"0 8px 22px rgba(230,184,74,0.25),0 0 12px rgba(230,184,74,0.10)"}}>
            Save & Return
          </div>
        </div>
      )}

      {/* ── Juz Selector Modal ── */}
      {showJuzModal&&(()=>{
        // Find the furthest juz the user has reached (first incomplete in hifz order 30→1)
        const isJuzDone=(n)=>juzStatus[n]==="complete"||(JUZ_SURAHS[n]||[]).every(s=>juzStatus[`s${s.s}`]==="complete");
        let furthestJuz=30;
        for(let j=30;j>=1;j--){ if(!isJuzDone(j)){ furthestJuz=j; break; } }
        const furthestOrder=(JUZ_META.find(j=>j.num===furthestJuz)||{}).order||1;
        const isJuzUnlocked=(juzNum)=>{
          if(juzNum===sessionJuz) return true;
          if(juzStatus[juzNum]==="complete") return true;
          const surahs=JUZ_SURAHS[juzNum]||[];
          if(surahs.some(s=>juzStatus[`s${s.s}`]==="complete")) return true;
          const jOrder=(JUZ_META.find(j=>j.num===juzNum)||{}).order||99;
          return jOrder<=furthestOrder;
        };
        return (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.80)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowJuzModal(false)}>
          <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",padding:"16px 18px 32px",width:"100%",maxWidth:520,maxHeight:"70vh",overflowY:"auto",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,background:"rgba(255,255,255,0.10)",borderRadius:2,margin:"0 auto 14px"}}/>

            {/* Header divider */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.50) 100%)"}}/>
              <div style={{fontSize:9,color:"rgba(217,177,95,0.70)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600,whiteSpace:"nowrap"}}>Select Juz</div>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(232,200,120,0.50) 0%,rgba(217,177,95,0) 100%)"}}/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,paddingBottom:8}}>
              {JUZ_META.slice().reverse().map(j=>{
                const isSel=sessionJuz===j.num;
                const isDone=juzStatus[j.num]==="complete"||(JUZ_SURAHS[j.num]||[]).every(s=>juzStatus[`s${s.s}`]==="complete");
                const unlocked=isJuzUnlocked(j.num);
                return (
                  <div key={j.num} className={unlocked?"sbtn":""} onClick={()=>{ if(!unlocked)return; setJuzProgress(prev=>({...prev,[sessionJuz]:sessionIdx})); setSessionJuz(j.num); setSessionIdx(juzProgress[j.num]||0); setRepCounts({}); setOpenAyah(null); setShowJuzModal(false); }}
                    style={{padding:"13px 16px",borderRadius:14,textAlign:"center",transition:"all .18s",
                      background:isSel?"rgba(217,177,95,0.12)":isDone?"rgba(217,177,95,0.06)":unlocked?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.02)",
                      border:`1px solid ${isSel?"rgba(232,200,120,0.65)":isDone?"rgba(217,177,95,0.25)":unlocked?"rgba(217,177,95,0.12)":"rgba(255,255,255,0.03)"}`,
                      boxShadow:isSel?"0 0 28px rgba(232,200,120,0.30),0 0 8px rgba(217,177,95,0.20),inset 0 0 14px rgba(217,177,95,0.08)":"none",
                      opacity:unlocked?1:0.3,
                      pointerEvents:unlocked?"auto":"none"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:isSel?"#F6E27A":isDone?"#E2BC72":unlocked?"rgba(243,231,200,0.70)":"rgba(243,231,200,0.30)",fontWeight:600}}>Juz {j.num}</div>
                    {isDone&&(
                      <div style={{fontSize:10,color:isSel?"rgba(246,226,122,0.60)":"rgba(230,184,74,0.55)",marginTop:4,textShadow:"0 0 8px rgba(230,184,74,0.15)"}}>Complete — Alhamdulillah</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        );
      })()}

      {/* Mushaf Audio Range Picker */}
      {showMushafRangePicker&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowMushafRangePicker(false)}>
          <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",padding:"16px 18px 32px",width:"100%",maxWidth:520,maxHeight:"70vh",overflowY:"auto",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,background:"rgba(255,255,255,0.10)",borderRadius:2,margin:"0 auto 14px"}}/>

            {/* Header */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(217,177,95,0),rgba(232,200,120,0.50))"}}/>
              <div style={{fontSize:9,color:"rgba(217,177,95,0.70)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600}}>Select Ayah Range</div>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(232,200,120,0.50),rgba(217,177,95,0))"}}/>
            </div>
            <div style={{fontSize:11,color:"rgba(217,177,95,0.40)",textAlign:"center",marginBottom:16}}>Page {mushafPage} · {mushafVerses.length} ayahs</div>

            {/* Ayah list — tap to set start/end */}
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
              {mushafVerses.map((v,i)=>{
                const vKey=v.verse_key;
                const [s,a]=vKey.split(":");
                const ayahNum=Number(a);
                const isStart=mushafRangeStart===i;
                const isEnd=mushafRangeEnd===i;
                const inRange=mushafRangeStart!==null&&mushafRangeEnd!==null&&i>=mushafRangeStart&&i<=mushafRangeEnd;
                return(
                  <div key={vKey} className="sbtn"
                    onClick={()=>{
                      if(mushafRangeStart===null||mushafRangeEnd!==null){
                        setMushafRangeStart(i); setMushafRangeEnd(null);
                      } else if(i<mushafRangeStart){
                        setMushafRangeStart(i);
                      } else {
                        setMushafRangeEnd(i);
                      }
                    }}
                    style={{padding:"10px 14px",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between",
                      background:inRange?"rgba(217,177,95,0.10)":isStart||isEnd?"rgba(217,177,95,0.14)":"rgba(255,255,255,0.03)",
                      border:`1px solid ${isStart?"rgba(232,200,120,0.70)":isEnd?"rgba(232,200,120,0.50)":inRange?"rgba(217,177,95,0.20)":"rgba(217,177,95,0.08)"}`,
                    }}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{fontSize:10,fontFamily:"'IBM Plex Mono',monospace",color:"rgba(217,177,95,0.40)",width:24}}>{ayahNum}</div>
                      <div style={{fontSize:12,color:inRange||isStart||isEnd?"#F5E6B3":"rgba(243,231,200,0.55)",direction:"rtl",maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.text_uthmani||""}</div>
                    </div>
                    <div style={{fontSize:10,color:isStart?"#F6E27A":isEnd?"rgba(246,226,122,0.60)":"transparent",fontWeight:600,flexShrink:0}}>
                      {isStart?"START":isEnd?"END":""}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Play button */}
            <div className="sbtn"
              onClick={()=>{
                const start=mushafRangeStart??0;
                const end=mushafRangeEnd??mushafVerses.length-1;
                const slice=mushafVerses.slice(start,end+1);
                setShowMushafRangePicker(false);
                playMushafRange(slice);
              }}
              style={{width:"100%",padding:"14px",borderRadius:14,textAlign:"center",background:mushafRangeStart!==null?"linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)":"rgba(255,255,255,0.04)",color:mushafRangeStart!==null?"#060A07":"rgba(243,231,200,0.30)",fontSize:14,fontWeight:700,border:`1px solid ${mushafRangeStart!==null?"transparent":"rgba(217,177,95,0.12)"}`,boxShadow:mushafRangeStart!==null?"0 8px 24px rgba(212,175,55,0.22)":"none"}}>
              {mushafRangeStart===null?"Tap an ayah to set start range":`Play Ayah ${Number(mushafVerses[mushafRangeStart]?.verse_key?.split(":")?.[1])} → ${Number(mushafVerses[mushafRangeEnd??mushafVerses.length-1]?.verse_key?.split(":")?.[1])}`}
            </div>
          </div>
        </div>
      )}

      {/* Quran Juz Picker Modal */}
      {showQuranJuzModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.80)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowQuranJuzModal(false)}>
          <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",padding:"16px 18px 32px",width:"100%",maxWidth:520,maxHeight:"70vh",overflowY:"auto",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,background:"rgba(255,255,255,0.10)",borderRadius:2,margin:"0 auto 14px"}}/>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.50) 100%)"}}/>
              <div style={{fontSize:9,color:"rgba(217,177,95,0.70)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600}}>Select Juz</div>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(232,200,120,0.50) 0%,rgba(217,177,95,0) 100%)"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {Array.from({length:30},(_,i)=>i+1).map(jNum=>{
                const isSel=mushafJuzNum===jNum;
                const pg=JUZ_PAGES[jNum-1]||1;
                return(
                  <div key={jNum} className="sbtn" onClick={()=>{setMushafJuzNum(jNum);setMushafPage(pg);setShowQuranJuzModal(false);}}
                    style={{padding:"13px 16px",borderRadius:14,textAlign:"center",
                      background:isSel?"rgba(217,177,95,0.12)":"rgba(255,255,255,0.03)",
                      border:`1px solid ${isSel?"rgba(232,200,120,0.65)":"rgba(217,177,95,0.12)"}`,
                      boxShadow:isSel?"0 0 28px rgba(232,200,120,0.30),inset 0 0 14px rgba(217,177,95,0.08)":"none"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:600,color:isSel?"#F6E27A":"rgba(243,231,200,0.70)"}}>Juz {jNum}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quran Surah Picker Modal */}
      {showQuranSurahModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.80)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowQuranSurahModal(false)}>
          <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",padding:"16px 18px 32px",width:"100%",maxWidth:520,maxHeight:"75vh",overflowY:"auto",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,background:"rgba(255,255,255,0.10)",borderRadius:2,margin:"0 auto 14px"}}/>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(217,177,95,0) 0%,rgba(232,200,120,0.50) 100%)"}}/>
              <div style={{fontSize:9,color:"rgba(217,177,95,0.70)",letterSpacing:".22em",textTransform:"uppercase",fontWeight:600}}>Select Surah</div>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(232,200,120,0.50) 0%,rgba(217,177,95,0) 100%)"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {Object.entries(SURAH_PAGES).map(([num,pg])=>{
                const n=Number(num);
                const isSel=mushafSurahNum===n;
                return(
                  <div key={n} className="sbtn" onClick={()=>{setMushafPage(pg);setShowQuranSurahModal(false);}}
                    style={{padding:"13px 16px",borderRadius:14,textAlign:"center",
                      background:isSel?"rgba(217,177,95,0.12)":"rgba(255,255,255,0.03)",
                      border:`1px solid ${isSel?"rgba(232,200,120,0.65)":"rgba(217,177,95,0.12)"}`,
                      boxShadow:isSel?"0 0 28px rgba(232,200,120,0.30),inset 0 0 14px rgba(217,177,95,0.08)":"none"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:isSel?600:400,color:isSel?"#F6E27A":"rgba(243,231,200,0.70)",marginBottom:2}}>{SURAH_EN[n]}</div>
                    <div style={{fontSize:11,color:isSel?"rgba(246,226,122,0.60)":"rgba(217,177,95,0.35)",direction:"rtl"}}>{SURAH_AR[n]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quran Reciter Modal */}
{showReciterModal&&(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.80)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowReciterModal(false)}>
    <div style={{background:dark?"linear-gradient(180deg,#0E1628 0%,#080E1A 100%)":"#EADFC8",borderRadius:"18px 18px 0 0",width:"100%",maxWidth:500,maxHeight:"68vh",display:"flex",flexDirection:"column",border:"1px solid rgba(217,177,95,0.12)",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.40)"}} onClick={e=>e.stopPropagation()}>

      {/* ── Handle + Header ── */}
      <div style={{padding:"12px 18px 0",textAlign:"center"}}>
        <div style={{width:36,height:4,background:"rgba(255,255,255,0.10)",borderRadius:2,margin:"0 auto 12px"}}/>
        <div style={{fontSize:13,fontWeight:700,color:"#F3E7C8",letterSpacing:".03em"}}>Select Reciter</div>
        <div style={{fontSize:11,color:"rgba(243,231,200,0.40)",marginTop:4,marginBottom:10}}>
          Currently: <span style={{color:"rgba(230,184,74,0.75)",fontWeight:600}}>{reciterMode==="quran"?(QURAN_RECITERS.find(r=>r.id===quranReciter)?.name||"Unknown"):currentReciter.name}</span>
        </div>
      </div>

      {/* ── Reciter list ── */}
      <div style={{overflowY:"auto",padding:"0 12px 28px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {QURAN_RECITERS.map(r=>{
            const isSelected=(reciterMode==="quran"?quranReciter:reciter)===r.id;
            return (
              <div key={r.id} className="sbtn" onClick={()=>{
                if(reciterMode==="quran"){
                  setQuranReciter(r.id);
                  setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null);
                  if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; }
                } else { setReciter(r.id); }
                setShowReciterModal(false);
              }} style={{display:"flex",alignItems:"center",gap:10,padding:"13px 12px",borderRadius:12,transition:"all .15s",
                background:isSelected?"rgba(230,184,74,0.08)":"rgba(255,255,255,0.02)",
                border:`1px solid ${isSelected?"rgba(230,184,74,0.30)":"rgba(255,255,255,0.04)"}`,
                boxShadow:isSelected?"0 0 14px rgba(230,184,74,0.08),inset 0 0 12px rgba(230,184,74,0.06)":"none"}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:isSelected?"rgba(230,184,74,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${isSelected?"rgba(230,184,74,0.25)":"rgba(255,255,255,0.06)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12}}>🎙️</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:isSelected?700:400,color:isSelected?"#F3E7C8":"rgba(243,231,200,0.65)"}}>{r.name}</div>
                  <div style={{fontFamily:"'Amiri',serif",fontSize:12,color:isSelected?"rgba(230,184,74,0.55)":"rgba(243,231,200,0.30)",marginTop:1}}>{r.arabic}</div>
                </div>
                {isSelected&&<div style={{fontSize:14,color:"#E6B84A",fontWeight:700,flexShrink:0}}>✓</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
)}

      {activeTab==="masjidayn"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Sub-tab navigation */}
          <div style={{display:"flex",background:T.surface,borderBottom:`1px solid ${T.border}` }}>
            {[
              {id:"live",     label:"📡 Now Live"},
              {id:"ramadan",  label:"🌙 Ramadan 1447 · 2026"},
              {id:"haramain", label:"🎙️ Imams"},
              {id:"about",    label:"ℹ️ About"},
            ].map(t=>(
              <div key={t.id} onClick={()=>setMasjidaynTab(t.id)} style={{flex:1,padding:"10px 6px", textAlign:"center",fontSize:11,fontWeight:masjidaynTab===t.id?700:400,color:masjidaynTab===t.id?T.accent:T.dim,borderBottom:`2px solid ${masjidaynTab===t.id?T.accent:"transparent"}`,cursor:"pointer"}}>
                {t.label}
                </div>
            ))}
          </div>
    
      {/* ═══ LIVE TAB — embedded in-app ═══ */}
      {activeTab==="masjidayn"&&masjidaynTab==="live"&&(()=>{
        // Official channel IDs from Wikidata (verified)
        // saudiqurantv  → UCos52azQNBgW63_9uDJoPDA (Makkah)
        // saudisunnahtv → UCROKYPep-UuODNwyipe6JMw (Madinah)
        const streams = [
          { id:"makkah",  icon:"🕋", label:"Makkah",  name:"Masjid Al-Haram",     arabic:"قناة القرآن الكريم",  color:"#E5534B",
            channelId:"UCos52azQNBgW63_9uDJoPDA",  handle:"@saudiqurantv" },
          { id:"madinah", icon:"🌙", label:"Madinah", name:"Masjid An-Nabawi",    arabic:"قناة السنة النبوية",  color:"#F0C040",
            channelId:"UCROKYPep-UuODNwyipe6JMw",  handle:"@saudisunnahtv" },
        ];
        const s = streams[activeStream];
        const embedSrc = `https://www.youtube.com/embed/live_stream?channel=${s.channelId}&autoplay=1&rel=0`;

        return (
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} className="fi">

            {/* Selector */}
            <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"10px 14px",flexShrink:0}}>
              <div style={{display:"flex",gap:8}}>
                {streams.map((st,i)=>(
                  <div key={i} className="sbtn" onClick={()=>setActiveStream(i)} style={{flex:1,padding:"10px 12px",borderRadius:7,background:activeStream===i?`${st.color}18`:T.surface2,border:`1px solid ${activeStream===i?st.color+"60":T.border}`,textAlign:"center"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginBottom:3}}>
                      <div className="pulse" style={{width:7,height:7,borderRadius:"50%",background:st.color}}/>
                      <span style={{fontSize:9,color:st.color,fontFamily:"'IBM Plex Mono',monospace",fontWeight:600}}>LIVE</span>
                    </div>
                    <div style={{fontSize:13,fontWeight:activeStream===i?600:400,color:activeStream===i?T.text:T.sub}}>{st.icon} {st.label}</div>
                    <div style={{fontSize:9,color:activeStream===i?st.color:T.dim,marginTop:1,direction:"rtl"}}>{st.arabic}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Big Watch Live buttons */}
            <div style={{flex:1,overflowY:"auto",padding:"16px 14px 32px",display:"flex",flexDirection:"column",gap:12}}>
              {streams.map((st,i)=>(
                <a key={i} href={`https://www.youtube.com/${st.handle}/live`} target="_blank" rel="noreferrer"
                  style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                    padding:"32px 20px",borderRadius:12,textDecoration:"none",
                    background:`${st.color}15`,border:`2px solid ${st.color}50`,gap:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div className="pulse" style={{width:10,height:10,borderRadius:"50%",background:st.color}}/>
                    <span style={{fontSize:10,color:st.color,fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,letterSpacing:".15em"}}>LIVE NOW</span>
                  </div>
                  <div style={{fontSize:22}}>{st.icon}</div>
                  <div style={{fontSize:16,fontWeight:700,color:T.text}}>{st.name}</div>
                  <div style={{fontSize:11,color:T.dim,direction:"rtl"}}>{st.arabic}</div>
                  <div style={{marginTop:8,padding:"12px 32px",background:st.color,borderRadius:8,
                    fontSize:14,fontWeight:700,color:dark?"#060A07":"#fff"}}>
                    ▶ Watch {st.label} Live
                  </div>
                  <div style={{fontSize:10,color:T.dim}}>Opens official livestream on YouTube</div>
                </a>
              ))}
              <div style={{padding:"12px 14px",background:T.surface,border:`1px solid ${T.accent}20`,borderRadius:8,textAlign:"center"}}>
                <div style={{fontFamily:"'Amiri',serif",fontSize:18,color:T.accent,direction:"rtl",marginBottom:4}}>اللَّهُمَّ ارْزُقْنَا زِيَارَةَ بَيْتِكَ الْحَرَامِ</div>
                <div style={{fontSize:10,color:T.sub,fontStyle:"italic",marginBottom:2}}>"O Allah, grant us the visit to Your Sacred House"</div>
                <div style={{fontSize:9,color:T.dim}}>Insha'Allah ya Jalil — the hijrah is coming 🤲</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ RAMADAN 1447 — Sheikh Badr Al-Turki all 30 nights ═══ */}
      {activeTab==="masjidayn"&&masjidaynTab==="ramadan"&&(()=>{
        // Ramadan 1447/2026 — Full night videos by Sheikh Badr Al-Turki
        // ▶ = plays in app | null = opens his YouTube channel
        // Add more IDs here as you get them — just share a link!
        const NIGHTS = [
          {n:1,  taraweeh:"lRwXLCF8Udk", tahajjud:null},
          {n:2,  taraweeh:"aBzvj0UHXsQ", tahajjud:null},
          {n:3,  taraweeh:"Vkd3P7PlsLQ", tahajjud:null},
          {n:4,  taraweeh:"_q0DAbkKDEY", tahajjud:null},
          {n:5,  taraweeh:"KzRlzHbsuUc", tahajjud:null},
          {n:6,  taraweeh:"9f8tyJ7ZyIw", tahajjud:null},
          {n:7,  taraweeh:"N1JHCv05Rhw", tahajjud:null},
          {n:8,  taraweeh:"6BEn6PD2vjU", tahajjud:null},
          {n:9,  taraweeh:"1nnvyGOjpx8", tahajjud:null},
          {n:10, taraweeh:"wSnomeZ983I", tahajjud:null},
          {n:11, taraweeh:"I-urbxpNqHU", tahajjud:null},
          {n:12, taraweeh:"ODIE3PM6kSU", tahajjud:null},
          {n:13, taraweeh:"PcDI7mbbC88", tahajjud:null},
          {n:14, taraweeh:"-dAdc6dvafc", tahajjud:null},
          {n:15, taraweeh:"vPJDsDCV4t8", tahajjud:null},
          {n:16, taraweeh:"HsBdxGMgLs8", tahajjud:null},
          {n:17, taraweeh:"b_MqX9kAcqE", tahajjud:null},
          {n:18, taraweeh:"0NdZR0MdsSg", tahajjud:null},
          {n:19, taraweeh:"rg5u3pyKXfM", tahajjud:null},
          {n:20, taraweeh:"MbzjYKYjF1Q", tahajjud:null},
          {n:21, taraweeh:"659qlvcZD4Y", tahajjud:null},
          {n:22, taraweeh:"V5nYjrTWT5g", tahajjud:null},
          {n:23, taraweeh:"gRtjM_cwAZc", tahajjud:null},
          {n:24, taraweeh:"C2BOVH9FAus", tahajjud:null},
          {n:25, taraweeh:"zwJvs3A6EjA", tahajjud:null},
          {n:26, taraweeh:"BDlvfPriqu4", tahajjud:null},
          {n:27, taraweeh:"WimoXE57I4g", tahajjud:null},
          {n:28, taraweeh:"Ls7hQl40M-E", tahajjud:null},
          {n:29, taraweeh:"15Mxmi_hmWY", tahajjud:null},
          {n:30, taraweeh:"RSevando-yI", tahajjud:null},
        ];
        const sel = selectedRamadanNight ?? 1;
        const selEntry = NIGHTS.find(x=>x.n===sel);
        const activeId = selEntry?.[ramadanVideoType] ?? selEntry?.taraweeh;
        const hasVideo = !!activeId;
        const activeLabel = ramadanVideoType==="tahajjud" ? "Tahajjud + Witr" : "Taraweeh";

        return (
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} className="fi">

            {/* Header */}
            <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"10px 14px",flexShrink:0}}>
              <div style={{fontSize:9,color:"#E5534B",letterSpacing:".18em",textTransform:"uppercase",marginBottom:2}}>Ramadan 1447 · 2026 · Masjid Al-Haram</div>
              <div style={{fontSize:15,fontWeight:600,color:T.text,marginBottom:1}}>Sheikh Badr Al-Turki — بدر التركي</div>
              <div style={{fontSize:10,color:T.dim}}>
                <span style={{color:"#F0C040"}}>▶</span> Taraweeh  ·  <span style={{color:"#B794F4"}}>▶</span> Tahajjud + Witr  ·  <span style={{color:T.vdim}}>·</span> coming soon
              </div>
            </div>

            {/* Player */}
            <div style={{background:"#000",flexShrink:0}}>
              {hasVideo ? (
                <iframe
                  key={`r${sel}-${ramadanVideoType}`}
                  src={`https://www.youtube.com/embed/${activeId}?autoplay=1&rel=0&start=${activeId==="lRwXLCF8Udk"?2090:0}`}
                  style={{width:"100%",height:220,border:"none",display:"block"}}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`Night ${sel} ${activeLabel} 1447 — Badr Al-Turki`}
                />
              ) : (
                <div style={{height:140,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10}}>
                  <div style={{fontSize:11,color:"#888"}}>Night {sel} {ramadanVideoType} — opens on YouTube</div>
                  <a href="https://www.youtube.com/@sheikh_badr_al_turki/videos" target="_blank" rel="noreferrer"
                     style={{padding:"8px 18px",background:"#E5534B",color:"#fff",borderRadius:6,textDecoration:"none",fontSize:12,fontWeight:700}}>
                    ▶ Open on YouTube
                  </a>
                </div>
              )}
              <div style={{padding:"6px 12px",background:"#111",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:"#E5534B",fontWeight:600}}>Night {sel} · {activeLabel}</span>
                {hasVideo
                  ? <span style={{fontSize:9,color:"#555"}}>▶ in app</span>
                  : <a href="https://www.youtube.com/@sheikh_badr_al_turki/videos" target="_blank" rel="noreferrer"
                       style={{fontSize:9,color:"#E5534B",textDecoration:"none"}}>Open YouTube ↗</a>}
              </div>
            </div>

            {/* Night list */}
            <div style={{flex:1,overflowY:"auto",padding:"12px 14px 40px"}}>

              {/* Nights 1–20 */}
              <div style={{fontSize:9,color:T.dim,letterSpacing:".14em",textTransform:"uppercase",marginBottom:7,display:"flex",alignItems:"center",gap:7}}>
                <span>Nights 1–20</span><div style={{flex:1,height:1,background:T.border}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:16}}>
                {NIGHTS.filter(x=>x.n<=20).map(x=>(
                  <div key={x.n} className="sbtn" onClick={()=>{setSelectedRamadanNight(x.n);setRamadanVideoType("taraweeh");}} style={{
                    display:"flex",alignItems:"center",gap:8,padding:"7px 10px",
                    background:sel===x.n?"#E5534B12":T.surface,
                    border:`1px solid ${sel===x.n?"#E5534B":T.border}`,borderRadius:7,
                  }}>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,color:sel===x.n?"#E5534B":T.dim,width:22,flexShrink:0}}>{x.n}</div>
                    <span style={{fontSize:10,fontWeight:600,color:sel===x.n?"#E5534B":T.sub}}>
                      Night {x.n} ▶
                    </span>
                  </div>
                ))}
              </div>

              {/* Last 10 */}
              <div style={{fontSize:9,color:"#E5534B",letterSpacing:".14em",textTransform:"uppercase",marginBottom:7,display:"flex",alignItems:"center",gap:7}}>
                <span>Last 10 Nights 🌙</span><div style={{flex:1,height:1,background:"#E5534B30"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:14}}>
                {NIGHTS.filter(x=>x.n>=21).map(x=>{
                  const is27=x.n===27;
                  return (
                    <div key={x.n} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",
                      background:is27?"#E5534B12":T.surface,border:`1px solid ${is27?"#E5534B40":T.border}`,borderRadius:7}}>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,
                        color:is27?"#E5534B":T.dim,width:28,flexShrink:0}}>
                        {x.n}{is27&&<span style={{fontSize:8}}> ★</span>}
                      </div>
                      <div className="sbtn" onClick={()=>{setSelectedRamadanNight(x.n);setRamadanVideoType("taraweeh");}} style={{
                        flex:1,padding:"6px 8px",borderRadius:5,textAlign:"center",
                        background:sel===x.n&&ramadanVideoType==="taraweeh"?"#E5534B":"#E5534B15",
                        border:`1px solid ${sel===x.n&&ramadanVideoType==="taraweeh"?"#E5534B":"#E5534B30"}`,
                      }}>
                        <span style={{fontSize:10,fontWeight:600,color:sel===x.n&&ramadanVideoType==="taraweeh"?(dark?"#060A07":"#fff"):"#E5534B"}}>
                          Night {x.n} Taraweeh {x.taraweeh?"▶":"↗"}
                        </span>
                      </div>
                      <div className="sbtn" onClick={()=>{setSelectedRamadanNight(x.n);setRamadanVideoType("tahajjud");}} style={{
                        flex:1,padding:"6px 8px",borderRadius:5,textAlign:"center",
                        background:sel===x.n&&ramadanVideoType==="tahajjud"?"#B794F4":"#B794F415",
                        border:`1px solid ${sel===x.n&&ramadanVideoType==="tahajjud"?"#B794F4":"#B794F430"}`,
                      }}>
                        <span style={{fontSize:10,fontWeight:600,color:sel===x.n&&ramadanVideoType==="tahajjud"?(dark?"#060A07":"#fff"):"#B794F4"}}>
                          Night {x.n} Tahajjud {x.tahajjud?"▶":"↗"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Channel link */}
              <a href="https://www.youtube.com/@sheikh_badr_al_turki/videos" target="_blank" rel="noreferrer"
                 style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",
                   background:T.surface,border:"1px solid #E5534B30",borderRadius:7,textDecoration:"none",marginBottom:16}}>
                <div>
                  <div style={{fontSize:12,color:T.accent,fontWeight:600,marginBottom:1}}>@sheikh_badr_al_turki</div>
                  <div style={{fontSize:10,color:T.dim}}>All 30 nights · Full playlist on YouTube</div>
                </div>
                <div style={{padding:"7px 14px",background:T.accent,color:dark?"#060A07":"#fff",borderRadius:5,fontSize:11,fontWeight:700}}>
                  View All
                </div>
              </a>

              {/* Dua */}
              <div style={{padding:"14px 18px",background:T.surface,border:"1px solid #E5534B20",borderRadius:8,textAlign:"center"}}>
                <div style={{fontFamily:"'Amiri',serif",fontSize:18,color:T.accent,direction:"rtl",marginBottom:6}}>
                  اللَّهُمَّ بَلِّغْنَا رَمَضَانَ وَتَقَبَّلْ مِنَّا
                </div>
                <div style={{fontSize:11,color:T.sub,fontStyle:"italic",marginBottom:2}}>"O Allah, allow us to reach Ramadan and accept it from us"</div>
                <div style={{fontSize:9,color:T.dim}}>Ramadan 1447 · May Allah accept all your prayers and worship 🤲</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ HARAMAIN TAB — FIXED (correct position, accurate notes) ═══ */}
      {activeTab==="masjidayn"&&masjidaynTab==="haramain"&&(()=>{
        const imams = haramainMosque==="makkah" ? MAKKAH_IMAMS : MADINAH_IMAMS;
        const mosqueColor = haramainMosque==="makkah" ? "#E5534B" : "#F0C040";

        return (
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} className="fi">

            {/* Mosque selector */}
            <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"10px 14px",flexShrink:0}}>
              <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase",marginBottom:8}}>Haramain Imams — Quran Recordings</div>
              <div style={{display:"flex",gap:8}}>
                {[
                  {id:"makkah", label:"🕋 Masjid Al-Haram", arabic:"مكة المكرمة", color:"#E5534B"},
                  {id:"madinah",label:"🌙 Masjid An-Nabawi",arabic:"المدينة المنورة",color:"#F0C040"},
                ].map(m=>(
                  <div key={m.id} className="sbtn" onClick={()=>{setHaramainMosque(m.id);setOpenImam(null);}} style={{flex:1,padding:"9px 12px",borderRadius:7,background:haramainMosque===m.id?`${m.color}18`:T.surface2,border:`1px solid ${haramainMosque===m.id?m.color+"60":T.border}`,textAlign:"center"}}>
                    <div style={{fontSize:12,fontWeight:haramainMosque===m.id?600:400,color:haramainMosque===m.id?T.text:T.sub,marginBottom:2}}>{m.label}</div>
                    <div style={{fontSize:9,color:haramainMosque===m.id?m.color:T.dim,direction:"rtl"}}>{m.arabic}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div style={{padding:"8px 14px",borderBottom:`1px solid ${T.border}`,flexShrink:0,display:"flex",gap:14,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#F0C040"}}/>
                <span style={{fontSize:9,color:"#F0C040"}}>Full Quran (114 surahs)</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#F6A623"}}/>
                <span style={{fontSize:9,color:"#F6A623"}}>Partial collection</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#E5534B"}}/>
                <span style={{fontSize:9,color:"#E5534B"}}>Prayer recordings only</span>
              </div>
            </div>

            {/* Imam list */}
            <div style={{flex:1,overflowY:"auto",padding:"12px 14px 40px"}}>
              <div style={{fontSize:10,color:T.dim,marginBottom:10,lineHeight:1.6}}>
                Tap an imam to browse their surah recordings. Source: haramain.info / Internet Archive.
              </div>
              {imams.map((imam)=>{
                const isOpen = openImam===imam.id;
                const isFull = imam.surahCount===114;
                const hasArchive = !!(imam.archive || imam.quranicaudio);
                const badgeColor = isFull ? "#F0C040" : hasArchive ? "#F6A623" : "#E5534B";
                const badgeLabel = isFull ? "✓ Full Quran (114 surahs)" : hasArchive ? "◦ Partial collection" : "✕ Prayer recordings only";
                return (
                  <div key={imam.id} style={{marginBottom:6,border:`1px solid ${isOpen?mosqueColor+"40":T.border}`,borderLeft:`3px solid ${isOpen?mosqueColor:T.border2}`,borderRadius:isOpen?"6px 6px 0 0":"6px",overflow:"hidden"}}>
                    <div className="srow" onClick={()=>setOpenImam(isOpen?null:imam.id)} style={{padding:"11px 14px",background:isOpen?T.surface2:T.surface,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:isOpen?T.text:T.sub}}>{imam.name}</div>
                        <div style={{display:"flex",gap:8,alignItems:"center",marginTop:3,flexWrap:"wrap"}}>
                          <span style={{fontSize:11,color:isOpen?mosqueColor:T.dim,direction:"rtl"}}>{imam.arabic}</span>
                          <span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:`${badgeColor}15`,border:`1px solid ${badgeColor}40`,color:badgeColor}}>
                            {badgeLabel}
                          </span>
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        {hasArchive&&(
                          <a href={`https://archive.org/details/${imam.archive}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:9,color:T.accent,textDecoration:"none",padding:"3px 8px",border:`1px solid ${T.accent}40`,borderRadius:4}}>Archive ↗</a>
                        )}
                        <div style={{color:isOpen?mosqueColor:T.dim,fontSize:16,transition:"transform .2s",transform:isOpen?"rotate(90deg)":"none"}}>›</div>
                      </div>
                    </div>

                    {isOpen&&(
                      !hasArchive ? (
                        <div className="fi" style={{background:T.surface,borderTop:`1px solid ${T.border}`,padding:"16px 14px"}}>
                          <div style={{fontSize:12,color:T.sub,lineHeight:1.7,marginBottom:10}}>
                            📿 <strong style={{color:mosqueColor}}>{imam.name}</strong> leads prayers at the Haramain but does not have a compiled full Quran archive on haramain.info.
                          </div>
                          <div style={{fontSize:11,color:T.dim,lineHeight:1.6,marginBottom:12}}>
                            Daily prayer recordings (Fajr, Maghrib, Isha, Taraweeh) are posted on haramain.info. Check there for his latest recordings.
                          </div>
                          <a href={`https://www.haramain.info/search/label/Sheikh%20Shamsaan%20-%20%D9%84%D9%84%D8%B4%D9%8A%D8%AE%20%D8%A7%D9%84%D8%B4%D9%85%D8%B3%D8%A7%D9%86`} target="_blank" rel="noreferrer" style={{display:"inline-block",fontSize:11,color:T.accent,textDecoration:"none",padding:"7px 14px",border:`1px solid ${T.accent}40`,borderRadius:6}}>
                            View Recordings on Haramain.info ↗
                          </a>
                        </div>
                      ) : (
                        <div className="fi" style={{background:T.surface,borderTop:`1px solid ${mosqueColor}20`,padding:"8px 8px 12px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:4}}>
                          {HARAMAIN_SURAHS.map((name,si)=>{
                            const sNum=si+1;
                            const pkey=`${imam.id}-${sNum}`;
                            const isP=haramainPlaying===pkey;
                            return (
                              <div key={sNum} className="sbtn" onClick={()=>playHaramainSurah(imam,sNum,pkey)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:5,background:isP?`${mosqueColor}15`:T.surface2,border:`1px solid ${isP?mosqueColor:T.border}`}}>
                                <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,background:isP?mosqueColor:T.surface,border:`1px solid ${isP?mosqueColor:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:isP?"#fff":T.dim}}>
                                  {isP?"⏸":"▶"}
                                </div>
                                <div style={{minWidth:0}}>
                                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:isP?mosqueColor:T.vdim}}>{String(sNum).padStart(3,"0")}</div>
                                  <div style={{fontSize:10,color:isP?T.text:T.sub,lineHeight:1.3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
                                </div>
                              </div>
                            );
                          })}
                          {!isFull&&(
                            <div style={{gridColumn:"1/-1",marginTop:4,padding:"7px 10px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:5,fontSize:10,color:T.dim,fontStyle:"italic"}}>
                              ⓘ Partial collection — not all 114 surahs available. Some tracks may not load.
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

    </div>
  )}

      {/* ═══ ABOUT & CREDITS ═══ */}
      {activeTab==="masjidayn"&&masjidaynTab==="about"&&(
        <div style={{flex:1,overflowY:"auto",padding:"20px 18px 80px",background:dark?"linear-gradient(180deg,#0B1220,#0E1628)":"#F3E9D2"}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:dark?"#F6E27A":"#D4AF37",fontWeight:700,marginBottom:4}}>Rihlat Al-Hifz</div>
            <div style={{fontSize:12,color:dark?"rgba(243,231,200,0.50)":"#6B645A"}}>Your Journey to Memorizing the Qur'an</div>
            <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.30)":"#6B645A",marginTop:4}}>Version 1.0 · 2026</div>
          </div>

          {[
            {title:"Quranic Text",items:[
              "Uthmani text provided by Quran.com API (Quran Foundation)",
              "Text data sourced from QuranCDN (api.qurancdn.com)",
              "Mushaf page layout and verse mapping via Quran Foundation resources",
            ]},
            {title:"Translation",items:[
              "English translation: Al-Hilali & Muhammad Muhsin Khan",
              "Translation data served via Quran.com API (Quran Foundation)",
              "Used for educational and da'wah purposes",
            ]},
            {title:"Tafsir",items:[
              "Tafsir As-Sa'di — Shaykh Abdur-Rahman ibn Nasir As-Sa'di",
              "Tafsir Al-Muyassar — King Fahd Complex for the Printing of the Holy Qur'an",
              "Tafsir Ibn Kathir — Imam Isma'il ibn Umar ibn Kathir",
              "All tafsir content served via Quran.com API (Quran Foundation)",
            ]},
            {title:"Recitations & Audio",items:[
              "Ayah-by-ayah recitations via everyayah.com",
              "Full surah recitations via quranicaudio.com (Quran Foundation)",
              "Audio streaming via audio.qurancdn.com (Quran Foundation)",
              "All reciters are credited by name throughout the application",
              "Recitations used for educational purposes — memorization and review",
            ]},
            {title:"Reciters",items:[
              "Masjid Al-Haram: Yasser Al-Dosari, Abdullah Al-Juhany, Abdul Rahman As-Sudais, Saud Ash-Shuraim, Maher Al-Muaiqly, Abu Bakr Ash-Shatri, Hani Ar-Rifai",
              "Masjid An-Nabawi: Ali Al-Hudhaify, Muhammad Ayyoub, Salah Al-Budair, Abdul Muhsin Al-Qasim, Fares Abbad",
              "Other: Mishary Rashid Alafasy, Nasser Al-Qatami",
            ]},
            {title:"Mushaf Images",items:[
              "Mushaf page images based on the Madinah Mushaf",
              "Published by the King Fahd Complex for the Printing of the Holy Qur'an",
              "Used for educational and non-commercial purposes",
            ]},
            {title:"Live Streams & Ramadan Content",items:[
              "Masjid Al-Haram & Masjid An-Nabawi live streams via Saudi Broadcasting Authority (aloula.sa)",
              "Taraweeh recordings sourced from Internet Archive community uploads",
              "Imam data referenced from haramain.info",
            ]},
            {title:"Fonts",items:[
              "UthmanicHafs — Quranic script font (King Fahd Complex)",
              "Amiri & Amiri Quran — Khaled Hosny (SIL Open Font License)",
              "Scheherazade New — SIL International (SIL Open Font License)",
              "DM Sans, Playfair Display, IBM Plex Mono — Google Fonts (Open Font License)",
            ]},
            {title:"Technology",items:[
              "Built with React (Meta, MIT License)",
              "HLS.js for live stream playback (Apache 2.0 License)",
              "Hosted and deployed via Vercel",
            ]},
            {title:"Acknowledgements",items:[
              "Quran Foundation (quran.com) — for their open API serving the global Muslim community",
              "everyayah.com — for making ayah-by-ayah recitations freely accessible",
              "King Fahd Complex for the Printing of the Holy Qur'an — for the Madinah Mushaf and UthmanicHafs font",
              "The scholars whose tafsir works illuminate the meaning of the Qur'an",
              "The blessed reciters of the Haramain whose voices guide millions in memorization",
            ]},
          ].map((section,i)=>(
            <div key={i} style={{marginBottom:18}}>
              <div style={{fontSize:10,color:dark?"rgba(212,175,55,0.60)":"#D4AF37",letterSpacing:".14em",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>{section.title}</div>
              <div style={{background:dark?"rgba(255,255,255,0.03)":"#EADFC8",border:dark?"1px solid rgba(212,175,55,0.10)":"1px solid rgba(0,0,0,0.08)",borderRadius:14,padding:"12px 14px"}}>
                {section.items.map((item,j)=>(
                  <div key={j} style={{fontSize:11,color:dark?"rgba(243,231,200,0.65)":"#2D2A26",lineHeight:1.7,padding:"4px 0",borderBottom:j<section.items.length-1?(dark?"1px solid rgba(255,255,255,0.04)":"1px solid rgba(0,0,0,0.04)"):"none"}}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{textAlign:"center",marginTop:20,padding:"16px",borderRadius:14,background:dark?"rgba(255,255,255,0.02)":"#EADFC8",border:dark?"1px solid rgba(212,175,55,0.08)":"1px solid rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:10,color:dark?"rgba(243,231,200,0.35)":"#6B645A",lineHeight:1.8}}>
              This application is built as a service to the Muslim Ummah for the purpose of Quranic memorization and education. All Quranic content is used with respect for its sacred nature. No content is modified from its original source. All scholarly works are attributed to their authors.
            </div>
            <div style={{fontSize:10,color:dark?"rgba(212,175,55,0.40)":"#D4AF37",marginTop:10}}>NoorTech Studio · 2026</div>
            <div style={{fontSize:9,color:dark?"rgba(243,231,200,0.20)":"#6B645A",marginTop:4}}>Built with sincerity for the sake of Allah</div>
          </div>
        </div>
      )}

    </>)}

    </div>
  );
}
