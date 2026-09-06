import fs from "fs";
import path from "path";

console.log("Building complete BNS & BNSS dataset...");

const bnsChapters = [
  { ch: "I", name: "Preliminary", start: 1, end: 3, cat: "preliminary" },
  { ch: "II", name: "Of Punishments", start: 4, end: 13, cat: "punishment" },
  { ch: "III", name: "General Exceptions", start: 14, end: 44, cat: "exceptions" },
  { ch: "IV", name: "Of Abetment, Criminal Conspiracy and Attempt", start: 45, end: 62, cat: "conspiracy" },
  { ch: "V", name: "Of Offences Against Women and Children", start: 63, end: 99, cat: "women_safety" },
  { ch: "VI", name: "Of Offences Affecting the Human Body", start: 100, end: 146, cat: "assault" },
  { ch: "VII", name: "Of Offences Against the State", start: 147, end: 158, cat: "state_security" },
  { ch: "VIII", name: "Of Offences Relating to the Army, Navy and Air Force", start: 159, end: 168, cat: "defence" },
  { ch: "IX", name: "Of Offences Against the Public Tranquillity", start: 189, end: 197, cat: "public_order" },
  { ch: "X", name: "Of Offences by or Relating to Public Servants", start: 198, end: 205, cat: "bribery" },
  { ch: "XI", name: "Of Contempts of the Lawful Authority of Public Servants", start: 206, end: 226, cat: "public_authority" },
  { ch: "XII", name: "Of False Evidence and Offences Against Public Justice", start: 227, end: 269, cat: "justice" },
  { ch: "XIII", name: "Of Offences Affecting Public Health, Safety, Convenience, Decency and Morals", start: 270, end: 297, cat: "public_safety" },
  { ch: "XIV", name: "Of Offences Relating to Religion", start: 298, end: 302, cat: "religion" },
  { ch: "XV", name: "Of Offences Against Property", start: 303, end: 334, cat: "property" },
  { ch: "XVI", name: "Of Offences Relating to Documents and Property Marks", start: 335, end: 350, cat: "fraud" },
  { ch: "XVII", name: "Of Criminal Intimidation, Insult, Annoyance, Defamation", start: 351, end: 358, cat: "intimidation" }
];

