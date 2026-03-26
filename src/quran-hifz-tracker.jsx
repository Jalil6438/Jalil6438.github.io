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
  { id:"dosari",  name:"Yasser Al-Dosari",       arabic:"ياسر الدوسري",     recitationId:137, everyayah:"Yasser_Ad-Dussary_128kbps",            quranicaudioId:97,  tag:"Masjid Al-Haram"  },
  { id:"juhany",  name:"Abdullah Al-Juhany",     arabic:"عبدالله الجهني",   recitationId:140, everyayah:"Abdullaah_3awwaad_Al-Juhaynee_128kbps", quranicaudioId:1,   tag:"Masjid Al-Haram"  },
  { id:"sudais",  name:"Abdul Rahman As-Sudais", arabic:"عبدالرحمن السديس", recitationId:2,   everyayah:"Abdurrahmaan_As-Sudais_192kbps",        quranicaudioId:7,   tag:"Masjid Al-Haram"  },
  { id:"shuraim", name:"Saud Ash-Shuraim",       arabic:"سعود الشريم",      recitationId:4,   everyayah:"Saood_ash-Shuraym_128kbps",             quranicaudioId:4,   tag:"Masjid Al-Haram"  },
  { id:"muaiqly", name:"Maher Al-Muaiqly",       arabic:"ماهر المعيقلي",    recitationId:128, everyayah:"MaherAlMuaiqly128kbps",                 quranicaudioId:159, tag:"Masjid Al-Haram"  },
  { id:"hudhaify",name:"Ali Al-Hudhaify",        arabic:"علي الحذيفي",      recitationId:10,  everyayah:"Hudhaify_128kbps",                      quranicaudioId:8,   tag:"Masjid An-Nabawi" },
  { id:"ayyoub",  name:"Muhammad Ayyoub",        arabic:"محمد أيوب",        recitationId:99,  everyayah:"Muhammad_Ayyoub_128kbps",               quranicaudioId:107, tag:"Masjid An-Nabawi" },
  { id:"budair",  name:"Salah Al-Budair",        arabic:"صلاح البدير",      recitationId:135, everyayah:"Salah_Al_Budair_128kbps",               quranicaudioId:43,  tag:"Masjid An-Nabawi" },
];

// ── SESSIONS ──────────────────────────────────────────────────────────────────
const SESSIONS = [
  { id:"fajr",    time:"Fajr",    arabic:"الفجر",  icon:"🌅", color:"#F0C040", title:"New Memorization",   desc:"Your peak retention window. Memorize new ayahs right after salah while the mind is completely fresh.",   steps:["Read with translation to understand the meaning","Recite aloud 10x looking at the text","Cover and recite from memory — fix mistakes immediately","Repeat until 3 times without looking","Write from memory once to cement them"] },
  { id:"dhuhr",   time:"Dhuhr",   arabic:"الظهر",  icon:"☀️", color:"#F6A623", title:"Revise Yesterday",   desc:"New ayahs fade fastest in 24 hours. Revision only — no new memorization.",                              steps:["Recite everything from yesterday from memory","For stumbling ayahs — look, re-read 5x, cover and retry","Connect yesterday to today as one continuous passage"] },
  { id:"asr",     time:"Asr",     arabic:"العصر",  icon:"🌤️", color:"#4ECDC4", title:"Older Juz Revision", desc:"Cycle through completed Juz. Every Juz should be touched every 7-10 days.",                            steps:["Pick the Juz you have not revised most recently","Recite a full page from memory","Mark which Juz you revised in your tracker"] },
  { id:"maghrib", time:"Maghrib", arabic:"المغرب", icon:"🌆", color:"#B794F4", title:"Listening",          desc:"Follow along with your chosen reciter. Your ear reinforces what your tongue is learning.",              steps:["Select a reciter and press play on each ayah","Follow along in the mushaf — listen, do not recite yet","Trains correct pronunciation and rhythm passively"] },
  { id:"isha",    time:"Isha",    arabic:"العشاء", icon:"🌙", color:"#68D391", title:"Full Day Review",    desc:"Recite everything from today before sleep. Sleep consolidates what you review right before it.",         steps:["Recite today's new Fajr ayahs from memory","Then yesterday's ayahs","End with dua asking Allah to keep the Quran in your heart"] },
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
  complete:       {label:"Memorized",      color:"#F0C040"},
  in_progress:    {label:"In Progress",    color:"#F6A623"},
  needs_revision: {label:"Needs Revision", color:"#E5534B"},
  not_started:    {label:"Not Started",    color:"#3A8A50"},
};

function calcTimeline(years, juzDone) {
  const juzLeft=Math.max(1,30-juzDone), ayahsLeft=juzLeft*208;
  const active=Math.round(years*365*0.85), apd=Math.max(1,ayahsLeft/active);
  return { ayahsPerDay:apd.toFixed(1), daysPerJuz:Math.round(active/juzLeft),
           juzPerMonth:(juzLeft/(years*12)).toFixed(1),
           revDuhr:Math.max(1,Math.round(apd)), revAsr:Math.max(1,Math.round(apd*4)),
           activeDays:active, ayahsLeft, juzLeft };
}

const DARK  = {bg:"#060A07",surface:"#0D1008",surface2:"#141A0F",border:"#1E2A18",border2:"#1A2814",text:"#EDE8DC",sub:"#A8B89A",dim:"#5A7050",vdim:"#2E4030",accent:"#F0C040",accentDim:"#F0C04018",input:"#0A0E07",inputBorder:"#1E2A18",inputText:"#8AAA78"};
const LIGHT = {bg:"#F7F3EC",surface:"#FFFFFF",surface2:"#F0EBE0",border:"#DDD4C0",border2:"#D0C8B0",text:"#1A2A18",sub:"#4A6A40",dim:"#7A8A70",vdim:"#9A9A88",accent:"#8B6A10",accentDim:"#8B6A1012",input:"#F7F3EC",inputBorder:"#CCC4B0",inputText:"#3A6A40"};
const MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];
const TODAY=()=>new Date().toDateString();
const DATEKEY=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const FMTDATE=()=>new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});

