import type { Language } from '../store';

export type AssistantIntent =
  | 'BOOK_APPOINTMENT'
  | 'FIND_CENTER'
  | 'VACCINE_SCHEDULE'
  | 'CHILD_FEVER'
  | 'EMERGENCY'
  | 'GENERAL';

const LOCALES: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  ml: 'ml-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  or: 'or-IN',
  pa: 'pa-IN',
  bn: 'bn-IN',
  as: 'as-IN',
  gu: 'gu-IN',
  ta: 'ta-IN',
};

const UI_COPY: Record<Language, {
  placeholder: string;
  loading: string;
  unsupportedMic: string;
  status: string;
  reset: string;
}> = {
  en: { placeholder: 'Type your question or use voice...', loading: 'Swasthya Sewa is preparing your answer...', unsupportedMic: 'Voice input is not supported in this browser. Please use Chrome or Edge.', status: 'Online and ready to help', reset: 'New chat' },
  hi: { placeholder: 'अपना सवाल लिखें या आवाज़ का उपयोग करें...', loading: 'स्वास्थ्य सेवा आपका जवाब तैयार कर रही है...', unsupportedMic: 'इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है। कृपया Chrome या Edge का उपयोग करें।', status: 'ऑनलाइन और मदद के लिए तैयार', reset: 'नई चैट' },
  mr: { placeholder: 'तुमचा प्रश्न लिहा किंवा आवाज वापरा...', loading: 'स्वास्थ्य सेवा तुमचे उत्तर तयार करत आहे...', unsupportedMic: 'या ब्राउझरमध्ये आवाज इनपुट उपलब्ध नाही. कृपया Chrome किंवा Edge वापरा.', status: 'ऑनलाइन आणि मदतीसाठी तयार', reset: 'नवीन गप्पा' },
  ml: { placeholder: 'ചോദ്യം ടൈപ്പ് ചെയ്യുക അല്ലെങ്കിൽ ശബ്ദം ഉപയോഗിക്കുക...', loading: 'സ്വാസ്ഥ്യ സേവ നിങ്ങളുടെ മറുപടി തയ്യാറാക്കുന്നു...', unsupportedMic: 'ഈ ബ്രൗസറിൽ ശബ്ദ ഇൻപുട്ട് ലഭ്യമല്ല. ദയവായി Chrome അല്ലെങ്കിൽ Edge ഉപയോഗിക്കുക.', status: 'ഓൺലൈനും സഹായിക്കാൻ തയ്യാറുമാണ്', reset: 'പുതിയ ചാറ്റ്' },
  te: { placeholder: 'మీ ప్రశ్న టైప్ చేయండి లేదా వాయిస్ ఉపయోగించండి...', loading: 'స్వాస్థ్య సేవ మీ సమాధానం సిద్ధం చేస్తోంది...', unsupportedMic: 'ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ లేదు. దయచేసి Chrome లేదా Edge ఉపయోగించండి.', status: 'ఆన్‌లైన్‌లో ఉంది మరియు సిద్ధంగా ఉంది', reset: 'కొత్త చాట్' },
  kn: { placeholder: 'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಧ್ವನಿ ಬಳಸಿ...', loading: 'ಸ್ವಾಸ್ಥ್ಯ ಸೇವೆ ನಿಮ್ಮ ಉತ್ತರವನ್ನು ತಯಾರಿಸುತ್ತಿದೆ...', unsupportedMic: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಇನ್‌ಪುಟ್ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು Chrome ಅಥವಾ Edge ಬಳಸಿ.', status: 'ಆನ್‌ಲೈನ್ ಮತ್ತು ಸಹಾಯಕ್ಕೆ ಸಿದ್ಧ', reset: 'ಹೊಸ ಚಾಟ್' },
  or: { placeholder: 'ଆପଣଙ୍କ ପ୍ରଶ୍ନ ଲେଖନ୍ତୁ କିମ୍ବା ଶବ୍ଦ ବ୍ୟବହାର କରନ୍ତୁ...', loading: 'ସ୍ୱାସ୍ଥ୍ୟ ସେବା ଆପଣଙ୍କ ଉତ୍ତର ପ୍ରସ୍ତୁତ କରୁଛି...', unsupportedMic: 'ଏହି ବ୍ରାଉଜରରେ ଶବ୍ଦ ଇନପୁଟ ନାହିଁ। Chrome କିମ୍ବା Edge ବ୍ୟବହାର କରନ୍ତୁ।', status: 'ଅନଲାଇନ ଏବଂ ସହାୟତା ପାଇଁ ପ୍ରସ୍ତୁତ', reset: 'ନୂତନ ଚାଟ' },
  pa: { placeholder: 'ਆਪਣਾ ਸਵਾਲ ਲਿਖੋ ਜਾਂ ਆਵਾਜ਼ ਵਰਤੋਂ...', loading: 'ਸਵਾਸਥਿਆ ਸੇਵਾ ਤੁਹਾਡਾ ਜਵਾਬ ਤਿਆਰ ਕਰ ਰਹੀ ਹੈ...', unsupportedMic: 'ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਆਵਾਜ਼ ਇਨਪੁਟ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। Chrome ਜਾਂ Edge ਵਰਤੋ।', status: 'ਆਨਲਾਈਨ ਅਤੇ ਮਦਦ ਲਈ ਤਿਆਰ', reset: 'ਨਵੀਂ ਚੈਟ' },
  bn: { placeholder: 'প্রশ্ন লিখুন বা ভয়েস ব্যবহার করুন...', loading: 'স্বাস্থ্য সেবা আপনার উত্তর প্রস্তুত করছে...', unsupportedMic: 'এই ব্রাউজারে ভয়েস ইনপুট নেই। Chrome বা Edge ব্যবহার করুন।', status: 'অনলাইনে এবং সাহায্যের জন্য প্রস্তুত', reset: 'নতুন চ্যাট' },
  as: { placeholder: 'আপোনাৰ প্ৰশ্ন লিখক অথবা কণ্ঠ ব্যৱহাৰ কৰক...', loading: 'স্বাস্থ্য সেৱা আপোনাৰ উত্তৰ প্ৰস্তুত কৰি আছে...', unsupportedMic: 'এই ব্ৰাউজাৰত কণ্ঠ ইনপুট উপলব্ধ নহয়। Chrome বা Edge ব্যৱহাৰ কৰক।', status: 'অনলাইন আৰু সহায়ৰ বাবে সাজু', reset: 'নতুন চেট' },
  gu: { placeholder: 'તમારો પ્રશ્ન લખો અથવા અવાજનો ઉપયોગ કરો...', loading: 'સ્વાસ્થ્ય સેવા તમારો જવાબ તૈયાર કરી રહી છે...', unsupportedMic: 'આ બ્રાઉઝરમાં વોઇસ ઇનપુટ ઉપલબ્ધ નથી. Chrome અથવા Edge નો ઉપયોગ કરો.', status: 'ઓનલાઇન અને મદદ માટે તૈયાર', reset: 'નવી ચેટ' },
  ta: { placeholder: 'உங்கள் கேள்வியை தட்டச்சு செய்யுங்கள் அல்லது குரல் பயன்படுத்துங்கள்...', loading: 'சுவாஸ்த்ய சேவா உங்கள் பதிலை தயாரிக்கிறார்...', unsupportedMic: 'இந்த உலாவியில் குரல் உள்ளீடு இல்லை. Chrome அல்லது Edge பயன்படுத்துங்கள்.', status: 'ஆன்லைனில் உள்ளது மற்றும் தயாராக உள்ளது', reset: 'புதிய உரையாடல்' },
};

const RESPONSE_COPY: Record<Language, Record<AssistantIntent, { message: string; suggestions: [string, string, string] }>> = {
  en: {
    GENERAL: { message: 'I can help with vaccine schedules, nearby centres, booking appointments, and fever guidance.', suggestions: ['Show vaccine schedule', 'Find nearest centre', 'Book appointment'] },
    CHILD_FEVER: { message: 'If {{child}} has mild fever after vaccination, give fluids, keep the child comfortable, and see a doctor if the fever is high or lasts more than 2 days.', suggestions: ['When to see doctor?', 'Find nearest centre', 'Show vaccine schedule'] },
    EMERGENCY: { message: 'This sounds urgent. Please call 108 immediately or go to the nearest hospital.', suggestions: ['Call 108', 'Nearest hospital', 'What to do now?'] },
    BOOK_APPOINTMENT: { message: 'I found a vaccination centre for {{child}}. You can book from the app now.', suggestions: ['Show due vaccines', 'Find another centre', 'Which documents are needed?'] },
    FIND_CENTER: { message: 'Here are the nearest vaccination centres.', suggestions: ['Book appointment', 'Which centre is free?', 'Open map'] },
    VACCINE_SCHEDULE: { message: 'Here is the vaccine schedule for {{child}}.', suggestions: ['Book appointment', 'Find nearest centre', 'Show missed vaccines'] },
  },
  hi: {
    GENERAL: { message: 'मैं टीकाकरण शेड्यूल, नज़दीकी केंद्र, अपॉइंटमेंट बुकिंग और बुखार मार्गदर्शन में मदद कर सकती हूँ।', suggestions: ['टीका शेड्यूल दिखाएँ', 'नज़दीकी केंद्र ढूँढें', 'अपॉइंटमेंट बुक करें'] },
    CHILD_FEVER: { message: 'अगर {{child}} को टीकाकरण के बाद हल्का बुखार है, तो तरल दें, आराम दें, और बुखार ज़्यादा हो या 2 दिन से अधिक रहे तो डॉक्टर को दिखाएँ।', suggestions: ['डॉक्टर को कब दिखाएँ?', 'नज़दीकी केंद्र ढूँढें', 'टीका शेड्यूल दिखाएँ'] },
    EMERGENCY: { message: 'यह आपात स्थिति लगती है। कृपया तुरंत 108 पर कॉल करें या नज़दीकी अस्पताल जाएँ।', suggestions: ['108 कॉल करें', 'नज़दीकी अस्पताल', 'अभी क्या करें?'] },
    BOOK_APPOINTMENT: { message: 'मैंने {{child}} के लिए एक टीकाकरण केंद्र ढूँढ लिया है। आप अभी ऐप से बुक कर सकते हैं।', suggestions: ['बाकी टीके दिखाएँ', 'दूसरा केंद्र ढूँढें', 'कौन से दस्तावेज़ चाहिए?'] },
    FIND_CENTER: { message: 'यह रहे आपके नज़दीकी टीकाकरण केंद्र।', suggestions: ['अपॉइंटमेंट बुक करें', 'कौन सा केंद्र मुफ्त है?', 'मैप खोलें'] },
    VACCINE_SCHEDULE: { message: 'यह रहा {{child}} का टीकाकरण शेड्यूल।', suggestions: ['अपॉइंटमेंट बुक करें', 'नज़दीकी केंद्र ढूँढें', 'छूटे टीके दिखाएँ'] },
  },
  mr: {
    GENERAL: { message: 'मी लसीकरण वेळापत्रक, जवळची केंद्रे, अपॉइंटमेंट बुकिंग आणि ताप मार्गदर्शनात मदत करू शकते.', suggestions: ['लस वेळापत्रक दाखवा', 'जवळचे केंद्र शोधा', 'अपॉइंटमेंट बुक करा'] },
    CHILD_FEVER: { message: 'जर {{child}} ला लस घेतल्यानंतर हलका ताप आला असेल तर द्रव द्या, आराम द्या, आणि ताप जास्त असेल किंवा 2 दिवसांपेक्षा जास्त टिकला तर डॉक्टरांना दाखवा.', suggestions: ['डॉक्टरांकडे कधी जावे?', 'जवळचे केंद्र शोधा', 'लस वेळापत्रक दाखवा'] },
    EMERGENCY: { message: 'ही आपत्कालीन स्थिती वाटते. कृपया त्वरित 108 वर कॉल करा किंवा जवळच्या रुग्णालयात जा.', suggestions: ['108 ला कॉल करा', 'जवळचे रुग्णालय', 'आता काय करावे?'] },
    BOOK_APPOINTMENT: { message: 'मी {{child}} साठी लसीकरण केंद्र शोधले आहे. तुम्ही आता अॅपमधून बुक करू शकता.', suggestions: ['देय लसी दाखवा', 'दुसरे केंद्र शोधा', 'कागदपत्रे कोणती लागतील?'] },
    FIND_CENTER: { message: 'ही तुमच्या जवळची लसीकरण केंद्रे आहेत.', suggestions: ['अपॉइंटमेंट बुक करा', 'कोणते केंद्र मोफत आहे?', 'नकाशा उघडा'] },
    VACCINE_SCHEDULE: { message: 'हे {{child}} चे लसीकरण वेळापत्रक आहे.', suggestions: ['अपॉइंटमेंट बुक करा', 'जवळचे केंद्र शोधा', 'चुकलेल्या लसी दाखवा'] },
  },
  ml: {
    GENERAL: { message: 'വാക്സിൻ ഷെഡ്യൂൾ, സമീപ കേന്ദ്രങ്ങൾ, ബുക്കിംഗ്, പനി മാർഗ്ഗനിർദേശം എന്നിവയിൽ ഞാൻ സഹായിക്കാം.', suggestions: ['വാക്സിൻ ഷെഡ്യൂൾ കാണിക്കുക', 'സമീപ കേന്ദ്രം കണ്ടെത്തുക', 'അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുക'] },
    CHILD_FEVER: { message: '{{child}} ന് വാക്സിൻ കഴിഞ്ഞ് ലഘു പനി ഉണ്ടെങ്കിൽ ദ്രവങ്ങൾ കൊടുക്കുക, സുഖകരമായി വയ്ക്കുക, പനി കൂടുകയോ 2 ദിവസത്തിലധികം നീളുകയോ ചെയ്താൽ ഡോക്ടറെ കാണിക്കുക.', suggestions: ['ഡോക്ടറെ എപ്പോൾ കാണണം?', 'സമീപ കേന്ദ്രം കണ്ടെത്തുക', 'വാക്സിൻ ഷെഡ്യൂൾ കാണിക്കുക'] },
    EMERGENCY: { message: 'ഇത് അത്യാഹിതം പോലെ തോന്നുന്നു. ദയവായി ഉടൻ 108-ലേക്ക് വിളിക്കുകയോ സമീപ ആശുപത്രിയിൽ പോകുകയോ ചെയ്യുക.', suggestions: ['108-ലേക്ക് വിളിക്കുക', 'സമീപ ആശുപത്രി', 'ഇപ്പോൾ എന്ത് ചെയ്യണം?'] },
    BOOK_APPOINTMENT: { message: '{{child}} ന് വേണ്ടി ഒരു വാക്സിനേഷൻ കേന്ദ്രം ഞാൻ കണ്ടെത്തി. നിങ്ങൾക്ക് ഇപ്പോൾ ആപ്പിൽ നിന്ന് ബുക്ക് ചെയ്യാം.', suggestions: ['ബാക്കി വാക്സിൻ കാണിക്കുക', 'മറ്റൊരു കേന്ദ്രം കണ്ടെത്തുക', 'എന്ത് രേഖകൾ വേണം?'] },
    FIND_CENTER: { message: 'ഇവയാണ് നിങ്ങൾക്ക് സമീപമുള്ള വാക്സിനേഷൻ കേന്ദ്രങ്ങൾ.', suggestions: ['അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുക', 'ഏത് കേന്ദ്രം സൗജന്യം?', 'മാപ്പ് തുറക്കുക'] },
    VACCINE_SCHEDULE: { message: 'ഇതാണ് {{child}} ന്റെ വാക്സിൻ ഷെഡ്യൂൾ.', suggestions: ['അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുക', 'സമീപ കേന്ദ്രം കണ്ടെത്തുക', 'മിസ് ആയ വാക്സിൻ കാണിക്കുക'] },
  },
  te: {
    GENERAL: { message: 'టీకా షెడ్యూల్, దగ్గరలోని కేంద్రాలు, అపాయింట్‌మెంట్ బుకింగ్, జ్వర సూచనల్లో నేను సహాయం చేయగలను.', suggestions: ['టీకా షెడ్యూల్ చూపించండి', 'దగ్గరలోని కేంద్రం కనుగొనండి', 'అపాయింట్‌మెంట్ బుక్ చేయండి'] },
    CHILD_FEVER: { message: '{{child}} కు టీకా తరువాత స్వల్ప జ్వరం ఉంటే ద్రవాలు ఇవ్వండి, సౌకర్యంగా ఉంచండి, జ్వరం ఎక్కువగా ఉంటే లేదా 2 రోజులకంటే ఎక్కువ ఉంటే డాక్టర్‌ను చూపించండి.', suggestions: ['డాక్టర్‌ను ఎప్పుడు చూపించాలి?', 'దగ్గరలోని కేంద్రం కనుగొనండి', 'టీకా షెడ్యూల్ చూపించండి'] },
    EMERGENCY: { message: 'ఇది అత్యవసరంగా అనిపిస్తోంది. వెంటనే 108 కు కాల్ చేయండి లేదా దగ్గరలోని ఆసుపత్రికి వెళ్లండి.', suggestions: ['108 కు కాల్ చేయండి', 'దగ్గరలోని ఆసుపత్రి', 'ఇప్పుడు ఏమి చేయాలి?'] },
    BOOK_APPOINTMENT: { message: '{{child}} కోసం నేను టీకా కేంద్రం కనుగొన్నాను. మీరు ఇప్పుడు యాప్‌లోనే బుక్ చేయవచ్చు.', suggestions: ['బాకీ టీకాలు చూపించండి', 'మరొక కేంద్రం కనుగొనండి', 'ఏ పత్రాలు అవసరం?'] },
    FIND_CENTER: { message: 'ఇవి మీకు దగ్గరలోని టీకా కేంద్రాలు.', suggestions: ['అపాయింట్‌మెంట్ బుక్ చేయండి', 'ఏ కేంద్రం ఉచితం?', 'మ్యాప్ తెరవండి'] },
    VACCINE_SCHEDULE: { message: 'ఇది {{child}} యొక్క టీకా షెడ్యూల్.', suggestions: ['అపాయింట్‌మెంట్ బుక్ చేయండి', 'దగ్గరలోని కేంద్రం కనుగొనండి', 'మిస్ అయిన టీకాలు చూపించండి'] },
  },
  kn: {
    GENERAL: { message: 'ಲಸಿಕೆ ವೇಳಾಪಟ್ಟಿ, ಹತ್ತಿರದ ಕೇಂದ್ರಗಳು, ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ಕಿಂಗ್ ಮತ್ತು ಜ್ವರ ಮಾರ್ಗದರ್ಶನದಲ್ಲಿ ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ.', suggestions: ['ಲಸಿಕೆ ವೇಳಾಪಟ್ಟಿ ತೋರಿಸಿ', 'ಹತ್ತಿರದ ಕೇಂದ್ರ ಹುಡುಕಿ', 'ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ'] },
    CHILD_FEVER: { message: '{{child}} ಗೆ ಲಸಿಕೆಯ ನಂತರ ಸಣ್ಣ ಜ್ವರ ಇದ್ದರೆ ದ್ರವ ನೀಡಿ, ಆರಾಮವಾಗಿರಿಸಿ, ಜ್ವರ ಹೆಚ್ಚು ಇದ್ದರೆ ಅಥವಾ 2 ದಿನಕ್ಕಿಂತ ಹೆಚ್ಚು ಇದ್ದರೆ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.', suggestions: ['ವೈದ್ಯರನ್ನು ಯಾವಾಗ ಭೇಟಿ ಮಾಡಬೇಕು?', 'ಹತ್ತಿರದ ಕೇಂದ್ರ ಹುಡುಕಿ', 'ಲಸಿಕೆ ವೇಳಾಪಟ್ಟಿ ತೋರಿಸಿ'] },
    EMERGENCY: { message: 'ಇದು ತುರ್ತು ಪರಿಸ್ಥಿತಿ ಅನ್ನಿಸುತ್ತದೆ. ದಯವಿಟ್ಟು ತಕ್ಷಣ 108 ಗೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗೆ ಹೋಗಿ.', suggestions: ['108 ಗೆ ಕರೆ ಮಾಡಿ', 'ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ', 'ಈಗ ಏನು ಮಾಡಬೇಕು?'] },
    BOOK_APPOINTMENT: { message: '{{child}}ಗಾಗಿ ನಾನು ಲಸಿಕೆ ಕೇಂದ್ರವನ್ನು ಕಂಡುಹಿಡಿದಿದ್ದೇನೆ. ಈಗ ಆಪ್‌ನಲ್ಲೇ ಬುಕ್ ಮಾಡಬಹುದು.', suggestions: ['ಬಾಕಿ ಲಸಿಕೆಗಳನ್ನು ತೋರಿಸಿ', 'ಮತ್ತೊಂದು ಕೇಂದ್ರ ಹುಡುಕಿ', 'ಯಾವ ದಾಖಲೆಗಳು ಬೇಕು?'] },
    FIND_CENTER: { message: 'ಇವು ನಿಮ್ಮ ಹತ್ತಿರದ ಲಸಿಕೆ ಕೇಂದ್ರಗಳು.', suggestions: ['ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ', 'ಯಾವ ಕೇಂದ್ರ ಉಚಿತ?', 'ನಕ್ಷೆ ತೆರೆಯಿರಿ'] },
    VACCINE_SCHEDULE: { message: 'ಇದು {{child}} ರ ಲಸಿಕೆ ವೇಳಾಪಟ್ಟಿ.', suggestions: ['ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ', 'ಹತ್ತಿರದ ಕೇಂದ್ರ ಹುಡುಕಿ', 'ಮಿಸ್ ಆದ ಲಸಿಕೆಗಳನ್ನು ತೋರಿಸಿ'] },
  },
  gu: {
    GENERAL: { message: 'હું રસી સમયપત્રક, નજીકના કેન્દ્રો, એપોઇન્ટમેન્ટ બુકિંગ અને તાવ માર્ગદર્શન માટે મદદ કરી શકું છું.', suggestions: ['રસી સમયપત્રક બતાવો', 'નજીકનું કેન્દ્ર શોધો', 'એપોઇન્ટમેન્ટ બુક કરો'] },
    CHILD_FEVER: { message: 'જો {{child}} ને રસી પછી હળવો તાવ હોય તો પ્રવાહી આપો, આરામ આપો અને તાવ વધુ હોય અથવા 2 દિવસથી વધુ રહે તો ડૉક્ટરને બતાવો.', suggestions: ['ડૉક્ટરને ક્યારે બતાવવું?', 'નજીકનું કેન્દ્ર શોધો', 'રસી સમયપત્રક બતાવો'] },
    EMERGENCY: { message: 'આ કટોકટી જેવી લાગે છે. કૃપા કરીને તરત 108 પર કોલ કરો અથવા નજીકની હોસ્પિટલમાં જાઓ.', suggestions: ['108 પર કોલ કરો', 'નજીકની હોસ્પિટલ', 'હવે શું કરવું?'] },
    BOOK_APPOINTMENT: { message: 'મેં {{child}} માટે રસીકરણ કેન્દ્ર શોધ્યું છે. તમે હવે એપમાંથી બુક કરી શકો છો.', suggestions: ['બાકી રસી બતાવો', 'બીજું કેન્દ્ર શોધો', 'કયા દસ્તાવેજો જોઈએ?'] },
    FIND_CENTER: { message: 'આ રહ્યા તમારા નજીકના રસીકરણ કેન્દ્રો.', suggestions: ['એપોઇન્ટમેન્ટ બુક કરો', 'કયું કેન્દ્ર મફત છે?', 'મેપ ખોલો'] },
    VACCINE_SCHEDULE: { message: 'આ છે {{child}} નું રસી સમયપત્રક.', suggestions: ['એપોઇન્ટમેન્ટ બુક કરો', 'નજીકનું કેન્દ્ર શોધો', 'છૂટી ગયેલી રસી બતાવો'] },
  },
  ta: {
    GENERAL: { message: 'தடுப்பூசி அட்டவணை, அருகிலுள்ள மையங்கள், முன்பதிவு மற்றும் காய்ச்சல் வழிகாட்டுதலில் நான் உதவ முடியும்.', suggestions: ['தடுப்பூசி அட்டவணை காட்டு', 'அருகிலுள்ள மையம் தேடு', 'முன்பதிவு செய்'] },
    CHILD_FEVER: { message: '{{child}}க்கு தடுப்பூசி எடுத்த பிறகு லேசான காய்ச்சல் இருந்தால் திரவங்கள் கொடுக்கவும், சௌகரியமாக வைத்திருக்கவும், காய்ச்சல் அதிகமாக இருந்தால் அல்லது 2 நாட்களுக்கு மேல் நீடித்தால் மருத்துவரை காணவும்.', suggestions: ['மருத்துவரை எப்போது பார்க்க வேண்டும்?', 'அருகிலுள்ள மையம் தேடு', 'தடுப்பூசி அட்டவணை காட்டு'] },
    EMERGENCY: { message: 'இது அவசர நிலை போல் தெரிகிறது. உடனே 108-ஐ அழைக்கவும் அல்லது அருகிலுள்ள மருத்துவமனைக்கு செல்லவும்.', suggestions: ['108 அழை', 'அருகிலுள்ள மருத்துவமனை', 'இப்போது என்ன செய்வது?'] },
    BOOK_APPOINTMENT: { message: '{{child}}க்காக ஒரு தடுப்பூசி மையத்தை கண்டுபிடித்துள்ளேன். இப்போது செயலியில் முன்பதிவு செய்யலாம்.', suggestions: ['நிலுவை தடுப்பூசிகள் காட்டு', 'வேறு மையம் தேடு', 'எந்த ஆவணங்கள் தேவை?'] },
    FIND_CENTER: { message: 'இவை உங்களுக்கான அருகிலுள்ள தடுப்பூசி மையங்கள்.', suggestions: ['முன்பதிவு செய்', 'எந்த மையம் இலவசம்?', 'வரைபடம் திற'] },
    VACCINE_SCHEDULE: { message: 'இது {{child}}யின் தடுப்பூசி அட்டவணை.', suggestions: ['முன்பதிவு செய்', 'அருகிலுள்ள மையம் தேடு', 'தவறிய தடுப்பூசிகள் காட்டு'] },
  },
  pa: {
    GENERAL: { message: 'ਮੈਂ ਟੀਕਾ ਸ਼ਡਿਊਲ, ਨੇੜਲੇ ਕੇਂਦਰ, ਐਪਾਇੰਟਮੈਂਟ ਬੁਕਿੰਗ ਅਤੇ ਬੁਖਾਰ ਬਾਰੇ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ।', suggestions: ['ਟੀਕਾ ਸ਼ਡਿਊਲ ਦਿਖਾਓ', 'ਨੇੜਲਾ ਕੇਂਦਰ ਲੱਭੋ', 'ਐਪਾਇੰਟਮੈਂਟ ਬੁੱਕ ਕਰੋ'] },
    CHILD_FEVER: { message: 'ਜੇ {{child}} ਨੂੰ ਟੀਕਾ ਲੱਗਣ ਤੋਂ ਬਾਅਦ ਹਲਕਾ ਬੁਖਾਰ ਹੈ ਤਾਂ ਤਰਲ ਦਿਓ, ਆਰਾਮ ਦਿਓ, ਅਤੇ ਜੇ ਬੁਖਾਰ ਜ਼ਿਆਦਾ ਹੋਵੇ ਜਾਂ 2 ਦਿਨ ਤੋਂ ਵੱਧ ਰਹੇ ਤਾਂ ਡਾਕਟਰ ਨੂੰ ਦਿਖਾਓ।', suggestions: ['ਡਾਕਟਰ ਨੂੰ ਕਦੋਂ ਦਿਖਾਈਏ?', 'ਨੇੜਲਾ ਕੇਂਦਰ ਲੱਭੋ', 'ਟੀਕਾ ਸ਼ਡਿਊਲ ਦਿਖਾਓ'] },
    EMERGENCY: { message: 'ਇਹ ਐਮਰਜੈਂਸੀ ਲੱਗਦੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਤੁਰੰਤ 108 ਤੇ ਕਾਲ ਕਰੋ ਜਾਂ ਨੇੜਲੇ ਹਸਪਤਾਲ ਜਾਓ।', suggestions: ['108 ਤੇ ਕਾਲ ਕਰੋ', 'ਨੇੜਲਾ ਹਸਪਤਾਲ', 'ਹੁਣ ਕੀ ਕਰੀਏ?'] },
    BOOK_APPOINTMENT: { message: 'ਮੈਂ {{child}} ਲਈ ਇੱਕ ਟੀਕਾਕਰਨ ਕੇਂਦਰ ਲੱਭ ਲਿਆ ਹੈ। ਤੁਸੀਂ ਹੁਣ ਐਪ ਵਿੱਚੋਂ ਬੁੱਕ ਕਰ ਸਕਦੇ ਹੋ।', suggestions: ['ਬਾਕੀ ਟੀਕੇ ਦਿਖਾਓ', 'ਹੋਰ ਕੇਂਦਰ ਲੱਭੋ', 'ਕਿਹੜੇ ਦਸਤਾਵੇਜ਼ ਚਾਹੀਦੇ ਹਨ?'] },
    FIND_CENTER: { message: 'ਇਹ ਤੁਹਾਡੇ ਨੇੜਲੇ ਟੀਕਾਕਰਨ ਕੇਂਦਰ ਹਨ।', suggestions: ['ਐਪਾਇੰਟਮੈਂਟ ਬੁੱਕ ਕਰੋ', 'ਕਿਹੜਾ ਕੇਂਦਰ ਮੁਫ਼ਤ ਹੈ?', 'ਨਕਸ਼ਾ ਖੋਲ੍ਹੋ'] },
    VACCINE_SCHEDULE: { message: 'ਇਹ {{child}} ਦਾ ਟੀਕਾ ਸ਼ਡਿਊਲ ਹੈ।', suggestions: ['ਐਪਾਇੰਟਮੈਂਟ ਬੁੱਕ ਕਰੋ', 'ਨੇੜਲਾ ਕੇਂਦਰ ਲੱਭੋ', 'ਛੁੱਟੇ ਟੀਕੇ ਦਿਖਾਓ'] },
  },
  bn: {
    GENERAL: { message: 'আমি টিকা সময়সূচী, কাছের কেন্দ্র, অ্যাপয়েন্টমেন্ট বুকিং এবং জ্বর নির্দেশনায় সাহায্য করতে পারি।', suggestions: ['টিকা সময়সূচী দেখান', 'নিকটতম কেন্দ্র খুঁজুন', 'অ্যাপয়েন্টমেন্ট বুক করুন'] },
    CHILD_FEVER: { message: 'যদি {{child}}-এর টিকা নেওয়ার পরে হালকা জ্বর থাকে, তবে তরল দিন, আরাম দিন, আর জ্বর বেশি হলে বা ২ দিনের বেশি থাকলে ডাক্তারের কাছে যান।', suggestions: ['কখন ডাক্তার দেখাব?', 'নিকটতম কেন্দ্র খুঁজুন', 'টিকা সময়সূচী দেখান'] },
    EMERGENCY: { message: 'এটি জরুরি মনে হচ্ছে। দয়া করে সঙ্গে সঙ্গে 108-এ কল করুন বা নিকটতম হাসপাতালে যান।', suggestions: ['108-এ কল করুন', 'নিকটতম হাসপাতাল', 'এখন কী করব?'] },
    BOOK_APPOINTMENT: { message: 'আমি {{child}}-এর জন্য একটি টিকাকরণ কেন্দ্র পেয়েছি। এখনই অ্যাপ থেকে বুক করতে পারেন।', suggestions: ['বাকি টিকা দেখান', 'আরেকটি কেন্দ্র খুঁজুন', 'কোন নথি লাগবে?'] },
    FIND_CENTER: { message: 'এগুলো আপনার কাছের টিকাকরণ কেন্দ্র।', suggestions: ['অ্যাপয়েন্টমেন্ট বুক করুন', 'কোন কেন্দ্র ফ্রি?', 'ম্যাপ খুলুন'] },
    VACCINE_SCHEDULE: { message: 'এটি {{child}}-এর টিকা সময়সূচী।', suggestions: ['অ্যাপয়েন্টমেন্ট বুক করুন', 'নিকটতম কেন্দ্র খুঁজুন', 'মিস হওয়া টিকা দেখান'] },
  },
  as: {
    GENERAL: { message: 'টীকা সূচী, ওচৰৰ কেন্দ্ৰ, বুকিং আৰু জ্বৰ সম্পৰ্কীয় সহায়ত মই সহায় কৰিব পাৰোঁ।', suggestions: ['টীকা সূচী দেখুৱাওক', 'ওচৰৰ কেন্দ্ৰ বিচাৰক', 'এপইণ্টমেণ্ট বুক কৰক'] },
    CHILD_FEVER: { message: 'যদি {{child}} ক টীকা লোৱাৰ পিছত হালধীয়া জ্বৰ থাকে, তেন্তে পানীয় দিয়ক, আৰাম দিয়ক, আৰু জ্বৰ বেছি হলে বা 2 দিনতকৈ বেছি থাকিলে ডাক্তৰৰ কাষ চাপক।', suggestions: ['ডাক্তৰক কেতিয়া দেখাম?', 'ওচৰৰ কেন্দ্ৰ বিচাৰক', 'টীকা সূচী দেখুৱাওক'] },
    EMERGENCY: { message: 'এইটো জৰুৰী অৱস্থা যেন লাগিছে। দয়া কৰি তৎক্ষণাত 108-ত কল কৰক অথবা ওচৰৰ হাস্পতাললৈ যাওক।', suggestions: ['108-ত কল কৰক', 'ওচৰৰ হাস্পতাল', 'এতিয়া কি কৰিম?'] },
    BOOK_APPOINTMENT: { message: 'মই {{child}} ৰ বাবে এটা টীকাকৰণ কেন্দ্ৰ বিচাৰি পাইছোঁ। আপুনি এতিয়াই এপৰ পৰা বুক কৰিব পাৰে।', suggestions: ['বাকী টীকা দেখুৱাওক', 'আন এটা কেন্দ্ৰ বিচাৰক', 'কোন নথি লাগিব?'] },
    FIND_CENTER: { message: 'এইবোৰ আপোনাৰ ওচৰৰ টীকাকৰণ কেন্দ্ৰ।', suggestions: ['এপইণ্টমেণ্ট বুক কৰক', 'কোনটো কেন্দ্ৰ বিনামূলীয়া?', 'মেপ খোলক'] },
    VACCINE_SCHEDULE: { message: 'এইটো {{child}} ৰ টীকা সূচী।', suggestions: ['এপইণ্টমেণ্ট বুক কৰক', 'ওচৰৰ কেন্দ্ৰ বিচাৰক', 'মিছ হোৱা টীকা দেখুৱাওক'] },
  },
  or: {
    GENERAL: { message: 'ମୁଁ ଟିକା ସୂଚୀ, ନିକଟସ୍ଥ କେନ୍ଦ୍ର, ବୁକିଂ ଏବଂ ଜ୍ୱର ନିର୍ଦ୍ଦେଶନାରେ ସାହାଯ୍ୟ କରିପାରିବି।', suggestions: ['ଟିକା ସୂଚୀ ଦେଖାନ୍ତୁ', 'ନିକଟସ୍ଥ କେନ୍ଦ୍ର ଖୋଜନ୍ତୁ', 'ଆପଏଣ୍ଟମେଣ୍ଟ ବୁକ କରନ୍ତୁ'] },
    CHILD_FEVER: { message: 'ଯଦି {{child}} କୁ ଟିକା ପରେ ହାଲୁକା ଜ୍ୱର ଥାଏ, ତେବେ ପାଣି ଦିଅନ୍ତୁ, ଆରାମ ଦିଅନ୍ତୁ, ଏବଂ ଜ୍ୱର ଅଧିକ ହେଲେ କିମ୍ବା 2 ଦିନରୁ ଅଧିକ ରହିଲେ ଡାକ୍ତରଙ୍କୁ ଦେଖାନ୍ତୁ।', suggestions: ['ଡାକ୍ତରଙ୍କୁ କେବେ ଦେଖାଇବି?', 'ନିକଟସ୍ଥ କେନ୍ଦ୍ର ଖୋଜନ୍ତୁ', 'ଟିକା ସୂଚୀ ଦେଖାନ୍ତୁ'] },
    EMERGENCY: { message: 'ଏହା ଜରୁରୀ ପରିସ୍ଥିତି ଲାଗୁଛି। ଦୟାକରି ତୁରନ୍ତ 108 କୁ କଲ କରନ୍ତୁ କିମ୍ବା ନିକଟସ୍ଥ ହସ୍ପିଟାଲକୁ ଯାଆନ୍ତୁ।', suggestions: ['108 କୁ କଲ କରନ୍ତୁ', 'ନିକଟସ୍ଥ ହସ୍ପିଟାଲ', 'ଏବେ କଣ କରିବି?'] },
    BOOK_APPOINTMENT: { message: 'ମୁଁ {{child}} ପାଇଁ ଟିକାକରଣ କେନ୍ଦ୍ର ଖୋଜି ପାଇଛି। ଆପଣ ଏବେ ଆପ୍‌ରୁ ବୁକ କରିପାରିବେ।', suggestions: ['ବାକି ଟିକା ଦେଖାନ୍ତୁ', 'ଆଉ ଗୋଟିଏ କେନ୍ଦ୍ର ଖୋଜନ୍ତୁ', 'କେଉଁ ଦସ୍ତାବେଜ ଦରକାର?'] },
    FIND_CENTER: { message: 'ଏହା ଆପଣଙ୍କ ନିକଟସ୍ଥ ଟିକାକରଣ କେନ୍ଦ୍ରଗୁଡିକ।', suggestions: ['ଆପଏଣ୍ଟମେଣ୍ଟ ବୁକ କରନ୍ତୁ', 'କେଉଁ କେନ୍ଦ୍ର ମାଗଣା?', 'ମ୍ୟାପ ଖୋଲନ୍ତୁ'] },
    VACCINE_SCHEDULE: { message: 'ଏହା {{child}} ଙ୍କ ଟିକା ସୂଚୀ।', suggestions: ['ଆପଏଣ୍ଟମେଣ୍ଟ ବୁକ କରନ୍ତୁ', 'ନିକଟସ୍ଥ କେନ୍ଦ୍ର ଖୋଜନ୍ତୁ', 'ଛୁଟିଯାଇଥିବା ଟିକା ଦେଖାନ୍ତୁ'] },
  },
};

const INTENT_PATTERNS: Array<{ intent: AssistantIntent; pattern: RegExp }> = [
  { intent: 'EMERGENCY', pattern: /emergency|ambulance|108|breath|unconscious|seizure|आपात|एम्बुलेंस|सांस|बेहोश|ਦੌਰਾ|ਐਮਰਜੈਂਸੀ|ਐਂਬੂਲੈਂਸ|ਸਾਹ|অ্যাম্বুলেন্স|জরুরি|শ্বাস|అత్యవసర|అంబులెన్స్|శ్వాస|அவசர|ஆம்புலன்ஸ்|சுவாச|ઇમરજન્સી|એમ્બ્યુલન્સ|શ્વાસ|അത്യാഹിത|ആംബുലൻസ്|ശ്വാസം|ଜରୁରୀ|ଆମ୍ବୁଲାନ୍ସ|শ্বাস/u },
  { intent: 'CHILD_FEVER', pattern: /fever|temperature|bukhar|paracetamol|cold|cough|बुखार|ताप|ज्वर|ਬੁਖਾਰ|জ্বর|তাপ|జ్వరం|ఉష్ణోగ్రత|காய்ச்சல்|வெப்பம்|તાવ|താപം|ജ്വരം|ଜ୍ୱର|জ্বৰ/u },
  { intent: 'BOOK_APPOINTMENT', pattern: /book|appointment|slot|बुक|अपॉइंटमेंट|बुकिंग|ਬੁੱਕ|ਐਪਾਇੰਟਮੈਂਟ|ਸਲਾਟ|বুক|অ্যাপয়েন্টমেন্ট|స్లాట్|అపాయింట్|புக்|சந்திப்பு|એપોઇન્ટમેન્ટ|બુક|അപ്പോയിന്റ്മെന്റ്|ബുക്ക്|ଆପଏଣ୍ଟମେଣ୍ଟ|বুক|এপইণ্টমেণ্ট/u },
  { intent: 'FIND_CENTER', pattern: /center|centre|hospital|clinic|nearest|nearby|map|केंद्र|अस्पताल|ਕੇਂਦਰ|ਹਸਪਤਾਲ|কেন্দ্র|হাসপাতাল|కేంద్ర|హాస్పిటల్|మ్యాప్|மையம்|மருத்துவமனை|வரைபடம்|કેન્દ્ર|હોસ્પિટલ|મેપ|കേന്ദ്രം|ആശുപത്രി|മാപ്പ്|କେନ୍ଦ୍ର|ହସ୍ପିଟାଲ|ମ୍ୟାପ|কেন্দ্ৰ|হাস্পতাল|মেপ/u },
  { intent: 'VACCINE_SCHEDULE', pattern: /schedule|vaccine|due|missed|which vaccine|immuni|टीका|शेड्यूल|बাকি|छूटा|ਟੀਕਾ|ਲਸ|ਸ਼ਡਿਊਲ|টিকা|সূচী|বাকি|టీకా|షెడ్యూల్|తదుపరి|தடுப்பூசி|அட்டவணை|રસી|સમયપત્રક|വാക്സിൻ|ഷെഡ്യൂൾ|ଟିକା|ସୂଚୀ|টীকা/u },
];

function fillTemplate(template: string, childName: string) {
  return template.replace(/\{\{child\}\}/g, childName);
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function getAssistantLocale(language: Language) {
  return LOCALES[language] ?? LOCALES.en;
}

export function getAssistantUiCopy(language: Language) {
  return UI_COPY[language] ?? UI_COPY.en;
}

export function localizeAssistantResponse(language: Language, intent: AssistantIntent, childName: string) {
  const entry = RESPONSE_COPY[language]?.[intent] ?? RESPONSE_COPY.en[intent];
  return {
    message: fillTemplate(entry.message, childName),
    suggestions: [...entry.suggestions],
  };
}

export function canonicalizeAssistantQuery(message: string): { query: string; inferredIntent: AssistantIntent | null } {
  const normalized = normalize(message);
  for (const { intent, pattern } of INTENT_PATTERNS) {
    if (pattern.test(normalized)) {
      const query =
        intent === 'BOOK_APPOINTMENT' ? 'I want to book a vaccine appointment'
        : intent === 'FIND_CENTER' ? 'Where is the nearest vaccination center?'
        : intent === 'VACCINE_SCHEDULE' ? "Show my child's vaccine schedule"
        : intent === 'CHILD_FEVER' ? 'My child has fever after vaccination, what should I do?'
        : intent === 'EMERGENCY' ? 'My child is not breathing properly, it is an emergency'
        : 'Help me with vaccination guidance';
      return { query, inferredIntent: intent };
    }
  }
  return { query: message, inferredIntent: null };
}
