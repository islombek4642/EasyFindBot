# EasyFindBot — To'liq Loyiha Texnik Auditi va Aniqlangan Buglar Ro'yxati

> **Sana**: 2026-yil 21-oktyabr  
> **Holat**: Tahlil yakunlandi, kamchiliklar va ildiz sabablari (root cause) aniqlandi.  
> **Qoida**: Loyiha kod bazasiga o'zgartirish kiritilmagan (faqat auditi va bosqichma-bosqich yechim rejasi).

---

## Mundarija
1. [Arxitektura va Fayllar Tuzilmasidagi Xatolar](#1-arxitektura-va-fayllar-tuzilmasidagi-xatolar)
2. [Telegram Bot Backend va Handlerlardagi Buglar (`tgcloud/handlers/`, `tgcloud/lib/`)](#2-telegram-bot-backend-va-handlerlardagi-buglar)
3. [Serverless RPC Endpointlaridagi Buglar (`tgcloud/endpoints/`)](#3-serverless-rpc-endpointlaridagi-buglar)
4. [Frontend API Transport va Mock Qatlamidagi Xatolar (`src/services/`)](#4-frontend-api-transport-va-mock-qatlamidagi-xatolar)
5. [Frontend Komponentlar va UI/UX Buglari (`src/components/`, `src/modules/`)](#5-frontend-komponentlar-va-uiux-buglari)
6. [Xavfsizlik va Ma'lumotlar Butunligi Xatarlari](#6-xavfsizlik-va-malumotlar-butunligi-xatarlari)
7. [Bosqichma-Bosqich Tuzatish Rejasi (Step-by-Step Action Plan)](#7-bosqichma-bosqich-tuzatish-rejasi)

---

## 1. Arxitektura va Fayllar Tuzilmasidagi Xatolar

### Bug 1.1: Root va `tgcloud/` Papkalari O'rtasidagi Duplikatsiya (Kritik Xavf)
* **Fayllar**: 
  - Root: `endpoints/`, `handlers/`, `lib/`, `schema.js`
  - Backend: `tgcloud/endpoints/`, `tgcloud/handlers/`, `tgcloud/lib/`, `tgcloud/schema.js`
* **Ildiz sababi (Root Cause)**:
  Loyiha boshida backend fayllari root papkaga yozilgan, so'ngra `tgcloud/` papkasiga ko'chirilgan, lekin root papkadagi fayllar o'chirilmagan yoki simlink qilinmagan (mustaqil alohida nusxalar).
* **Oqibati**:
  `tgcloud push` faqat `tgcloud/` papkasi ichidagi fayllarni Telegram Serverless bulutiga yuklaydi. Dasturchi adashib rootdagi `endpoints/` yoki `lib/` ichidagi fayllarni tahrirlasa, o'zgarishlar deploy bo'lmaydi va kod bazasida chalkashlik, regressiya yuzaga keladi.
* **Yechim qadami**:
  Root papkadagi eskirgan dublikat fayl va papkalarni (`c:/EasyFindBot/endpoints`, `c:/EasyFindBot/handlers`, `c:/EasyFindBot/lib`, `c:/EasyFindBot/schema.js`) butunlay o'chirish va yagona haqiqat manbai sifatida faqat `tgcloud/` papkasini qoldirish.

---

## 2. Telegram Bot Backend va Handlerlardagi Buglar

### Bug 2.1: Har bir `/start` buyrug'ida 10 ta API so'rovi va Telegram Rate Limit (429 FloodWait) Xavfi
* **Fayl**: `tgcloud/handlers/message.js` (444–450-qatorlar) va `tgcloud/lib/bot/setup.js` (5–106-qatorlar)
* **Ildiz sababi**:
  Foydalanuvchi har safar `/start` yozganda `await registerBotCommands()` funksiyasi chaqiriladi. Bu funksiya ketma-ket 10 ta Telegram Bot API so'rovini (`setMyDescription` x3, `setMyShortDescription` x3, `setMyCommands` x3, `setChatMenuButton` x1) amalga oshiradi.
* **Oqibati**:
  Bot ishga tushirilganda bir nechta foydalanuvchi bir vaqtda `/start` bosishi bilan Telegram Bot API darhol `429 Too Many Requests: retry after X seconds` (FloodWait) xatoligini qaytaradi va bot vaqtincha bloklanadi.
* **Qo'shimcha qoidabuzarlik**:
  `setup.js` faylida "Ilova", "Botni ishga tushirish", tavsif matnlari kod ichida qattiq yozilgan (hardcoded), bu `AGENTS.md` dagi *"Zero Hardcoded Strings in Bot Backend"* qoidasiga ziddir.
* **Yechim qadami**:
  `registerBotCommands()` chaqiruvini `/start` handleridan olib tashlash. Bot menyusi, tavsiflari va buyruqlarini faqat SuperAdmin `/setup` yoki `/admin` paneli orqali bir martalik yoki deploy vaqtida o'rnatiladigan alohida ma'muriy buyruqqa o'tkazish. Barcha matnlarni `locales/{uz, ru, en}.js` ga ko'chirish.

### Bug 2.2: Doimiy Reply Keyboard'da Mini App'ni ochuvchi Tugmaning Yo'qligi
* **Fayl**: `tgcloud/handlers/message.js` (15–28-qatorlar, `buildMainReplyKeyboard`)
* **Ildiz sababi**:
  `buildMainReplyKeyboard` faqat `Tilni o'zgartirish`, `Yordam` va adminlar uchun `Admin panel` tugmalarini generatsiya qiladi. Unda Mini App'ni to'g'ridan-to'g'ri ochuvchi `web_app: { url }` tugmasi mavjud emas.
* **Oqibati**:
  Foydalanuvchi `/start` xabaridagi inline tugmalardan o'tib ketgach, pastdagi klaviatura orqali ilovani qayta ocha olmaydi (faqat Telegram'ning pastki chap burchagidagi kichik Menu tugmasi qoladi).
* **Yechim qadami**:
  `buildMainReplyKeyboard` ning birinchi qatoriga doimiy `📱 Ilovani ochish` (`web_app: { url: config.miniAppUrl }`) tugmasini qo'shish.

### Bug 2.3: Kanalga E'lon Joylashda Moderator Tiliga Bog'lanib Qolish va Xom Enumlarni Chiqarish
* **Fayl**: `tgcloud/handlers/callback_query.js` (364-qator) va `tgcloud/lib/bot/channel.js` (25–28-qatorlar)
* **Ildiz sababi**:
  Vakansiya tasdiqlanganda `publishToChannel(api, vacancy, userLang)` chaqiriladi, bu yerda `userLang` — tasdiqlash tugmasini bosgan moderatorning interfeys tili.
  Shuningdek, `channel.js` da `vacancy.employmentType` (masalan, `full_time`) va `vacancy.category` (masalan, `it_tech`) tarjima qilinmasdan to'g'ridan-to'g'ri xom enum shaklida kanalga yuboriladi.
* **Oqibati**:
  Agar moderator rus yoki ingliz tilida bo'lsa, O'zbekistondagi umumiy kanalga post rus/inglizcha sarlavhalar bilan chiqadi. Shuningdek, bandlik turi `full_time` deb inglizcha kod ko'rinishida postga qo'shiladi.
* **Yechim qadami**:
  Kanal postlari uchun standart til sifatida doimo `uz` (yoki settings jadvalidagi kanal tili) dan foydalanish. `channel.js` va `moderator.js` da `employmentType` va `category` ni inson tushunadigan tarjimalar bilan formatlash.

---

## 3. Serverless RPC Endpointlaridagi Buglar (`tgcloud/endpoints/`)

### Bug 3.1: Vakansiyalar va Rezyumelar Ro'yxatida Sahifalash (Pagination) To'liq Ishlamasligi
* **Fayllar**: 
  - `tgcloud/endpoints/getVacancies.js` (23–25, 72–73-qatorlar)
  - `tgcloud/endpoints/getResumes.js` (22–24, 57–58-qatorlar)
* **Ildiz sababi**:
  Backend endpointlari faqat `offset` va `limit` qabul qiladi:
  `const { limit = 15, offset = 0 } = input;`
  Lekin frontend (`VacanciesView.jsx` va `ResumesView.jsx`) backendga `{ page: 2, limit: 15 }` yuboradi va `offset` hisoblamaydi. Backendda `offset` parametr kelmagani uchun u har safar `0` bo'lib qoladi.
* **Oqibati**:
  Foydalanuvchi "Ko'proq yuklash" tugmasini bosganda, sahifa 2-chi sahifani emas, ayni o'sha birinchi 15 ta elementni qaytadan olib kelib ro'yxatga qo'shadi (takroriy elementlar ko'payadi, yangilari esa ko'rinmaydi).
* **Yechim qadami**:
  Backend endpointlarida `offset` hisoblashda `page` parametrini ham qo'llab-quvvatlash:
  `const safeOffset = input.offset !== undefined ? Number(input.offset) : (Number(input.page || 1) - 1) * safeLimit;`

### Bug 3.2: Ish Beruvchi Vakansiyani Ochganda Shaxsiy Familiyasi Kompaniya Nomi Sifatida Chiqishi
* **Fayl**: `tgcloud/endpoints/getVacancyById.js` (38–45-qatorlar)
* **Ildiz sababi**:
  ```javascript
  const employer = await db.select({
    username: users.username,
    firstName: users.firstName,
    companyName: users.lastName, // XATO!
  }).from(users)...
  ```
  Foydalanuvchining Telegram familiyasi (`lastName`) `companyName` deb belgilangan.
* **Oqibati**:
  Ish beruvchining shaxsiy familiyasi (masalan, "Karimov") kompaniya nomi o'rniga tushib qoladi yoki maxfiylik buziladi. Kompaniya nomi aslida `vacancies.companyName` ustunida saqlanadi.
* **Yechim qadami**:
  Noto'g'ri mappingni olib tashlash va `companyName` ni bevosita vakansiya obyektidan olish.

### Bug 3.3: `updateUser.js` da Admin Rolining Tasodifan O'chib Ketishi (Privilege Demotion)
* **Fayl**: `tgcloud/endpoints/updateUser.js` (21–23-qatorlar)
* **Ildiz sababi**:
  `if (role && ['seeker', 'employer'].includes(role)) { updates.role = role; }`
  Foydalanuvchi hozirda `admin` ekanligi tekshirilmaydi.
* **Oqibati**:
  Agar tizim administratori Mini App orqali o'z profilida ish qidiruvchi/ish beruvchi rejimini almashtirsa, uning ma'lumotlar bazasidagi `admin` roli butunlay o'chib ketadi va u botdagi boshqaruv huquqini yo'qotadi.
* **Yechim qadami**:
  Mavjud foydalanuvchi rolini tekshirish: agar `user.role === 'admin'` bo'lsa, `role` maydonini oddiy so'rov orqali o'zgartirishga yo'l qo'ymaslik.

---

## 4. Frontend API Transport va Mock Qatlamidagi Xatolar (`src/services/`)

### Bug 4.1: Nomzod Rezyumelarida Ism-Sharif Maydonining Mos Kelmasligi (`fullName` vs `user.firstName`)
* **Fayllar**: `src/services/mockData.js`, `src/components/common/ResumeCard.jsx`, `src/modules/resumes/ResumeDetailModal.jsx`
* **Ildiz sababi**:
  Mock ma'lumotlarda har bir rezyume obyektida to'g'ridan-to'g'ri `fullName: "Alisher Usmonov"` deb yozilgan.
  Lekin real backend (`tgcloud/endpoints/getResumes.js`) rezyumega foydalanuvchi ma'lumotlarini alohida `user: { firstName, lastName, username }` ko'rinishida biriktiradi.
* **Oqibati**:
  Haqiqiy serverga ulanganda `resume.fullName` qiymati `undefined` bo'ladi. Natijada:
  - `ResumeCard.jsx` nomzodning ismi o'rniga soha nomini (`categories.it`) chiqaradi.
  - `ResumeDetailModal.jsx` da nomzodning ismi umuman ko'rinmaydi.
  - `ResumesView.jsx` da nomzod ismi bo'yicha qidiruv ishlamaydi.
* **Yechim qadami**:
  `ResumeCard`, `ResumeDetailModal` va qidiruv filtrida nomzod ismini xavfsiz aniqlash:
  `const displayName = resume.fullName || (resume.user ? [resume.user.firstName, resume.user.lastName].filter(Boolean).join(' ') : '') || resume.contacts;`

### Bug 4.2: Frontend Qidiruvining Backendga Yuborilmasligi va Klient Tomondagi Noto'g'ri Ustun Nomi
* **Fayl**: `src/modules/vacancies/VacanciesView.jsx` (57–79, 154–160-qatorlar)
* **Ildiz sababi**:
  1. `fetchVacancies` funksiyasi `searchQuery` ni backendga yubormaydi (`search` parametri tushib qolgan).
  2. Faqat hozirgi yuklangan 15 ta vakansiya ustida klient filtri qilinadi.
  3. Klient filtrida esa `v.company` tekshiriladi (`v.company.toLowerCase().includes(q)`), holbuki backenddan keladigan maydon `companyName` deb ataladi!
* **Oqibati**:
  Foydalanuvchi kompaniya nomi bo'yicha qidirsa, hech qanday natija topilmaydi. Shuningdek, 1-sahifada bo'lmagan 200 ta boshqa vakansiyalar qidiruvga kirmay qoladi.
* **Yechim qadami**:
  `api.getVacancies` chaqiruviga `search: searchQuery.trim() || undefined` parametrini qo'shish va qidiruvni server tomonida to'liq amalga oshirish.

---

## 5. Frontend Komponentlar va UI/UX Buglari (`src/components/`, `src/modules/`)

### Bug 5.1: E'lon Berilgach Muvaffaqiyat Xabarining Ko'rinmay Qolishi (Instant Unmount)
* **Fayllar**: `src/modules/post-job/PostJobWizard.jsx` (100–101-qatorlar) va `src/App.jsx` (58–62-qatorlar)
* **Ildiz sababi**:
  `PostJobWizard.jsx` ichida so'rov muvaffaqiyatli o'tgach:
  `setSubmitted(true); if (onSuccess) onSuccess();`
  deb chaqiriladi. `App.jsx` esa `onSuccess` bo'lganda darhol `activeTab` ni `ROUTES.VACANCIES` ga o'zgartiradi.
* **Oqibati**:
  Vakansiya beruvchi foydalanuvchi chiroyli qilib tayyorlangan "E'loningiz moderatsiyaga yuborildi" degan muvaffaqiyat ekranini 0 millisekund ham ko'rmaydi, darhol vakansiyalar ro'yxatiga uloqtiriladi. Foydalanuvchida "e'lonim ketdimi yoki xatolik bo'ldimi?" degan tushunmovchilik paydo bo'ladi.
* **Yechim qadami**:
  `PostJobWizard` muvaffaqiyat ekranida "Tushundim" yoki "Vakansiyalarga qaytish" tugmasini qo'yish va `onSuccess` ni faqat o'sha tugma bosilganda chaqirish.

### Bug 5.2: Obunalar Modalida O'chirilgan Obunalar Qayta Ochilganda Ham Yoqilgan Holatda Ko'rinishi
* **Fayl**: `src/modules/profile/SubscriptionsModal.jsx` (22-qator)
* **Ildiz sababi**:
  `setActiveCategories(new Set(list.map((s) => s.category)));`
  Backend `getSubscriptions` foydalanuvchining barcha yozuvlarini qaytaradi (shu jumladan `isActive: false` bo'lganlarini ham). Frontend esa `isActive` ni tekshirmasdan barcha kategoriyalarni faol deb belgilaydi.
* **Oqibati**:
  Foydalanuvchi biror sohadan obunani bekor qilib, oynani yopib qayta ochsa, u yana faol (ko'k belgi bilan) bo'lib turaveradi.
* **Yechim qadami**:
  Faqat `isActive` rost bo'lgan obunalarni to'plamga kiritish:
  `setActiveCategories(new Set(list.filter(s => s.isActive).map(s => s.category)));`

### Bug 5.3: `ResumeCard.jsx` da Yo'q Bo'lgan `roles.seeker` Kalitining Chaqirilishi
* **Fayl**: `src/components/common/ResumeCard.jsx` (46-qator)
* **Ildiz sababi**:
  Komponentda `t('roles.seeker')` chaqirilgan. Lekin barcha til fayllarida (`uz.js`, `ru.js`, `en.js`) bu kalit `profile.role_seeker` deb nomlangan.
* **Oqibati**:
  Agar rezyumening kasbi/sarlavhasi bo'sh bo'lsa, ekranda xunuk `roles.seeker` yozuvi chiqib qoladi.
* **Yechim qadami**:
  `t('profile.role_seeker')` ga to'g'rilash.

### Bug 5.4: Modal Oynada Scroll Qilish Vaqtida Butun Oynaning Pastga Surilib Yopilib Ketishi (Mobile Gesture Conflict)
* **Fayl**: `src/components/common/Modal.jsx` (57–70, 139–144-qatorlar)
* **Ildiz sababi**:
  Modal tanasi (`modal-body`) ning `scrollTop <= 0` bo'lgan holatida foydalanuvchi barmoq bilan ekranga teginib pastga sursa, bu kontentni aylantirish emas, balki modalni surib yopish (`isDragging = true`) deb qabul qilinadi va `e.preventDefault()` chaqiriladi.
* **Oqibati**:
  Mobil qurilmada modal ichidagi formani to'ldirayotgan yoki matnni o'qiyotgan foydalanuvchi tasodifan sal pastga sursa, butun modal silkinib yopilib ketadi va yozilgan ma'lumotlar yo'qoladi.
* **Yechim qadami**:
  Pastga tortib yopish (swipe-to-dismiss) harakatini faqat yuqoridagi tutqich zonasi (`modal-sheet-handle-zone`) va sarlavha (`modal-header`) ga cheklash, `modal-body` dan esa dragging chaqiruvini olib tashlash.

### Bug 5.5: Ichma-Ich Modal (Select Picker) Yopilganda Sahifa Scroll Lock'ining Buzilishi
* **Fayllar**: `src/components/common/Modal.jsx` (26–36-qatorlar) va `src/components/common/Select.jsx` (96–102-qatorlar)
* **Ildiz sababi**:
  `Select` komponenti o'z ichida markaziy `Modal` ochadi. `Modal` yopilayotganda `document.body.style.overflow = ''` qiladi. Agar `Select` boshqa bir modal ichida (masalan, `CreateResumeModal` yoki `PostJobWizard`) ochilgan bo'lsa, `Select` yopilishi bilan asosiy modal ochiq tursa ham butun orqa fon skroll bo'la boshlaydi.
* **Yechim qadami**:
  Ochiq modallar hisoblagichini (modal stack count) joriy qilish va faqat oxirgi modal yopilgandagina `body.style.overflow = ''` qilish.

---

## 6. Xavfsizlik va Ma'lumotlar Butunligi Xatarlari

### Bug 6.1: Autentifikatsiyada `input.uid` Fallback Xavfsizlik Zaifligi
* **Fayl**: `tgcloud/lib/bot/auth.js` (76–82-qatorlar)
* **Ildiz sababi**:
  `getAuthenticatedUserId` funksiyasida `ctx.initData` mavjud bo'lmaganda:
  ```javascript
  if (input?.uid) return Number(input.uid);
  if (input?.userId) return Number(input.userId);
  ```
* **Xavf**:
  Agar Telegram Serverless endpointi tashqaridan bevosita chaqirilsa, xavfli foydalanuvchi so'rov tanasiga `{ uid: 8756078762 }` (SuperAdmin ID si) ni qo'shib yuborib, boshqa shaxs nomidan noqonuniy amallarni bajarishi mumkin.
* **Yechim qadami**:
  `input.uid` fallback'iga faqat lokal muhitda yoki maxsus `MOCK_AUTH` bayrog'i yoqilganidagina ruxsat berish, ishlab chiqarish (production) da esa qat'iy ravishda `ctx.initData.user.id` ni talab qilish.

---

## 7. Bosqichma-Bosqich Tuzatish Rejasi (Step-by-Step Action Plan)

Auditda aniqlangan har bir muammoni bartaraf etish bo'yicha tizimli ketma-ketlik:

### 1-Qadam: Fayllar tozaligi va duplikatsiyani yo'qotish
- Root papkadagi dublikat `endpoints/`, `handlers/`, `lib/` va `schema.js` fayllarini xavfsiz o'chirish.
- Faqat `tgcloud/` katalogidagi backend kod bazasi bilan ishlashni ta'minlash.

### 2-Qadam: Backend xavfsizligi va bot unumdorligini sozlash
- `tgcloud/handlers/message.js` dagi har bir `/start` da ishlayotgan `registerBotCommands()` ni olib tashlash va uni SuperAdmin boshqaruviga o'tkazish.
- `tgcloud/lib/bot/auth.js` dagi autentifikatsiya tekshiruvini qat'iylashtirish.
- `tgcloud/handlers/message.js` dagi Reply Keyboard'ga doimiy Mini App ochish tugmasini kiritish.
- `tgcloud/handlers/callback_query.js` va `tgcloud/lib/bot/channel.js` da kanal postlari tilini standartlashtirish.

### 3-Qadam: Serverless RPC endpointlarini muvofiqlashtirish
- `tgcloud/endpoints/getVacancies.js` va `getResumes.js` da `page` orqali `offset` ni avtomatik hisoblash mantiqini kiritish.
- `tgcloud/endpoints/getVacancyById.js` dagi `companyName: users.lastName` noto'g'ri bog'lanishini to'g'rilash.
- `tgcloud/endpoints/updateUser.js` da admin rolini tasodifiy o'zgarishlardan himoyalash.

### 4-Qadam: Frontend API va ma'lumotlar oqimini uyg'unlashtirish
- `src/modules/vacancies/VacanciesView.jsx` da qidiruv maydonini server API ga ulash (`search: searchQuery`).
- `src/components/common/ResumeCard.jsx` va `src/modules/resumes/ResumeDetailModal.jsx` da nomzod ismini `resume.user` orqali to'g'ri o'qish.
- `ResumeCard.jsx` dagi noto'g'ri `roles.seeker` kalitini `profile.role_seeker` ga almashtirish.

### 5-Qadam: UI/UX va mobil sensorli tajribani takomillashtirish
- `src/modules/post-job/PostJobWizard.jsx` da vakansiya muvaffaqiyatli topshirilganda darhol ekrandan chiqib ketish o'rniga foydalanuvchiga tasdiqlash oynasini ko'rsatish.
- `src/modules/profile/SubscriptionsModal.jsx` da faqat `isActive: true` bo'lgan obunalarni ko'rsatish.
- `src/components/common/Modal.jsx` da mobil surish (drag-to-dismiss) xatti-harakatini faqat header/handle bilan cheklash va nested modallar uchun body scroll lock stekini to'g'rilash.

---
*Ushbu hisobot barcha aniqlangan texnik va vizual kamchiliklarning to'liq inventarizatsiyasini ifodalaydi.*
