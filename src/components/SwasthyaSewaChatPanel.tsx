import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Loader2, Mic, RotateCcw, SendHorizonal, Sparkles, Volume2 } from 'lucide-react';
import { Link } from 'wouter';
import { useListChildren } from '@workspace/api-client-react';

import BookingModalConnected from '@/components/BookingModalConnected';
import SwasthyaSewaGuide, {
  SwasthyaSewaAvatar,
  getGuideUiCopy,
  type SwasthyaSewaGuideHandle,
} from '@/components/SwasthyaSewaGuide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { canonicalizeAssistantQuery, getAssistantUiCopy, localizeAssistantResponse, type AssistantIntent } from '@/lib/assistantLocale';
import { generateDaySlots, generateSessionSites, type BookingFacilityLike } from '@/lib/bookingSlots';
import { getCentersCopy } from '@/lib/centersLocale';
import { cn } from '@/lib/utils';
import { normalizeIndicDigits } from '@/lib/voice';
import { useAppStore, type Language } from '@/store';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  intent?: AssistantIntent;
  suggestions?: string[];
  actionData?: AssistantActionData;
};

type AssistantCenterOption = {
  id: string;
  name: string;
  address: string;
  distance?: string;
  type?: string;
  cost?: string;
};

type AssistantVaccineOption = {
  name: string;
  scheduledDate: string;
  status: string;
  ageLabel: string;
};

type AssistantSlotOption = {
  id: string;
  siteId: string;
  siteName: string;
  dateIso: string;
  dateLabel: string;
  time: string;
  capacityLeft: number;
};

type AssistantActionData = {
  centers?: AssistantCenterOption[];
  vaccines?: AssistantVaccineOption[];
  selected_center?: { id: string; name: string; address: string };
  slot_options?: AssistantSlotOption[];
};

type HealthFacility = BookingFacilityLike & {
  lat: number;
  lng: number;
  isFree: boolean;
  openHours: string;
  vaccinesAvailable: string[];
  district?: string;
  state?: string;
  pincode?: string;
  distanceKm?: number;
};

type BookingFlow =
  | { stage: 'idle' }
  | { stage: 'awaiting_location' }
  | { stage: 'awaiting_center'; facilities: HealthFacility[] }
  | { stage: 'awaiting_slot'; facility: HealthFacility; slots: AssistantSlotOption[] };

