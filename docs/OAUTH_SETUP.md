# OAuth Setup — Google / X / GitHub (Roman Urdu)

Login-method buttons (Google, X, GitHub) are **hidden by default**. They only
appear on the sign-in screen when BOTH are true:

1. the method is **enabled** in Admin → Settings → Login methods, and
2. its OAuth keys are **configured** (below).

---

## 1. Create OAuth apps

### Google
1. [Google Cloud Console](https://console.cloud.google.com/) → create a project.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Authorized redirect URI:
   ```
   https://<your-project>.supabase.co/auth/v1/callback
   ```
   (replace `<your-project>` with your Supabase project ref).
5. Copy the **Client ID** and **Client secret**.

### X (Twitter)
1. [Twitter Developer Portal](https://developer.twitter.com/) → create an app.
2. Enable **OAuth 2.0** with **Public Client** (PKCE).
3. Callback URL:
   ```
   https://<your-project>.supabase.co/auth/v1/callback
   ```
4. Copy the **Client ID** and **Client secret**.

### GitHub
1. [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers) → **New OAuth App**.
2. Homepage URL: `https://<your-site>/`
3. Callback URL:
   ```
   https://<your-project>.supabase.co/auth/v1/callback
   ```
4. Copy the **Client ID** and **Client secret**.

---

## 2. Enter the keys in Supabase

Supabase Dashboard → **Authentication → Providers**:
- Enable **Google** → paste Client ID + Client secret.
- Enable **Twitter** → paste Client ID + Client secret.
- Enable **GitHub** → paste Client ID + Client secret.
- Save.

---

## 3. Enter the keys in Wazeo Admin

Admin → **Settings**:
- Fill the **OAuth client ID / secret** fields for Google / X / GitHub.
- Under **Login methods**, flip the switch ON for the providers you want to show.
- Save.

Now the provider's button appears on the sign-in screen (only if keys are filled).

---

## Note
- If keys are empty, the method shows **"Keys not configured"** in Admin and no
  button appears — even if the switch is ON.
- All social methods default to **OFF** until you enable them.
