export type LibyaRegion = 'west' | 'east' | 'south';

export interface LibyaCity {
  id: string;
  name_ar: string;
  name_en: string;
  region: LibyaRegion;
  aliases: string[];
  lat: number;
  lng: number;
}

export const LIBYA_REGIONS: Record<LibyaRegion, { name_ar: string; name_en: string; badge: string }> = {
  west: { name_ar: 'الغرب', name_en: 'West', badge: '🌊' },
  east: { name_ar: 'الشرق', name_en: 'East', badge: '⛰️' },
  south: { name_ar: 'الجنوب', name_en: 'South', badge: '🏜️' },
};

export const LIBYA_CITIES: LibyaCity[] = [
  // ==========================================
  // إقليم الغرب (34 مدينة/منطقة)
  // ==========================================
  {
    id: 'ly_tripoli',
    name_ar: 'طرابلس',
    name_en: 'Tripoli',
    region: 'west',
    aliases: ['طرابلس المركز', 'عين زارة', 'سوق الجمعة', 'أبوسليم', 'حي الأندلس', 'قرجي', 'الدريبي', 'غوط الشعال', 'السبعة', 'الهضبة', 'صلاح الدين', 'طريق المطار', 'فشلوم', 'زاوية الدهماني', 'رأس حسن'],
    lat: 32.8872,
    lng: 13.1913,
  },
  {
    id: 'ly_misrata',
    name_ar: 'مصراتة',
    name_en: 'Misrata',
    region: 'west',
    aliases: ['مصراته', 'قصر أحمد', 'الرويسات', 'الغيران', 'طريق النهر', 'طريق طرابلس', 'السكيرات', 'طريق الجزيرة', 'المقاصبة'],
    lat: 32.3754,
    lng: 15.0925,
  },
  {
    id: 'ly_zawiya',
    name_ar: 'الزاوية',
    name_en: 'Zawiya',
    region: 'west',
    aliases: ['الزاويه', 'الزاوية الغربية', 'الزاوية الجنوبية', 'جوددائم', 'المطرد', 'الحرشة'],
    lat: 32.7522,
    lng: 12.7278,
  },
  {
    id: 'ly_zliten',
    name_ar: 'زليتن',
    name_en: 'Zliten',
    region: 'west',
    aliases: ['زليطن', 'الجمعة', 'المنارة', 'ماجر', 'البازة'],
    lat: 32.4674,
    lng: 14.5687,
  },
  {
    id: 'ly_khoms',
    name_ar: 'الخمس',
    name_en: 'Khoms',
    region: 'west',
    aliases: ['المرقب', 'لبدة', 'سوق الخميس', 'كعام', 'سيلين'],
    lat: 32.6496,
    lng: 14.2618,
  },
  {
    id: 'ly_gharyan',
    name_ar: 'غريان',
    name_en: 'Gharyan',
    region: 'west',
    aliases: ['تغرنة', 'القواسم', 'بني خليفة', 'الهيرة', 'تبادوت'],
    lat: 32.1722,
    lng: 13.0203,
  },
  {
    id: 'ly_sabratha',
    name_ar: 'صبراتة',
    name_en: 'Sabratha',
    region: 'west',
    aliases: ['صبراته', 'آثار صبراتة', 'العلالقة', 'دحمان', 'سوق العلالقة'],
    lat: 32.7933,
    lng: 12.4885,
  },
  {
    id: 'ly_sorman',
    name_ar: 'صرمان',
    name_en: 'Sorman',
    region: 'west',
    aliases: ['شحات', 'المرازيق', 'البراهمة', 'الساحل صرمان'],
    lat: 32.7547,
    lng: 12.5714,
  },
  {
    id: 'ly_zuwara',
    name_ar: 'زوارة',
    name_en: 'Zuwara',
    region: 'west',
    aliases: ['زواره', 'تامزغيدة', 'رأس أجدير', 'أبي كماش'],
    lat: 32.9312,
    lng: 12.0820,
  },
  {
    id: 'ly_tarhuna',
    name_ar: 'ترهونة',
    name_en: 'Tarhuna',
    region: 'west',
    aliases: ['ترهونه', 'الداوون', 'سوق الأحد', 'قصر الأخيار'],
    lat: 32.4350,
    lng: 13.6332,
  },
  {
    id: 'ly_bani_walid',
    name_ar: 'بني وليد',
    name_en: 'Bani Walid',
    region: 'west',
    aliases: ['تينيناي', 'المردوم', 'القرارة', 'أشميخ'],
    lat: 31.7566,
    lng: 13.9942,
  },
  {
    id: 'ly_tajoura',
    name_ar: 'تاجوراء',
    name_en: 'Tajoura',
    region: 'west',
    aliases: ['تاجورا', 'الحميدية', 'النشيع', 'طريق الشط تاجوراء', 'البيفي'],
    lat: 32.8817,
    lng: 13.3496,
  },
  {
    id: 'ly_janzour',
    name_ar: 'جنزور',
    name_en: 'Janzour',
    region: 'west',
    aliases: ['جنزور الشرقية', 'جنزور الوسطى', 'السياحية', 'النجيلة', 'صياد'],
    lat: 32.8184,
    lng: 13.0134,
  },
  {
    id: 'ly_qasr_bin_ghashir',
    name_ar: 'قصر بن غشير',
    name_en: 'Qasr Bin Ghashir',
    region: 'west',
    aliases: ['سوق السبت', 'المطار القديم', 'فندق الشريف'],
    lat: 32.6842,
    lng: 13.1788,
  },
  {
    id: 'ly_aziziya',
    name_ar: 'العزيزية',
    name_en: 'Aziziya',
    region: 'west',
    aliases: ['العزيزيه', 'سهل الجفارة', 'الساعدية', 'الحشان'],
    lat: 32.5319,
    lng: 13.0189,
  },
  {
    id: 'ly_ajilat',
    name_ar: 'العجيلات',
    name_en: 'Ajilat',
    region: 'west',
    aliases: ['المطاردية', 'الجديدة العجيلات'],
    lat: 32.7567,
    lng: 12.3761,
  },
  {
    id: 'ly_jmail',
    name_ar: 'الجميل',
    name_en: 'Jmail',
    region: 'west',
    aliases: ['العسة', 'الجميل الغربي'],
    lat: 32.8530,
    lng: 12.0570,
  },
  {
    id: 'ly_rigdaleen',
    name_ar: 'رقدالين',
    name_en: 'Rigdaleen',
    region: 'west',
    aliases: ['زلطن ورقدالين'],
    lat: 32.8428,
    lng: 12.0089,
  },
  {
    id: 'ly_zaltan',
    name_ar: 'زلطن',
    name_en: 'Zaltan',
    region: 'west',
    aliases: ['المنطقة الغربية زلطن'],
    lat: 32.9467,
    lng: 11.8667,
  },
  {
    id: 'ly_msallata',
    name_ar: 'مسلاتة',
    name_en: 'Msallata',
    region: 'west',
    aliases: ['مسلاته', 'القصبات', 'شعان'],
    lat: 32.5847,
    lng: 14.0389,
  },
  {
    id: 'ly_zintan',
    name_ar: 'الزنتان',
    name_en: 'Zintan',
    region: 'west',
    aliases: ['الجبل الغربي الزنتان'],
    lat: 31.9317,
    lng: 12.2536,
  },
  {
    id: 'ly_yefren',
    name_ar: 'يفرن',
    name_en: 'Yefren',
    region: 'west',
    aliases: ['القلعة يفرن', 'أم الجرسان'],
    lat: 32.0631,
    lng: 12.5278,
  },
  {
    id: 'ly_nalut',
    name_ar: 'نالوت',
    name_en: 'Nalut',
    region: 'west',
    aliases: ['وازن', 'تكوت'],
    lat: 31.8686,
    lng: 10.9825,
  },
  {
    id: 'ly_jadu',
    name_ar: 'جادو',
    name_en: 'Jadu',
    region: 'west',
    aliases: ['فساطو', 'شكشوك'],
    lat: 31.9567,
    lng: 12.0256,
  },
  {
    id: 'ly_kikla',
    name_ar: 'ككلة',
    name_en: 'Kikla',
    region: 'west',
    aliases: ['ككله', 'الرابطة'],
    lat: 32.0628,
    lng: 12.6953,
  },
  {
    id: 'ly_asabaa',
    name_ar: 'الأصابعة',
    name_en: 'Asabaa',
    region: 'west',
    aliases: ['الاصابعة', 'الأصابعه', 'جندوبة'],
    lat: 32.0275,
    lng: 12.8711,
  },
  {
    id: 'ly_rajban',
    name_ar: 'الرجبان',
    name_en: 'Rajban',
    region: 'west',
    aliases: ['جبل نفوسة الرجبان'],
    lat: 31.9167,
    lng: 12.0833,
  },
  {
    id: 'ly_ruheibat',
    name_ar: 'الرحيبات',
    name_en: 'Ruheibat',
    region: 'west',
    aliases: ['جبل نفوسة الرحيبات'],
    lat: 31.9056,
    lng: 11.9500,
  },
  {
    id: 'ly_kabaw',
    name_ar: 'كاباو',
    name_en: 'Kabaw',
    region: 'west',
    aliases: ['طمزين', 'فرسطاء'],
    lat: 31.8492,
    lng: 11.3444,
  },
  {
    id: 'ly_tiji',
    name_ar: 'تيجي',
    name_en: 'Tiji',
    region: 'west',
    aliases: ['بدر تيجي', 'الحوامد'],
    lat: 32.0167,
    lng: 11.3667,
  },
  {
    id: 'ly_mizda',
    name_ar: 'مزدة',
    name_en: 'Mizda',
    region: 'west',
    aliases: ['مزده', 'فاسانو', 'نسمة'],
    lat: 31.4472,
    lng: 12.9789,
  },
  {
    id: 'ly_shweref',
    name_ar: 'الشويرف',
    name_en: 'Shweref',
    region: 'west',
    aliases: ['وادي الشويرف'],
    lat: 30.1167,
    lng: 14.2833,
  },
  {
    id: 'ly_ghadames',
    name_ar: 'غدامس',
    name_en: 'Ghadames',
    region: 'west',
    aliases: ['لؤلؤة الصحراء', 'عين الفرس', 'سيناون'],
    lat: 30.1336,
    lng: 9.5008,
  },
  {
    id: 'ly_daraj',
    name_ar: 'درج',
    name_en: 'Daraj',
    region: 'west',
    aliases: ['المجبر'],
    lat: 30.1667,
    lng: 10.4667,
  },

  // ==========================================
  // إقليم الشرق (23 مدينة/منطقة)
  // ==========================================
  {
    id: 'ly_benghazi',
    name_ar: 'بنغازي',
    name_en: 'Benghazi',
    region: 'east',
    aliases: ['بنغازى', 'الصابري', 'الفويهات', 'الماجوري', 'سيدي حسين', 'الكيش', 'الهواري', 'بوعطني', 'الليثي', 'طبلينو', 'بلعون', 'القوارشة', 'سيدي خليفة', 'السلماني', 'سوق الحوت'],
    lat: 32.1167,
    lng: 20.0667,
  },
  {
    id: 'ly_bayda',
    name_ar: 'البيضاء',
    name_en: 'Bayda',
    region: 'east',
    aliases: ['البيضاء الجبل الأخضر', 'الزاوية القديمة', 'سيدي رافع', 'الغريقة', 'وردامة'],
    lat: 32.7628,
    lng: 21.7550,
  },
  {
    id: 'ly_tobruk',
    name_ar: 'طبرق',
    name_en: 'Tobruk',
    region: 'east',
    aliases: ['طبرق دار السلام', 'المنارة طبرق', 'شاطئ الغزالة', 'باب الزيتون'],
    lat: 32.0772,
    lng: 23.9764,
  },
  {
    id: 'ly_derna',
    name_ar: 'درنة',
    name_en: 'Derna',
    region: 'east',
    aliases: ['درنه', 'الصحابة', 'وادي درنة', 'باب طبرق', 'الجبيلة', 'رأس التين'],
    lat: 32.7644,
    lng: 22.6367,
  },
  {
    id: 'ly_ajdabiya',
    name_ar: 'أجدابيا',
    name_en: 'Ajdabiya',
    region: 'east',
    aliases: ['اجدابيا', 'البيضان', 'الزويتينة', 'انتلات'],
    lat: 30.7554,
    lng: 20.2263,
  },
  {
    id: 'ly_marj',
    name_ar: 'المرج',
    name_en: 'Marj',
    region: 'east',
    aliases: ['المرج القديم', 'المرج الجديد', 'البياضة', 'طلميثة'],
    lat: 32.4897,
    lng: 20.8317,
  },
  {
    id: 'ly_shahhat',
    name_ar: 'شحات',
    name_en: 'Shahhat',
    region: 'east',
    aliases: ['قورينا', 'أبولونيا', 'الآثار شحات'],
    lat: 32.8058,
    lng: 21.8603,
  },
  {
    id: 'ly_qubbah',
    name_ar: 'القبة',
    name_en: 'Qubbah',
    region: 'east',
    aliases: ['القبه', 'عين مارة', 'الأثرون'],
    lat: 32.7561,
    lng: 22.2411,
  },
  {
    id: 'ly_susa',
    name_ar: 'سوسة',
    name_en: 'Susa',
    region: 'east',
    aliases: ['سوسه', 'أبولونيا سوسة', 'رأس الهلال'],
    lat: 32.8975,
    lng: 21.9625,
  },
  {
    id: 'ly_tukra',
    name_ar: 'توكرة',
    name_en: 'Tukra',
    region: 'east',
    aliases: ['توكره', 'العقورية'],
    lat: 32.5342,
    lng: 20.5792,
  },
  {
    id: 'ly_abyar',
    name_ar: 'الأبيار',
    name_en: 'Abyar',
    region: 'east',
    aliases: ['الابيار', 'الرجمة', 'بو مريم'],
    lat: 32.1894,
    lng: 20.5967,
  },
  {
    id: 'ly_suluq',
    name_ar: 'سلوق',
    name_en: 'Suluq',
    region: 'east',
    aliases: ['ضريح عمر المختار', 'المقرون'],
    lat: 31.6683,
    lng: 20.2525,
  },
  {
    id: 'ly_qaminis',
    name_ar: 'قمينس',
    name_en: 'Qaminis',
    region: 'east',
    aliases: ['سيدي عبد العاطي'],
    lat: 31.6631,
    lng: 20.0150,
  },
  {
    id: 'ly_brega',
    name_ar: 'البريقة',
    name_en: 'Brega',
    region: 'east',
    aliases: ['البريقة الجديدة', 'مرسى البريقة'],
    lat: 30.4067,
    lng: 19.5739,
  },
  {
    id: 'ly_ras_lanuf',
    name_ar: 'رأس لانوف',
    name_en: 'Ras Lanuf',
    region: 'east',
    aliases: ['راس لانوف', 'المنطقة النفطية'],
    lat: 30.5056,
    lng: 18.5667,
  },
  {
    id: 'ly_bin_jawad',
    name_ar: 'بن جواد',
    name_en: 'Bin Jawad',
    region: 'east',
    aliases: ['وادي كحيلة'],
    lat: 30.8039,
    lng: 18.0867,
  },
  {
    id: 'ly_msaed',
    name_ar: 'امساعد',
    name_en: 'Msaed',
    region: 'east',
    aliases: ['امساعد الحدودية', 'منفذ امساعد'],
    lat: 31.5794,
    lng: 25.1386,
  },
  {
    id: 'ly_bardi',
    name_ar: 'البردي',
    name_en: 'Bardi',
    region: 'east',
    aliases: ['مرسى البردي'],
    lat: 31.7583,
    lng: 25.0861,
  },
  {
    id: 'ly_jalu',
    name_ar: 'جالو',
    name_en: 'Jalu',
    region: 'east',
    aliases: ['واحات جالو', 'اللبة'],
    lat: 29.0333,
    lng: 21.5500,
  },
  {
    id: 'ly_awjila',
    name_ar: 'أوجلة',
    name_en: 'Awjila',
    region: 'east',
    aliases: ['اوجلة', 'مسجد العتيق أوجلة'],
    lat: 29.1439,
    lng: 21.2869,
  },
  {
    id: 'ly_jikharra',
    name_ar: 'اجخرة',
    name_en: 'Jikharra',
    region: 'east',
    aliases: ['اجخره', 'الواحات اجخرة'],
    lat: 29.2833,
    lng: 21.1333,
  },
  {
    id: 'ly_kufra',
    name_ar: 'الكفرة',
    name_en: 'Kufra',
    region: 'east',
    aliases: ['الكفره', 'الجوف الكفرة', 'بزيما', 'الهواري الكفرة'],
    lat: 24.1833,
    lng: 23.3000,
  },
  {
    id: 'ly_tazerbu',
    name_ar: 'تازربو',
    name_en: 'Tazerbu',
    region: 'east',
    aliases: ['واحة تازربو'],
    lat: 25.6833,
    lng: 21.1333,
  },

  // ==========================================
  // إقليم الجنوب (32 مدينة/منطقة — يشمل بلديات وقرى وادي الشاطئ الـ 19)
  // ==========================================
  {
    id: 'ly_sabha',
    name_ar: 'سبها',
    name_en: 'Sabha',
    region: 'south',
    aliases: ['عاصمة الجنوب', 'المنشية سبها', 'القرضة سبها', 'حجارة', 'المهدية', 'سكرة'],
    lat: 27.0377,
    lng: 14.4283,
  },
  {
    id: 'ly_ubari',
    name_ar: 'أوباري',
    name_en: 'Ubari',
    region: 'south',
    aliases: ['اوباري', 'بحيرة قبر عون', 'الديسة', 'تكركيبة'],
    lat: 26.5925,
    lng: 12.7806,
  },
  {
    id: 'ly_murzuq',
    name_ar: 'مرزق',
    name_en: 'Murzuq',
    region: 'south',
    aliases: ['مرزق التاريخية', 'القلعة مرزق', 'حوض مرزق'],
    lat: 25.9156,
    lng: 13.9183,
  },
  // --- بلديات وقرى وادي الشاطئ (19 منطقة) ---
  {
    id: 'ly_brak_alshati',
    name_ar: 'براك الشاطئ',
    name_en: 'Brak Al-Shati',
    region: 'south',
    aliases: ['براك', 'وادي الشاطئ', 'الشاطئ', 'الزوية', 'آقار', 'محروقة', 'تاروت'],
    lat: 27.5494,
    lng: 14.2714,
  },
  {
    id: 'ly_alqarada_alshati',
    name_ar: 'القرضة الشاطئ',
    name_en: 'Al-Qarada Al-Shati',
    region: 'south',
    aliases: ['القرضة', 'وادي الشاطئ', 'الشاطئ', 'قيرة', 'زلواز', 'الحطية', 'اشكدة', 'ققم', 'ققوم', 'تامزاوة'],
    lat: 27.56,
    lng: 14.18,
  },
  {
    id: 'ly_idri_alshati',
    name_ar: 'أدري الشاطئ',
    name_en: 'Idri Al-Shati',
    region: 'south',
    aliases: ['أدري', 'ادري', 'وادي الشاطئ', 'الشاطئ', 'تامسكت', 'ونزريك', 'وينزريك', 'برقن', 'قطة', 'تمسان', 'تينيسان', 'الدبدب'],
    lat: 27.53,
    lng: 13.04,
  },
  {
    id: 'ly_qira',
    name_ar: 'قيرة',
    name_en: 'Qira',
    region: 'south',
    aliases: ['قيرة الشاطئ', 'وادي الشاطئ', 'الشاطئ', 'القيرة'],
    lat: 27.565,
    lng: 14.22,
  },
  {
    id: 'ly_ishkada',
    name_ar: 'اشكدة',
    name_en: 'Ishkada',
    region: 'south',
    aliases: ['إشكدة', 'اشكدة الشاطئ', 'وادي الشاطئ', 'الشاطئ'],
    lat: 27.575,
    lng: 14.15,
  },
  {
    id: 'ly_aqar_alshati',
    name_ar: 'آقار الشاطئ',
    name_en: 'Aqar Al-Shati',
    region: 'south',
    aliases: ['آقار', 'اقار', 'اقار الشاطئ', 'وادي الشاطئ', 'الشاطئ'],
    lat: 27.545,
    lng: 14.295,
  },
  {
    id: 'ly_mahruqah',
    name_ar: 'محروقة',
    name_en: 'Mahruqah',
    region: 'south',
    aliases: ['المحروقة', 'محروقة الشاطئ', 'وادي الشاطئ', 'الشاطئ'],
    lat: 27.54,
    lng: 14.32,
  },
  {
    id: 'ly_alzawiya_alshati',
    name_ar: 'الزوية الشاطئ',
    name_en: 'Al-Zawiya Al-Shati',
    region: 'south',
    aliases: ['الزوية', 'زوية الشاطئ', 'وادي الشاطئ', 'الشاطئ'],
    lat: 27.552,
    lng: 14.26,
  },
  {
    id: 'ly_tarut',
    name_ar: 'تاروت',
    name_en: 'Tarut',
    region: 'south',
    aliases: ['تاروت الشاطئ', 'وادي الشاطئ', 'الشاطئ'],
    lat: 27.535,
    lng: 14.35,
  },
  {
    id: 'ly_quttah',
    name_ar: 'قطة',
    name_en: 'Quttah',
    region: 'south',
    aliases: ['قطة الشاطئ', 'وادي الشاطئ', 'الشاطئ'],
    lat: 27.525,
    lng: 13.2,
  },
  {
    id: 'ly_barqan',
    name_ar: 'برقن',
    name_en: 'Barqan',
    region: 'south',
    aliases: ['برقن الشاطئ', 'وادي الشاطئ', 'الشاطئ'],
    lat: 27.52,
    lng: 13.15,
  },
  {
    id: 'ly_wanzarik',
    name_ar: 'ونزريك',
    name_en: 'Wanzarik',
    region: 'south',
    aliases: ['ونزريك الشاطئ', 'وينزريك', 'وينزريك الشاطئ', 'وادي الشاطئ', 'الشاطئ'],
    lat: 27.515,
    lng: 13.1,
  },
  {
    id: 'ly_tamaskat',
    name_ar: 'تامسكت',
    name_en: 'Tamaskat',
    region: 'south',
    aliases: ['تامسكت الشاطئ', 'وادي الشاطئ', 'الشاطئ'],
    lat: 27.528,
    lng: 13.07,
  },
  {
    id: 'ly_zalwaz',
    name_ar: 'زلواز',
    name_en: 'Zalwaz',
    region: 'south',
    aliases: ['زلواز الشاطئ', 'وادي الشاطئ', 'الشاطئ'],
    lat: 27.555,
    lng: 14.195,
  },
  {
    id: 'ly_alhatiyah',
    name_ar: 'الحطية',
    name_en: 'Al-Hatiyah',
    region: 'south',
    aliases: ['حطية الشاطئ', 'الحطية الشاطئ', 'وادي الشاطئ', 'الشاطئ'],
    lat: 27.562,
    lng: 14.165,
  },
  {
    id: 'ly_qaqam',
    name_ar: 'ققم',
    name_en: 'Qaqam',
    region: 'south',
    aliases: ['ققم الشاطئ', 'ققوم', 'ققوم الشاطئ', 'وادي الشاطئ', 'الشاطئ'],
    lat: 27.57,
    lng: 14.17,
  },
  {
    id: 'ly_tamzawah',
    name_ar: 'تامزاوة',
    name_en: 'Tamzawah',
    region: 'south',
    aliases: ['تامزاوة الشاطئ', 'وادي الشاطئ', 'الشاطئ'],
    lat: 27.558,
    lng: 14.21,
  },
  {
    id: 'ly_tamsan',
    name_ar: 'تمسان',
    name_en: 'Tamsan',
    region: 'south',
    aliases: ['تمسان الشاطئ', 'تينيسان', 'تينيسان الشاطئ', 'وادي الشاطئ', 'الشاطئ'],
    lat: 27.522,
    lng: 13.12,
  },
  {
    id: 'ly_aldabdeb',
    name_ar: 'الدبدب',
    name_en: 'Al-Dabdeb',
    region: 'south',
    aliases: ['الدبدب الشاطئ', 'وادي الشاطئ', 'الشاطئ'],
    lat: 27.51,
    lng: 13.01,
  },
  {
    id: 'ly_ghat',
    name_ar: 'غات',
    name_en: 'Ghat',
    region: 'south',
    aliases: ['جبال تاسيلي', 'البركت', 'تين الكوم'],
    lat: 24.9647,
    lng: 10.1728,
  },
  {
    id: 'ly_hun',
    name_ar: 'هون',
    name_en: 'Hun',
    region: 'south',
    aliases: ['الجفرة هون', 'مهرجان الخريف هون'],
    lat: 29.1268,
    lng: 15.9477,
  },
  {
    id: 'ly_waddan',
    name_ar: 'ودان',
    name_en: 'Waddan',
    region: 'south',
    aliases: ['الجفرة ودان', 'قلعة ودان'],
    lat: 29.1614,
    lng: 16.1428,
  },
  {
    id: 'ly_sokna',
    name_ar: 'سوكنة',
    name_en: 'Sokna',
    region: 'south',
    aliases: ['الجفرة سوكنة', 'واحة سوكنة'],
    lat: 29.0714,
    lng: 15.7833,
  },
  {
    id: 'ly_zella',
    name_ar: 'زلة',
    name_en: 'Zella',
    region: 'south',
    aliases: ['زله', 'واحة زلة'],
    lat: 28.5500,
    lng: 17.5500,
  },
  {
    id: 'ly_umm_al_aranib',
    name_ar: 'أم الأرانب',
    name_en: 'Umm Al-Aranib',
    region: 'south',
    aliases: ['ام الارانب', 'أم الأرانب حوض مرزق'],
    lat: 26.1167,
    lng: 14.6333,
  },
  {
    id: 'ly_traghen',
    name_ar: 'تراغن',
    name_en: 'Traghen',
    region: 'south',
    aliases: ['وادي عتبة'],
    lat: 25.9333,
    lng: 14.3000,
  },
  {
    id: 'ly_qatrun',
    name_ar: 'القطرون',
    name_en: 'Qatrun',
    region: 'south',
    aliases: ['تجرهي', 'بوابة الجنوب'],
    lat: 24.9333,
    lng: 14.6500,
  },
  {
    id: 'ly_gharifa',
    name_ar: 'الغريفة',
    name_en: 'Al-Gharifa',
    region: 'south',
    aliases: ['الغريفه', 'وادي الحياة'],
    lat: 26.5667,
    lng: 13.0667,
  },
  {
    id: 'ly_bint_bayyah',
    name_ar: 'بنت بية',
    name_en: 'Bint Bayyah',
    region: 'south',
    aliases: ['بنت بيه', 'وادي الحياة بنت بية'],
    lat: 26.6833,
    lng: 13.5167,
  },
];

