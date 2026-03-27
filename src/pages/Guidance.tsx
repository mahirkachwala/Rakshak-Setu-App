import React, { useState } from 'react';
import { Info, Thermometer, ShieldAlert, Baby, Droplets, Wind, Stethoscope, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'wouter';

const articles = [
  {
    title: 'Fever After Vaccination',
    icon: Thermometer,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    tag: 'Post-Vaccine Care',
    tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'Mild fever (up to 38.5°C) is normal after vaccination. Use a cool, damp cloth on the forehead. Give paracetamol in the correct weight-based dose. Ensure the child drinks plenty of fluids.',
    extra: 'Visit a doctor if fever exceeds 39°C, lasts more than 2 days, or if your child seems unusually drowsy or has trouble breathing.',
  },
  {
    title: 'Importance of Polio Drops',
    icon: Droplets,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    tag: 'Vaccine Education',
    tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'India is polio-free since 2014, but the virus still exists in neighboring countries. Polio drops (OPV) protect your child AND the community from reintroduction.',
    extra: 'Always participate in Pulse Polio campaigns. Even vaccinated children should receive OPV drops during national immunization days.',
  },
  {
    title: 'Nutrition for 6–12 Months',
    icon: Baby,
    iconColor: 'text-green-600',
    iconBg: 'bg-green-100',
    tag: 'Nutrition Guide',
    tagColor: 'bg-green-50 text-green-700 border-green-200',
    desc: 'Start soft solids at 6 months. Begin with mashed dal, soft rice, boiled vegetables. Gradually increase texture and variety. Continue breastfeeding alongside solid foods.',
    extra: "Avoid honey, whole nuts, and cow's milk as a primary drink before age 1. Introduce one new food every 3 days to check for allergies.",
  },
  {
    title: 'Injection Site Swelling',
    icon: ShieldAlert,
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-100',
    tag: 'Side Effect',
    tagColor: 'bg-violet-50 text-violet-700 border-violet-200',
    desc: 'Redness, swelling, or a lump at the injection site is very common and normal. Apply a cold compress for 15 minutes every few hours. Do NOT massage the area.',
    extra: 'The swelling usually subsides within 3–5 days. BCG vaccine may leave a small scar — this is expected and indicates the vaccine worked.',
  },
  {
    title: 'When to Visit a Doctor',
    icon: Stethoscope,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100',
    tag: 'Emergency Signs',
    tagColor: 'bg-red-50 text-red-700 border-red-200',
    desc: 'Seek medical attention immediately if: fever exceeds 39°C, child is unusually limp, cries continuously for >3 hours, has difficulty breathing, or has a seizure.',
    extra: 'Call 108 or go to the nearest emergency center if you observe any of the above after vaccination.',
  },
  {
    title: 'Breastfeeding & Vaccines',
    icon: Wind,
    iconColor: 'text-pink-600',
    iconBg: 'bg-pink-100',
    tag: 'Infant Care',
    tagColor: 'bg-pink-50 text-pink-700 border-pink-200',
    desc: 'Breastfeeding before and after vaccination helps comfort the baby and may reduce pain response. Breast milk also contains antibodies that help vaccines work better.',
    extra: 'WHO recommends exclusive breastfeeding for 6 months and continued breastfeeding alongside complementary foods up to 2 years.',
  },
];

const NurseIllus = () => (
  <svg viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <radialGradient id="nface" cx="38%" cy="32%" r="62%"><stop offset="0%" stopColor="#FEF3C7"/><stop offset="60%" stopColor="#FBBF24"/><stop offset="100%" stopColor="#D97706"/></radialGradient>
      <radialGradient id="nbody" cx="50%" cy="28%" r="65%"><stop offset="0%" stopColor="#34D399"/><stop offset="100%" stopColor="#059669"/></radialGradient>
      <filter id="nsh"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.18)"/></filter>
    </defs>
    {/* Book (held in left hand) */}
    <rect x="2" y="30" width="22" height="28" rx="4" fill="#3B82F6" filter="url(#nsh)"/>
    <rect x="2" y="30" width="22" height="28" rx="4" fill="url(#nbody)" opacity="0.15"/>
    <rect x="2" y="30" width="4" height="28" rx="2" fill="#1D4ED8"/>
    <rect x="8" y="36" width="12" height="2" rx="1" fill="white" opacity="0.7"/>
    <rect x="8" y="41" width="10" height="2" rx="1" fill="white" opacity="0.5"/>
    <rect x="8" y="46" width="12" height="2" rx="1" fill="white" opacity="0.5"/>
    <rect x="8" y="51" width="8" height="2" rx="1" fill="white" opacity="0.5"/>
    {/* Cross on book */}
    <rect x="10" y="32" width="6" height="2" rx="1" fill="white"/><rect x="12" y="30.5" width="2" height="5" rx="1" fill="white"/>
    {/* Body (uniform) */}
    <ellipse cx="40" cy="62" rx="18" ry="9" fill="url(#nbody)" filter="url(#nsh)"/>
    <ellipse cx="40" cy="58" rx="16" ry="8" fill="url(#nbody)"/>
    <ellipse cx="32" cy="52" rx="6" ry="3" fill="rgba(255,255,255,0.22)" transform="rotate(-15 32 52)"/>
    {/* ID badge */}
    <rect x="36" y="55" width="16" height="10" rx="2" fill="white"/>
    <rect x="37" y="56" width="14" height="3" rx="1" fill="#059669"/>
    <rect x="37" y="61" width="10" height="1.5" rx="0.5" fill="#9CA3AF"/>
    {/* Arms */}
    <ellipse cx="22" cy="52" rx="4" ry="9" fill="#F59E0B" transform="rotate(25 22 52)"/>
    <ellipse cx="16" cy="36" rx="4" ry="8" fill="#F59E0B" transform="rotate(15 16 36)"/>
    <ellipse cx="58" cy="52" rx="4" ry="9" fill="#F59E0B" transform="rotate(-25 58 52)"/>
    {/* Neck */}
    <rect x="36" y="44" width="8" height="7" rx="3" fill="#F59E0B"/>
    {/* Head */}
    <ellipse cx="40" cy="37" rx="14" ry="14" fill="url(#nface)" filter="url(#nsh)"/>
    <ellipse cx="35" cy="30" rx="6" ry="3.5" fill="rgba(255,255,255,0.26)" transform="rotate(-20 35 30)"/>
    {/* Hair + nurse cap */}
    <ellipse cx="40" cy="26" rx="14" ry="7" fill="#92400E"/>
    <ellipse cx="27" cy="37" rx="4" ry="8" fill="#92400E"/>
    <ellipse cx="53" cy="37" rx="4" ry="8" fill="#92400E"/>
    <ellipse cx="40" cy="24" rx="14" ry="6" fill="white" filter="url(#nsh)"/>
    <rect x="34" y="21" width="12" height="2.5" rx="1" fill="#EF4444"/>
    <rect x="38" y="19" width="4" height="6" rx="1" fill="#EF4444"/>
    {/* Eyes */}
    <ellipse cx="34" cy="38" rx="2.8" ry="3" fill="white"/><ellipse cx="46" cy="38" rx="2.8" ry="3" fill="white"/>
    <circle cx="34.5" cy="38.5" r="1.8" fill="#1F2937"/><circle cx="46.5" cy="38.5" r="1.8" fill="#1F2937"/>
    <circle cx="35.5" cy="37.5" r="0.7" fill="white"/><circle cx="47.5" cy="37.5" r="0.7" fill="white"/>
    <ellipse cx="28" cy="41" rx="2.5" ry="2" fill="#FCA5A5" opacity="0.5"/>
    <ellipse cx="52" cy="41" rx="2.5" ry="2" fill="#FCA5A5" opacity="0.5"/>
    <path d="M34 44 Q40 48 46 44" stroke="#B45309" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
  </svg>
);

