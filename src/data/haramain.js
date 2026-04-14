// ── LIVE STREAMS DATA ─────────────────────────────────────────────────────────
// Source: haramain.info sidebar — official Saudi Broadcasting Authority streams
export const LIVE_STREAMS = [
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

export const RAMADAN_NIGHTS_MAKKAH = Array.from({length:30},(_,i)=>{
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

export const RAMADAN_NIGHTS_MADINAH = Array.from({length:30},(_,i)=>{
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
export const MAKKAH_IMAMS = [
  // ── Current Imams ──
  { id:"sudais2",   name:"Abdul Rahman As-Sudais", arabic:"عبدالرحمن السديس",  quranicaudio:"abdurrahmaan_as-sudays",          surahCount:114, note:"Full Quran (114 surahs)", status:"current", role:"Chief Imam" },
  { id:"muaiqly2",  name:"Maher Al-Muaiqly",       arabic:"ماهر المعيقلي",     mp3quran:"https://server12.mp3quran.net/maher",  surahCount:114, note:"Full Quran (114 surahs)", status:"current" },
  { id:"juhany2",   name:"Abdullah Al-Juhany",      arabic:"عبدالله الجهني",    quranicaudio:"abdullaah_3awwaad_al-juhaynee",   surahCount:114, note:"Full Quran (114 surahs)", status:"current" },
  { id:"baleela",   name:"Bandar Baleela",          arabic:"بندر بليلة",        quranicaudio:"bandar_baleela/complete",         surahCount:114, note:"Full Quran (114 surahs)", status:"current" },
  { id:"dossary2",  name:"Yasser Al-Dosari",        arabic:"ياسر الدوسري",      quranicaudio:"yasser_ad-dussary",               surahCount:114, note:"Full Quran (114 surahs)", status:"current" },
  { id:"humaid",    name:"Saleh Bin Humaid",        arabic:"صالح بن حميد",      archive:null,                                   surahCount:null, note:"Prayer recordings — no full Quran archive", status:"current" },
  { id:"khayat",    name:"Usama Khayat",            arabic:"أسامة خياط",        quranicaudio:"khayat",                          surahCount:114, note:"Full Quran (114 surahs)", status:"current" },
  { id:"turki",     name:"Badr Al-Turki",           arabic:"بدر التركي",        quranicaudio:"badr_al_turki/mp3",               surahCount:114, note:"Full Quran (114 surahs)", status:"current" },
  { id:"shamsan",   name:"Waleed Al-Shamsan",       arabic:"وليد الشمسان",      archive:null,                                   surahCount:null, note:"Prayer recordings — no full Quran archive", status:"current" },
  // ── Former Imams ──
  { id:"shuraim2",  name:"Saud Ash-Shuraim",       arabic:"سعود الشريم",       quranicaudio:"sa3ood_al-shuraym",               surahCount:114, note:"Full Quran (114 surahs)", status:"former", retired:"Retired 2022" },
  { id:"ghamdi",    name:"Khalid Al-Ghamdi",        arabic:"خالد الغامدي",      quranicaudio:"khalid_alghamdi",                 surahCount:21, availableSurahs:[9,14,25,32,39,42,58,59,60,61,62,66,68,69,76,85,88,90,91,93,95], note:"Partial — 21 of 114 surahs", status:"former", retired:"Retired 2018" },
  { id:"salehtaleb",name:"Saleh Al-Taleb",          arabic:"صالح آل طالب",      quranicaudio:"saleh_al_taleb",                  surahCount:32, availableSurahs:[1,25,34,38,39,44,45,46,47,55,56,57,58,59,60,61,70,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86], note:"Partial — 32 of 114 surahs", status:"former", retired:"Retired 2018" },
  { id:"kalbani",   name:"Adel Kalbani",            arabic:"عادل الكلباني",     quranicaudio:"adel_kalbani",                    surahCount:114, note:"Full Quran (114 surahs)", status:"former", retired:"Guest Imam · Taraweeh 2008" },
];
export const MADINAH_IMAMS = [
  // ── Current Imams ──
  { id:"hudhaify2", name:"Ali Al-Hudhaify",         arabic:"علي الحذيفي",       quranicaudio:"huthayfi",                        surahCount:114, note:"Full Quran (114 surahs)", status:"current", role:"Chief Imam" },
  { id:"budair2",   name:"Salah Al-Budair",         arabic:"صلاح البدير",       quranicaudio:"salahbudair",                     surahCount:114, note:"Full Quran (114 surahs)", status:"current" },
  { id:"qasim2",    name:"Abdul Muhsin Al-Qasim",   arabic:"عبدالمحسن القاسم",  quranicaudio:"abdul_muhsin_alqasim",            surahCount:114, note:"Full Quran (114 surahs)", status:"current" },
  { id:"thubaity",  name:"Abdul Bari Ath-Thubaity", arabic:"عبدالباري الثبيتي", quranicaudio:"thubaity",                        surahCount:114, note:"Full Quran (114 surahs)", status:"current" },
  { id:"muhanna",   name:"Khalid Al-Muhanna",       arabic:"خالد المهنا",       archive:"HaramainMuhanna",                      surahCount:114, note:"Full Quran (114 surahs)", status:"current" },
  { id:"qarafi2",   name:"Abdullah Al-Qarafi",      arabic:"عبدالله القرافي",   archive:"HaramainQuraafi",                      surahCount:61, availableSurahs:[1,2,3,7,9,12,16,18,19,20,21,22,26,30,36,38,39,44,46,49,50,51,52,53,54,55,56,57,64,66,67,70,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114], note:"Partial — 61 of 114 surahs", status:"current" },
  { id:"buayjaan",  name:"Abdullah Al-Bu'ayjan",      arabic:"عبدالله البعيجان",  archive:"HaramainBuayjaan",                     surahCount:82, availableSurahs:[1,8,10,11,12,13,14,15,17,18,19,20,21,22,23,24,25,26,28,29,30,32,33,34,35,39,40,41,42,43,48,49,50,55,56,57,60,62,63,64,65,66,67,68,69,73,75,76,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,97,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114], note:"Partial — 82 of 114 surahs", status:"current" },
  { id:"imadhafez", name:"Imad Zuhair Hafez",       arabic:"عماد زهير حافظ",    quranicaudio:"imad_zuhair_hafez",               surahCount:114, note:"Full Quran (114 surahs)", status:"current" },
  { id:"ahmadhudhayfi",name:"Ahmad Al-Hudhaify",    arabic:"أحمد الحذيفي",      quranicaudio:"ahmad_alhuthayfi",                surahCount:69, availableSurahs:[1,14,15,17,18,19,21,22,23,26,27,29,32,35,38,44,45,49,50,51,55,56,57,62,63,64,65,66,69,72,73,74,75,76,77,78,81,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114], note:"Partial — 69 of 114 surahs (verified)", status:"current" },
  // ── Former Imams (rahimahullah / retired) ──
  { id:"alijaber",  name:"Ali Jaber",               arabic:"علي جابر",          quranicaudio:"ali_jaber",                       surahCount:114, note:"Full Quran (114 surahs)", status:"former", deceased:"1932–2005 · rahimahullah" },
  { id:"ayyoub2",   name:"Muhammad Ayyoub",         arabic:"محمد أيوب",         archive:"HaramainAyub",                         surahCount:114, note:"Full Quran (114 surahs)", status:"former", deceased:"1952–2016 · rahimahullah" },
  { id:"alakhdar",  name:"Ibrahim Al-Akhdar",       arabic:"إبراهيم الأخضر",    quranicaudio:"ibrahim_al_akhdar",               surahCount:114, note:"Full Quran (114 surahs)", status:"former", retired:"Former Imam · appointed 1986" },
];

export const HARAMAIN_SURAHS = [
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
