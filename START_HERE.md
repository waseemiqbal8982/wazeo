# 🚀 Wazeo — START HERE (shuru yahin se)

Ye guide bilkul aasan hai. Har step me exact clicks hain. Bas tareeqe se karo.

---

## Step 1 — `.env.local` bharo (sirf 4 lines)

1. VS Code me file kholo: `C:\Users\WASEEM\Desktop\Wazeo\.env.local`
2. Ye 4 lines bharo (quotes ke bagair):

```
NEXT_PUBLIC_SUPABASE_URL=https://gplkfmnpbvsvrigqtcbr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_R7cDNZ3ql62BtODYXAyl2g_LdPeiZya
SUPABASE_SERVICE_ROLE_KEY=YAHAN_SECRET_KEY_PASTE_KARO
SUPABASE_DB_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-xxx.pooler.supabase.com:6543/postgres
```

- `SUPABASE_SERVICE_ROLE_KEY` → Supabase → left sidebar **Settings (⚙️)** → **API** → `service_role` wali key copy karke yahan paste karo.
- `SUPABASE_DB_URL` → **Settings → Database → Connection string → URI** (ya "Transaction pooler" wali URI). Usme `[YOUR-PASSWORD]` ki jagah apna database password dalna (wo jo project banate waqt set kiya tha).

> ⚠️ Ye dono keys SECRET hain — kisi ko mat dikhana, aur kabhi GitHub pe push mat karna.

---

## Step 2 — Database setup (1 command)

Terminal (VS Code me `Terminal` → `New Terminal`) me likho:

```
npm run db:setup
```

- Agar sab green `✔`/`✅` aaya → database tayyar hai.
- Agar koi red `❌` aaya to error ki line number dikhegi. Sab se common error: `SUPABASE_DB_URL` me password theek nahi. Use dobarah check karo.

---

## Step 3 — App chalao

```
npm run dev
```

- Browser me kholo: **http://localhost:3000**
- Landing page dikhegi.
- **Sign up** karo (username, email, password).
- Email me verification link aayega → click karo (ye zaroori hai).

---

## Step 4 — Apne account ko ADMIN banao (1 command)

Terminal me (dev server ko Ctrl+C se band karne ki zaroorat nahi — doosri terminal khol lo):

```
npm run make-admin -- tumhara@email.com
```

(Email apni daalo.) Is se email auto-confirm bhi ho jayegi.

---

## Step 5 — Demo data (seed)

```
npm run seed
```

- Is se Instagram/TikTok/YouTube ke demo services aur ek welcome announcement add hoti hain (sirf tab jab services khali hon).

---

## Step 6 — Sab check karo

```
npm run check
```

- Ye sab kuch check karta hai: env, keys, tables, RLS, provider mode, Mercury, build.
- Jo bhi **red ✘** ho, uske saath fix likha hoga.

---

## Step 7 — Kya dekhna chahiye

- `http://localhost:3000` → landing page.
- Sign in karo → `/dashboard` → balance, stats, recent orders.
- `/dashboard/new-order` → service chuno, link daalo, quantity → **Place order** (mock mode me fake status aayega).
- `/admin` → admin panel (sync services, payments, users, etc.)

---

## Common errors aur fix

| Error | Fix |
|---|---|
| `Error: supabase URL` / `fetch failed` | Supabase URL ko check karo, internet on hona chahiye |
| `No password supplied` | `SUPABASE_DB_URL` me password daalna bhool gaye |
| `User not found with that email` | Pehle site pe sign up karo, phir make-admin chalao |
| `Table does not exist` | `npm run db:setup` dobarah chalao |
| Email verify nahi ho rahi | `npm run make-admin` chalao (ye auto-confirm karta hai) |
| Port 3000 busy | `npm run dev -- -p 3001` aur browser me localhost:3001 |

---

> 💡 Ab tu ready hai. Nikal, test kar, enjoy karo!