const LIVE_STREAMS = [
  { id:"makkah", name:"Masjid Al-Haram — Makkah", arabic:"قناة القرآن الكريم", color:"#E5534B", icon:"🕋", label:"Makkah", yt:"https://www.youtube.com/@saudiqurantv/live", channelId:"UCos52azQNBgW63_9uDJoPDA", desc:"Saudi Quran Channel · 24/7 Live" },
  { id:"madinah", name:"Masjid An-Nabawi — Madinah", arabic:"قناة السنة النبوية", color:"#F0C040", icon:"🌙", label:"Madinah", yt:"https://www.youtube.com/@saudisunnahtv/live", channelId:"UCROKYPep-UuODNwyipe6JMw", desc:"Saudi Sunnah Channel · 24/7 Live" },
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

const MAKKAH_IMAMS = [
  { id:"sudais2",   name:"Abdul Rahman As-Sudais", arabic:"عبدالرحمن السديس",  quranicaudio:"abdurrahmaan_as-sudays",        surahCount:114 },
  { id:"shuraim2",  name:"Saud Ash-Shuraim",       arabic:"سعود الشريم",       quranicaudio:"sa3ood_al-shuraym",             surahCount:114 },
  { id:"muaiqly2",  name:"Maher Al-Muaiqly",       arabic:"ماهر المعيقلي",     quranicaudio:"maher_almuaiqly",               surahCount:114 },
  { id:"baleela",   name:"Bandar Baleela",          arabic:"بندر بليلة",        quranicaudio:"bandar_baleela/complete",       surahCount:114 },
  { id:"turki",     name:"Badr Al-Turki",           arabic:"بدر التركي",        quranicaudio:"badr_al_turki/mp3",             surahCount:114 },
  { id:"dossary2",  name:"Yasser Al-Dosari",        arabic:"ياسر الدوسري",      quranicaudio:"yasser_ad-dussary",             surahCount:114 },
  { id:"juhany2",   name:"Abdullah Al-Juhany",      arabic:"عبدالله الجهني",    quranicaudio:"abdullaah_3awwaad_al-juhaynee", surahCount:114 },
  { id:"kalbani",   name:"Adel Kalbani",            arabic:"عادل الكلباني",     quranicaudio:"adel_kalbani",                  surahCount:114 },
];
const MADINAH_IMAMS = [
  { id:"hudhaify2", name:"Ali Al-Hudhaify",         arabic:"علي الحذيفي",       quranicaudio:"huthayfi",                      surahCount:114 },
  { id:"budair2",   name:"Salah Al-Budair",         arabic:"صلاح البدير",       quranicaudio:"salahbudair",                   surahCount:114 },
  { id:"thubaity",  name:"Abdul Bari Ath-Thubaity", arabic:"عبدالباري الثبيتي", quranicaudio:"thubaity",                      surahCount:114 },
  { id:"qasim",     name:"Abdul Muhsin Al-Qasim",   arabic:"عبدالمحسن القاسم",  quranicaudio:"abdul_muhsin_alqasim",          surahCount:114 },
  { id:"imadhafez", name:"Imad Zuhair Hafez",       arabic:"عماد زهير حافظ",    quranicaudio:"imad_zuhair_hafez",             surahCount:114 },
  { id:"alakhdar",  name:"Ibrahim Al-Akhdar",       arabic:"إبراهيم الأخضر",    quranicaudio:"ibrahim_al_akhdar",             surahCount:114 },
  { id:"alijaber",  name:"Ali Jaber",               arabic:"علي جابر",          quranicaudio:"ali_jaber",                     surahCount:114 },
  { id:"ayyoub2",   name:"Muhammad Ayyoub",         arabic:"محمد أيوب",         quranicaudio:"muhammad_ayyoub",               surahCount:114 },
];

// ── SCHOLAR GUIDANCE CARDS ────────────────────────────────────────────────────
const SCHOLAR_CARDS = [
  { scholar:"Prophet Muhammad ﷺ", arabic:"خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ", quote:"The best of you are those who learn the Quran and teach it.", source:"Sahih Al-Bukhari · 5027", color:"#F0C040" },
  { scholar:"Abdullah Ibn Mas'ood رضي الله عنه", arabic:"إِنَّ هَذَا الْقُرْآنَ مَأْدُبَةُ اللَّهِ فَاقْبَلُوا مَأْدُبَتَهُ مَا اسْتَطَعْتُمْ", quote:"This Quran is the banquet of Allah — accept His banquet as much as you are able.", source:"Al-Hakim · Al-Mustadrak", color:"#B794F4" },
  { scholar:"Sheikh Abdul Muhsin Al-Qasim", subtitle:"Imam of Masjid An-Nabawi · Author of the Hifz Method", arabic:"احفظ صفحةً بعد الفجر وصفحةً بعد العصر أو المغرب", quote:"Memorize one page after Fajr and one after Asr — in this way you will complete the Quran in one year with solid memorization.", source:"How to Memorize the Noble Quran", color:"#4ECDC4" },
  { scholar:"Abdullah Ibn Umar رضي الله عنهما", arabic:"كَانَ لاَ يَنَامُ حَتَّى يَتَعَاهَدَ حِفْظَهُ", quote:"He would not sleep at night until he had reviewed and renewed his memorization.", source:"Imam Malik · Al-Muwatta", color:"#68D391" },
];

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function RihlatAlHifz() {
  const [dark,setDark]=useState(true);
  const [showDua,setShowDua]=useState(true);
  const [showOnboarding,setShowOnboarding]=useState(()=>!localStorage.getItem("rihlat-onboarded"));
  const [onboardStep,setOnboardStep]=useState(0);
  const [onboardCardIdx,setOnboardCardIdx]=useState(0);
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
  const [goalMonths,setGoalMonths]=useState(0);
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
  const [quranReciter,setQuranReciter]=useState("dosari");
  const [showReciterModal,setShowReciterModal]=useState(false);
  const [activeStream,setActiveStream]=useState(0);
  const [masjidaynTab,setMasjidaynTab]=useState("live");
  const [rihlahTab,setRihlahTab]=useState("home");
  const [haramainMosque,setHaramainMosque]=useState("makkah");
  const [openImam,setOpenImam]=useState(null);
  const [haramainPlaying,setHaramainPlaying]=useState(null);
  const haramainRef=useRef(null);
  const [showTrans,setShowTrans]=useState(true);
  const [translations,setTranslations]=useState({});
  const [playingKey,setPlayingKey]=useState(null);
  const [audioLoading,setAudioLoading]=useState(null);
  const audioRef=useRef(null);
  const [selectedRamadanNight,setSelectedRamadanNight]=useState(1);
  const [ramadanVideoType,setRamadanVideoType]=useState("taraweeh");
  const [playingSurah,setPlayingSurah]=useState(null);
  const surahQueueRef=useRef([]);
  const surahIdxRef=useRef(0);
  const T=dark?DARK:LIGHT;

  const completedCount=Object.values(juzStatus).filter(s=>s==="complete").length;
  const pct=Math.round((completedCount/30)*100);
  const nextJuz=[...JUZ_META].sort((a,b)=>a.order-b.order).find(j=>juzStatus[j.num]!=="complete");
  const meta=JUZ_META.find(j=>j.num===selectedJuz);
  const curStatus=juzStatus[selectedJuz]||"not_started";
  const curCfg=STATUS_CFG[curStatus];
  const timeline=calcTimeline(goalYears+goalMonths/12, completedCount);
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
        setGoalMonths(p.goalMonths||0);
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
    try { localStorage.setItem("jalil-quran-v8",JSON.stringify({juzStatus,notes,goalYears,goalMonths,sessionJuz,sessionIdx,sessionDone,dark,dailyChecks,streak,checkHistory,reciter,showTrans})); } catch {}
  },[juzStatus,notes,goalYears,goalMonths,sessionJuz,sessionIdx,sessionDone,dark,dailyChecks,streak,checkHistory,reciter,showTrans,loaded]);

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

  useEffect(()=>{if(batch.length&&showTrans)fetchTranslations(batch);},[batch,showTrans]);

  const surahGroups=[];let cur=null;
  allVerses.forEach(v=>{const s=v.surah_number||parseInt(v.verse_key?.split(":")?.[0]);if(s!==cur){cur=s;surahGroups.push({surahNum:s,verses:[]});}surahGroups[surahGroups.length-1].verses.push(v);});

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
    const everyayahUrl=`https://everyayah.com/data/${currentReciter.everyayah}/${String(surah).padStart(3,"0")}${String(ayah).padStart(3,"0")}.mp3`;
    if(!currentReciter.recitationId){ playDirect(everyayahUrl); return; }
    try {
      const res=await fetch(`https://api.qurancdn.com/api/qdc/audio/reciters/${currentReciter.recitationId}/audio_files?chapter_number=${surah}&verse_key=${verseKey}`);
      if(res.ok){
        const data=await res.json();
        const url=data.audio_files?.[0]?.url;
        if(url){ playDirect(url.startsWith("http")?url:`https://audio.qurancdn.com/${url}`); return; }
      }
    } catch {}
    playDirect(everyayahUrl);
  }

  function playSurahQueue(verses,surahNum,startIdx=0){
    if(audioRef.current){audioRef.current.pause();audioRef.current=null;}
    if(playingSurah===surahNum){setPlayingSurah(null);setPlayingKey(null);return;}
    surahQueueRef.current=verses; surahIdxRef.current=startIdx;
    setPlayingSurah(surahNum);
    playNextInQueue(verses,startIdx,surahNum);
  }

  function playNextInQueue(verses,idx,surahNum){
    if(idx>=verses.length){setPlayingSurah(null);setPlayingKey(null);return;}
    const v=verses[idx]; const vKey=v.verse_key; const [surah,ayah]=vKey.split(":");
    setPlayingKey(vKey); setAudioLoading(vKey);
    const folder=currentReciter.everyayah;
    const url=`https://everyayah.com/data/${folder}/${String(surah).padStart(3,"0")}${String(ayah).padStart(3,"0")}.mp3`;
    const audio=new Audio(url); audio.preload="auto";
    audioRef.current=audio;
    audio.oncanplay=()=>setAudioLoading(null);
    audio.onended=()=>{surahIdxRef.current=idx+1;playNextInQueue(surahQueueRef.current,idx+1,surahNum);};
    audio.onerror=()=>{surahIdxRef.current=idx+1;playNextInQueue(surahQueueRef.current,idx+1,surahNum);};
    audio.play().catch(()=>{setAudioLoading(null);setPlayingSurah(null);setPlayingKey(null);});
  }

  function playHaramainSurah(imam,surahNum,key){
    if(haramainPlaying===key){haramainRef.current?.pause();setHaramainPlaying(null);return;}
    if(haramainRef.current){haramainRef.current.pause();haramainRef.current=null;}
    const url=`https://download.quranicaudio.com/quran/${imam.quranicaudio}/${String(surahNum).padStart(3,"0")}.mp3`;
    const audio=new Audio(url);
    haramainRef.current=audio;
    audio.play().catch(()=>{});
    setHaramainPlaying(key);
    audio.onended=()=>setHaramainPlaying(null);
    audio.onerror=()=>setHaramainPlaying(null);
  }

  const TABS=[
    {id:"myhifz",    label:"My Hifz"},
    {id:"rihlah",    label:"My Rihlah"},
    {id:"quran",     label:"Al-Quran Al-Karim"},
    {id:"masjidayn", label:"🕋 Al-Masjidayn"},
  ];

  const RAMADAN_NIGHTS=[
    {n:1,taraweeh:"lRwXLCF8Udk"},{n:2,taraweeh:"aBzvj0UHXsQ"},{n:3,taraweeh:"Vkd3P7PlsLQ"},
    {n:4,taraweeh:"_q0DAbkKDEY"},{n:5,taraweeh:"KzRlzHbsuUc"},{n:6,taraweeh:"9f8tyJ7ZyIw"},
    {n:7,taraweeh:"N1JHCv05Rhw"},{n:8,taraweeh:"6BEn6PD2vjU"},{n:9,taraweeh:"1nnvyGOjpx8"},
    {n:10,taraweeh:"wSnomeZ983I"},{n:11,taraweeh:"I-urbxpNqHU"},{n:12,taraweeh:"ODIE3PM6kSU"},
    {n:13,taraweeh:"PcDI7mbbC88"},{n:14,taraweeh:"-dAdc6dvafc"},{n:15,taraweeh:"vPJDsDCV4t8"},
    {n:16,taraweeh:"HsBdxGMgLs8"},{n:17,taraweeh:"b_MqX9kAcqE"},{n:18,taraweeh:"0NdZR0MdsSg"},
    {n:19,taraweeh:"rg5u3pyKXfM"},{n:20,taraweeh:"MbzjYKYjF1Q"},{n:21,taraweeh:"659qlvcZD4Y"},
    {n:22,taraweeh:"V5nYjrTWT5g"},{n:23,taraweeh:"gRtjM_cwAZc"},{n:24,taraweeh:"C2BOVH9FAus"},
    {n:25,taraweeh:"zwJvs3A6EjA"},{n:26,taraweeh:"BDlvfPriqu4"},{n:27,taraweeh:"WimoXE57I4g"},
    {n:28,taraweeh:"Ls7hQl40M-E"},{n:29,taraweeh:"15Mxmi_hmWY"},{n:30,taraweeh:"RSevando-yI"},
  ];

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:"100vh",color:T.text,display:"flex",flexDirection:"column",transition:"background .25s,color .25s"}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-thumb{border-radius:3px;background:${dark?"#122016":"#C8C0A8"};}
        .sbtn{transition:opacity .12s;cursor:pointer;user-select:none;}.sbtn:hover{opacity:.72;}
        .jrow{cursor:pointer;transition:background .1s;}.jrow:hover{background:${dark?"#0C160E":"#EDE8DC"}!important;}
        .srow{cursor:pointer;transition:background .12s;}.srow:hover{background:${dark?"#0C1A0E":"#EDE8DC"}!important;}
        .chkrow{cursor:pointer;transition:all .13s;}.chkrow:hover{background:${dark?"#0A140C":"#EDE8DC"}!important;}
        .ttab{cursor:pointer;transition:all .15s;user-select:none;}.ttab:hover{opacity:.8;}
        @keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}.fi{animation:fi .22s ease;}
        @keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .9s linear infinite;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}.pulse{animation:pulse 1.6s infinite;}
        .pbfill{transition:width .8s cubic-bezier(.4,0,.2,1);}
        input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;background:${dark?"#0C1A0E":"#D0C8B0"};outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${T.accent};cursor:pointer;}
        textarea:focus{outline:none;} select{cursor:pointer;}
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════════
          ONBOARDING — 5 SCREENS — shows once on first launch
      ══════════════════════════════════════════════════════════════════════ */}
      {showOnboarding&&(
        <div style={{position:"fixed",inset:0,background:"#060A07",zIndex:1000,display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* ── Screen 1: Bismillah ── */}
          {onboardStep===0&&(
            <div className="fi" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"32px 28px",flexDirection:"column",gap:16,textAlign:"center"}}>
              <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(30px,7vw,50px)",color:"#F0C040",direction:"rtl",lineHeight:1.9}}>
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
              </div>
              <div style={{width:50,height:1,background:"#F0C04030",margin:"4px 0"}}/>
              <div>
                <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(15px,3.5vw,20px)",color:"#A8C8A0",direction:"rtl",lineHeight:2,marginBottom:6}}>
                  وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ
                </div>
                <div style={{fontSize:11,color:"#5A7050",fontStyle:"italic",lineHeight:1.7}}>
                  "And We have certainly made the Quran easy for remembrance"<br/>Al-Qamar 54:17
                </div>
              </div>
              <div style={{marginTop:8}}>
                <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(22px,5vw,32px)",color:"#F0C040",direction:"rtl",marginBottom:4}}>رحلة الحفظ</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(17px,4vw,22px)",color:"#EDE8DC",letterSpacing:".04em"}}>Rihlat Al-Hifz</div>
                <div style={{fontSize:9,color:"#2E4030",marginTop:5,letterSpacing:".15em",textTransform:"uppercase"}}>The Journey of Memorization</div>
              </div>
              <div className="sbtn" onClick={()=>setOnboardStep(1)} style={{marginTop:14,padding:"14px 52px",background:"#F0C040",borderRadius:8,fontSize:14,fontWeight:700,color:"#060A07",letterSpacing:".03em"}}>
                Begin Your Journey →
              </div>
              <div style={{fontSize:9,color:"#1E2A18",letterSpacing:".1em",marginTop:4}}>© 2026 NOORTECH ACADEMY</div>
            </div>
          )}

          {/* ── Screen 2: Scholarly Guidance Cards ── */}
          {onboardStep===1&&(()=>{
            const card=SCHOLAR_CARDS[onboardCardIdx];
            return (
              <div className="fi" style={{flex:1,display:"flex",flexDirection:"column",padding:"24px 20px 28px"}}>
                <div style={{fontSize:9,color:"#F0C040",letterSpacing:".22em",textTransform:"uppercase",marginBottom:16,textAlign:"center"}}>
                  Guidance From The Scholars
                </div>
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div className="fi" key={onboardCardIdx} style={{background:"#0D1008",border:`1px solid ${card.color}25`,borderTop:`3px solid ${card.color}`,borderRadius:10,padding:"28px 22px",textAlign:"center",maxWidth:440,width:"100%"}}>
                    <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(16px,3.8vw,22px)",color:card.color,direction:"rtl",lineHeight:2.1,marginBottom:14}}>
                      {card.arabic}
                    </div>
                    <div style={{width:32,height:1,background:`${card.color}20`,margin:"0 auto 14px"}}/>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,color:"#EDE8DC",lineHeight:1.9,marginBottom:10,fontStyle:"italic"}}>
                      "{card.quote}"
                    </div>
                    <div style={{fontSize:12,color:card.color,fontWeight:600,marginBottom:card.subtitle?3:0}}>{card.scholar}</div>
                    {card.subtitle&&<div style={{fontSize:9,color:"#3A5A38",marginBottom:5,lineHeight:1.5}}>{card.subtitle}</div>}
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"#2E4030",marginTop:4}}>{card.source}</div>
                  </div>
                </div>
                {/* Dots */}
                <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:16,marginBottom:14}}>
                  {SCHOLAR_CARDS.map((_,i)=>(
                    <div key={i} className="sbtn" onClick={()=>setOnboardCardIdx(i)} style={{width:i===onboardCardIdx?22:7,height:7,borderRadius:4,background:i===onboardCardIdx?"#F0C040":"#1E2A18",transition:"width .25s"}}/>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  {onboardCardIdx<SCHOLAR_CARDS.length-1?(
                    <>
                      <div className="sbtn" onClick={()=>setOnboardStep(2)} style={{padding:"11px 18px",background:"#0D1008",border:"1px solid #1E2A18",borderRadius:7,fontSize:11,color:"#3A5A38"}}>Skip</div>
                      <div className="sbtn" onClick={()=>setOnboardCardIdx(i=>i+1)} style={{flex:1,padding:"12px",background:"#F0C040",borderRadius:7,fontSize:13,fontWeight:700,color:"#060A07",textAlign:"center"}}>Next →</div>
                    </>
                  ):(
                    <div className="sbtn" onClick={()=>setOnboardStep(2)} style={{flex:1,padding:"13px",background:"#F0C040",borderRadius:7,fontSize:13,fontWeight:700,color:"#060A07",textAlign:"center"}}>Continue →</div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── Screen 3: Goal Setting ── */}
          {onboardStep===2&&(()=>{
            const totalYrs=goalYears+goalMonths/12;
            const t=calcTimeline(totalYrs,completedCount);
            return (
              <div className="fi" style={{flex:1,overflowY:"auto",padding:"24px 20px 32px"}}>
                <div style={{fontSize:9,color:"#F0C040",letterSpacing:".22em",textTransform:"uppercase",marginBottom:6,textAlign:"center"}}>Set Your Goal</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#EDE8DC",textAlign:"center",marginBottom:4}}>How long do you want to take?</div>
                <div style={{fontSize:11,color:"#3A5A38",textAlign:"center",marginBottom:20,fontStyle:"italic"}}>Sheikh Abdul Muhsin recommends 1 year — 1 page/day after Fajr</div>

                <div style={{background:"#0D1008",border:"1px solid #1E2A18",borderRadius:8,padding:"16px 18px",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{fontSize:12,color:"#A8B89A"}}>Years</span>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,color:"#F0C040",fontWeight:600}}>{goalYears} {goalYears===1?"year":"years"}</span>
                  </div>
                  <input type="range" min={1} max={10} value={goalYears} onChange={e=>setGoalYears(Number(e.target.value))} style={{width:"100%",marginBottom:6}}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#2E4030"}}>
                    {[1,2,3,4,5,6,7,8,9,10].map(y=><span key={y} style={{color:y===goalYears?"#F0C040":"#2E4030",fontWeight:y===goalYears?700:400}}>{y}</span>)}
                  </div>
                </div>

                <div style={{background:"#0D1008",border:"1px solid #1E2A18",borderRadius:8,padding:"16px 18px",marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{fontSize:12,color:"#A8B89A"}}>Additional months</span>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,color:"#F0C040",fontWeight:600}}>{goalMonths} {goalMonths===1?"month":"months"}</span>
                  </div>
                  <input type="range" min={0} max={11} value={goalMonths} onChange={e=>setGoalMonths(Number(e.target.value))} style={{width:"100%",marginBottom:6}}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#2E4030"}}>
                    {[0,1,2,3,4,5,6,7,8,9,10,11].map(m=><span key={m} style={{color:m===goalMonths?"#F0C040":"#2E4030",fontWeight:m===goalMonths?700:400}}>{m}</span>)}
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                  {[
                    {label:"Ayahs Per Day",val:t.ayahsPerDay,color:"#F0C040"},
                    {label:"Days Per Juz",val:`~${t.daysPerJuz}d`,color:"#F6A623"},
                    {label:"Juz Per Month",val:t.juzPerMonth,color:"#B794F4"},
                    {label:"Juz Remaining",val:`${t.juzLeft}`,color:"#4ECDC4"},
                  ].map(s=>(
                    <div key={s.label} style={{padding:"12px 14px",background:"#0D1008",border:`1px solid ${s.color}20`,borderTop:`3px solid ${s.color}`,borderRadius:7,textAlign:"center"}}>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:22,color:s.color,marginBottom:3}}>{s.val}</div>
                      <div style={{fontSize:10,color:"#3A5A38"}}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {goalYears===1&&goalMonths===0&&(
                  <div style={{padding:"10px 14px",background:"#F0C04010",border:"1px solid #F0C04030",borderLeft:"3px solid #F0C040",borderRadius:"0 6px 6px 0",marginBottom:14,fontSize:11,color:"#A8B89A",lineHeight:1.7}}>
                    ⭐ <strong style={{color:"#F0C040"}}>Sheikh Abdul Muhsin's recommended pace</strong> — 1 page/day with solid, lasting memorization.
                  </div>
                )}

                <div className="sbtn" onClick={()=>setOnboardStep(3)} style={{display:"block",width:"100%",padding:"14px",background:"#F0C040",color:"#060A07",borderRadius:8,fontSize:14,fontWeight:700,textAlign:"center"}}>
                  Continue →
                </div>
              </div>
            );
          })()}

          {/* ── Screen 4: Mark Your Memorization ── */}
          {onboardStep===3&&(
            <div className="fi" style={{flex:1,display:"flex",flexDirection:"column",padding:"24px 20px 28px",overflow:"hidden"}}>
              <div style={{fontSize:9,color:"#F0C040",letterSpacing:".22em",textTransform:"uppercase",marginBottom:4,textAlign:"center"}}>Your Progress So Far</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:"#EDE8DC",textAlign:"center",marginBottom:4}}>Mark what you've memorized</div>
              <div style={{fontSize:10,color:"#3A5A38",textAlign:"center",marginBottom:10,fontStyle:"italic"}}>Tap a tile to cycle: Not Started → Memorized → In Progress → Needs Revision</div>

              <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:10,flexWrap:"wrap"}}>
                {[{s:"complete",c:"#F0C040",l:"✓ Memorized"},{s:"in_progress",c:"#F6A623",l:"~ In Progress"},{s:"needs_revision",c:"#E5534B",l:"! Needs Revision"}].map(x=>(
                  <div key={x.s} style={{display:"flex",alignItems:"center",gap:4,fontSize:9,color:x.c}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:x.c}}/>{x.l}
                  </div>
                ))}
              </div>

              <div style={{flex:1,overflowY:"auto",marginBottom:12}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5}}>
                  {JUZ_META.map(j=>{
                    const st=juzStatus[j.num]||"not_started";
                    const cols={complete:"#F0C040",in_progress:"#F6A623",needs_revision:"#E5534B",not_started:"#2E4030"};
                    const lbls={complete:"✓",in_progress:"~",needs_revision:"!",not_started:""};
                    const cyc={not_started:"complete",complete:"in_progress",in_progress:"needs_revision",needs_revision:"not_started"};
                    const c=cols[st]; const isSet=st!=="not_started";
                    return (
                      <div key={j.num} className="sbtn" onClick={()=>setJuzStatus(p=>({...p,[j.num]:cyc[st]}))} style={{padding:"8px 4px",background:isSet?`${c}18`:"#0D1008",border:`1px solid ${isSet?c+"50":"#1E2A18"}`,borderRadius:6,textAlign:"center"}}>
                        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:isSet?c:"#2E4030",marginBottom:1}}>{j.num}</div>
                        <div style={{fontFamily:"'Amiri',serif",fontSize:11,color:isSet?c:"#2E4030",direction:"rtl",lineHeight:1.4}}>{j.arabic}</div>
                        {isSet&&<div style={{fontSize:8,color:c,fontWeight:700,marginTop:1}}>{lbls[st]}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{fontSize:10,color:"#3A5A38",textAlign:"center",marginBottom:10}}>
                {completedCount>0?`${completedCount} Juz marked · الحمد لله 🤲`:"Tap tiles to mark your progress — or skip if just starting"}
              </div>
              <div className="sbtn" onClick={()=>setOnboardStep(4)} style={{display:"block",width:"100%",padding:"14px",background:"#F0C040",color:"#060A07",borderRadius:8,fontSize:14,fontWeight:700,textAlign:"center"}}>
                Continue →
              </div>
            </div>
          )}

          {/* ── Screen 5: Begin ── */}
          {onboardStep===4&&(()=>{
            const t=calcTimeline(goalYears+goalMonths/12,completedCount);
            return (
              <div className="fi" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"32px 24px",flexDirection:"column",gap:14,textAlign:"center"}}>
                <div style={{fontSize:40,marginBottom:2}}>🤲</div>
                <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(26px,6vw,40px)",color:"#F0C040",direction:"rtl",lineHeight:1.9}}>
                  بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
                </div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:"#EDE8DC"}}>Your journey begins now</div>
                <div style={{fontSize:11,color:"#3A5A38",maxWidth:300,lineHeight:1.9,fontStyle:"italic"}}>
                  May Allah make the Quran the light of your heart, the joy of your chest, and the companion of your grave.
                </div>
                <div style={{background:"#0D1008",border:"1px solid #1E2A18",borderRadius:8,padding:"14px 20px",maxWidth:300,width:"100%",textAlign:"left",marginTop:2}}>
                  <div style={{fontSize:9,color:"#2E4030",marginBottom:10,letterSpacing:".12em",textTransform:"uppercase"}}>Your Hifz Plan</div>
                  {[
                    {l:"Goal",       v:`${goalYears}y${goalMonths>0?` ${goalMonths}m`:""}`},
                    {l:"Ayahs/day",  v:`${t.ayahsPerDay}`},
                    {l:"Juz marked", v:`${completedCount}/30`},
                  ].map(row=>(
                    <div key={row.l} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:11,color:"#5A7050"}}>{row.l}</span>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"#F0C040",fontWeight:600}}>{row.v}</span>
                    </div>
                  ))}
                </div>
                <div className="sbtn" onClick={()=>{setShowOnboarding(false);localStorage.setItem("rihlat-onboarded","1");}} style={{marginTop:6,padding:"15px 52px",background:"#F0C040",borderRadius:8,fontSize:15,fontWeight:700,color:"#060A07",letterSpacing:".03em"}}>
                  بِسْمِ اللَّهِ — Begin
                </div>
                <div style={{fontSize:9,color:"#1E2A18",letterSpacing:".1em"}}>© 2026 NOORTECH ACADEMY</div>
              </div>
            );
          })()}

        </div>
      )}

      {/* DUA MODAL */}
      {!showOnboarding&&showDua&&(
        <div style={{position:"fixed",inset:0,background:"#060A07EE",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          {(()=>{
            const DUAS=[
              {arabic:"رَبِّ زِدْنِي عِلْمًا",transliteration:"Rabbi zidni ilma",translation:"My Lord, increase me in knowledge.",source:"Surah Ta-Ha · 20:114"},
              {arabic:"رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",transliteration:"Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina adhaban-nar",translation:"Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",source:"Surah Al-Baqarah · 2:201"},
              {arabic:"رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا",transliteration:"Rabbana la tuzigh qulubana ba'da idh hadaytana",translation:"Our Lord, do not let our hearts deviate after You have guided us.",source:"Surah Aal-Imran · 3:8"},
              {arabic:"اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا",transliteration:"Allahumma inni as'aluka ilman nafi'an wa rizqan tayyiban wa amalan mutaqabbala",translation:"O Allah, I ask You for beneficial knowledge, pure provision, and accepted deeds.",source:"Morning Dua · Ibn Majah"},
              {arabic:"رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",transliteration:"Rabbi ishrah li sadri wa yassir li amri",translation:"My Lord, expand my chest and ease my affairs.",source:"Surah Ta-Ha · 20:25-26"},
              {arabic:"اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",transliteration:"Allahumma a'inni ala dhikrika wa shukrika wa husni ibadatik",translation:"O Allah, help me to remember You, to be grateful to You, and to worship You in an excellent manner.",source:"Abu Dawud · After every Salah"},
            ];
            const d=DUAS[duaIdx%DUAS.length];
            return (
              <div className="fi" style={{background:"#060A07",border:`1px solid ${T.accent}50`,borderRadius:12,padding:"32px 26px",maxWidth:500,width:"100%",textAlign:"center"}}>
                <div style={{fontSize:9,color:T.accent,letterSpacing:".22em",textTransform:"uppercase",marginBottom:16}}>Begin With Dua</div>
                <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(18px,4vw,30px)",color:T.accent,direction:"rtl",lineHeight:2.1,marginBottom:12}}>{d.arabic}</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:12,color:T.sub,fontStyle:"italic",marginBottom:4}}>"{d.transliteration}"</div>
                <div style={{fontSize:12,color:T.text,marginBottom:4,lineHeight:1.6}}>{d.translation}</div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.dim,marginBottom:24}}>{d.source}</div>
                <div className="sbtn" onClick={()=>{setShowDua(false);setDuaIdx(i=>(i+1)%6);}} style={{padding:"11px 30px",background:T.accent,color:dark?"#060A07":"#fff",borderRadius:6,fontSize:13,fontWeight:600,display:"inline-block"}}>
                  بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
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
          <div key={t.id} className="ttab" onClick={()=>{setActiveTab(t.id);if(t.id==="rihlah")setRihlahTab("home");}} style={{padding:"10px 14px",fontSize:12,fontWeight:activeTab===t.id?700:400,color:activeTab===t.id?T.accent:T.dim,borderBottom:`2px solid ${activeTab===t.id?T.accent:"transparent"}`,whiteSpace:"nowrap",background:activeTab===t.id?T.accentDim:"transparent"}}>
            {t.label}
          </div>
        ))}
      </div>

      {/* ═══ MY HIFZ TAB ═══ */}
      {activeTab==="myhifz"&&(
        <div style={{flex:1,overflowY:"auto",padding:"16px 18px 48px"}} className="fi">
          <div style={{marginBottom:14,padding:"12px 16px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8}}>
            <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase",marginBottom:8}}>Select Reciter</div>
            <select value={reciter} onChange={e=>setReciter(e.target.value)} style={{width:"100%",padding:"10px 12px",background:T.surface2,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,fontSize:12,outline:"none"}}>
              {RECITERS.map(r=><option key={r.id} value={r.id}>{r.name} — {r.arabic}</option>)}
            </select>
          </div>

          <div style={{marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase",marginBottom:2}}>Active Memorization</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:T.text}}>Juz {sessionJuz} — <span style={{color:T.accent}}>{sessM?.arabic}</span></div>
              <div style={{fontSize:11,color:T.sub}}>{sessM?.roman}</div>
            </div>
            <select value={sessionJuz} onChange={e=>{setSessionJuz(Number(e.target.value));setSessionIdx(0);}} style={{background:T.surface2,border:`1px solid ${T.border}`,color:T.text,fontSize:11,padding:"5px 9px",borderRadius:5,outline:"none"}}>
              {JUZ_META.map(j=><option key={j.num} value={j.num}>Juz {j.num} — {j.roman}{j.num===30?" ✓ (Revision)":""}</option>)}
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
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
                <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase"}}>{sessionJuz===30?"Revision Batch":"Fajr Batch"} — Ayahs {bStart+1}–{bEnd} of {totalSV}</div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <div className="sbtn" onClick={()=>setShowTrans(s=>!s)} style={{fontSize:10,padding:"4px 9px",background:showTrans?T.accent+"18":T.surface2,border:`1px solid ${showTrans?T.accent+"50":T.border}`,borderRadius:5,color:showTrans?T.accent:T.dim}}>
                    {showTrans?"Hide EN":"Show EN"}
                  </div>
                  <div className="sbtn" onClick={()=>setFontSize(f=>Math.max(16,f-2))} style={{width:22,height:22,background:T.surface2,border:`1px solid ${T.border}`,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",color:T.sub,fontSize:14}}>−</div>
                  <span style={{fontSize:9,color:T.dim,width:22,textAlign:"center"}}>{fontSize}</span>
                  <div className="sbtn" onClick={()=>setFontSize(f=>Math.min(40,f+2))} style={{width:22,height:22,background:T.surface2,border:`1px solid ${T.border}`,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",color:T.sub,fontSize:14}}>+</div>
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
                          <div className="sbtn" onClick={()=>playAyah(vKey,vKey)} style={{width:32,height:32,borderRadius:"50%",background:isPlaying?T.accent+"25":T.surface2,border:`1px solid ${isPlaying?T.accent:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:isPlaying?T.accent:T.dim}}>
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
                  <div style={{fontSize:12,color:T.sub,marginBottom:14}}>Head to My Rihlah to check off Fajr for today.</div>
                  <div className="sbtn" onClick={()=>{if(bEnd<totalSV){setSessionIdx(bEnd);setSessionDone(d=>d.filter(k=>k!==bKey));}}} style={{display:"inline-block",padding:"12px 28px",background:T.accent,borderRadius:8,fontSize:13,fontWeight:700,color:dark?"#060A07":"#fff"}}>
                    ✓ Done — Next Batch →
                  </div>
                </div>
              ):(
                <div style={{background:T.surface,border:`1px solid ${T.accent}25`,borderRadius:8,padding:"14px 18px"}}>
                  <div style={{fontSize:11,color:T.sub,lineHeight:1.7,marginBottom:12}}>
                    📋 Recite each ayah aloud until you can say it from memory 3 times without looking. Use ▶ to hear the correct pronunciation.
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

      {/* ═══ MY RIHLAH — HOME ═══ */}
      {activeTab==="rihlah"&&rihlahTab==="home"&&(()=>{
        const today=new Date();
        const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
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
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:streak>0?"#F6A623":T.dim}}>🔥 {streak}</div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:allChecked?"#F0C040":T.dim}}>{checkedCount}/5 today</div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
              {[
                {label:"Perfect Days",  val:fullDays,         color:"#F0C040",sub:"all 5 sessions"},
                {label:"Total Sessions",val:totalChecksMonth, color:"#4ECDC4",sub:"this month"},
                {label:"Consistency",   val:`${consistency}%`,color:"#F0C040",sub:"days active"},
                {label:"Day Streak",    val:streak,           color:"#F6A623",sub:"consecutive"},
              ].map(s=>(
                <div key={s.label} style={{padding:"10px 8px",background:T.surface,border:`1px solid ${s.color}20`,borderTop:`3px solid ${s.color}`,borderRadius:7,textAlign:"center"}}>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:18,color:s.color,marginBottom:2}}>{s.val}</div>
                  <div style={{fontSize:9,color:T.sub}}>{s.label}</div>
                  <div style={{fontSize:8,color:T.dim,marginTop:1}}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* 7-day strip */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:14}}>
              {Array.from({length:7},(_,i)=>{
                const d=new Date(); d.setDate(d.getDate()-6+i);
                const dk=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
                const dayData=checkHistory[dk]||{};
                const isToday=i===6;
                const liveData=isToday?{...dayData,...Object.fromEntries(SESSIONS.map(s=>[s.id,!!dailyChecks[s.id]]))}:dayData;
                const allDone=SESSIONS.filter(s=>liveData[s.id]).length===5;
                const dayNames=["Su","Mo","Tu","We","Th","Fr","Sa"];
                return (
                  <div key={dk} style={{textAlign:"center",padding:"7px 3px",background:allDone?"#F0C04015":isToday?T.accentDim:T.surface,border:`1px solid ${allDone?"#F0C04040":isToday?T.accent+"60":T.border}`,borderRadius:7}}>
                    <div style={{fontSize:8,color:isToday?T.accent:T.dim,textTransform:"uppercase",marginBottom:3}}>{dayNames[d.getDay()]}</div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:isToday?T.accent:T.text,fontWeight:isToday?700:400,marginBottom:5}}>{d.getDate()}</div>
                    <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
                      {SESSIONS.map(s=>(
                        <div key={s.id} style={{width:5,height:5,borderRadius:"50%",background:liveData[s.id]?s.color:T.surface2,border:`1px solid ${liveData[s.id]?s.color:T.border}`}}/>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Checklist */}
            <div style={{marginBottom:16,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
              <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase"}}>Today — {FMTDATE()}</div>
                {allChecked&&<div style={{fontSize:11,color:"#F0C040",fontWeight:600}}>✓ All done!</div>}
              </div>
              {SESSIONS.map((s,i)=>{
                const done=!!dailyChecks[s.id];
                return (
                  <div key={s.id} className="chkrow" onClick={()=>toggleCheck(s.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",background:done?`${s.color}0A`:T.surface,borderBottom:i<SESSIONS.length-1?`1px solid ${T.border}`:"none",borderLeft:`3px solid ${done?s.color:T.border2}`}}>
                    <div style={{width:20,height:20,borderRadius:5,flexShrink:0,background:done?s.color:T.surface2,border:`2px solid ${done?s.color:T.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {done&&<span style={{fontSize:11,color:dark?"#060A07":"#fff",fontWeight:700}}>✓</span>}
                    </div>
                    <span style={{fontSize:15,flexShrink:0}}>{s.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:done?s.color:T.sub}}>{s.time}</span>
                        <span style={{fontSize:11,color:done?s.color:T.text,fontWeight:500,textDecoration:done?"line-through":"none",opacity:done?0.7:1}}>{s.title}</span>
                      </div>
                    </div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:s.color,flexShrink:0,background:`${s.color}15`,padding:"2px 7px",borderRadius:10}}>
                      {s.id==="fajr"&&`${dailyNew} ayahs`}
                      {s.id==="dhuhr"&&`${timeline.revDuhr} ayahs`}
                      {s.id==="asr"&&`~${timeline.revAsr} ayahs`}
                      {s.id==="maghrib"&&"15-20 min"}
                      {s.id==="isha"&&"All today"}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div className="sbtn" onClick={()=>setRihlahTab("juz")} style={{padding:"14px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,textAlign:"center"}}>
                <div style={{fontSize:20,marginBottom:4}}>📖</div>
                <div style={{fontSize:12,fontWeight:600,color:T.text}}>My Juz</div>
                <div style={{fontSize:10,color:T.dim}}>Track memorization</div>
              </div>
              <div className="sbtn" onClick={()=>setRihlahTab("timeline")} style={{padding:"14px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,textAlign:"center"}}>
                <div style={{fontSize:20,marginBottom:4}}>⏱️</div>
                <div style={{fontSize:12,fontWeight:600,color:T.text}}>Timeline</div>
                <div style={{fontSize:10,color:T.dim}}>Goal calculator</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ MY JUZ ═══ */}
      {activeTab==="rihlah"&&rihlahTab==="juz"&&(
        <div style={{flex:1,overflowY:"auto",padding:"14px 18px 40px"}} className="fi">
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div className="sbtn" onClick={()=>setRihlahTab("home")} style={{padding:"6px 12px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,fontSize:11,color:T.sub}}>← Back</div>
            <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase"}}>My Juz</div>
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

      {/* ═══ TIMELINE ═══ */}
      {activeTab==="rihlah"&&rihlahTab==="timeline"&&(
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px 48px"}} className="fi">
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div className="sbtn" onClick={()=>setRihlahTab("home")} style={{padding:"6px 12px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,fontSize:11,color:T.sub}}>← Back</div>
            <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase"}}>Timeline Calculator</div>
          </div>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"14px 18px",marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
              <span style={{fontSize:12,color:T.sub}}>I want to complete my Hifz in:</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,color:T.accent,fontWeight:600}}>{goalYears}y {goalMonths>0?`${goalMonths}m`:""}</span>
            </div>
            <input type="range" min={1} max={10} value={goalYears} onChange={e=>setGoalYears(Number(e.target.value))} style={{width:"100%",marginBottom:8}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,marginBottom:4}}>
              <span style={{fontSize:12,color:T.sub}}>Additional months:</span>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,color:T.accent}}>{goalMonths}m</span>
            </div>
            <input type="range" min={0} max={11} value={goalMonths} onChange={e=>setGoalMonths(Number(e.target.value))} style={{width:"100%"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:8,marginBottom:14}}>
            {[
              {label:"Ayahs Per Day",val:timeline.ayahsPerDay,color:"#F0C040",sub:"daily minimum"},
              {label:"Days Per Juz", val:`~${timeline.daysPerJuz}d`,color:"#F6A623",sub:"per juz"},
              {label:"Juz Per Month",val:timeline.juzPerMonth,color:"#B794F4",sub:"monthly pace"},
              {label:"Juz Remaining",val:`${timeline.juzLeft}`,color:"#4ECDC4",sub:"to memorize"},
            ].map(s=>(
              <div key={s.label} style={{padding:"11px 13px",background:T.surface,border:`1px solid ${s.color}20`,borderTop:`3px solid ${s.color}`,borderRadius:7}}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:22,color:s.color,lineHeight:1,marginBottom:3}}>{s.val}</div>
                <div style={{fontSize:11,color:T.sub,marginBottom:2}}>{s.label}</div>
                <div style={{fontSize:9,color:T.dim}}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",marginBottom:14}}>
            <div style={{fontSize:9,color:T.dim,letterSpacing:".15em",textTransform:"uppercase",marginBottom:8}}>Compare Timelines</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {[1,2,3,5,7,10].map(y=>{const t=calcTimeline(y,completedCount);const isA=y===goalYears;return <div key={y} className="sbtn" onClick={()=>setGoalYears(y)} style={{flex:1,minWidth:60,padding:"9px",background:isA?T.surface2:T.surface,border:`1px solid ${isA?T.accent+"40":T.border}`,borderRadius:5,textAlign:"center"}}><div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:isA?T.accent:T.dim,fontWeight:isA?600:400,marginBottom:2}}>{y}yr</div><div style={{fontSize:10,color:isA?T.sub:T.vdim}}>{t.ayahsPerDay}/d</div></div>;})}
            </div>
          </div>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",marginBottom:14}}>
            <div style={{fontSize:9,color:T.dim,letterSpacing:".15em",textTransform:"uppercase",marginBottom:8}}>Daily Breakdown</div>
            {SESSIONS.map(s=>(
              <div key={s.id} style={{marginBottom:5,background:T.surface2,border:`1px solid ${s.color}18`,borderLeft:`3px solid ${s.color}`,borderRadius:"0 6px 6px 0",padding:"9px 11px"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><span>{s.icon}</span><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:s.color}}>{s.time}</span><span style={{fontSize:11,color:T.sub}}>{s.title}</span></div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:s.color,fontWeight:600}}>
                  {s.id==="fajr"&&`${dailyNew} new ayahs`}
                  {s.id==="dhuhr"&&`${timeline.revDuhr} ayahs (same as Fajr batch)`}
                  {s.id==="asr"&&`~${timeline.revAsr} ayahs (4 pages older revision)`}
                  {s.id==="maghrib"&&"Passive 15-20 min"}
                  {s.id==="isha"&&"All of today"}
                </div>
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

      {/* ═══ AL-QURAN AL-KARIM ═══ */}
      {activeTab==="quran"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} className="fi">
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`,background:T.surface,flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:8}}>
              <select value={selectedJuz} onChange={e=>setSelectedJuz(Number(e.target.value))} style={{background:T.surface2,border:`1px solid ${T.border}`,color:T.text,fontSize:13,padding:"6px 10px",borderRadius:6,outline:"none"}}>
                {JUZ_META.map(j=><option key={j.num} value={j.num}>Juz {j.num} — {j.roman}</option>)}
              </select>
              <div className="sbtn" onClick={()=>setShowReciterModal(true)} style={{padding:"6px 12px",background:T.surface2,border:`1px solid ${T.accent}40`,borderRadius:6,fontSize:10,color:T.accent,display:"flex",alignItems:"center",gap:5}}>
                🎙️ {QURAN_RECITERS.find(r=>r.id===quranReciter)?.name||"Select"} ▼
              </div>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <div className="sbtn" onClick={()=>setFontSize(f=>Math.max(14,f-2))} style={{width:28,height:28,borderRadius:5,background:T.surface2,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",color:T.sub,fontSize:15}}>−</div>
                <span style={{fontSize:10,color:T.dim,width:26,textAlign:"center"}}>{fontSize}</span>
                <div className="sbtn" onClick={()=>setFontSize(f=>Math.min(40,f+2))} style={{width:28,height:28,borderRadius:5,background:T.surface2,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",color:T.sub,fontSize:15}}>+</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"baseline",gap:10}}>
              <span style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:T.text}}>Juz {meta?.num}</span>
              <span style={{fontSize:16,color:`${T.accent}80`,direction:"rtl"}}>{meta?.arabic}</span>
              <span style={{fontSize:11,color:T.sub,fontStyle:"italic"}}>{meta?.roman}</span>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"14px 18px 40px"}}>
            {loading&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:60,gap:12}}><div className="spin" style={{width:26,height:26,border:`2px solid ${T.border}`,borderTopColor:"#F0C040",borderRadius:"50%"}}/><div style={{fontSize:12,color:T.dim}}>{loadMsg}</div></div>}
            {fetchError&&!loading&&<div style={{textAlign:"center",paddingTop:60,fontSize:14,color:"#E5534B"}}>Could not load. Check internet connection.</div>}
            {!loading&&!fetchError&&surahGroups.map(({surahNum,verses})=>{
              const isOpen=openSurah===surahNum;
              return (
                <div key={surahNum} style={{marginBottom:5}}>
                  <div style={{display:"flex",alignItems:"center",background:isOpen?T.surface2:T.surface,border:`1px solid ${isOpen?T.accent+"30":T.border}`,borderLeft:`3px solid ${isOpen?T.accent:T.border2}`,borderRadius:isOpen?"6px 6px 0 0":"6px",overflow:"hidden"}}>
                    <div className="srow" onClick={()=>setOpenSurah(isOpen?null:surahNum)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:`${T.accent}80`,background:T.accentDim,padding:"2px 6px",borderRadius:3}}>{surahNum}</div>
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,color:isOpen?T.text:T.sub}}>{SURAH_EN[surahNum]}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{fontFamily:"'Amiri',serif",fontSize:17,color:isOpen?T.accent:T.dim,direction:"rtl"}}>{SURAH_AR[surahNum]}</div>
                        <div style={{color:isOpen?T.accent:T.dim,fontSize:16,transition:"transform .2s",transform:isOpen?"rotate(90deg)":"none"}}>›</div>
                      </div>
                    </div>
                    <div className="sbtn" onClick={(e)=>{e.stopPropagation();playSurahQueue(verses,surahNum);}} style={{padding:"0 14px",height:"100%",display:"flex",alignItems:"center",borderLeft:`1px solid ${T.border}`,minHeight:44,minWidth:44,background:playingSurah===surahNum?T.accent+"18":T.surface}}>
                      {audioLoading&&playingSurah===surahNum?<div className="spin" style={{width:13,height:13,border:`2px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%"}}/>:<span style={{fontSize:15,color:playingSurah===surahNum?T.accent:T.dim}}>{playingSurah===surahNum?"⏸":"▶"}</span>}
                    </div>
                  </div>
                  {isOpen&&(
                    <div className="fi" style={{background:T.surface,border:`1px solid ${T.accent}15`,borderTop:"none",borderRadius:"0 0 6px 6px",padding:"18px 22px 24px"}}>
                      {surahNum!==9&&verses[0]?.verse_key?.split(":")?.[1]==="1"&&<div style={{textAlign:"center",marginBottom:18}}><span style={{fontFamily:"'Amiri',serif",fontSize:fontSize+2,color:T.accent}}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</span></div>}
                      <p style={{direction:"rtl",textAlign:"justify",fontFamily:"'Amiri',serif",fontSize:`${fontSize}px`,lineHeight:2.8,color:T.text}}>
                        {verses.map(v=>{
                          const vNum=v.verse_key?.split(":")?.[1];
                          const isP=playingKey===v.verse_key;
                          return (
                            <span key={v.verse_key} style={{background:isP?T.accent+"20":"transparent",borderRadius:3,padding:isP?"0 2px":0,transition:"background .3s"}}>
                              <span style={{color:isP?T.accent:T.text}}>{v.text_uthmani}</span>
                              <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"1.3em",height:"1.3em",borderRadius:"50%",border:`1px solid ${T.accent}30`,color:`${T.accent}65`,fontSize:"0.4em",fontFamily:"'IBM Plex Mono',monospace",margin:"0 4px",verticalAlign:"middle"}}>{vNum}</span>
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
        </div>
      )}

      {/* Quran Reciter Modal */}
      {showReciterModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowReciterModal(false)}>
          <div style={{background:T.surface,borderRadius:"16px 16px 0 0",padding:"20px 16px 32px",width:"100%",maxWidth:500}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:14}}>
              <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase",marginBottom:6}}>Select Reciter</div>
              <div style={{width:40,height:3,background:T.border,borderRadius:2,margin:"0 auto"}}/>
            </div>
            <div style={{fontSize:9,color:"#E5534B",letterSpacing:".14em",textTransform:"uppercase",marginBottom:8}}>🕋 Masjid Al-Haram</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:14}}>
              {QURAN_RECITERS.filter(r=>r.tag==="Masjid Al-Haram").map(r=>(
                <div key={r.id} className="sbtn" onClick={()=>{setQuranReciter(r.id);setShowReciterModal(false);}} style={{padding:"8px 6px",background:quranReciter===r.id?T.accent+"20":T.surface2,border:`1px solid ${quranReciter===r.id?T.accent:T.border}`,borderRadius:7,textAlign:"center"}}>
                  <div style={{fontSize:10,fontWeight:quranReciter===r.id?700:400,color:quranReciter===r.id?T.accent:T.text}}>{quranReciter===r.id?"✓ ":""}{r.name}</div>
                  <div style={{fontFamily:"'Amiri',serif",fontSize:11,color:quranReciter===r.id?T.accent:T.dim,marginTop:2}}>{r.arabic}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:9,color:"#2ECC71",letterSpacing:".14em",textTransform:"uppercase",marginBottom:8}}>🕌 Masjid An-Nabawi</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
              {QURAN_RECITERS.filter(r=>r.tag==="Masjid An-Nabawi").map(r=>(
                <div key={r.id} className="sbtn" onClick={()=>{setQuranReciter(r.id);setShowReciterModal(false);}} style={{padding:"8px 6px",background:quranReciter===r.id?T.accent+"20":T.surface2,border:`1px solid ${quranReciter===r.id?T.accent:T.border}`,borderRadius:7,textAlign:"center"}}>
                  <div style={{fontSize:10,fontWeight:quranReciter===r.id?700:400,color:quranReciter===r.id?T.accent:T.text}}>{quranReciter===r.id?"✓ ":""}{r.name}</div>
                  <div style={{fontFamily:"'Amiri',serif",fontSize:11,color:quranReciter===r.id?T.accent:T.dim,marginTop:2}}>{r.arabic}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ AL-MASJIDAYN ═══ */}
      {activeTab==="masjidayn"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{display:"flex",background:T.surface,borderBottom:`1px solid ${T.border}`}}>
            {[{id:"live",label:"📡 Now Live"},{id:"ramadan",label:"🌙 Ramadan 1447"},{id:"haramain",label:"🎙️ Imams"}].map(t=>(
              <div key={t.id} onClick={()=>setMasjidaynTab(t.id)} style={{flex:1,padding:"10px 6px",textAlign:"center",fontSize:11,fontWeight:masjidaynTab===t.id?700:400,color:masjidaynTab===t.id?T.accent:T.dim,borderBottom:`2px solid ${masjidaynTab===t.id?T.accent:"transparent"}`,cursor:"pointer",background:masjidaynTab===t.id?T.accentDim:"transparent"}}>
                {t.label}
              </div>
            ))}
          </div>

          {/* NOW LIVE */}
          {masjidaynTab==="live"&&(
            <div style={{flex:1,overflowY:"auto",padding:"16px 14px 32px",display:"flex",flexDirection:"column",gap:12}} className="fi">
              {LIVE_STREAMS.map((st,i)=>(
                <a key={i} href={st.yt} target="_blank" rel="noreferrer" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 20px",borderRadius:12,textDecoration:"none",background:`${st.color}12`,border:`2px solid ${st.color}45`,gap:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div className="pulse" style={{width:9,height:9,borderRadius:"50%",background:st.color}}/>
                    <span style={{fontSize:10,color:st.color,fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,letterSpacing:".15em"}}>LIVE NOW</span>
                  </div>
                  <div style={{fontSize:24}}>{st.icon}</div>
                  <div style={{fontSize:16,fontWeight:700,color:T.text}}>{st.name}</div>
                  <div style={{fontSize:11,color:T.dim,direction:"rtl"}}>{st.arabic}</div>
                  <div style={{marginTop:8,padding:"12px 32px",background:st.color,borderRadius:8,fontSize:14,fontWeight:700,color:dark?"#060A07":"#fff"}}>
                    ▶ Watch {st.label} Live
                  </div>
                  <div style={{fontSize:10,color:T.dim}}>{st.desc}</div>
                </a>
              ))}
              <div style={{padding:"12px 14px",background:T.surface,border:`1px solid ${T.accent}20`,borderRadius:8,textAlign:"center"}}>
                <div style={{fontFamily:"'Amiri',serif",fontSize:17,color:T.accent,direction:"rtl",marginBottom:4}}>اللَّهُمَّ ارْزُقْنَا زِيَارَةَ بَيْتِكَ الْحَرَامِ</div>
                <div style={{fontSize:10,color:T.sub,fontStyle:"italic",marginBottom:2}}>"O Allah, grant us the visit to Your Sacred House"</div>
                <div style={{fontSize:9,color:T.dim}}>Insha'Allah ya Jalil — the hijrah is coming 🤲</div>
              </div>
            </div>
          )}

          {/* RAMADAN 1447 */}
          {masjidaynTab==="ramadan"&&(()=>{
            const sel=selectedRamadanNight??1;
            const selEntry=RAMADAN_NIGHTS.find(x=>x.n===sel);
            const activeId=selEntry?.[ramadanVideoType]??selEntry?.taraweeh;
            return (
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} className="fi">
                <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"10px 14px",flexShrink:0}}>
                  <div style={{fontSize:9,color:"#E5534B",letterSpacing:".18em",textTransform:"uppercase",marginBottom:2}}>Ramadan 1447 · 2026 · Masjid Al-Haram</div>
                  <div style={{fontSize:14,fontWeight:600,color:T.text}}>Sheikh Badr Al-Turki — بدر التركي</div>
                </div>
                {activeId&&(
                  <div style={{background:"#000",flexShrink:0}}>
                    <iframe key={`r${sel}-${ramadanVideoType}`} src={`https://www.youtube.com/embed/${activeId}?autoplay=1&rel=0${activeId==="lRwXLCF8Udk"?"&start=2090":""}`} style={{width:"100%",height:210,border:"none",display:"block"}} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={`Night ${sel} 1447`}/>
                    <div style={{padding:"5px 12px",background:"#111",display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:11,color:"#E5534B",fontWeight:600}}>Night {sel} · {ramadanVideoType==="tahajjud"?"Tahajjud":"Taraweeh"}</span>
                      <span style={{fontSize:9,color:"#555"}}>▶ in app</span>
                    </div>
                  </div>
                )}
                <div style={{flex:1,overflowY:"auto",padding:"12px 14px 40px"}}>
                  <div style={{fontSize:9,color:T.dim,letterSpacing:".14em",textTransform:"uppercase",marginBottom:7}}>Nights 1–20</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:14}}>
                    {RAMADAN_NIGHTS.filter(x=>x.n<=20).map(x=>(
                      <div key={x.n} className="sbtn" onClick={()=>{setSelectedRamadanNight(x.n);setRamadanVideoType("taraweeh");}} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:sel===x.n?"#E5534B18":T.surface,border:`1px solid ${sel===x.n?"#E5534B":T.border}`,borderRadius:7}}>
                        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,color:sel===x.n?"#E5534B":T.dim,width:22}}>{x.n}</div>
                        <span style={{fontSize:10,color:sel===x.n?"#E5534B":T.sub}}>Night {x.n} ▶</span>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:9,color:"#E5534B",letterSpacing:".14em",textTransform:"uppercase",marginBottom:7}}>Last 10 Nights 🌙</div>
                  <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:14}}>
                    {RAMADAN_NIGHTS.filter(x=>x.n>=21).map(x=>(
                      <div key={x.n} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",background:x.n===27?"#E5534B08":T.surface,border:`1px solid ${x.n===27?"#E5534B30":T.border}`,borderRadius:7}}>
                        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,color:x.n===27?"#E5534B":T.dim,width:28}}>{x.n}{x.n===27&&<span style={{fontSize:8}}> ★</span>}</div>
                        <div className="sbtn" onClick={()=>{setSelectedRamadanNight(x.n);setRamadanVideoType("taraweeh");}} style={{flex:1,padding:"6px 8px",borderRadius:5,textAlign:"center",background:sel===x.n&&ramadanVideoType==="taraweeh"?"#E5534B":"#E5534B15",border:`1px solid #E5534B30`}}>
                          <span style={{fontSize:10,fontWeight:600,color:sel===x.n&&ramadanVideoType==="taraweeh"?(dark?"#060A07":"#fff"):"#E5534B"}}>Taraweeh ▶</span>
                        </div>
                        <div className="sbtn" onClick={()=>{setSelectedRamadanNight(x.n);setRamadanVideoType("tahajjud");}} style={{flex:1,padding:"6px 8px",borderRadius:5,textAlign:"center",background:sel===x.n&&ramadanVideoType==="tahajjud"?"#B794F4":"#B794F415",border:`1px solid #B794F430`}}>
                          <span style={{fontSize:10,fontWeight:600,color:sel===x.n&&ramadanVideoType==="tahajjud"?(dark?"#060A07":"#fff"):"#B794F4"}}>Tahajjud {selEntry?.tahajjud?"▶":"↗"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <a href="https://www.youtube.com/@sheikh_badr_al_turki/videos" target="_blank" rel="noreferrer" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",background:T.surface,border:"1px solid #E5534B30",borderRadius:7,textDecoration:"none"}}>
                    <div><div style={{fontSize:12,color:T.accent,fontWeight:600,marginBottom:1}}>@sheikh_badr_al_turki</div><div style={{fontSize:10,color:T.dim}}>All 30 nights · Full playlist on YouTube</div></div>
                    <div style={{padding:"7px 14px",background:T.accent,color:dark?"#060A07":"#fff",borderRadius:5,fontSize:11,fontWeight:700}}>View All</div>
                  </a>
                </div>
              </div>
            );
          })()}

          {/* HARAMAIN IMAMS */}
          {masjidaynTab==="haramain"&&(()=>{
            const imams=haramainMosque==="makkah"?MAKKAH_IMAMS:MADINAH_IMAMS;
            const mosqueColor=haramainMosque==="makkah"?"#E5534B":"#F0C040";
            return (
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}} className="fi">
                <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"10px 14px",flexShrink:0}}>
                  <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase",marginBottom:8}}>Haramain Imams — Quran Recordings</div>
                  <div style={{display:"flex",gap:8}}>
                    {[{id:"makkah",label:"🕋 Masjid Al-Haram",color:"#E5534B"},{id:"madinah",label:"🌙 Masjid An-Nabawi",color:"#F0C040"}].map(m=>(
                      <div key={m.id} className="sbtn" onClick={()=>{setHaramainMosque(m.id);setOpenImam(null);}} style={{flex:1,padding:"9px 12px",borderRadius:7,background:haramainMosque===m.id?`${m.color}18`:T.surface2,border:`1px solid ${haramainMosque===m.id?m.color+"60":T.border}`,textAlign:"center"}}>
                        <div style={{fontSize:12,fontWeight:haramainMosque===m.id?600:400,color:haramainMosque===m.id?T.text:T.sub}}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{flex:1,overflowY:"auto",padding:"12px 14px 40px"}}>
                  {imams.map(imam=>{
                    const isOpen=openImam===imam.id;
                    return (
                      <div key={imam.id} style={{marginBottom:6,border:`1px solid ${isOpen?mosqueColor+"40":T.border}`,borderLeft:`3px solid ${isOpen?mosqueColor:T.border2}`,borderRadius:isOpen?"6px 6px 0 0":"6px",overflow:"hidden"}}>
                        <div className="srow" onClick={()=>setOpenImam(isOpen?null:imam.id)} style={{padding:"11px 14px",background:isOpen?T.surface2:T.surface,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:13,fontWeight:500,color:T.text}}>{imam.name}</div>
                            <div style={{fontSize:11,color:T.dim,direction:"rtl",marginTop:2}}>{imam.arabic}</div>
                          </div>
                          <div style={{color:isOpen?mosqueColor:T.dim,fontSize:16,transform:isOpen?"rotate(90deg)":"none",transition:"transform .2s"}}>›</div>
                        </div>
                        {isOpen&&(
                          <div className="fi" style={{background:T.surface,borderTop:`1px solid ${mosqueColor}20`,padding:"8px 8px 12px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:4}}>
                            {HARAMAIN_SURAHS.map((name,si)=>{
                              const sNum=si+1; const pkey=`${imam.id}-${sNum}`; const isP=haramainPlaying===pkey;
                              return (
                                <div key={sNum} className="sbtn" onClick={()=>playHaramainSurah(imam,sNum,pkey)} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 9px",borderRadius:5,background:isP?`${mosqueColor}15`:T.surface2,border:`1px solid ${isP?mosqueColor:T.border}`}}>
                                  <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,background:isP?mosqueColor:T.surface,border:`1px solid ${isP?mosqueColor:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:isP?"#fff":T.dim}}>{isP?"⏸":"▶"}</div>
                                  <div style={{minWidth:0}}>
                                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:isP?mosqueColor:T.vdim}}>{String(sNum).padStart(3,"0")}</div>
                                    <div style={{fontSize:10,color:isP?T.text:T.sub,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
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
