import { useState, useEffect, useRef } from "react";

// ── QURAN RECITERS (Al-Quran Al-Karim tab) ────────────────────────────────────
const QURAN_RECITERS = [
  { id:"dosari",    name:"Yasser Al-Dosari",       arabic:"ياسر الدوسري",      quranicaudio:"yasser_ad-dussary",             tag:"Masjid Al-Haram"  },
  { id:"juhany",    name:"Abdullah Al-Juhany",     arabic:"عبدالله الجهني",    quranicaudio:"abdullaah_3awwaad_al-juhaynee", tag:"Masjid Al-Haram"  },
  { id:"sudais",    name:"Abdul Rahman As-Sudais", arabic:"عبدالرحمن السديس",  quranicaudio:"abdurrahmaan_as-sudays",        tag:"Masjid Al-Haram"  },
  { id:"shuraim",   name:"Saud Ash-Shuraim",       arabic:"سعود الشريم",       quranicaudio:"sa3ood_al-shuraym",             tag:"Masjid Al-Haram"  },
  { id:"muaiqly",   name:"Maher Al-Muaiqly",       arabic:"ماهر المعيقلي",     quranicaudio:"maher_almuaiqly",               tag:"Masjid Al-Haram"  },
  { id:"baleela",   name:"Bandar Baleela",          arabic:"بندر بليلة",        quranicaudio:"bandar_baleela/complete",       tag:"Masjid Al-Haram"  },
  { id:"turki",     name:"Badr Al-Turki",           arabic:"بدر التركي",        quranicaudio:"badr_al_turki/mp3",             tag:"Masjid Al-Haram"  },
  { id:"kalbani",   name:"Adel Kalbani",            arabic:"عادل الكلباني",     quranicaudio:"adel_kalbani",                  tag:"Masjid Al-Haram"  },
  { id:"khayat",    name:"Abdullah Khayat",         arabic:"عبدالله خياط",      quranicaudio:"khayat",                        tag:"Masjid Al-Haram"  },
  { id:"ghamdi",    name:"Khalid Al-Ghamdi",        arabic:"خالد الغامدي",      quranicaudio:"khalid_alghamdi",               tag:"Masjid Al-Haram"  },
  { id:"salehtaleb",name:"Saleh Al-Taleb",          arabic:"صالح آل طالب",      quranicaudio:"saleh_al_taleb",                tag:"Masjid Al-Haram"  },
  { id:"hudhaify",  name:"Ali Al-Hudhaify",         arabic:"علي الحذيفي",       quranicaudio:"huthayfi",                      tag:"Masjid An-Nabawi" },
  { id:"qasim",     name:"Abdul Muhsin Al-Qasim",   arabic:"عبدالمحسن القاسم",  quranicaudio:"abdul_muhsin_alqasim",          tag:"Masjid An-Nabawi" },
  { id:"thubaity",  name:"Abdul Bari Ath-Thubaity", arabic:"عبدالباري الثبيتي", quranicaudio:"thubaity",                      tag:"Masjid An-Nabawi" },
  { id:"ayyoub",    name:"Muhammad Ayyoub",         arabic:"محمد أيوب",         quranicaudio:"muhammad_ayyoub",               tag:"Masjid An-Nabawi" },
  { id:"budair",    name:"Salah Al-Budair",         arabic:"صلاح البدير",       quranicaudio:"salahbudair",                   tag:"Masjid An-Nabawi" },
  { id:"imadhafez", name:"Imad Zuhair Hafez",       arabic:"عماد زهير حافظ",    quranicaudio:"imad_zuhair_hafez",             tag:"Masjid An-Nabawi" },
  { id:"alakhdar",  name:"Ibrahim Al-Akhdar",       arabic:"إبراهيم الأخضر",    quranicaudio:"ibrahim_al_akhdar",             tag:"Masjid An-Nabawi" },
  { id:"alijaber",  name:"Ali Jaber",               arabic:"علي جابر",          quranicaudio:"ali_jaber",                     tag:"Masjid An-Nabawi" },
];

// ── RECITERS (My Hifz tab — ayah by ayah confirmed) ──────────────────────────
const RECITERS = [
  // ── Masjid Al-Haram ──
  { id:"dosari",  name:"Yasser Al-Dosari",       arabic:"ياسر الدوسري",     recitationId:137, everyayah:"Yasser_Ad-Dussary_128kbps",            quranicaudioId:97,  tag:"Masjid Al-Haram"  },
  { id:"juhany",  name:"Abdullah Al-Juhany",     arabic:"عبدالله الجهني",   recitationId:140, everyayah:"Abdullaah_3awwaad_Al-Juhaynee_128kbps", quranicaudioId:1,   tag:"Masjid Al-Haram"  },
  { id:"sudais",  name:"Abdul Rahman As-Sudais", arabic:"عبدالرحمن السديس", recitationId:2,   everyayah:"Abdurrahmaan_As-Sudais_192kbps",        quranicaudioId:7,   tag:"Masjid Al-Haram"  },
  { id:"shuraim", name:"Saud Ash-Shuraim",       arabic:"سعود الشريم",      recitationId:4,   everyayah:"Saood_ash-Shuraym_128kbps",             quranicaudioId:4,   tag:"Masjid Al-Haram"  },
  { id:"muaiqly", name:"Maher Al-Muaiqly",       arabic:"ماهر المعيقلي",    recitationId:128, everyayah:"MaherAlMuaiqly128kbps",                 quranicaudioId:159, tag:"Masjid Al-Haram"  },
  // ── Masjid An-Nabawi ──
  { id:"hudhaify",name:"Ali Al-Hudhaify",        arabic:"علي الحذيفي",      recitationId:10,  everyayah:"Hudhaify_128kbps",                      quranicaudioId:8,   tag:"Masjid An-Nabawi" },
  { id:"ayyoub",  name:"Muhammad Ayyoub",        arabic:"محمد أيوب",        recitationId:99,  everyayah:"Muhammad_Ayyoub_128kbps",               quranicaudioId:107, tag:"Masjid An-Nabawi" },
  { id:"budair",  name:"Salah Al-Budair",        arabic:"صلاح البدير",      recitationId:135, everyayah:"Salah_Al_Budair_128kbps",               quranicaudioId:43,  tag:"Masjid An-Nabawi" },
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
    steps:["Read with translation to understand the meaning","Recite aloud 10x looking at the text","Cover and recite from memory — fix mistakes immediately","Repeat until 3 times without looking","Write from memory once to cement them"] },
  { id:"dhuhr",   time:"Dhuhr",   arabic:"الظهر",  icon:"☀️", color:"#F6A623",
    title:"Revise Yesterday",
    desc:"New ayahs fade fastest in 24 hours. Revision only — no new memorization.",
    steps:["Recite everything from yesterday from memory","For stumbling ayahs — look, re-read 5x, cover and retry","Connect yesterday to today as one continuous passage"] },
  { id:"asr",     time:"Asr",     arabic:"العصر",  icon:"🌤️", color:"#4ECDC4",
    title:"Older Juz Revision",
    desc:"Cycle through completed Juz. Every Juz should be touched every 7-10 days.",
    steps:["Pick the Juz you have not revised most recently","Recite a full page from memory","Mark which Juz you revised in your tracker"] },
  { id:"maghrib", time:"Maghrib", arabic:"المغرب", icon:"🌆", color:"#B794F4",
    title:"Listening",
    desc:"Follow along with your chosen reciter. Your ear reinforces what your tongue is learning.",
    steps:["Select a reciter and press play on each ayah","Follow along in the mushaf — listen, do not recite yet","Trains correct pronunciation and rhythm passively"] },
  { id:"isha",    time:"Isha",    arabic:"العشاء", icon:"🌙", color:"#68D391",
    title:"Full Day Review",
    desc:"Recite everything from today before sleep. Sleep consolidates what you review right before it.",
    steps:["Recite today's new Fajr ayahs from memory","Then yesterday's ayahs","End with dua asking Allah to keep the Quran in your heart"] },
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
const STATUS_CFG = {
  complete:       {label:"Memorized",    color:"#F0C040"},
  in_progress:    {label:"In Progress",  color:"#F6A623"},
  needs_revision: {label:"Needs Revision",color:"#E5534B"},
  not_started:    {label:"Not Started",  color:"#3A8A50"},
};function calcTimeline(years,juzDone) {
  const juzLeft=Math.max(1,30-juzDone), ayahsLeft=juzLeft*208;
  const active=Math.round(years*365*0.85), apd=Math.max(1,ayahsLeft/active);
  return { ayahsPerDay:apd.toFixed(1), daysPerJuz:Math.round(active/juzLeft),
           juzPerMonth:(juzLeft/(years*12)).toFixed(1),
           revDuhr:Math.max(1,Math.round(apd*0.3)), revAsr:Math.max(1,Math.round(apd*0.2)),
           activeDays:active, ayahsLeft, juzLeft };
}
const DARK  = {bg:"#060A07",surface:"#0D1008",surface2:"#141A0F",border:"#1E2A18",border2:"#1A2814",text:"#EDE8DC",sub:"#A8B89A",dim:"#5A7050",vdim:"#2E4030",accent:"#F0C040",accentDim:"#F0C04018",input:"#0A0E07",inputBorder:"#1E2A18",inputText:"#8AAA78"};

