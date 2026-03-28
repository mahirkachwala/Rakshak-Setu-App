import React, { useEffect, useMemo, useState } from 'react';
import {
  Globe, Bell, User, Shield, FileText, ChevronRight, HelpCircle,
  Languages, LogOut, CheckCircle, Lock, Moon, Sun, Phone,
  Baby, Plus, Trash2, X, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Switch } from '@/components/ui/switch';
import {
  useGetUserProfile,
  useListChildren,
  useCreateChild,
  useDeleteChild,
  useUpdateUserProfile,
  CreateChildGender,
} from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { LANGUAGE_NAMES, Language, useTranslation } from '@/lib/i18n';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetDashboardSummaryQueryKey,
  getGetUserProfileQueryKey,
  getListChildrenQueryKey,
} from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import SwasthyaSewaGuide from '@/components/SwasthyaSewaGuide';
import { getVoiceFieldError, getVoicePrompt } from '@/lib/voicePrompts';
import { matchGenderFromSpeech, parseSpokenDate, toTitleCase } from '@/lib/voice';

const SETTINGS_TEXT: Record<Language, {
  abhaBody: string;
  notificationsBody: string;
  vaccinationSub: string;
  healthCardSub: string;
  pmjaySub: string;
  rbskSub: string;
  jsySub: string;
  missionSub: string;
  privacySub: string;
  helpSub: string;
  setUp: string;
  footerVersion: string;
  footerMission: string;
  footerData: string;
  signOut: string;
}> = {
  en: { abhaBody: 'Create your 14-digit Ayushman Bharat Health ID', notificationsBody: 'Push notifications for due dates', vaccinationSub: 'Download all vaccination history', healthCardSub: 'Digital immunization card', pmjaySub: 'Ayushman Bharat · ₹5L/year coverage', rbskSub: 'Free child health screening 0–18 years', jsySub: 'Maternity benefit scheme', missionSub: 'Universal immunization programme', privacySub: 'How we protect your data', helpSub: 'Common questions answered', setUp: 'Set Up', footerVersion: 'Version 1.0.0 · Made for India', footerMission: 'Built on Ayushman Bharat Digital Mission (ABDM)', footerData: 'Data powered by NHA · NIC · Government of India', signOut: 'Sign Out' },
  hi: { abhaBody: 'अपनी 14 अंकों की आयुष्मान भारत हेल्थ आईडी बनाएं', notificationsBody: 'देय तारीखों के लिए पुश सूचनाएँ', vaccinationSub: 'सभी टीकाकरण रिकॉर्ड डाउनलोड करें', healthCardSub: 'डिजिटल टीकाकरण कार्ड', pmjaySub: 'आयुष्मान भारत · ₹5 लाख/वर्ष कवरेज', rbskSub: '0–18 वर्ष के बच्चों की निःशुल्क जांच', jsySub: 'मातृत्व लाभ योजना', missionSub: 'सार्वभौमिक टीकाकरण कार्यक्रम', privacySub: 'हम आपका डेटा कैसे सुरक्षित रखते हैं', helpSub: 'सामान्य प्रश्नों के उत्तर', setUp: 'सेट अप', footerVersion: 'संस्करण 1.0.0 · भारत के लिए', footerMission: 'आयुष्मान भारत डिजिटल मिशन (ABDM) पर आधारित', footerData: 'डेटा: NHA · NIC · भारत सरकार', signOut: 'साइन आउट' },
  mr: { abhaBody: 'तुमची 14 अंकी आयुष्मान भारत हेल्थ आयडी तयार करा', notificationsBody: 'देय तारखांसाठी पुश सूचना', vaccinationSub: 'सर्व लसीकरण इतिहास डाउनलोड करा', healthCardSub: 'डिजिटल लसीकरण कार्ड', pmjaySub: 'आयुष्मान भारत · ₹5 लाख/वर्ष संरक्षण', rbskSub: '0–18 वर्षांसाठी मोफत आरोग्य तपासणी', jsySub: 'मातृत्व लाभ योजना', missionSub: 'सार्वत्रिक लसीकरण कार्यक्रम', privacySub: 'आम्ही तुमचा डेटा कसा सुरक्षित ठेवतो', helpSub: 'सामान्य प्रश्नांची उत्तरे', setUp: 'सेट अप', footerVersion: 'आवृत्ती 1.0.0 · भारतासाठी', footerMission: 'आयुष्मान भारत डिजिटल मिशन (ABDM) वर आधारित', footerData: 'डेटा: NHA · NIC · भारत सरकार', signOut: 'साइन आउट' },
  bn: { abhaBody: 'আপনার ১৪ অঙ্কের আয়ুষ্মান ভারত হেলথ আইডি তৈরি করুন', notificationsBody: 'ডিউ তারিখের জন্য পুশ নোটিফিকেশন', vaccinationSub: 'সব টিকাকরণ ইতিহাস ডাউনলোড করুন', healthCardSub: 'ডিজিটাল টিকাকরণ কার্ড', pmjaySub: 'আয়ুষ্মান ভারত · ₹5 লাখ/বছর কভারেজ', rbskSub: '০–১৮ বছরের শিশুদের বিনামূল্যে স্ক্রিনিং', jsySub: 'মাতৃত্ব সহায়তা প্রকল্প', missionSub: 'সর্বজনীন টিকাকরণ কর্মসূচি', privacySub: 'আমরা কীভাবে আপনার তথ্য সুরক্ষিত রাখি', helpSub: 'সাধারণ প্রশ্নের উত্তর', setUp: 'সেট আপ', footerVersion: 'সংস্করণ 1.0.0 · ভারতের জন্য', footerMission: 'আয়ুষ্মান ভারত ডিজিটাল মিশন (ABDM)-এ নির্মিত', footerData: 'তথ্য: NHA · NIC · ভারত সরকার', signOut: 'সাইন আউট' },
  te: { abhaBody: 'మీ 14 అంకెల ఆయుష్మాన్ భారత్ హెల్త్ ఐడి సృష్టించండి', notificationsBody: 'గడువు తేదీలకు పుష్ నోటిఫికేషన్లు', vaccinationSub: 'అన్ని టీకా చరిత్రను డౌన్‌లోడ్ చేయండి', healthCardSub: 'డిజిటల్ ఇమ్యునైజేషన్ కార్డ్', pmjaySub: 'ఆయుష్మాన్ భారత్ · ₹5 లక్షలు/సంవత్సరం కవరేజ్', rbskSub: '0–18 ఏళ్ల పిల్లలకు ఉచిత స్క్రీనింగ్', jsySub: 'మాతృత్వ ప్రయోజన పథకం', missionSub: 'సర్వత్ర టీకాకరణ కార్యక్రమం', privacySub: 'మీ డేటాను మేము ఎలా రక్షిస్తున్నాం', helpSub: 'సాధారణ ప్రశ్నలకు సమాధానాలు', setUp: 'సెట్ అప్', footerVersion: 'వెర్షన్ 1.0.0 · భారతదేశం కోసం', footerMission: 'ఆయుష్మాన్ భారత్ డిజిటల్ మిషన్ (ABDM) ఆధారంగా', footerData: 'డేటా: NHA · NIC · భారత ప్రభుత్వం', signOut: 'సైన్ అవుట్' },
  ta: { abhaBody: 'உங்கள் 14 இலக்க ஆயுஷ்மான் பாரத் ஹெல்த் ஐடியை உருவாக்குங்கள்', notificationsBody: 'காலக்கெடு தேதிகளுக்கான புஷ் அறிவிப்புகள்', vaccinationSub: 'அனைத்து தடுப்பூசி வரலாறையும் பதிவிறக்கவும்', healthCardSub: 'டிஜிட்டல் தடுப்பூசி அட்டை', pmjaySub: 'ஆயுஷ்மான் பாரத் · ₹5 லட்சம்/ஆண்டு கவரேஜ்', rbskSub: '0–18 வயது குழந்தைகளுக்கு இலவச பரிசோதனை', jsySub: 'தாய்மை நலத் திட்டம்', missionSub: 'சார்வత్ర தடுப்பூசி திட்டம்', privacySub: 'உங்கள் தரவை எப்படிப் பாதுகாக்கிறோம்', helpSub: 'பொது கேள்விகளுக்கான பதில்கள்', setUp: 'அமைக்கவும்', footerVersion: 'பதிப்பு 1.0.0 · இந்தியாவிற்காக', footerMission: 'ஆயுஷ்மான் பாரத் டிஜிட்டல் மிஷன் (ABDM) அடிப்படையில்', footerData: 'தரவு: NHA · NIC · இந்திய அரசு', signOut: 'வெளியேறு' },
  kn: { abhaBody: 'ನಿಮ್ಮ 14 ಅಂಕೆಯ ಆಯುಷ್ಮಾನ್ ಭಾರತ್ ಹೆಲ್ತ್ ಐಡಿ ರಚಿಸಿ', notificationsBody: 'ಗಡುವು ದಿನಾಂಕಗಳಿಗೆ ಪುಶ್ ಸೂಚನೆಗಳು', vaccinationSub: 'ಎಲ್ಲಾ ಲಸಿಕೆ ಇತಿಹಾಸ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ', healthCardSub: 'ಡಿಜಿಟಲ್ ಲಸಿಕೆ ಕಾರ್ಡ್', pmjaySub: 'ಆಯುಷ್ಮಾನ್ ಭಾರತ್ · ₹5 ಲಕ್ಷ/ವರ್ಷ ಕವರೆಜ್', rbskSub: '0–18 ವರ್ಷದ ಮಕ್ಕಳಿಗೆ ಉಚಿತ ತಪಾಸಣೆ', jsySub: 'ಮಾತೃತ್ವ ಲಾಭ ಯೋಜನೆ', missionSub: 'ಸರ್ವತ್ರ ಲಸಿಕಾಕರಣ ಕಾರ್ಯಕ್ರಮ', privacySub: 'ನಿಮ್ಮ ಡೇಟಾವನ್ನು ನಾವು ಹೇಗೆ ರಕ್ಷಿಸುತ್ತೇವೆ', helpSub: 'ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳ ಉತ್ತರಗಳು', setUp: 'ಸೆಟ್ ಅಪ್', footerVersion: 'ಆವೃತ್ತಿ 1.0.0 · ಭಾರತದಿಗಾಗಿ', footerMission: 'ಆಯುಷ್ಮಾನ್ ಭಾರತ್ ಡಿಜಿಟಲ್ ಮಿಷನ್ (ABDM) ಆಧಾರಿತ', footerData: 'ಡೇಟಾ: NHA · NIC · ಭಾರತ ಸರ್ಕಾರ', signOut: 'ಸೈನ್ ಔಟ್' },
  gu: { abhaBody: 'તમારી 14 અંકની આયુષ્માન ભારત હેલ્થ આઈડી બનાવો', notificationsBody: 'નિયત તારીખો માટે પુશ સૂચનાઓ', vaccinationSub: 'બધો ટીકાકરણ ઇતિહાસ ડાઉનલોડ કરો', healthCardSub: 'ડિજિટલ રસીકરણ કાર્ડ', pmjaySub: 'આયુષ્માન ભારત · ₹5 લાખ/વર્ષ કવરેજ', rbskSub: '0–18 વર્ષ માટે મફત તપાસ', jsySub: 'માતૃત્વ લાભ યોજના', missionSub: 'સાર્વત્રિક રસીકરણ કાર્યક્રમ', privacySub: 'અમે તમારો ડેટા કેવી રીતે સુરક્ષિત રાખીએ છીએ', helpSub: 'સામાન્ય પ્રશ્નોના જવાબ', setUp: 'સેટ અપ', footerVersion: 'વર્ઝન 1.0.0 · ભારત માટે', footerMission: 'આયુષ્માન ભારત ડિજિટલ મિશન (ABDM) આધારિત', footerData: 'ડેટા: NHA · NIC · ભારત સરકાર', signOut: 'સાઇન આઉટ' },
  ml: { abhaBody: 'നിങ്ങളുടെ 14 അക്ക ആയുഷ്മാൻ ഭാരത് ഹെൽത്ത് ഐഡി സൃഷ്ടിക്കുക', notificationsBody: 'ഡ്യൂ തീയതികൾക്കായുള്ള പുഷ് അറിയിപ്പുകൾ', vaccinationSub: 'എല്ലാ വാക്സിൻ ചരിത്രവും ഡൗൺലോഡ് ചെയ്യുക', healthCardSub: 'ഡിജിറ്റൽ ഇമ്യൂണൈസേഷൻ കാർഡ്', pmjaySub: 'ആയുഷ്മാൻ ഭാരത് · ₹5 ലക്ഷം/വർഷം കവർേജ്', rbskSub: '0–18 വയസ്സുകാരുടെ സൗജന്യ പരിശോധന', jsySub: 'മാതൃത്വ લાભ പദ്ധതി', missionSub: 'സർവത്ര വാക്സിനേഷൻ പദ്ധതി', privacySub: 'നിങ്ങളുടെ ഡാറ്റ ഞങ്ങൾ എങ്ങനെ സംരക്ഷിക്കുന്നു', helpSub: 'സാധാരണ ചോദ്യങ്ങൾക്ക് ഉത്തരങ്ങൾ', setUp: 'സെറ്റ് അപ്പ്', footerVersion: 'പതിപ്പ് 1.0.0 · ഇന്ത്യയ്ക്കായി', footerMission: 'ആയുഷ്മാൻ ഭാരത് ഡിജിറ്റൽ മിഷൻ (ABDM) അടിസ്ഥാനമാക്കി', footerData: 'ഡാറ്റ: NHA · NIC · ഇന്ത്യ സർക്കാർ', signOut: 'സൈൻ ഔട്ട്' },
  pa: { abhaBody: 'ਆਪਣੀ 14 ਅੰਕਾਂ ਦੀ ਆਯੁਸ਼ਮਾਨ ਭਾਰਤ ਹੈਲਥ ਆਈਡੀ ਬਣਾਓ', notificationsBody: 'ਡਿਊ ਮਿਤੀਆਂ ਲਈ ਪੁਸ਼ ਸੁਚਨਾਵਾਂ', vaccinationSub: 'ਸਾਰਾ ਟੀਕਾਕਰਨ ਇਤਿਹਾਸ ਡਾਊਨਲੋਡ ਕਰੋ', healthCardSub: 'ਡਿਜ਼ਿਟਲ ਟੀਕਾਕਰਨ ਕਾਰਡ', pmjaySub: 'ਆਯੁਸ਼ਮਾਨ ਭਾਰਤ · ₹5 ਲੱਖ/ਸਾਲ ਕਵਰੇਜ', rbskSub: '0–18 ਸਾਲ ਲਈ ਮੁਫ਼ਤ ਜਾਂਚ', jsySub: 'ਮਾਤ੍ਰਤਵ ਲਾਭ ਯੋਜਨਾ', missionSub: 'ਸਰਵ ਭਾਰਤੀ ਟੀਕਾਕਰਨ ਪ੍ਰੋਗਰਾਮ', privacySub: 'ਅਸੀਂ ਤੁਹਾਡਾ ਡਾਟਾ ਕਿਵੇਂ ਸੁਰੱਖਿਅਤ ਰੱਖਦੇ ਹਾਂ', helpSub: 'ਆਮ ਸਵਾਲਾਂ ਦੇ ਜਵਾਬ', setUp: 'ਸੈਟ ਅਪ', footerVersion: 'ਵਰਜਨ 1.0.0 · ਭਾਰਤ ਲਈ', footerMission: 'ਆਯੁਸ਼ਮਾਨ ਭਾਰਤ ਡਿਜ਼ਿਟਲ ਮਿਸ਼ਨ (ABDM) ਤੇ ਆਧਾਰਿਤ', footerData: 'ਡਾਟਾ: NHA · NIC · ਭਾਰਤ ਸਰਕਾਰ', signOut: 'ਸਾਈਨ ਆਉਟ' },
  or: { abhaBody: 'ଆପଣଙ୍କ 14 ଅଙ୍କର ଆୟୁଷ୍ମାନ ଭାରତ ହେଲ୍ଥ ଆଇଡି ତିଆରି କରନ୍ତୁ', notificationsBody: 'ଦେୟ ତାରିଖ ପାଇଁ ପୁଶ ସୂଚନା', vaccinationSub: 'ସମସ୍ତ ଟିକା ଇତିହାସ ଡାଉନଲୋଡ କରନ୍ତୁ', healthCardSub: 'ଡିଜିଟାଲ ଟିକାକରଣ କାର୍ଡ', pmjaySub: 'ଆୟୁଷ୍ମାନ ଭାରତ · ₹5 ଲକ୍ଷ/ବର୍ଷ କଭରେଜ୍', rbskSub: '0–18 ବର୍ଷ ପାଇଁ ନି:ଶୁଳ୍କ ସ୍କ୍ରିନିଂ', jsySub: 'ମାତୃତ୍ୱ ଲାଭ ଯୋଜନା', missionSub: 'ସାର୍ବଭୌମ ଟିକାକରଣ କାର୍ଯ୍ୟକ୍ରମ', privacySub: 'ଆମେ ଆପଣଙ୍କ ତଥ୍ୟ କେମିତି ସୁରକ୍ଷିତ ରଖୁଛୁ', helpSub: 'ସାଧାରଣ ପ୍ରଶ୍ନର ଉତ୍ତର', setUp: 'ସେଟ୍ ଅପ୍', footerVersion: 'ସଂସ୍କରଣ 1.0.0 · ଭାରତ ପାଇଁ', footerMission: 'ଆୟୁଷ୍ମାନ ଭାରତ ଡିଜିଟାଲ ମିଶନ (ABDM) ଉପରେ ଆଧାରିତ', footerData: 'ଡାଟା: NHA · NIC · ଭାରତ ସରକାର', signOut: 'ସାଇନ୍ ଆଉଟ୍' },
  as: { abhaBody: 'আপোনাৰ 14 সংখ্যাৰ আয়ুষ্মান ভাৰত হেল্থ আইডি তৈয়াৰ কৰক', notificationsBody: 'ডিউ তাৰিখৰ বাবে পুশ জাননী', vaccinationSub: 'সকলো টিকাকৰণ ইতিহাস ডাউনলোড কৰক', healthCardSub: 'ডিজিটেল টিকাকৰণ কাৰ্ড', pmjaySub: 'আয়ুষ্মান ভাৰত · ₹5 লাখ/বছৰ কভাৰেজ', rbskSub: '0–18 বছৰৰ বাবে বিনামূলীয়া স্ক্ৰিনিং', jsySub: 'মাতৃত্ব লাভ আঁচনি', missionSub: 'সৰ্বজনীন টিকাকৰণ কাৰ্যসূচী', privacySub: 'আমি আপোনাৰ ডাটা কেনেকৈ সুৰক্ষিত ৰাখোঁ', helpSub: 'সাধাৰণ প্ৰশ্নৰ উত্তৰ', setUp: 'ছেট আপ', footerVersion: 'সংস্কৰণ 1.0.0 · ভাৰতৰ বাবে', footerMission: 'আয়ুষ্মান ভাৰত ডিজিটেল মিছন (ABDM)ৰ ওপৰত ভিত্তি কৰি', footerData: 'ডাটা: NHA · NIC · ভাৰত চৰকাৰ', signOut: 'চাইন আউট' },
};

