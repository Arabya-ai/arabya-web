export type MptVoice = {
  id: string;
  labelAr: string;
  labelEn: string;
};

export const MPT_VOICES: MptVoice[] = [
  { id: "ar-SA-ZariyahNeural-Female", labelAr: "زارية — عربية فصحى (أنثى)", labelEn: "Zariyah — Arabic (female)" },
  { id: "ar-SA-HamedNeural-Male", labelAr: "حامد — عربية فصحى (ذكر)", labelEn: "Hamed — Arabic (male)" },
  { id: "ar-EG-SalmaNeural-Female", labelAr: "سلمى — مصرية (أنثى)", labelEn: "Salma — Egyptian (female)" },
  { id: "ar-EG-ShakirNeural-Male", labelAr: "شاكر — مصري (ذكر)", labelEn: "Shakir — Egyptian (male)" },
  { id: "en-US-AriaNeural-Female", labelAr: "Aria — إنجليزية (أنثى)", labelEn: "Aria — English (female)" },
  { id: "en-US-GuyNeural-Male", labelAr: "Guy — إنجليزية (ذكر)", labelEn: "Guy — English (male)" },
];

export const MPT_LANGUAGES = [
  { id: "Arabic", labelAr: "العربية", labelEn: "Arabic" },
  { id: "English", labelAr: "الإنجليزية", labelEn: "English" },
  { id: "Chinese", labelAr: "الصينية", labelEn: "Chinese" },
] as const;