const LIGHT = {bg:"#F7F3EC",surface:"#FFFFFF",surface2:"#F0EBE0",border:"#DDD4C0",border2:"#D0C8B0",text:"#1A2A18",sub:"#4A6A40",dim:"#7A8A70",vdim:"#9A9A88",accent:"#8B6A10",accentDim:"#8B6A1012",input:"#F7F3EC",inputBorder:"#CCC4B0",inputText:"#3A6A40"};
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

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function RihlatAlHifz() {
  const [dark,setDark]=useState(true);
  const [showDua,setShowDua]=useState(true);
  const [showOnboarding, setShowOnboarding]=useState(()=>!localStorage.getItem("rihlat-onboarded"));
  const [duaIdx,setDuaIdx]=useState(()=>Math.floor(Math.random()*6));
  const [activeTab,setActiveTab]=useState("myhifz");
  const [selectedJuz,setSelectedJuz]=useState(30);
  const [allVerses,setAllVerses]=useState([]);
  const [loading,setLoading]=useState(false);
  const [loadMsg,setLoadMsg]=useState("");
  const [fetchError,setFetchError]=useState(false);
  const [juzStatus,setJuzStatus]=useState({30:"complete"});
  const [notes,setNotes]=useState({});
  const [loaded,setLoaded]=useState(false);
  const [fontSize,setFontSize]=useState(24);
  const [openSurah,setOpenSurah]=useState(null);
  const [goalYears,setGoalYears]=useState(3);
  const [goalMonths,setGoalMonths]=useState(1);
  const [openMethod,setOpenMethod]=useState(null);
  const [sessionJuz,setSessionJuz]=useState(29);
  const [sessionIdx,setSessionIdx]=useState(0);
  const [sessionDone,setSessionDone]=useState([]);
  const [sessionVerses,setSessionVerses]=useState([]);
  const [sessLoading,setSessLoading]=useState(false);
  const [dailyChecks,setDailyChecks]=useState({date:TODAY()});
  const [streak,setStreak]=useState(0);
  const [checkHistory,setCheckHistory]=useState({});
  const [calMonth,setCalMonth]=useState(new Date().getMonth());
  const [calYear,setCalYear]=useState(new Date().getFullYear());
  const [reciter,setReciter]=useState("dosari");
  const [activeStream,setActiveStream]=useState(0);
  const [masjidaynTab, setMasjidaynTab]=useState("live");
  const [rihlahTab, setRihlahTab]=useState("juz");
  const [haramainMosque,setHaramainMosque]=useState("makkah");
  const [openImam,setOpenImam]=useState(null);
  const [haramainPlaying,setHaramainPlaying]=useState(null);
  const haramainRef=useRef(null);
  const [showTrans,setShowTrans]=useState(true);
  const [translations,setTranslations]=useState({});
  const [playingKey,setPlayingKey]=useState(null);
  const [audioLoading,setAudioLoading]=useState(null);
  const audioRef=useRef(null);
  const [ramadanMosque,setRamadanMosque]=useState("makkah");
  const [liveSource,setLiveSource]=useState("aloula");
  const [selectedRamadanNight,setSelectedRamadanNight]=useState(null);
  const [ramadanVideoType,setRamadanVideoType]=useState("taraweeh"); // "taraweeh" | "tahajjud"
  const T=dark?DARK:LIGHT;

  useEffect(()=>{
    const l=document.createElement("link"); l.rel="stylesheet";
    l.href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Playfair+Display:wght@600;700&family=IBM+Plex+Mono:wght@400;600&family=DM+Sans:wght@400;500;600&display=swap";
    document.head.appendChild(l);
  },[]);

  useEffect(()=>{
    try {
      const d=localStorage.getItem("jalil-quran-v8");
      if(d){
        const p=JSON.parse(d);
        setJuzStatus(p.juzStatus||{30:"complete"});
        setNotes(p.notes||{});
        setGoalYears(p.goalYears||3);
        setSessionJuz(p.sessionJuz||29);
        setSessionIdx(p.sessionIdx||0);
        setSessionDone(p.sessionDone||[]);
        if(p.dark!==undefined) setDark(p.dark);
        if(p.streak!==undefined) setStreak(p.streak);
        if(p.checkHistory) setCheckHistory(p.checkHistory);
        if(p.reciter) setReciter(p.reciter);
        if(p.showTrans!==undefined) setShowTrans(p.showTrans);
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
    setLoaded(true);
  },[]);

  useEffect(()=>{
    if(!loaded) return;
    try { localStorage.setItem("jalil-quran-v8",JSON.stringify({juzStatus,notes,goalYears,sessionJuz,sessionIdx,sessionDone,dark,dailyChecks,streak,checkHistory,reciter,showTrans})); } catch {}
  },[juzStatus,notes,goalYears,sessionJuz,sessionIdx,sessionDone,dark,dailyChecks,streak,checkHistory,reciter,showTrans,loaded]);

  // Fetch session verses
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setSessLoading(true); setSessionVerses([]);
      try {
        let page=1,all=[],tp=1;
        do {
          const res=await fetch(`https://api.qurancdn.com/api/qdc/verses/by_juz/${sessionJuz}?words=false&fields=text_uthmani,verse_key,surah_number&per_page=50&page=${page}`);
          if(!res.ok) throw new Error();
          const data=await res.json();
          if(cancelled) return;
          all=[...all,...(data.verses||[])]; tp=data.pagination?.total_pages||1; page++;
        } while(page<=tp);
        if(!cancelled) setSessionVerses(all);
      } catch {}
      if(!cancelled) setSessLoading(false);
    })();
    return()=>{cancelled=true;};
  },[sessionJuz]);

  const fetchTranslations=async(verses)=>{
    const needed=verses.filter(v=>!translations[v.verse_key]);
    if(!needed.length) return;
    const updated={};
    await Promise.all(needed.map(async v=>{
      try {
        const [s,a]=v.verse_key.split(":");
        const res=await fetch(`https://api.alquran.cloud/v1/ayah/${s}:${a}/en.sahih`);
        if(!res.ok) return;
        const data=await res.json();
        updated[v.verse_key]=data.data?.text||"";
      } catch {}
    }));
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

  const completedCount=Object.values(juzStatus).filter(s=>s==="complete").length;
  const pct=Math.round((completedCount/30)*100);
  const nextJuz=[...JUZ_META].sort((a,b)=>a.order-b.order).find(j=>juzStatus[j.num]!=="complete");
  const meta=JUZ_META.find(j=>j.num===selectedJuz);
  const curStatus=juzStatus[selectedJuz]||"not_started";
  const curCfg=STATUS_CFG[curStatus];
  const timeline=calcTimeline(goalYears,completedCount,5);
  const dailyNew=Math.ceil(parseFloat(timeline.ayahsPerDay));
  const totalSV=sessionVerses.length;
  const bStart=sessionIdx;
  const bEnd=Math.min(sessionIdx+dailyNew,totalSV);
  const batch=sessionVerses.slice(bStart,bEnd);
  const bKey=`${sessionJuz}-${bStart}`;
  const bDone=sessionDone.includes(bKey);
  const sessM=JUZ_META.find(j=>j.num===sessionJuz);
  const sessPct=totalSV>0?Math.round((sessionIdx/totalSV)*100):0;
  const checkedCount=SESSIONS.filter(s=>dailyChecks[s.id]).length;
  const allChecked=checkedCount===SESSIONS.length;
  const currentReciter=RECITERS.find(r=>r.id===reciter)||RECITERS[0];

  useEffect(()=>{if(batch.length&&showTrans)fetchTranslations(batch);},[batch,showTrans]);

  function toggleCheck(id){
    const updated={...dailyChecks,[id]:!dailyChecks[id]};
    setDailyChecks(updated);
    const dk=DATEKEY();
    setCheckHistory(prev=>({...prev,[dk]:{...(prev[dk]||{}),[id]:!dailyChecks[id]}}));
    if(SESSIONS.every(s=>updated[s.id]))setStreak(p=>p+1);
  }
  function markBatchDone(){
    setSessionDone(d=>[...d,bKey]);
    if(bEnd>=totalSV){
      setJuzStatus(p=>({...p,[sessionJuz]:"complete"}));
      const nj=[...JUZ_META].sort((a,b)=>a.order-b.order).find(j=>j.num!==sessionJuz&&juzStatus[j.num]!=="complete"&&j.num!==30);
      if(nj){setSessionJuz(nj.num);setSessionIdx(0);}
    } else {setSessionIdx(bEnd);}
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
      audio.onended=()=>setPlayingKey(null);
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

  function playSurahQueue(verses, surahNum, startIdx=0) {
    if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; }
    if(playingSurah===surahNum){ setPlayingSurah(null); setPlayingKey(null); return; }
    surahQueueRef.current = verses;
    surahIdxRef.current = startIdx;
    setPlayingSurah(surahNum);
    playNextInQueue(verses, startIdx, surahNum);
  }

  function playNextInQueue(verses, idx, surahNum) {
    if(idx >= verses.length){ setPlayingSurah(null); setPlayingKey(null); return; }
    if(!hasPerAyah(reciter)) {
      const archiveUrl = getArchiveUrl(reciter, surahNum);
      if(!archiveUrl){ setPlayingSurah(null); setPlayingKey(null); return; }
      if(idx > 0) return;
      setPlayingKey(verses[0]?.verse_key);
      setAudioLoading(verses[0]?.verse_key);
      const audio = new Audio(archiveUrl);
      audioRef.current = audio;
      audio.oncanplay = () => setAudioLoading(null);
      audio.onended = () => { setPlayingSurah(null); setPlayingKey(null); };
      audio.onerror = () => { setAudioLoading(null); setPlayingSurah(null); setPlayingKey(null); };
      audio.play().catch(()=>{ setAudioLoading(null); setPlayingSurah(null); setPlayingKey(null); });
      return;
    }
    const v = verses[idx];
    const vKey = v.verse_key;
    const [surah, ayah] = vKey.split(":");
    setPlayingKey(vKey);
    setAudioLoading(vKey);
    const folder = getEveryayahFolder(reciter);
    const url = `https://everyayah.com/data/${folder}/${String(surah).padStart(3,"0")}${String(ayah).padStart(3,"0")}.mp3`;
    if(idx + 1 < verses.length) {
      const nv = verses[idx+1];
      const [ns, na] = nv.verse_key.split(":");
      new Audio(`https://everyayah.com/data/${folder}/${String(ns).padStart(3,"0")}${String(na).padStart(3,"0")}.mp3`).preload = "auto";
    }
    const audio = new Audio(url);
    audio.preload = "auto";
    audioRef.current = audio;
    audio.oncanplay = () => setAudioLoading(null);
    audio.onended = () => { surahIdxRef.current = idx+1; playNextInQueue(surahQueueRef.current, idx+1, surahNum); };
    audio.onerror = () => { surahIdxRef.current = idx+1; playNextInQueue(surahQueueRef.current, idx+1, surahNum); };
    audio.play().catch(()=>{ setAudioLoading(null); setPlayingSurah(null); setPlayingKey(null); });
  }

  function getEveryayahFolder(id){ const r=RECITERS.find(x=>x.id===id); return r?.everyayah||RECITERS[0].everyayah; }
  function getArchiveUrl(id, surahNum){ const r=RECITERS.find(x=>x.id===id); if(!r?.archive) return null; return `https://archive.org/download/${r.archive}/${String(surahNum).padStart(3,"0")}.mp3`; }
  function hasPerAyah(id){ const r=RECITERS.find(x=>x.id===id); return !!r?.everyayah; }

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

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:"100vh",color:T.text,display:"flex",flexDirection:"column",transition:"background .25s,color .25s"}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-thumb{border-radius:3px;background:${dark?"#122016":"#C8C0A8"};}
        .sbtn{transition:opacity .12s;cursor:pointer;user-select:none;}.sbtn:hover{opacity:.72;}
        .jrow{cursor:pointer;border-left:3px solid transparent;transition:background .1s;}.jrow:hover{background:${dark?"#0C160E":"#EDE8DC"}!important;}
        .srow{cursor:pointer;transition:background .12s;}.srow:hover{background:${dark?"#0C1A0E":"#EDE8DC"}!important;}
        .chkrow{cursor:pointer;transition:all .13s;}.chkrow:hover{background:${dark?"#0A140C":"#EDE8DC"}!important;}
        .ttab{cursor:pointer;transition:all .15s;user-select:none;}.ttab:hover{opacity:.8;}
        @keyframes fi{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}.fi{animation:fi .2s ease;}
        @keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .9s linear infinite;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}.pulse{animation:pulse 1.6s infinite;}
        .pbfill{transition:width .8s cubic-bezier(.4,0,.2,1);}
        input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;background:${dark?"#0C1A0E":"#D0C8B0"};outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${T.accent};cursor:pointer;}
        textarea:focus{outline:none;} select{cursor:pointer;}
      `}</style>
      
      {/* ONBOARDING */}
      {showOnboarding&&(
        <div style={{position:"fixed",inset:0,background:"#060A07",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24,flexDirection:"column",gap:16,textAlign:"center"}}>
          <div style={{fontFamily:"'Amiri',serif",fontSize:42,color:"#F0C040",direction:"rtl",lineHeight:1.6}}>
           بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
          </div>
          <div style={{fontFamily:"'Amiri',serif",fontSize:16,color:"#F0C040",direction:"rtl",marginTop:8}}>
           وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ
          </div>
          <div style={{fontSize:12,color:"#A8B89A",fontStyle:"italic",marginBottom:8}}>
            "And We have certainly made the Quran easy for remembrance" · Al-Qamar 54:17
          </div>
          <div style={{fontFamily:"'Amiri',serif",fontSize:24,color:"#F0C040",direction:"rtl",marginBottom:4}}>
             رحلة الحفظ
          </div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#EDE8DC",marginBottom:16}}>
            Rihlat Al-Hifz
          </div>
          <div className="sbtn" onClick={()=>{setShowOnboarding(false);localStorage.setItem("rihlat-onboarded","1");}} style={{padding:"14px 40px",background:"#F0C040",borderRadius:8,fontSize:14,fontWeight:700,color:"#060A07"}}>
            Begin Your Journey →
          </div>
          <div style={{fontSize:10,color:"#5A7050",marginTop:8}}>© 2026 NoorTech Academy</div>
        </div>
      )}

      {/* DUA MODAL */}
      {showDua&&(
        <div style={{position:"fixed",inset:0,background:"#060A07",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          {(()=>{
            const DUAS = [
              {
                arabic:"رَبِّ زِدْنِي عِلْمًا",
                transliteration:"Rabbi zidni ilma",
                translation:"My Lord, increase me in knowledge.",
                source:"Surah Ta-Ha · 20:114"
              },
              {
                arabic:"رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
                transliteration:"Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina adhaban-nar",
                translation:"Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",
                source:"Surah Al-Baqarah · 2:201"
              },
              {
                arabic:"رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً إِنَّكَ أَنتَ الْوَهَّابُ",
                transliteration:"Rabbana la tuzigh qulubana ba'da idh hadaytana wa hab lana min ladunka rahmah innaka antal-Wahhab",
                translation:"Our Lord, do not let our hearts deviate after You have guided us, and grant us mercy from Yourself. Indeed, You are the Bestower.",
                source:"Surah Aal-Imran · 3:8"
              },
              {
                arabic:"اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا",
                transliteration:"Allahumma inni as'aluka ilman nafi'an wa rizqan tayyiban wa amalan mutaqabbala",
                translation:"O Allah, I ask You for beneficial knowledge, pure provision, and accepted deeds.",
                source:"Morning Dua · Ibn Majah"
              },
              {
                arabic:"رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",
                transliteration:"Rabbi ishrah li sadri wa yassir li amri",
                translation:"My Lord, expand my chest and ease my affairs.",
                source:"Surah Ta-Ha · 20:25-26"
              },
              {
                arabic:"اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
                transliteration:"Allahumma a'inni ala dhikrika wa shukrika wa husni ibadatik",
                translation:"O Allah, help me to remember You, to be grateful to You, and to worship You in an excellent manner.",
                source:"Abu Dawud · After every Salah"
              },
            ];
            const d = DUAS[duaIdx % DUAS.length];
            return (
              <div className="fi" style={{background:"#060A07",border:`1px solid #F0C04060`,borderRadius:12,padding:"32px 28px",maxWidth:500,width:"100%",textAlign:"center"}}>
                <div style={{fontSize:9,color:T.accent,letterSpacing:".22em",textTransform:"uppercase",marginBottom:16}}>Begin With Dua</div>
                <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(20px,4.5vw,34px)",color:T.accent,direction:"rtl",lineHeight:2,marginBottom:12}}>
                  {d.arabic}
                </div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,color:T.sub,fontStyle:"italic",marginBottom:4}}>"{d.transliteration}"</div>
                <div style={{fontSize:12,color:T.text,marginBottom:4,lineHeight:1.6}}>{d.translation}</div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.dim,marginBottom:24}}>{d.source}</div>
                <div style={{display:"flex",justifyContent:"center"}}>
                  <div className="sbtn" onClick={()=>{setShowDua(false);setDuaIdx(i=>(i+1)%6);}} style={{padding:"10px 28px",background:T.accent,color:dark?"#060A07":"#fff",borderRadius:6,fontSize:13,fontWeight:600}}>
                    بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
                  </div>
                </div>
            </div>
          );
          })()}
        </div>
      )}

      {/* TOP BAR */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"10px 16px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:8,color:T.accent,letterSpacing:".2em",textTransform:"uppercase",marginBottom:1}}>Abdul Jalil · Hifz Journey</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:T.text}}>Rihlat Al-Hifz · رحلة الحفظ</div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            {nextJuz&&<div style={{textAlign:"right"}}><div style={{fontSize:8,color:T.accent,letterSpacing:".12em",textTransform:"uppercase",marginBottom:1}}>Next</div><div style={{fontSize:11,color:T.sub}}>Juz {nextJuz.num}</div></div>}
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:18,color:T.accent,lineHeight:1}}>{pct}%</div>
              <div style={{fontSize:8,color:T.dim,letterSpacing:".1em"}}>{completedCount}/30 Juz</div>
              <div style={{height:3,width:60,background:T.surface2,borderRadius:2,overflow:"hidden",marginTop:2}}><div className="pbfill" style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#156A30,#F0C040)",borderRadius:2}}/></div>
            </div>
            <div className="sbtn" onClick={()=>setDark(d=>!d)} style={{padding:"5px 10px",background:T.surface2,border:`1px solid ${T.border}`,borderRadius:20,display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.dim}}>
              <span>{dark?"🌙":"☀️"}</span><span>{dark?"Dark":"Light"}</span>
            </div>
            <div className="sbtn" onClick={()=>setShowDua(true)} style={{width:28,height:28,borderRadius:"50%",background:T.accentDim,border:`1px solid ${T.accent}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🤲</div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,display:"flex",flexShrink:0,overflowX:"auto"}}>
        {TABS.map(t=>(
          <div key={t.id} className="ttab" onClick={()=>{setActiveTab(t.id);if(t.id==="rihlah")setRihlahTab("home");}} style={{padding:"9px 16px",fontSize:12,fontWeight:activeTab===t.id?600:400,color:activeTab===t.id?T.accent:T.dim,borderBottom:`2px solid ${activeTab===t.id?T.accent:"transparent"}`,whiteSpace:"nowrap"}}>
            {t.label}
          </div>
        ))}
      </div>

      {/* ═══ TODAY SESSION ═══ */}
      {activeTab==="myhifz"&&(
        <div style={{flex:1,overflowY:"auto",padding:"16px 18px 48px"}} className="fi">
          <div style={{marginBottom:14,padding:"12px 16px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8}}>
            <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase",marginBottom:8}}>Select Reciter</div>
            <select
              value={reciter}
              onChange={e=>setReciter(e.target.value)}
              style={{width:"100%",padding:"10px 12px",background:T.surface2,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,fontSize:12,outline:"none",cursor:"pointer"}}
            >
              {RECITERS.map(r=>(
                <option key={r.id} value={r.id}>
                  {r.name} — {r.arabic}
                </option>
             ))}
          </select>
           <div style={{marginTop:8,fontSize:10,color:T.vdim,fontStyle:"italic"}}>
            ⓘ Baleela, Badr Al-Turki & Qarafi: full surah audio only (Quran tab) — per-ayah not available.
          </div>
        </div>

          <div style={{marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase",marginBottom:2}}>Active Memorization</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:T.text}}>Juz {sessionJuz} — <span style={{color:T.accent}}>{sessM?.arabic}</span></div>
              <div style={{fontSize:11,color:T.sub}}>{sessM?.roman}</div>
            </div>
            <select value={sessionJuz} onChange={e=>{setSessionJuz(Number(e.target.value));setSessionIdx(0);}} style={{background:T.surface2,border:`1px solid ${T.border}`,color:T.text,fontSize:11,padding:"5px 9px",borderRadius:5,outline:"none"}}>
              {JUZ_META.map(j=><option key={j.num} value={j.num}>Juz {j.num} — {j.roman}{j.num===30?" ✓ (Amma — Revision)":""}</option>)}
            </select>
          </div>

          <div style={{marginBottom:14,padding:"10px 14px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:11,color:T.sub}}>Progress in Juz {sessionJuz}</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:T.accent}}>{sessionIdx}/{totalSV} ayahs</span>
            </div>
            <div style={{height:5,background:T.surface2,borderRadius:3,overflow:"hidden"}}>
              <div className="pbfill" style={{height:"100%",width:`${sessPct}%`,background:`linear-gradient(90deg,${T.accent}70,${T.accent})`,borderRadius:3}}/>
            </div>
            <div style={{fontSize:9,color:T.dim,marginTop:4}}>{dailyNew} ayahs/session · {Math.ceil((totalSV-sessionIdx)/Math.max(1,dailyNew))} sessions remaining</div>
          </div>

          {sessLoading&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:40,gap:12}}><div className="spin" style={{width:26,height:26,border:`2px solid ${T.border}`,borderTopColor:"#F0C040",borderRadius:"50%"}}/><div style={{fontSize:12,color:T.dim}}>Loading ayahs...</div></div>}
          {!sessLoading&&sessionVerses.length===0&&(
            <div style={{textAlign:"center",padding:"30px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8}}>
              <div style={{fontSize:20,marginBottom:8}}>⚠️</div>
              <div style={{fontSize:13,color:T.sub,marginBottom:14}}>Ayahs did not load. Check your internet connection.</div>
              <div className="sbtn" onClick={()=>setSessionJuz(n=>n)} style={{display:"inline-block",padding:"8px 20px",background:T.accent,color:dark?"#060A07":"#fff",borderRadius:6,fontSize:12,fontWeight:600}}>Retry</div>
            </div>
          )}

          {!sessLoading&&batch.length>0&&(
            <div>
              {!hasPerAyah(reciter)&&(
                <div style={{marginBottom:10,padding:"9px 13px",background:T.surface,border:`1px solid ${T.accent}30`,borderLeft:`3px solid ${T.accent}`,borderRadius:"0 6px 6px 0",fontSize:11,color:T.sub,lineHeight:1.6}}>
                  🎵 <strong style={{color:T.accent}}>{currentReciter.name}</strong> plays full surahs only. Switch to Dosari, Juhany, Sudais, Shuraim, Muaiqly, Hudhaify, Ayyoub or Budair above for per-ayah audio here.
                </div>
              )}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
                <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase"}}>{sessionJuz===30?"Revision Batch":"Fajr Batch"} — Ayahs {bStart+1}–{bEnd} of {totalSV}</div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <div className="sbtn" onClick={()=>setShowTrans(s=>!s)} style={{fontSize:10,padding:"4px 9px",background:showTrans?T.accent+"18":T.surface2,border:`1px solid ${showTrans?T.accent+"50":T.border}`,borderRadius:5,color:showTrans?T.accent:T.dim}}>
                    {showTrans?"Hide Translation":"Show Translation"}
                  </div>
                  <div className="sbtn" onClick={()=>setFontSize(f=>Math.max(16,f-2))} style={{width:20,height:20,background:T.surface2,border:`1px solid ${T.border}`,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",color:T.sub,fontSize:13}}>−</div>
                  <span style={{fontSize:9,color:T.dim,width:22,textAlign:"center"}}>{fontSize}</span>
                  <div className="sbtn" onClick={()=>setFontSize(f=>Math.min(40,f+2))} style={{width:20,height:20,background:T.surface2,border:`1px solid ${T.border}`,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",color:T.sub,fontSize:13}}>+</div>
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
                {batch.map((v,i)=>{
                  const vNum=v.verse_key?.split(":")?.[1];
                  const sNum=v.surah_number||parseInt(v.verse_key?.split(":")?.[0]);
                  const vKey=v.verse_key;
                  const isPlaying=playingKey===vKey;
                  const isLoading=audioLoading===vKey;
                  const trans=translations[vKey];
                  return (
                    <div key={vKey} style={{background:T.surface,border:`1px solid ${bDone?"#F0C04030":T.border}`,borderLeft:`4px solid ${bDone?"#F0C040":T.accent}`,borderRadius:"0 8px 8px 0",padding:"14px 18px",opacity:bDone?0.6:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div style={{fontSize:9,color:T.dim,fontFamily:"'IBM Plex Mono',monospace"}}>{SURAH_EN[sNum]} · {vKey}</div>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <div className="sbtn" onClick={()=>hasPerAyah(reciter)?playAyah(vKey,vKey):null} style={{width:32,height:32,borderRadius:"50%",background:isPlaying?T.accent+"25":T.surface2,border:`1px solid ${isPlaying?T.accent:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isLoading?9:13,color:isPlaying?T.accent:hasPerAyah(reciter)?T.dim:T.vdim,opacity:hasPerAyah(reciter)?1:0.4,cursor:hasPerAyah(reciter)?"pointer":"default"}}>
                            {isLoading?<div className="spin" style={{width:12,height:12,border:`2px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%"}}/>:(isPlaying?"⏸":"▶")}
                          </div>
                          <div style={{fontSize:9,color:T.accent,background:T.accentDim,padding:"2px 7px",borderRadius:10,fontFamily:"'IBM Plex Mono',monospace"}}>{i+1}/{batch.length}</div>
                        </div>
                      </div>
                      <div style={{fontFamily:"'Amiri',serif",fontSize:`${fontSize}px`,color:T.text,direction:"rtl",textAlign:"right",lineHeight:2.2,marginBottom:showTrans?10:0}}>
                        {v.text_uthmani}
                        <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"1.2em",height:"1.2em",borderRadius:"50%",border:`1px solid ${T.accent}35`,color:`${T.accent}70`,fontSize:"0.4em",fontFamily:"'IBM Plex Mono',monospace",margin:"0 5px",verticalAlign:"middle"}}>{vNum}</span>
                      </div>
                      {showTrans&&(
                        <div style={{fontSize:13,color:T.sub,lineHeight:1.7,borderTop:`1px solid ${T.border}`,paddingTop:10,fontStyle:"italic"}}>
                          {trans===undefined?<span style={{color:T.vdim}}>Loading...</span>:trans||<span style={{color:T.vdim}}>Translation unavailable</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {bDone?(
                <div style={{textAlign:"center",padding:"20px",background:T.surface,border:"1px solid #F0C04030",borderRadius:8}}>
                  <div style={{fontSize:22,marginBottom:8}}>✅</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:"#F0C040",marginBottom:4}}>Batch Complete — MashaAllah!</div>
                  <div style={{fontSize:12,color:T.sub,marginBottom:14}}>Head to the My Rihlah to check off Fajr for today.</div>
                  <div className="sbtn" onClick={()=>{if(bEnd<totalSV){setSessionIdx(bEnd);setSessionDone(d=>d.filter(k=>k!==bKey));}}} style={{display:"inline-block",padding:"12px 28px",background:T.accent,border:`1px solid ${T.accent}`,borderRadius:8,fontSize:13,fontWeight:700,color:dark?"#060A07":"#fff",marginTop:8}}>
                   ✓ Done — Next Batch →
                </div>
                </div>
              ):(
                <div style={{background:T.surface,border:`1px solid ${T.accent}25`,borderRadius:8,padding:"14px 18px"}}>
                  <div style={{fontSize:11,color:T.sub,lineHeight:1.7,marginBottom:12}}>
                    📋 Recite each ayah aloud until you can say it 3 times from memory without looking. Use ▶ to hear the correct pronunciation from {currentReciter.name}.
                  </div>
                  <div className="sbtn" onClick={markBatchDone} style={{display:"block",width:"100%",padding:"13px",background:T.accent,color:dark?"#060A07":"#fff",borderRadius:7,fontSize:14,fontWeight:600,textAlign:"center"}}>
                    {sessionJuz===30?"✓ Reviewed These Ayahs — Continue":"✓ Memorized These Ayahs — Unlock Next Batch"}
                  </div>
                </div>
              )}
            </div>
          )}

          {!sessLoading&&batch.length===0&&totalSV>0&&(
            <div style={{textAlign:"center",paddingTop:40}}>
              <div style={{fontSize:26,marginBottom:10}}>🎉</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:T.accent,marginBottom:6}}>Juz {sessionJuz} Complete — Alhamdulillah!</div>
              <div style={{fontSize:13,color:T.sub}}>Select the next Juz above to continue.</div>
            </div>
          )}
        </div>
      )}

      {/* ═══ CALENDAR TAB ═══ */}
      {activeTab==="rihlah"&&rihlahTab==="home"&&(()=>{
        const today=new Date();
        const firstDay=new Date(calYear,calMonth,1).getDay();
        const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
        const cells=[];
        for(let i=0;i<firstDay;i++) cells.push(null);
        for(let d=1;d<=daysInMonth;d++) cells.push(d);
        const prevMon=()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);};
        const nextMon=()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);};
        let fullDays=0,totalChecksMonth=0;
        for(let d=1;d<=daysInMonth;d++){
          const dk=`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const dd=checkHistory[dk]||{};
          const cnt=SESSIONS.filter(s=>dd[s.id]).length;
          if(cnt===5)fullDays++;
          totalChecksMonth+=cnt;
        }
        const pastDays=(calMonth===today.getMonth()&&calYear===today.getFullYear())?today.getDate():daysInMonth;
        const consistency=pastDays>0?Math.round((fullDays/pastDays)*100):0;
        return (
          <div style={{flex:1,overflowY:"auto",padding:"16px 18px 48px"}} className="fi">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase"}}>My Rihlah</div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:streak>0?"#F6A623":T.dim}}>🔥 {streak}</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:allChecked?"#F0C040":T.dim}}>{checkedCount}/5 today</div>
            </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
              {[
                {label:"Perfect Days",  val:fullDays,         color:"#F0C040",sub:"all 5 sessions"},
                {label:"Total Sessions",val:totalChecksMonth, color:"#4ECDC4",sub:"this month"},
                {label:"Consistency",   val:`${consistency}%`,color:"#F0C040",sub:"of days active"},
                {label:"Day Streak",    val:streak,           color:"#F6A623",sub:"consecutive days"},
              ].map(s=>(
                <div key={s.label} style={{padding:"11px 13px",background:T.surface,border:`1px solid ${s.color}20`,borderTop:`3px solid ${s.color}`,borderRadius:7,textAlign:"center"}}>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,color:s.color,marginBottom:3}}>{s.val}</div>
                  <div style={{fontSize:11,color:T.sub}}>{s.label}</div>
                  <div style={{fontSize:9,color:T.dim,marginTop:1}}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:14}}>
              {Array.from({length:7},(_,i)=>{
                const d=new Date();
                d.setDate(d.getDate()-6+i);
                const dk=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
                const dayData=checkHistory[dk]||{};
                const isToday=i===6;
                const liveData=isToday?{...dayData,...Object.fromEntries(SESSIONS.map(s=>[s.id,!!dailyChecks[s.id]]))}:dayData;
                const allDone=SESSIONS.filter(s=>liveData[s.id]).length===5;
                const dayNames=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                return (
                  <div key={dk} style={{textAlign:"center",padding:"8px 4px",background:allDone?"#F0C04015":isToday?T.accentDim:T.surface,border:`1px solid ${allDone?"#F0C04040":isToday?T.accent+"60":T.border}`,borderRadius:8}}>
                    <div style={{fontSize:9,color:isToday?T.accent:T.dim,textTransform:"uppercase",marginBottom:4}}>{dayNames[d.getDay()]}</div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:isToday?T.accent:T.text,fontWeight:isToday?700:400,marginBottom:6}}>{d.getDate()}</div>
                    <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
                      {SESSIONS.map(s=>(
                        <div key={s.id} style={{width:6,height:6,borderRadius:"50%",background:liveData[s.id]?s.color:T.surface2,border:`1px solid ${liveData[s.id]?s.color:T.border}`}}/>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{marginBottom:16,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
              <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase"}}>Today's Checklist — {FMTDATE()}</div>
                {allChecked&&<div style={{fontSize:11,color:"#F0C040",fontWeight:600}}>✓ All done — MashaAllah!</div>}
              </div>
              {SESSIONS.map((s,i)=>{
                const done=!!dailyChecks[s.id];
                return (
                  <div key={s.id} className="chkrow" onClick={()=>toggleCheck(s.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",background:done?`${s.color}0A`:T.surface,borderBottom:i<SESSIONS.length-1?`1px solid ${T.border}`:"none",borderLeft:`3px solid ${done?s.color:T.border2}`}}>
                    <div style={{width:21,height:21,borderRadius:5,flexShrink:0,background:done?s.color:T.surface2,border:`2px solid ${done?s.color:T.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {done&&<span style={{fontSize:11,color:dark?"#060A07":"#fff",fontWeight:700}}>✓</span>}
                    </div>
                    <span style={{fontSize:16,flexShrink:0}}>{s.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:done?s.color:T.sub}}>{s.time}</span>
                        <span style={{fontSize:11,color:done?s.color:T.text,fontWeight:500,textDecoration:done?"line-through":"none",opacity:done?0.7:1}}>{s.title}</span>
                      </div>
                      <div style={{fontSize:10,color:T.vdim,marginTop:1}}>{s.desc.substring(0,72)}...</div>
                    </div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:s.color,flexShrink:0,background:`${s.color}15`,padding:"2px 7px",borderRadius:10}}>
                      {s.id==="fajr"&&`${dailyNew} ayahs`}{s.id==="dhuhr"&&`${timeline.revDuhr} ayahs`}{s.id==="asr"&&`${timeline.revAsr} ayahs`}{s.id==="maghrib"&&"15-20 min"}{s.id==="isha"&&"All today"}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:16}}>
              <div className="sbtn" onClick={()=>setRihlahTab("juz")} style={{padding:"14px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,textAlign:"center",cursor:"pointer"}}>
                <div style={{fontSize:20,marginBottom:4}}>📖</div>
                <div style={{fontSize:12,fontWeight:600,color:T.text}}>My Juz</div>
                <div style={{fontSize:10,color:T.dim}}>Track memorization</div>
              </div>
              <div className="sbtn" onClick={()=>setRihlahTab("timeline")} style={{padding:"14px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,textAlign:"center",cursor:"pointer"}}>
                <div style={{fontSize:20,marginBottom:4}}>⏱️</div>
                <div style={{fontSize:12,fontWeight:600,color:T.text}}>Timeline</div>
                <div style={{fontSize:10,color:T.dim}}>Goal calculator</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ TRACKER ═══ */}
      {activeTab==="rihlah"&&rihlahTab==="juz"&&(
        <div style={{flex:1,overflowY:"auto",padding:"14px 18px 40px"}} className="fi">
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div className="sbtn" onClick={()=>setRihlahTab("home")} style={{padding:"6px 12px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,fontSize:11,color:T.sub,cursor:"pointer"}}>← Back</div>
              <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase"}}>My Juz</div>
            </div>
          <div style={{marginBottom:10,padding:"9px 13px",background:T.surface,border:`1px solid ${T.accent}18`,borderLeft:`3px solid ${T.accent}`,borderRadius:"0 6px 6px 0",fontSize:12,color:T.sub,lineHeight:1.7}}>
            🕌 <strong style={{color:T.accent}}>Priority:</strong> Find a Sheikh — even monthly check-ins protect your tajweed.
          </div>
          <div style={{marginBottom:14,padding:"9px 13px",background:T.surface,border:"1px solid #F0C04015",borderLeft:"3px solid #F0C040",borderRadius:"0 6px 6px 0",fontSize:12,color:T.sub,lineHeight:1.7}}>
            📖 <strong style={{color:"#F0C040"}}>Order:</strong> Juz 29 → 28 → 27 → ... → 1. Click any tile to update and add notes.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))",gap:7}}>
            {JUZ_META.map(j=>{
              const st=juzStatus[j.num]||"not_started",cfg=STATUS_CFG[st],isSel=selectedJuz===j.num;
              return (
                <div key={j.num} style={{borderRadius:7,background:T.surface,border:`1px solid ${cfg.color}25`,borderTop:`3px solid ${cfg.color}`,overflow:"hidden"}}>
                  <div className="sbtn" onClick={()=>setSelectedJuz(isSel?-1:j.num)} style={{padding:"10px 11px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.dim}}>Juz {j.num}</span>
                      <div style={{width:7,height:7,borderRadius:"50%",background:cfg.color}}/>
                    </div>
                    <div style={{fontSize:14,color:T.accent,direction:"rtl",textAlign:"right",marginBottom:2}}>{j.arabic}</div>
                    <div style={{fontSize:9,color:T.vdim}}>{j.roman}</div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:cfg.color+"90",marginTop:5}}>{cfg.label}</div>
                  </div>
                  {isSel&&(
                    <div className="fi" style={{padding:"10px 11px",borderTop:`1px solid ${cfg.color}18`,background:T.surface2}}>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:7}}>
                        {Object.entries(STATUS_CFG).map(([key,s])=>(
                          <div key={key} className="sbtn" onClick={()=>setJuzStatus(p=>({...p,[j.num]:key}))} style={{fontSize:9,padding:"3px 7px",borderRadius:4,background:st===key?s.color+"18":T.surface,border:`1px solid ${st===key?s.color+"55":T.border}`,color:st===key?s.color:T.dim}}>{s.label}</div>
                        ))}
                      </div>
                      <textarea value={notes[j.num]||""} onChange={e=>setNotes(p=>({...p,[j.num]:e.target.value}))} placeholder="Notes, difficult ayahs, sheikh feedback..." style={{width:"100%",background:T.input,border:`1px solid ${T.inputBorder}`,borderRadius:4,color:T.inputText,fontSize:11,padding:"7px 9px",lineHeight:1.6,fontFamily:"'DM Sans',sans-serif",minHeight:50,resize:"vertical"}}/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ QURAN TEXT ═══ */}
      {activeTab==="quran"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} className="fi">
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <select value={selectedJuz} onChange={e=>setSelectedJuz(Number(e.target.value))} style={{background:T.surface2,border:`1px solid ${T.border}`,color:T.text,fontSize:13,padding:"6px 10px",borderRadius:6,outline:"none",fontFamily:"'DM Sans',sans-serif"}}>
                  {JUZ_META.map(j=><option key={j.num} value={j.num}>Juz {j.num} — {j.roman}</option>)}
                </select>
                <span style={{fontSize:10,color:curCfg.color,background:curCfg.color+"18",padding:"3px 9px",borderRadius:10}}>{curCfg.label}</span>
              </div>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <div className="sbtn" onClick={()=>setFontSize(f=>Math.max(14,f-2))} style={{width:28,height:28,borderRadius:5,background:T.surface2,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",color:T.sub,fontSize:15}}>−</div>
                <span style={{fontSize:10,color:T.dim,width:26,textAlign:"center"}}>{fontSize}</span>
                <div className="sbtn" onClick={()=>setFontSize(f=>Math.min(40,f+2))} style={{width:28,height:28,borderRadius:5,background:T.surface2,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",color:T.sub,fontSize:15}}>+</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap"}}>
              <span style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:T.text}}>Juz {meta?.num}</span>
              <span style={{fontSize:17,color:`${T.accent}80`,direction:"rtl"}}>{meta?.arabic}</span>
              <span style={{fontSize:11,color:T.sub,fontStyle:"italic"}}>{meta?.roman}</span>
            </div>
          </div>
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0,minHeight:0}}>
            <div style={{flex:1,overflowY:"auto",padding:"14px 18px 40px"}}>
              {loading&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:60,gap:12}}><div className="spin" style={{width:26,height:26,border:`2px solid ${T.border}`,borderTopColor:"#F0C040",borderRadius:"50%"}}/><div style={{fontSize:12,color:T.dim}}>{loadMsg}</div></div>}
              {fetchError&&!loading&&<div style={{textAlign:"center",paddingTop:60}}><div style={{fontSize:14,color:"#E5534B",marginBottom:8}}>Could not load text</div><div style={{fontSize:12,color:T.dim}}>Check your internet connection.</div></div>}
              {!loading&&!fetchError&&surahGroups.length>0&&(
                <div className="fi">
                  {surahGroups.map(({surahNum,verses})=>{
                    const isOpen=openSurah===surahNum;
                    const startA=verses[0]?.verse_key?.split(":")?.[1];
                    const endA=verses[verses.length-1]?.verse_key?.split(":")?.[1];
                    return (
                      <div key={surahNum} style={{marginBottom:5}}>
                        <div style={{display:"flex",alignItems:"center",background:isOpen?T.surface2:T.surface,border:`1px solid ${isOpen?T.accent+"30":T.border}`,borderLeft:`3px solid ${isOpen?T.accent:T.border2}`,borderRadius:isOpen?"6px 6px 0 0":"6px",overflow:"hidden"}}>
                          <div className="srow" onClick={()=>setOpenSurah(isOpen?null:surahNum)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",flex:1}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:`${T.accent}80`,background:T.accentDim,padding:"2px 6px",borderRadius:3}}>{surahNum}</div>
                              <div>
                                <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,color:isOpen?T.text:T.sub}}>{SURAH_EN[surahNum]}</div>
                                <div style={{fontSize:8,color:T.vdim,marginTop:1}}>Ayahs {startA}–{endA} · {verses.length} verses</div>
                              </div>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{fontFamily:"'Amiri',serif",fontSize:18,color:isOpen?T.accent:T.dim,direction:"rtl"}}>{SURAH_AR[surahNum]}</div>
                              <div style={{color:isOpen?T.accent:T.dim,fontSize:16,transition:"transform .2s",transform:isOpen?"rotate(90deg)":"none"}}>›</div>
                            </div>
                          </div>
                          <div className="sbtn" onClick={(e)=>{e.stopPropagation();playSurahQueue(verses,surahNum);}} style={{padding:"0 14px",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",borderLeft:`1px solid ${T.border}`,background:playingSurah===surahNum?T.accent+"18":T.surface,minHeight:44,minWidth:44}}>
                            {audioLoading&&playingSurah===surahNum
                              ?<div className="spin" style={{width:14,height:14,border:`2px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%"}}/>
                              :<span style={{fontSize:16,color:playingSurah===surahNum?T.accent:T.dim}}>{playingSurah===surahNum?"⏸":"▶"}</span>
                            }
                          </div>
                        </div>
                        {isOpen&&(
                          <div className="fi" style={{background:T.surface,border:`1px solid ${T.accent}15`,borderTop:"none",borderRadius:"0 0 6px 6px",padding:"18px 22px 24px"}}>
                            {surahNum!==9&&startA==="1"&&<div style={{textAlign:"center",marginBottom:18}}><span style={{fontFamily:"'Amiri',serif",fontSize:fontSize+2,color:T.accent}}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</span></div>}
                            <p style={{direction:"rtl",textAlign:"justify",fontFamily:"'Amiri',serif",fontSize:`${fontSize}px`,lineHeight:2.8,color:T.text}}>
                              {verses.map(v=>{
                                const vNum=v.verse_key?.split(":")?.[1];
                                const vKey=v.verse_key;
                                const isPlaying=playingKey===vKey;
                                return (
                                  <span key={vKey} style={{background:isPlaying?T.accent+"20":"transparent",borderRadius:4,padding:isPlaying?"0 3px":0,transition:"background .3s"}}>
                                    <span style={{color:isPlaying?T.accent:T.text}}>{v.text_uthmani}</span>
                                    <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"1.3em",height:"1.3em",borderRadius:"50%",border:`1px solid ${isPlaying?T.accent:T.accent}30`,color:isPlaying?T.accent:`${T.accent}65`,fontSize:"0.4em",fontFamily:"'IBM Plex Mono',monospace",margin:"0 5px",verticalAlign:"middle",background:isPlaying?T.accent+"20":"transparent"}}>{vNum}</span>
                                    {" "}
                                  </span>
                                );
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TIMELINE ═══ */}
      {activeTab==="rihlah"&&rihlahTab==="timeline"&&(
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px 48px"}} className="fi">
         <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div className="sbtn" onClick={()=>setRihlahTab("home")} style={{padding:"6px 12px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,fontSize:11,color:T.sub,cursor:"pointer"}}>← Back</div>
              <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase"}}>Timeline</div>
            </div> 
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:T.text,marginBottom:14}}>Memorization Timeline Calculator</div>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"14px 18px",marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
              <span style={{fontSize:12,color:T.sub}}>I want to complete my Hifz in:</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,color:T.accent,fontWeight:600}}>{goalYears} {goalYears===1?"year":"years"}</span>
            </div>
            <input type="range" min={1} max={10} value={goalYears} onChange={e=>setGoalYears(Number(e.target.value))} style={{width:"100%",marginBottom:7}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,marginBottom:4}}>
              <span style={{fontSize:12,color:T.sub}}>Additional months:</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,color:T.accent,fontWeight:600}}>{goalMonths} {goalMonths===1?"month":"months"}</span>
            </div>
            <input type="range" min={1} max={11} value={goalMonths} onChange={e=>setGoalMonths(Number(e.target.value))} style={{width:"100%",marginBottom:7}}/>
            <div style={{display:"none",justifyContent:"space-between",fontSize:9,color:T.vdim}}>
              {[0,1,2,3,4,5,6,7,8,9,10,11].map(m=><span key={m} style={{color:m===goalMonths?T.accent:T.vdim,fontWeight:m===goalMonths?600:400}}>{m}m</span>)}
            </div>
            <div style={{display:"none",justifyContent:"space-between",fontSize:9,color:T.vdim}}>
              {[1,2,3,4,5,6,7,8,9,10].map(y=><span key={y} style={{color:y===goalYears?T.accent:T.vdim,fontWeight:y===goalYears?600:400}}>{y}y</span>)}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:8,marginBottom:14}}>
            {[
              {label:"Juz Remaining", val:`${timeline.juzLeft}`,     color:"#F0C040",sub:"to memorize"},
              {label:"Ayahs Per Day", val:timeline.ayahsPerDay,       color:"#F0C040",sub:"daily minimum"},
              {label:"Days Per Juz",  val:`~${timeline.daysPerJuz}d`, color:"#F6A623",sub:"per juz"},
              {label:"Juz Per Month", val:timeline.juzPerMonth,       color:"#B794F4",sub:"monthly pace"},
            ].map(s=>(
              <div key={s.label} style={{padding:"11px 13px",background:T.surface,border:`1px solid ${s.color}20`,borderTop:`3px solid ${s.color}`,borderRadius:7}}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:22,color:s.color,lineHeight:1,marginBottom:3}}>{s.val}</div>
                <div style={{fontSize:11,color:T.sub,marginBottom:2}}>{s.label}</div>
                <div style={{fontSize:9,color:T.dim}}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 16px",marginBottom:14}}>
            <div style={{fontSize:9,color:T.dim,letterSpacing:".15em",textTransform:"uppercase",marginBottom:10}}>Daily Breakdown — {goalYears}-Year Goal</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(168px,1fr))",gap:7}}>
              {SESSIONS.map(s=>(
                <div key={s.id} style={{padding:"9px 11px",background:T.surface2,border:`1px solid ${s.color}18`,borderLeft:`3px solid ${s.color}`,borderRadius:"0 6px 6px 0"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><span style={{fontSize:13}}>{s.icon}</span><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:s.color}}>{s.time}</span></div>
                  <div style={{fontSize:11,color:T.sub,marginBottom:2}}>{s.title}</div>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:s.color,fontWeight:600}}>
                    {s.id==="fajr"&&`${dailyNew} new ayahs`}{s.id==="dhuhr"&&`~${timeline.revDuhr} ayahs`}{s.id==="asr"&&`~${timeline.revAsr} ayahs`}{s.id==="maghrib"&&"Passive 15-20 min"}{s.id==="isha"&&"All of today"}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",marginBottom:24}}>
            <div style={{fontSize:9,color:T.dim,letterSpacing:".15em",textTransform:"uppercase",marginBottom:8}}>Compare Timelines</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {[1,2,3,5,7,10].map(y=>{const t=calcTimeline(y,completedCount),isA=y===goalYears;return <div key={y} className="sbtn" onClick={()=>setGoalYears(y)} style={{flex:1,minWidth:75,padding:"9px",background:isA?T.surface2:T.surface,border:`1px solid ${isA?T.accent+"40":T.border}`,borderRadius:5,textAlign:"center"}}><div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:isA?T.accent:T.dim,fontWeight:isA?600:400,marginBottom:2}}>{y}{y===1?"yr":"yrs"}</div><div style={{fontSize:10,color:isA?T.sub:T.vdim}}>{t.ayahsPerDay}/day</div></div>;})}
            </div>
          </div>
          {/* Method steps */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:9,color:T.dim,letterSpacing:".15em",textTransform:"uppercase",marginBottom:8}}>How To Memorize — Step By Step</div>
            {SESSIONS.map(s=>(
              <div key={s.id} style={{marginBottom:6,background:T.surface,border:`1px solid ${openMethod===s.id?s.color+"50":T.border}`,borderLeft:`3px solid ${s.color}`,borderRadius:"0 7px 7px 0",overflow:"hidden"}}>
                <div className="sbtn" onClick={()=>setOpenMethod(openMethod===s.id?null:s.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px"}}>
                  <span style={{fontSize:16}}>{s.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:openMethod===s.id?s.color:T.text}}>{s.time} — {s.title}</div>
                    <div style={{fontSize:10,color:T.dim,marginTop:1}}>{s.desc}</div>
                  </div>
                  <span style={{fontSize:12,color:T.dim,transform:openMethod===s.id?"rotate(90deg)":"none",transition:"transform .2s"}}>›</span>
                </div>
                {openMethod===s.id&&(
                  <div style={{padding:"0 14px 12px 14px",borderTop:`1px solid ${T.border}`}}>
                    {s.steps.map((step,i)=>(
                      <div key={i} style={{display:"flex",gap:10,padding:"7px 0",borderBottom:i<s.steps.length-1?`1px solid ${T.border}`:"none"}}>
                        <div style={{width:20,height:20,borderRadius:"50%",background:s.color+"20",border:`1px solid ${s.color}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:9,color:s.color,fontWeight:700}}>{i+1}</span>
                        </div>
                        <span style={{fontSize:11,color:T.sub,lineHeight:1.5}}>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{padding:"14px 18px",background:T.surface,border:`1px solid ${T.accent}20`,borderRadius:8,textAlign:"center"}}>
            <div style={{fontFamily:"'Amiri',serif",fontSize:22,color:T.accent,direction:"rtl",marginBottom:6}}>وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ</div>
            <div style={{fontSize:12,color:T.sub,fontStyle:"italic",marginBottom:3}}>"And We have certainly made the Quran easy for remembrance"</div>
            <div style={{fontSize:10,color:T.dim}}>Al-Qamar 54:17</div>
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
          {n:1, taraweeh:"lRwXLCF8Udk", tahajjud:null},
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

    </div>
  );
}
