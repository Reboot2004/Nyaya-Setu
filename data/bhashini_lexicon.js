// Bhashini Indic Dialectal Lexicon & Normalizer
// Powered by Bhashini parallel language representations for vernacular-to-statute mapping.
// Covers colloquial phrases in Hindi, Telugu, Tamil, Marathi, Bengali, Kannada, and Malayalam.

export const BHASHINI_COLLOQUIAL_LEXICON = [
    // Physical assault / Hurt (BNS 115, 117)
    {
        canonical: 'assault_hurt',
        targetSections: ['115', '117', '118'],
        terms: {
            hi: ['मारपीट', 'मार-पीट', 'मारा', 'पीटा', 'हाथापाई', 'पीटा गया', 'चोट पहुंचाई', 'खून निकला', 'हड्डी तोड़ी', 'अस्पताल', 'गंभीर चोट', 'लाठी से मारा', 'थप्पड़ मारा', 'बेहोश किया', 'नशीला पदार्थ'],
            en: ['mar-peet', 'marpeet', 'beating', 'hit me', 'assaulted', 'physical assault', 'struck me', 'bleeding', 'fracture', 'broken bone', 'hospitalized', 'lathi', 'slapped', 'drugged', 'drugging', 'drugged me', 'poisoned', 'spiked', '6 people', 'group attack', 'gang'],
            te: ['కొట్టారు', 'దెబ్బలాట', 'దాడి చేశారు', 'గాయపరిచారు', 'రక్తం వచ్చింది', 'ఎముక విరిగింది', 'ఆసుపత్రి', 'చెంపదెబ్బ'],
            ta: ['அடித்தார்கள்', 'தாக்குதல்', 'காயம்', 'ரத்தம் வந்தது', 'எலும்பு முறிவு', 'மருத்துவமனை', 'அடிதடி'],
            mr: ['मारहाण', 'मारहाण केली', 'हाणामारी', 'जखमी केले', 'रक्तस्त्राव', 'हाड मोडले', 'रुग्णालय', 'चापट मारली'],
            bn: ['মারধর', 'মারপিট', 'আঘাত করেছে', 'রক্তপাত', 'হাড় ভেঙেছে', 'হাসপাতাল', 'চড় মেরেছে'],
            kn: ['ಹಲ್ಲೆ', 'ಹೊಡೆದರು', 'ಗಾಯಗೊಳಿಸಿದರು', 'ರಕ್ತ ಬಂತು', 'ಮೂಳೆ ಮುರಿತ', 'ಆಸ್ಪತ್ರೆ'],
            ml: ['മർദ്ദനം', 'തല്ലി', 'പരിക്കേൽപ്പിച്ചു', 'രക്തം വന്നു', 'അസ്ഥി ഒടിഞ്ഞു', 'ആശുപത്രി']
        }
    },
    // Criminal Intimidation / Threats (BNS 351)
    {
        canonical: 'criminal_intimidation',
        targetSections: ['351'],
        terms: {
            hi: ['धमकी', 'धमकाया', 'जान से मारने की धमकी', 'धमकी दी', 'डराया', 'भगा दिया', 'चमकाया', 'धमकाना'],
            en: ['dhamki', 'threatened', 'death threat', 'warned to kill', 'intimidation', 'scared me', 'threat', 'warning'],
            te: ['బెదిరింపు', 'చంపేస్తామని బెదిరించారు', 'భయపెట్టారు', 'బెదిరించాడు'],
            ta: ['மிரட்டல்', 'கொலை மிரட்டல்', 'பயமுறுத்தினார்கள்', 'எச்சரித்தார்'],
            mr: ['धमकी', 'जीवे मारण्याची धमकी', 'घाबरवले', 'धमकावले'],
            bn: ['হুমকি', 'খুনের হুমকি', 'ভয় দেখিয়েছে', 'হুমকি দিয়েছে'],
            kn: ['ಬೆದರಿಕೆ', 'ಕೊಲೆ ಬೆದರಿಕೆ', 'ಹೆದರಿಸಿದರು'],
            ml: ['ഭീഷണി', 'കൊല്ലുമെന്ന് ഭീഷണിപ്പെടുത്തി', 'പേടിപ്പിച്ചു']
        }
    },
    // Verbal Abuse / Insult provoking breach of peace (BNS 352)
    {
        canonical: 'intentional_insult',
        targetSections: ['352'],
        terms: {
            hi: ['गाली-गलौज', 'गाली', 'अपशब्द', 'गाली दी', 'अपमानित किया', 'बेइज्जत किया', 'गंदी भाषा', 'अभद्र व्यवहार'],
            en: ['gali-galoch', 'gali', 'verbal abuse', 'abusive language', 'insulted', 'humiliated', 'bad words', 'provocation'],
            te: ['బూతులు తిట్టారు', 'అవమానించారు', 'దూషించారు', 'చెడు మాటలు'],
            ta: ['திட்டினார்கள்', 'அசிங்கமாக பேசினார்', 'அவமானம்', 'வசைபாடினார்'],
            mr: ['शिवीगाळ', 'अपमान केला', 'घाणेरडी भाषा', 'शिव्या दिल्या'],
            bn: ['গালাগালি', 'অপমান করেছে', 'খারাপ ভাষা', 'অশালীন আচরণ'],
            kn: ['ಬೈಗುಳ', 'ಅವಮಾನ ಮಾಡಿದರು', 'ಕೆಟ್ಟ ಮಾತುಗಳು'],
            ml: ['ചീത്തവിളിച്ചു', 'അപമാനിച്ചു', 'മോശം വാക്കുകൾ']
        }
    },
    // Theft (BNS 303)
    {
        canonical: 'theft',
        targetSections: ['303'],
        terms: {
            hi: ['चोरी', 'चुरा लिया', 'सामान गायब', 'जेब काटी', 'छीन लिया', 'उड़ा ले गए', 'ताला तोड़ा'],
            en: ['chori', 'theft', 'stolen', 'picked pocket', 'stole my', 'looted', 'broke lock'],
            te: ['దొంగతనం', 'దొంగిలించారు', 'లాక్కున్నారు', 'జేబు కొట్టారు'],
            ta: ['திருட்டு', 'திருடிவிட்டார்கள்', 'பறித்துக் கொண்டனர்'],
            mr: ['चोरी', 'चोरून नेले', 'खिसा कापला', 'पळवून नेले'],
            bn: ['চুরি', 'চুরি হয়েছে', 'ছিনতাই', 'পকেটমার'],
            kn: ['ಕಳ್ಳತನ', 'ಕದ್ದಿದ್ದಾರೆ', 'ದೋಚಿದರು'],
            ml: ['മോഷണം', 'മോഷ്ടിച്ചു', 'തട്ടിയെടുത്തു']
        }
    },
    // Extortion / Hafta / Rangdari (BNS 308)
    {
        canonical: 'extortion',
        targetSections: ['308'],
        terms: {
            hi: ['हफ्ता', 'रंगदारी', 'जबरन वसूली', 'जबरदस्ती पैसे मांगे', 'ब्लैकमेल करके पैसा मांगा', 'गुंडा टैक्स'],
            en: ['hafta', 'rangdari', 'extortion', 'forced money', 'protection money', 'blackmail money', 'illegal demand'],
            te: ['హఫ్తా', 'దౌర్జన్యంగా డబ్బులు వసూలు', 'బ్లాక్‌మెయిల్ చేసి డబ్బు అడిగారు'],
            ta: ['மாமூல்', 'பணம் பறிப்பு', 'மிரட்டி பணம் கேட்டல்'],
            mr: ['हप्ता', 'खंडणी', 'जबरदस्तीने पैसे उकळणे', 'गुंडा टॅक्स'],
            bn: ['তোলাবাজি', 'জোর করে টাকা আদায়', 'হপ্তা', 'ব্ল্যাকমেইল'],
            kn: ['ಹಫ್ತಾ', 'ಬೆದರಿಸಿ ಹಣ ವಸೂಲಿ', 'ಖಂಡಣಿ'],
            ml: ['പിടിച്ചുപറി', 'ഭീഷണിപ്പെടുത്തി പണം വാങ്ങൽ', 'ഹഫ്ത']
        }
    },
    // Cheating / Fraud / Scam (BNS 318)
    {
        canonical: 'cheating_fraud',
        targetSections: ['318'],
        terms: {
            hi: ['धोखा', 'धोखाधड़ी', 'ठगी', 'पैसे लेकर भाग गया', 'ऑनलाइन फ्रॉड', 'फर्जीवाड़ा', 'फंसा दिया', 'झांसा दिया'],
            en: ['dhokha', 'thagi', 'fraud', 'cheated', 'scammed', 'online scam', 'took money and fled', 'duped'],
            te: ['మోసం', 'నమ్మించి మోసం చేశారు', 'డబ్బులు తీసుకొని పారిపోయారు', 'ఆన్‌లైన్ ఫ్రాడ్'],
            ta: ['ஏமாற்றுதல்', 'மோசடி', 'பணம் ஏமாற்றிவிட்டார்', 'ஆன்லைன் மோசடி'],
            mr: ['फसवणूक', 'धोका दिला', 'ठकवले', 'पैसे घेऊन पळाला'],
            bn: ['প্রতারণা', 'ঠকিয়েছে', 'টাকা নিয়ে পালিয়েছে', 'অনলাইন জালিয়াতি'],
            kn: ['ವಂಚನೆ', 'ಮೋಸ ಮಾಡಿದರು', 'ಹಣ ಪಡೆದು ಓಡಿಹೋದರು'],
            ml: ['വഞ്ചന', 'തട്ടിപ്പ്', 'പണം വാങ്ങി മുങ്ങി', 'ഓൺലൈൻ തട്ടിപ്പ്']
        }
    },
    // Criminal Breach of Trust (BNS 316)
    {
        canonical: 'breach_of_trust',
        targetSections: ['316'],
        terms: {
            hi: ['अमानत में खयानत', 'भरोसा तोड़ा', 'गबन', 'पैसे हड़प लिए', 'संपत्ति हड़प ली', 'जिम्मेदारी का गलत फायदा'],
            en: ['breach of trust', 'misappropriated', 'embezzlement', 'refused to return money', 'swindled trust property'],
            te: ['నమ్మకద్రోహం', 'డబ్బులు కాజేశారు', 'ఆస్తిని కాజేశారు'],
            ta: ['நம்பிக்கை துரோகம்', 'பணத்தை அபகரித்தல்'],
            mr: ['विश्वासघात', 'पैसे लाटले', 'अपहार केला'],
            bn: ['বিশ্বাসভঙ্গ', 'টাকা আত্মসাৎ', 'সম্পত্তি দখল'],
            kn: ['ನಂಬಿಕೆ ದ್ರೋಹ', 'ಹಣ ದುರುಪಯೋಗ'],
            ml: ['വിശ്വാസവഞ്ചന', 'പണം തട്ടിയെടുക്കൽ']
        }
    },
    // Forgery / Fake Documents (BNS 336)
    {
        canonical: 'forgery',
        targetSections: ['336'],
        terms: {
            hi: ['फर्जी दस्तावेज', 'नकली हस्ताक्षर', 'फर्जी साइन', 'जाली कागजात', 'झूठी रसीद', 'स्टांप पेपर फर्जी'],
            en: ['forged document', 'fake signature', 'forgery', 'fake papers', 'counterfeit document', 'bogus record'],
            te: ['నకిలీ పత్రాలు', 'ఫోర్జరీ', 'దొంగ సంతకం', 'నకిలీ రశీదు'],
            ta: ['போலி ஆவணங்கள்', 'போலி கையெழுத்து', 'போலி பத்திரம்'],
            mr: ['बनावट कागदपत्रे', 'बनावट सही', 'खोटे दस्तऐवज'],
            bn: ['জাল নথি', 'জাল সই', 'ভুয়া কাগজপত্র'],
            kn: ['ನಕಲಿ ದಾಖಲೆಗಳು', 'ನಕಲಿ ಸಹಿ', 'ಫೋರ್ಜರಿ'],
            ml: ['വ്യാജ രേഖകൾ', 'വ്യാജ ഒപ്പ്', 'ഫോർജറി']
        }
    },
    // Women modesty outrage / Harassment / Eve-teasing (BNS 74, 75, 78)
    {
        canonical: 'women_harassment',
        targetSections: ['74', '75', '78'],
        terms: {
            hi: ['छेड़छाड़', 'छेड़खानी', 'गंदी हरकत', 'बदतमीजी की', 'पीछा किया', 'गलत तरीके से छुआ', 'लज्जा भंग', 'स्टॉकिंग'],
            en: ['chhed-chhad', 'eve teasing', 'sexual harassment', 'stalking', 'inappropriate touch', 'outraged modesty', 'followed me'],
            te: ['వేధింపులు', 'ఈవ్‌టీజింగ్', 'వెంటపడ్డారు', 'తప్పుగా తాకారు', 'అసభ్య ప్రవర్తన'],
            ta: ['ஈவ்டீசிங்', 'பாலியல் தொல்லை', 'பின்தொடர்தல்', 'தவறான முறையில் தொட்டார்கள்'],
            mr: ['छेडछाड', 'पाठलाग केला', 'अयोग्य स्पर्श', 'स्त्री लज्जाभंग'],
            bn: ['উত্ত্যক্ত করা', 'শ্লীলতাহানি', 'পিছু নেওয়া', 'খারাপভাবে স্পর্শ'],
            kn: ['ಚುಡಾಯಿಸುವುದು', 'ಲೈಂಗಿಕ ಕಿರುಕುಳ', 'ಹಿಂಬಾಲಿಸುವುದು'],
            ml: ['ശല്യപ്പെടുത്തൽ', 'സ്ത്രീത്വത്തെ അപമാനിക്കൽ', 'പിന്തുടർന്നു']
        }
    },
    // Cruelty by Husband / In-laws & Dowry Harassment (BNS 85, 86)
    {
        canonical: 'dowry_domestic_cruelty',
        targetSections: ['85', '86'],
        terms: {
            hi: ['दहेज उत्पीड़न', 'दहेज', 'ससुराल वाले प्रताड़ित कर रहे हैं', 'पति ने पीटा', 'घरेलू हिंसा', 'दहेज के लिए ताना'],
            en: ['dowry harassment', 'dahej', 'domestic violence', 'husband cruelty', 'in-laws torture', 'dowry demand'],
            te: ['వరకట్న వేధింపులు', 'గృహహింస', 'భర్త వేధింపులు', 'అత్తమామల వేధింపులు'],
            ta: ['வரதட்சணை கொடுமை', 'குடும்ப வன்முறை', 'கணவர் சித்திரவதை'],
            mr: ['हुंडा छळ', 'घरगुती हिंसाचार', 'सासरच्यांचा छळ', 'पतीकडून मारहाण'],
            bn: ['যৌতুক নির্যাতন', 'পারিবারিক হিংসা', 'স্বামীর অত্যাচার'],
            kn: ['ವರದಕ್ಷಿಣೆ ಕಿರುಕುಳ', 'ಕೌಟುಂಬಿಕ ಹಿಂಸೆ', 'ಗಂಡನ ಕಿರುಕುಳ'],
            ml: ['സ്ത്രീധന പീഡനം', 'ഗാർഹിക പീഡനം', 'ഭർത്താവിന്റെ ക്രൂരത']
        }
    },
    // Land Encroachment / Criminal Trespass (BNS 329)
    {
        canonical: 'criminal_trespass_encroachment',
        targetSections: ['329'],
        terms: {
            hi: ['जमीन कब्जा', 'अवैध कब्जा', 'जबरन खेत में घुसा', 'घर में घुसा', 'बाउंड्री तोड़ी', 'कब्जा कर लिया'],
            en: ['kabza', 'land grabbing', 'encroachment', 'trespass', 'illegal possession', 'forced entry into land'],
            te: ['భూ ఆక్రమణ', 'అక్రమ ప్రవేశం', 'కబ్జా చేశారు', 'పొలంలోకి చొరబడ్డారు'],
            ta: ['நில ஆக்கிரமிப்பு', 'அத்துமீறி நுழைதல்', 'நில அபகரிப்பு'],
            mr: ['जमीन बळकावणे', 'बेकायदेशीर ताबा', 'घरात घुसखोरी'],
            bn: ['জমি দখল', 'অবৈধ প্রবেশ', 'জোর করে জমি দখল'],
            kn: ['ಜಮೀನು ಒತ್ತುವರಿ', 'ಅಕ್ರಮ ಪ್ರವೇಶ', 'ಕಬ್ಜಾ'],
            ml: ['ഭൂമി കയ್ಯേറ്റം', 'അതിക്രമിച്ചു കയറൽ']
        }
    },
    // Police refusal & Zero FIR rights (BNSS 173, 175)
    {
        canonical: 'police_fir_refusal',
        targetSections: ['173', '175'],
        terms: {
            hi: ['थानेदार ने मना किया', 'एफआईआर दर्ज नहीं की', 'पुलिस रिपोर्ट नहीं लिख रही', 'एसपी को शिकायत', 'जीरो एफआईआर'],
            en: ['police refused fir', 'station incharge refused', 'zero fir', 'complaint to sp', 'superintendent of police complaint'],
            te: ['పోలీసులు ఎఫ్ఐఆర్ నమోదు చేయలేదు', 'స్టేషన్‌లో ఫిర్యాదు తీసుకోలేదు', 'జీరో ఎఫ్ఐఆర్', 'ఎస్పీకి ఫిర్యాదు'],
            ta: ['காவல்துறை புகார் எடுக்கவில்லை', 'எஃப்ஐஆர் பதிவு செய்ய மறுப்பு', 'ஜீரோ எஃப்ஐஆர்'],
            mr: ['पोलिसांनी तक्रार घेतली नाही', 'एफआयआर दाखल केला नाही', 'झिरो एफआयआर'],
            bn: ['পুলিশ এফআইআর নিল না', 'অভিযোগ গ্রহণ করেনি', 'জিরো এফআইআর'],
            kn: ['ಪೊಲೀಸರು ಎಫ್‌ಐಆರ್ ದಾಖಲಿಸಲಿಲ್ಲ', 'ದೂರು ಸ್ವೀಕರಿಸಲಿಲ್ಲ', 'ಜೀರೋ ಎಫ್‌ಐಆರ್'],
            ml: ['പോലീസ് എഫ്.ഐ.ആർ എടുത്തില്ല', 'പരാതി നിരസിച്ചു', 'സീറോ എഫ്.ഐ.ആർ']
        }
    }
];

/**
 * Normalizes colloquial narrative using Bhashini Indic parallel concept representations.
 * Returns array of enriched canonical search concepts and target section suggestions.
 */
export function normalizeWithBhashini(text) {
    if (!text || typeof text !== 'string') return { normalizedConcepts: [], suggestedSections: [] };

    const lowerText = text.toLowerCase();
    const matchedConcepts = new Set();
    const targetSections = new Set();

    for (const entry of BHASHINI_COLLOQUIAL_LEXICON) {
        let isMatched = false;
        for (const [lang, terms] of Object.entries(entry.terms)) {
            for (const term of terms) {
                if (lowerText.includes(term.toLowerCase())) {
                    isMatched = true;
                    matchedConcepts.add(entry.canonical);
                    entry.targetSections.forEach((sec) => targetSections.add(sec));
                    break;
                }
            }
            if (isMatched) break;
        }
    }

    return {
        normalizedConcepts: Array.from(matchedConcepts),
        suggestedSections: Array.from(targetSections)
    };
}
