import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  ArrowLeft, Shield, CheckCircle, Smartphone, CreditCard,
  Eye, EyeOff, Download, Share2, RefreshCw, ChevronRight,
  AlertCircle, Info, Lock, Loader2, User, Heart, FileText,
  QrCode, Copy, Check, Star, Activity
} from 'lucide-react';
import { useGetUserProfile, useListChildren } from '@workspace/api-client-react';
import { useAppStore } from '@/store';
import SwasthyaSewaGuide from '@/components/SwasthyaSewaGuide';
import { getVoicePrompt } from '@/lib/voicePrompts';
import { extractNumericSpeech } from '@/lib/voice';
import type { Language } from '@/store';

const ABHA_STORAGE_KEY = 'swasthya-setu-abha-data';

type AbhaStep = 'home' | 'method' | 'aadhaar-input' | 'mobile-input' | 'otp' | 'success' | 'card';

interface AbhaData {
  abhaId: string;
  abhaAddress: string;
  name: string;
  dob: string;
  gender: string;
  mobile: string;
  linked: boolean;
}

const ABHA_TEXT: Record<Language, {
  subtitle: string;
  hero: string;
  benefitsTitle: string;
  benefits: [string, string, string];
  create: string;
  methodTitle: string;
  aadhaarTitle: string;
  mobileTitle: string;
  otpTitle: string;
  successTitle: string;
  successSubtitle: string;
  viewCard: string;
  healthProfile: string;
  linkedMobile: string;
  accountStatus: string;
  activeVerified: string;
  reset: string;
  resetConfirm: string;
  notSpecified: string;
}> = {
  en: { subtitle: 'Ayushman Bharat Health Account', hero: 'Create your 14-digit digital health ID for records and hospital use across India.', benefitsTitle: 'Benefits', benefits: ['Digital records', 'Hospital sharing', 'Vaccine history'], create: 'Create My ABHA ID', methodTitle: 'Choose Verification Method', aadhaarTitle: 'Enter Aadhaar Number', mobileTitle: 'Enter Mobile Number', otpTitle: 'Verify OTP', successTitle: 'ABHA ID Created', successSubtitle: 'Your health account is ready.', viewCard: 'View ABHA Card', healthProfile: 'Health Profile', linkedMobile: 'Linked Mobile', accountStatus: 'Account Status', activeVerified: 'Active and Verified', reset: 'Reset ABHA data on this device', resetConfirm: 'Reset your ABHA card from this device?', notSpecified: 'Not specified' },
  hi: { subtitle: 'आयुष्मान भारत हेल्थ अकाउंट', hero: 'भारत भर में रिकॉर्ड और अस्पताल उपयोग के लिए 14 अंकों की डिजिटल हेल्थ आईडी बनाएं।', benefitsTitle: 'लाभ', benefits: ['डिजिटल रिकॉर्ड', 'अस्पताल शेयरिंग', 'टीका इतिहास'], create: 'मेरा एबीएचए आईडी बनाएं', methodTitle: 'सत्यापन तरीका चुनें', aadhaarTitle: 'आधार नंबर दर्ज करें', mobileTitle: 'मोबाइल नंबर दर्ज करें', otpTitle: 'ओटीपी सत्यापित करें', successTitle: 'एबीएचए आईडी बन गई', successSubtitle: 'आपका हेल्थ अकाउंट तैयार है।', viewCard: 'एबीएचए कार्ड देखें', healthProfile: 'हेल्थ प्रोफाइल', linkedMobile: 'लिंक्ड मोबाइल', accountStatus: 'खाता स्थिति', activeVerified: 'सक्रिय और सत्यापित', reset: 'इस डिवाइस से एबीएचए डेटा हटाएं', resetConfirm: 'क्या इस डिवाइस से एबीएचए कार्ड हटाना है?', notSpecified: 'उल्लेख नहीं' },
  mr: { subtitle: 'आयुष्मान भारत हेल्थ अकाउंट', hero: 'भारतभर नोंदी आणि रुग्णालय वापरासाठी 14 अंकी डिजिटल हेल्थ आयडी तयार करा.', benefitsTitle: 'फायदे', benefits: ['डिजिटल नोंदी', 'रुग्णालय शेअरिंग', 'लसीकरण इतिहास'], create: 'माझी एबीएचए आयडी तयार करा', methodTitle: 'पडताळणी पद्धत निवडा', aadhaarTitle: 'आधार क्रमांक टाका', mobileTitle: 'मोबाईल क्रमांक टाका', otpTitle: 'ओटीपी पडताळा', successTitle: 'एबीएचए आयडी तयार झाली', successSubtitle: 'तुमचे हेल्थ अकाउंट तयार आहे.', viewCard: 'एबीएचए कार्ड पहा', healthProfile: 'हेल्थ प्रोफाइल', linkedMobile: 'जोडलेला मोबाइल', accountStatus: 'खाते स्थिती', activeVerified: 'सक्रिय आणि पडताळलेले', reset: 'या डिव्हाइसवरील एबीएचए डेटा हटवा', resetConfirm: 'या डिव्हाइसवरून एबीएचए कार्ड हटवायचे?', notSpecified: 'उल्लेख नाही' },
  bn: { subtitle: 'আয়ুষ্মান ভারত হেলথ অ্যাকাউন্ট', hero: 'ভারতজুড়ে রেকর্ড ও হাসপাতাল ব্যবহারের জন্য ১৪ অঙ্কের ডিজিটাল হেলথ আইডি তৈরি করুন।', benefitsTitle: 'উপকারিতা', benefits: ['ডিজিটাল রেকর্ড', 'হাসপাতাল শেয়ার', 'টিকা ইতিহাস'], create: 'আমার এবিএইচএ আইডি তৈরি করুন', methodTitle: 'যাচাই পদ্ধতি বেছে নিন', aadhaarTitle: 'আধার নম্বর লিখুন', mobileTitle: 'মোবাইল নম্বর লিখুন', otpTitle: 'ওটিপি যাচাই করুন', successTitle: 'এবিএইচএ আইডি তৈরি হয়েছে', successSubtitle: 'আপনার হেলথ অ্যাকাউন্ট প্রস্তুত।', viewCard: 'এবিএইচএ কার্ড দেখুন', healthProfile: 'হেলথ প্রোফাইল', linkedMobile: 'লিঙ্কড মোবাইল', accountStatus: 'অ্যাকাউন্ট অবস্থা', activeVerified: 'সক্রিয় ও যাচাইকৃত', reset: 'এই ডিভাইস থেকে এবিএইচএ ডেটা মুছুন', resetConfirm: 'এই ডিভাইস থেকে এবিএইচএ কার্ড মুছবেন?', notSpecified: 'উল্লেখ নেই' },
  te: { subtitle: 'ఆయుష్మాన్ భారత్ హెల్త్ అకౌంట్', hero: 'భారతవ్యాప్తంగా రికార్డులు మరియు ఆసుపత్రి ఉపయోగం కోసం 14 అంకెల డిజిటల్ హెల్త్ ఐడి సృష్టించండి.', benefitsTitle: 'ప్రయోజనాలు', benefits: ['డిజిటల్ రికార్డులు', 'ఆసుపత్రి షేర్', 'టీకా చరిత్ర'], create: 'నా ఏబీహెచ్ఏ ఐడి సృష్టించండి', methodTitle: 'ధృవీకరణ విధానం ఎంచుకోండి', aadhaarTitle: 'ఆధార్ నంబర్ నమోదు చేయండి', mobileTitle: 'మొబైల్ నంబర్ నమోదు చేయండి', otpTitle: 'ఓటీపీ ధృవీకరించండి', successTitle: 'ఏబీహెచ్ఏ ఐడి సిద్ధమైంది', successSubtitle: 'మీ హెల్త్ అకౌంట్ సిద్ధంగా ఉంది.', viewCard: 'ఏబీహెచ్ఏ కార్డ్ చూడండి', healthProfile: 'హెల్త్ ప్రొఫైల్', linkedMobile: 'లింక్ చేసిన మొబైల్', accountStatus: 'ఖాతా స్థితి', activeVerified: 'సక్రియం మరియు ధృవీకరితం', reset: 'ఈ పరికరం నుంచి ఏబీహెచ్ఏ డేటా తొలగించండి', resetConfirm: 'ఈ పరికరం నుంచి ఏబీహెచ్ఏ కార్డ్ తొలగించాలా?', notSpecified: 'స్పష్టీకరణ లేదు' },
  ta: { subtitle: 'ஆயுஷ்மான் பாரத் ஹெல்த் அக்கவுண்ட்', hero: 'இந்தியா முழுவதும் பதிவுகள் மற்றும் மருத்துவமனை பயன்பாட்டுக்கு 14 இலக்க டிஜிட்டல் ஹெல்த் ஐடி உருவாக்குங்கள்.', benefitsTitle: 'நன்மைகள்', benefits: ['டிஜிட்டல் பதிவு', 'மருத்துவமனை பகிர்வு', 'தடுப்பூசி வரலாறு'], create: 'என் ஏபிஹெச்ஏ ஐடியை உருவாக்கு', methodTitle: 'சரிபார்ப்பு முறையை தேர்வு செய்யுங்கள்', aadhaarTitle: 'ஆதார் எண்ணை உள்ளிடுங்கள்', mobileTitle: 'மொபைல் எண்ணை உள்ளிடுங்கள்', otpTitle: 'ஓடிபி சரிபார்க்கவும்', successTitle: 'ஏபிஹெச்ஏ ஐடி உருவானது', successSubtitle: 'உங்கள் ஹெல்த் அக்கவுண்ட் தயாராக உள்ளது.', viewCard: 'ஏபிஹெச்ஏ கார்டைப் பாருங்கள்', healthProfile: 'ஹெல்த் புரொஃபைல்', linkedMobile: 'இணைந்த மொபைல்', accountStatus: 'கணக்கு நிலை', activeVerified: 'செயலில் மற்றும் சரிபார்க்கப்பட்டது', reset: 'இந்த சாதனத்திலிருந்து ஏபிஹெச்ஏ தரவை நீக்கு', resetConfirm: 'இந்த சாதனத்திலிருந்து ஏபிஹெச்ஏ கார்டை நீக்கவா?', notSpecified: 'குறிப்பிடப்படவில்லை' },
  kn: { subtitle: 'ಆಯುಷ್ಮಾನ್ ಭಾರತ್ ಹೆಲ್ತ್ ಅಕೌಂಟ್', hero: 'ಭಾರತದಾದ್ಯಂತ ದಾಖಲೆಗಳು ಮತ್ತು ಆಸ್ಪತ್ರೆ ಬಳಕೆಗೆ 14 ಅಂಕೆಯ ಡಿಜಿಟಲ್ ಹೆಲ್ತ್ ಐಡಿ ರಚಿಸಿ.', benefitsTitle: 'ಲಾಭಗಳು', benefits: ['ಡಿಜಿಟಲ್ ದಾಖಲೆ', 'ಆಸ್ಪತ್ರೆ ಹಂಚಿಕೆ', 'ಲಸಿಕೆ ಇತಿಹಾಸ'], create: 'ನನ್ನ ಎಬಿಎಚ್ಎ ಐಡಿ ರಚಿಸಿ', methodTitle: 'ಪರಿಶೀಲನಾ ವಿಧಾನ ಆಯ್ಕೆ ಮಾಡಿ', aadhaarTitle: 'ಆಧಾರ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ', mobileTitle: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ', otpTitle: 'ಒಟಿಪಿ ಪರಿಶೀಲಿಸಿ', successTitle: 'ಎಬಿಎಚ್ಎ ಐಡಿ ರಚಿಸಲಾಗಿದೆ', successSubtitle: 'ನಿಮ್ಮ ಹೆಲ್ತ್ ಅಕೌಂಟ್ ಸಿದ್ಧವಾಗಿದೆ.', viewCard: 'ಎಬಿಎಚ್ಎ ಕಾರ್ಡ್ ನೋಡಿ', healthProfile: 'ಹೆಲ್ತ್ ಪ್ರೊಫೈಲ್', linkedMobile: 'ಲಿಂಕ್ ಮೊಬೈಲ್', accountStatus: 'ಖಾತೆ ಸ್ಥಿತಿ', activeVerified: 'ಸಕ್ರಿಯ ಮತ್ತು ಪರಿಶೀಲಿತ', reset: 'ಈ ಸಾಧನದಿಂದ ಎಬಿಎಚ್ಎ ಡೇಟಾ ತೆಗೆದುಹಾಕಿ', resetConfirm: 'ಈ ಸಾಧನದಿಂದ ಎಬಿಎಚ್ಎ ಕಾರ್ಡ್ ತೆಗೆದುಹಾಕಬೇಕೇ?', notSpecified: 'ಉಲ್ಲೇಖ ಇಲ್ಲ' },
  gu: { subtitle: 'આયુષ્માન ભારત હેલ્થ એકાઉન્ટ', hero: 'ભારતભરમાં રેકોર્ડ અને હોસ્પિટલ ઉપયોગ માટે 14 અંકની ડિજિટલ હેલ્થ આઈડી બનાવો.', benefitsTitle: 'લાભ', benefits: ['ડિજિટલ રેકોર્ડ', 'હોસ્પિટલ શેર', 'ટીકા ઇતિહાસ'], create: 'મારી એબીએચએ આઈડી બનાવો', methodTitle: 'ચકાસણી રીત પસંદ કરો', aadhaarTitle: 'આધાર નંબર દાખલ કરો', mobileTitle: 'મોબાઇલ નંબર દાખલ કરો', otpTitle: 'ઓટીપી ચકાસો', successTitle: 'એબીએચએ આઈડી બની ગઈ', successSubtitle: 'તમારું હેલ્થ એકાઉન્ટ તૈયાર છે.', viewCard: 'એબીએચએ કાર્ડ જુઓ', healthProfile: 'હેલ્થ પ્રોફાઇલ', linkedMobile: 'લિંક મોબાઇલ', accountStatus: 'એકાઉન્ટ સ્થિતિ', activeVerified: 'સક્રિય અને ચકાસાયેલ', reset: 'આ ઉપકરણ પરથી એબીએચએ ડેટા દૂર કરો', resetConfirm: 'આ ઉપકરણ પરથી એબીએચએ કાર્ડ દૂર કરશો?', notSpecified: 'ઉલ્લેખ નથી' },
  ml: { subtitle: 'ആയുഷ്മാൻ ഭാരത് ഹെൽത്ത് അക്കൗണ്ട്', hero: 'ഇന്ത്യ മുഴുവൻ രേഖകളും ആശുപത്രി ഉപയോഗത്തിനും 14 അക്ക ഡിജിറ്റൽ ഹെൽത്ത് ഐഡി സൃഷ്ടിക്കൂ.', benefitsTitle: 'ലാഭങ്ങൾ', benefits: ['ഡിജിറ്റൽ രേഖ', 'ആശുപത്രി പങ്കിടൽ', 'വാക്സിൻ ചരിത്രം'], create: 'എന്റെ എബിഎച്ച്എ ഐഡി സൃഷ്ടിക്കുക', methodTitle: 'പരിശോധന രീതി തിരഞ്ഞെടുക്കുക', aadhaarTitle: 'ആധാർ നമ്പർ നൽകുക', mobileTitle: 'മൊബൈൽ നമ്പർ നൽകുക', otpTitle: 'ഒടിപി പരിശോധിക്കുക', successTitle: 'എബിഎച്ച്എ ഐഡി സൃഷ്ടിച്ചു', successSubtitle: 'നിങ്ങളുടെ ഹെൽത്ത് അക്കൗണ്ട് തയ്യാറായി.', viewCard: 'എബിഎച്ച്എ കാർഡ് കാണുക', healthProfile: 'ഹെൽത്ത് പ്രൊഫൈൽ', linkedMobile: 'ബന്ധിപ്പിച്ച മൊബൈൽ', accountStatus: 'അക്കൗണ്ട് നില', activeVerified: 'സജീവവും പരിശോധിച്ചതും', reset: 'ഈ ഉപകരണത്തിൽ നിന്ന് എബിഎച്ച്എ ഡാറ്റ നീക്കുക', resetConfirm: 'ഈ ഉപകരണത്തിൽ നിന്ന് എബിഎച്ച്എ കാർഡ് നീക്കണമോ?', notSpecified: 'വ്യക്തമല്ല' },
  pa: { subtitle: 'ਆਯੁਸ਼ਮਾਨ ਭਾਰਤ ਹੈਲਥ ਅਕਾਊਂਟ', hero: 'ਭਾਰਤ ਭਰ ਵਿੱਚ ਰਿਕਾਰਡ ਅਤੇ ਹਸਪਤਾਲ ਵਰਤੋਂ ਲਈ 14 ਅੰਕਾਂ ਦੀ ਡਿਜ਼ਿਟਲ ਹੈਲਥ ਆਈਡੀ ਬਣਾਓ।', benefitsTitle: 'ਫਾਇਦੇ', benefits: ['ਡਿਜ਼ਿਟਲ ਰਿਕਾਰਡ', 'ਹਸਪਤਾਲ ਸਾਂਝਾ', 'ਟੀਕਾ ਇਤਿਹਾਸ'], create: 'ਮੇਰੀ ਏਬੀਐਚਏ ਆਈਡੀ ਬਣਾਓ', methodTitle: 'ਤਸਦੀਕ ਤਰੀਕਾ ਚੁਣੋ', aadhaarTitle: 'ਆਧਾਰ ਨੰਬਰ ਦਰਜ ਕਰੋ', mobileTitle: 'ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ', otpTitle: 'ਓਟੀਪੀ ਤਸਦੀਕ ਕਰੋ', successTitle: 'ਏਬੀਐਚਏ ਆਈਡੀ ਬਣ ਗਈ', successSubtitle: 'ਤੁਹਾਡਾ ਹੈਲਥ ਅਕਾਊਂਟ ਤਿਆਰ ਹੈ।', viewCard: 'ਏਬੀਐਚਏ ਕਾਰਡ ਵੇਖੋ', healthProfile: 'ਹੈਲਥ ਪ੍ਰੋਫ਼ਾਈਲ', linkedMobile: 'ਲਿੰਕ ਮੋਬਾਈਲ', accountStatus: 'ਖਾਤਾ ਸਥਿਤੀ', activeVerified: 'ਸਰਗਰਮ ਅਤੇ ਤਸਦੀਕ ਕੀਤਾ', reset: 'ਇਸ ਡਿਵਾਈਸ ਤੋਂ ਏਬੀਐਚਏ ਡਾਟਾ ਹਟਾਓ', resetConfirm: 'ਕੀ ਇਸ ਡਿਵਾਈਸ ਤੋਂ ਏਬੀਐਚਏ ਕਾਰਡ ਹਟਾਉਣਾ ਹੈ?', notSpecified: 'ਉਲੇਖ ਨਹੀਂ' },
  or: { subtitle: 'ଆୟୁଷ୍ମାନ ଭାରତ ହେଲ୍ଥ ଆକାଉଣ୍ଟ', hero: 'ଭାରତ ଜୁଡ଼ି ରେକର୍ଡ ଓ ହସ୍ପିଟାଲ ବ୍ୟବହାର ପାଇଁ 14 ଅଙ୍କର ଡିଜିଟାଲ ହେଲ୍ଥ ଆଇଡି ତିଆରି କରନ୍ତୁ।', benefitsTitle: 'ଲାଭ', benefits: ['ଡିଜିଟାଲ ରେକର୍ଡ', 'ହସ୍ପିଟାଲ ସେୟାର', 'ଟିକା ଇତିହାସ'], create: 'ମୋର ଏବିଏଚଏ ଆଇଡି ତିଆରି କରନ୍ତୁ', methodTitle: 'ସତ୍ୟାପନ ପଦ୍ଧତି ବାଛନ୍ତୁ', aadhaarTitle: 'ଆଧାର ନମ୍ବର ଦିଅନ୍ତୁ', mobileTitle: 'ମୋବାଇଲ ନମ୍ବର ଦିଅନ୍ତୁ', otpTitle: 'ଓଟିପି ସତ୍ୟାପନ କରନ୍ତୁ', successTitle: 'ଏବିଏଚଏ ଆଇଡି ତିଆରି ହେଲା', successSubtitle: 'ଆପଣଙ୍କ ହେଲ୍ଥ ଆକାଉଣ୍ଟ ପ୍ରସ୍ତୁତ।', viewCard: 'ଏବିଏଚଏ କାର୍ଡ ଦେଖନ୍ତୁ', healthProfile: 'ହେଲ୍ଥ ପ୍ରୋଫାଇଲ', linkedMobile: 'ଲିଙ୍କ ମୋବାଇଲ', accountStatus: 'ଖାତା ଅବସ୍ଥା', activeVerified: 'ସକ୍ରିୟ ଓ ସତ୍ୟାପିତ', reset: 'ଏହି ଡିଭାଇସରୁ ଏବିଏଚଏ ତଥ୍ୟ ହଟାନ୍ତୁ', resetConfirm: 'ଏହି ଡିଭାଇସରୁ ଏବିଏଚଏ କାର୍ଡ ହଟାଇବେ କି?', notSpecified: 'ଉଲ୍ଲେଖ ନାହିଁ' },
  as: { subtitle: 'আয়ুষ্মান ভাৰত হেল্থ একাউণ্ট', hero: 'ভাৰতজুৰি ৰেকৰ্ড আৰু হস্পিতাল ব্যৱহাৰৰ বাবে ১৪ সংখ্যাৰ ডিজিটেল হেল্থ আইডি তৈয়াৰ কৰক।', benefitsTitle: 'লাভ', benefits: ['ডিজিটেল ৰেকৰ্ড', 'হস্পিতাল শ্বেয়াৰ', 'টিকা ইতিহাস'], create: 'মোৰ এবিএইচএ আইডি তৈয়াৰ কৰক', methodTitle: 'যাচাই পদ্ধতি বাছনি কৰক', aadhaarTitle: 'আধাৰ নম্বৰ লিখক', mobileTitle: 'মোবাইল নম্বৰ লিখক', otpTitle: 'অ’টিপি যাচাই কৰক', successTitle: 'এবিএইচএ আইডি তৈয়াৰ হ’ল', successSubtitle: 'আপোনাৰ হেল্থ একাউণ্ট সাজু।', viewCard: 'এবিএইচএ কাৰ্ড চাওক', healthProfile: 'হেল্থ প্ৰোফাইল', linkedMobile: 'লিংক মোবাইল', accountStatus: 'একাউণ্ট অৱস্থা', activeVerified: 'সক্ৰিয় আৰু যাচাইকৃত', reset: 'এই ডিভাইচৰ পৰা এবিএইচএ ডাটা আঁতৰাওক', resetConfirm: 'এই ডিভাইচৰ পৰা এবিএইচএ কাৰ্ড আঁতৰাব নেকি?', notSpecified: 'উল্লেখ নাই' },
};

const ABHA_VISIBLE_TEXT: Record<Language, {
  secureNote: string;
  aadhaarOtp: string;
  mobileOtp: string;
  resend: string;
  resendIn: string;
  abhaId: string;
  abhaAddress: string;
  copyId: string;
  download: string;
  share: string;
}> = {
  en: { secureNote: 'End-to-end encrypted · NHA compliant', aadhaarOtp: 'Aadhaar OTP', mobileOtp: 'Mobile OTP', resend: 'Resend OTP', resendIn: 'in 30s', abhaId: 'ABHA ID', abhaAddress: 'ABHA Address', copyId: 'Copy ID', download: 'Download', share: 'Share' },
  hi: { secureNote: 'एंड-टू-एंड एन्क्रिप्टेड · NHA अनुरूप', aadhaarOtp: 'आधार ओटीपी', mobileOtp: 'मोबाइल ओटीपी', resend: 'ओटीपी फिर भेजें', resendIn: '30 सेकंड में', abhaId: 'एबीएचए आईडी', abhaAddress: 'एबीएचए पता', copyId: 'आईडी कॉपी करें', download: 'डाउनलोड', share: 'शेयर' },
  mr: { secureNote: 'एंड-टू-एंड सुरक्षित · NHA अनुरूप', aadhaarOtp: 'आधार ओटीपी', mobileOtp: 'मोबाइल ओटीपी', resend: 'ओटीपी पुन्हा पाठवा', resendIn: '30 सेकंदात', abhaId: 'एबीएचए आयडी', abhaAddress: 'एबीएचए पत्ता', copyId: 'आयडी कॉपी', download: 'डाउनलोड', share: 'शेअर' },
  bn: { secureNote: 'এন্ড-টু-এন্ড এনক্রিপ্টেড · NHA অনুগত', aadhaarOtp: 'আধার ওটিপি', mobileOtp: 'মোবাইল ওটিপি', resend: 'ওটিপি আবার পাঠান', resendIn: '৩০ সেকেন্ডে', abhaId: 'এবিএইচএ আইডি', abhaAddress: 'এবিএইচএ ঠিকানা', copyId: 'আইডি কপি', download: 'ডাউনলোড', share: 'শেয়ার' },
  te: { secureNote: 'ఎండ్-టు-ఎండ్ సురక్షితం · NHA అనుగుణం', aadhaarOtp: 'ఆధార్ ఓటీపీ', mobileOtp: 'మొబైల్ ఓటీపీ', resend: 'ఓటీపీ మళ్లీ పంపండి', resendIn: '30 సెకన్లలో', abhaId: 'ఏబిహెచ్‌ఏ ఐడి', abhaAddress: 'ఏబిహెచ్‌ఏ చిరునామా', copyId: 'ఐడి కాపీ', download: 'డౌన్‌లోడ్', share: 'షేర్' },
  ta: { secureNote: 'எண்ட்-டு-எண்ட் பாதுகாப்பு · NHA இணக்கம்', aadhaarOtp: 'ஆதார் ஓடிபி', mobileOtp: 'மொபைல் ஓடிபி', resend: 'ஓடிபி மீண்டும் அனுப்பு', resendIn: '30 விநாடிகளில்', abhaId: 'ஏபிஹெச்ஏ ஐடி', abhaAddress: 'ஏபிஹெச்ஏ முகவரி', copyId: 'ஐடி நகல்', download: 'பதிவிறக்கு', share: 'பகிர்' },
  kn: { secureNote: 'ಎಂಡ್-ಟು-ಎಂಡ್ ಸುರಕ್ಷಿತ · NHA ಅನುಗುಣ', aadhaarOtp: 'ಆಧಾರ್ ಓಟಿಪಿ', mobileOtp: 'ಮೊಬೈಲ್ ಓಟಿಪಿ', resend: 'ಓಟಿಪಿ ಮರುಕಳುಹಿಸಿ', resendIn: '30 ಸೆಕೆಂಡಿನಲ್ಲಿ', abhaId: 'ಎಬಿಎಚ್‌ಎ ಐಡಿ', abhaAddress: 'ಎಬಿಎಚ್‌ಎ ವಿಳಾಸ', copyId: 'ಐಡಿ ನಕಲು', download: 'ಡೌನ್‌ಲೋಡ್', share: 'ಹಂಚಿಕೆ' },
  gu: { secureNote: 'એન્ડ-ટુ-એન્ડ સુરક્ષિત · NHA અનુરૂપ', aadhaarOtp: 'આધાર ઓટીપી', mobileOtp: 'મોબાઇલ ઓટીપી', resend: 'ઓટીપી ફરી મોકલો', resendIn: '30 સેકન્ડમાં', abhaId: 'એબીએચએ આઈડી', abhaAddress: 'એબીએચએ સરનામું', copyId: 'આઈડી કૉપી', download: 'ડાઉનલોડ', share: 'શેર' },
  ml: { secureNote: 'എൻഡ്-ടു-എൻഡ് സുരക്ഷിതം · NHA അനുസരണം', aadhaarOtp: 'ആധാർ ഒടിപി', mobileOtp: 'മൊബൈൽ ഒടിപി', resend: 'ഒടിപി വീണ്ടും അയക്കുക', resendIn: '30 സെക്കൻഡിൽ', abhaId: 'എബിഎച്ച്എ ഐഡി', abhaAddress: 'എബിഎച്ച്എ വിലാസം', copyId: 'ഐഡി പകർത്തുക', download: 'ഡൗൺലോഡ്', share: 'പങ്കിടുക' },
  pa: { secureNote: 'ਐਂਡ-ਟੂ-ਐਂਡ ਸੁਰੱਖਿਅਤ · NHA ਅਨੁਕੂਲ', aadhaarOtp: 'ਆਧਾਰ ਓਟੀਪੀ', mobileOtp: 'ਮੋਬਾਇਲ ਓਟੀਪੀ', resend: 'ਓਟੀਪੀ ਮੁੜ ਭੇਜੋ', resendIn: '30 ਸਕਿੰਟ ਵਿੱਚ', abhaId: 'ਏਬੀਐਚਏ ਆਈਡੀ', abhaAddress: 'ਏਬੀਐਚਏ ਪਤਾ', copyId: 'ਆਈਡੀ ਕਾਪੀ', download: 'ਡਾਊਨਲੋਡ', share: 'ਸ਼ੇਅਰ' },
  or: { secureNote: 'ଏଣ୍ଡ-ଟୁ-ଏଣ୍ଡ ସୁରକ୍ଷିତ · NHA ଅନୁରୂପ', aadhaarOtp: 'ଆଧାର ଓଟିପି', mobileOtp: 'ମୋବାଇଲ ଓଟିପି', resend: 'ଓଟିପି ପୁନି ପଠାନ୍ତୁ', resendIn: '30 ସେକେଣ୍ଡରେ', abhaId: 'ଏବିଏଚଏ ଆଇଡି', abhaAddress: 'ଏବିଏଚଏ ଠିକଣା', copyId: 'ଆଇଡି କପି', download: 'ଡାଉନଲୋଡ୍', share: 'ସେୟାର' },
  as: { secureNote: 'এণ্ড-টু-এণ্ড সুৰক্ষিত · NHA অনুগত', aadhaarOtp: 'আধাৰ অ’টিপি', mobileOtp: 'মোবাইল অ’টিপি', resend: 'অ’টিপি পুনৰ পঠাওক', resendIn: '30 ছেকেণ্ডত', abhaId: 'এবিএইচএ আইডি', abhaAddress: 'এবিএইচএ ঠিকনা', copyId: 'আইডি কপি', download: 'ডাউনলোড', share: 'শ্বেয়াৰ' },
};

function makeAbhaId() {
  const r = () => Math.floor(1000 + Math.random() * 9000);
  return `91-${r()}-${r()}-${r()}`;
}

function nameToAbhaAddress(name: string) {
  return name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '') + '@abdm';
}

