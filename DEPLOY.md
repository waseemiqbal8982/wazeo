# 🌍 WAZEO — DEPLOY GUIDE (Vercel + GitHub)

Sab kuch free plan pe. Simple Roman Urdu.

---

## 1. GitHub repo banao aur code push karo

VS Code terminal me:

```
git init
git add .
git commit -m "Initial Wazeo"
```

- GitHub (https://github.com) par jao → **+** → **New repository** → name `wazeo` likho → **Create repository**.
- GitHub login popup aaye to apne GitHub credentials se login karo. (Yahan ek popup/sign-in page aayega — bas login karo.)
- Phir apne naye repo ke page par ek box dikhega jisme commands hongi. Ye copy karo:

```
git remote add origin https://github.com/TUMHARA_USERNAME/wazeo.git
git branch -M main
git push -u origin main
```

Seed uppercase `TUMHARA_USERNAME` ko apne GitHub username se badlo. Jab `git push` karo to pehli baar password/jay **login popup** aayega — login karo.

---

## 2. Vercel pe deploy karo (free)

1. https://vercel.com par jao → **Sign up** (GitHub se login karo).
2. **Add New Project** → apna `wazeo` repo select karo.
3. Vercel sab automatic detect karega (Next.js). Kuch nahi badalna.
4. **Environmental Variables** section me ye exact names paste karo (values `.env.local` se copy karo):

| Variable (name) | Value kahan se |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | .env.local se |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | .env.local se |
| `SUPABASE_SERVICE_ROLE_KEY` | .env.local se |
| `PROVIDER_API_URL` | .env.local se (khali hai to mock mode) |
| `PROVIDER_API_KEY` | .env.local se (khali hai to mock mode) |
| `MERCURY_BASE_URL` | .env.local se (khali ho sakti hai) |
| `MERCURY_API_KEY` | .env.local se (khali ho sakti hai) |
| `MERCURY_MODEL` | .env.local se (khali ho sakti hai) |
| `CRON_SECRET` | .env.local se (wohi value — neeche bhi) |

5. **Deploy** dabao. ~1-2 minute bad aapka site live hoga (URL kuch is tarah: `https://wazeo-xxxx.vercel.app`).

---

## 3. Supabase Auth redirect URLs add karo

Supabase → **Authentication → URL Configuration** me:
- **Site URL**: `https://wazeo-xxxx.vercel.app` (apna Vercel URL)
- **Redirect URLs** me ye dono add karo:
  - `https://wazeo-xxxx.vercel.app`
  - `http://localhost:3000`

---

## 4. GitHub Actions secret + variable

GitHub repo → **Settings → Secrets and variables → Actions**:
- **Secrets → New repository secret**
  - Name: `CRON_SECRET`
  - Value: `.env.local` se `CRON_SECRET=` ke baad wali value copy karke paste karo (wohi value jo Vercel me daali thi).
- **Variables → New repository variable**
  - Name: `DEPLOYMENT_URL`
  - Value: `https://wazeo-xxxx.vercel.app` (apna Vercel URL)

> Ye har 5 minute me `/api/cron/process` chala kar drip-feed worker chalayega.

---

## 5. Deploy ke baad checklist

- [ ] `https://...vercel.app` kholo → landing page dikhe
- [ ] Sign up karo, email verify karo
- [ ] Terminal me: `npm run make-admin -- tumhara@email.com`
- [ ] `https://...vercel.app/admin` kholo → admin panel dikhe
- [ ] `/admin` me **Sync services** dabao (mock mode me fake list aayegi)
- [ ] Order place karo → `/dashboard/orders` me dekho
- [ ] GitHub Actions (repo → Actions tab) me cron workflow har 5 min chal raha ho

---

## Agar koi problem aaye

- **Blank page** → Vercel dashboard → project → **Logs** dekho; usually env variable ka masla hota hai.
- **Sign up error** → Supabase Auth redirect / email settings check karo.
- **Admin nahi dikhta** → make-admin script sahi email ke saath chalao.

> 💡 Yaad rakho: `.env.local` kabhi GitHub pe push nahi hota (wo gitignored hai). Vercel aur GitHub me values alag se paste karni hoti hain.
