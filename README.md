# Cloud Weather Pro

تطبيق طقس عربي متكامل: واجهة متجاوبة، API باستخدام Flask/Gunicorn، وقاعدة PostgreSQL لحفظ آخر عمليات البحث.

## التشغيل على Windows PowerShell
1. فك الضغط وافتح PowerShell داخل مجلد `cloud-weather-pro`.
2. أنشئ ملف الإعدادات:
   ```powershell
   Copy-Item .env.example .env
   ```
3. افتح `.env` وغيّر `POSTGRES_PASSWORD` إلى كلمة مرور طويلة وعشوائية.
4. تحقّق من إعداد Compose ثم شغّل:
   ```powershell
   docker compose config
   docker compose up --build -d
   ```
5. افتح http://localhost:8080

## التشخيص
```powershell
docker compose ps
docker compose logs -f
docker compose logs -f backend
```
إيقاف الخدمات دون حذف البيانات: `docker compose down`

**تنبيه:** `docker compose down -v` يحذف قاعدة البيانات وسجل البحث نهائيًا.

## لماذا لن يتكرر خطأ npm ci؟
الواجهة الأمامية HTML/CSS/JavaScript ثابتة وتُخدم عبر Nginx. لا توجد ملفات package.json أو package-lock.json ولا حاجة إلى npm.

## الأمان
- لا تشارك ملف `.env` ولا ترفعه إلى Git.
- قاعدة البيانات غير منشورة على منفذ جهازك؛ الاتصال بها داخلي عبر شبكة Docker.
- هذا إعداد تعليمي محلي. قبل النشر العام أضف HTTPS، وحدودًا للطلبات، وافحص صور الحاويات وحدّثها بانتظام.
- بيانات الطقس من Open-Meteo ولا تتطلب مفتاح API.
