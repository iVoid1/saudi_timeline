// src/data/geo/adminMap.js

export const REGION_RANGES = {
  eastern:  [0, 10],
  qassim:   [11, 23],
  hail:     [24, 32],
  northern: [33, 36],
  jouf:     [37, 40],
  tabuk:    [41, 47],
  riyadh:   [48, 70],
  najran:   [71, 77],
  madinah:  [78, 86],

  // مكة لها 87-101 بالإضافة إلى الطائف 146
  makkah:   [87, 101],

  bahah:    [102, 111],
  jazan:    [112, 128],
  asir:     [129, 145],
}

export const REGION_EXTRA_INDEXES = {
  makkah: [146],
}

export function getGovernoratesForRegion(data, regionId) {
  const range = REGION_RANGES[regionId]

  if (!range) return []

  const [start, end] = range

  const features =
    data.features.slice(start, end + 1)

  const extras =
    REGION_EXTRA_INDEXES[regionId] ?? []

  for (const index of extras) {
    if (data.features[index]) {
      features.push(data.features[index])
    }
  }

  return features
}

export const GOVERNORATE_NAMES_AR = {
  // الشرقية
  'Al Khubar Governorate': 'الخبر',
  'Abqaiq Governorate': 'بقيق',
  'Al Ahsa Governorate': 'الأحساء',
  'Al Udayd Governorate': 'العديد',
  'Al Nuayriyah Governorate': 'النعيرية',
  'Al Qatif Governorate': 'القطيف',
  'Ras Tannurah Governorate': 'رأس تنورة',
  'Al Jubayl Governorate': 'الجبيل',
  'Al Khafji Governorate': 'الخفجي',
  'Hafar Al Batin Governorate': 'حفر الباطن',
  'Qaryah Al Ulya Governorate': 'قرية العليا',

  // القصيم
  'Uyun Al Jiwa': 'عيون الجواء',
  'Al Midhnab': 'المذنب',
  'Al Asyah': 'الأسياح',
  'Riyadh Al Khabra': 'رياض الخبراء',
  'Unayzah': 'عنيزة',
  'Uqlat As Suqur': 'عقلة الصقور',
  'An Nabhaniyah': 'النبهانية',
  'Al Badai': 'البدائع',
  'Al Bukayriyah': 'البكيرية',
  'Dariyah': 'ضرية',
  'Buraydah': 'بريدة',
  'Ar Rass': 'الرس',
  'Ash Shimasiyah': 'الشماسية',

  // حائل
  'Mawqaq': 'موقق',
  'Baqa': 'بقعاء',
  'Hail': 'حائل',
  'Ash Shinan': 'الشنان',
  'As Sulaymi': 'السليمي',
  'Al Hait': 'الحائط',
  'Simira': 'سميراء',
  'Ash Shamli': 'الشملي',
  'Al Ghazalah': 'الغزالة',

  // الحدود الشمالية
  'Rafha': 'رفحاء',
  'Arar': 'عرعر',
  'Turayf': 'طريف',
  'Al Uwayqilah': 'العويقيلة',

  // الجوف
  'Sakaka': 'سكاكا',
  'Al Qurayyat': 'القريات',
  'Tubarjal': 'طبرجل',
  'Dawamat Al Jandal': 'دومة الجندل',

  // تبوك
  'Umluj': 'أملج',
  'Tayma': 'تيماء',
  'Al Wajh': 'الوجه',
  'Duba': 'ضباء',
  'Al Bad': 'البدع',
  'Tabuk': 'تبوك',
  'Haqil': 'حقل',

  // الرياض
  'Marat': 'مرات',
  'Wadi Ad Dawasir': 'وادي الدواسر',
  'Thadiq': 'ثادق',
  'Ad Diriyah': 'الدرعية',
  'Ad Dilam': 'الدلم',
  'Duruma': 'ضرما',
  'Al Ghat': 'الغاط',
  'As Sulayyil': 'السليل',
  'Hawtat Bani Tamim': 'حوطة بني تميم',
  'Al Muzahimiyah': 'المزاحمية',
  'Huraymila': 'حريملاء',
  'Al Quwayiyah': 'القويعية',
  'Al Aflaj': 'الأفلاج',
  'Az Zulfi': 'الزلفي',
  'Al Majmaah': 'المجمعة',
  'Al Kharj': 'الخرج',
  'Shaqra': 'شقراء',
  'Al Hariq': 'الحريق',
  'Riyadh': 'الرياض',
  'Ad Duwadimi': 'الدوادمي',
  'Ar Rayn': 'الرين',
  'Rumah': 'رماح',
  'Afif': 'عفيف',

  // نجران
  'Khubash': 'خباش',
  'Thar': 'ثار',
  'Najran': 'نجران',
  'Yadamah': 'يدمة',
  'Sharurah': 'شرورة',
  'Badr Al Janub': 'بدر الجنوب',
  'Hubuna': 'حبونا',

  // المدينة
  'Al Madinah Al Munawwarah': 'المدينة المنورة',
  'Al Mahd': 'المهد',
  'Yanbu': 'ينبع',
  'Al Hinakiyah': 'الحناكية',
  'Khaybar': 'خيبر',
  'Al Ula': 'العلا',
  'Al Is': 'العيص',
  'Wadi Al Fara': 'وادي الفرع',
  'Badr': 'بدر',

  // مكة
  'Al Kamil': 'الكامل',
  'Makkah Al Mukarramah': 'مكة المكرمة',
  'Al Qunfudhah': 'القنفذة',
  'Jiddah': 'جدة',
  'Khulays': 'خليص',
  'Turubah': 'تربة',
  'Al Jumum': 'الجموم',
  'Rabigh': 'رابغ',
  'Al Lith': 'الليث',
  'Ranyah': 'رنية',
  'Al Khurmah': 'الخرمة',
  'Bahrah': 'بحرة',
  'Maysan': 'ميسان',
  'Al Ardiyat': 'العرضيات',
  'Adam': 'أضم',
  'Al Taif': 'الطائف',

  // الباحة
  'Biljurashi': 'بلجرشي',
  'Al Hajrah': 'الحجرة',
  'Al Mukhwah': 'المخواة',
  'Qilwah': 'قلوة',
  'Al Aqiq': 'العقيق',
  'Al Qara': 'القرى',
  'Bani Hasan': 'بني حسن',
  'Al Mandaq': 'المندق',
  'Al Bahah': 'الباحة',
  'Farat Ghamid Az Zinad': 'غامد الزناد',

  // جازان
  'Al Harth': 'الحرث',
  'Damad': 'ضمد',
  'Fayfa': 'فيفاء',
  'Samtah': 'صامطة',
  'Farasan': 'فرسان',
  'Ad Darb': 'الدرب',
  'Sabya': 'صبيا',
  'Ahad Al Masarihah': 'أحد المسارحة',
  'Al Aydabi': 'العيدابي',
  'Ar Rayth': 'الريث',
  'At Tuwal': 'الطوال',
  'Jazan': 'جازان',
  'Harub': 'هروب',
  'Ad Dair': 'الدائر',
  'Al Aridah': 'العارضة',
  'Abu Arish': 'أبو عريش',
  'Baysh': 'بيش',

  // عسير
  'Zahran Al Janub': 'ظهران الجنوب',
  'Ahad Rufaydah': 'أحد رفيدة',
  'Tathlith': 'تثليث',
  'Abha': 'أبها',
  'Tarib': 'طريب',
  'Bishah': 'بيشة',
  'Muhayil': 'محايل عسير',
  'Al Birk': 'البرك',
  'Al Harjah': 'الحرجة',
  'Balqarn': 'بلقرن',
  'Bariq': 'بارق',
  'Al Majardah': 'المجاردة',
  'An Namas': 'النماص',
  'Sarat Abidah': 'سراة عبيدة',
  'Rijal Al Ma': 'رجال ألمع',
  'Tanumah': 'تنومة',
  'Khamis Mushayt': 'خميس مشيط',
}

export function getGovernorateArabicName(feature) {
  const name =
    feature?.properties?.shapeName ?? ''

  return GOVERNORATE_NAMES_AR[name] ?? name
}