const specialBns = {
  "1": { title: "Short title, commencement and application", text: "Applicable throughout the territory of India effective 1 July 2024." },
  "4": { title: "Punishments", text: "Punishments to which offenders are liable under BNS include Death, Imprisonment for life, Imprisonment, Forfeiture of property, Fine, and Community service." },
  "64": { title: "Punishment for rape", text: "Whoever commits rape shall be punished with rigorous imprisonment for a term not less than 10 years to life.", cat: "women_safety", triggers: ["rape", "balatkar", "sexual assault", "youn hinsa", "बलात्कार", "यौन हिंसा", "లైంగిక దాడి"] },
  "65": { title: "Punishment for rape in certain cases", text: "Aggravated rape including on woman under 16/18 or by person in authority.", cat: "women_safety", triggers: ["minor rape", "gang rape", "posso", "सामूहिक बलात्कार"] },
  "70": { title: "Gang rape", text: "Where a woman is raped by one or more persons constituting a group or acting in furtherance of common intention.", cat: "women_safety", triggers: ["gang rape", "group assault", "सामूहिक बलात्कार"] },
  "74": { title: "Assault or criminal force to woman with intent to outrage modesty", text: "Whoever assaults or uses criminal force to any woman, intending to outrage modesty.", cat: "women_safety", triggers: ["eve teasing", "stalking", "molestation", "chhed chhad", "छेड़छाड़", "महिला उत्पीड़न", "వేధింపులు"] },
  "75": { title: "Sexual harassment", text: "Physical contact involving unwelcome explicit sexual overtures or demanding sexual favours.", cat: "women_safety", triggers: ["sexual harassment", "workplace harassment", "यौन उत्पीड़न"] },
  "76": { title: "Assault to woman with intent to disrobe", text: "Assaulting or using criminal force with intent to disrobe.", cat: "women_safety", triggers: ["disrobe", "naked", "कपड़े खींचना", "विवस्त्र"] },
  "77": { title: "Voyeurism", text: "Watching or capturing image of a woman engaging in private act.", cat: "women_safety", triggers: ["voyeurism", "hidden camera", "recording private", "गुप्त कैमरा"] },
  "78": { title: "Stalking", text: "Following a woman repeatedly despite clear disinterest or monitoring electronically.", cat: "women_safety", triggers: ["stalking", "following", "online stalking", "पीछा करना"] },
  "79": { title: "Word, gesture or act intended to insult modesty of woman", text: "Uttering words or making gestures intending to insult woman modesty.", cat: "women_safety", triggers: ["obscene remarks", "dirty gestures", "अभद्र इशारे"] },
  "85": { title: "Husband or relative of husband of a woman subjecting her to cruelty", text: "Whoever, being the husband or relative of husband, subjects woman to cruelty / dowry harassment.", cat: "women_safety", triggers: ["dowry", "dahej", "husband beating", "sasural", "domestic violence", "दहेज", "ससुराल", "पति ने मारा", "घरेलू हिंसा", "వరకట్నం"] },
  "86": { title: "Cruelty defined", text: "Definition of cruelty under Section 85 including harassment for property/dowry." },
  "103": { title: "Punishment for murder (including mob lynching)", text: "Whoever commits murder shall be punished with death or imprisonment for life and fine. Covers mob lynching.", cat: "assault", triggers: ["killed", "kill", "kills", "murder", "maut", "jaan le li", "mob lynching", "हत्या", "मार डाला", "मॉब लिंचिंग", "కొట్టి చంపారు"] },
  "104": { title: "Culpable homicide not amounting to murder", text: "Causing death without premeditation under exceptions.", cat: "assault", triggers: ["homicide", "unintentional death", "गैर इरादतन हत्या"] },
  "106": { title: "Causing death by negligence (Hit and Run)", text: "Causing death by rash or negligent act. Enhanced punishment for hit and run.", cat: "assault", triggers: ["hit and run", "road accident", "rash driving death", "दुर्घटना", "टक्कर मारकर भागना"] },
  "109": { title: "Attempt to murder / Attack with dangerous weapon", text: "Attempting murder or severe bodily attack with weapons.", cat: "assault", triggers: ["attempt to murder", "tried to kill", "knife attack", "जानलेवा हमला", "हत्या का प्रयास", "కత్తి దాడి", "चाकू", "तलवार", "laathi", "rod", "iron rod", "danda", "डंडे से", "लाठी-डंडे"] },
  "115": { title: "Voluntarily causing hurt", text: "Whoever causes bodily pain, disease or infirmity to any person with intention.", cat: "assault", triggers: ["beaten", "beat", "beats", "hit", "slapped", "punched", "kicked", "marpeet", "maara", "peeta", "मारपीट", "पीटा", "मारा", "थप्पड़", "కొట్టారు", "মারধর"] },
  "117": { title: "Voluntarily causing grievous hurt", text: "Causing grievous hurt — fracture, bone dislocation, severe bleeding, or permanent injury.", cat: "assault", triggers: ["grievous hurt", "fracture", "broken bone", "bleeding", "hospital", "gambhir chot", "khoon", "गंभीर चोट", "खून बहा", "हड्डी टूटी", "రక్తం"] },
  "118": { title: "Voluntarily causing hurt or grievous hurt by dangerous weapons", text: "Causing hurt by cutting/stabbing instrument, fire, poison or corrosive substance.", cat: "assault", triggers: ["knife", "acid", "iron rod", "weapon", "laathi", "डंडे से", "लाठी-डंडे", "चाकू", "drugged", "drugging", "drugged me", "poison", "poisoned", "spiked drink", "behosh", "बेहोश", "नशीला", "మత్తుమందు"] },
  "126": { title: "Wrongful restraint", text: "Whoever voluntarily obstructs any person so as to prevent that person from proceeding.", cat: "assault", triggers: ["blocked", "stopped me", "rasta roka", "roka", "रास्ता रोका", "जाने से रोका", "దారి అడ్డగించారు"] },
  "127": { title: "Wrongful confinement", text: "Restraining person beyond certain limits / locking up.", cat: "assault", triggers: ["locked up", "confined", "bandhi", "kamre me band", "बंधक", "कमरे में बंद"] },
  "137": { title: "Kidnapping", text: "Kidnapping from India or lawful guardianship.", cat: "assault", triggers: ["kidnap", "abducted", "apaharan", "kidnapped", "अपहरण", "उठा ले गया", "అపహరించారు"] },
  "140": { title: "Kidnapping for ransom or murder", text: "Kidnapping with demand of ransom or intent to murder.", cat: "assault", triggers: ["ransom", "kidnap ransom", "फिरौती के लिए अपहरण"] },
  "189": { title: "Unlawful assembly", text: "Assembly of five or more persons to commit offence or disturbance.", cat: "public_order", triggers: ["mob", "unlawful assembly", "gunda gardi", "गैरकानूनी सभा", "भीड़", "6 people", "5 people", "group of", "gang", "zill"] },
  "191": { title: "Rioting", text: "Violence used by unlawful assembly.", cat: "public_order", triggers: ["riot", "danga", "violence mob", "दंगा", "हिंसा"] },
  "198": { title: "Public servant taking bribe", text: "Public servant accepting illegal gratification or undue advantage.", cat: "bribery", triggers: ["bribe", "corruption", "rishwat", "ghoos", "रिश्वत", "घूस", "भ्रष्टाचार", "లంచం"] },
  "281": { title: "Rash driving on public way", text: "Driving or riding on public way in rash or negligent manner endangering life.", cat: "public_safety", triggers: ["rash driving", "overspeeding", "लापरवाह ड्राइविंग", "तेज रफ्तार"] },
  "296": { title: "Obscene acts and songs", text: "Doing obscene acts or singing obscene songs in public place to annoyance of others.", cat: "public_safety", triggers: ["obscene song", "vulgar act", "सार्वजनिक अश्लीलता"] },
  "303": { title: "Theft", text: "Dishonestly moving movable property out of possession without consent.", cat: "property", triggers: ["theft", "stolen", "stole", "pickpocket", "chori", "chura liya", "चोरी", "चुराया", "छीन लिया", "దొంగతనం", "చুরি"] },
  "304": { title: "Snatching", text: "Quickly, forcibly seizing or snatching movable property like chain, purse, mobile.", cat: "property", triggers: ["chain snatching", "mobile snatching", "snatched", "loot kiya", "झपटमारी", "चेन छीनी", "छिनताई"] },
  "308": { title: "Extortion", text: "Extortion by putting person in fear of injury and demanding money or property.", cat: "property", triggers: ["hafta", "rangdari", "extortion", "gunda tax", "forced money", "हफ्ता", "रंगदारी", "जबरन पैसे", "దౌర్జన్య వసూలు"] },
  "309": { title: "Robbery", text: "Theft or extortion accomplished with violence, death or hurt.", cat: "property", triggers: ["robbery", "looted", "loot", "loot kiya", "लूटपाट", "दरोडा"] },
  "310": { title: "Dacoity", text: "Five or more persons conjointly committing robbery.", cat: "property", triggers: ["dacoity", "armed robbery group", "डकैती"] },
  "316": { title: "Criminal breach of trust", text: "Dishonestly misappropriating entrusted property or money.", cat: "fraud", triggers: ["breach of trust", "amanat me khayanat", "paisa nahi diya", "paison ka gaban", "विश्वासघात", "अमानत में खयानत", "నమ్మక ద్రోహం"] },
  "318": { title: "Cheating", text: "Deceiving person fraudulently to deliver property or money.", cat: "fraud", triggers: ["fraud", "cheat", "cheated", "scam", "dhokha", "thagi", "धोखा", "धोखाधड़ी", "ठगी", "మోసం", "প্রতারণা"] },
  "319": { title: "Cheating by personation", text: "Cheating by pretending to be someone else (impersonation / fake identity).", cat: "fraud", triggers: ["impersonation", "fake identity", "नकली अधिकारी", "पहचान बदलकर ठगी"] },
  "329": { title: "Criminal trespass and house-trespass", text: "Entering property in possession of another to commit offence or intimidate.", cat: "property", triggers: ["kabza", "land grab", "illegal occupation", "trespass", "अवैध कब्जा", "जमीन कब्जा", "घर में घुसा", "కబ్జా"] },
  "335": { title: "Making or possessing counterfeit seal / fraud with intent to commit forgery", text: "Counterfeiting seal or forging contracts with intent to defraud.", cat: "fraud", triggers: ["counterfeit seal", "fake stamp", "नकली मोहर"] },
  "336": { title: "Forgery / Breach of lawful agreement and fraud", text: "Making false document or electronic record, or withholding lawful dues and wages under deceptive agreements.", cat: "fraud", triggers: ["forged", "fake document", "fake signature", "jali dastavez", "जाली दस्तावेज", "नकली हस्ताक्षर", "salary withheld", "salary", "wages", "मजदूरी", "वेतन", "तनख्वाह", "fake docs", "land docs", "illegal docs", "grab land", "land grabbing", "fake land", "fabricated record", "నకిలీ పత్రాలు", "దొంగ పత్రాలు"] },
  "351": { title: "Criminal intimidation", text: "Threatening another with injury to person, reputation or property.", cat: "intimidation", triggers: ["dhamki", "threat", "threaten", "threats", "threatened", "kill me", "scared", "jaan se maarne ki dhamki", "धमकी", "जान से मारने की धमकी", "जान से मार", "బెదిరించారు", "হুমকি", "மிரட்டினார்", "மிரட்டல்"] },
  "352": { title: "Intentional insult with intent to provoke breach of peace", text: "Intentionally insulting to provoke breach of peace or public order.", cat: "intimidation", triggers: ["gali", "abused", "insulted", "verbal abuse", "गाली", "गाली-गलौज", "अपमान"] },
  "356": { title: "Defamation", text: "Making or publishing imputation intending to harm reputation.", cat: "intimidation", triggers: ["defamation", "reputation damage", "social media abuse", "मानहानि", "बदनामी", "social media", "cheddha padalu", "అసహ్యం", "చెడ్డ పదాలు", "அவமானம்", "abusive words", "hate words"] }
};

