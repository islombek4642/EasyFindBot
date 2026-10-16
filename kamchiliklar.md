1. Arxitekturadagi to'g'ri va kuchli asoslar

* **Telegram Serverless (`tgcloud`) tanlovi**: Alohida server, VPS yoki murakkab webhook sozlamalarisiz to'g'ridan-to'g'ri Telegram infratuzilmasida V8 sandbox va SQLite yordamida ishlash loyihaga yuqori tezlik va barqarorlik beradi.
* **Qat'iy cheklovlar hisobga olingan**: Runtime'da tashqi npm paketlar yo'qligi, SQLite'da Foreign Key cheklovlari (`PRAGMA foreign_keys = off`) inobatga olingan.
* **Dizayn qoidalari**: Emojilar va stikerlar o'rniga faqat `@iconify/react` ishlatilishi, barcha matnlarning qat'iy i18n (`uz`, `ru`, `en`) orqali chiqarilishi zamonaviy standartlarga mos.

---

### 2. Spec (Dizayn spetsifikatsiyasi) dagi kamchiliklar va bo'shliqlar

#### 2.1. Foydalanuvchi identifikatori va Autentifikatsiya chalkashligi (`id` vs `tg_id`)

* **Muammo**: `schema.js` da `users.id` avto-inkrement (1, 2, 3...), lekin `vacancies.employerId`, `resumes.seekerId`, `applications.seekerId` va `subscriptions.userId` maydonlarida qaysi ID saqlanishi aniq belgilanmagan.
* **Xavf**: Mini App RPC endpointlarida `ctx.initData.user.id` orqali Telegram ID (`tg_id`) keladi. Agar jadvallarda ichki `id` bilan `tg_id` aralashib ketsa, noto'g'ri ma'lumotlar bog'lanishi yoki har bir so'rovda ortiqcha `SELECT id FROM users WHERE tg_id = ...` qilishga to'g'ri keladi.
* **Tavsiya**: Barcha jadvallarda Telegram ID'ni to'g'ridan-to'g'ri `employerTgId`, `seekerTgId` deb nomlash yoki yagona ichki identifikatsiya konvensiyasini qat'iy belgilash.

#### 2.2. Tushib qolgan muhim biznes-mantiqiy Endpointlar

Hozirgi spec'da faqat 8 ta endpoint sanab o'tilgan. Lekin quyidagi muhim funksiyalar umuman ko'zda tutilmagan:

1. **Ish beruvchi uchun arizalar**: `getVacancyApplications.js` va `updateApplicationStatus.js` (Nomzod arizani topshiradi (`applyVacancy`), lekin ish beruvchi kelgan arizalarni qayerda va qanday ko'radi, ko'rildi/qabul qilindi deb qanday belgilaydi?).
2. **Mening e'lonlarim**: `getMyVacancies.js` (Ish beruvchi o'zi joylagan vakansiyalarni, ularning statusini — `pending`/`approved`/`rejected` — ko'rishi va yopishi (`status = 'closed'`) uchun).
3. **Mening arizalarim**: `getMyApplications.js` (Nomzod o'zi topshirgan arizalar ro'yxati va ularning hozirgi holatini ko'rishi uchun).
4. **Obunalar boshqaruvi**: `getSubscriptions.js` va `toggleSubscription.js` (Sxemada `subscriptions` jadvali bor, lekin foydalanuvchi obuna bo'lishi yoki bekor qilishi uchun endpoint mavjud emas).

#### 2.3. Vakansiya va Rezyume maydonlaridagi yetishmovchiliklar

* **Maosh (Salary)**: Hozir faqat `salaryMin` va `salaryMax` bor. Hayotiy loyihalarda ko'p ish beruvchilar maoshni "Kelishilgan" (Negotiable) deb qo'yadi. Agar minimal yoki maksimal maosh kiritilmasa, filter va ko'rinishda xatolik chiqmasligi uchun `isNegotiable: boolean` yoki `salaryType` maydoni kiritilishi shart.
* **Arizalarning takrorlanishi (Duplicate Applications)**: Bir nomzod ayni bir vakansiyaga 10 marta ariza bosib yuborishi mumkin. `applications` jadvalida `(vacancyId, seekerId)` bo'yicha `uniqueIndex` qo'yilishi kerak.

#### 2.4. Konfiguratsiya va Moderatsiya xavfsizligi

* **Muammo**: Spec'da `ADMIN_CHAT_ID` va `CHANNEL_ID` ishlatiladi deyilgan, lekin `tgcloud` V8 sandbox'da Node.js `process.env` mavjud emas.
* **Xavf**: Bu o'zgaruvchilar qayerda saqlanadi? Agar `tgcloud/lib/config.js` da bo'lsa, xavfsizlik va o'zgartirish qanday bo'ladi?
* **Callback Query xavfsizligi**: `callback_query.js` da admin tugmani (`admin:approve:<id>`) bosganda, o'sha tugmani bosgan shaxs rostdan ham admin ekanligini tekshirish mexanizmi spetsifikatsiyada bayon etilmagan. Begona foydalanuvchi tasodifan callback jo'natib vakansiyani tasdiqlab yuborishi xavfi bor.

#### 2.5. Telegram UX va Deep Linking

* Kanaldagi post ostida `web_app: { url: 'https://app<id>.tgcloud.ai?startapp=vac_<id>' }` havolasi beriladi. Mini App ochilganda `Telegram.WebApp.initDataUnsafe.start_param` ni o'qib, foydalanuvchiga to'g'ridan-to'g'ri o'sha vakansiyaning modal oynasini ochib berish mexanizmi frontend arxitekturasida aniq yozilmagan.
* Telegram Theme Params (`themeParams.bg_color`, `text_color` va h.k.) bilan moslashuvchanlik spec'da aytilmagan (Mini App Telegram'ning tungi/kunduzgi rejimiga moslashishi shart).

---

### 3. Reja (Implementation Plan) dagi kamchiliklar

1. **Topshiriqlar ketma-ketligida uzilish**:
   * Task 4 (Endpoints) da yuqorida aytilgan 4-5 ta yetishmayotgan endpointlar yo'q.
   * Task 7 (Frontend) da ProfileView va ResumesView aytilgan, lekin ular tayanadigan endpointlar mavjud emasligi sababli frontend to'liq ishlay olmay qoladi.
2. **Mahalliy ishlab chiqish (Local Dev) va Mock muhiti**:
   * Mini App'ni `npm run dev` orqali brauzerda ishlatganda `Telegram.WebApp.Serverless.call` mavjud bo'lmaydi. Plan'da `src/services/api.js` ichida lokal mock ma'lumotlar qaytaruvchi mustahkam qatlamni (mock adapter) joriy etish alohida qadam sifatida aniq ko'rsatilmagan.
3. **Qidiruv va Sahifalash (Search & Pagination)**:
   * Rejada vakansiyalar qidiruvi va sahifalanishi (masalan, 10-20 tadan yuklash) ko'rsatilmagan; bu katta hajmda ma'lumot bo'lganda mobil ilovani qotirib qo'yishi mumkin.

---

### Taklif etiladigan keyingi harakatlar

Ushbu kamchiliklarni tuzatish uchun:

1. `tgcloud/schema.js` va endpointlar ro'yxatiga yetishmayotgan so'rovlar (`getMyVacancies`, `getVacancyApplications`, `updateApplicationStatus`, `toggleSubscription`) ni qo'shamiz.
2. Identifikatorlarni Telegram ID (`tgId`) ga moslashtirib, chalkashliklarni bartaraf etamiz.
3. Moderatsiya xavfsizligi va config saqlash modelini aniqlashtiramiz.
4. Ushbu yangilanishlarni avval **Spec** ([2026-10-15-easyfindbot-design.md](file:///d:/EasyFindBot/docs/superpowers/specs/2026-10-15-easyfindbot-design.md)) ga, so'ngra **Plan** ([2026-10-15-easyfindbot.md](file:///d:/EasyFindBot/docs/superpowers/plans/2026-10-15-easyfindbot.md)) ga kiritamiz.

Ushbu tahlil va aniqlangan kamchiliklar bo'yicha fikringiz qanday? Qaysi jihatlarni birinchi bo'lib spec va planga kiritishni ma'qul ko'rasiz?