export default function Guidance() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white dark:bg-gray-900 border-b border-border/60 dark:border-gray-800 px-4 pt-3 pb-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold text-gray-900 dark:text-white">Health Guidance</h1>
            <p className="text-xs text-muted-foreground dark:text-gray-400">{articles.length} guides for parents</p>
          </div>
          <div className="w-14 h-16 shrink-0">
            <NurseIllus />
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2.5">
        {articles.map((article, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-border/60 overflow-hidden shadow-sm hover:border-primary/30 transition-all"
          >
            <button
              className="w-full text-left p-3.5"
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${article.iconBg}`}>
                  <article.icon size={18} className={article.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${article.tagColor}`}>
                      {article.tag}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-foreground leading-snug">{article.title}</h3>
                  <p className={`text-xs text-muted-foreground mt-1 leading-relaxed ${expanded === i ? '' : 'line-clamp-2'}`}>
                    {article.desc}
                  </p>
                </div>
                <div className="shrink-0 mt-1">
                  {expanded === i ? (
                    <ChevronUp size={16} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={16} className="text-muted-foreground" />
                  )}
                </div>
              </div>
              {expanded === i && article.extra && (
                <div className="mt-3 ml-13 pl-13 pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground leading-relaxed ml-[52px]">{article.extra}</p>
                </div>
              )}
            </button>
          </div>
        ))}

        {/* AI Assistant callout */}
        <Link href="/assistant">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex items-center gap-3 cursor-pointer hover:bg-primary/10 transition-colors mt-1">
            <div className="w-9 h-9 bg-primary/15 rounded-lg flex items-center justify-center shrink-0">
              <Info size={18} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-primary">Need personalized advice?</p>
              <p className="text-xs text-muted-foreground">Ask the AI Health Assistant</p>
            </div>
            <span className="text-xs font-bold text-primary">Ask →</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