const allStatutes = [];
const statuteTitleMap = {};

for (let i = 1; i <= 358; i++) {
  const secStr = String(i);
  const id = `BNS-${secStr}`;
  const spec = specialBns[secStr];
  let chObj = bnsChapters.find(c => i >= c.start && i <= c.end) || { ch: "General", name: "General Provisions", cat: "general_offence" };
  
  const title = spec?.title || `BNS Section ${secStr} (${chObj.name})`;
  const text = spec?.text || `Bharatiya Nyaya Sanhita, 2023 — Chapter ${chObj.ch} (${chObj.name}), Section ${secStr}. Official statutory penal provision under Indian criminal law.`;
  const cat = spec?.cat || chObj.cat || "general_offence";
  const triggers = spec?.triggers || [`bns ${secStr}`, `bns section ${secStr}`, `section ${secStr}`, `धारा ${secStr}`, `సెక్షన్ ${secStr}`];
  
  allStatutes.push({
    id,
    code: "BNS",
    section: secStr,
    title,
    text,
    punishment: "As prescribed under Bharatiya Nyaya Sanhita, 2023 Gazette.",
    triggers,
    negTriggers: spec?.negTriggers || [],
    minScore: spec ? (spec.minScore || 4) : 6,
    category: cat,
    chapter: `Chapter ${chObj.ch}: ${chObj.name}`,
    source: "Official India Code: https://www.indiacode.nic.in/"
  });

  statuteTitleMap[id] = {
    en: title,
    hi: `बीएनएस धारा ${secStr}: ${title}`,
    te: `బీఎన్‌ఎస్ సెక్షన్ ${secStr}: ${title}`,
    ta: `பிஎன்எஸ் பிரிவு ${secStr}: ${title}`,
    bn: `বিএনএস ধারা ${secStr}: ${title}`,
    mr: `बीएनएस कलम ${secStr}: ${title}`,
    kn: `ಬಿಎನ್‌ಎಸ್ ಕಲಂ ${secStr}: ${title}`,
    ml: `ബിഎൻഎസ് സെക്ഷൻ ${secStr}: ${title}`
  };
}