const SETTINGS_VISIBLE_TEXT: Record<Language, {
  vaccinationRecords: string;
  healthCard: string;
  privacy: string;
  help: string;
  recordsSummary: string;
  healthCardSummary: string;
  viewSchedule: string;
  openAbha: string;
}> = {
  en: { vaccinationRecords: 'Vaccination Records', healthCard: 'Health Card', privacy: 'Data Privacy', help: 'Help & FAQ', recordsSummary: 'All linked child records stay available in Schedule for quick download and review.', healthCardSummary: 'Link ABHA to unlock a digital immunization card accepted at public health facilities.', viewSchedule: 'Open Schedule', openAbha: 'Open ABHA' },
  hi: { vaccinationRecords: 'टीकाकरण रिकॉर्ड', healthCard: 'हेल्थ कार्ड', privacy: 'डेटा गोपनीयता', help: 'सहायता और प्रश्न', recordsSummary: 'जुड़े हुए सभी बच्चों के रिकॉर्ड शेड्यूल में सुरक्षित रहते हैं और वहीं से डाउनलोड किए जा सकते हैं।', healthCardSummary: 'सार्वजनिक स्वास्थ्य केंद्रों में मान्य डिजिटल टीकाकरण कार्ड के लिए ABHA लिंक करें।', viewSchedule: 'शेड्यूल खोलें', openAbha: 'ABHA खोलें' },
  mr: { vaccinationRecords: 'लसीकरण नोंदी', healthCard: 'हेल्थ कार्ड', privacy: 'डेटा गोपनीयता', help: 'मदत आणि प्रश्न', recordsSummary: 'जोडलेल्या मुलांच्या सर्व नोंदी शेड्यूलमध्ये सुरक्षित आहेत आणि तिथून डाउनलोड करता येतात.', healthCardSummary: 'सार्वजनिक आरोग्य सुविधांसाठी मान्य डिजिटल लसीकरण कार्ड मिळवण्यासाठी ABHA जोडा.', viewSchedule: 'शेड्यूल उघडा', openAbha: 'ABHA उघडा' },
  bn: { vaccinationRecords: 'টিকাকরণ রেকর্ড', healthCard: 'হেলথ কার্ড', privacy: 'ডেটা গোপনীয়তা', help: 'সহায়তা ও প্রশ্ন', recordsSummary: 'সংযুক্ত সব শিশুর রেকর্ড শিডিউলে সুরক্ষিত থাকে এবং সেখান থেকে ডাউনলোড করা যায়।', healthCardSummary: 'সরকারি স্বাস্থ্যকেন্দ্রে গ্রহণযোগ্য ডিজিটাল টিকাকরণ কার্ডের জন্য ABHA লিঙ্ক করুন।', viewSchedule: 'শিডিউল খুলুন', openAbha: 'ABHA খুলুন' },
  te: { vaccinationRecords: 'టీకా రికార్డులు', healthCard: 'హెల్త్ కార్డ్', privacy: 'డేటా గోప్యత', help: 'సహాయం మరియు ప్రశ్నలు', recordsSummary: 'లింక్ చేసిన పిల్లల రికార్డులు అన్నీ షెడ్యూల్‌లో సురక్షితంగా ఉంటాయి మరియు అక్కడి నుంచే డౌన్‌లోడ్ చేయవచ్చు.', healthCardSummary: 'ప్రభుత్వ ఆరోగ్య కేంద్రాల్లో ఉపయోగించే డిజిటల్ ఇమ్యూనైజేషన్ కార్డ్ కోసం ABHAను లింక్ చేయండి.', viewSchedule: 'షెడ్యూల్ తెరవండి', openAbha: 'ABHA తెరవండి' },
  ta: { vaccinationRecords: 'தடுப்பூசி பதிவுகள்', healthCard: 'ஹெல்த் கார்டு', privacy: 'தரவு தனியுரிமை', help: 'உதவி மற்றும் கேள்விகள்', recordsSummary: 'இணைக்கப்பட்ட அனைத்து குழந்தை பதிவுகளும் ஷெட்யூலில் பாதுகாப்பாக இருக்கும்; அங்கிருந்து பதிவிறக்கலாம்.', healthCardSummary: 'அரசு சுகாதார மையங்களில் ஏற்றுக்கொள்ளப்படும் டிஜிட்டல் தடுப்பூசி அட்டைக்காக ABHA-வை இணைக்கவும்.', viewSchedule: 'ஷெட்யூல் திறக்க', openAbha: 'ABHA திறக்க' },
  kn: { vaccinationRecords: 'ಲಸಿಕೆ ದಾಖಲೆಗಳು', healthCard: 'ಆರೋಗ್ಯ ಕಾರ್ಡ್', privacy: 'ಡೇಟಾ ಗೌಪ್ಯತೆ', help: 'ಸಹಾಯ ಮತ್ತು ಪ್ರಶ್ನೆಗಳು', recordsSummary: 'ಲಿಂಕ್ ಮಾಡಿದ ಮಕ್ಕಳ ಎಲ್ಲಾ ದಾಖಲೆಗಳು ವೇಳಾಪಟ್ಟಿಯಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿರುತ್ತವೆ ಮತ್ತು ಅಲ್ಲಿ നിന്ന് ಡೌನ್‌ಲೋಡ್ ಮಾಡಬಹುದು.', healthCardSummary: 'ಸಾರ್ವಜನಿಕ ಆರೋಗ್ಯ ಕೇಂದ್ರಗಳಲ್ಲಿ ಮಾನ್ಯ ಡಿಜಿಟಲ್ ಲಸಿಕೆ ಕಾರ್ಡ್‌ಗಾಗಿ ABHA ಅನ್ನು ಲಿಂಕ್ ಮಾಡಿ.', viewSchedule: 'ವೇಳಾಪಟ್ಟಿ ತೆರೆಯಿರಿ', openAbha: 'ABHA ತೆರೆಯಿರಿ' },
  gu: { vaccinationRecords: 'ટીકાકરણ રેકોર્ડ', healthCard: 'હેલ્થ કાર્ડ', privacy: 'ડેટા ગોપનીયતા', help: 'મદદ અને પ્રશ્નો', recordsSummary: 'જોડાયેલા તમામ બાળકોના રેકોર્ડ શેડ્યૂલમાં સુરક્ષિત રહે છે અને ત્યાંથી ડાઉનલોડ કરી શકાય છે.', healthCardSummary: 'સરકારી આરોગ્ય કેન્દ્રોમાં માન્ય ડિજિટલ રસીકરણ કાર્ડ માટે ABHA લિંક કરો.', viewSchedule: 'શેડ્યૂલ ખોલો', openAbha: 'ABHA ખોલો' },
  ml: { vaccinationRecords: 'വാക്സിനേഷൻ രേഖകൾ', healthCard: 'ഹെൽത്ത് കാർഡ്', privacy: 'ഡാറ്റാ സ്വകാര്യത', help: 'സഹായവും ചോദ്യങ്ങളും', recordsSummary: 'ലിങ്ക് ചെയ്ത എല്ലാ കുട്ടികളുടെ രേഖകളും ഷെഡ്യൂളിൽ സുരക്ഷിതമായി നിലനിൽക്കും, അവിടെ നിന്ന് ഡൗൺലോഡ് ചെയ്യാം.', healthCardSummary: 'പൊതു ആരോഗ്യ കേന്ദ്രങ്ങളിൽ ഉപയോഗിക്കാവുന്ന ഡിജിറ്റൽ പ്രതിരോധ കാർഡിനായി ABHA ബന്ധിപ്പിക്കുക.', viewSchedule: 'ഷെഡ്യൂൾ തുറക്കുക', openAbha: 'ABHA തുറക്കുക' },
  pa: { vaccinationRecords: 'ਟੀਕਾਕਰਨ ਰਿਕਾਰਡ', healthCard: 'ਹੈਲਥ ਕਾਰਡ', privacy: 'ਡਾਟਾ ਗੋਪਨੀਯਤਾ', help: 'ਮਦਦ ਅਤੇ ਸਵਾਲ', recordsSummary: 'ਜੁੜੇ ਹੋਏ ਸਾਰੇ ਬੱਚਿਆਂ ਦੇ ਰਿਕਾਰਡ ਸ਼ਡਿਊਲ ਵਿੱਚ ਸੁਰੱਖਿਅਤ ਰਹਿੰਦੇ ਹਨ ਅਤੇ ਓਥੋਂ ਡਾਊਨਲੋਡ ਕੀਤੇ ਜਾ ਸਕਦੇ ਹਨ।', healthCardSummary: 'ਸਰਕਾਰੀ ਸਿਹਤ ਕੇਂਦਰਾਂ ਵਿੱਚ ਮੰਨਿਆ ਜਾਣ ਵਾਲਾ ਡਿਜ਼ਿਟਲ ਟੀਕਾਕਰਨ ਕਾਰਡ ਲਈ ABHA ਲਿੰਕ ਕਰੋ।', viewSchedule: 'ਸ਼ਡਿਊਲ ਖੋਲ੍ਹੋ', openAbha: 'ABHA ਖੋਲ੍ਹੋ' },
  or: { vaccinationRecords: 'ଟିକାକରଣ ରେକର୍ଡ', healthCard: 'ହେଲ୍ଥ କାର୍ଡ', privacy: 'ତଥ୍ୟ ଗୋପନୀୟତା', help: 'ସହାୟତା ଓ ପ୍ରଶ୍ନ', recordsSummary: 'ଲିଙ୍କ ହୋଇଥିବା ସମସ୍ତ ଶିଶୁ ରେକର୍ଡ ଶେଡ୍ୟୁଲରେ ସୁରକ୍ଷିତ ରହେ ଏବଂ ସେଠାରୁ ଡାଉନଲୋଡ୍ କରିହେବ।', healthCardSummary: 'ସରକାରୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର ପାଇଁ ମାନ୍ୟ ଡିଜିଟାଲ ଟିକାକରଣ କାର୍ଡ ଖୋଲିବାକୁ ABHA ଲିଙ୍କ କରନ୍ତୁ।', viewSchedule: 'ଶେଡ୍ୟୁଲ ଖୋଲନ୍ତୁ', openAbha: 'ABHA ଖୋଲନ୍ତୁ' },
  as: { vaccinationRecords: 'টিকাকৰণ ৰেকৰ্ড', healthCard: 'হেল্থ কাৰ্ড', privacy: 'ডাটা গোপনীয়তা', help: 'সহায় আৰু প্ৰশ্ন', recordsSummary: 'লিংক কৰা সকলো শিশুৰ ৰেকৰ্ড শিডিউলত সুৰক্ষিত থাকে আৰু তাতেই ডাউনলোড কৰিব পাৰি।', healthCardSummary: 'চৰকাৰী স্বাস্থ্য কেন্দ্ৰত মান্য ডিজিটেল টিকাকৰণ কাৰ্ডৰ বাবে ABHA লিংক কৰক।', viewSchedule: 'শিডিউল খোলক', openAbha: 'ABHA খোলক' },
};

