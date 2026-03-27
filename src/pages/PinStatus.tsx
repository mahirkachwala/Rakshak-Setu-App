import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  Check,
  Loader2,
  Search,
  Volume2,
  X,
} from 'lucide-react';

import SwasthyaSewaGuide, { type SwasthyaSewaGuideHandle } from '@/components/SwasthyaSewaGuide';
import { useAppStore, type Language } from '@/store';

type MiddlewarePinPayload = {
  lookup?: {
    matched?: boolean;
    value?: string;
  };
  container?: {
    containerPin?: string;
  };
  outcome?: {
    code?: string;
    safeForUse?: boolean;
  };
};

type PinStatusCopy = {
  back: string;
  title: string;
  helper: string;
  codeHint: string;
  pinLabel: string;
  placeholder: string;
  check: string;
  listenAgain: string;
  safeTitle: string;
  safeSubtitle: string;
  unsafeTitle: string;
  unsafeSubtitle: string;
  notFound: string;
  unavailable: string;
  voiceIntro: string;
  voiceSafe: string;
  voiceUnsafe: string;
  voiceRetry: string;
};

const PIN_STATUS_COPY: Record<Language, PinStatusCopy> = {
  en: {
    back: 'Back',
    title: 'Check vial safety by code',
    helper: 'Enter the code printed at the bottom of the vial.',
    codeHint: 'Enter this bottom code',
    pinLabel: 'Vial code',
    placeholder: 'Enter code',
    check: 'Check',
    listenAgain: 'Listen again',
    safeTitle: 'Safe to use',
    safeSubtitle: 'This vial is safe to use.',
    unsafeTitle: 'Not safe to use',
    unsafeSubtitle: 'This vial is not safe to use.',
    notFound: 'Code not found. Please check the code and try again.',
    unavailable: 'Unable to verify this code right now. Please try again.',
    voiceIntro: 'Please enter the code printed at the bottom of this vial.',
    voiceSafe: 'This vial is safe to use.',
    voiceUnsafe: 'This vial is not safe to use.',
    voiceRetry: 'I could not verify this code. Please check the code at the bottom of the vial and try again.',
  },
  hi: {
    back: 'वापस',
    title: 'कोड से वायल की सुरक्षा जांचें',
    helper: 'वायल के नीचे छपा हुआ कोड दर्ज करें।',
    codeHint: 'नीचे वाला कोड यहाँ डालें',
    pinLabel: 'वायल कोड',
    placeholder: 'कोड दर्ज करें',
    check: 'जांचें',
    listenAgain: 'फिर सुनें',
    safeTitle: 'उपयोग के लिए सुरक्षित',
    safeSubtitle: 'यह वायल उपयोग के लिए सुरक्षित है।',
    unsafeTitle: 'उपयोग के लिए सुरक्षित नहीं',
    unsafeSubtitle: 'यह वायल उपयोग के लिए सुरक्षित नहीं है।',
    notFound: 'यह कोड नहीं मिला। कृपया कोड फिर से जांचें।',
    unavailable: 'अभी इस कोड की जांच नहीं हो पा रही है। कृपया फिर कोशिश करें।',
    voiceIntro: 'कृपया इस वायल के नीचे छपा हुआ कोड दर्ज करें।',
    voiceSafe: 'यह वायल उपयोग के लिए सुरक्षित है।',
    voiceUnsafe: 'यह वायल उपयोग के लिए सुरक्षित नहीं है।',
    voiceRetry: 'मैं इस कोड की पुष्टि नहीं कर पाई। कृपया नीचे का कोड फिर से देखकर दर्ज करें।',
  },
  mr: {
    back: 'मागे',
    title: 'कोडने व्हायल सुरक्षित आहे का ते तपासा',
    helper: 'व्हायलच्या तळाशी छापलेला कोड टाका.',
    codeHint: 'हा तळाचा कोड टाका',
    pinLabel: 'व्हायल कोड',
    placeholder: 'कोड टाका',
    check: 'तपासा',
    listenAgain: 'पुन्हा ऐका',
    safeTitle: 'वापरासाठी सुरक्षित',
    safeSubtitle: 'ही व्हायल वापरण्यास सुरक्षित आहे.',
    unsafeTitle: 'वापरासाठी सुरक्षित नाही',
    unsafeSubtitle: 'ही व्हायल वापरण्यास सुरक्षित नाही.',
    notFound: 'हा कोड सापडला नाही. कृपया कोड पुन्हा तपासा.',
    unavailable: 'आत्ता हा कोड तपासता येत नाही. कृपया पुन्हा प्रयत्न करा.',
    voiceIntro: 'कृपया या व्हायलच्या तळाशी छापलेला कोड टाका.',
    voiceSafe: 'ही व्हायल वापरण्यास सुरक्षित आहे.',
    voiceUnsafe: 'ही व्हायल वापरण्यास सुरक्षित नाही.',
    voiceRetry: 'हा कोड पडताळता आला नाही. कृपया तळाशी असलेला कोड पुन्हा पाहून टाका.',
  },
  bn: {
    back: 'ফিরুন',
    title: 'কোড দিয়ে ভায়ালের সুরক্ষা দেখুন',
    helper: 'ভায়ালের নিচে লেখা কোডটি লিখুন।',
    codeHint: 'নিচের কোডটি দিন',
    pinLabel: 'ভায়াল কোড',
    placeholder: 'কোড লিখুন',
    check: 'দেখুন',
    listenAgain: 'আবার শুনুন',
    safeTitle: 'ব্যবহারের জন্য নিরাপদ',
    safeSubtitle: 'এই ভায়াল ব্যবহার করা নিরাপদ।',
    unsafeTitle: 'ব্যবহারের জন্য নিরাপদ নয়',
    unsafeSubtitle: 'এই ভায়াল ব্যবহার করা নিরাপদ নয়।',
    notFound: 'এই কোডটি পাওয়া যায়নি। আবার দেখে লিখুন।',
    unavailable: 'এখন এই কোড যাচাই করা যাচ্ছে না। আবার চেষ্টা করুন।',
    voiceIntro: 'অনুগ্রহ করে এই ভায়ালের নিচে লেখা কোডটি লিখুন।',
    voiceSafe: 'এই ভায়াল ব্যবহার করা নিরাপদ।',
    voiceUnsafe: 'এই ভায়াল ব্যবহার করা নিরাপদ নয়।',
    voiceRetry: 'আমি এই কোড যাচাই করতে পারিনি। অনুগ্রহ করে নিচের কোডটি আবার দেখে লিখুন।',
  },
  te: {
    back: 'వెనక్కి',
    title: 'కోడ్‌తో వైయల్ సురక్షితమా చూడండి',
    helper: 'వైయల్ కింద ఉన్న కోడ్‌ను నమోదు చేయండి.',
    codeHint: 'కింద ఉన్న కోడ్‌ను ఇవ్వండి',
    pinLabel: 'వైయల్ కోడ్',
    placeholder: 'కోడ్ నమోదు చేయండి',
    check: 'చూడండి',
    listenAgain: 'మళ్లీ వినండి',
    safeTitle: 'వినియోగానికి సురక్షితం',
    safeSubtitle: 'ఈ వైయల్ వినియోగానికి సురక్షితం.',
    unsafeTitle: 'వినియోగానికి సురక్షితం కాదు',
    unsafeSubtitle: 'ఈ వైయల్ వినియోగానికి సురక్షితం కాదు.',
    notFound: 'ఈ కోడ్ కనబడలేదు. దయచేసి కోడ్‌ను మళ్లీ చూసి నమోదు చేయండి.',
    unavailable: 'ప్రస్తుతం ఈ కోడ్‌ను పరిశీలించలేకపోతున్నాం. మళ్లీ ప్రయత్నించండి.',
    voiceIntro: 'దయచేసి ఈ వైయల్ కింద ఉన్న కోడ్‌ను నమోదు చేయండి.',
    voiceSafe: 'ఈ వైయల్ వినియోగానికి సురక్షితం.',
    voiceUnsafe: 'ఈ వైయల్ వినియోగానికి సురక్షితం కాదు.',
    voiceRetry: 'ఈ కోడ్‌ను ధృవీకరించలేకపోయాను. దయచేసి కింద ఉన్న కోడ్‌ను మళ్లీ చూసి నమోదు చేయండి.',
  },
  ta: {
    back: 'பின்னால்',
    title: 'கோடால் வயல் பாதுகாப்பை பார்க்கவும்',
    helper: 'வயலின் அடியில் உள்ள கோடை உள்ளிடுங்கள்.',
    codeHint: 'கீழே இருக்கும் கோடை இடுங்கள்',
    pinLabel: 'வயல் கோடு',
    placeholder: 'கோடை உள்ளிடுங்கள்',
    check: 'சரி பார்க்க',
    listenAgain: 'மீண்டும் கேளுங்கள்',
    safeTitle: 'பயன்படுத்த பாதுகாப்பானது',
    safeSubtitle: 'இந்த வயல் பயன்படுத்த பாதுகாப்பானது.',
    unsafeTitle: 'பயன்படுத்த பாதுகாப்பில்லை',
    unsafeSubtitle: 'இந்த வயல் பயன்படுத்த பாதுகாப்பில்லை.',
    notFound: 'இந்த கோடு கிடைக்கவில்லை. தயவு செய்து மீண்டும் சரிபார்க்கவும்.',
    unavailable: 'இப்போது இந்த கோடை சரிபார்க்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    voiceIntro: 'தயவு செய்து இந்த வயலின் அடியில் உள்ள கோடை உள்ளிடுங்கள்.',
    voiceSafe: 'இந்த வயல் பயன்படுத்த பாதுகாப்பானது.',
    voiceUnsafe: 'இந்த வயல் பயன்படுத்த பாதுகாப்பில்லை.',
    voiceRetry: 'இந்த கோடை சரிபார்க்க முடியவில்லை. தயவு செய்து கீழே உள்ள கோடை மீண்டும் பார்த்து உள்ளிடுங்கள்.',
  },
  kn: {
    back: 'ಹಿಂದೆ',
    title: 'ಕೋಡ್ ಮೂಲಕ ವೈಯಲ್ ಸುರಕ್ಷತೆ ನೋಡಿ',
    helper: 'ವೈಯಲ್ ಕೆಳಭಾಗದಲ್ಲಿರುವ ಕೋಡ್ ಅನ್ನು ನಮೂದಿಸಿ.',
    codeHint: 'ಕೆಳಗಿನ ಕೋಡ್ ಹಾಕಿ',
    pinLabel: 'ವೈಯಲ್ ಕೋಡ್',
    placeholder: 'ಕೋಡ್ ನಮೂದಿಸಿ',
    check: 'ಪರಿಶೀಲಿಸಿ',
    listenAgain: 'ಮತ್ತೆ ಕೇಳಿ',
    safeTitle: 'ಬಳಕೆಗಾಗಿ ಸುರಕ್ಷಿತ',
    safeSubtitle: 'ಈ ವೈಯಲ್ ಬಳಕೆಗಾಗಿ ಸುರಕ್ಷಿತವಾಗಿದೆ.',
    unsafeTitle: 'ಬಳಕೆಗಾಗಿ ಸುರಕ್ಷಿತವಲ್ಲ',
    unsafeSubtitle: 'ಈ ವೈಯಲ್ ಬಳಕೆಗಾಗಿ ಸುರಕ್ಷಿತವಲ್ಲ.',
    notFound: 'ಈ ಕೋಡ್ ಸಿಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪರಿಶೀಲಿಸಿ.',
    unavailable: 'ಈಗ ಈ ಕೋಡ್ ಪರಿಶೀಲಿಸಲು ಆಗುತ್ತಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    voiceIntro: 'ದಯವಿಟ್ಟು ಈ ವೈಯಲ್‌ನ ಕೆಳಭಾಗದಲ್ಲಿರುವ ಕೋಡ್ ಅನ್ನು ನಮೂದಿಸಿ.',
    voiceSafe: 'ಈ ವೈಯಲ್ ಬಳಕೆಗಾಗಿ ಸುರಕ್ಷಿತವಾಗಿದೆ.',
    voiceUnsafe: 'ಈ ವೈಯಲ್ ಬಳಕೆಗಾಗಿ ಸುರಕ್ಷಿತವಲ್ಲ.',
    voiceRetry: 'ಈ ಕೋಡ್ ದೃಢಪಡಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಕೆಳಗಿನ ಕೋಡ್ ಅನ್ನು ಮತ್ತೆ ನೋಡಿ ನಮೂದಿಸಿ.',
  },
  gu: {
    back: 'પાછા',
    title: 'કોડથી વાયલ સુરક્ષા તપાસો',
    helper: 'વાયલની નીચે લખેલો કોડ દાખલ કરો.',
    codeHint: 'નીચેનો કોડ અહીં નાખો',
    pinLabel: 'વાયલ કોડ',
    placeholder: 'કોડ દાખલ કરો',
    check: 'તપાસો',
    listenAgain: 'ફરી સાંભળો',
    safeTitle: 'વપરાશ માટે સુરક્ષિત',
    safeSubtitle: 'આ વાયલ વપરાશ માટે સુરક્ષિત છે.',
    unsafeTitle: 'વપરાશ માટે સુરક્ષિત નથી',
    unsafeSubtitle: 'આ વાયલ વપરાશ માટે સુરક્ષિત નથી.',
    notFound: 'આ કોડ મળ્યો નથી. કૃપા કરીને ફરી તપાસો.',
    unavailable: 'હમણાં આ કોડ ચકાસી શકાતો નથી. ફરી પ્રયત્ન કરો.',
    voiceIntro: 'કૃપા કરીને આ વાયલની નીચે લખેલો કોડ દાખલ કરો.',
    voiceSafe: 'આ વાયલ વપરાશ માટે સુરક્ષિત છે.',
    voiceUnsafe: 'આ વાયલ વપરાશ માટે સુરક્ષિત નથી.',
    voiceRetry: 'હું આ કોડ ચકાસી શકી નથી. કૃપા કરીને નીચેનો કોડ ફરી જોઈને દાખલ કરો.',
  },
  ml: {
    back: 'തിരിച്ച്',
    title: 'കോഡ് ഉപയോഗിച്ച് വയല്‍ സുരക്ഷ കാണുക',
    helper: 'വയലിന്റെ അടിയില്‍ ഉള്ള കോഡ് നല്‍കുക.',
    codeHint: 'താഴെയുള്ള കോഡ് ഇവിടെ ഇടുക',
    pinLabel: 'വയല്‍ കോഡ്',
    placeholder: 'കോഡ് നല്‍കുക',
    check: 'പരിശോധിക്കുക',
    listenAgain: 'വീണ്ടും കേൾക്കൂ',
    safeTitle: 'ഉപയോഗത്തിന് സുരക്ഷിതം',
    safeSubtitle: 'ഈ വയല്‍ ഉപയോഗിക്കാന്‍ സുരക്ഷിതമാണ്.',
    unsafeTitle: 'ഉപയോഗത്തിന് സുരക്ഷിതമല്ല',
    unsafeSubtitle: 'ഈ വയല്‍ ഉപയോഗിക്കാന്‍ സുരക്ഷിതമല്ല.',
    notFound: 'ഈ കോഡ് കണ്ടെത്താനായില്ല. ദയവായി വീണ്ടും പരിശോധിക്കുക.',
    unavailable: 'ഇപ്പോൾ ഈ കോഡ് പരിശോധിക്കാൻ കഴിയുന്നില്ല. വീണ്ടും ശ്രമിക്കുക.',
    voiceIntro: 'ദയവായി ഈ വയലിന്റെ അടിയില്‍ ഉള്ള കോഡ് നല്‍കുക.',
    voiceSafe: 'ഈ വയല്‍ ഉപയോഗിക്കാന്‍ സുരക്ഷിതമാണ്.',
    voiceUnsafe: 'ഈ വയല്‍ ഉപയോഗിക്കാന്‍ സുരക്ഷിതമല്ല.',
    voiceRetry: 'ഈ കോഡ് പരിശോധിക്കാനായില്ല. ദയവായി താഴെയുള്ള കോഡ് വീണ്ടും നോക്കി നല്‍കുക.',
  },
  pa: {
    back: 'ਵਾਪਸ',
    title: 'ਕੋਡ ਨਾਲ ਵਾਇਲ ਦੀ ਸੁਰੱਖਿਆ ਦੇਖੋ',
    helper: 'ਵਾਇਲ ਦੇ ਹੇਠਾਂ ਲਿਖਿਆ ਕੋਡ ਦਰਜ ਕਰੋ।',
    codeHint: 'ਹੇਠਾਂ ਵਾਲਾ ਕੋਡ ਇੱਥੇ ਪਾਓ',
    pinLabel: 'ਵਾਇਲ ਕੋਡ',
    placeholder: 'ਕੋਡ ਦਰਜ ਕਰੋ',
    check: 'ਚੈੱਕ ਕਰੋ',
    listenAgain: 'ਫਿਰ ਸੁਣੋ',
    safeTitle: 'ਵਰਤੋਂ ਲਈ ਸੁਰੱਖਿਅਤ',
    safeSubtitle: 'ਇਹ ਵਾਇਲ ਵਰਤੋਂ ਲਈ ਸੁਰੱਖਿਅਤ ਹੈ।',
    unsafeTitle: 'ਵਰਤੋਂ ਲਈ ਸੁਰੱਖਿਅਤ ਨਹੀਂ',
    unsafeSubtitle: 'ਇਹ ਵਾਇਲ ਵਰਤੋਂ ਲਈ ਸੁਰੱਖਿਅਤ ਨਹੀਂ ਹੈ।',
    notFound: 'ਇਹ ਕੋਡ ਨਹੀਂ ਮਿਲਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਮੁੜ ਚੈੱਕ ਕਰੋ।',
    unavailable: 'ਇਸ ਵੇਲੇ ਇਹ ਕੋਡ ਜਾਂਚਿਆ ਨਹੀਂ ਜਾ ਸਕਦਾ। ਕਿਰਪਾ ਕਰਕੇ ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    voiceIntro: 'ਕਿਰਪਾ ਕਰਕੇ ਇਸ ਵਾਇਲ ਦੇ ਹੇਠਾਂ ਲਿਖਿਆ ਕੋਡ ਦਰਜ ਕਰੋ।',
    voiceSafe: 'ਇਹ ਵਾਇਲ ਵਰਤੋਂ ਲਈ ਸੁਰੱਖਿਅਤ ਹੈ।',
    voiceUnsafe: 'ਇਹ ਵਾਇਲ ਵਰਤੋਂ ਲਈ ਸੁਰੱਖਿਅਤ ਨਹੀਂ ਹੈ।',
    voiceRetry: 'ਮੈਂ ਇਸ ਕੋਡ ਦੀ ਪੁਸ਼ਟੀ ਨਹੀਂ ਕਰ ਸਕੀ। ਕਿਰਪਾ ਕਰਕੇ ਹੇਠਾਂ ਵਾਲਾ ਕੋਡ ਮੁੜ ਦੇਖ ਕੇ ਦਰਜ ਕਰੋ।',
  },
  or: {
    back: 'ପଛକୁ',
    title: 'କୋଡ୍ ଦେଇ ଭାଇଆଲ୍ ସୁରକ୍ଷା ଦେଖନ୍ତୁ',
    helper: 'ଭାଇଆଲ୍‌ର ତଳେ ଥିବା କୋଡ୍ ଲେଖନ୍ତୁ।',
    codeHint: 'ତଳର କୋଡ୍ ଏଠାରେ ଦିଅନ୍ତୁ',
    pinLabel: 'ଭାଇଆଲ୍ କୋଡ୍',
    placeholder: 'କୋଡ୍ ଲେଖନ୍ତୁ',
    check: 'ଦେଖନ୍ତୁ',
    listenAgain: 'ପୁଣି ଶୁଣନ୍ତୁ',
    safeTitle: 'ବ୍ୟବହାର ପାଇଁ ସୁରକ୍ଷିତ',
    safeSubtitle: 'ଏହି ଭାଇଆଲ୍ ବ୍ୟବହାର ପାଇଁ ସୁରକ୍ଷିତ।',
    unsafeTitle: 'ବ୍ୟବହାର ପାଇଁ ସୁରକ୍ଷିତ ନୁହେଁ',
    unsafeSubtitle: 'ଏହି ଭାଇଆଲ୍ ବ୍ୟବହାର ପାଇଁ ସୁରକ୍ଷିତ ନୁହେଁ।',
    notFound: 'ଏହି କୋଡ୍ ମିଳିଲା ନାହିଁ। ଦୟାକରି ପୁଣି ଯାଞ୍ଚ କରନ୍ତୁ।',
    unavailable: 'ଏବେ ଏହି କୋଡ୍ ଯାଞ୍ଚ କରାଯାଇପାରୁନାହିଁ। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
    voiceIntro: 'ଦୟାକରି ଏହି ଭାଇଆଲ୍‌ର ତଳେ ଥିବା କୋଡ୍ ଲେଖନ୍ତୁ।',
    voiceSafe: 'ଏହି ଭାଇଆଲ୍ ବ୍ୟବହାର ପାଇଁ ସୁରକ୍ଷିତ।',
    voiceUnsafe: 'ଏହି ଭାଇଆଲ୍ ବ୍ୟବହାର ପାଇଁ ସୁରକ୍ଷିତ ନୁହେଁ।',
    voiceRetry: 'ମୁଁ ଏହି କୋଡ୍ ଯାଞ୍ଚ କରିପାରିଲି ନାହିଁ। ଦୟାକରି ତଳର କୋଡ୍ ପୁଣି ଦେଖି ଲେଖନ୍ତୁ।',
  },
  as: {
    back: 'উভতি যাওক',
    title: "ক'ডেৰে ভায়েলৰ সুৰক্ষা চাওক",
    helper: "ভায়েলৰ তলত লিখা ক'ডটো লিখক।",
    codeHint: "তলৰ ক'ডটো ইয়াত দিয়ক",
    pinLabel: "ভায়েল ক'ড",
    placeholder: "ক'ড লিখক",
    check: 'চাওক',
    listenAgain: 'আকৌ শুনক',
    safeTitle: 'ব্যৱহাৰৰ বাবে সুৰক্ষিত',
    safeSubtitle: 'এই ভায়েল ব্যৱহাৰৰ বাবে সুৰক্ষিত।',
    unsafeTitle: 'ব্যৱহাৰৰ বাবে সুৰক্ষিত নহয়',
    unsafeSubtitle: 'এই ভায়েল ব্যৱহাৰৰ বাবে সুৰক্ষিত নহয়।',
    notFound: "এই ক'ডটো পোৱা নগ'ল। অনুগ্ৰহ কৰি পুনৰ চাই লিখক।",
    unavailable: "এতিয়া এই ক'ডটো যাচাই কৰিব পৰা নাই। পুনৰ চেষ্টা কৰক।",
    voiceIntro: "অনুগ্ৰহ কৰি এই ভায়েলৰ তলত লিখা ক'ডটো লিখক।",
    voiceSafe: 'এই ভায়েল ব্যৱহাৰৰ বাবে সুৰক্ষিত।',
    voiceUnsafe: 'এই ভায়েল ব্যৱহাৰৰ বাবে সুৰক্ষিত নহয়।',
    voiceRetry: "মই এই ক'ডটো যাচাই কৰিব নোৱাৰিলোঁ। অনুগ্ৰহ কৰি তলৰ ক'ডটো পুনৰ চাই লিখক।",
  },
};

