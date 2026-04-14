// ── SESSIONS ──────────────────────────────────────────────────────────────────
export const SESSIONS = [
  { id:"fajr",    time:"Fajr",    arabic:"الفجر",  icon:"🌅", color:"#F0C040",
    title:"New Memorization",
    desc:"Your peak retention window. Memorize new ayahs right after salah while the mind is completely fresh.",
    steps:["Repeat each ayah 20 times until it feels natural","Do not proceed until you have perfected the previous ayah","Memorize every day — missing days weakens ambition"] },
  { id:"dhuhr",   time:"Dhuhr",   arabic:"الظهر",  icon:"☀️", color:"#F6A623",
    title:"5-Day Review",
    desc:"Review what you memorized over the last 5 days. The Sheikh says: review the previous five days before starting anything new.",
    steps:["Review what you memorized the previous five days","It escapes from hearts faster than the camel from its rope","Do not become sad if you lose memorization — this is the assembly stage"] },
  { id:"asr",     time:"Asr",     arabic:"العصر",  icon:"🌤️", color:"#4ECDC4",
    title:"Progressive Revision",
    desc:"Your revision scales as you progress — every juz touched every 10 days.",
    steps:["Persistence in revision is a great foundation — Ibn al-Jawzi","Cycle through completed sections consistently","Allah elevates a people by way of this book"] },
  { id:"maghrib", time:"Maghrib", arabic:"المغرب", icon:"🌆", color:"#B794F4",
    title:"Listening",
    desc:"Follow along with your chosen reciter. Your ear reinforces what your tongue is learning.",
    steps:["Listen to the reciter and follow along carefully","When the Qur'an is recited, listen and be silent — Al-A'raf 7:204","The character of the Prophet was the Qur'an"] },
  { id:"isha",    time:"Isha",    arabic:"العشاء", icon:"🌙", color:"#68D391",
    title:"Full Day Review",
    desc:"Recite everything from today before sleep. Sleep consolidates what you review right before it.",
    steps:["Recite everything one final time before sleep","Memorization does not solidify except by way of revision","It is a treasure that is not given to just anyone"] },
];