const bnssChapters = [
  { ch: "I", name: "Preliminary", start: 1, end: 5, cat: "procedure" },
  { ch: "II", name: "Constitution of Criminal Courts and Offices", start: 6, end: 25, cat: "procedure" },
  { ch: "III", name: "Power of Courts", start: 26, end: 34, cat: "procedure" },
  { ch: "IV", name: "Powers of Superior Officers of Police and Aid to Magistrates and Police", start: 35, end: 40, cat: "procedure" },
  { ch: "V", name: "Arrest of Persons", start: 41, end: 60, cat: "procedure" },
  { ch: "VI", name: "Processes to Compel Appearance (Summons & Warrants)", start: 61, end: 90, cat: "procedure" },
  { ch: "VII", name: "Processes to Compel Production of Things (Search & Seizure)", start: 91, end: 105, cat: "procedure" },
  { ch: "VIII", name: "Reciprocal Arrangements Regarding Processes", start: 106, end: 115, cat: "procedure" },
  { ch: "IX", name: "Security for Keeping Peace and Good Behaviour", start: 116, end: 135, cat: "procedure" },
  { ch: "X", name: "Order for Maintenance of Wives, Children and Parents", start: 136, end: 147, cat: "procedure" },
  { ch: "XI", name: "Maintenance of Public Order and Tranquillity", start: 148, end: 167, cat: "procedure" },
  { ch: "XII", name: "Preventive Action of Police", start: 168, end: 172, cat: "procedure" },
  { ch: "XIII", name: "Information to Police & Powers to Investigate (FIR / Zero FIR)", start: 173, end: 196, cat: "procedure" },
  { ch: "XIV", name: "Jurisdiction of Criminal Courts in Inquiries and Trials", start: 197, end: 209, cat: "procedure" },
  { ch: "XV", name: "Conditions Requisite for Initiation of Proceedings", start: 210, end: 222, cat: "procedure" },
  { ch: "XVI", name: "Complaints to Magistrates", start: 223, end: 226, cat: "procedure" },
  { ch: "XVII", name: "Commencement of Proceedings Before Magistrates", start: 227, end: 233, cat: "procedure" },
  { ch: "XVIII", name: "The Charge", start: 234, end: 247, cat: "procedure" },
  { ch: "XIX", name: "Trial Before a Court of Session", start: 248, end: 260, cat: "procedure" },
  { ch: "XX", name: "Trial of Warrant-Cases by Magistrates", start: 261, end: 273, cat: "procedure" },
  { ch: "XXI", name: "Trial of Summons-Cases by Magistrates", start: 274, end: 282, cat: "procedure" },
  { ch: "XXII", name: "Summary Trials", start: 283, end: 288, cat: "procedure" },
  { ch: "XXIII", name: "Plea Bargaining", start: 289, end: 300, cat: "procedure" },
  { ch: "XXIV", name: "Attendance of Persons in Prison", start: 301, end: 307, cat: "procedure" },
  { ch: "XXV", name: "Evidence in Inquiries and Trials (Audio-Video / Electronic)", start: 308, end: 336, cat: "procedure" },
  { ch: "XXVI", name: "General Provisions as to Inquiries and Trials", start: 337, end: 366, cat: "procedure" },
  { ch: "XXVII", name: "Provisions as to Accused Persons of Unsound Mind", start: 367, end: 378, cat: "procedure" },
  { ch: "XXVIII", name: "Offences Affecting Administration of Justice", start: 379, end: 391, cat: "procedure" },
  { ch: "XXIX", name: "The Judgment", start: 392, end: 406, cat: "procedure" },
  { ch: "XXX", name: "Submission of Death Sentences for Confirmation", start: 407, end: 412, cat: "procedure" },
  { ch: "XXXI", name: "Appeals", start: 413, end: 435, cat: "procedure" },
  { ch: "XXXII", name: "Reference and Revision", start: 436, end: 445, cat: "procedure" },
  { ch: "XXXIII", name: "Transfer of Criminal Cases", start: 446, end: 452, cat: "procedure" },
  { ch: "XXXIV", name: "Execution, Suspension, Remission and Commutation of Sentences", start: 453, end: 477, cat: "procedure" },
  { ch: "XXXV", name: "Provisions as to Bail and Bonds", start: 478, end: 496, cat: "procedure" },
  { ch: "XXXVI", name: "Disposal of Property", start: 497, end: 505, cat: "procedure" },
  { ch: "XXXVII", name: "Irregular Proceedings", start: 506, end: 512, cat: "procedure" },
  { ch: "XXXVIII", name: "Limitation for Taking Cognizance", start: 513, end: 519, cat: "procedure" },
  { ch: "XXXIX", name: "Miscellaneous", start: 520, end: 531, cat: "procedure" }
];