/**
 * Normalizes text for clean search (removes diacritics, unifies alef, taa marbuta, yaa/hamza).
 */
export function normalizeLibyaSearchText(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/[\u064B-\u065F\u0640]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Calculates search relevance score to place direct name matches at the top.
 */
function getCitySearchScore(city: LibyaCity, q: string): number {
  const normName = normalizeLibyaSearchText(city.name_ar);
  const normEn = city.name_en.toLowerCase();

  // Exact name match -> highest priority
  if (normName === q || normEn === q) return 100;

  // Name starts with query
  if (normName.startsWith(q) || normEn.startsWith(q)) return 80;

  // Name contains query
  if (normName.includes(q) || normEn.includes(q)) return 60;

  // Exact alias match
  if (city.aliases.some((al) => normalizeLibyaSearchText(al) === q)) return 50;

  // Alias starts with query
  if (city.aliases.some((al) => normalizeLibyaSearchText(al).startsWith(q))) return 40;

  // Alias contains query / English contains query
  return 20;
}

/**
 * Searches Libyan cities by Arabic name, English name, or aliases (neighborhoods/districts).
 * Sorts direct matches to the top.
 */
export function searchLibyaCities(query: string, regionFilter: 'all' | LibyaRegion = 'all'): LibyaCity[] {
  const normalizedQuery = normalizeLibyaSearchText(query);

  const matched = LIBYA_CITIES.filter((city) => {
    // Region check
    if (regionFilter !== 'all' && city.region !== regionFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    // Match Arabic name
    if (normalizeLibyaSearchText(city.name_ar).includes(normalizedQuery)) {
      return true;
    }

    // Match English name
    if (city.name_en.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    // Match aliases (districts, sub-areas, municipalities)
    return city.aliases.some((alias) => normalizeLibyaSearchText(alias).includes(normalizedQuery));
  });

  if (!normalizedQuery) {
    return matched;
  }

  // Sort by relevance: direct / exact matches first
  return matched.sort((a, b) => {
    const scoreA = getCitySearchScore(a, normalizedQuery);
    const scoreB = getCitySearchScore(b, normalizedQuery);
    return scoreB - scoreA;
  });
}

/**
 * Gets city by unique ID (supports legacy backwards-compatible IDs).
 */
export function getCityById(id: string): LibyaCity | undefined {
  if (id === 'ly_brak_shati') {
    return LIBYA_CITIES.find((c) => c.id === 'ly_brak_alshati');
  }
  return LIBYA_CITIES.find((c) => c.id === id);
}

/**
 * Finds the nearest Libyan city using Haversine formula (GPS location matching).
 */
export function getNearestLibyaCity(userLat: number, userLng: number): { city: LibyaCity; distanceKm: number } {
  let nearestCity: LibyaCity = LIBYA_CITIES[0] as LibyaCity;
  let minDistance = Infinity;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  for (const city of LIBYA_CITIES) {
    const dLat = toRad(city.lat - userLat);
    const dLng = toRad(city.lng - userLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(userLat)) * Math.cos(toRad(city.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;

    if (dist < minDistance) {
      minDistance = dist;
      nearestCity = city;
    }
  }

  return {
    city: nearestCity,
    distanceKm: Math.round(minDistance),
  };
}
