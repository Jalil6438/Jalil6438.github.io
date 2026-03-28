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
  const [userName,setUserName]=useState("");
  const [openJuzPanel,setOpenJuzPanel]=useState(null);
  const [repCounts,setRepCounts]=useState({});
  const [looping, setLooping]=useState(false);
  const [openAyah,setOpenAyah]=useState(null);
  const [activeSession,setActiveSession]=useState("fajr");
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
  const [quranReciter,setQuranReciter]=useState("dosari");
  const [showReciterModal,setShowReciterModal]=useState(false);
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
            <div className="fi" style={{flex:1,display:"flex",flexDirection:"column",padding:"24px 24px 32px",overflow:"auto"}}>
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
            const totalAyahs=6236;
            const memorizedSurahs=Object.entries(juzStatus).filter(([,v])=>v==="complete").length;
            const juzDone=Object.values(juzStatus).filter(v=>v==="complete").length;
            const remainingJuz=30-juzDone;
            const totalMonths=(goalYears*12)+goalMonths;
            const remainingAyahs=Math.round(totalAyahs*(remainingJuz/30));
            const apd=totalMonths>0?Math.max(1,Math.round(remainingAyahs/(totalMonths*30))):0;
            const daysPerJuz=apd>0?Math.round(6236/30/apd):0;
            return (
              <div className="fi" style={{flex:1,display:"flex",flexDirection:"column",padding:"20px 20px 24px",overflow:"auto"}}>
                {/* Progress bar */}
                <div style={{display:"flex",gap:5,marginBottom:20}}>
                  {[1,2,3].map(i=>(
                    <div key={i} style={{flex:1,height:3,borderRadius:2,background:"#F0C040"}}/>
                  ))}
                </div>
                <div style={{fontSize:8,color:"#F0C040",letterSpacing:".2em",textTransform:"uppercase",marginBottom:4}}>Your Goal</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:"#EDE8DC",marginBottom:14}}>Set your timeline & mark memorization</div>

                {/* Sliders */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  <div style={{background:"#0D1008",border:"1px solid #1E2A18",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:8,color:"#5A7050",textTransform:"uppercase",letterSpacing:".1em"}}>Years</span>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:"#F0C040",fontWeight:600}}>{goalYears}yr</span>
                    </div>
                    <input type="range" min="1" max="10" value={goalYears} onChange={e=>setGoalYears(Number(e.target.value))} style={{width:"100%"}}/>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#2E4030",marginTop:2}}><span>1yr</span><span>5yr</span><span>10yr</span></div>
                  </div>
                  <div style={{background:"#0D1008",border:"1px solid #1E2A18",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:8,color:"#5A7050",textTransform:"uppercase",letterSpacing:".1em"}}>Months</span>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:"#F0C040",fontWeight:600}}>{goalMonths}mo</span>
                    </div>
                    <input type="range" min="0" max="11" value={goalMonths} onChange={e=>setGoalMonths(Number(e.target.value))} style={{width:"100%"}}/>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#2E4030",marginTop:2}}><span>0mo</span><span>6mo</span><span>11mo</span></div>
                  </div>
                </div>

                {/* Live stats */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:12}}>
                  {[
                    {val:apd,lbl:"Ayahs/day"},
                    {val:remainingJuz,lbl:"Juz left"},
                    {val:`~${daysPerJuz}d`,lbl:"Days/Juz"},
                  ].map(s=>(
                    <div key={s.lbl} style={{background:"#0D1008",border:"1px solid #F0C04020",borderTop:"2px solid #F0C040",borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:"#F0C040",fontWeight:600,marginBottom:2}}>{s.val}</div>
                      <div style={{fontSize:8,color:"#5A7050"}}>{s.lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Juz grid */}
                <div style={{fontSize:8,color:"#A8B89A",letterSpacing:".14em",textTransform:"uppercase",marginBottom:7,display:"flex",justifyContent:"space-between"}}>
                  <span>Mark your memorization</span>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",color:"#F0C040"}}>{juzDone} Juz ✓</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:6}}>
                  {Array.from({length:30},(_,i)=>{
                    const juz=i+1;
                    const status=juzStatus[juz];
                    const isFull=status==="complete";
                    const isOpen=openJuzPanel===juz;
                    const hasPartial=!isFull&&Object.keys(juzStatus).some(k=>k.startsWith("s")&&JUZ_SURAHS[juz]?.some(s=>`s${s.s}`===k&&juzStatus[k]==="complete"));
                    const juzMeta=JUZ_META.find(j=>j.num===juz);
                    const juzName=juzMeta?.roman||`Juz ${juz}`;
                    const juzArabic=juzMeta?.arabic||"";
                    return (
                      <div key={juz} className="sbtn"
                        onClick={()=>setOpenJuzPanel(isOpen?null:juz)}
                        style={{
                          borderRadius:10,
                          padding:"10px 6px",
                          background:isOpen?"#F0C040":isFull?"#F0C04025":hasPartial?"#F0C04012":"#141A0F",
                          border:`1px solid ${isOpen?"#F0C040":isFull?"#F0C040":hasPartial?"#F0C04055":"#1E2A18"}`,
                          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                          textAlign:"center",
                          transition:"all .15s",
                          boxShadow:isFull?"0 2px 8px rgba(240,192,64,.2)":"none",
                        }}
                      >
                        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:isOpen?"#060A07":isFull?"#F0C040":"#F0C04050",fontWeight:700,marginBottom:3}}>
                          {String(juz).padStart(2,"0")}
                        </div>
                        <div style={{fontSize:10,fontWeight:600,color:isOpen?"#060A07":isFull?"#F0C040":hasPartial?"#F0C04080":"#A8B89A",marginBottom:2,lineHeight:1.2}}>
                          {juzName}
                        </div>
                        <div style={{fontFamily:"'Amiri',serif",fontSize:11,color:isOpen?"#060A07":isFull?"#F0C040":hasPartial?"#F0C04070":"#5A7050",direction:"rtl",lineHeight:1.3}}>
                          {juzArabic}
                        </div>
                        {isFull&&<div style={{fontSize:9,color:isOpen?"#060A07":"#F0C040",marginTop:3,fontWeight:700}}>✓</div>}
                        {hasPartial&&!isFull&&<div style={{fontSize:7,color:"#F0C04070",marginTop:2}}>partial</div>}
                      </div>
                    );
                  })}
                </div>

                {/* Surah panel — shows when a Juz is tapped */}
                {openJuzPanel&&(()=>{
                  const surahs=JUZ_SURAHS[openJuzPanel]||[];
                  const allChecked=surahs.every(s=>juzStatus[`s${s.s}`]==="complete");
                  const totalAyahsInJuz=surahs.reduce((a,s)=>a+s.a,0);
                  return (
                    <div className="fi" style={{background:"#0D1008",border:"1px solid #F0C04040",borderRadius:10,padding:"12px",marginBottom:8}}>
                      {/* Panel header */}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <div style={{fontSize:11,fontWeight:700,color:"#F0C040"}}>Juz {openJuzPanel} — {JUZ_META.find(j=>j.num===openJuzPanel)?.roman}</div>
                        <div className="sbtn" onClick={()=>setOpenJuzPanel(null)} style={{fontSize:11,color:"#5A7050"}}>✕</div>
                      </div>
                      {/* Select All */}
                      <div className="sbtn" onClick={()=>{
                        const allKey=`j${openJuzPanel}`;
                        if(allChecked){
                          setJuzStatus(prev=>{
                            const n={...prev};
                            surahs.forEach(s=>delete n[`s${s.s}`]);
                            delete n[openJuzPanel];
                            return n;
                          });
                        } else {
                          setJuzStatus(prev=>{
                            const n={...prev};
                            surahs.forEach(s=>n[`s${s.s}`]="complete");
                            n[openJuzPanel]="complete";
                            return n;
                          });
                        }
                      }} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid #1E2A18",marginBottom:7,cursor:"pointer"}}>
                        <div style={{width:15,height:15,borderRadius:3,background:allChecked?"#20b2aa":"transparent",border:`1.5px solid ${allChecked?"#20b2aa":"#2E4030"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#060A07",fontWeight:700,flexShrink:0}}>{allChecked?"✓":""}</div>
                        <div style={{fontSize:11,color:"#A8B89A",fontWeight:500,flex:1}}>Select All Surahs</div>
                        <div style={{fontSize:8,color:"#5A7050"}}>{surahs.length} surahs · {totalAyahsInJuz} ayahs</div>
                      </div>
                      {/* Surah list — 2 per row */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                        {surahs.map(s=>{
                          const checked=juzStatus[`s${s.s}`]==="complete";
                          return (
                            <div key={s.s} className="sbtn" onClick={()=>{
                              setJuzStatus(prev=>{
                                const n={...prev,[`s${s.s}`]:checked?undefined:"complete"};
                                const allNowChecked=surahs.every(sr=>n[`s${sr.s}`]==="complete");
                                if(allNowChecked) n[openJuzPanel]="complete";
                                else delete n[openJuzPanel];
                                return n;
                              });
                            }} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 7px",borderRadius:6,background:checked?"#20b2aa15":"#141A0F",border:`1px solid ${checked?"#20b2aa40":"#1E2A18"}`,cursor:"pointer"}}>
                              <div style={{width:13,height:13,borderRadius:3,background:checked?"#20b2aa":"transparent",border:`1.5px solid ${checked?"#20b2aa":"#2E4030"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#060A07",fontWeight:700,flexShrink:0}}>{checked?"✓":""}</div>
                              <div style={{fontSize:9,color:checked?"#20b2aa":"#A8B89A",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                              <div style={{fontSize:7,color:"#2E4030",fontFamily:"'IBM Plex Mono',monospace",flexShrink:0}}>{s.a}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div style={{marginBottom:6,fontSize:8,color:"#2E4030",fontStyle:"italic",textAlign:"center"}}>Tap a Juz to select surahs · Gold = memorized</div>
                <div style={{display:"flex",gap:8}}>
                  <div className="sbtn" onClick={()=>setOnboardStep(3)} style={{padding:"14px 18px",background:"#0D1008",border:"1px solid #1E2A18",borderRadius:10,fontSize:14,color:"#5A7050"}}>←</div>
                  <div className="sbtn" onClick={()=>{
                    if(userName) localStorage.setItem("rihlat-username",userName);
                    localStorage.setItem("rihlat-onboarded","1");
                    setShowOnboarding(false);
                  }} style={{flex:1,padding:"14px",background:"#F0C040",borderRadius:10,fontSize:14,fontWeight:700,color:"#060A07",textAlign:"center"}}>
                    Continue →
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
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}} className="fi">

          {/* ── STICKY RECITER BUTTON ── */}
          <div style={{position:"sticky",top:0,zIndex:10,background:T.bg,paddingBottom:2}}>
            <div className="sbtn" onClick={()=>setShowReciterModal(true)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,margin:"0 0 0 0"}}>
              <div style={{fontSize:16}}>🎙️</div>
              <div style={{flex:1,textAlign:"center"}}>
                <div style={{fontSize:13,fontWeight:600,color:T.text,textAlign:"center"}}>{currentReciter.name}</div>
                <div style={{fontFamily:"'Amiri',serif",fontSize:12,color:T.dim,textAlign:"center"}}>{currentReciter.arabic}</div>
              </div>
              <div style={{fontSize:9,color:T.accent,background:T.accentDim,border:`1px solid ${T.accent}30`,padding:"3px 8px",borderRadius:8}}>Selected ✓</div>
              <div style={{fontSize:12,color:T.dim}}>▼</div>
            </div>
          </div>

          <div style={{flex:1,padding:"10px 16px 48px"}}>

            {/* ── SESSION SELECTOR ── */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:8,color:T.accent,letterSpacing:".18em",textTransform:"uppercase",marginBottom:7}}>Today's Sessions</div>
              <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}}>
                {SESSIONS.map(s=>{
                  const done=dailyChecks[s.id];
                  const isActive=activeSession===s.id;
                  return (
                    <div key={s.id} className="sbtn" onClick={()=>setActiveSession(s.id)} style={{flexShrink:0,padding:"7px 12px",borderRadius:20,background:isActive?T.accent:done?T.accentDim:T.surface,border:`1px solid ${isActive?T.accent:done?T.accent+"40":T.border}`,display:"flex",alignItems:"center",gap:5,transition:"all .15s"}}>
                      <span style={{fontSize:13}}>{s.icon}</span>
                      <div>
                        <div style={{fontSize:10,fontWeight:isActive?700:500,color:isActive?dark?"#060A07":"#fff":done?T.accent:T.dim,whiteSpace:"nowrap"}}>{s.time}</div>
                        {done&&!isActive&&<div style={{fontSize:7,color:T.accent}}>✓ done</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── SESSION INFO CARD ── */}
            {(()=>{
              const sess=SESSIONS.find(s=>s.id===activeSession);
              if(!sess) return null;
              return (
                <div style={{marginBottom:12,padding:"11px 14px",background:T.surface,border:`1px solid ${T.accent}25`,borderLeft:`3px solid ${T.accent}`,borderRadius:"0 8px 8px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{fontSize:12,fontWeight:700,color:T.text}}>{sess.icon} {sess.title}</div>
                    <div className="sbtn" onClick={()=>toggleCheck(sess.id)} style={{fontSize:9,padding:"3px 9px",background:dailyChecks[sess.id]?T.accent:T.surface2,border:`1px solid ${dailyChecks[sess.id]?T.accent:T.border}`,borderRadius:10,color:dailyChecks[sess.id]?dark?"#060A07":"#fff":T.dim,fontWeight:600}}>
                      {dailyChecks[sess.id]?"✓ Done":"Mark Done"}
                    </div>
                  </div>
                  <div style={{fontSize:11,color:T.sub,lineHeight:1.6}}>{sess.desc}</div>
                </div>
              );
            })()}

            {/* ── JUZ SELECTOR (tiles, no dropdown) ── */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:8,color:T.accent,letterSpacing:".18em",textTransform:"uppercase",marginBottom:7,display:"flex",justifyContent:"space-between"}}>
                <span>Session Juz</span>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",color:T.accent}}>Juz {sessionJuz} — {sessM?.roman}</span>
              </div>
              <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:4}}>
                {JUZ_META.slice().reverse().map(j=>{
                  const isSel=sessionJuz===j.num;
                  const isDone=juzStatus[j.num]==="complete";
                  return (
                    <div key={j.num} className="sbtn" onClick={()=>{setSessionJuz(j.num);setSessionIdx(0);setRepCounts({});setOpenAyah(null);}} style={{flexShrink:0,padding:"6px 10px",borderRadius:8,background:isSel?T.accent:isDone?T.accentDim:T.surface,border:`1px solid ${isSel?T.accent:isDone?T.accent+"40":T.border}`,textAlign:"center",minWidth:52,transition:"all .15s"}}>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:700,color:isSel?dark?"#060A07":"#fff":isDone?T.accent:T.dim}}>{j.num}</div>
                      <div style={{fontSize:8,color:isSel?dark?"#060A07":"#fff":isDone?T.accent:T.vdim,whiteSpace:"nowrap"}}>{j.roman?.split(" ")[0]}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── PROGRESS BAR ── */}
            <div style={{marginBottom:14,padding:"10px 14px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:11,color:T.sub}}>Juz {sessionJuz} Progress</span>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:T.accent}}>{sessionIdx}/{totalSV} ayahs</span>
              </div>
              <div style={{height:5,background:T.surface2,borderRadius:3,overflow:"hidden"}}>
                <div className="pbfill" style={{height:"100%",width:`${sessPct}%`,background:`linear-gradient(90deg,${T.accent}70,${T.accent})`,borderRadius:3}}/>
              </div>
              <div style={{fontSize:9,color:T.dim,marginTop:4}}>{dailyNew} ayahs/session · {Math.ceil((totalSV-sessionIdx)/Math.max(1,dailyNew))} sessions remaining</div>
            </div>

            {/* ── LOADING / ERROR STATES ── */}
            {sessLoading&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:40,gap:12}}><div className="spin" style={{width:26,height:26,border:`2px solid ${T.border}`,borderTopColor:"#F0C040",borderRadius:"50%"}}/><div style={{fontSize:12,color:T.dim}}>Loading ayahs...</div></div>}
            {!sessLoading&&sessionVerses.length===0&&(
              <div style={{textAlign:"center",padding:"30px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8}}>
                <div style={{fontSize:20,marginBottom:8}}>⚠️</div>
                <div style={{fontSize:13,color:T.sub,marginBottom:14}}>Ayahs did not load. Check your internet connection.</div>
                <div className="sbtn" onClick={()=>setSessionJuz(n=>n)} style={{display:"inline-block",padding:"8px 20px",background:T.accent,color:dark?"#060A07":"#fff",borderRadius:6,fontSize:12,fontWeight:600}}>Retry</div>
              </div>
            )}

            {/* ── AYAH BATCH ── */}
            {!sessLoading&&batch.length>0&&(
              <div>
                {/* Batch header */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:9,color:T.accent,letterSpacing:".18em",textTransform:"uppercase"}}>{sessionJuz===30?"Revision":"Fajr"} — Ayahs {bStart+1}–{bEnd} of {totalSV}</div>
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

                    return (
                      <div key={vKey} style={{background:T.surface,border:`1px solid ${repsDone?"#F0C04050":isOpen?T.accent+"40":T.border}`,borderRadius:10,overflow:"hidden",transition:"all .15s"}}>

                        {/* ── COLLAPSED ROW ── */}
                        <div className="sbtn" onClick={()=>setOpenAyah(isOpen?null:vKey)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px"}}>
                          {/* Ayah number */}
                          <div style={{width:28,height:28,borderRadius:"50%",background:repsDone?T.accent:T.surface2,border:`1px solid ${repsDone?T.accent:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:repsDone?dark?"#060A07":"#fff":T.dim,fontWeight:700,flexShrink:0}}>
                            {repsDone?"✓":i+1}
                          </div>
                          {/* Ayah ref */}
                          <div style={{flex:1}}>
                            <div style={{fontSize:10,color:T.sub,fontFamily:"'IBM Plex Mono',monospace"}}>{SURAH_EN[sNum]} · {vKey}</div>
                            <div style={{fontFamily:"'Amiri',serif",fontSize:15,color:T.text,direction:"rtl",lineHeight:1.8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:180}}>{v.text_uthmani}</div>
                          </div>
                          {/* Rep counter pill */}
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,fontWeight:700,color:repsDone?"#2ECC71":reps>0?T.accent:T.vdim}}>{reps}/20</div>
                            <div style={{display:"flex",gap:2}}>
                              {Array.from({length:5},(_,d)=>(
                                <div key={d} style={{width:6,height:4,borderRadius:1,background:reps>=((d+1)*4)?T.accent:T.border}}/>
                              ))}
                            </div>
                          </div>
                          {/* Chevron */}
                          <div style={{fontSize:11,color:T.vdim}}>{isOpen?"▾":"›"}</div>
                        </div>

                        {/* ── EXPANDED ROW ── */}
                        {isOpen&&(
                          <div style={{borderTop:`1px solid ${T.border}`,padding:"12px 14px"}}>
                            {/* Arabic text */}
                            <div style={{fontFamily:"'Amiri',serif",fontSize:`${fontSize}px`,color:T.text,direction:"rtl",textAlign:"right",lineHeight:2.2,marginBottom:10}}>
                              {v.text_uthmani}
                              <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"1.2em",height:"1.2em",borderRadius:"50%",border:`1px solid ${T.accent}35`,color:`${T.accent}70`,fontSize:"0.4em",fontFamily:"'IBM Plex Mono',monospace",margin:"0 5px",verticalAlign:"middle"}}>{vNum}</span>
                            </div>

                            {/* Translation */}
                            {showTrans&&(
                              <div style={{fontSize:12,color:T.sub,lineHeight:1.7,fontStyle:"italic",marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${T.border}`}}>
                                {trans===undefined?<span style={{color:T.vdim}}>Loading...</span>:trans||<span style={{color:T.vdim}}>Translation unavailable</span>}
                              </div>
                            )}

                            {/* Audio controls */}
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                              {/* Play/Pause */}
                              <div className="sbtn" onClick={()=>hasPerAyah(reciter)?playAyah(vKey,vKey):null} style={{width:36,height:36,borderRadius:"50%",background:isPlaying?T.accent:T.accentDim,border:`1px solid ${T.accent}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:isPlaying?dark?"#060A07":"#fff":T.accent,opacity:hasPerAyah(reciter)?1:0.4}}>
                                {isLoading?<div className="spin" style={{width:14,height:14,border:`2px solid ${T.accent}40`,borderTopColor:T.accent,borderRadius:"50%"}}/>:(isPlaying?"⏸":"▶")}
                              </div>
                              {/* Audio bar */}
                              <div style={{flex:1,height:3,background:T.surface2,borderRadius:2}}>
                                <div style={{height:"100%",width:isPlaying?"40%":"0%",background:T.accent,borderRadius:2,transition:"width .5s"}}/>
                              </div>
                              {/* Repeat */}
                              <div className="sbtn" onClick={()=>{setLooping(l=>{const next=!l;if(audioRef.current)audioRef.current.loop=next;return next;});}} style={{width:30,height:30,borderRadius:"50%",background:looping?T.accentDim:T.surface2,border:`1px solid ${looping?T.accent:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:T.dim}}>🔁</div>
                              {/* Restart */}
                              <div className="sbtn" onClick={()=>{if(audioRef.current){audioRef.current.pause();audioRef.current.currentTime=0;setPlayingKey(null);}}} style={{width:30,height:30,borderRadius:"50%",background:T.surface2,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:T.dim}}>↩</div>
                            </div>

                            {/* Rep counter tap button */}
                            <div className="sbtn" onClick={()=>setRepCounts(prev=>({...prev,[vKey]:Math.min(20,(prev[vKey]||0)+1)}))} style={{width:"100%",padding:"12px",background:repsDone?"#2ECC7120":T.accentDim,border:`1px solid ${repsDone?"#2ECC71":T.accent}`,borderRadius:8,textAlign:"center",transition:"all .15s"}}>
                              {repsDone?(
                                <div style={{fontSize:13,fontWeight:700,color:"#2ECC71"}}>✓ 20 Reps Complete — MashaAllah!</div>
                              ):(
                                <div>
                                  <div style={{fontSize:13,fontWeight:700,color:T.accent,marginBottom:2}}>Tap after each recitation · {reps}/20</div>
                                  <div style={{display:"flex",justifyContent:"center",gap:3}}>
                                    {Array.from({length:20},(_,d)=>(
                                      <div key={d} style={{width:8,height:8,borderRadius:2,background:d<reps?T.accent:T.border,transition:"background .1s"}}/>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Reset reps */}
                            {reps>0&&(
                              <div className="sbtn" onClick={()=>setRepCounts(prev=>({...prev,[vKey]:0}))} style={{textAlign:"center",fontSize:10,color:T.vdim,marginTop:8}}>Reset reps</div>
                            )}
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
                    <div style={{fontSize:12,color:T.sub,marginBottom:14}}>Check off Fajr in Today's Sessions above.</div>
                    <div className="sbtn" onClick={()=>{if(bEnd<totalSV){setSessionIdx(bEnd);setSessionDone(d=>d.filter(k=>k!==bKey));setRepCounts({});setOpenAyah(null);}}} style={{display:"inline-block",padding:"12px 28px",background:T.accent,borderRadius:8,fontSize:13,fontWeight:700,color:dark?"#060A07":"#fff"}}>
                      Next Batch →
                    </div>
                  </div>
                ):(
                  <div className="sbtn" onClick={()=>{setSessionDone(d=>[...d,bKey]);toggleCheck(activeSession);setRepCounts({});setOpenAyah(null);}} style={{width:"100%",padding:"14px",background:T.accent,borderRadius:10,fontSize:13,fontWeight:700,color:dark?"#060A07":"#fff",textAlign:"center"}}>
                    ✓ Complete Batch — Begin Dhuhr Revision
                  </div>
                )}
              </div>
            )}

            {/* ── JUZ COMPLETE ── */}
            {!sessLoading&&batch.length===0&&totalSV>0&&(
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
        const milestones=[{juz:0,label:"Juz 1",pct:0},{juz:10,label:"Juz 10",pct:33},{juz:20,label:"Juz 20",pct:67},{juz:30,label:"Juz 30",pct:100},{juz:31,label:"Hafiz 📖",pct:100}];
        // Show the first uncompleted session, or the last one if all done
        const activeSess=SESSIONS.find(s=>!dailyChecks[s.id])||SESSIONS[SESSIONS.length-1];
        const activeDone=!!dailyChecks[activeSess.id];
        const activeSteps=activeSess?.steps||[];

        // ── Shield badge SVG component ──
        const ShieldBadge=({icon,label,earned,c1,c2,glow})=>(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,opacity:earned?1:0.28,flex:1}}>
            <svg width={64} height={72} viewBox="0 0 64 72" style={{filter:earned?`drop-shadow(0 4px 12px ${glow}60)`:"none",transition:"filter .3s"}}>
              <defs>
                <linearGradient id={`sg${label.replace(/\s/g,"")}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={c1}/>
                  <stop offset="100%" stopColor={c2}/>
                </linearGradient>
                <linearGradient id={`sh${label.replace(/\s/g,"")}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={c1} stopOpacity="0.35"/>
                  <stop offset="100%" stopColor={c2} stopOpacity="0.08"/>
                </linearGradient>
              </defs>
              {/* Shield outer */}
              <path d="M32 2 L60 14 L60 36 Q60 56 32 70 Q4 56 4 36 L4 14 Z"
                fill={`url(#sg${label.replace(/\s/g,"")})`}/>
              {/* Shield inner highlight */}
              <path d="M32 8 L54 18 L54 36 Q54 52 32 64 Q10 52 10 36 L10 18 Z"
                fill={`url(#sh${label.replace(/\s/g,"")})`}/>
              {/* Top shine */}
              <path d="M32 8 L54 18 L54 26 Q43 22 32 20 Q21 22 10 26 L10 18 Z"
                fill="white" fillOpacity="0.12"/>
              {/* Icon */}
              <text x="32" y="42" textAnchor="middle" fontSize="22" dominantBaseline="middle">{icon}</text>
            </svg>
            <div style={{fontSize:10,fontWeight:700,color:earned?"#EDE8DC":"#5A6A70",textAlign:"center",letterSpacing:".02em",lineHeight:1.3}}>{label}</div>
          </div>
        );

        const badges=[
          {icon:"📗",label:`${completedCount||0} Juz`, earned:completedCount>0, c1:"#4ADE80",c2:"#14532D",glow:"#22C55E"},
          {icon:"🌙",label:"Habituated",               earned:streak>=14,        c1:"#818CF8",c2:"#312E81",glow:"#6366F1"},
          {icon:"🔥",label:"7 Day Streak",             earned:streak>=7,         c1:"#FB923C",c2:"#7C2D12",glow:"#F97316"},
          {icon:"📖",label:"Hifz Goal",                earned:goalYears>0,       c1:"#F0C040",c2:"#78400A",glow:"#F0C040"},
        ];

        return (
          // 9) Premium background
          <div style={{flex:1,overflowY:"auto",background:"radial-gradient(circle at top, rgba(32,44,90,0.35) 0%, rgba(8,12,24,1) 45%, rgba(4,7,15,1) 100%)"}} className="fi">

            {/* ── HERO BANNER ── */}
            <div style={{background:"linear-gradient(160deg,#0D2E18 0%,#1A4A28 50%,#0A1F10 100%)",padding:"20px 16px 24px",position:"relative",overflow:"hidden"}}>
              {/* 10) Sparkle overlay */}
              <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 12% 18%, rgba(240,192,64,0.10) 0, transparent 18%), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.06) 0, transparent 14%), radial-gradient(circle at 35% 72%, rgba(240,192,64,0.06) 0, transparent 16%)"}}/>
              <div style={{display:"flex",alignItems:"center",gap:14,position:"relative",zIndex:1}}>
                <div style={{width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,#1A4A28,#2E7D46)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"2px solid #F0C04060",boxShadow:"0 0 20px #F0C04025"}}>
                  <span style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#F0C040",textShadow:"0 0 10px rgba(240,192,64,0.15)"}}>{initials}</span>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:19,fontWeight:700,color:"#EDE8DC",fontFamily:"'Playfair Display',serif",marginBottom:2}}>{username}</div>
                  <div style={{fontSize:11,color:"#F0C040",marginBottom:8,letterSpacing:".06em",textShadow:"0 0 10px rgba(240,192,64,0.15)"}}>Memorizer · طالب الحفظ</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <div style={{fontSize:10,color:"#8AAA90",background:"#ffffff0A",padding:"3px 8px",borderRadius:20,border:"1px solid #ffffff15"}}>📅 Joined {joinYear}</div>
                    <div style={{fontSize:10,color:"#8AAA90",background:"#ffffff0A",padding:"3px 8px",borderRadius:20,border:"1px solid #ffffff15"}}>🎯 {goalLabel}</div>
                    <div style={{fontSize:10,color:"#F6A623",background:"#F6A62315",padding:"3px 8px",borderRadius:20,border:"1px solid #F6A62330"}}>🔥 {streak} day streak</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{padding:"12px 14px 48px"}}>

            {/* ── PROGRESS + DAILY GOALS ── */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              {/* 1) Ring card */}
              <div style={{background:"#0B1020",border:"1px solid rgba(240,192,64,0.18)",borderRadius:22,boxShadow:"0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.02) inset",padding:"14px 10px",display:"flex",flexDirection:"column",alignItems:"center"}}>
                {/* 7) Section title */}
                <div style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.88)",fontWeight:700,marginBottom:8}}>Overall Progress</div>
                <svg width={130} height={130} style={{overflow:"visible"}}>
                  <defs>
                    <linearGradient id="ringgrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#156A30"/>
                      <stop offset="100%" stopColor="#F0C040"/>
                    </linearGradient>
                    <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                  </defs>
                  <circle cx={65} cy={65} r={radius} fill="none" stroke="#1A2340" strokeWidth={12}/>
                  <circle cx={65} cy={65} r={radius} fill="none" stroke="url(#ringgrad)" strokeWidth={12}
                    strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
                    transform="rotate(-90 65 65)" filter="url(#glow)" style={{transition:"stroke-dasharray 1s ease"}}/>
                  {/* 8) Gold accent text */}
                  <text x={65} y={60} textAnchor="middle" fill="#F0C040" fontSize={22} fontWeight={700} fontFamily="'IBM Plex Mono',monospace">{pct}%</text>
                  <text x={65} y={78} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={10} fontFamily="'DM Sans',sans-serif">{completedCount} / 30 Juz</text>
                </svg>
              </div>

              {/* 1) Daily goals card */}
              <div style={{background:"#0B1020",border:"1px solid rgba(240,192,64,0.18)",borderRadius:22,boxShadow:"0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.02) inset",padding:"14px",display:"flex",flexDirection:"column"}}>
                <div style={{fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.88)",fontWeight:700,marginBottom:8}}>Daily Goals</div>
                <div style={{marginBottom:10}}>
                  {/* 8) Gold number */}
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:30,color:"#F0C040",fontWeight:700,lineHeight:1,textShadow:"0 0 10px rgba(240,192,64,0.15)"}}>{checkedCount}</span>
                  <span style={{fontSize:14,color:"rgba(255,255,255,0.45)"}}> / {SESSIONS.length}</span>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",marginTop:2}}>Sessions Today</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {SESSIONS.map(s=>{
                    const done=!!dailyChecks[s.id];
                    return (
                      <div key={s.id} className="sbtn" onClick={()=>toggleCheck(s.id)} style={{display:"flex",alignItems:"center",gap:7}}>
                        <div style={{width:13,height:13,borderRadius:"50%",background:done?s.color:"#131C34",border:done?`2px solid ${s.color}`:"1px solid rgba(255,255,255,0.08)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:done?`0 0 6px ${s.color}60`:"inset 0 0 0 1px rgba(255,255,255,0.02)",transition:"all .2s"}}>
                          {done&&<span style={{fontSize:7,color:"#fff",fontWeight:700}}>✓</span>}
                        </div>
                        <span style={{fontSize:10,color:done?s.color:"rgba(255,255,255,0.55)",fontWeight:done?600:400,transition:"color .2s"}}>{s.icon} {s.time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── JOURNEY TIMELINE ── */}
            {/* 1) Card depth */}
            <div style={{background:"#0B1020",border:"1px solid rgba(240,192,64,0.18)",borderRadius:22,boxShadow:"0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.02) inset",padding:"18px 16px 22px",marginBottom:12,position:"relative",overflow:"hidden"}}>
              {/* 10) Sparkle */}
              <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 12% 18%, rgba(240,192,64,0.10) 0, transparent 18%), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.06) 0, transparent 14%), radial-gradient(circle at 35% 72%, rgba(240,192,64,0.06) 0, transparent 16%)"}}/>
              {/* 7) Section title */}
              <div style={{fontSize:14,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.88)",fontWeight:700,marginBottom:20,position:"relative",zIndex:1}}>Hifz Journey</div>
              <div style={{position:"relative",height:64,zIndex:1}}>
                {/* 3) Unfilled rail */}
                <div style={{position:"absolute",top:22,left:"4%",right:"10%",height:4,borderRadius:999,background:"#1A2340"}}/>
                {/* 3) Progress line */}
                <div style={{position:"absolute",top:22,left:"4%",width:`${Math.max(0,Math.min(86,(completedCount/30)*86))}%`,height:4,borderRadius:999,background:"linear-gradient(90deg, rgba(240,192,64,0.95) 0%, rgba(240,192,64,0.78) 100%)",boxShadow:"0 0 12px rgba(240,192,64,0.28)",transition:"width 1s ease"}}/>
                {/* Milestones */}
                {[{juz:0,label:"Juz 1",pos:4},{juz:10,label:"Juz 10",pos:32},{juz:20,label:"Juz 20",pos:60},{juz:30,label:"Juz 30",pos:90}].map((m,i)=>{
                  const reached=completedCount>m.juz;
                  const isCurrent=completedCount===m.juz&&m.juz>0;
                  return (
                    <div key={i} style={{position:"absolute",top:9,left:`${m.pos}%`,transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                      {/* 2) Active / inactive node */}
                      {isCurrent ? (
                        <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(180deg,#FFD76A 0%, #F0C040 100%)",boxShadow:"0 0 0 4px rgba(240,192,64,0.12), 0 0 18px rgba(240,192,64,0.45)",border:"1px solid rgba(255,231,160,0.75)"}}/>
                      ) : reached ? (
                        <div style={{width:18,height:18,borderRadius:"50%",background:"linear-gradient(180deg,#F0C040,#B8920A)",boxShadow:"0 0 8px rgba(240,192,64,0.35)",border:"1px solid rgba(255,231,160,0.5)"}}/>
                      ) : (
                        <div style={{width:18,height:18,borderRadius:"50%",background:"#131C34",border:"1px solid rgba(255,255,255,0.08)",boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.02)"}}/>
                      )}
                      <div style={{fontSize:8,color:reached||isCurrent?"#F0C040":"rgba(255,255,255,0.28)",whiteSpace:"nowrap",fontWeight:reached||isCurrent?700:400}}>{m.label}</div>
                    </div>
                  );
                })}
                {/* Hafiz endpoint */}
                <div style={{position:"absolute",top:4,right:"0%",transform:"translateX(40%)",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{fontSize:22}}>📖</div>
                  <div style={{fontSize:8,color:"rgba(240,192,64,0.7)",fontWeight:700}}>Hafiz</div>
                </div>
                {/* Current position label */}
                {completedCount>0&&<div style={{position:"absolute",top:0,left:`${4+Math.min(86,(completedCount/30)*86)}%`,transform:"translateX(-50%)",background:"#F0C040",color:"#080C18",fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:5,fontFamily:"'IBM Plex Mono',monospace",whiteSpace:"nowrap",boxShadow:"0 0 12px rgba(240,192,64,0.45)"}}>{completedCount}</div>}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6,position:"relative",zIndex:1}}>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>Goal: {goalYears}-Year Plan</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>{timeline.juzLeft} Juz remaining</div>
              </div>
            </div>

            {/* ── ACTIVE SESSION CHECKLIST ── */}
            {/* 1) Card depth */}
            <div style={{background:"#0B1020",border:"1px solid rgba(240,192,64,0.18)",borderRadius:22,boxShadow:"0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.02) inset",padding:"16px",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                {/* 7) Section title — dynamic session */}
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{activeSess.icon}</span>
                  <div>
                    <div style={{fontSize:13,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(255,255,255,0.88)",fontWeight:700}}>{activeSess.time}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:1}}>{activeSess.title}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {/* Session progress pills */}
                  <div style={{display:"flex",gap:3}}>
                    {SESSIONS.map(s=>(
                      <div key={s.id} style={{width:6,height:6,borderRadius:"50%",background:dailyChecks[s.id]?s.color:"rgba(255,255,255,0.12)",transition:"background .3s"}}/>
                    ))}
                  </div>
                  <div className="sbtn" onClick={()=>toggleCheck(activeSess.id)} style={{fontSize:9,padding:"4px 12px",background:activeDone?"#F0C040":"#11192F",border:activeDone?"1px solid rgba(240,192,64,0.55)":"1px solid rgba(255,255,255,0.08)",borderRadius:20,color:activeDone?"#080C18":"rgba(255,255,255,0.5)",fontWeight:700,boxShadow:activeDone?"0 0 12px rgba(240,192,64,0.22)":"none",transition:"all .2s"}}>
                    {activeDone?"✓ Done":"Mark Done"}
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5}}>
                  <span>{checkedCount} / {SESSIONS.length} sessions complete</span>
                  {/* 8) Gold accent */}
                  {activeSess.id==="fajr"&&<span style={{color:"#F0C040",fontWeight:600,textShadow:"0 0 10px rgba(240,192,64,0.15)"}}>{dailyNew} ayahs today</span>}
                </div>
                <div style={{height:7,background:"#1A2340",borderRadius:999,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${Math.round((checkedCount/SESSIONS.length)*100)}%`,background:"linear-gradient(90deg, rgba(240,192,64,0.95) 0%, rgba(240,192,64,0.78) 100%)",borderRadius:999,boxShadow:"0 0 12px rgba(240,192,64,0.28)",transition:"width .5s"}}/>
                </div>
              </div>

              {/* All done state */}
              {allChecked?(
                <div style={{textAlign:"center",padding:"12px 0"}}>
                  <div style={{fontSize:22,marginBottom:6}}>🌙</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#F0C040",textShadow:"0 0 10px rgba(240,192,64,0.15)",marginBottom:4}}>All Sessions Complete — MashaAllah!</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>May Allah accept your worship today.</div>
                </div>
              ):(
                /* 4) Checklist rows */
                activeSteps.map((step,i)=>{
                  const stepDone=activeDone;
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 0",borderBottom:i<activeSteps.length-1?"1px solid rgba(255,255,255,0.07)":"none"}}>
                      {/* 5) Checkbox */}
                      {stepDone ? (
                        <div style={{width:26,height:26,borderRadius:8,background:"linear-gradient(180deg,#2B2130 0%, #1A1620 100%)",border:"1px solid rgba(240,192,64,0.55)",boxShadow:"0 0 12px rgba(240,192,64,0.22), inset 0 0 0 1px rgba(255,255,255,0.03)",color:"#F0C040",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,flexShrink:0,fontSize:13}}>✓</div>
                      ) : (
                        <div style={{width:26,height:26,borderRadius:8,background:"#11192F",border:"1px solid rgba(255,255,255,0.08)",boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.02)",flexShrink:0}}/>
                      )}
                      {/* 4) Text styles */}
                      <span style={stepDone?{color:"#F5E7B8",fontWeight:500,fontSize:12,textDecoration:"line-through",opacity:.6}:{color:"rgba(255,255,255,0.92)",fontSize:12}}>{step}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── BADGES ── */}
            {/* 1) Card depth */}
            <div style={{background:"#0B1020",border:"1px solid rgba(240,192,64,0.18)",borderRadius:22,boxShadow:"0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.02) inset",padding:"18px 14px",marginBottom:12,position:"relative",overflow:"hidden"}}>
              {/* 10) Sparkle */}
              <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 12% 18%, rgba(240,192,64,0.10) 0, transparent 18%), radial-gradient(circle at 78% 22%, rgba(255,255,255,0.06) 0, transparent 14%), radial-gradient(circle at 35% 72%, rgba(240,192,64,0.06) 0, transparent 16%)"}}/>
              {/* 7) Section title */}
              <div style={{fontSize:14,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.88)",fontWeight:700,marginBottom:18,position:"relative",zIndex:1}}>Badges Earned</div>
              <div style={{display:"flex",justifyContent:"space-around",gap:4,position:"relative",zIndex:1}}>
                {badges.map((b,i)=>(
                  <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,flex:1}}>
                    {/* 6) Badge card */}
                    <div style={b.earned?{background:"linear-gradient(180deg,#17131F 0%, #0E0C14 100%)",border:"2px solid rgba(240,192,64,0.75)",borderRadius:18,boxShadow:"0 0 20px rgba(240,192,64,0.28), inset 0 0 18px rgba(240,192,64,0.05)",width:64,height:72,display:"flex",alignItems:"center",justifyContent:"center"}:{background:"#10182C",border:"1px solid rgba(255,255,255,0.06)",borderRadius:18,opacity:0.55,width:64,height:72,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <ShieldBadge icon={b.icon} label="" earned={b.earned} c1={b.c1} c2={b.c2} glow={b.glow}/>
                    </div>
                    <div style={{fontSize:9,fontWeight:700,color:b.earned?"rgba(255,255,255,0.88)":"rgba(255,255,255,0.28)",textAlign:"center",letterSpacing:".02em",lineHeight:1.3}}>{b.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── NAV BUTTONS ── */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div className="sbtn" onClick={()=>setRihlahTab("juz")} style={{padding:"16px",background:"linear-gradient(135deg,#0D2E18,#1A4A28)",border:"1px solid rgba(240,192,64,0.18)",borderRadius:18,textAlign:"center",boxShadow:"0 10px 30px rgba(0,0,0,0.35)"}}>
                <div style={{fontSize:24,marginBottom:4}}>📖</div>
                <div style={{fontSize:13,fontWeight:700,color:"#EDE8DC"}}>My Juz</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:2}}>Track memorization</div>
              </div>
              <div className="sbtn" onClick={()=>setRihlahTab("timeline")} style={{padding:"16px",background:"#0B1020",border:"1px solid rgba(240,192,64,0.18)",borderRadius:18,textAlign:"center",boxShadow:"0 10px 30px rgba(0,0,0,0.35)"}}>
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
              <div className="sbtn" onClick={()=>setShowReciterModal(true)} style={{padding:"5px 10px",background:T.surface2,border:`1px solid ${T.accent}40`,borderRadius:6,fontSize:10,color:T.accent,display:"flex",alignItems:"center",gap:5}}>
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
        Currently playing: <span style={{color:"#1A2A35",fontWeight:600}}>{currentReciter.name}</span>
      </div>

      {/* ── Reciter list ── */}
      <div style={{overflowY:"auto",padding:"0 14px 32px"}}>

        {/* Masjid Al-Haram */}
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 4px 8px"}}>
          <span style={{fontSize:13}}>🕋</span>
          <span style={{fontSize:11,fontWeight:700,color:"#4A3A2A",letterSpacing:".06em"}}>Masjid Al-Haram</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:1,borderRadius:12,overflow:"hidden",border:"1px solid #DDD4C0",marginBottom:16}}>
          {RECITERS.filter(r=>r.tag==="Masjid Al-Haram").map((r,i,arr)=>{
            const isSelected=reciter===r.id;
            return (
              <div key={r.id} className="sbtn" onClick={()=>{setReciter(r.id);setShowReciterModal(false);}}
                style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:isSelected?"#FFF8E8":"#FFFFFF",borderBottom:i<arr.length-1?"1px solid #EDE8DC":"none",transition:"background .1s"}}>
                {/* Speaker icon */}
                <div style={{width:32,height:32,borderRadius:"50%",background:"#EEE8D8",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14}}>🔊</div>
                {/* Name + style */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:isSelected?700:500,color:"#1A2A35"}}>{r.name}</div>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:r.dot,flexShrink:0}}/>
                    <div style={{fontSize:11,color:"#7A8A9A"}}>{r.style}</div>
                  </div>
                </div>
                {/* Checkmark */}
                {isSelected&&<div style={{fontSize:16,color:"#C9A84C",fontWeight:700,flexShrink:0}}>✓</div>}
                {/* Info button */}
                <div style={{width:24,height:24,borderRadius:"50%",border:"1.5px solid #CCC4B0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#9A9A88",flexShrink:0,fontWeight:700}}>i</div>
              </div>
            );
          })}
        </div>

        {/* Masjid An-Nabawi */}
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 4px 8px"}}>
          <span style={{fontSize:13}}>🕌</span>
          <span style={{fontSize:11,fontWeight:700,color:"#4A3A2A",letterSpacing:".06em"}}>Masjid An-Nabawi</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:1,borderRadius:12,overflow:"hidden",border:"1px solid #DDD4C0"}}>
          {RECITERS.filter(r=>r.tag==="Masjid An-Nabawi").map((r,i,arr)=>{
            const isSelected=reciter===r.id;
            return (
              <div key={r.id} className="sbtn" onClick={()=>{setReciter(r.id);setShowReciterModal(false);}}
                style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:isSelected?"#FFF8E8":"#FFFFFF",borderBottom:i<arr.length-1?"1px solid #EDE8DC":"none",transition:"background .1s"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"#EEE8D8",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14}}>🔊</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:isSelected?700:500,color:"#1A2A35"}}>{r.name}</div>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:r.dot,flexShrink:0}}/>
                    <div style={{fontSize:11,color:"#7A8A9A"}}>{r.style}</div>
                  </div>
                </div>
                {isSelected&&<div style={{fontSize:16,color:"#C9A84C",fontWeight:700,flexShrink:0}}>✓</div>}
                <div style={{width:24,height:24,borderRadius:"50%",border:"1.5px solid #CCC4B0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#9A9A88",flexShrink:0,fontWeight:700}}>i</div>
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