const BOOKING_TEXT = {
  en: {
    askLocation: 'To book an appointment, please share your city or use your current location.',
    searching: 'Checking the nearest government hospitals for you...',
    noLocation: 'Please share a city, pincode, district, or use your current location.',
    noHospitals: 'I could not find matching hospitals there. Please try another place.',
    chooseHospital: 'Here are the nearest hospitals. Please choose one.',
    chooseSlot: 'Please choose a time slot. I will open the booking page with your selection prefilled.',
    bookingOpened: 'Your booking page is ready. Please review it and tap the booking button yourself to finish.',
    useCurrentLocation: 'Use current location',
    locationBlocked: 'Location permission is blocked. Please type your city or pincode instead.',
    openSchedule: 'Open Schedule',
  },
  hi: {
    askLocation: 'अपॉइंटमेंट बुक करने के लिए अपना शहर बताइए या अपनी मौजूदा लोकेशन इस्तेमाल कीजिए।',
    searching: 'आपके लिए नज़दीकी सरकारी अस्पताल देख रही हूँ...',
    noLocation: 'कृपया शहर, पिनकोड, जिला बताइए या अपनी लोकेशन इस्तेमाल कीजिए।',
    noHospitals: 'उस जगह पर मिलते-जुलते अस्पताल नहीं मिले। कृपया दूसरी जगह बताइए।',
    chooseHospital: 'यह आपके नज़दीकी अस्पताल हैं। कृपया एक चुनिए।',
    chooseSlot: 'कृपया एक समय स्लॉट चुनिए। मैं आपकी जानकारी भरकर बुकिंग पेज खोल दूँगी।',
    bookingOpened: 'बुकिंग पेज तैयार है। कृपया देखकर अंत में बुकिंग बटन पर स्वयं टैप करें।',
    useCurrentLocation: 'मौजूदा लोकेशन',
    locationBlocked: 'लोकेशन अनुमति बंद है। कृपया शहर या पिनकोड लिखें।',
    openSchedule: 'शेड्यूल खोलें',
  },
  mr: {
    askLocation: 'अपॉइंटमेंट बुक करण्यासाठी तुमचे शहर सांगा किंवा तुमचे सध्याचे लोकेशन वापरा.',
    searching: 'तुमच्यासाठी जवळची सरकारी रुग्णालये पाहत आहे...',
    noLocation: 'कृपया शहर, पिनकोड, जिल्हा सांगा किंवा तुमचे लोकेशन वापरा.',
    noHospitals: 'त्या ठिकाणी जुळणारी रुग्णालये सापडली नाहीत. दुसरे ठिकाण वापरा.',
    chooseHospital: 'ही जवळची रुग्णालये आहेत. कृपया एक निवडा.',
    chooseSlot: 'कृपया वेळेचा स्लॉट निवडा. मी निवड भरून बुकिंग पेज उघडते.',
    bookingOpened: 'बुकिंग पेज तयार आहे. कृपया तपासा आणि शेवटी बुकिंग बटण स्वतः दाबा.',
    useCurrentLocation: 'सध्याचे लोकेशन',
    locationBlocked: 'लोकेशन परवानगी बंद आहे. कृपया शहर किंवा पिनकोड लिहा.',
    openSchedule: 'वेळापत्रक उघडा',
  },
  bn: {
    askLocation: 'অ্যাপয়েন্টমেন্ট বুক করতে আপনার শহর বলুন বা বর্তমান লোকেশন ব্যবহার করুন।',
    searching: 'আপনার জন্য কাছের সরকারি হাসপাতাল দেখছি...',
    noLocation: 'অনুগ্রহ করে শহর, পিনকোড, জেলা বলুন বা লোকেশন ব্যবহার করুন।',
    noHospitals: 'ওই জায়গায় মিলছে এমন হাসপাতাল পাওয়া যায়নি। অন্য জায়গা চেষ্টা করুন।',
    chooseHospital: 'এগুলি আপনার কাছের হাসপাতাল। একটি বেছে নিন।',
    chooseSlot: 'একটি সময় স্লট বেছে নিন। আমি তথ্য ভরে বুকিং পেজ খুলে দেব।',
    bookingOpened: 'বুকিং পেজ প্রস্তুত। দেখে শেষে বুকিং বাটনে নিজে ট্যাপ করুন।',
    useCurrentLocation: 'বর্তমান লোকেশন',
    locationBlocked: 'লোকেশন অনুমতি বন্ধ আছে। শহর বা পিনকোড লিখুন।',
    openSchedule: 'সময়সূচি খুলুন',
  },
  te: {
    askLocation: 'అపాయింట్‌మెంట్ బుక్ చేయడానికి మీ నగరం చెప్పండి లేదా ప్రస్తుత లొకేషన్ ఉపయోగించండి.',
    searching: 'మీ కోసం దగ్గరలోని ప్రభుత్వ ఆసుపత్రులు చూస్తున్నాను...',
    noLocation: 'దయచేసి నగరం, పిన్‌కోడ్, జిల్లా చెప్పండి లేదా లొకేషన్ ఉపయోగించండి.',
    noHospitals: 'ఆ ప్రాంతంలో సరిపడే ఆసుపత్రులు దొరకలేదు. ఇంకో చోట ప్రయత్నించండి.',
    chooseHospital: 'ఇవి మీకు దగ్గరలోని ఆసుపత్రులు. ఒకటి ఎంచుకోండి.',
    chooseSlot: 'ఒక టైమ్ స్లాట్ ఎంచుకోండి. మీ ఎంపికతో బుకింగ్ పేజీ తెరిస్తాను.',
    bookingOpened: 'బుకింగ్ పేజీ సిద్ధంగా ఉంది. చూసి చివర్లో బుకింగ్ బటన్ మీరు నొక్కండి.',
    useCurrentLocation: 'ప్రస్తుత లొకేషన్',
    locationBlocked: 'లొకేషన్ అనుమతి నిలిపివేశారు. నగరం లేదా పిన్‌కోడ్ టైప్ చేయండి.',
    openSchedule: 'షెడ్యూల్ తెరువు',
  },
  ta: {
    askLocation: 'அப்பாயிண்ட்மெண்ட் பதிவு செய்ய உங்கள் நகரத்தை சொல்லுங்கள் அல்லது தற்போதைய இடத்தை பயன்படுத்துங்கள்.',
    searching: 'உங்களுக்கான அருகிலுள்ள அரசு மருத்துவமனைகளை பார்க்கிறேன்...',
    noLocation: 'நகரம், பின்கோடு, மாவட்டம் சொல்லுங்கள் அல்லது இடத்தை பயன்படுத்துங்கள்.',
    noHospitals: 'அந்த இடத்தில் பொருந்தும் மருத்துவமனைகள் கிடைக்கவில்லை. வேறு இடம் முயற்சி செய்யுங்கள்.',
    chooseHospital: 'இவை அருகிலுள்ள மருத்துவமனைகள். ஒன்றைத் தேர்ந்தெடுக்கவும்.',
    chooseSlot: 'ஒரு நேர இடத்தை தேர்ந்தெடுக்கவும். உங்கள் தேர்வுடன் பதிவு பக்கத்தைத் திறப்பேன்.',
    bookingOpened: 'பதிவு பக்கம் தயாராக உள்ளது. பார்த்து இறுதியில் பதிவு பொத்தானை நீங்களே அழுத்தவும்.',
    useCurrentLocation: 'தற்போதைய இடம்',
    locationBlocked: 'இட அனுமதி முடக்கப்பட்டுள்ளது. நகரம் அல்லது பின்கோடு টাইப் செய்யுங்கள்.',
    openSchedule: 'அட்டவணை திறக்க',
  },
  kn: {
    askLocation: 'ಅಪಾಯಿಂಟ್ಮೆಂಟ್ ಬುಕ್ ಮಾಡಲು ನಿಮ್ಮ ನಗರವನ್ನು ಹೇಳಿ ಅಥವಾ ನಿಮ್ಮ ಈಗಿನ ಸ್ಥಳವನ್ನು ಬಳಸಿ.',
    searching: 'ನಿಮಗಾಗಿ ಹತ್ತಿರದ ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆಗಳನ್ನು ನೋಡುತ್ತಿದ್ದೇನೆ...',
    noLocation: 'ದಯವಿಟ್ಟು ನಗರ, ಪಿನ್‌ಕೋಡ್, ಜಿಲ್ಲೆ ಹೇಳಿ ಅಥವಾ ಸ್ಥಳ ಬಳಸಿ.',
    noHospitals: 'ಆ ಸ್ಥಳದಲ್ಲಿ ಹೊಂದುವ ಆಸ್ಪತ್ರೆಗಳು ಸಿಗಲಿಲ್ಲ. ಇನ್ನೊಂದು ಸ್ಥಳ ಪ್ರಯತ್ನಿಸಿ.',
    chooseHospital: 'ಇವು ನಿಮ್ಮ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳು. ದಯವಿಟ್ಟು ಒಂದನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
    chooseSlot: 'ಒಂದು ಸಮಯ ಸ್ಲಾಟ್ ಆಯ್ಕೆಮಾಡಿ. ನಿಮ್ಮ ಆಯ್ಕೆಯೊಂದಿಗೆ ಬುಕ್ಕಿಂಗ್ ಪುಟ ತೆರುತ್ತೇನೆ.',
    bookingOpened: 'ಬುಕ್ಕಿಂಗ್ ಪುಟ ಸಿದ್ಧವಾಗಿದೆ. ನೋಡಿ ಕೊನೆಯಲ್ಲಿ ಬುಕ್ಕಿಂಗ್ ಬಟನ್ ಅನ್ನು ನೀವೇ ಒತ್ತಿ.',
    useCurrentLocation: 'ಈಗಿನ ಸ್ಥಳ',
    locationBlocked: 'ಸ್ಥಳ ಅನುಮತಿ ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ. ನಗರ ಅಥವಾ ಪಿನ್‌ಕೋಡ್ ಟೈಪ್ ಮಾಡಿ.',
    openSchedule: 'ವೇಳಾಪಟ್ಟಿ ತೆರೆಯಿರಿ',
  },
  gu: {
    askLocation: 'અપોઇન્ટમેન્ટ બુક કરવા માટે તમારું શહેર કહો અથવા હાલનું લોકેશન વાપરો.',
    searching: 'તમારા માટે નજીકની સરકારી હોસ્પિટલો જોઈ રહી છું...',
    noLocation: 'કૃપા કરીને શહેર, પિનકોડ, જિલ્લા કહો અથવા લોકેશન વાપરો.',
    noHospitals: 'આ જગ્યાએ મળતી હોસ્પિટલો મળી નથી. બીજી જગ્યા અજમાવો.',
    chooseHospital: 'આ નજીકની હોસ્પિટલો છે. કૃપા કરીને એક પસંદ કરો.',
    chooseSlot: 'કૃપા કરીને સમય સ્લોટ પસંદ કરો. તમારી પસંદગી સાથે બુકિંગ પેજ ખોલી દઈશ.',
    bookingOpened: 'બુકિંગ પેજ તૈયાર છે. તપાસીને છેલ્લે બુકિંગ બટન તમે જ દબાવો.',
    useCurrentLocation: 'હાલનું લોકેશન',
    locationBlocked: 'લોકેશન પરવાનગી બંધ છે. શહેર અથવા પિનકોડ લખો.',
    openSchedule: 'શેડ્યૂલ ખોલો',
  },
  ml: {
    askLocation: 'അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യാൻ നിങ്ങളുടെ നഗരം പറയുക അല്ലെങ്കിൽ ഇപ്പോഴുള്ള സ്ഥലം ഉപയോഗിക്കുക.',
    searching: 'നിങ്ങൾക്കായി സമീപത്തിലുള്ള സർക്കാർ ആശുപത്രികൾ നോക്കുകയാണ്...',
    noLocation: 'നഗരം, പിൻകോഡ്, ജില്ല പറയുക അല്ലെങ്കിൽ സ്ഥലം ഉപയോഗിക്കുക.',
    noHospitals: 'ആ സ്ഥലത്ത് ചേരുന്ന ആശുപത്രികൾ കണ്ടെത്താനായില്ല. മറ്റൊരു സ്ഥലം ശ്രമിക്കുക.',
    chooseHospital: 'ഇവയാണ് സമീപത്തിലുള്ള ആശുപത്രികൾ. ഒന്ന് തിരഞ്ഞെടുക്കുക.',
    chooseSlot: 'ഒരു സമയം സ്ലോട്ട് തിരഞ്ഞെടുക്കുക. നിങ്ങളുടെ തിരഞ്ഞെടുപ്പോടെ ബുക്കിംഗ് പേജ് തുറക്കും.',
    bookingOpened: 'ബുക്കിംഗ് പേജ് തയ്യാറാണ്. പരിശോധിച്ച് അവസാനം ബുക്കിംഗ് ബട്ടൺ നിങ്ങൾ തന്നെ അമർത്തുക.',
    useCurrentLocation: 'നിലവിലെ സ്ഥലം',
    locationBlocked: 'ലൊക്കേഷൻ അനുമതി തടഞ്ഞിരിക്കുന്നു. നഗരം അല്ലെങ്കിൽ പിൻകോഡ് ടൈപ്പ് ചെയ്യുക.',
    openSchedule: 'ഷെഡ്യൂൾ തുറക്കുക',
  },
  pa: {
    askLocation: 'ਅਪਾਇੰਟਮੈਂਟ ਬੁੱਕ ਕਰਨ ਲਈ ਆਪਣਾ ਸ਼ਹਿਰ ਦੱਸੋ ਜਾਂ ਮੌਜੂਦਾ ਲੋਕੇਸ਼ਨ ਵਰਤੋ।',
    searching: 'ਤੁਹਾਡੇ ਲਈ ਨੇੜਲੇ ਸਰਕਾਰੀ ਹਸਪਤਾਲ ਵੇਖ ਰਹੀ ਹਾਂ...',
    noLocation: 'ਕਿਰਪਾ ਕਰਕੇ ਸ਼ਹਿਰ, ਪਿੰਨਕੋਡ, ਜ਼ਿਲ੍ਹਾ ਦੱਸੋ ਜਾਂ ਲੋਕੇਸ਼ਨ ਵਰਤੋ।',
    noHospitals: 'ਉਸ ਥਾਂ ਉੱਤੇ ਮਿਲਦੇ ਹਸਪਤਾਲ ਨਹੀਂ ਮਿਲੇ। ਹੋਰ ਥਾਂ ਅਜ਼ਮਾਓ।',
    chooseHospital: 'ਇਹ ਨੇੜਲੇ ਹਸਪਤਾਲ ਹਨ। ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਚੁਣੋ।',
    chooseSlot: 'ਕਿਰਪਾ ਕਰਕੇ ਸਮੇਂ ਦਾ ਸਲਾਟ ਚੁਣੋ। ਤੁਹਾਡੀ ਚੋਣ ਨਾਲ ਬੁੱਕਿੰਗ ਪੇਜ ਖੋਲ੍ਹਾਂਗੀ।',
    bookingOpened: 'ਬੁੱਕਿੰਗ ਪੇਜ ਤਿਆਰ ਹੈ। ਦੇਖ ਕੇ ਅੰਤ ਵਿੱਚ ਬੁੱਕਿੰਗ ਬਟਨ ਤੁਸੀਂ ਆਪ ਦਬਾਓ।',
    useCurrentLocation: 'ਮੌਜੂਦਾ ਲੋਕੇਸ਼ਨ',
    locationBlocked: 'ਲੋਕੇਸ਼ਨ ਇਜਾਜ਼ਤ ਰੁਕੀ ਹੋਈ ਹੈ। ਸ਼ਹਿਰ ਜਾਂ ਪਿੰਨਕੋਡ ਲਿਖੋ।',
    openSchedule: 'ਸ਼ਡਿਊਲ ਖੋਲ੍ਹੋ',
  },
  or: {
    askLocation: 'ଆପଏଣ୍ଟମେଣ୍ଟ ବୁକ କରିବା ପାଇଁ ଆପଣଙ୍କ ସହର କହନ୍ତୁ କିମ୍ବା ବର୍ତ୍ତମାନ ଲୋକେସନ ବ୍ୟବହାର କରନ୍ତୁ।',
    searching: 'ଆପଣଙ୍କ ପାଇଁ ନିକଟସ୍ଥ ସରକାରୀ ହସ୍ପିଟାଲ ଦେଖୁଛି...',
    noLocation: 'ଦୟାକରି ସହର, ପିନକୋଡ, ଜିଲ୍ଲା କହନ୍ତୁ କିମ୍ବା ଲୋକେସନ ବ୍ୟବହାର କରନ୍ତୁ।',
    noHospitals: 'ସେଠାରେ ମେଳ ହେଉଥିବା ହସ୍ପିଟାଲ ମିଳିଲା ନାହିଁ। ଅନ୍ୟ ସ୍ଥାନ ଚେଷ୍ଟା କରନ୍ତୁ।',
    chooseHospital: 'ଏଗୁଡିକ ନିକଟସ୍ଥ ହସ୍ପିଟାଲ। ଦୟାକରି ଗୋଟିଏ ବାଛନ୍ତୁ।',
    chooseSlot: 'ଦୟାକରି ଗୋଟିଏ ସମୟ ସ୍ଲଟ ବାଛନ୍ତୁ। ଆପଣଙ୍କ ଚୟନ ସହ ବୁକିଂ ପେଜ ଖୋଲିଦେବି।',
    bookingOpened: 'ବୁକିଂ ପେଜ ପ୍ରସ୍ତୁତ ଅଛି। ଦେଖି ସେଷରେ ବୁକିଂ ବଟନ ଆପଣ ନିଜେ ଦବାନ୍ତୁ।',
    useCurrentLocation: 'ବର୍ତ୍ତମାନ ଲୋକେସନ',
    locationBlocked: 'ଲୋକେସନ ଅନୁମତି ବନ୍ଦ ଅଛି। ସହର କିମ୍ବା ପିନକୋଡ ଲେଖନ୍ତୁ।',
    openSchedule: 'ସୂଚୀ ଖୋଲନ୍ତୁ',
  },
  as: {
    askLocation: 'এপইণ্টমেণ্ট বুক কৰিবলৈ আপোনাৰ চহৰ কওক নাইবা বৰ্তমান লোকেচন ব্যৱহাৰ কৰক।',
    searching: 'আপোনাৰ বাবে ওচৰৰ চৰকাৰী হাস্পতাল চাই আছোঁ...',
    noLocation: 'অনুগ্ৰহ কৰি চহৰ, পিনকোড, জিলা কওক নাইবা লোকেচন ব্যৱহাৰ কৰক।',
    noHospitals: 'সেই ঠাইত মিল থকা হাস্পতাল পোৱা নগʼল। আন ঠাই চেষ্টা কৰক।',
    chooseHospital: 'এইবোৰ ওচৰৰ হাস্পতাল। অনুগ্ৰহ কৰি এটাক বাছক।',
    chooseSlot: 'এটা সময় স্লট বাছক। আপোনাৰ বাছনিসহ বুকিং পেজ খুলি দিম।',
    bookingOpened: 'বুকিং পেজ সাজু আছে। চাই শেষত বুকিং বুটাম আপুনি নিজেই টেপ কৰক।',
    useCurrentLocation: 'বৰ্তমান লোকেচন',
    locationBlocked: 'লোকেচন অনুমতি বন্ধ আছে। চহৰ বা পিনকোড লিখক।',
    openSchedule: 'সূচী খোলক',
  },
};