// ── SESSION WISDOM — from "The Easiest Way to Memorize the Noble Qur'an" by Sheikh Abdul Muhsin Al-Qasim ──
export const SESSION_WISDOM = {
  fajr:[
    {type:"book", text:"The foundation of memorization is repetition — the more the person repeats, the more proficient the memorization becomes."},
    {type:"book", text:"Do not proceed to memorize a new page until you have perfected the previous one without error or hesitation."},
    {type:"hadith", text:"The best of people are those who learn the Qur'an and teach it.", src:"Bukhari 5027"},
    {type:"hadith", text:"Whoever recites a letter from Allah's Book will receive one hasanah, and each hasanah is multiplied by ten times fold.", src:"At-Tirmidhi 2910"},
    {type:"book", text:"It is a treasure that is not given to just anyone."},
    {type:"book", text:"Memorize every day; missing days weakens a person's ambition and memorization."},
    {type:"quran", text:"And We have indeed made the Qur'an easy to understand and remember; then is there any one who will remember?", arabic:"وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ", ref:"Al-Qamar 54:17"},
    {type:"quran", text:"And recite the Qur'an (aloud) in a slow, (pleasant tone and) style.", arabic:"وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا", ref:"Al-Muzzammil 73:4"},
  ],
  dhuhr:[
    {type:"book", text:"Before starting a new lesson, review what you memorized the previous five days."},
    {type:"book", text:"Everyone who memorizes the Qur'an will lose some within the first two years. This is the assembly stage. Do not become sad."},
    {type:"book", text:"The devil plays a part in it to discourage you. So leave his whispers behind you and continue."},
    {type:"book", text:"He who memorizes quickly, forgets quickly."},
    {type:"hadith", text:"Review the Qur'an, for verily it escapes from the hearts of men faster than the camel from its rope.", src:"Bukhari 5032"},
    {type:"quran", text:"Those to whom We gave the Book recite it as it should be recited, they are the ones who believe therein.", arabic:"الَّذِينَ آتَيْنَاهُمُ الْكِتَابَ يَتْلُونَهُ حَقَّ تِلَاوَتِهِ أُولَٰئِكَ يُؤْمِنُونَ بِهِ", ref:"Al-Baqarah 2:121"},
    {type:"quran", text:"Verily, We, it is We Who have sent down the Dhikr and surely, We will guard it.", arabic:"إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ", ref:"Al-Hijr 15:9"},
  ],
  asr:[
    {type:"book", text:"Persistence in revision is a great foundation, for how many have abandoned revising that which they memorized.", attr:"Ibn al-Jawzi"},
    {type:"hadith", text:"Verily, Allah elevates a people by way of this book and lowers others by way of it.", src:"Muslim 817"},
    {type:"hadith", text:"Whoever gathers the Qur'an has been entrusted with a great affair. The Prophethood has been piled up within him.", attr:"Abdullah ibn Amr"},
    {type:"book", text:"Your revision grows with your progress — this is by design. The more you memorize, the more you protect."},
    {type:"book", text:"Old age does not prevent one from memorizing the Qur'an. Abu Bakr memorized at 61, Abu Abdullah ibn Umar at 80."},
    {type:"hadith", text:"He who does not memorize anything in his heart of the Qur'an is like a destroyed house.", src:"At-Tirmidhi 2913"},
    {type:"quran", text:"The clear Ayat are preserved in the breasts of those who have been given knowledge.", arabic:"بَلْ هُوَ آيَاتٌ بَيِّنَاتٌ فِي صُدُورِ الَّذِينَ أُوتُوا الْعِلْمَ", ref:"Al-'Ankabut 29:49"},
    {type:"quran", text:"Verily, this Qur'an guides to that which is most just and right.", arabic:"إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ", ref:"Al-Isra 17:9"},
  ],
  maghrib:[
    {type:"hadith", text:"Read the Qur'an, for it will come as an intercession for its companions on the Day of Resurrection.", src:"Muslim 804"},
    {type:"hadith", text:"The character of Allah's Prophet was the Qur'an.", src:"Muslim 746"},
    {type:"hadith", text:"The one who is proficient in the Qur'an will be with the honorable and obedient Angels.", src:"Bukhari 4937"},
    {type:"hadith", text:"No group come together reciting Allah's Book except that tranquility descends upon them, mercy encompasses them, and the angels surround them.", src:"Muslim 2699"},
    {type:"quran", text:"When the Qur'an is recited, listen to it, and be silent that you may receive mercy.", arabic:"وَإِذَا قُرِئَ الْقُرْآنُ فَاسْتَمِعُوا لَهُ وَأَنصِتُوا لَعَلَّكُمْ تُرْحَمُونَ", ref:"Al-A'raf 7:204"},
    {type:"quran", text:"The skins of those who fear their Lord shiver from it. Then their skin and their heart soften to the remembrance of Allah.", arabic:"تَقْشَعِرُّ مِنْهُ جُلُودُ الَّذِينَ يَخْشَوْنَ رَبَّهُمْ ثُمَّ تَلِينُ جُلُودُهُمْ وَقُلُوبُهُمْ إِلَىٰ ذِكْرِ اللَّهِ", ref:"Az-Zumar 39:23"},
  ],
  isha:[
    {type:"hadith", text:"The companion of the Qur'an will be told: 'Read and ascend in ranks. Your rank will be at the last verse you read.'", src:"At-Tirmidhi 2914"},
    {type:"hadith", text:"The people of the Qur'an are the people of Allah and His specific servants.", src:"Ahmad 12292"},
    {type:"hadith", text:"It is not befitting for the one who possesses the Qur'an to become extremely angry, while he is the bearer of the Speech of Allah.", attr:"Abdullah ibn Amr"},
    {type:"book", text:"The superiority of Allah's Speech over the speech of the Creation is like the superiority of the Creator over the Creation."},
    {type:"book", text:"Memorization does not solidify except by way of revision.", attr:"Ibn al-Jawzi"},
    {type:"quran", text:"O mankind! There has come to you a good advice from your Lord, and a healing for that which is in your breasts — a guidance and a mercy for the believers.", arabic:"يَا أَيُّهَا النَّاسُ قَدْ جَاءَتْكُم مَّوْعِظَةٌ مِّن رَّبِّكُمْ وَشِفَاءٌ لِّمَا فِي الصُّدُورِ وَهُدًى وَرَحْمَةٌ لِّلْمُؤْمِنِينَ", ref:"Yunus 10:57"},
    {type:"quran", text:"We have not sent down the Qur'an unto you to cause you distress.", arabic:"مَا أَنزَلْنَا عَلَيْكَ الْقُرْآنَ لِتَشْقَىٰ", ref:"Ta-Ha 20:2"},
  ],
};
// Get today's wisdom for a session — rotates daily through the pool
export function getSessionWisdom(sessionId,offset=0){
  const pool=SESSION_WISDOM[sessionId]; if(!pool||!pool.length) return null;
  const day=Math.floor(Date.now()/86400000);
  return pool[(day+offset)%pool.length];
}
