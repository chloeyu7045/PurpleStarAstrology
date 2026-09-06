import { ref, computed, defineComponent } from './deps.js';
import * as S from './store.js';
import { auth, isLoggedIn, currentEmail, signIn, signOut, fetchSubmissions } from './auth.js';

/** 登入視窗 */
export const LoginDialog = defineComponent({
  name: 'LoginDialog',
  emits: ['close', 'done'],
  setup(_, { emit }) {
    const email = ref('');
    const password = ref('');
    const busy = ref(false);
    const error = ref('');

    async function submit() {
      if (busy.value || !email.value.trim() || !password.value) return;
      busy.value = true;
      error.value = '';
      const r = await signIn(email.value, password.value);
      busy.value = false;
      if (r.ok) { emit('done'); emit('close'); } else { error.value = r.error; }
    }
    return { email, password, busy, error, submit };
  },
  template: `
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal">
        <h2>老師登入</h2>
        <p class="hint">只有老師本人能看到訪客送出的資料。一般訪客不需要登入。</p>
        <div class="field">
          <label>信箱</label>
          <input v-model="email" type="email" autocomplete="username"
            @keyup.enter="submit" placeholder="你在 Supabase 建立的信箱" />
        </div>
        <div class="field">
          <label>密碼</label>
          <input v-model="password" type="password" autocomplete="current-password"
            @keyup.enter="submit" />
        </div>
        <div v-if="error" class="error">{{ error }}</div>
        <div class="modal-actions">
          <button @click="$emit('close')">取消</button>
          <button class="primary" :disabled="busy" @click="submit">
            {{ busy ? '登入中…' : '登入' }}
          </button>
        </div>
      </div>
    </div>
  `,
});

/** 收到的資料 */
export const AdminPanel = defineComponent({
  name: 'AdminPanel',
  setup() {
    const rows = ref([]);
    const loading = ref(false);
    const error = ref('');
    const loaded = ref(false);

    async function load() {
      loading.value = true;
      error.value = '';
      const r = await fetchSubmissions();
      loading.value = false;
      loaded.value = true;
      if (r.ok) rows.value = r.rows;
      else error.value = r.error;
    }

    /** 把送出的人加進名單，這樣所有分頁都能直接看他的盤 */
    function openChart(row) {
      const existing = S.store.people.find(
        (p) => p.name === row.name && p.birth_year === row.birth_year
          && p.birth_month === row.birth_month && p.birth_day === row.birth_day
          && p.birth_hour === row.birth_hour,
      );
      if (existing) { S.store.selectedId = existing.id; return; }
      const p = S.addPerson({
        name: row.name,
        gender: row.gender === 'male' ? 'male' : 'female',
        calendar_type: row.calendar_type || 'solar',
        birth_year: row.birth_year,
        birth_month: row.birth_month,
        birth_day: row.birth_day,
        birth_hour: row.birth_hour,
        birth_minute: row.birth_minute || 0,
        is_leap_month: !!row.is_leap_month,
      });
      S.store.selectedId = p.id;
    }

    const twTime = (iso) => {
      try {
        return new Date(iso).toLocaleString('zh-TW', {
          timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit',
          day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
        });
      } catch (e) { return iso; }
    };

    const loggedIn = computed(() => isLoggedIn());
    return { rows, loading, error, loaded, load, openChart, twTime, loggedIn, auth };
  },
  template: `
    <div>
      <div class="toolbar">
        <button class="primary" :disabled="loading" @click="load">
          {{ loading ? '讀取中…' : (loaded ? '重新整理' : '載入收到的資料') }}
        </button>
        <span v-if="loaded && !error" class="hint">共 {{ rows.length }} 筆</span>
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <p v-if="!loaded && !loading" class="hint">按上面的按鈕載入。資料存在雲端，手機和電腦看到的都一樣。</p>
      <p v-else-if="loaded && !rows.length && !error" class="hint">目前還沒有人送出資料。</p>

      <div v-for="r in rows" :key="r.id" class="sub-card">
        <div class="sub-head">
          <strong>{{ r.name }}</strong>
          <span class="hint">{{ r.gender === 'male' ? '男' : '女' }}</span>
          <span class="spacer"></span>
          <span class="hint">{{ twTime(r.created_at) }}</span>
        </div>
        <div class="sub-body">
          {{ r.calendar_type === 'lunar' ? '農曆' : '國曆' }}
          {{ r.birth_year }}/{{ r.birth_month }}/{{ r.birth_day }}
          {{ String(r.birth_hour).padStart(2,'0') }}:{{ String(r.birth_minute||0).padStart(2,'0') }}
          <span v-if="r.is_leap_month">（閏月）</span>
        </div>
        <div v-if="r.contact" class="sub-body"><span class="hint">聯絡方式</span> {{ r.contact }}</div>
        <div v-if="r.note" class="sub-note">{{ r.note }}</div>
        <div class="toolbar" style="margin:0.5rem 0 0">
          <button @click="openChart(r)">看他的命盤</button>
        </div>
      </div>
    </div>
  `,
});