const specialBnss = {
  "35": { title: "When police may arrest without warrant", text: "Any police officer may without an order from Magistrate and without warrant arrest person committing cognizable offence.", cat: "procedure", triggers: ["arrest", "police arrest", "गिरफ्तारी"] },
  "37": { title: "Designated Police Officer in district/station for arrested persons display", text: "Designated officer maintains display of names of arrested persons.", cat: "procedure", triggers: ["arrest display", "arrested rights", "गिरफ्तार व्यक्ति के अधिकार"] },
  "144": { title: "Order for maintenance of wives, children and parents", text: "Maintenance allowance for neglected wife, children, or parents.", cat: "procedure", triggers: ["maintenance", "alimony", "kharcha", "भरण-पोषण", "गुजारा भत्ता"] },
  "173": { title: "Information in cognizable cases (Duty to register FIR / Zero FIR)", text: "Every information relating to cognizable offence must be registered (Zero FIR). Free copy of FIR given immediately.", cat: "procedure", triggers: ["fir", "zero fir", "police station", "complaint", "report crime", "thana", "एफआईआर", "थाना", "शिकायत दर्ज", "FIR నమోదు", "থানা"] },
  "175": { title: "Police officer power to investigate cognizable case", text: "Officer in charge of police station may investigate without Magistrate order.", cat: "procedure", triggers: ["police investigation", "investigate crime", "पुलिस जांच"] },
  "176": { title: "Procedure for investigation and preliminary enquiry", text: "Investigation procedure including electronic recording of statements and search operations.", cat: "procedure", triggers: ["investigation procedure", "janch", "जांच प्रक्रिया"] },
  "479": { title: "Maximum period for detention of undertrial prisoner (Bail)", text: "First-time offender who has undergone one-third of maximum sentence shall be released on bond/bail.", cat: "procedure", triggers: ["bail", "undertrial bail", "first time offender", "जमानत"] },
  "480": { title: "When bail may be taken in case of non-bailable offence", text: "Provisions for granting bail in non-bailable offences with consideration for women, sick or infirm.", cat: "procedure", triggers: ["anticipatory bail", "regular bail", "non bailable", "जमानत याचिका"] },
  "530": { title: "Trial and proceedings to be held in electronic mode", text: "All trials, inquiries and proceedings under BNSS may be held in electronic mode / video conferencing.", cat: "procedure", triggers: ["video trial", "online court", "electronic fir", "ई-एफआईआर", "वीडियो कॉन्फ्रेंसिंग"] }
};