const STORAGE_KEY = 'raksha-setu-container-pin';

function getOutcomeState(payload: MiddlewarePinPayload | null) {
  if (!payload) return null;
  return payload.outcome?.safeForUse || payload.outcome?.code === 'SAFE_FOR_USE' ? 'safe' : 'unsafe';
}

function VialPinDemo({ hint }: { hint: string }) {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-blue-100 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_55%),linear-gradient(180deg,_#f8fbff_0%,_#eff6ff_100%)] px-4 py-5 shadow-sm dark:border-blue-900/40 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_55%),linear-gradient(180deg,_rgba(15,23,42,0.98)_0%,_rgba(15,23,42,0.94)_100%)]">
      <div className="relative mx-auto h-[270px] w-full max-w-[300px]">
        <div className="absolute right-2 top-5 max-w-[132px] rounded-2xl bg-white px-3 py-2 text-[11px] font-bold leading-5 text-blue-700 shadow-sm ring-1 ring-blue-100 dark:bg-slate-900 dark:text-blue-300 dark:ring-blue-900/50">
          {hint}
        </div>

        <div className="absolute right-[118px] top-12 h-[110px] w-px bg-blue-300 dark:bg-blue-700" />
        <ArrowDown className="absolute right-[106px] top-[150px] h-8 w-8 animate-bounce text-blue-500 dark:text-blue-300" />

        <div className="absolute left-1/2 top-2 flex -translate-x-1/2 flex-col items-center">
          <div className="h-8 w-24 rounded-t-[18px] bg-gradient-to-b from-sky-500 to-blue-700 shadow-md" />
          <div className="-mt-1 h-4 w-12 rounded-b-xl bg-blue-800/90" />
        </div>

        <div className="absolute left-1/2 top-10 h-[185px] w-[134px] -translate-x-1/2 rounded-[34px] border-[5px] border-blue-100 bg-white shadow-[0_30px_60px_-40px_rgba(37,99,235,0.55)] dark:border-slate-700 dark:bg-slate-900">
          <div className="absolute inset-x-3 top-5 rounded-[22px] border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-100 px-3 py-5 text-center shadow-inner dark:border-sky-900/40 dark:from-sky-950/40 dark:to-blue-950/40">
            <div className="mx-auto h-9 w-9 rounded-full bg-blue-600/10" />
            <div className="mt-3 space-y-1">
              <div className="mx-auto h-2 w-16 rounded-full bg-blue-200 dark:bg-blue-900/40" />
              <div className="mx-auto h-2 w-12 rounded-full bg-blue-100 dark:bg-blue-950/40" />
            </div>
          </div>

          <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center shadow-sm dark:border-amber-900/40 dark:bg-amber-950/30">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600 dark:text-amber-300">
              PIN
            </p>
            <p className="mt-1 text-lg font-black tracking-[0.22em] text-amber-700 dark:text-amber-100">
              472901
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type PinStatusCardProps = {
  embedded?: boolean;
  className?: string;
};

export function PinStatusCard({ embedded = false, className = '' }: PinStatusCardProps) {
  const language = useAppStore((state) => state.language);
  const copy = PIN_STATUS_COPY[language] ?? PIN_STATUS_COPY.en;
  const guideRef = useRef<SwasthyaSewaGuideHandle | null>(null);
  const apiBase = useMemo(() => import.meta.env.BASE_URL.replace(/\/$/, ''), []);

  const [pin, setPin] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<MiddlewarePinPayload | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [voiceReplayToken, setVoiceReplayToken] = useState(0);

  const outcomeState = getOutcomeState(payload);
  const voicePrompt = useMemo(() => {
    if (lookupError) return copy.voiceRetry;
    if (outcomeState === 'safe') return copy.voiceSafe;
    if (outcomeState === 'unsafe') return copy.voiceUnsafe;
    return copy.voiceIntro;
  }, [copy, lookupError, outcomeState]);

  useEffect(() => {
    setVoiceReplayToken((value) => value + 1);
  }, [voicePrompt]);

  const handleLookup = async () => {
    const trimmedPin = pin.trim();
    if (!trimmedPin) {
      setPayload(null);
      setLookupError(copy.notFound);
      return;
    }

    setLoading(true);
    setLookupError('');

    try {
      const response = await fetch(
        `${apiBase}/api/hardware/middleware/pins/${encodeURIComponent(trimmedPin)}`,
      );
      const text = await response.text();
      const parsed = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error('lookup_failed');
      }

      const nextPayload = parsed as MiddlewarePinPayload;
      if (nextPayload.lookup?.matched === false) {
        setPayload(null);
        setLookupError(copy.notFound);
        return;
      }

      setPayload(nextPayload);
      try {
        localStorage.setItem(STORAGE_KEY, trimmedPin);
      } catch {
        // Ignore local storage failures.
      }
    } catch {
      setPayload(null);
      setLookupError(copy.unavailable);
    } finally {
      setLoading(false);
    }
  };

  const isSafe = outcomeState === 'safe';

  return (
    <div className={embedded ? className : `min-h-full bg-gray-50 px-4 py-4 dark:bg-gray-950 ${className}`.trim()}>
      <SwasthyaSewaGuide
        ref={guideRef}
        prompt={voicePrompt}
        language={language}
        replayToken={voiceReplayToken}
        autoSpeak
        showUi={false}
      />

      <div className={`mx-auto flex w-full ${embedded ? 'max-w-none flex-col gap-3' : 'max-w-2xl flex-col gap-4'}`}>
        <section className={`relative overflow-hidden rounded-[32px] border shadow-sm dark:border-gray-800 dark:bg-gray-900 ${
          embedded
            ? 'border-blue-100 bg-slate-50/70 p-4 dark:border-blue-900/40 dark:bg-slate-950/40'
            : 'border-slate-200 bg-white p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]'
        }`}>
          {!embedded && <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-100/60 blur-3xl dark:bg-blue-900/20" />}
          {!embedded && <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-cyan-100/60 blur-3xl dark:bg-cyan-900/20" />}

          <div className="relative flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div className="max-w-xl">
                <p className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                  {copy.pinLabel}
                </p>
                <h1 className={`mt-3 font-black tracking-tight text-gray-900 dark:text-white ${embedded ? 'text-lg sm:text-xl' : 'text-2xl'}`}>
                  {copy.title}
                </h1>
                <p className={`mt-2 leading-6 text-gray-600 dark:text-gray-300 ${embedded ? 'text-[13px]' : 'text-sm'}`}>
                  {copy.helper}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void guideRef.current?.replay()}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
              >
                <Volume2 size={14} />
                {copy.listenAgain}
              </button>
            </div>

            <div className={`grid gap-5 ${embedded ? 'lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-center' : ''}`}>
              <div>
                <VialPinDemo hint={copy.codeHint} />
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {copy.pinLabel}
                  </span>
                  <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-blue-500 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:bg-gray-900">
                    <Search size={18} className="text-gray-400" />
                    <input
                      value={pin}
                      onChange={(event) => setPin(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void handleLookup();
                        }
                      }}
                      inputMode="numeric"
                      placeholder={copy.placeholder}
                      className="w-full bg-transparent text-base font-semibold text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                    />
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => void handleLookup()}
                  disabled={loading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  {copy.check}
                </button>

                {lookupError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                    {lookupError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {payload && outcomeState && (
          <section
            className={`rounded-[32px] border p-5 shadow-sm ${
              isSafe
                ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:border-green-900 dark:from-green-950/30 dark:to-emerald-950/20'
                : 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50 dark:border-red-900 dark:from-red-950/30 dark:to-rose-950/20'
            }`}
          >
            <div className={`flex flex-col items-center text-center ${embedded ? 'sm:flex-row sm:items-center sm:justify-between sm:text-left' : ''}`}>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div
                  className={`flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm ${
                    isSafe
                      ? 'text-green-600 dark:bg-gray-900 dark:text-green-400'
                      : 'text-red-600 dark:bg-gray-900 dark:text-red-400'
                  }`}
                >
                  {isSafe ? <Check size={64} strokeWidth={3.5} /> : <X size={64} strokeWidth={3.5} />}
                </div>

                <div>
                  <h2
                    className={`text-2xl font-black tracking-tight ${
                      isSafe ? 'text-green-800 dark:text-green-100' : 'text-red-800 dark:text-red-100'
                    }`}
                  >
                    {isSafe ? copy.safeTitle : copy.unsafeTitle}
                  </h2>

                  <p
                    className={`mt-2 text-sm font-semibold ${
                      isSafe ? 'text-green-700 dark:text-green-200' : 'text-red-700 dark:text-red-200'
                    }`}
                  >
                    {isSafe ? copy.safeSubtitle : copy.unsafeSubtitle}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm dark:bg-gray-900 dark:text-gray-200 sm:mt-0">
                {payload.container?.containerPin || payload.lookup?.value || pin.trim()}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function PinStatus() {
  return <PinStatusCard />;
}