const DEFAULT_CHILD_NAME: Record<Language, string> = {
  en: 'your child',
  hi: 'आपके बच्चे',
  mr: 'तुमच्या बाळासाठी',
  bn: 'আপনার শিশুর জন্য',
  te: 'మీ బిడ్డ కోసం',
  ta: 'உங்கள் குழந்தைக்காக',
  kn: 'ನಿಮ್ಮ ಮಗುವಿಗಾಗಿ',
  gu: 'તમારા બાળક માટે',
  ml: 'നിങ്ങളുടെ കുഞ്ഞിന്',
  pa: 'ਤੁਹਾਡੇ ਬੱਚੇ ਲਈ',
  or: 'ଆପଣଙ୍କ ଶିଶୁ ପାଇଁ',
  as: 'আপোনাৰ শিশুৰ বাবে',
};

const CURRENT_LOCATION_PATTERNS = ['current location', 'my location', 'use my location', 'near me', 'लोकेशन', 'અવસ્થાન', 'স্থান', 'స్థానం', 'இருப்பிடம்', 'ಸ್ಥಳ', 'സ്ഥലം', 'ਲੋਕੇਸ਼ਨ', 'ଅବସ୍ଥାନ'];

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeText(value: string) {
  return normalizeIndicDigits(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distanceKm: number) {
  return distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
}

function buildSlotOptions(facility: HealthFacility) {
  const options: AssistantSlotOption[] = [];
  for (const site of generateSessionSites(facility)) {
    for (const slot of Object.values(generateDaySlots(facility.id, site.id))) {
      if (!slot.available) continue;
      options.push({
        id: `${site.id}-${slot.date.toISOString()}`,
        siteId: site.id,
        siteName: site.siteName,
        dateIso: slot.date.toISOString(),
        dateLabel: slot.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
        time: slot.time,
        capacityLeft: Math.max(0, slot.capacity - slot.booked),
      });
    }
  }
  return options.sort((a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime()).slice(0, 6);
}

function selectIndexFromText(text: string, max: number) {
  const match = normalizeText(text).match(/\b([1-9]\d?)\b/);
  if (!match) return null;
  const index = Number(match[1]) - 1;
  return index >= 0 && index < max ? index : null;
}

function containsIndicScript(text: string) {
  return /[\u0900-\u0D7F]/.test(text);
}

type ApproximateLocation = {
  lat: number;
  lng: number;
  city?: string;
  region?: string;
  country?: string;
};

function sanitizeAssistantActionData(value: unknown): AssistantActionData | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const raw = value as Record<string, unknown>;
  const centers = Array.isArray(raw.centers)
    ? raw.centers
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const center = entry as Record<string, unknown>;
          const id = center.id == null ? '' : String(center.id);
          const name = typeof center.name === 'string' ? center.name : '';
          const address = typeof center.address === 'string' ? center.address : '';
          if (!id || !name || !address) return null;
          return {
            id,
            name,
            address,
            distance: typeof center.distance === 'string' ? center.distance : undefined,
            type: typeof center.type === 'string' ? center.type : undefined,
            cost: typeof center.cost === 'string' ? center.cost : undefined,
          };
        })
        .filter((entry): entry is AssistantCenterOption => Boolean(entry))
    : undefined;

  const vaccines = Array.isArray(raw.vaccines)
    ? raw.vaccines
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const vaccine = entry as Record<string, unknown>;
          const name = typeof vaccine.name === 'string' ? vaccine.name : '';
          const scheduledDate = typeof vaccine.scheduledDate === 'string' ? vaccine.scheduledDate : '';
          const status = typeof vaccine.status === 'string' ? vaccine.status : '';
          const ageLabel = typeof vaccine.ageLabel === 'string' ? vaccine.ageLabel : '';
          if (!name || !scheduledDate) return null;
          return { name, scheduledDate, status, ageLabel };
        })
        .filter((entry): entry is AssistantVaccineOption => Boolean(entry))
    : undefined;

  const slotOptions = Array.isArray(raw.slot_options)
    ? raw.slot_options
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const slot = entry as Record<string, unknown>;
          const id = slot.id == null ? '' : String(slot.id);
          const siteId = slot.siteId == null ? '' : String(slot.siteId);
          const siteName = typeof slot.siteName === 'string' ? slot.siteName : '';
          const dateIso = typeof slot.dateIso === 'string' ? slot.dateIso : '';
          const dateLabel = typeof slot.dateLabel === 'string' ? slot.dateLabel : '';
          const time = typeof slot.time === 'string' ? slot.time : '';
          const capacityLeft = typeof slot.capacityLeft === 'number' ? slot.capacityLeft : 0;
          if (!id || !siteId || !siteName || !dateIso || !dateLabel || !time) return null;
          return { id, siteId, siteName, dateIso, dateLabel, time, capacityLeft };
        })
        .filter((entry): entry is AssistantSlotOption => Boolean(entry))
    : undefined;

  const selectedCenter = raw.selected_center && typeof raw.selected_center === 'object'
    ? (() => {
        const center = raw.selected_center as Record<string, unknown>;
        const id = center.id == null ? '' : String(center.id);
        const name = typeof center.name === 'string' ? center.name : '';
        const address = typeof center.address === 'string' ? center.address : '';
        return id && name && address ? { id, name, address } : undefined;
      })()
    : undefined;

  if (!centers && !vaccines && !slotOptions && !selectedCenter) {
    return undefined;
  }

  return {
    centers,
    vaccines,
    selected_center: selectedCenter,
    slot_options: slotOptions,
  };
}

