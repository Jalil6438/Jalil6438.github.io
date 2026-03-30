import { useState, useEffect, useRef } from "react";

// ── QURAN RECITERS (Al-Quran Al-Karim tab) ────────────────────────────────────
const QURAN_RECITERS = [
  { id:"dosari",   name:"Yasser Al-Dosari",       arabic:"ياسر الدوسري",      quranicaudio:"yasser_ad-dussary" },
  { id:"juhany",   name:"Abdullah Al-Juhany",     arabic:"عبدالله الجهني",    quranicaudio:"abdullaah_3awwaad_al-juhaynee" },
  { id:"sudais",   name:"Abdul Rahman As-Sudais", arabic:"عبدالرحمن السديس",  quranicaudio:"abdurrahmaan_as-sudays" },
  { id:"shuraim",  name:"Saud Ash-Shuraim",       arabic:"سعود الشريم",       quranicaudio:"sa3ood_al-shuraym" },
  { id:"muaiqly",  name:"Maher Al-Muaiqly",       arabic:"ماهر المعيقلي",     quranicaudio:"maher_almuaiqly" },
  { id:"hudhaify", name:"Ali Al-Hudhaify",        arabic:"علي الحذيفي",       quranicaudio:"huthayfi" },
  { id:"ayyoub",   name:"Muhammad Ayyoub",        arabic:"محمد أيوب",         quranicaudio:"muhammad_ayyoub" },
  { id:"budair",   name:"Salah Al-Budair",        arabic:"صلاح البدير",       quranicaudio:"salahbudair" },
  { id:"alijaber", name:"Abdullah Ali Jaber",     arabic:"عبدالله علي جابر",  quranicaudio:"abdullah_ali_jaber" },
  { id:"turki",    name:"Badr Al-Turki",          arabic:"بدر التركي",        quranicaudio:"badr_al_turki" },
];

// ── RECITERS (My Hifz tab — ayah by ayah confirmed) ──────────────────────────
const RECITERS = [
  // ── Masjid Al-Haram ──
  { id:"dosari",  name:"Yasser Al-Dosari",       arabic:"ياسر الدوسري",     recitationId:137, everyayah:"Yasser_Ad-Dussary_128kbps",            quranicaudioId:97,  tag:"Masjid Al-Haram",  style:"Emotional · Slow",         dot:"#F0C040" },
  { id:"juhany",  name:"Abdullah Al-Juhany",     arabic:"عبدالله الجهني",   recitationId:140, everyayah:"Abdullaah_3awwaad_Al-Juhaynee_128kbps", quranicaudioId:1,   tag:"Masjid Al-Haram",  style:"Clear · Balanced",         dot:"#4A9EFF" },
  { id:"sudais",  name:"Abdul Rahman As-Sudais", arabic:"عبدالرحمن السديس", recitationId:2,   everyayah:"Abdurrahmaan_As-Sudais_192kbps",        quranicaudioId:7,   tag:"Masjid Al-Haram",  style:"Powerful · Authoritative", dot:"#E5534B" },
  { id:"shuraim", name:"Saud Ash-Shuraim",       arabic:"سعود الشريم",      recitationId:4,   everyayah:"Saood_ash-Shuraym_128kbps",             quranicaudioId:4,   tag:"Masjid Al-Haram",  style:"Strong · Measured",        dot:"#8B9BAA" },
  { id:"muaiqly", name:"Maher Al-Muaiqly",       arabic:"ماهر المعيقلي",    recitationId:128, everyayah:"MaherAlMuaiqly128kbps",                 quranicaudioId:159, tag:"Masjid Al-Haram",  style:"Warm · Melodic",           dot:"#F6A623" },
  // ── Masjid An-Nabawi ──
  { id:"hudhaify",name:"Ali Al-Hudhaify",        arabic:"علي الحذيفي",      recitationId:10,  everyayah:"Hudhaify_128kbps",                      quranicaudioId:8,   tag:"Masjid An-Nabawi", style:"Gentle · Precise",         dot:"#3ECC71" },
  { id:"ayyoub",  name:"Muhammad Ayyoub",        arabic:"محمد أيوب",        recitationId:99,  everyayah:"Muhammad_Ayyoub_128kbps",               quranicaudioId:107, tag:"Masjid An-Nabawi", style:"Deep · Meditative",        dot:"#4A9EFF" },
  { id:"budair",  name:"Salah Al-Budair",        arabic:"صلاح البدير",      recitationId:135, everyayah:"Salah_Al_Budair_128kbps",               quranicaudioId:43,  tag:"Masjid An-Nabawi", style:"Smooth · Rhythmic",        dot:"#F0C040" },
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
};function calcTimeline(years,juzDone) {
  const juzLeft=Math.max(1,30-juzDone), ayahsLeft=juzLeft*208;
  const active=Math.round(years*365*0.85), apd=Math.max(1,ayahsLeft/active);
  return { ayahsPerDay:apd.toFixed(1), daysPerJuz:Math.round(active/juzLeft),
           juzPerMonth:(juzLeft/(years*12)).toFixed(1),
           revDuhr:Math.max(1,Math.round(apd*0.3)), revAsr:Math.max(1,Math.round(apd*0.2)),
           activeDays:active, ayahsLeft, juzLeft };
}