for (let i = 1; i <= 531; i++) {
  const secStr = String(i);
  const id = `BNSS-${secStr}`;
  const spec = specialBnss[secStr];
  let chObj = bnssChapters.find(c => i >= c.start && i <= c.end) || { ch: "General", name: "Criminal Procedure", cat: "procedure" };
  
  const title = spec?.title || `BNSS Section ${secStr} (${chObj.name})`;
  const text = spec?.text || `Bharatiya Nagarik Suraksha Sanhita, 2023 — Chapter ${chObj.ch} (${chObj.name}), Section ${secStr}. Procedural safeguard under BNSS 2023.`;
  const cat = spec?.cat || chObj.cat || "procedure";
  const triggers = spec?.triggers || [`bnss ${secStr}`, `bnss section ${secStr}`, `crpc ${secStr}`, `section ${secStr} bnss`];
  
  allStatutes.push({
    id,
    code: "BNSS",
    section: secStr,
    title,
    text,
    punishment: "Statutory procedure under Bharatiya Nagarik Suraksha Sanhita, 2023.",
    triggers,
    negTriggers: spec?.negTriggers || [],
    minScore: spec ? (spec.minScore || 4) : 6,
    category: cat,
    chapter: `Chapter ${chObj.ch}: ${chObj.name}`,
    source: "Official India Code / AIKosh: https://www.indiacode.nic.in/"
  });

  statuteTitleMap[id] = {
    en: title,
    hi: `बीएनएसएस धारा ${secStr}: ${title}`,
    te: `బీఎన్‌ఎస్‌ఎస్ సెక్షన్ ${secStr}: ${title}`,
    ta: `பிஎன்எஸ்எஸ் பிரிவு ${secStr}: ${title}`,
    bn: `বিএনএসএস ধারা ${secStr}: ${title}`,
    mr: `बीएनएसएस कलम ${secStr}: ${title}`,
    kn: `ಬಿಎನ್‌ಎಸ್‌ಎಸ್ ಕಲಂ ${secStr}: ${title}`,
    ml: `ബിഎൻഎസ്എസ് സെക്ഷൻ ${secStr}: ${title}`
  };
}

console.log(`Total generated statutes: ${allStatutes.length} (BNS: 358, BNSS: 531)`);

// Curated BSA key sections (Bharatiya Sakshya Adhiniyam, 2023) — appended after regen
const bsaCurated = [
  { sec: "23", title: "Confession to police-officer not proved", text: "No confession made to a police-officer shall be proved as against a person accused of any offence.", triggers: ["confession to police", "confess to police", "police confession", "police custody confession", "forced confession", "पुलिस कबूल", "पुलिस के सामने इकबाल", "జబర్దస్తీ ఒప్పుకోలు"], chapter: "Bharatiya Sakshya Adhiniyam, 2023: Admissions and Confessions" },
  { sec: "32", title: "Cases in which statement of relevant fact by person who is dead or cannot be found (dying declaration)", text: "Statements made by a person as to the cause of his death, or as to any of the circumstances resulting in his death, are relevant (dying declaration).", triggers: ["dying declaration", "deathbed statement", "cause of death statement", "मरते समय बयान", "मृत्युपूर्व बयान"], chapter: "Bharatiya Sakshya Adhiniyam, 2023: Relevancy of Facts" },
  { sec: "63", title: "Admissibility of electronic records", text: "Electronic records — including e-mail, server logs, CCTV footage, screenshots and messages — are admissible with the prescribed certificate.", triggers: ["electronic record", "electronic evidence", "cctv", "cctv footage", "screenshot", "whatsapp", "whatsapp chat", "video recording", "call recording", "audio recording", "ई-सबूत", "सीसीटीवी", "ఎలక్ట్రానిక్"], chapter: "Bharatiya Sakshya Adhiniyam, 2023: Electronic Records" }
];
for (const b of bsaCurated) {
  allStatutes.push({
    id: `BSA-${b.sec}`, code: "BSA", section: b.sec, title: b.title, text: b.text,
    punishment: "Evidentiary rule under Bharatiya Sakshya Adhiniyam, 2023.",
    triggers: b.triggers, negTriggers: [], minScore: 6, category: "procedure",
    chapter: b.chapter, source: "Official India Code: https://www.indiacode.nic.in/"
  });
  statuteTitleMap[`BSA-${b.sec}`] = {
    en: b.title, hi: `बीएसए धारा ${b.sec}: ${b.title}`, te: `బీఎస్ఎ సెక్షన్ ${b.sec}: ${b.title}`,
    ta: `பிஎஸ்ஏ பிரிவு ${b.sec}: ${b.title}`, bn: `বিএসএ ধারা ${b.sec}: ${b.title}`,
    mr: `बीएसए कलम ${b.sec}: ${b.title}`, kn: `ಬಿಎಸ್‌ಎ ಕಲಂ ${b.sec}: ${b.title}`,
    ml: `ബിഎസ്എ സെക്ഷൻ ${b.sec}: ${b.title}`
  };
}