export default function SwasthyaSewaChatPanel({ className }: { className?: string }) {
  const activeChildId = useAppStore((state) => state.activeChildId);
  const parentName = useAppStore((state) => state.parentName);
  const language = useAppStore((state) => state.language);
  const { data: children } = useListChildren();
  const child = children?.find((entry) => entry.id === activeChildId) ?? children?.[0];
  const childName = child?.name || DEFAULT_CHILD_NAME[language] || DEFAULT_CHILD_NAME.en;
  const assistantUi = getAssistantUiCopy(language);
  const guideUi = getGuideUiCopy(language);
  const bookingUi = BOOKING_TEXT[language as Language] ?? BOOKING_TEXT.en;
  const centersUi = getCentersCopy(language);
  const introText = localizeAssistantResponse(language, 'GENERAL', childName).message;
  const introSuggestions = localizeAssistantResponse(language, 'GENERAL', childName).suggestions;
  const englishFallback = useMemo(() => localizeAssistantResponse('en', 'GENERAL', childName), [childName]);

  const guideRef = useRef<SwasthyaSewaGuideHandle | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const datasetPromiseRef = useRef<Promise<HealthFacility[]> | null>(null);

  const [messages, setMessages] = useState<Message[]>([{ id: createId(), role: 'assistant', text: introText, suggestions: introSuggestions, intent: 'GENERAL' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataset, setDataset] = useState<HealthFacility[] | null>(null);
  const [bookingFlow, setBookingFlow] = useState<BookingFlow>({ stage: 'idle' });
  const [guidePrompt, setGuidePrompt] = useState(introText);
  const [guideReplayToken, setGuideReplayToken] = useState(0);
  const [guideAutoListen, setGuideAutoListen] = useState(false);
  const [bookingFacility, setBookingFacility] = useState<HealthFacility | null>(null);
  const [bookingSelection, setBookingSelection] = useState<{ siteId: string; dateIso: string } | null>(null);
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null);

  const speak = useCallback((text: string, autoListen = false) => {
    setGuidePrompt(text);
    setGuideAutoListen(autoListen);
    setGuideReplayToken((value) => value + 1);
  }, []);

  const appendAssistant = useCallback((text: string, extra: Partial<Message> = {}, autoListen = false) => {
    const safeText = typeof text === 'string' && text.trim() ? text : introText;
    setMessages((current) => [...current, { id: createId(), role: 'assistant', text: safeText, ...extra }]);
    speak(safeText, autoListen);
  }, [introText, speak]);

  const appendUser = useCallback((text: string) => {
    setMessages((current) => [...current, { id: createId(), role: 'user', text }]);
  }, []);

  const ensureDataset = useCallback(async () => {
    if (dataset) return dataset;
    if (datasetPromiseRef.current) return datasetPromiseRef.current;
    const promise = fetch(`${import.meta.env.BASE_URL}health-facilities.json`).then(async (response) => {
      const data = (await response.json()) as HealthFacility[];
      setDataset(data);
      datasetPromiseRef.current = null;
      return data;
    });
    datasetPromiseRef.current = promise;
    return promise;
  }, [dataset]);

  const fetchApproximateLocation = useCallback(async (): Promise<ApproximateLocation | null> => {
    try {
      const response = await fetch('/api/location/approx');
      if (!response.ok) return null;
      const data = await response.json() as Partial<ApproximateLocation>;
      if (typeof data.lat !== 'number' || typeof data.lng !== 'number') {
        return null;
      }
      return {
        lat: data.lat,
        lng: data.lng,
        city: data.city,
        region: data.region,
        country: data.country,
      };
    } catch {
      return null;
    }
  }, []);

  const openBooking = useCallback((facility: HealthFacility, slot: AssistantSlotOption) => {
    setBookingFlow({ stage: 'idle' });
    setBookingFacility(facility);
    setBookingSelection({ siteId: slot.siteId, dateIso: slot.dateIso });
    appendAssistant(bookingUi.bookingOpened);
  }, [appendAssistant, bookingUi.bookingOpened]);

  const promptForSlots = useCallback((facility: HealthFacility) => {
    const slots = buildSlotOptions(facility);
    if (!slots.length) {
      setBookingFlow({ stage: 'awaiting_location' });
      appendAssistant(bookingUi.noHospitals, {}, true);
      return;
    }
    setBookingFlow({ stage: 'awaiting_slot', facility, slots });
    appendAssistant(bookingUi.chooseSlot, {
      intent: 'BOOK_APPOINTMENT',
      actionData: {
        selected_center: { id: facility.id, name: facility.name, address: facility.address },
        slot_options: slots,
      },
    }, true);
  }, [appendAssistant, bookingUi.chooseSlot, bookingUi.noHospitals]);

  const findByQuery = useCallback((facilities: HealthFacility[], query: string) => {
    const normalized = normalizeText(query);
    return facilities
      .map((facility) => {
        const haystack = normalizeText([facility.name, facility.city, facility.district, facility.state, facility.address, facility.pincode].filter(Boolean).join(' '));
        const score = haystack.includes(normalized) ? (haystack.startsWith(normalized) ? 10 : 1) : 0;
        return { facility, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((entry) => entry.facility);
  }, []);

  const handleLocation = useCallback(async (value: string) => {
    const normalized = normalizeText(value);
    if (!normalized) {
      appendAssistant(bookingUi.noLocation, {}, true);
      return;
    }

    if (CURRENT_LOCATION_PATTERNS.some((pattern) => normalized.includes(normalizeText(pattern)))) {
      appendAssistant(bookingUi.searching);
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
        });
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLastCoords(coords);
        const facilities = (await ensureDataset())
          .map((facility) => ({ ...facility, distanceKm: haversine(coords.lat, coords.lng, facility.lat, facility.lng) }))
          .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
          .slice(0, 5);
        setBookingFlow({ stage: 'awaiting_center', facilities });
        appendAssistant(bookingUi.chooseHospital, {
          intent: 'BOOK_APPOINTMENT',
          actionData: {
            centers: facilities.map((facility) => ({
              id: facility.id,
              name: facility.name,
              address: facility.address,
              distance: facility.distanceKm != null ? formatDistance(facility.distanceKm) : undefined,
              type: facility.facilityType || facility.type,
              cost: facility.isFree ? centersUi.free : centersUi.paid,
            })),
          },
        }, true);
        return;
      } catch {
        const approximate = await fetchApproximateLocation();
        if (approximate) {
          const coords = { lat: approximate.lat, lng: approximate.lng };
          setLastCoords(coords);
          const facilities = (await ensureDataset())
            .map((facility) => ({ ...facility, distanceKm: haversine(coords.lat, coords.lng, facility.lat, facility.lng) }))
            .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
            .slice(0, 5);
          if (facilities.length) {
            setBookingFlow({ stage: 'awaiting_center', facilities });
            appendAssistant(bookingUi.chooseHospital, {
              intent: 'BOOK_APPOINTMENT',
              actionData: {
                centers: facilities.map((facility) => ({
                  id: facility.id,
                  name: facility.name,
                  address: facility.address,
                  distance: facility.distanceKm != null ? formatDistance(facility.distanceKm) : undefined,
                  type: facility.facilityType || facility.type,
                  cost: facility.isFree ? centersUi.free : centersUi.paid,
                })),
              },
            }, true);
            return;
          }
        }

        appendAssistant(bookingUi.locationBlocked, {}, true);
        return;
      }
    }

    appendAssistant(bookingUi.searching);
    const facilities = findByQuery(await ensureDataset(), value);
    if (!facilities.length) {
      setBookingFlow({ stage: 'awaiting_location' });
      appendAssistant(bookingUi.noHospitals, {}, true);
      return;
    }
    setBookingFlow({ stage: 'awaiting_center', facilities });
    appendAssistant(bookingUi.chooseHospital, {
      intent: 'BOOK_APPOINTMENT',
      actionData: {
        centers: facilities.map((facility) => ({
          id: facility.id,
          name: facility.name,
          address: facility.address,
          type: facility.facilityType || facility.type,
          cost: facility.isFree ? centersUi.free : centersUi.paid,
        })),
      },
    }, true);
  }, [appendAssistant, bookingUi.chooseHospital, bookingUi.locationBlocked, bookingUi.noHospitals, bookingUi.noLocation, bookingUi.searching, centersUi.free, centersUi.paid, ensureDataset, fetchApproximateLocation, findByQuery]);

  const handleFacilityChoice = useCallback(async (facilityId: string) => {
    const facilities = bookingFlow.stage === 'awaiting_center' ? bookingFlow.facilities : await ensureDataset();
    const facility = facilities.find((entry) => entry.id === facilityId) ?? facilities.find((entry) => entry.name === facilityId);
    if (facility) promptForSlots(facility);
  }, [bookingFlow, ensureDataset, promptForSlots]);

  const queryAssistant = useCallback(async (rawText: string) => {
    const { query, inferredIntent } = canonicalizeAssistantQuery(rawText);
    if (inferredIntent === 'BOOK_APPOINTMENT' || normalizeText(rawText).includes('book')) {
      setBookingFlow({ stage: 'awaiting_location' });
      appendAssistant(bookingUi.askLocation, { intent: 'BOOK_APPOINTMENT', suggestions: [bookingUi.useCurrentLocation] }, true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/assistant/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, rawMessage: rawText, childId: child?.id, language, lat: lastCoords?.lat, lng: lastCoords?.lng }),
      });
      const data = await response.json();
      const fallbackIntent = (data.intent as AssistantIntent | undefined) ?? 'GENERAL';
      const englishIntentFallback = localizeAssistantResponse('en', fallbackIntent, childName);
      const safeMessage = language === 'en' && containsIndicScript(String(data.message || ''))
        ? englishIntentFallback.message
        : String(data.message || '');
      const safeSuggestions = language === 'en' && Array.isArray(data.suggestions) && data.suggestions.some((item: string) => containsIndicScript(String(item)))
        ? englishIntentFallback.suggestions
        : data.suggestions;

      setMessages((current) => [...current, {
        id: createId(),
        role: 'assistant',
        text: safeMessage || englishFallback.message,
        intent: data.intent,
        suggestions: safeSuggestions,
        actionData: sanitizeAssistantActionData(data.action_data),
      }]);
      speak(safeMessage || englishFallback.message, false);
    } catch {
      appendAssistant(introText, { intent: 'GENERAL', suggestions: introSuggestions });
    } finally {
      setLoading(false);
    }
  }, [appendAssistant, bookingUi.askLocation, bookingUi.useCurrentLocation, child?.id, childName, englishFallback.message, introSuggestions, introText, language, lastCoords?.lat, lastCoords?.lng, speak]);

  const handleMessage = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    appendUser(trimmed);
    setInput('');

    if (bookingFlow.stage === 'awaiting_location') {
      await handleLocation(trimmed);
      return;
    }

    if (bookingFlow.stage === 'awaiting_center') {
      const index = selectIndexFromText(trimmed, bookingFlow.facilities.length);
      if (index != null) {
        promptForSlots(bookingFlow.facilities[index]);
        return;
      }
      const facility = bookingFlow.facilities.find((entry) => normalizeText(entry.name).includes(normalizeText(trimmed)));
      if (facility) {
        promptForSlots(facility);
        return;
      }
      appendAssistant(bookingUi.chooseHospital, {}, true);
      return;
    }

    if (bookingFlow.stage === 'awaiting_slot') {
      const index = selectIndexFromText(trimmed, bookingFlow.slots?.length ?? 0);
      if (index != null && bookingFlow.slots?.[index]) {
        openBooking(bookingFlow.facility, bookingFlow.slots[index]);
        return;
      }
      appendAssistant(bookingUi.chooseSlot, {}, true);
      return;
    }

    await queryAssistant(trimmed);
  }, [appendAssistant, appendUser, bookingFlow, bookingUi.chooseHospital, bookingUi.chooseSlot, handleLocation, openBooking, promptForSlots, queryAssistant]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const lastAssistantId = useMemo(() => messages.filter((message) => message.role === 'assistant').at(-1)?.id ?? null, [messages]);
  const resetChat = useCallback(() => {
    setMessages([{ id: createId(), role: 'assistant', text: introText, suggestions: introSuggestions, intent: 'GENERAL' }]);
    setBookingFlow({ stage: 'idle' });
    setBookingFacility(null);
    setBookingSelection(null);
    setGuideAutoListen(false);
    speak(introText, false);
  }, [introSuggestions, introText, speak]);

  return (
    <div className={cn('flex h-full flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl shadow-slate-900/8', className)}>
      <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-[#6c63ff] via-[#5f8cf5] to-[#43c6ff] px-5 pb-5 pt-5 text-white">
        <div className="absolute -left-14 top-0 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Swasthya Sewa
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">{parentName ? `${parentName.split(' ')[0]}, ` : ''}{assistantUi.status}</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-cyan-50/95">{introText}</p>
          </div>
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 3.4, ease: 'easeInOut' }} className="flex h-28 w-24 shrink-0 items-center justify-center rounded-[26px] bg-white/92 p-3 shadow-2xl shadow-slate-900/15 ring-1 ring-white/70">
            <SwasthyaSewaAvatar />
          </motion.div>
        </div>
      </div>

      <SwasthyaSewaGuide ref={guideRef} className="pointer-events-none absolute -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0" prompt={guidePrompt} language={language} replayToken={guideReplayToken} onTranscript={(transcript) => { void handleMessage(transcript); }} autoSpeak autoListen={guideAutoListen} speechRate={1.25} />

      <ScrollArea className="min-h-0 flex-1 bg-[#f7faff]">
        <div className="space-y-4 px-4 py-5">
          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const isAssistant = message.role === 'assistant';
              return (
                <motion.div key={message.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={cn('flex', isAssistant ? 'justify-start' : 'justify-end')}>
                  <div className={cn('max-w-[88%]', isAssistant ? 'pr-8' : 'pl-8')}>
                    {isAssistant && <div className="mb-2 flex items-center gap-2 px-1"><div className="h-8 w-8 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200"><SwasthyaSewaAvatar /></div><span className="text-xs font-semibold text-slate-500">Swasthya Sewa</span></div>}
                    <div className={cn('rounded-[26px] px-4 py-3 text-sm leading-relaxed shadow-sm', isAssistant ? 'bg-white text-slate-700 ring-1 ring-slate-200' : 'bg-gradient-to-br from-[#6c63ff] to-[#4d9fff] text-white')}>{message.text}</div>

                    {message.intent === 'BOOK_APPOINTMENT' && message.actionData?.centers && (
                      <div className="mt-3 grid gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                        {message.actionData.centers.map((center, index) => (
                          <button key={center.id} type="button" onClick={() => { void handleFacilityChoice(center.id); }} className="rounded-2xl bg-slate-50 px-3 py-3 text-left transition hover:bg-slate-100">
                            <p className="text-sm font-semibold text-slate-900">{index + 1}. {center.name}</p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500">{center.address}</p>
                            <p className="mt-1 text-[11px] font-medium text-slate-500">{[center.distance, center.type, center.cost].filter(Boolean).join(' · ')}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {message.intent === 'BOOK_APPOINTMENT' && message.actionData?.slot_options && (
                      <div className="mt-3 grid gap-2 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                        {message.actionData.slot_options.map((slot, index) => (
                          <button key={slot.id} type="button" onClick={() => {
                            if (bookingFlow.stage === 'awaiting_slot') {
                              openBooking(bookingFlow.facility, slot);
                            }
                          }} className="rounded-2xl border border-slate-200 px-3 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5">
                            <p className="text-sm font-semibold text-slate-900">{index + 1}. {slot.dateLabel}</p>
                            <p className="text-xs text-slate-500">{slot.time}</p>
                            <p className="mt-1 text-[11px] text-slate-500">{slot.siteName}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {message.intent === 'VACCINE_SCHEDULE' && message.actionData?.vaccines && (
                      <div className="mt-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="grid gap-2">
                          {message.actionData.vaccines.slice(0, 4).map((vaccine) => (
                            <div key={`${vaccine.name}-${vaccine.scheduledDate}`} className="rounded-2xl bg-slate-50 px-3 py-3">
                              <p className="text-sm font-semibold text-slate-900">{vaccine.name}</p>
                              <p className="text-xs text-slate-500">{vaccine.scheduledDate} · {vaccine.ageLabel}</p>
                            </div>
                          ))}
                          <Link href="/schedule" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{bookingUi.openSchedule}<ArrowRight className="h-4 w-4" /></Link>
                        </div>
                      </div>
                    )}

                    {message.id === lastAssistantId && message.suggestions?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion) => (
                          <button key={suggestion} type="button" onClick={() => { void handleMessage(suggestion); }} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/10">
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {loading && <div className="rounded-[24px] bg-white px-4 py-3 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200"><span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{assistantUi.loading}</span></div>}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleMessage(input);
          }}
          className="flex items-center gap-2 rounded-[30px] border border-slate-200 bg-slate-50/85 p-2 shadow-sm"
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={assistantUi.placeholder}
            className="h-12 flex-1 border-0 bg-transparent px-3 text-sm shadow-none focus-visible:ring-0"
          />
          <button
            type="button"
            onClick={() => { void guideRef.current?.replay(); }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
            title={guideUi.hear}
            aria-label={guideUi.hear}
          >
            <Volume2 className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={() => { void guideRef.current?.listen(); }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary transition hover:bg-primary/10"
            title={guideUi.answer}
            aria-label={guideUi.answer}
          >
            <Mic className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={resetChat}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
            title={assistantUi.reset}
            aria-label={assistantUi.reset}
          >
            <RotateCcw className="h-4.5 w-4.5" />
          </button>
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#4d9fff] shadow-lg shadow-primary/20"
            disabled={!input.trim() || loading}
          >
            <SendHorizonal className="h-5 w-5" />
          </Button>
        </form>
      </div>

      {bookingFacility && bookingSelection && <BookingModalConnected facility={bookingFacility} initialSelection={bookingSelection} onClose={() => { setBookingFacility(null); setBookingSelection(null); }} />}
    </div>
  );
}
