/**
 * 把訪客願意分享的生辰資料送到 Supabase。
 *
 * 安全性說明：
 * 下面這把 publishable key 本來就是設計成公開的，前端一定看得到。
 * 真正的保護在資料庫端 —— submissions 這張表只開放 insert，
 * 沒有任何 select 政策，所以就算有人拿到這把金鑰，也只能寫進去、撈不出來。
 */
const SUPABASE_URL = 'https://wcmkcgvvfmtbyeyggjqs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_buWqMjomhI1wJp5kqb-7WA_7_bcuAGu';

const ENDPOINT = `${SUPABASE_URL}/rest/v1/submissions`;

/**
 * 送出一筆。成功回 {ok:true}，失敗回 {ok:false, error:'人話'}。
 * 送不出去不該影響使用者 —— 他的命盤在本機已經算好了。
 */
export async function submitPerson(person, extra = {}) {
  const row = {
    name: String(person.name || '').slice(0, 50),
    gender: person.gender === 'male' ? 'male' : 'female',
    calendar_type: person.calendar_type === 'lunar' ? 'lunar' : 'solar',
    birth_year: Number(person.birth_year),
    birth_month: Number(person.birth_month),
    birth_day: Number(person.birth_day),
    birth_hour: Number(person.birth_hour),
    birth_minute: Number(person.birth_minute) || 0,
    is_leap_month: !!person.is_leap_month,
    contact: (extra.contact || '').trim().slice(0, 100) || null,
    note: (extra.note || '').trim().slice(0, 500) || null,
  };

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });

    if (res.ok) return { ok: true };

    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: '送出被拒絕了，可能是資料庫權限設定有問題。' };
    }
    if (res.status === 400) {
      return { ok: false, error: '資料格式不對，請檢查年月日時是否填正確。' };
    }
    if (res.status === 429) {
      return { ok: false, error: '送太多次了，請稍後再試。' };
    }
    return { ok: false, error: `送出失敗（${res.status}），請稍後再試。` };
  } catch (e) {
    return { ok: false, error: '連不上伺服器，請檢查網路後再試一次。' };
  }
}