function AddChildModal({ onClose }: { onClose: () => void }) {
  const { t, language } = useTranslation();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<CreateChildGender>('male');
  const [activeField, setActiveField] = useState<'name' | 'dob' | 'gender'>('name');
  const [voiceError, setVoiceError] = useState('');
  const queryClient = useQueryClient();
  const mutation = useCreateChild({
    mutation: {
      onSuccess: (newChild) => {
        queryClient.invalidateQueries({ queryKey: getListChildrenQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        useAppStore.getState().setActiveChildId(newChild.id);
        onClose();
      }
    }
  });
  const guidePrompt = useMemo(() => {
    if (activeField === 'name') return getVoicePrompt(language, 'childProfile');
    if (activeField === 'dob') return getVoicePrompt(language, 'dob');
    return getVoicePrompt(language, 'gender');
  }, [activeField, language]);
  const handleTranscript = (transcript: string) => {
    setVoiceError('');
    const cleanText = transcript.trim();
    if (!cleanText) return;

    if (activeField === 'name') {
      setName(toTitleCase(cleanText));
      setActiveField('dob');
      return;
    }

    if (activeField === 'dob') {
      const parsedDate = parseSpokenDate(cleanText);
      if (!parsedDate) {
        setVoiceError(getVoiceFieldError(language, 'date'));
        return;
      }
      setDob(parsedDate);
      setActiveField('gender');
      return;
    }

    const parsedGender = matchGenderFromSpeech(cleanText);
    if (!parsedGender) {
      setVoiceError(getVoiceFieldError(language, 'gender'));
      return;
    }
    setGender(parsedGender);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ data: { name, dob, gender } });
  };
  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('addNewChildProfile')}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <SwasthyaSewaGuide
            prompt={guidePrompt}
            language={language}
            onTranscript={handleTranscript}
            autoListen
            className="mb-1"
            showUi={false}
          />
          <div onFocusCapture={() => setActiveField('name')}>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">{t('childNameLabel')}</label>
            <Input placeholder={t('enterFullName')} value={name} onChange={e => setName(e.target.value)} onFocus={() => setActiveField('name')} required className="dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div onFocusCapture={() => setActiveField('dob')}>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">{t('dobLabel')}</label>
            <Input type="date" value={dob} onChange={e => setDob(e.target.value)} onFocus={() => setActiveField('dob')} required max={new Date().toISOString().split('T')[0]} className="dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">{t('genderLabel')}</label>
            <Select value={gender} onValueChange={(v: any) => setGender(v)}>
              <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700" onFocus={() => setActiveField('gender')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t('boyLabel')}</SelectItem>
                <SelectItem value="female">{t('girlLabel')}</SelectItem>
                <SelectItem value="other">{t('otherGender')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {voiceError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {voiceError}
            </div>
          )}
          <Button type="submit" className="w-full rounded-xl font-bold h-11" disabled={mutation.isPending}>
            {mutation.isPending ? `${t('addBaby')}...` : t('addChildSchedule')}
          </Button>
        </form>
      </div>
    </div>
  );
}

function InfoModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-900 flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const language = useAppStore(state => state.language);
  const ui = SETTINGS_TEXT[language] ?? SETTINGS_TEXT.en;
  const visible = SETTINGS_VISIBLE_TEXT[language] ?? SETTINGS_VISIBLE_TEXT.en;
  const setLanguage = useAppStore(state => state.setLanguage);
  const darkMode = useAppStore(state => state.darkMode);
  const toggleDarkMode = useAppStore(state => state.toggleDarkMode);
  const activeChildId = useAppStore(state => state.activeChildId);
  const setActiveChildId = useAppStore(state => state.setActiveChildId);
  const parentName = useAppStore(state => state.parentName);
  const setParentName = useAppStore(state => state.setParentName);
  const { data: profile } = useGetUserProfile();
  const { data: children } = useListChildren();
  const [, navigate] = useLocation();
  const [notifs, setNotifs] = useState(true);
  const [reminderDays, setReminderDays] = useState(3);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(parentName || profile?.name || '');
  const locale = language === 'en' ? 'en-IN' : `${language}-IN`;

  const queryClient = useQueryClient();
  const updateProfile = useUpdateUserProfile({
    mutation: {
      onSuccess: (updatedProfile) => {
        if (updatedProfile?.name) {
          setParentName(updatedProfile.name);
        }
        if (updatedProfile?.language) {
          setLanguage(updatedProfile.language as Language);
        }
        queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
      }
    }
  });
  const deleteChild = useDeleteChild({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListChildrenQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    }
  });

  useEffect(() => {
    if (profile?.notificationsEnabled != null) {
      setNotifs(profile.notificationsEnabled);
    }
  }, [profile?.notificationsEnabled]);

  useEffect(() => {
    setNameInput(parentName || profile?.name || '');
  }, [parentName, profile?.name]);

  const persistProfile = async (overrides?: {
    name?: string;
    language?: Language;
    notificationsEnabled?: boolean;
  }) => {
    const resolvedName = (overrides?.name ?? nameInput ?? profile?.name ?? parentName).trim();
    await updateProfile.mutateAsync({
      data: {
        name: resolvedName || profile?.name || parentName || undefined,
        language: (overrides?.language ?? language) as any,
        notificationsEnabled: overrides?.notificationsEnabled ?? notifs,
      } as any,
    });
  };

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-950 min-h-full pb-24">

      {/* Modals */}
      {showAddChild && <AddChildModal onClose={() => setShowAddChild(false)} />}

      {activeModal === 'vaccination-records' && (
        <InfoModal title={visible.vaccinationRecords} onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 border border-blue-100 dark:border-blue-900">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">{visible.vaccinationRecords}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">{visible.recordsSummary}</p>
            </div>
            <button onClick={() => { setActiveModal(null); navigate('/schedule'); }}
              className="w-full h-10 bg-blue-600 text-white rounded-xl text-sm font-bold">
              {visible.viewSchedule} →
            </button>
          </div>
        </InfoModal>
      )}

      {activeModal === 'health-card' && (
        <InfoModal title={visible.healthCard} onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 border border-green-200 dark:border-green-900 text-center">
              <p className="text-4xl mb-2">🏥</p>
              <p className="text-sm font-bold text-green-800 dark:text-green-300">{visible.healthCard}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">{visible.healthCardSummary}</p>
            </div>
            <button onClick={() => { setActiveModal(null); navigate('/abha'); }}
              className="w-full h-10 bg-green-600 text-white rounded-xl text-sm font-bold">
              {visible.openAbha} →
            </button>
          </div>
        </InfoModal>
      )}

      {activeModal === 'pmjay' && (
        <InfoModal title="PM-JAY Benefits" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 border border-amber-100 dark:border-amber-900">
              <p className="font-bold text-amber-800 dark:text-amber-300 text-base mb-1">🏥 Ayushman Bharat PM-JAY</p>
              <p className="text-xs">Provides health coverage up to ₹5 lakh per family per year for secondary and tertiary hospitalisation.</p>
            </div>
            <div className="rounded-xl border border-amber-100 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/20 px-3 py-3">
              <p className="text-xs leading-relaxed">{ui.pmjaySub}</p>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">Helpline: 14555 · pmjay.gov.in</p>
          </div>
        </InfoModal>
      )}

      {activeModal === 'rbsk' && (
        <InfoModal title="Rashtriya Bal Swasthya Karyakram" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 border border-blue-100 dark:border-blue-900">
              <p className="font-bold text-blue-800 dark:text-blue-300 text-base mb-1">💊 RBSK Programme</p>
              <p className="text-xs">Free health screening and early intervention for children from birth to 18 years under 4D — Defects at Birth, Deficiencies, Diseases, and Developmental Delays.</p>
            </div>
            <div className="space-y-2">
              {['Mobile health teams at your doorstep', 'Covers 4Ds — 30 conditions', 'Free referral to govt facilities', 'Early detection saves lives', 'For children 0-18 years'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-blue-500 shrink-0" />
                  <span className="text-xs">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </InfoModal>
      )}

      {activeModal === 'jsy' && (
        <InfoModal title="Janani Suraksha Yojana" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="bg-pink-50 dark:bg-pink-950/30 rounded-xl p-3 border border-pink-100 dark:border-pink-900">
              <p className="font-bold text-pink-800 dark:text-pink-300 text-base mb-1">🤱 JSY Benefits</p>
              <p className="text-xs">Safe motherhood intervention promoting institutional delivery among below poverty line pregnant women to reduce maternal and neo-natal mortality.</p>
            </div>
            <div className="space-y-2">
              {['Cash assistance for delivery', '₹1400 for rural mothers', '₹1000 for urban mothers', 'Free institutional delivery', 'ASHA support services'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-pink-500 shrink-0" />
                  <span className="text-xs">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </InfoModal>
      )}

      {activeModal === 'mission-indradhanush' && (
        <InfoModal title="Mission Indradhanush" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="bg-violet-50 dark:bg-violet-950/30 rounded-xl p-3 border border-violet-100 dark:border-violet-900">
              <p className="font-bold text-violet-800 dark:text-violet-300 text-base mb-1">🍼 Mission Indradhanush</p>
              <p className="text-xs">Covers all children under 2 years and pregnant women who are partially vaccinated or unvaccinated — the Rainbow of Vaccines.</p>
            </div>
            <div className="space-y-2">
              {['BCG, OPV, DPT, HepB, Measles', 'Vitamin A supplementation', 'Tetanus toxoid for pregnant women', 'Special drives twice a year', 'District-level implementation'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-violet-500 shrink-0" />
                  <span className="text-xs">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </InfoModal>
      )}

      {activeModal === 'privacy' && (
        <InfoModal title={visible.privacy} onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 border border-green-100 dark:border-green-900 text-center">
              <Lock size={32} className="text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-800 dark:text-green-300">{visible.privacy}</p>
            </div>
            <div className="space-y-2">
              {['Data stored on Indian servers (NIC)', 'Aadhaar verified identity', 'ABDM compliant data standards', 'No data sold to third parties', 'DPDP Act 2023 compliant', 'End-to-end encrypted transfers'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <Shield size={13} className="text-green-500 shrink-0" />
                  <span className="text-xs">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </InfoModal>
      )}

      {activeModal === 'help' && (
        <InfoModal title={visible.help} onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            {[
              { q: 'How do I add a child?', a: 'Go to My Family → Add Child. Enter name, date of birth and gender. The schedule is auto-generated.' },
              { q: 'How to book a vaccine appointment?', a: 'Go to Centers → select a facility → pick a date and time slot → confirm booking. You\'ll get a PDF slip.' },
              { q: 'Can I cancel or reschedule?', a: 'Yes! Go to Home → Booked Appointments → tap Reschedule or Cancel. You\'ll need to confirm first.' },
              { q: 'How to change language?', a: 'Go to Settings → Language → tap your preferred language from the grid.' },
              { q: 'What is ABHA ID?', a: 'ABHA (Ayushman Bharat Health Account) is your 14-digit digital health ID issued by the National Health Authority.' },
            ].map(({ q, a }, i) => (
              <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{q}</p>
                </div>
                <div className="px-3.5 py-2.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{a}</p>
                </div>
              </div>
            ))}
            <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 pt-2">
              Helpline: 104 · Email: support@swasthyasetu.gov.in
            </p>
          </div>
        </InfoModal>
      )}

      {/* Parent profile card */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4">
        <div className="flex items-center gap-3.5">
          {/* Avatar with initials */}
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-md">
            {(parentName || profile?.name) ? (
              <span className="text-white text-xl font-bold">
                {(parentName || profile?.name || '').charAt(0).toUpperCase()}
              </span>
            ) : (
              <User size={24} className="text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { void persistProfile({ name: nameInput }); setEditingName(false); }
                    if (e.key === 'Escape') { setNameInput(parentName || profile?.name || ''); setEditingName(false); }
                  }}
                  className="flex-1 text-sm font-bold border border-primary/40 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-primary"
                  placeholder={t('yourName')}
                />
                <button
                  onClick={() => { void persistProfile({ name: nameInput }); setEditingName(false); }}
                  className="text-xs font-bold bg-primary text-white px-2 py-1 rounded-lg"
                >{t('save')}</button>
              </div>
            ) : (
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                {parentName || profile?.name || t('parentAccount')}
              </h2>
            )}
            {profile?.phone?.trim() && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                <Phone size={10} /> {profile.phone}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {t('swasthyaSetuMember')}
              </span>
              {language && (
                <span className="inline-block text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                  🌐 {LANGUAGE_NAMES[language]}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => { setNameInput(parentName || profile?.name || ''); setEditingName(v => !v); }}
            className="text-xs font-bold text-primary border border-primary/20 bg-primary/5 dark:bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors shrink-0"
          >
            {editingName ? t('cancelEdit') : t('editProfile')}
          </button>
        </div>
      </div>

      {/* Children profiles section */}
      <div className="px-3 pt-3 space-y-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Baby size={15} className="text-primary" /> {t('myChildren')}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {children?.length || 0} {t('childProfiles')}{(children?.length || 0) !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowAddChild(true)}
              className="flex items-center gap-1 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Plus size={12} /> {t('addBaby')}
            </button>
          </div>

          {children && children.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {children.map(child => {
                const isActive = activeChildId === child.id;
                const pct = Math.round((child.completedVaccines / child.totalVaccines) * 100);
                const statusColor = child.status === 'safe' ? 'bg-green-500' : child.status === 'due' ? 'bg-amber-500' : 'bg-red-500';
                const statusPill = child.status === 'safe'
                  ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                  : child.status === 'due'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400';
                const statusLabel = child.status === 'safe' ? t('safeStatus') : child.status === 'due' ? t('dueStatus') : t('missedStatus');

                return (
                  <div
                    key={child.id}
                    onClick={() => setActiveChildId(child.id)}
                    className={`px-3.5 py-3 cursor-pointer transition-colors ${isActive ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base text-white shrink-0 ${statusColor}`}>
                        {child.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{child.name}</p>
                          {isActive && (
                            <span className="text-[9px] font-bold uppercase bg-primary text-white px-1.5 py-0.5 rounded-full">{t('activeLabel')}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">
                          {t('dobLabel')}: {new Date(child.dob).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{pct}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusPill}`}>{statusLabel}</span>
                        <button
                          onClick={e => { e.stopPropagation(); deleteChild.mutate({ childId: child.id }); }}
                          className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-400 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                      {[
                        { val: child.completedVaccines, label: t('vaccineDone') },
                        { val: child.totalVaccines, label: t('vaccineTotal') },
                        { val: `${pct}%`, label: t('progressLabel') },
                      ].map(({ val, label }) => (
                        <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-1.5 text-center">
                          <p className="text-sm font-bold text-primary">{val}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 px-4">
              <Baby size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t('noChildrenYet')}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('addChildFirst')}</p>
            </div>
          )}
        </div>

        {/* ABHA Integration Card */}
        <button
          onClick={() => navigate('/abha')}
          className="w-full text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
        >
          <div className="flex items-center gap-3 px-3.5 py-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
              <Shield size={18} className="text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">ABHA</p>
                <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-full">{ui.setUp}</span>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">{ui.abhaBody}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
          </div>
          <div className="px-3.5 pb-2.5 flex items-center gap-4 text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-2">
            <span className="flex items-center gap-1"><Lock size={9} className="text-primary" /> Aadhaar Verified</span>
            <span className="flex items-center gap-1"><CheckCircle size={9} className="text-green-600" /> NHA Compliant</span>
            <span className="flex items-center gap-1"><Shield size={9} className="text-primary" /> ABDM Linked</span>
          </div>
        </button>

        {/* Preferences */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3.5 pt-3 pb-1">{t('preferences')}</p>

          {/* Language */}
          <div className="px-3.5 py-2.5">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                <Languages size={15} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('language')}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{LANGUAGE_NAMES[language as Language] || 'English'}</p>
              </div>
              <button
                onClick={() => setShowLangPicker(v => !v)}
                className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 dark:bg-primary/20 px-3 py-1.5 rounded-lg"
              >
                {showLangPicker ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showLangPicker ? t('closeLang') : t('changeLang')}
              </button>
            </div>
            {showLangPicker && (
              <div className="grid grid-cols-3 gap-1.5 pt-1 pb-2">
                {(Object.entries(LANGUAGE_NAMES) as [Language, string][]).map(([code, name]) => (
                  <button
                    key={code}
                    onClick={() => {
                      setLanguage(code);
                      setShowLangPicker(false);
                      void persistProfile({ language: code });
                    }}
                    className={`text-xs font-semibold py-2 px-2 rounded-lg border transition-all text-center ${
                      language === code
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary/50 bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3.5" />

          {/* Dark Mode */}
          <div className="flex items-center justify-between px-3.5 py-2.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {darkMode ? <Moon size={15} className="text-indigo-400" /> : <Sun size={15} className="text-amber-500" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('darkMode')}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{darkMode ? t('darkModeOn') : t('darkModeOff')}</p>
              </div>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3.5" />

          {/* Notifications */}
          <div className="flex items-center justify-between px-3.5 py-2.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                <Bell size={15} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('vaccineReminders')}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{ui.notificationsBody}</p>
              </div>
            </div>
            <Switch checked={notifs} onCheckedChange={(value) => { setNotifs(value); void persistProfile({ notificationsEnabled: value }); }} />
          </div>

          {notifs && (
            <>
              <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3.5" />
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
                    <Bell size={15} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('remindMe')}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{t('daysBefore')}</p>
                  </div>
                </div>
                <select
                  value={reminderDays}
                  onChange={e => setReminderDays(Number(e.target.value))}
                  className="bg-gray-100 dark:bg-gray-800 text-sm rounded-lg px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 outline-none font-semibold text-gray-900 dark:text-white"
                >
                  {[1, 2, 3, 5, 7].map(d => (
                    <option key={d} value={d}>{d} {t('daysBefore')}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Health Records */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3.5 pt-3 pb-1">{t('healthRecords')}</p>
          {[
            { icon: FileText, label: visible.vaccinationRecords, sub: ui.vaccinationSub, color: 'bg-blue-50 dark:bg-blue-950/40', ic: 'text-blue-600 dark:text-blue-400', modal: 'vaccination-records' },
            { icon: Shield, label: visible.healthCard, sub: ui.healthCardSub, color: 'bg-green-50 dark:bg-green-950/40', ic: 'text-green-600 dark:text-green-400', modal: 'health-card' },
          ].map(({ icon: Icon, label, sub, color, ic, modal }, i, arr) => (
            <React.Fragment key={label}>
              <button
                onClick={() => setActiveModal(modal)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon size={15} className={ic} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{sub}</p>
                  </div>
                </div>
                <ChevronRight size={15} className="text-gray-300 dark:text-gray-600" />
              </button>
              {i < arr.length - 1 && <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3.5" />}
            </React.Fragment>
          ))}
        </div>

        {/* Government Schemes */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3.5 pt-3 pb-1">{t('govSchemes')}</p>
          {[
            { emoji: '🏥', label: 'PM-JAY Benefits', sub: 'Ayushman Bharat · ₹5L/year coverage', modal: 'pmjay' },
            { emoji: '💊', label: 'RBSK Programme', sub: 'Free child health screening 0–18 years', modal: 'rbsk' },
            { emoji: '🤱', label: 'Janani Suraksha Yojana', sub: 'Maternity benefit scheme', modal: 'jsy' },
            { emoji: '🍼', label: 'Mission Indradhanush', sub: 'Universal immunization programme', modal: 'mission-indradhanush' },
          ].map(({ emoji, label, sub, modal }, i, arr) => (
            <React.Fragment key={label}>
              <button
                onClick={() => setActiveModal(modal)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-base shrink-0">{emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{label}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{sub}</p>
                  </div>
                </div>
                <ChevronRight size={15} className="text-gray-300 dark:text-gray-600 shrink-0" />
              </button>
              {i < arr.length - 1 && <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3.5" />}
            </React.Fragment>
          ))}
        </div>

        {/* Security & Legal */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3.5 pt-3 pb-1">{t('securityLegal')}</p>
          {[
            { icon: Shield, label: visible.privacy, sub: ui.privacySub, color: 'bg-green-50 dark:bg-green-950/40', ic: 'text-green-600 dark:text-green-400', modal: 'privacy' },
            { icon: HelpCircle, label: visible.help, sub: ui.helpSub, color: 'bg-violet-50 dark:bg-violet-950/40', ic: 'text-violet-600 dark:text-violet-400', modal: 'help' },
          ].map(({ icon: Icon, label, sub, color, ic, modal }, i, arr) => (
            <React.Fragment key={label}>
              <button
                onClick={() => setActiveModal(modal)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon size={15} className={ic} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{sub}</p>
                  </div>
                </div>
                <ChevronRight size={15} className="text-gray-300 dark:text-gray-600" />
              </button>
              {i < arr.length - 1 && <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3.5" />}
            </React.Fragment>
          ))}
        </div>

        {/* App info */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 text-center space-y-1">
          <p className="text-sm font-bold text-gray-900 dark:text-white">Raksha Setu</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">{ui.footerVersion}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">{ui.footerMission}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">{ui.footerData}</p>
        </div>

        {/* Sign out */}
        <button className="w-full flex items-center justify-center gap-2 text-sm font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 rounded-xl py-3 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
          <LogOut size={16} /> {ui.signOut}
        </button>
      </div>
    </div>
  );
}