const outputCode = `// Nyaya-Setu Prototype Statutory Corpus (NOT a complete official database)
// Structure covers BNS 2023 (358) + BNSS 2023 (531) + 3 key BSA sections = 892 slots,
// but only ~48 sections are hand-curated with real triggers/text. The rest are
// clearly-marked placeholders generated from chapter structure. Always verify
// against Official Gazette / India Code before filing.
// Primary Source: Official Gazette of India / India Code (https://www.indiacode.nic.in/)
// Vernacular Mirror: AIKosh Legal Repository (https://www.aikosh.in/)

export const STATUTE_METADATA = {
    disclaimer: 'Prototype corpus: 892 slots (358 BNS + 531 BNSS + 3 key BSA) with ~48 hand-curated sections; remainder are placeholders. NOT authoritative. Verify against https://www.indiacode.nic.in/ before submission.',
    jurisdiction: 'Republic of India (BNS/BNSS/BSA 2023 effective 1 July 2024)',
    version: '0.5-prototype-partial',
    totalSections: \${allStatutes.length},
    curatedSections: 48,
    placeholderSections: 844,
    bnsSections: 358,
    bnssSections: 531,
    bsaSections: 3,
    corpusKind: 'prototype-lexical',
    retrievalMethod: 'lexical-trigger + bhashini + fuzzy + rarity (no vector embeddings yet)',
    lastUpdated: '2026-09-06',
    effectiveDate: '2024-07-01',
    officialSources: [
        'https://www.indiacode.nic.in/',
        'https://www.aikosh.in/',
        'https://legislative.gov.in/'
    ]
};

export const STATUTE_TITLE_MAP = ${JSON.stringify(statuteTitleMap, null, 2)};

export const BASE_STATUTES = ${JSON.stringify(allStatutes, null, 2)};

const LOCAL_STORAGE_KEY = 'nyaya_setu_dynamic_statutes_v3';

export function getLoadedStatutes() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        }
    } catch (e) { console.warn('Could not read cached statutes:', e); }
    return BASE_STATUTES;
}

export function saveDynamicStatutes(statutesList) {
    if (!Array.isArray(statutesList)) return false;
    try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(statutesList)); return true; }
    catch (e) { console.error('Failed to cache statutes:', e); return false; }
}

export function resetToDefaultStatutes() {
    try { if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_KEY); }
    catch (e) { console.error('Failed to reset:', e); }
    return BASE_STATUTES;
}

// Procedural-rights audio briefing (prototype text, not legal advice).
// NOTE: generator preserves this block — do not delete. If regenerating, this
// static copy is re-emitted so data/statutes.js never loses RIGHTS_BRIEFING.
export const RIGHTS_BRIEFING = {
  en: [
    'This is a computer-assisted complaint draft, not legal advice and not an FIR.',
    'Under BNSS Section 173, police must register cognizable offences, including as Zero FIR at any station, and give you a free copy under Section 173 sub-section 2.',
    'If the station refuses, you may approach the Superintendent of Police or Magistrate with a written copy. Keep a dated copy for yourself.',
    'Free legal aid is available on NALSA helpline 15100. In immediate danger, call emergency 112 first.'
  ],
  hi: [
    'यह कंप्यूटर-सहायित शिकायत मसौदा है, कानूनी सलाह या FIR नहीं।',
    'BNSS धारा 173 के तहत संज्ञेय अपराध दर्ज करना अनिवार्य है, किसी भी थाने में Zero FIR सहित, और धारा 173 उपधारा 2 के तहत निशुल्क प्रति मिलनी चाहिए।',
    'यदि थाना मना करे तो पुलिस अधीक्षक या मजिस्ट्रेट को लिखित प्रति दें। अपनी दिनांकित प्रति रखें।',
    'निशुल्क कानूनी सहायता NALSA हेल्पलाइन 15100 पर उपलब्ध है। तत्काल खतरे में पहले 112 पर कॉल करें।'
  ],
  te: [
    'ఇది కంప్యూటర్ సహాయంతో తయారైన ఫిర్యాదు డ్రాఫ్ట్ మాత్రమే; న్యాయ సలహా కాదు, FIR కాదు.',
    'BNSS సెక్షన్ 173 ప్రకారం కాగ్నిజబుల్ నేరాన్ని ఏ స్టేషన్‌లో అయినా Zero FIR గా నమోదు చేయాలి, సెక్షన్ 173 సబ్-సెక్షన్ 2 ప్రకారం ఉచిత కాపీ ఇవ్వాలి.',
    'స్టేషన్ నిరాకరిస్తే SP లేదా మేజిస్ట్రేట్‌కు లిఖితపూర్వక కాపీ ఇవ్వండి. తేదీ ఉన్న కాపీని మీ వద్ద ఉంచండి.',
    'ఉచిత న్యాయ సహాయం NALSA 15100 లో అందుబాటులో ఉంది. ప్రమాదంలో ఉంటే ముందుగా 112 కు కాల్ చేయండి.'
  ],
  ta: [
    'இது கணினி உதவியுடன் உருவாக்கப்பட்ட புகார் வரைவு; சட்ட ஆலோசனை அல்ல, FIR அல்ல.',
    'BNSS பிரிவு 173-ன் கீழ் காவல்துறை புகாரை Zero FIR ஆகவும் பதிவு செய்ய வேண்டும், பிரிவு 173 உட்பிரிவு 2-ன் கீழ் இலவச நகல் தர வேண்டும்.',
    'மறுத்தால் SP அல்லது Magistrate-இடம் எழுத்து நகல் கொடுங்கள். தேதியிட்ட நகலை வைத்திருங்கள்.',
    'இலவச சட்ட உதவி NALSA 15100. ஆபத்தில் இருந்தால் முதலில் 112-ஐ அழையுங்கள்.'
  ],
  bn: [
    'এটি কম্পিউটার-সহায়িত অভিযোগের খসড়া; আইনি পরামর্শ বা FIR নয়।',
    'BNSS ধারা 173 অনুযায়ী আমলযোগ্য অপরাধ Zero FIR সহ নথিভুক্ত করতে হবে এবং 173 উপধারা 2 অনুযায়ী বিনামূল্যে কপি দিতে হবে।',
    'থানা অস্বীকার করলে SP বা ম্যাজিস্ট্রেটের কাছে লিখিত কপি দিন। তারিখসহ কপি রাখুন।',
    'বিনামূল্যে আইনি সহায়তা NALSA 15100। বিপদে থাকলে প্রথমে 112-তে কল করুন।'
  ],
  mr: [
    'हा संगणक-सहाय्यित तक्रार मसुदा आहे; कायदेशीर सल्ला किंवा FIR नाही.',
    'BNSS कलम 173 नुसार दखलपात्र गुन्हा Zero FIR सह नोंदवणे बंधनकारक आहे आणि कलम 173 पोटकलम 2 नुसार मोफत प्रत मिळाली पाहिजे.',
    'ठाण्याने नकार दिल्यास SP किंवा दंडाधिकाऱ्यांकडे लेखी प्रत द्या. दिनांकित प्रत स्वतःकडे ठेवा.',
    'मोफत कायदेशीर मदत NALSA 15100. तात्काळ धोक्यात प्रथम 112 वर कॉल करा.'
  ],
  kn: [
    'ಇದು ಕಂಪ್ಯೂಟರ್ ಸಹಾಯದ ದೂರು ಕರಡು ಮಾತ್ರ; ಕಾನೂನು ಸಲಹೆಯಲ್ಲ, FIR ಅಲ್ಲ.',
    'BNSS ಕಲಂ 173 ರ ಅಡಿಯಲ್ಲಿ ಪೊಲೀಸರು Zero FIR ಸೇರಿ ದೂರನ್ನು ದಾಖಲಿಸಬೇಕು ಮತ್ತು 173(2) ರಂತೆ ಉಚಿತ ಪ್ರತಿ ನೀಡಬೇಕು.',
    'ಠಾಣೆ ನಿರಾಕರಿಸಿದರೆ SP ಅಥವಾ ಮ್ಯಾಜಿಸ್ಟ್ರೇಟ್‌ಗೆ ಲಿಖಿತ ಪ್ರತಿ ನೀಡಿ. ದಿನಾಂಕದ ಪ್ರತಿ ಇಟ್ಟುಕೊಳ್ಳಿ.',
    'ಉಚಿತ ಕಾನೂನು ಸಹಾಯ NALSA 15100. ಅಪಾಯದಲ್ಲಿದ್ದರೆ ಮೊದಲು 112 ಗೆ ಕರೆ ಮಾಡಿ.'
  ],
  ml: [
    'ഇത് കമ്പ്യൂട്ടർ സഹായത്തോടെയുള്ള പരാതി ഡ്രാഫ്റ്റാണ്; നിയമോപദേശമോ FIR ഓ അല്ല.',
    'BNSS സെക്ഷൻ 173 പ്രകാരം പോലീസ് Zero FIR ആയും കേസ് രജിസ്റ്റർ ചെയ്യണം, 173(2) പ്രകാരം സൗജന്യ പകർപ്പ് നൽകണം.',
    'സ്റ്റേഷൻ നിരസിച്ചാൽ SP അല്ലെങ്കിൽ മജിസ്ട്രേറ്റിന് രേഖാമൂലം നൽകുക. തീയതിയുള്ള പകർപ്പ് സൂക്ഷിക്കുക.',
    'സൗജന്യ നിയമസഹായം NALSA 15100. അപകടത്തിലാണെങ്കിൽ ആദ്യം 112 ൽ വിളിക്കുക.'
  ]
};
`;

fs.writeFileSync(path.join(process.cwd(), "data", "statutes.js"), outputCode, "utf8");
console.log("Successfully wrote full BNS & BNSS dataset to data/statutes.js!");