const DARK  = {bg:"#060A07",surface:"#121722",surface2:"#1A2130",border:"#263042",border2:"#1C2533",text:"#EDE8DC",sub:"#B8C0CC",dim:"#5A7050",vdim:"#2E4030",accent:"#F0C040",accentDim:"#F0C04018",input:"#0A0E07",inputBorder:"#263042",inputText:"#D7DCE4"};
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
  const [yesterdayBatch,setYesterdayBatch]=useState([]);
  const [asrSelectedSurahs,setAsrSelectedSurahs]=useState([]);
  const [asrSelectedJuz,setAsrSelectedJuz]=useState([]);
  const [asrReviewBatch,setAsrReviewBatch]=useState([]);
  const [sessLoading,setSessLoading]=useState(false);
  const [dailyChecks,setDailyChecks]=useState({date:TODAY()});

  useEffect(()=>{
    const completedJuz=Object.entries(juzStatus).filter(([key,value])=>!String(key).startsWith("s")&&value==="complete").map(([key])=>Number(key));
    if(!completedJuz.includes(30)) setSessionJuz(30);
    else if(!completedJuz.includes(29)) setSessionJuz(29);
    else if(!completedJuz.includes(28)) setSessionJuz(28);
    else if(!completedJuz.includes(27)) setSessionJuz(27);
    else if(!completedJuz.includes(26)) setSessionJuz(26);
    else if(!completedJuz.includes(25)) setSessionJuz(25);
    else if(!completedJuz.includes(24)) setSessionJuz(24);
    else if(!completedJuz.includes(23)) setSessionJuz(23);
    else if(!completedJuz.includes(22)) setSessionJuz(22);
    else if(!completedJuz.includes(21)) setSessionJuz(21);
    else if(!completedJuz.includes(20)) setSessionJuz(20);
    else if(!completedJuz.includes(19)) setSessionJuz(19);
    else if(!completedJuz.includes(18)) setSessionJuz(18);
    else if(!completedJuz.includes(17)) setSessionJuz(17);
    else if(!completedJuz.includes(16)) setSessionJuz(16);
    else if(!completedJuz.includes(15)) setSessionJuz(15);
    else if(!completedJuz.includes(14)) setSessionJuz(14);
    else if(!completedJuz.includes(13)) setSessionJuz(13);
    else if(!completedJuz.includes(12)) setSessionJuz(12);
    else if(!completedJuz.includes(11)) setSessionJuz(11);
    else if(!completedJuz.includes(10)) setSessionJuz(10);
    else if(!completedJuz.includes(9)) setSessionJuz(9);
    else if(!completedJuz.includes(8)) setSessionJuz(8);
    else if(!completedJuz.includes(7)) setSessionJuz(7);
    else if(!completedJuz.includes(6)) setSessionJuz(6);
    else if(!completedJuz.includes(5)) setSessionJuz(5);
    else if(!completedJuz.includes(4)) setSessionJuz(4);
    else if(!completedJuz.includes(3)) setSessionJuz(3);
    else if(!completedJuz.includes(2)) setSessionJuz(2);
    else if(!completedJuz.includes(1)) setSessionJuz(1);
    else setSessionJuz(30);
  },[juzStatus]);

  useEffect(()=>{
    const completedJuz=Object.entries(juzStatus).filter(([key,value])=>!String(key).startsWith("s")&&value==="complete").map(([key])=>Number(key));
    if(!completedJuz.includes(30)) setSessionJuz(30);
    else if(!completedJuz.includes(29)) setSessionJuz(29);
    else if(!completedJuz.includes(28)) setSessionJuz(28);
    else if(!completedJuz.includes(27)) setSessionJuz(27);
    else if(!completedJuz.includes(26)) setSessionJuz(26);
    else if(!completedJuz.includes(25)) setSessionJuz(25);
    else if(!completedJuz.includes(24)) setSessionJuz(24);
    else if(!completedJuz.includes(23)) setSessionJuz(23);
    else if(!completedJuz.includes(22)) setSessionJuz(22);
    else if(!completedJuz.includes(21)) setSessionJuz(21);
    else if(!completedJuz.includes(20)) setSessionJuz(20);
    else if(!completedJuz.includes(19)) setSessionJuz(19);
    else if(!completedJuz.includes(18)) setSessionJuz(18);
    else if(!completedJuz.includes(17)) setSessionJuz(17);
    else if(!completedJuz.includes(16)) setSessionJuz(16);
    else if(!completedJuz.includes(15)) setSessionJuz(15);
    else if(!completedJuz.includes(14)) setSessionJuz(14);
    else if(!completedJuz.includes(13)) setSessionJuz(13);
    else if(!completedJuz.includes(12)) setSessionJuz(12);
    else if(!completedJuz.includes(11)) setSessionJuz(11);
    else if(!completedJuz.includes(10)) setSessionJuz(10);
    else if(!completedJuz.includes(9)) setSessionJuz(9);
    else if(!completedJuz.includes(8)) setSessionJuz(8);
    else if(!completedJuz.includes(7)) setSessionJuz(7);
    else if(!completedJuz.includes(6)) setSessionJuz(6);
    else if(!completedJuz.includes(5)) setSessionJuz(5);
    else if(!completedJuz.includes(4)) setSessionJuz(4);
    else if(!completedJuz.includes(3)) setSessionJuz(3);
    else if(!completedJuz.includes(2)) setSessionJuz(2);
    else if(!completedJuz.includes(1)) setSessionJuz(1);
    else setSessionJuz(30);
  },[juzStatus]);
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
        setJuzStatus(p.juzStatus||{});
        setNotes(p.notes||{});
        setGoalYears(p.goalYears||3);
        setSessionJuz(p.sessionJuz||29);
        setSessionIdx(p.sessionIdx||0);
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
    setLoaded(true);
  },[]);

  useEffect(()=>{
    if(!loaded) return;
    try { localStorage.setItem("jalil-quran-v8",JSON.stringify({juzStatus,notes,goalYears,sessionJuz,sessionIdx,sessionDone,yesterdayBatch,asrSelectedSurahs,asrSelectedJuz,asrReviewBatch,dark,dailyChecks,streak,checkHistory,reciter,showTrans,activeSessionIndex,sessionsCompleted})); } catch {}
  },[juzStatus,notes,goalYears,sessionJuz,sessionIdx,sessionDone,yesterdayBatch,asrSelectedSurahs,asrSelectedJuz,asrReviewBatch,dark,dailyChecks,streak,checkHistory,reciter,showTrans,loaded,activeSessionIndex,sessionsCompleted]);

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

        // 1) Get this juz's surahs in descending memorization order
        const descendingSurahOrder=[...(JUZ_SURAHS[sessionJuz]||[])].map(item=>item.s).reverse();

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

        if(!cancelled){ setSessionIdx(0); setSessionVerses(orderedVerses); }
      } catch {}
      if(!cancelled) setSessLoading(false);
    })();
    return()=>{cancelled=true;};
  },[sessionJuz,juzStatus]);

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

  const completedCount=Object.entries(juzStatus).filter(([key,value])=>!String(key).startsWith("s")&&value==="complete").length;
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
  const bKey=`${sessionJuz}-${bStart}`;
  const bDone=sessionDone.includes(bKey);
  const sessM=JUZ_META.find(j=>j.num===sessionJuz);
  const sessPct=totalSV>0?Math.round((sessionIdx/totalSV)*100):0;
  const checkedCount=SESSIONS.filter(s=>dailyChecks[s.id]).length;
  const allChecked=checkedCount===SESSIONS.length;
  const currentReciter=RECITERS.find(r=>r.id===reciter)||RECITERS[0];

  const completedSurahOptions=Object.entries(juzStatus).filter(([key,value])=>String(key).startsWith("s")&&value==="complete").map(([key])=>{const surahNum=Number(String(key).replace("s",""));return{num:surahNum,en:SURAH_EN[surahNum],ar:SURAH_AR?.[surahNum]||""};}).sort((a,b)=>b.num-a.num);

  const currentMemorizationSurahNum=sessionVerses[0]?.surah_number||parseInt(sessionVerses[0]?.verse_key?.split(":")?.[0]||"0",10);
  const descendingSurahOrderForCurrentJuz=[...(JUZ_SURAHS[sessionJuz]||[])].map(item=>item.s).reverse();

  const completedJuzOptions=Object.entries(juzStatus).filter(([key,value])=>!String(key).startsWith("s")&&value==="complete").map(([key])=>{const juzNum=Number(key);const meta=JUZ_META.find(j=>j.num===juzNum);return{num:juzNum,name:meta?.roman||`Juz ${juzNum}`,arabic:meta?.arabic||""};}).sort((a,b)=>b.num-a.num);

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
      audio.loop = looping;
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

  function getEveryayahFolder(id){ const r=RECITERS.find(x=>x.id===id); return r?.everyayah||RECITERS[0].everyayah; }
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
      setAsrSelectedJuz([]);
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
      setSessLoading(true); setAsrSelectedSurahs([]); setAsrSelectedJuz([juzNum]);
      let page=1,all=[],tp=1;
      do {
        const res=await fetch(`https://api.qurancdn.com/api/qdc/verses/by_juz/${juzNum}?words=false&fields=text_uthmani,verse_key,surah_number&per_page=50&page=${page}`);
        if(!res.ok) throw new Error();
        const data=await res.json();
        all=[...all,...(data.verses||[])]; tp=data.pagination?.total_pages||1; page++;
      } while(page<=tp);
      setAsrReviewBatch(all);
    } catch { setAsrReviewBatch([]); }
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

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:"100vh",color:T.text,display:"flex",flexDirection:"column",transition:"background .25s,color .25s"}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-thumb{border-radius:3px;background:${dark?"#2A3446":"#C8C0A8"};}
        .sbtn{transition:opacity .12s;cursor:pointer;user-select:none;}.sbtn:hover{opacity:.72;}
        .jrow{cursor:pointer;border-left:3px solid transparent;transition:background .1s;}.jrow:hover{background:${dark?"#141B27":"#EDE8DC"}!important;}
        .srow{cursor:pointer;transition:background .12s;}.srow:hover{background:${dark?"#141B27":"#EDE8DC"}!important;}
        .chkrow{cursor:pointer;transition:all .13s;}.chkrow:hover{background:${dark?"#141B27":"#EDE8DC"}!important;}
        .ttab{cursor:pointer;transition:all .15s;user-select:none;}.ttab:hover{opacity:.8;}
        @keyframes fi{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}.fi{animation:fi .2s ease;}
        @keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .9s linear infinite;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}.pulse{animation:pulse 1.6s infinite;}
        .pbfill{transition:width .8s cubic-bezier(.4,0,.2,1);}
        input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;background:${dark?"#0C1A0E":"#D0C8B0"};outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${T.accent};cursor:pointer;}
        textarea:focus{outline:none;} select{cursor:pointer;}
      `}</style>
      
      {/* ── ONBOARDING FLOW ── */}
      {showOnboarding&&(
        <div style={{position:"fixed",inset:0,background:"#060A07",zIndex:1000,display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* ── STEP 1 — BISMILLAH ── */}
          {onboardStep===1&&(
            <div className="fi" style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 28px",textAlign:"center",position:"relative",overflow:"hidden"}}>
              {/* Star field */}
              <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(1px 1px at 15% 20%,#F0C04030 0%,transparent 100%),radial-gradient(1px 1px at 75% 15%,#ffffff18 0%,transparent 100%),radial-gradient(1.5px 1.5px at 45% 8%,#F0C04038 0%,transparent 100%),radial-gradient(1px 1px at 85% 35%,#ffffff14 0%,transparent 100%),radial-gradient(1px 1px at 25% 65%,#F0C04018 0%,transparent 100%),radial-gradient(1px 1px at 60% 80%,#ffffff10 0%,transparent 100%)",pointerEvents:"none"}}/>
              {/* Glow */}
              <div style={{position:"absolute",width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,#F0C04006 0%,transparent 70%)",top:"50%",left:"50%",transform:"translate(-50%,-60%)",pointerEvents:"none"}}/>
              <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(28px,6vw,44px)",color:"#F0C040",direction:"rtl",lineHeight:1.7,marginBottom:24,position:"relative",zIndex:1}}>
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
              </div>
              <div style={{width:50,height:1,background:"linear-gradient(90deg,transparent,#F0C04060,transparent)",margin:"0 auto 24px"}}/>
              <div style={{fontFamily:"'Amiri',serif",fontSize:16,color:"#F0C040",direction:"rtl",lineHeight:2,marginBottom:8,opacity:.85}}>
                وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ
              </div>
              <div style={{fontSize:11,color:"#5A7050",fontStyle:"italic",marginBottom:4}}>"And We have certainly made the Quran easy for remembrance"</div>
              <div style={{fontSize:9,color:"#2E4030",marginBottom:40}}>Al-Qamar · 54:17</div>
              <div style={{fontFamily:"'Amiri',serif",fontSize:22,color:"#F0C040",direction:"rtl",marginBottom:4}}>رحلة الحفظ</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#EDE8DC",marginBottom:44}}>Rihlat Al-Hifz</div>
              <div className="sbtn" onClick={()=>setOnboardStep(3)} style={{width:"100%",maxWidth:360,padding:"15px",background:"#F0C040",borderRadius:10,fontSize:14,fontWeight:700,color:"#060A07",letterSpacing:".02em"}}>
                Begin Your Journey →
              </div>
              <div style={{fontSize:9,color:"#2E4030",marginTop:16}}>© 2026 NoorTech Studio</div>
            </div>
          )}


          {/* ── STEP 3 — NAME INPUT ── */}
          {onboardStep===3&&(
            <div className="fi" style={{flex:1,display:"flex",flexDirection:"column",padding:"24px 24px 32px",overflow:"auto",background:"#060A07",minHeight:0}}>
              {/* Progress bar */}
              <div style={{display:"flex",gap:5,marginBottom:28}}>
                {[1,2,3].map(i=>(
                  <div key={i} style={{flex:1,height:3,borderRadius:2,background:"#F0C040",transition:"background .3s"}}/>
                ))}
              </div>
              <div style={{fontSize:8,color:"#F0C040",letterSpacing:".2em",textTransform:"uppercase",marginBottom:6}}>Welcome</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:"#EDE8DC",marginBottom:6}}>What should we call you?</div>
              <div style={{fontSize:12,color:"#5A7050",lineHeight:1.6,marginBottom:28}}>Your name will appear throughout the app to personalize your Hifz journey.</div>
              <div style={{fontSize:9,color:"#A8B89A",letterSpacing:".12em",textTransform:"uppercase",marginBottom:10}}>Your Name</div>
              <input
                type="text"
                value={userName}
                onChange={e=>setUserName(e.target.value)}
                placeholder="Enter your name"
                style={{width:"100%",background:"#0D1008",border:`1px solid ${userName?"#F0C04060":"#1E2A18"}`,borderRadius:10,padding:"14px 16px",fontSize:18,color:"#EDE8DC",fontFamily:"'DM Sans',sans-serif",outline:"none",marginBottom:20,transition:"border .2s"}}
              />
              {userName&&(
                <div className="fi" style={{padding:"16px 18px",background:"#0D1008",border:"1px solid #F0C04025",borderRadius:12,textAlign:"center",marginBottom:24}}>
                  <div style={{fontSize:9,color:"#5A7050",marginBottom:6}}>Your journey will begin as</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#F0C040",marginBottom:4}}>{userName} · رحلة الحفظ</div>
                  <div style={{fontSize:10,color:"#5A7050",fontStyle:"italic"}}>May Allah make it easy for you 🤲</div>
                </div>
              )}
              <div style={{flex:1}}/>
              <div style={{display:"flex",gap:8}}>
                <div className="sbtn" onClick={()=>setOnboardStep(1)} style={{padding:"14px 18px",background:"#0D1008",border:"1px solid #1E2A18",borderRadius:10,fontSize:14,color:"#5A7050"}}>←</div>
                <div className="sbtn" onClick={()=>setOnboardStep(4)} style={{flex:1,padding:"14px",background:"#F0C040",borderRadius:10,fontSize:14,fontWeight:700,color:"#060A07",textAlign:"center"}}>
                  Continue →
                </div>
              </div>
              <div className="sbtn" onClick={()=>setOnboardStep(4)} style={{textAlign:"center",fontSize:11,color:"#2E4030",marginTop:10}}>Skip for now</div>
            </div>
          )}

          {/* ── STEP 4 — GOAL + JUZ TRACKER ── */}
          {onboardStep===4&&(()=>{
            const juzDone=Object.entries(juzStatus).filter(([key,value])=>!String(key).startsWith("s")&&value==="complete").length;
            const remainingJuz=30-juzDone;
            const totalMonths=(goalYears*12)+goalMonths;
            const totalAyahs=6236;
            const remainingAyahs=Math.round(totalAyahs*(remainingJuz/30));
            const apd=totalMonths>0?Math.max(1,Math.round(remainingAyahs/(totalMonths*30))):0;
            const daysPerJuz=apd>0?Math.round((6236/30)/apd):0;
            const displayedJuz=JUZ_META.slice().reverse().slice(0,visibleOnboardJuzCount);
            return (
              <div className="fi" style={{flex:1,display:"flex",flexDirection:"column",padding:"20px 20px 24px",overflow:"auto",background:"linear-gradient(180deg,#05080A 0%,#0A1120 45%,#0D1628 100%)"}}>
                <div style={{display:"flex",gap:5,marginBottom:20}}>
                  {[1,2,3].map(i=>(<div key={i} style={{flex:1,height:3,borderRadius:2,background:"linear-gradient(90deg,#D4AF37,#F6E27A)",boxShadow:"0 0 8px rgba(212,175,55,0.25)"}}/>))}
                </div>
                <div style={{textAlign:"center",marginBottom:18}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:"#F3E7BF",lineHeight:1.2,marginBottom:8}}>Choose Your Timeline</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"rgba(243,231,191,0.82)",lineHeight:1.2}}>Mark Your Memorization</div>
                </div>
                <div style={{background:"linear-gradient(180deg,rgba(19,25,36,0.96) 0%,rgba(10,14,24,0.98) 100%)",border:"1px solid rgba(212,175,55,0.18)",borderRadius:20,padding:"18px 16px",marginBottom:18,textAlign:"center",boxShadow:"0 12px 35px rgba(0,0,0,0.35),0 0 22px rgba(212,175,55,0.06)"}}>
                  <div style={{fontSize:9,color:"#D4AF37",letterSpacing:".18em",textTransform:"uppercase",marginBottom:8}}>Your Goal</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#F6E27A",marginBottom:10}}>{goalYears} Year{goalYears!==1?"s":""}{goalMonths>0?" • "+goalMonths+" Month"+(goalMonths!==1?"s":""):""}</div>
                  <div style={{fontSize:13,color:"rgba(243,231,191,0.75)",lineHeight:1.7,marginBottom:10}}>
                    <span style={{color:"#F6E27A",fontWeight:700}}>{apd} ayahs per day</span>{" • "}{daysPerJuz} days per juz{" • "}{remainingJuz} juz remaining
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
                  <div style={{fontSize:11,color:"#D4AF37",fontWeight:700}}>{juzDone} Juz selected</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12}}>
                  {displayedJuz.map(j=>{
                    const isOpen=openJuzPanel===j.num;
                    const surahs=JUZ_SURAHS[j.num]||[];
                    const allChecked=surahs.every(s=>juzStatus[`s${s.s}`]==="complete");
                    const someChecked=surahs.some(s=>juzStatus[`s${s.s}`]==="complete");
                    const juzComplete=juzStatus[j.num]==="complete";
                    return (
                      <div key={j.num} style={{borderRadius:18,overflow:"hidden",border:juzComplete?"1px solid rgba(246,226,122,0.45)":someChecked?"1px solid rgba(212,175,55,0.22)":"1px solid rgba(212,175,55,0.14)",background:juzComplete?"linear-gradient(180deg,rgba(212,175,55,0.12) 0%,rgba(22,17,9,0.96) 100%)":"linear-gradient(180deg,rgba(18,24,34,0.96) 0%,rgba(9,13,22,0.98) 100%)",transition:"all .18s ease",boxShadow:juzComplete?"0 0 26px rgba(212,175,55,0.14),0 12px 30px rgba(0,0,0,0.32)":"0 10px 24px rgba(0,0,0,0.28)"}}>
                        {/* Juz header — tap to expand */}
                        <div className="sbtn" onClick={()=>setOpenJuzPanel(isOpen?null:j.num)} style={{padding:"16px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:11,color:juzComplete?"#F6E27A":"rgba(243,231,191,0.7)",marginBottom:6,letterSpacing:".08em"}}>Juz {j.num}</div>
                            <div style={{fontFamily:"'Amiri',serif",fontSize:24,lineHeight:1.5,color:juzComplete?"#FFF6D6":"#EDE0B7",textShadow:juzComplete?"0 0 14px rgba(212,175,55,0.10)":"none"}}>{JUZ_OPENERS[j.num]}</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            {juzComplete&&<div style={{width:22,height:22,borderRadius:"50%",background:"rgba(246,226,122,0.14)",border:"1px solid rgba(246,226,122,0.45)",display:"flex",alignItems:"center",justifyContent:"center",color:"#F6E27A",fontSize:11,fontWeight:700}}>✓</div>}
                            <div style={{color:"#D4AF37",fontSize:14,transition:"transform .2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>▾</div>
                          </div>
                        </div>
                        {/* Surah list */}
                        {isOpen&&(
                          <div style={{borderTop:"1px solid rgba(212,175,55,0.15)",padding:"12px 14px 14px",background:"rgba(0,0,0,0.2)"}}>
                            <div className="sbtn" onClick={()=>{
                              setJuzStatus(prev=>{
                                const next={...prev};
                                if(allChecked){ surahs.forEach(s=>{delete next[`s${s.s}`];}); delete next[j.num]; }
                                else { surahs.forEach(s=>{next[`s${s.s}`]="complete";}); next[j.num]="complete"; }
                                return next;
                              });
                            }} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"6px 0"}}>
                              <div style={{width:16,height:16,borderRadius:4,background:allChecked?"#D4AF37":"transparent",border:`1.5px solid ${allChecked?"#D4AF37":"#3A4A2E"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#060A07",fontWeight:700,flexShrink:0}}>{allChecked?"✓":""}</div>
                              <div style={{fontSize:11,color:"#A8B89A",fontWeight:600}}>Select all surahs in Juz {j.num}</div>
                            </div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                              {surahs.map(s=>{
                                const checked=juzStatus[`s${s.s}`]==="complete";
                                return (
                                  <div key={s.s} className="sbtn" onClick={()=>{
                                    setJuzStatus(prev=>{
                                      const next={...prev,[`s${s.s}`]:checked?undefined:"complete"};
                                      const allNow=surahs.every(sr=>next[`s${sr.s}`]==="complete");
                                      if(allNow) next[j.num]="complete"; else delete next[j.num];
                                      return next;
                                    });
                                  }} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 8px",borderRadius:8,background:checked?"rgba(212,175,55,0.1)":"rgba(255,255,255,0.03)",border:`1px solid ${checked?"rgba(212,175,55,0.4)":"rgba(255,255,255,0.08)"}`}}>
                                    <div style={{width:13,height:13,borderRadius:3,background:checked?"#D4AF37":"transparent",border:`1.5px solid ${checked?"#D4AF37":"#3A4A2E"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#060A07",fontWeight:700,flexShrink:0}}>{checked?"✓":""}</div>
                                    <div style={{fontSize:10,color:checked?"#F6E27A":"#A8B89A",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                                    <div style={{fontSize:8,color:"#4A5A3E",flexShrink:0}}>{s.a}v</div>
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
                    <div className="sbtn" onClick={()=>setVisibleOnboardJuzCount(v=>Math.min(v+7,30))} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"10px 16px",borderRadius:999,background:"rgba(212,175,55,0.04)",border:"1px solid rgba(212,175,55,0.14)",color:"#D4AF37",fontSize:12,fontWeight:600}}>
                      Load More <span style={{fontSize:11}}>↓</span>
                    </div>
                  </div>
                )}
                <div style={{flex:1}}/>
                <div style={{display:"flex",gap:8}}>
                  <div className="sbtn" onClick={()=>setOnboardStep(3)} style={{padding:"14px 18px",background:"#0D1008",border:"1px solid #1E2A18",borderRadius:12,fontSize:14,color:"#A8B89A"}}>←</div>
                  <div className="sbtn" onClick={()=>{if(userName) localStorage.setItem("rihlat-username",userName);localStorage.setItem("rihlat-onboarded","1");setShowOnboarding(false);}} style={{flex:1,padding:"14px",background:"linear-gradient(90deg,#D4AF37,#F6E27A 60%,#EED97A)",borderRadius:12,fontSize:14,fontWeight:700,color:"#060A07",textAlign:"center",boxShadow:"0 10px 22px rgba(212,175,55,0.18)"}}>
                    Select your starting point
                  </div>
                </div>
              </div>
            );
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
          <div style={{position:"fixed",inset:0,background:"#060A07",zIndex:999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
            <div className="fi" style={{background:"#060A07",border:"1px solid #F0C04060",borderRadius:14,padding:"28px 24px",maxWidth:500,width:"100%",textAlign:"center"}}>
              {/* Bismillah at top */}
              <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(20px,4.5vw,30px)",color:"#F0C040",direction:"rtl",lineHeight:1.8,marginBottom:20}}>
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
              </div>
              <div style={{fontSize:8,color:T.accent,letterSpacing:".22em",textTransform:"uppercase",marginBottom:14}}>Begin With Dua</div>
              <div style={{fontFamily:"'Amiri',serif",fontSize:"clamp(18px,4vw,28px)",color:T.accent,direction:"rtl",lineHeight:2,marginBottom:10}}>{d.arabic}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:12,color:T.sub,fontStyle:"italic",marginBottom:4}}>"{d.transliteration}"</div>
              <div style={{fontSize:11,color:T.text,lineHeight:1.6,marginBottom:4}}>{d.translation}</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:T.dim,marginBottom:20}}>{d.source}</div>
              <div style={{display:"flex",justifyContent:"center",gap:5,marginBottom:20}}>
                {[0,1,2,3,4,5].map(i=>(
                  <div key={i} style={{width:i===duaIdx%6?14:5,height:5,borderRadius:3,background:i===duaIdx%6?"#F0C040":"#2E4030",transition:"all .3s"}}/>
                ))}
              </div>
              <div className="sbtn" onClick={()=>{setShowDua(false);setDuaIdx(i=>(i+1)%6);}} style={{padding:"12px 28px",background:T.accent,color:dark?"#060A07":"#fff",borderRadius:8,fontSize:13,fontWeight:600,display:"inline-block"}}>
                Let's Begin →
              </div>
            </div>
          </div>
        );
      })()}

      {/* TOP BAR */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"10px 16px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:8,color:T.accent,letterSpacing:".2em",textTransform:"uppercase",marginBottom:1}}>{localStorage.getItem("rihlat-username")||"Abdul Jalil"} · Hifz Journey</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:T.text}}>Rihlat Al-Hifz · رحلة الحفظ</div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            {nextJuz&&<div style={{textAlign:"right"}}><div style={{fontSize:12,color:"#8FA3B8",letterSpacing:"1px",marginBottom:1}}>Next Target</div><div style={{fontSize:11,color:T.sub}}>Juz {nextJuz.num}</div></div>}
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:34,fontWeight:700,color:"#F0C040",lineHeight:1}}>{pct}%</div>
              <div style={{fontSize:12,color:"#6B7280"}}>{completedCount} of 30 Juz memorized</div>
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
          <div key={t.id} className="ttab" onClick={()=>{setActiveTab(t.id);if(t.id==="rihlah")setRihlahTab("home");}} style={{padding:"9px 16px",fontSize:12,fontWeight:activeTab===t.id?600:400,color:activeTab===t.id?T.accent:"#6B7280",borderBottom:`2px solid ${activeTab===t.id?T.accent:"transparent"}`,boxShadow:activeTab===t.id?"0 2px 8px rgba(240,192,64,0.3)":"none",whiteSpace:"nowrap"}}>
            {t.label}
          </div>
        ))}
      </div>

      {/* ═══ TODAY SESSION ═══ */}
      {activeTab==="myhifz"&&(
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",background:"linear-gradient(180deg,#0B1220,#0E1628)"}} className="fi">

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

          <div style={{flex:1,padding:"10px 16px 48px"}}>

            {/* ── SESSION SELECTOR ── */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:8,color:T.accent,letterSpacing:".18em",textTransform:"uppercase",marginBottom:7}}>Today's Sessions</div>
              <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}}>
                {SESSIONS.map((s,idx)=>{
                  const isCompleted=sessionsCompleted[s.id];
                  const isActive=idx===activeSessionIndex;
                  return (
                    <div key={s.id} style={{flexShrink:0,padding:"10px 16px",borderRadius:999,display:"flex",alignItems:"center",gap:8,fontWeight:600,fontSize:13,transition:"all .15s",...(isActive?{background:"linear-gradient(135deg,#E6B84A,#D4A62A)",color:"#0B1220",boxShadow:"0 6px 14px rgba(230,184,74,0.25)"}:isCompleted?{background:"rgba(46,204,113,0.15)",border:"1px solid rgba(46,204,113,0.3)",color:"#7EE2A8"}:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.55)"})}}>
                      <span style={{fontSize:13}}>{s.icon}</span>
                      <span style={{fontSize:12,whiteSpace:"nowrap"}}>{s.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── SESSION INFO CARD ── */}
            {(()=>{
              const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];
              if(!sess) return null;
              return (
                <div style={{marginBottom:12,padding:"11px 14px",background:T.surface,border:`1px solid ${T.accent}25`,borderLeft:"2px solid #F0C040",borderRadius:"0 8px 8px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.text,letterSpacing:"-0.01em"}}>{sess.icon} {sess.title}</div>
                    <div style={{fontSize:9,padding:"3px 9px",background:sessionsCompleted[sess.id]?"rgba(46,204,113,0.15)":"rgba(255,255,255,0.05)",border:sessionsCompleted[sess.id]?"1px solid rgba(46,204,113,0.3)":"1px solid rgba(255,255,255,0.08)",borderRadius:10,color:sessionsCompleted[sess.id]?"#7EE2A8":"rgba(255,255,255,0.35)",fontWeight:600}}>
                      {sessionsCompleted[sess.id]?"✓ Done":"Pending"}
                    </div>
                  </div>
                  <div style={{fontSize:11,color:T.sub,lineHeight:1.7}}>{sess.desc}</div>
                </div>
              );
            })()}

            {/* ── ASR PICKER ── */}
            {SESSIONS[activeSessionIndex]?.id==="asr"&&(
              <div style={{marginBottom:12,padding:"12px 14px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:10}}>
                <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:10}}>Choose material for Asr review</div>
                <div style={{fontSize:9,color:T.dim,letterSpacing:".12em",textTransform:"uppercase",marginBottom:6}}>Completed Surahs</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                  {completedSurahOptions.length===0&&<div style={{fontSize:11,color:T.dim}}>No completed surahs yet</div>}
                  {completedSurahOptions.map(s=>{
                    const selected=asrSelectedSurahs.includes(s.num);
                    return (<div key={s.num} className="sbtn" onClick={()=>{ toggleAsrSurahReview(s.num); }} style={{padding:"6px 10px",borderRadius:20,background:selected?T.accentDim:T.surface2,border:`1px solid ${selected?T.accent+"50":T.border}`,color:selected?T.accent:T.sub,fontSize:11}}>{s.en}</div>);
                  })}
                </div>
                <div style={{fontSize:9,color:T.dim,letterSpacing:".12em",textTransform:"uppercase",marginBottom:6}}>Completed Juz</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {completedJuzOptions.length===0&&<div style={{fontSize:11,color:T.dim}}>No completed juz yet</div>}
                  {completedJuzOptions.map(j=>{
                    const selected=asrSelectedJuz.includes(j.num);
                    return (<div key={j.num} className="sbtn" onClick={()=>{ if(asrSelectedJuz.includes(j.num)){setAsrSelectedJuz([]);setAsrReviewBatch([]);}else{loadAsrJuzReview(j.num);} }} style={{padding:"6px 10px",borderRadius:20,background:selected?T.accentDim:T.surface2,border:`1px solid ${selected?T.accent+"50":T.border}`,color:selected?T.accent:T.sub,fontSize:11}}>Juz {j.num}</div>);
                  })}
                </div>
              </div>
            )}

            {/* ── JUZ SELECTOR ── */}
            <div style={{marginTop:16,marginBottom:16}}>
              <div style={{fontSize:11,color:"#6B7280",marginBottom:6,letterSpacing:"1.2px",textTransform:"uppercase"}}>Session Juz</div>
              <div className="sbtn" onClick={()=>setShowJuzModal(true)} style={{background:"linear-gradient(180deg,#0F1A2B 0%,#0C1526 100%)",border:"1px solid rgba(230,184,74,0.10)",borderRadius:20,boxShadow:"0 10px 28px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.03)",padding:"20px 18px",marginBottom:0,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",transition:"all 0.2s ease"}}>
                <div>
                  <div style={{fontSize:20,fontWeight:700,color:"#F8FAFC",marginBottom:4}}>Juz {sessionJuz}</div>
                  <div style={{fontSize:14,color:"rgba(255,255,255,0.62)"}}>{sessM?.roman||sessM?.arabic}</div>
                </div>
                <div style={{color:"#E6B84A",fontSize:16}}>▼</div>
              </div>
            </div>

            {/* ── PROGRESS CARD ── */}
            <div style={{background:"linear-gradient(180deg,#0F1A2B 0%,#0C1526 100%)",border:"1px solid rgba(230,184,74,0.10)",borderRadius:20,boxShadow:"0 10px 28px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.03)",padding:18,marginBottom:18}}>
              <div style={{width:42,height:4,borderRadius:999,background:"#E6B84A",marginBottom:14}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:17,fontWeight:600,color:"#F8FAFC"}}>Juz {sessionJuz} Progress</div>
                {totalSV===0?(<div style={{fontSize:14,color:"rgba(255,255,255,0.48)",fontStyle:"italic"}}>Loading...</div>):(<span style={{fontSize:14,color:"#E6B84A",fontWeight:600,fontFamily:"'IBM Plex Mono',monospace"}}>{sessionIdx} / {totalSV}</span>)}
              </div>
              <div style={{fontSize:14,color:"rgba(255,255,255,0.58)",marginBottom:14}}>{dailyNew} ayahs/session · {Math.ceil((totalSV-sessionIdx)/Math.max(1,dailyNew))} sessions remaining</div>
              <div style={{height:8,borderRadius:999,background:"rgba(255,255,255,0.08)",overflow:"hidden"}}>
                <div className="pbfill" style={{height:"100%",width:`${sessPct}%`,background:"linear-gradient(90deg,#E6B84A,#F0C040)",borderRadius:999,transition:"width .5s"}}/>
              </div>
            </div>

            {/* ── LOADING / ERROR STATES ── */}
            {sessLoading&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:40,gap:12}}><div className="spin" style={{width:26,height:26,border:`2px solid ${T.border}`,borderTopColor:"#F0C040",borderRadius:"50%"}}/><div style={{fontSize:12,color:T.dim}}>Loading ayahs...</div></div>}
            {!sessLoading&&sessionVerses.length===0&&(
              <div style={{background:"linear-gradient(180deg,#0F1A2B 0%,#0C1526 100%)",border:"1px solid rgba(230,184,74,0.10)",borderRadius:20,boxShadow:"0 10px 28px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.03)",padding:"30px 22px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center"}}>
                <div style={{width:74,height:74,borderRadius:"50%",background:"rgba(230,184,74,0.08)",border:"1px solid rgba(230,184,74,0.12)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18,boxShadow:"0 0 10px rgba(230,184,74,0.10)",fontSize:30}}>📖</div>
                <div style={{fontSize:20,fontWeight:700,color:"#F8FAFC",marginBottom:10}}>Unable to load ayahs</div>
                <div style={{fontSize:14,lineHeight:1.7,color:"rgba(255,255,255,0.60)",maxWidth:320,marginBottom:22}}>Please check your connection and try again.</div>
                <div className="sbtn" onClick={()=>setSessionJuz(n=>n)} style={{background:"linear-gradient(180deg,#F0C040 0%,#D89A10 100%)",color:"#0B1220",border:"none",borderRadius:14,padding:"12px 28px",fontWeight:700,fontSize:16,boxShadow:"0 6px 14px rgba(240,192,64,0.14)",cursor:"pointer"}}>Retry</div>
              </div>
            )}

            {/* ── ASR EMPTY STATE ── */}
            {!sessLoading&&currentSessionId==="asr"&&batch.length===0&&(
              <div style={{padding:"16px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:6}}>Choose review material for Asr</div>
                <div style={{fontSize:11,color:T.sub,lineHeight:1.6}}>Select completed surahs or completed juz above to build your Asr revision set.</div>
              </div>
            )}

            {/* ── AYAH BATCH ── */}
            {!sessLoading&&batch.length>0&&(
              <div>
                {/* Batch header */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase"}}>{currentSessionId==="fajr"?"Fajr":currentSessionId==="dhuhr"?"Dhuhr Review":currentSessionId==="asr"?"Asr Review":currentSessionId==="maghrib"?"Listening":"Isha Review"} — Ayah Batch</div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <div className="sbtn" onClick={()=>setShowTrans(s=>!s)} style={{fontSize:10,padding:"3px 8px",background:showTrans?T.accentDim:T.surface2,border:`1px solid ${showTrans?T.accent+"50":T.border}`,borderRadius:5,color:showTrans?T.accent:T.dim}}>
                      {showTrans?"Hide Trans":"Translation"}
                    </div>
                  </div>
                </div>

                {/* No per-ayah audio warning */}
                {!hasPerAyah(reciter)&&(
                  <div style={{marginBottom:10,padding:"8px 12px",background:T.surface,border:`1px solid ${T.accent}30`,borderLeft:`3px solid ${T.accent}`,borderRadius:"0 6px 6px 0",fontSize:11,color:T.sub}}>
                    🎵 <strong style={{color:T.accent}}>{currentReciter.name}</strong> — full surah only. Switch reciter for per-ayah audio.
                  </div>
                )}

                {/* ── COLLAPSIBLE AYAH ROWS ── */}
                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
                  {batch.map((v,i)=>{
                    const vNum=v.verse_key?.split(":")?.[1];
                    const sNum=v.surah_number||parseInt(v.verse_key?.split(":")?.[0]);
                    const vKey=v.verse_key;
                    const isPlaying=playingKey===vKey;
                    const isLoading=audioLoading===vKey;
                    const trans=translations[vKey];
                    const reps=repCounts[vKey]||0;
                    const repsDone=reps>=20;
                    const isOpen=openAyah===vKey;
                    const pct=Math.min((reps/20)*100,100);

                    return (
                      <div key={vKey} style={{borderRadius:18,marginBottom:16,background:"#0F1A2B",border:`1px solid ${repsDone?"rgba(230,184,74,0.4)":"rgba(230,184,74,0.12)"}`,overflow:"hidden",transition:"all .2s",boxShadow:repsDone?"0 0 20px rgba(230,184,74,0.15)":"0 4px 12px rgba(0,0,0,0.3)"}}>

                        {/* ── COLLAPSED: header + arabic preview + rep bar ── */}
                        <div className="sbtn" onClick={()=>setOpenAyah(isOpen?null:vKey)} style={{padding:16}}>
                          {/* Header row */}
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{width:30,height:30,borderRadius:"50%",background:repsDone?"rgba(230,184,74,0.15)":"rgba(255,255,255,0.05)",border:`1px solid ${repsDone?"rgba(230,184,74,0.5)":"rgba(255,255,255,0.08)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,color:repsDone?"#E6B84A":"#aaa",flexShrink:0,boxShadow:repsDone?"0 0 10px rgba(230,184,74,0.2)":"none"}}>
                                {repsDone?"✓":i+1}
                              </div>
                              <span style={{fontSize:12,color:"#9CA3AF",fontFamily:"'IBM Plex Mono',monospace"}}>{SURAH_EN[sNum]} · {vKey}</span>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <span style={{fontSize:12,color:repsDone?"#2ECC71":reps>0?"#E6B84A":"rgba(255,255,255,0.25)",fontFamily:"'IBM Plex Mono',monospace"}}>{reps}/20</span>
                              <span style={{fontSize:11,color:"rgba(255,255,255,0.2)"}}>{isOpen?"▾":"›"}</span>
                            </div>
                          </div>
                          {/* Arabic — HERO */}
                          <div style={{fontFamily:"'Amiri',serif",fontSize:22,color:"rgba(255,255,255,0.92)",direction:"rtl",textAlign:"right",lineHeight:1.8,marginBottom:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:isOpen?"normal":"nowrap"}}>
                            {v.text_uthmani}
                          </div>
                          {/* Rep progress bar */}
                          <div style={{width:"100%",height:4,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                            <div style={{width:`${pct}%`,height:"100%",borderRadius:999,background:"linear-gradient(90deg,rgba(220,90,90,0.85) 0%,rgba(224,178,66,0.9) 55%,rgba(56,214,126,0.9) 100%)",transition:"width 0.35s ease"}}/>
                          </div>
                        </div>

                        {/* ── EXPANDED ── */}
                        {isOpen&&(
                          <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"0 16px 16px",background:"#0F1A2B"}}>
                            {/* Translation */}
                            {showTrans&&(
                              <div style={{fontSize:13,color:"#9CA3AF",fontStyle:"italic",lineHeight:1.7,marginBottom:14,marginTop:12}}>
                                {trans===undefined?<span style={{color:"rgba(255,255,255,0.2)"}}>Loading...</span>:trans||<span style={{color:"rgba(255,255,255,0.2)"}}>Translation unavailable</span>}
                              </div>
                            )}
                            {/* Audio controls */}
                            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                              <div className="sbtn" onClick={()=>hasPerAyah(reciter)?playAyah(vKey,vKey):null} style={{width:36,height:36,borderRadius:"50%",background:isPlaying?"rgba(240,192,64,0.2)":"rgba(255,255,255,0.05)",border:`1px solid ${isPlaying?"rgba(240,192,64,0.6)":"rgba(255,255,255,0.1)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:isPlaying?"#F0C040":"rgba(255,255,255,0.5)",opacity:hasPerAyah(reciter)?1:0.4}}>
                                {isLoading?<div className="spin" style={{width:14,height:14,border:"2px solid rgba(240,192,64,0.3)",borderTopColor:"#F0C040",borderRadius:"50%"}}/>:(isPlaying?"⏸":"▶")}
                              </div>
                              <div style={{flex:1,height:4,background:"rgba(255,255,255,0.06)",borderRadius:999}}>
                                <div style={{height:"100%",width:isPlaying?"40%":"0%",background:"#F0C040",borderRadius:999,transition:"width .5s"}}/>
                              </div>
                              <div className="sbtn" onClick={()=>{setLooping(l=>{const next=!l;if(audioRef.current)audioRef.current.loop=next;return next;});}} style={{width:30,height:30,borderRadius:"50%",background:looping?"rgba(240,192,64,0.15)":"rgba(255,255,255,0.05)",border:`1px solid ${looping?"rgba(240,192,64,0.4)":"rgba(255,255,255,0.08)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:looping?"#F0C040":"rgba(255,255,255,0.4)"}}>🔁</div>
                              <div className="sbtn" onClick={()=>{if(audioRef.current){audioRef.current.pause();audioRef.current.currentTime=0;setPlayingKey(null);}}} style={{width:30,height:30,borderRadius:"50%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"rgba(255,255,255,0.4)"}}>↩</div>
                            </div>
                            {/* Tap to rep */}
                            <div className="sbtn" onClick={()=>setRepCounts(prev=>({...prev,[vKey]:Math.min(20,(prev[vKey]||0)+1)}))} style={{width:"100%",padding:"12px",background:repsDone?"rgba(74,222,128,0.08)":"rgba(230,184,74,0.08)",border:`1px solid ${repsDone?"rgba(74,222,128,0.25)":"rgba(230,184,74,0.2)"}`,borderRadius:12,textAlign:"center",transition:"all .2s"}}>
                              {repsDone?(
                                <div style={{fontSize:13,fontWeight:700,color:"#4ADE80"}}>✓ 20 Reps Complete — MashaAllah!</div>
                              ):(
                                <div>
                                  <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.7)",marginBottom:8}}>Tap after each recitation · <span style={{color:"#F0C040",fontWeight:700}}>{reps}/20</span></div>
                                  <div style={{width:"100%",height:5,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                                    <div style={{width:`${pct}%`,height:"100%",borderRadius:999,background:"linear-gradient(90deg,rgba(220,90,90,0.85) 0%,rgba(224,178,66,0.9) 55%,rgba(56,214,126,0.9) 100%)",transition:"width 0.35s ease"}}/>
                                  </div>
                                </div>
                              )}
                            </div>
                            {reps>0&&<div className="sbtn" onClick={()=>setRepCounts(prev=>({...prev,[vKey]:0}))} style={{textAlign:"center",fontSize:10,color:"rgba(255,255,255,0.2)",marginTop:8}}>Reset reps</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── BATCH DONE ── */}
                {bDone?(
                  <div style={{textAlign:"center",padding:"20px",background:T.surface,border:"1px solid #F0C04030",borderRadius:8}}>
                    <div style={{fontSize:22,marginBottom:8}}>✅</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:"#F0C040",marginBottom:4}}>Batch Complete — MashaAllah!</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginBottom:14}}>Session complete — MashaAllah! 🤲</div>
                    <div className="sbtn" onClick={()=>{setSessionDone(d=>d.filter(k=>k!==bKey));setRepCounts({});setOpenAyah(null);}} style={{display:"inline-block",padding:"12px 32px",background:"linear-gradient(180deg,#F0C040,#D89A10)",borderRadius:12,fontSize:14,fontWeight:700,color:"#0B1220",boxShadow:"0 6px 14px rgba(240,192,64,0.2)"}}>
                      Finish & Continue →
                    </div>
                  </div>
                ):(
                  <div className="sbtn" onClick={()=>{
                    const sess=SESSIONS[activeSessionIndex]||SESSIONS[0];
                    setSessionsCompleted(prev=>({...prev,[sess.id]:true}));
                    toggleCheck(sess.id);
                    setSessionDone(d=>[...d,bKey]);
                    setRepCounts({});
                    setOpenAyah(null);
                    if(activeSessionIndex>=SESSIONS.length-1){
                      setYesterdayBatch(fajrBatch);
                      setSessionIdx(bEnd);
                      setActiveSessionIndex(0);
                      setSessionsCompleted({fajr:false,dhuhr:false,asr:false,maghrib:false,isha:false});
                    } else {
                      setActiveSessionIndex(i=>i+1);
                    }
                  }} style={{width:"100%",padding:"14px",background:"linear-gradient(180deg,#E6B84A,#D4A62A)",borderRadius:12,fontSize:14,fontWeight:700,color:"#0B1220",textAlign:"center",boxShadow:"0 6px 14px rgba(230,184,74,0.2)"}}>
                    {SESSION_CTA[activeSessionIndex]||"Finish & Continue →"}
                  </div>
                )}
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

            {!sessLoading&&currentSessionId==="fajr"&&batch.length===0&&totalSV>0&&(
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
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",opacity:earned?1:0.3,filter:earned?"none":"grayscale(0.6)",background:earned?"rgba(34,197,94,0.06)":"transparent",borderRadius:16,padding:"12px",boxShadow:earned?"0 0 18px rgba(34,197,94,0.22)":"none"}}>
            <div style={{position:"relative",width:52,height:52,marginBottom:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {earned&&<div style={{position:"absolute",inset:0,borderRadius:"50%",background:"rgba(52,211,153,0.2)",filter:"blur(6px)"}}/>}
              <div style={{position:"relative",width:52,height:52,borderRadius:"50%",background:"linear-gradient(180deg,#34D399 0%,#059669 50%,#064E3B 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:"1.5px solid rgba(110,231,183,0.4)"}}>
                <span style={{fontSize:18,fontWeight:700,color:"#fff",lineHeight:1,position:"relative",zIndex:1}}>{count}</span>
                <span style={{fontSize:8,fontWeight:600,color:"rgba(167,243,208,0.9)",position:"relative",zIndex:1}}>Juz</span>
              </div>
            </div>
            <div style={{fontSize:9,fontWeight:700,color:earned?"rgba(255,255,255,0.88)":"rgba(255,255,255,0.28)",textAlign:"center"}}>{count} Juz</div>
          </div>
        );
        const HabituatedBadge=({earned})=>(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,opacity:earned?1:0.3,filter:earned?"none":"grayscale(0.6)",background:earned?"rgba(245,158,11,0.06)":"transparent",borderRadius:16,padding:"12px",boxShadow:earned?"0 0 18px rgba(245,158,11,0.2)":"none"}}>
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
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,opacity:earned?1:0.3,filter:earned?"none":"grayscale(0.6)",background:earned?"rgba(249,115,22,0.06)":"transparent",borderRadius:16,padding:"12px",boxShadow:earned?"0 0 18px rgba(249,115,22,0.2)":"none"}}>
            <svg viewBox="0 0 24 24" style={{width:48,height:48,filter:earned?"drop-shadow(0 2px 10px rgba(249,115,22,0.5))":"none"}}>
              <defs><linearGradient id="fg1" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#DC2626"/><stop offset="40%" stopColor="#F97316"/><stop offset="80%" stopColor="#FBBF24"/><stop offset="100%" stopColor="#FEF08A"/></linearGradient></defs>
              <path d="M12 2C10 6 6 8 6 13C6 16.5 8.5 19 12 19C15.5 19 18 16.5 18 13C18 8 14 6 12 2ZM12 17C10.5 17 9 15.5 9 14C9 12 10 11 12 9C14 11 15 12 15 14C15 15.5 13.5 17 12 17Z" fill="url(#fg1)"/>
            </svg>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.5)",fontWeight:500,letterSpacing:".02em"}}>7 Day Streak</span>
          </div>
        );
        const HifzGoalBadge=({earned})=>(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",opacity:earned?1:0.35}}>
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
          <div style={{flex:1,overflowY:"auto",background:"radial-gradient(circle at top, rgba(32,44,90,0.35) 0%, rgba(8,12,24,1) 45%, rgba(4,7,15,1) 100%)"}} className="fi">

            {/* ── AMBIENT GLOW ── */}
            <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
              <div style={{position:"absolute",top:"10%",left:"15%",width:300,height:300,background:"rgba(52,211,153,0.08)",borderRadius:"50%",filter:"blur(60px)"}}/>
              <div style={{position:"absolute",bottom:"25%",right:"10%",width:250,height:250,background:"rgba(251,191,36,0.06)",borderRadius:"50%",filter:"blur(60px)"}}/>
            </div>

            {/* ── 1. PROFILE HEADER ── */}
            <div style={{background:"linear-gradient(160deg,#0D2E18 0%,#1A4A28 50%,#0A1F10 100%)",padding:"20px 16px 24px",position:"relative",overflow:"hidden",zIndex:1}}>
              <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 12% 18%, rgba(240,192,64,0.10) 0, transparent 18%), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.06) 0, transparent 14%)"}}/>
              <div style={{display:"flex",alignItems:"center",gap:14,position:"relative",zIndex:1}}>
                <div style={{position:"relative"}}>
                  <div style={{width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,#1A4A28,#2E7D46)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"2px solid rgba(240,192,64,0.5)",boxShadow:"0 0 20px rgba(240,192,64,0.2)"}}>
                    <span style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#F0C040"}}>{initials}</span>
                  </div>
                  <div style={{position:"absolute",bottom:-2,right:-2,width:20,height:20,background:"linear-gradient(135deg,#34D399,#059669)",borderRadius:"50%",border:"2px solid #0D1020",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:9,fontWeight:700,color:"#fff"}}>1</span>
                  </div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:19,fontWeight:700,color:"#EDE8DC",fontFamily:"'Playfair Display',serif",marginBottom:2}}>{username}</div>
                  <div style={{fontSize:11,color:"#F0C040",marginBottom:8,letterSpacing:".06em"}}>Memorizer · طالب الحفظ</div>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                    {[
                      {label:"📅 Joined "+joinYear, bg:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.6)", border:"rgba(255,255,255,0.1)"},
                      {label:"🎯 "+goalLabel, bg:"rgba(56,189,248,0.12)", color:"#38BDF8", border:"rgba(56,189,248,0.25)"},
                      {label:"🔥 "+streak+" day streak", bg:"rgba(246,166,35,0.12)", color:"#F6A623", border:"rgba(246,166,35,0.25)"},
                    ].map((pill,i)=>(
                      <div key={i} style={{fontSize:10,color:pill.color,background:pill.bg,padding:"3px 9px",borderRadius:20,border:`1px solid ${pill.border}`}}>{pill.label}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{padding:"12px 14px 48px",position:"relative",zIndex:1}}>

            {/* ── 2 & 3. OVERALL PROGRESS + DAILY GOALS — single card ── */}
            <div style={{background:"linear-gradient(135deg,rgba(30,35,50,0.9) 0%,rgba(20,25,40,0.7) 100%)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,boxShadow:"0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)",padding:"16px",marginBottom:10}}>

              {/* ── Overall Progress ── */}
              <div style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.7)",fontWeight:700,marginBottom:12}}>Overall Progress</div>
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
                <svg width={100} height={100} style={{flexShrink:0,overflow:"visible"}}>
                  <defs>
                    <linearGradient id="ringgrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4ADE80"/>
                      <stop offset="100%" stopColor="#22C55E"/>
                    </linearGradient>
                    <filter id="glow2"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                  </defs>
                  <circle cx={50} cy={50} r={40} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={9}/>
                  <circle cx={50} cy={50} r={40} fill="none" stroke="url(#ringgrad)" strokeWidth={9}
                    strokeDasharray={`${2*Math.PI*40*(pct/100)} ${2*Math.PI*40}`} strokeLinecap="round"
                    transform="rotate(-90 50 50)" filter="url(#glow2)" style={{transition:"stroke-dasharray 1s ease"}}/>
                  <text x={50} y={46} textAnchor="middle" fill="#4ADE80" fontSize={18} fontWeight={700} fontFamily="'IBM Plex Mono',monospace">{pct}%</text>
                  <text x={50} y={61} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={10} fontFamily="'DM Sans',sans-serif">{completedCount}/30 Juz</text>
                </svg>
                <div style={{flex:1}}>
                  {[{label:"Memorized",val:completedCount,color:"#4ADE80"},{label:"In Progress",val:Object.values(juzStatus).filter(s=>s==="in_progress").length,color:"#F6A623"},{label:"Remaining",val:30-completedCount,color:"rgba(255,255,255,0.3)"}].map((s,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:i<2?"1px solid rgba(255,255,255,0.06)":"none"}}>
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
                  <span style={{fontSize:13,color:"rgba(255,255,255,0.35)"}}> / {SESSIONS.length}</span>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginLeft:4}}>Sessions</span>
                </div>
              </div>
              <div style={{height:5,background:"rgba(255,255,255,0.08)",borderRadius:999,overflow:"hidden",marginBottom:12}}>
                <div style={{height:"100%",width:`${Math.round((checkedCount/SESSIONS.length)*100)}%`,background:"linear-gradient(90deg,#4ADE80,#22C55E)",borderRadius:999,boxShadow:"0 0 10px rgba(74,222,128,0.4)",transition:"width .5s"}}/>
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
            <div style={{background:"linear-gradient(180deg,#0F1A2B 0%,#0C1526 100%)",border:"1px solid rgba(230,184,74,0.10)",borderRadius:20,boxShadow:"0 10px 28px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.03)",padding:"16px",marginBottom:10,overflow:"hidden",position:"relative"}}>
              <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 10% 20%, rgba(46,230,197,0.05) 0, transparent 40%), radial-gradient(circle at 85% 75%, rgba(230,184,74,0.05) 0, transparent 40%)"}}/>
              <div style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.5)",fontWeight:700,marginBottom:12,position:"relative",zIndex:1}}>Hifz Journey</div>
              {(()=>{
                const journeyPct=Math.round((completedCount/30)*100);
                const pathD="M20 110 C 55 105, 78 78, 110 72 S 175 45, 210 42 S 265 28, 300 18";
                const pathLength=320;
                const revealed=(journeyPct/100)*pathLength;
                const hidden=pathLength-revealed;
                const cp=journeyPct<=5?{x:28,y:105}:journeyPct<=25?{x:95,y:77}:journeyPct<=50?{x:160,y:56}:journeyPct<=75?{x:230,y:38}:{x:286,y:23};
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
                    <path d={pathD} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeLinecap="round"/>
                    <path d={pathD} fill="none" stroke="url(#journeyGradient)" strokeWidth="6" strokeLinecap="round" filter="url(#lineGlow)" strokeDasharray={`${revealed} ${hidden}`}/>
                    {[{x:105,y:73,juz:10,label:"Juz 10"},{x:170,y:50,juz:20,label:"Juz 20"},{x:245,y:32,juz:30,label:"Juz 30"}].map((m,i)=>{
                      const reached=completedCount>=m.juz;
                      return (
                        <g key={i} opacity={reached?1:0.4}>
                          <circle cx={m.x} cy={m.y} r="5.5" fill="rgba(255,255,255,0.22)"/>
                          <text x={m.x} y={m.y+16} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.5)">{m.label}</text>
                        </g>
                      );
                    })}
                    {completedCount>0&&(
                      <g>
                        <circle cx={cp.x} cy={cp.y} r="9" fill="#2EE6C5" filter="url(#currentGlow)"/>
                        <circle cx={cp.x} cy={cp.y} r="5.5" fill="#C8FFF4"/>
                        <text x={cp.x} y={cp.y-13} textAnchor="middle" fontSize="8" fontWeight="700" fill="#2EE6C5">{completedCount}</text>
                      </g>
                    )}
                    <g transform="translate(300 18)">
                      <circle cx="0" cy="0" r="16" fill="rgba(230,184,74,0.10)" stroke="rgba(230,184,74,0.70)" strokeWidth="1.5" filter="url(#goalGlow)"/>
                      <text x="0" y="5" textAnchor="middle" fontSize="13" fill="#F0C040">📖</text>
                    </g>
                    <text x="20" y="126" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.4)">Juz 1</text>
                  </svg>
                );
              })()}
              <div style={{display:"flex",justifyContent:"space-between",position:"relative",zIndex:1,marginTop:4}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>Goal: {goalYears}-Year Plan</div>
                <div style={{fontSize:10,color:"rgba(230,184,74,0.6)",fontWeight:600}}>{timeline.juzLeft} Juz remaining</div>
              </div>
            </div>


            {/* ── 5. ACTIVE SESSION CHECKLIST ── */}
            <div style={{background:"linear-gradient(135deg,rgba(30,35,50,0.9) 0%,rgba(20,25,40,0.7) 100%)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,boxShadow:"0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)",padding:"16px",marginBottom:10}}>
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
                    {activeDone?"✓ Done":"Mark Done"}
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
            <div style={{background:"linear-gradient(135deg,rgba(30,35,50,0.9) 0%,rgba(20,25,40,0.7) 100%)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,boxShadow:"0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)",padding:"18px 14px",marginBottom:10,position:"relative",overflow:"hidden"}}>
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
              <div className="sbtn" onClick={()=>setRihlahTab("juz")} style={{padding:"16px",background:"linear-gradient(145deg,#0B1020,#111A33)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:18,textAlign:"center",boxShadow:"0 10px 25px rgba(0,0,0,0.25)",filter:"drop-shadow(0 0 10px rgba(255,255,255,0.15))",transition:"all .2s"}}>
                <div style={{fontSize:24,marginBottom:4}}>📖</div>
                <div style={{fontSize:13,fontWeight:700,color:"#EDE8DC"}}>My Juz</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:2}}>Track memorization</div>
              </div>
              <div className="sbtn" onClick={()=>setRihlahTab("timeline")} style={{padding:"16px",background:"linear-gradient(145deg,#0B1020,#111A33)",border:"1px solid rgba(240,192,64,0.2)",borderRadius:18,textAlign:"center",boxShadow:"0 10px 25px rgba(0,0,0,0.25)",filter:"drop-shadow(0 0 10px rgba(255,255,255,0.15))",transition:"all .2s"}}>
                <div style={{fontSize:24,marginBottom:4}}>⏱️</div>
                <div style={{fontSize:13,fontWeight:700,color:"#EDE8DC"}}>Timeline</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:2}}>Goal calculator</div>
              </div>
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
              <div className="sbtn" onClick={()=>{setReciterMode("quran");setShowReciterModal(true);}} style={{padding:"5px 10px",background:T.surface2,border:`1px solid ${T.accent}40`,borderRadius:6,fontSize:10,color:T.accent,display:"flex",alignItems:"center",gap:5}}>
                  🎙️ {QURAN_RECITERS.find(r=>r.id===quranReciter)?.name||"Select Reciter"} ▼
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
                          <div className="sbtn" onClick={(e)=>{
                          e.stopPropagation();
                          const firstVerseKey=verses[0]?.verse_key||"";
                          const firstAyahNum=parseInt(firstVerseKey.split(":")?.[1]||"1",10);
                          const shouldUseAyahQueue=MID_SURAH_JUZ.has(selectedJuz)&&firstAyahNum>1;
                          if(shouldUseAyahQueue){ playSurahQueue(verses,surahNum,0,quranReciter); } else { playQuranSurah(surahNum); }
                        }} style={{padding:"0 14px",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",borderLeft:`1px solid ${T.border}`,background:playingSurah===surahNum?T.accent+"18":T.surface,minHeight:44,minWidth:44}}>
                            {audioLoading===`surah-${surahNum}`||(audioLoading&&playingSurah===surahNum)
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

      {/* ── Juz Selector Modal ── */}
      {showJuzModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowJuzModal(false)}>
          <div style={{background:"#0F1115",borderRadius:"16px 16px 0 0",padding:"20px 16px 36px",width:"100%",maxWidth:520,maxHeight:"70vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:40,height:4,background:"rgba(255,255,255,0.1)",borderRadius:2,margin:"0 auto 16px"}}/>
            <div style={{fontSize:12,color:"#6B7280",letterSpacing:"1px",textTransform:"uppercase",marginBottom:14,textAlign:"center"}}>Select Juz</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,paddingBottom:8}}>
              {JUZ_META.slice().reverse().map(j=>{
                const isSel=sessionJuz===j.num;
                const isDone=juzStatus[j.num]==="complete";
                return (
                  <div key={j.num} className="sbtn" onClick={()=>{setSessionJuz(j.num);setSessionIdx(0);setRepCounts({});setOpenAyah(null);setShowJuzModal(false);}} style={{paddingTop:18,paddingBottom:18,borderRadius:16,background:isDone?"rgba(230,184,74,0.12)":"rgba(255,255,255,0.04)",border:isSel?"1.5px solid #E6B84A":"1px solid rgba(255,255,255,0.06)",boxShadow:isSel?"0 0 14px rgba(230,184,74,0.28)":"none",textAlign:"center",transition:"all .15s"}}>
                    <div style={{fontSize:12,color:isSel?"#E6B84A":isDone?"#E6B84A":"#888",fontWeight:isSel?700:400,marginBottom:4}}>{j.num}</div>
                    <div style={{fontSize:12,color:isSel?"#F8FAFC":isDone?"rgba(230,184,74,0.8)":"#ccc",fontWeight:isSel?600:400,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",paddingLeft:4,paddingRight:4}}>{j.roman?.split(" ")[0]||""}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quran Reciter Modal */}
{showReciterModal&&(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowReciterModal(false)}>
    <div style={{background:"#F5F0E8",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:500,maxHeight:"82vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>

      {/* ── Header ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 18px 0"}}>
        <div className="sbtn" onClick={()=>setShowReciterModal(false)} style={{fontSize:14,color:"#5A6A7A",fontWeight:500,padding:"4px 0"}}>Cancel</div>
        <div style={{fontSize:14,fontWeight:700,color:"#1A2A35"}}>Select Reciter</div>
        <div className="sbtn" onClick={()=>setShowReciterModal(false)} style={{fontSize:14,color:"#C9A84C",fontWeight:700,padding:"4px 0"}}>Done</div>
      </div>

      {/* ── Currently playing ── */}
      <div style={{fontSize:11,color:"#7A8A9A",textAlign:"center",padding:"6px 18px 12px"}}>
        Currently playing: <span style={{color:"#1A2A35",fontWeight:600}}>{reciterMode==="quran"?(QURAN_RECITERS.find(r=>r.id===quranReciter)?.name||"Unknown"):currentReciter.name}</span>
      </div>

      {/* ── Reciter list ── */}
      <div style={{overflowY:"auto",padding:"0 14px 32px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:1,borderRadius:12,overflow:"hidden",border:"1px solid #DDD4C0"}}>
          {QURAN_RECITERS.map((r,i,arr)=>{
            const isSelected=(reciterMode==="quran"?quranReciter:reciter)===r.id;
            return (
              <div key={r.id} className="sbtn" onClick={()=>{
                if(reciterMode==="quran"){
                  setQuranReciter(r.id);
                  setPlayingSurah(null); setPlayingKey(null); setAudioLoading(null);
                  if(audioRef.current){ audioRef.current.pause(); audioRef.current=null; }
                } else { setReciter(r.id); }
                setShowReciterModal(false);
              }} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:isSelected?"#FFF8E8":"#FFFFFF",borderBottom:i<arr.length-1?"1px solid #EDE8DC":"none",transition:"background .1s"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"#EEE8D8",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14}}>🔊</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:isSelected?700:500,color:"#1A2A35"}}>{r.name}</div>
                  <div style={{fontFamily:"Amiri, serif",fontSize:12,color:"#7A8A9A",marginTop:2}}>{r.arabic}</div>
                </div>
                {isSelected&&<div style={{marginLeft:"auto",fontSize:16,color:"#C9A84C",fontWeight:700,flexShrink:0}}>✓</div>}
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

    </div>
  );
}