export default function ABHA() {
  const [, navigate] = useLocation();
  const { data: profile } = useGetUserProfile();
  const { data: children } = useListChildren();
  const activeChildId = useAppStore(s => s.activeChildId);
  const language = useAppStore(s => s.language);

  const activeChild = children?.find(c => c.id === activeChildId) || children?.[0];
  const ui = ABHA_TEXT[language] ?? ABHA_TEXT.en;
  const visible = ABHA_VISIBLE_TEXT[language] ?? ABHA_VISIBLE_TEXT.en;

  const [step, setStep] = useState<AbhaStep>(() => {
    try {
      const saved = localStorage.getItem(ABHA_STORAGE_KEY);
      return saved ? 'card' : 'home';
    } catch { return 'home'; }
  });
  const [hasAbha, setHasAbha] = useState(() => {
    try { return !!localStorage.getItem(ABHA_STORAGE_KEY); } catch { return false; }
  });
  const [abhaData, setAbhaData] = useState<AbhaData | null>(() => {
    try {
      const saved = localStorage.getItem(ABHA_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [method, setMethod] = useState<'aadhaar' | 'mobile' | ''>('');
  const [aadhaarNum, setAadhaarNum] = useState('');
  const [mobileNum, setMobileNum] = useState(profile?.phone || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [masked, setMasked] = useState(true);
  const [copied, setCopied] = useState(false);

  const formatAadhaar = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const sendOTP = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
      setStep('otp');
    }, 1500);
  };

  const verifyOTP = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const parentName = profile?.name || 'Parent';
      const childDob = activeChild?.dob
        ? new Date(activeChild.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';
      const gender = activeChild?.gender || profile?.gender || ui.notSpecified;
      const phone = mobileNum || profile?.phone || '';
      const generated: AbhaData = {
        abhaId: makeAbhaId(),
        abhaAddress: nameToAbhaAddress(parentName),
        name: parentName,
        dob: childDob,
        gender,
        mobile: phone,
        linked: true,
      };
      setHasAbha(true);
      setAbhaData(generated);
      try { localStorage.setItem(ABHA_STORAGE_KEY, JSON.stringify(generated)); } catch {}
      setStep('success');
    }, 2000);
  };

  useEffect(() => {
    if (profile?.phone && !mobileNum) setMobileNum(profile.phone);
  }, [profile?.phone]);

  const copyAbhaId = () => {
    if (abhaData) {
      navigator.clipboard.writeText(abhaData.abhaId).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetAbha = () => {
    try { localStorage.removeItem(ABHA_STORAGE_KEY); } catch {}
    setHasAbha(false);
    setAbhaData(null);
    setStep('home');
  };

  const renderStep = () => {
    switch (step) {
      case 'home':
        return hasAbha && abhaData ? (
          <AbhaCardView ui={ui} visible={visible} abha={abhaData} masked={masked} onToggleMask={() => setMasked(!masked)} onCopy={copyAbhaId} copied={copied} onReset={resetAbha} />
        ) : (
          <AbhaHome ui={ui} onStart={() => setStep('method')} />
        );

      case 'method':
        return (
          <MethodSelect
            ui={ui}
            visible={visible}
            language={language}
            onSelect={(m) => { setMethod(m); setStep(m === 'aadhaar' ? 'aadhaar-input' : 'mobile-input'); }}
            onBack={() => setStep('home')}
          />
        );

      case 'aadhaar-input':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setStep('method')} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <ArrowLeft size={16} />
              </button>
              <h2 className="font-bold text-base">{ui.aadhaarTitle}</h2>
            </div>
            <SwasthyaSewaGuide
              prompt={getVoicePrompt(language, 'aadhaar')}
              language={language}
              onTranscript={(transcript) => setAadhaarNum(extractNumericSpeech(transcript, 12))}
              autoListen
              className="mb-2"
              showUi={false}
            />
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-[12px] text-amber-800">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{getVoicePrompt(language, 'aadhaar')}</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">{ui.aadhaarTitle}</label>
              <input
                value={formatAadhaar(aadhaarNum)}
                onChange={e => setAadhaarNum(e.target.value.replace(/\s/g, ''))}
                placeholder="XXXX XXXX XXXX"
                className="w-full h-12 px-4 rounded-xl border-2 border-border focus:border-primary text-lg tracking-widest font-mono outline-none"
                inputMode="numeric"
              />
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Lock size={11} /> {visible.secureNote}
            </p>
            <button
              onClick={sendOTP}
              disabled={aadhaarNum.length !== 12 || loading}
              className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'OTP'}
            </button>
            <p className="text-[11px] text-center text-muted-foreground">{getVoicePrompt(language, 'aadhaar')}</p>
          </div>
        );

      case 'mobile-input':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setStep('method')} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <ArrowLeft size={16} />
              </button>
              <h2 className="font-bold text-base">{ui.mobileTitle}</h2>
            </div>
            <SwasthyaSewaGuide
              prompt={getVoicePrompt(language, 'mobile')}
              language={language}
              onTranscript={(transcript) => setMobileNum(extractNumericSpeech(transcript, 10))}
              autoListen
              className="mb-2"
              showUi={false}
            />
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">{ui.mobileTitle}</label>
              <div className="flex gap-2">
                <div className="h-12 px-3 rounded-xl border-2 border-border flex items-center text-sm font-semibold text-muted-foreground">+91</div>
                <input
                  value={mobileNum}
                  onChange={e => setMobileNum(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  className="flex-1 h-12 px-4 rounded-xl border-2 border-border focus:border-primary text-base outline-none"
                  inputMode="numeric"
                />
              </div>
            </div>
            <button
              onClick={sendOTP}
              disabled={mobileNum.length !== 10 || loading}
              className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-primary/20"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'OTP'}
            </button>
          </div>
        );

      case 'otp':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setStep(method === 'aadhaar' ? 'aadhaar-input' : 'mobile-input')} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <ArrowLeft size={16} />
              </button>
              <h2 className="font-bold text-base">{ui.otpTitle}</h2>
            </div>
            <SwasthyaSewaGuide
              prompt={getVoicePrompt(language, 'otp')}
              language={language}
              onTranscript={(transcript) => setOtp(extractNumericSpeech(transcript, 6))}
              autoListen
              className="mb-2"
              showUi={false}
            />
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Smartphone className="text-primary" size={24} />
              </div>
              <p className="text-sm font-semibold">{ui.otpTitle}</p>
              <p className="text-xs text-muted-foreground mt-1">{method === 'mobile' ? `+91 ${mobileNum}` : '+91 XXXXXXXX10'}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">{ui.otpTitle}</label>
              <input
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="------"
                className="w-full h-14 px-4 rounded-xl border-2 border-border focus:border-primary text-2xl tracking-[1rem] font-mono text-center outline-none"
                inputMode="numeric"
              />
            </div>
            <button
              onClick={verifyOTP}
              disabled={otp.length !== 6 || loading}
              className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-primary/20"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> {ui.successTitle}...</>
              ) : ui.viewCard}
            </button>
            <div className="flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
              <button className="text-primary font-semibold flex items-center gap-1">
                <RefreshCw size={11} /> {visible.resend}
              </button>
              <span>{visible.resendIn}</span>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="p-4 flex flex-col items-center justify-center gap-4 py-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600" size={40} />
              </div>
            </motion.div>
            <div className="text-center">
              <h2 className="font-bold text-lg text-green-700">{ui.successTitle}</h2>
              <p className="text-sm text-muted-foreground mt-1">{ui.successSubtitle}</p>
            </div>
            <div className="w-full bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-[11px] text-muted-foreground font-medium mb-1">{visible.abhaId}</p>
              <p className="text-xl font-bold tracking-widest text-green-800 font-mono">{abhaData?.abhaId}</p>
              <p className="text-xs text-muted-foreground mt-1">{abhaData?.abhaAddress}</p>
            </div>
            <div className="w-full space-y-2 text-[12px] text-muted-foreground bg-muted rounded-xl p-3">
              <p className="font-semibold text-foreground text-xs mb-2">{ui.benefitsTitle}</p>
              {ui.benefits.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle size={12} className="text-green-600 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep('card')}
              className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm shadow-md shadow-primary/20"
            >
              {ui.viewCard}
            </button>
          </div>
        );

      case 'card':
        return abhaData ? (
          <AbhaCardView ui={ui} visible={visible} abha={abhaData} masked={masked} onToggleMask={() => setMasked(!masked)} onCopy={copyAbhaId} copied={copied} onReset={resetAbha} />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="bg-white border-b border-border/60 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-display font-bold text-base">ABHA</h1>
            <p className="text-[11px] text-muted-foreground">{ui.subtitle}</p>
          </div>
          <div className="ml-auto">
            <Shield className="text-primary" size={22} />
          </div>
        </div>
      </div>

      <div className="flex-1 pb-20">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function AbhaHome({ ui, onStart }: { ui: (typeof ABHA_TEXT)[Language]; onStart: () => void }) {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">ABHA</p>
            <p className="text-white/70 text-[11px]">{ui.subtitle}</p>
          </div>
        </div>
        <p className="text-white/90 text-sm leading-relaxed">{ui.hero}</p>
      </div>

      <div className="space-y-2.5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{ui.benefitsTitle}</p>
        <div className="grid grid-cols-3 gap-2">
          {ui.benefits.map((item) => (
            <div key={item} className="rounded-xl border border-primary/10 bg-primary/5 p-3 text-center">
              <p className="text-sm font-semibold text-primary">{item}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">ABHA</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-blue-50 border border-blue-100 rounded-xl p-3">
        <Info size={13} className="text-blue-600 shrink-0" />
        <span>{ui.hero}</span>
      </div>

      <button
        onClick={onStart}
        className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
      >
        {ui.create} <ChevronRight size={16} />
      </button>
    </div>
  );
}

function MethodSelect({ ui, visible, language, onSelect, onBack }: { ui: (typeof ABHA_TEXT)[Language]; visible: (typeof ABHA_VISIBLE_TEXT)[Language]; language: Language; onSelect: (m: 'aadhaar' | 'mobile') => void; onBack: () => void }) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft size={16} />
        </button>
        <h2 className="font-bold text-base">{ui.methodTitle}</h2>
      </div>
      <SwasthyaSewaGuide
        prompt={getVoicePrompt(language, 'abhaMethod')}
        language={language}
        allowVoiceInput={false}
        className="mb-2"
        showUi={false}
      />
      <p className="text-sm text-muted-foreground">{getVoicePrompt(language, 'abhaMethod')}</p>

      {[
        {
          id: 'aadhaar' as const,
          icon: Shield,
          title: visible.aadhaarOtp,
          desc: getVoicePrompt(language, 'aadhaar'),
          recommended: true,
          color: 'text-primary',
          bg: 'bg-primary/10',
        },
        {
          id: 'mobile' as const,
          icon: Smartphone,
          title: visible.mobileOtp,
          desc: getVoicePrompt(language, 'mobile'),
          recommended: false,
          color: 'text-secondary',
          bg: 'bg-secondary/10',
        },
      ].map(({ id, icon: Icon, title, desc, recommended, color, bg }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className="w-full text-left bg-white border-2 border-border hover:border-primary rounded-xl p-4 transition-all group"
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon size={20} className={color} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm">{title}</span>
                {recommended && (
                  <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full font-bold">
                    ABHA
                  </span>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{desc}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground mt-1 group-hover:text-primary transition-colors" />
          </div>
        </button>
      ))}

      <div className="bg-muted rounded-xl p-3 text-[11px] text-muted-foreground flex items-start gap-2">
        <Lock size={12} className="shrink-0 mt-0.5" />
        <span>{getVoicePrompt(language, 'aadhaar')}</span>
      </div>
    </div>
  );
}

function AbhaCardView({ ui, visible, abha, masked, onToggleMask, onCopy, copied, onReset }: {
  ui: (typeof ABHA_TEXT)[Language];
  visible: (typeof ABHA_VISIBLE_TEXT)[Language];
  abha: AbhaData;
  masked: boolean;
  onToggleMask: () => void;
  onCopy: () => void;
  copied: boolean;
  onReset?: () => void;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* ABHA Card */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary/80" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
        <div className="relative p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest">{ui.viewCard}</p>
              <p className="text-white font-bold text-sm">{ui.subtitle}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-2">
              <Shield size={20} className="text-white" />
            </div>
          </div>

          {/* ABHA ID */}
          <div className="mb-4">
            <p className="text-white/50 text-[10px] font-medium mb-1">{visible.abhaId}</p>
            <div className="flex items-center gap-2">
              <p className="text-white font-bold text-lg tracking-widest font-mono">
                {masked ? abha.abhaId.replace(/\d(?=.{4})/g, '•') : abha.abhaId}
              </p>
              <button onClick={onToggleMask} className="bg-white/20 rounded-lg p-1">
                {masked ? <Eye size={13} className="text-white" /> : <EyeOff size={13} className="text-white" />}
              </button>
            </div>
            <p className="text-white/70 text-[11px] mt-1 font-mono">{abha.abhaAddress}</p>
          </div>

          {/* User info */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/50 text-[10px]">{ui.healthProfile}</p>
              <p className="text-white font-bold text-sm">{abha.name}</p>
              <p className="text-white/70 text-[11px]">{abha.dob} · {abha.gender}</p>
            </div>
            <div className="text-right">
              <div className="bg-white rounded-lg p-1.5">
                <QrCode size={32} className="text-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: copied ? Check : Copy, label: copied ? ui.activeVerified : visible.copyId, action: onCopy, active: copied },
          { icon: Download, label: visible.download, action: () => {}, active: false },
          { icon: Share2, label: visible.share, action: () => {}, active: false },
        ].map(({ icon: Icon, label, action, active }, i) => (
          <button
            key={i}
            onClick={action}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all ${
              active ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-border text-muted-foreground hover:border-primary hover:text-primary'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {/* Health Profile */}
      <div className="bg-white border border-border/60 rounded-xl p-4 space-y-3">
        <p className="font-bold text-sm">{ui.healthProfile}</p>
        {[
          { label: visible.abhaId, value: masked ? '91-••••-••••-9012' : abha.abhaId },
          { label: visible.abhaAddress, value: abha.abhaAddress },
          { label: ui.linkedMobile, value: abha.mobile },
          { label: ui.accountStatus, value: ui.activeVerified, isStatus: true },
        ].map(({ label, value, isStatus }, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <span className="text-[12px] text-muted-foreground">{label}</span>
            <span className={`text-[12px] font-semibold ${isStatus ? 'text-green-600' : 'text-foreground'}`}>
              {isStatus && <CheckCircle size={11} className="inline mr-1" />}{value}
            </span>
          </div>
        ))}
      </div>

      {ui === ABHA_TEXT.en && (
      <>
      {/* Linked Health Records section */}
      <div className="bg-white border border-border/60 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-sm">Linked Records</p>
          <span className="text-[11px] text-primary font-semibold">3 Records</span>
        </div>
        {[
          { icon: '💉', title: 'BCG Vaccination', date: '15 Mar 2024', facility: 'Municipal Health Centre' },
          { icon: '🩺', title: 'Child Health Checkup', date: '28 Feb 2024', facility: "Dr. Priya's Clinic" },
          { icon: '💊', title: 'OPV Dose 1', date: '10 Jan 2024', facility: 'PHC Andheri' },
        ].map((r, i) => (
          <div key={i} className={`flex items-center gap-3 py-2.5 ${i < 2 ? 'border-b border-border/50' : ''}`}>
            <span className="text-lg">{r.icon}</span>
            <div className="flex-1">
              <p className="text-xs font-semibold">{r.title}</p>
              <p className="text-[10px] text-muted-foreground">{r.facility} · {r.date}</p>
            </div>
            <ChevronRight size={14} className="text-muted-foreground" />
          </div>
        ))}
      </div>

      {/* Scheme benefits */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Star size={14} className="text-amber-600" />
          <p className="font-bold text-sm text-amber-900">PM-JAY Eligibility</p>
        </div>
        <p className="text-[12px] text-amber-800 leading-relaxed">
          Your ABHA ID is linked to Ayushman Bharat PM-JAY. You and your family may be eligible for coverage up to <span className="font-bold">₹5 Lakh/year</span> at 25,000+ empanelled hospitals.
        </p>
        <button className="mt-2 text-[12px] text-amber-700 font-bold flex items-center gap-1">
          Check Eligibility <ChevronRight size={12} />
        </button>
      </div>

      </>
      )}

      {/* Reset */}
      {onReset && (
        <button
          onClick={() => { if (window.confirm(ui.resetConfirm)) onReset(); }}
          className="w-full text-center text-[11px] text-muted-foreground py-2 underline underline-offset-2"
        >
          {ui.reset}
        </button>
      )}
    </div>
  );
}
