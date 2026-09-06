/**
 * 老師登入。用 Supabase Auth 的 REST API，不引入 SDK。
 *
 * 讀取權限是綁在資料庫端的政策上（只認特定信箱），
 * 所以就算有人拿到這裡的金鑰或自己想辦法登入，信箱對不上一樣讀不到。
 */
import { reactive } from './deps.js';

const SUPABASE_URL = 'https://wcmkcgvvfmtbyeyggjqs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_buWqMjomhI1wJp5kqb-7WA_7_bcuAGu';
const SESSION_KEY = 'ziwei:session';

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export const auth = reactive({
  session: loadSession(),
});

export const isLoggedIn = () => !!(auth.session && auth.session.access_token);
export const currentEmail = () =>
  (auth.session && auth.session.user && auth.session.user.email) || '';

function saveSession(s) {
  auth.session = s;
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}

export async function signIn(email, password) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 400) return { ok: false, error: '信箱或密碼不對。' };
      return { ok: false, error: body.msg || body.error_description || `登入失敗（${res.status}）` };
    }
    saveSession(body);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: '連不上伺服器，請檢查網路。' };
  }
}

export function signOut() {
  saveSession(null);
}

/** access_token 會過期，過期就用 refresh_token 換一張新的 */
async function refresh() {
  const s = auth.session;
  if (!s || !s.refresh_token) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    if (!res.ok) { saveSession(null); return false; }
    saveSession(await res.json());
    return true;
  } catch (e) {
    return false;
  }
}

/** 讀取收到的資料。未登入或信箱不符都會拿到空的。 */
export async function fetchSubmissions({ retry = true } = {}) {
  if (!isLoggedIn()) return { ok: false, error: '請先登入。', rows: [] };
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/submissions?select=*&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${auth.session.access_token}`,
        },
      },
    );
    if (res.status === 401 && retry) {
      // token 過期，換一張再試一次
      if (await refresh()) return fetchSubmissions({ retry: false });
      return { ok: false, error: '登入已過期，請重新登入。', rows: [] };
    }
    if (!res.ok) {
      return { ok: false, error: `讀取失敗（${res.status}）`, rows: [] };
    }
    return { ok: true, rows: await res.json() };
  } catch (e) {
    return { ok: false, error: '連不上伺服器，請檢查網路。', rows: [] };
  }
}
