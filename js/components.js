import { ref, computed, watch, onUnmounted, defineComponent } from './deps.js';
import * as S from './store.js';
import { buildChart, toTimeIndex, TIME_NAMES, maskChartMeta } from './ziwei.js';
import { buildPayload } from './payload.js';
import { comparePrompt, systemFor } from './prompts.js';
import { compareReading } from './interpret/compare.js';
import { RELATIONS } from './interpret/relations.js';
import { streamInterpretation, getApiKey } from './claude.js';
import { renderMarkdown } from './markdown.js';

/** 解讀面板：串流 + 快取，四種報告共用 */
export const ReportPanel = defineComponent({
  name: 'ReportPanel',
  // fallback：程式即時算出來的解讀，沒有預寫內容也沒有存檔時就顯示它
  props: { cacheKey: String, system: String, prompt: String, fallback: String },
  setup(props) {
    const text = ref('');
    const streaming = ref(false);
    const error = ref('');
    let handle = null;

    const html = computed(() => renderMarkdown(text.value));
    const cached = computed(() => !!S.getReport(props.cacheKey) && !streaming.value);

    function stop() {
      if (handle) handle.abort();
      handle = null;
      streaming.value = false;
    }

    function loadCache() {
      stop();
      error.value = '';
      const hit = S.getReport(props.cacheKey);
      text.value = hit ? hit.text : (props.fallback || '');
    }

    function generate() {
      if (!getApiKey()) {
        error.value = '還沒設定 API Key，請先到右上角「設定」貼上你的 Anthropic API Key。';
        return;
      }
      stop();
      error.value = '';
      text.value = '';
      streaming.value = true;
      handle = streamInterpretation(
        props.system,
        props.prompt,
        (chunk) => { text.value += chunk; },
        (full) => {
          streaming.value = false;
          handle = null;
          text.value = full;
          S.saveReport(props.cacheKey, full);
        },
        (msg) => {
          streaming.value = false;
          handle = null;
          error.value = msg;
        },
      );
    }

    /** 自己重寫一份：把面板切回「複製提示詞」模式，但先不動已存的內容 */
    function rewrite() {
      pasting.value = true;
      showRewrite.value = true;
    }

    /** 還原成預先寫好的版本 */
    function restore() {
      S.invalidate(props.cacheKey);
      showRewrite.value = false;
      pasting.value = false;
      draft.value = '';
      loadCache();
    }

    // ---- 免費模式：複製提示詞 → 貼到 Claude 網頁版 → 把回答貼回來 ----

    const hasKey = computed(() => !!getApiKey());
    const copied = ref(false);
    const pasting = ref(false);
    const showRewrite = ref(false);
    const draft = ref('');
    /** 目前顯示的是不是使用者自己貼上存檔的版本（預寫或即時算出來的都不算） */
    const isUserSaved = computed(() => !!S.store.reports[props.cacheKey]);

    /** 完整提示詞＝規則（system）＋題目，一起複製才有約束力 */
    const fullPrompt = computed(() => `${props.system}\n\n---\n\n${props.prompt}`);

    async function copyPrompt() {
      try {
        await navigator.clipboard.writeText(fullPrompt.value);
      } catch (e) {
        // 剪貼簿被擋時，退回「選取起來讓使用者自己按 Cmd+C」
        const ta = document.getElementById('prompt-fallback');
        if (ta) {
          ta.select();
          document.execCommand('copy');
        } else {
          error.value = '複製失敗，請手動選取下方提示詞後按 ⌘C 複製。';
          pasting.value = true;
          return;
        }
      }
      copied.value = true;
      pasting.value = true;
      setTimeout(() => { copied.value = false; }, 2000);
    }

    function openClaude() {
      window.open('https://claude.ai/new', '_blank', 'noopener');
    }

    function saveDraft() {
      const t = draft.value.trim();
      if (!t) return;
      S.saveReport(props.cacheKey, t);
      text.value = t;
      draft.value = '';
      pasting.value = false;
      showRewrite.value = false;
      error.value = '';
    }

    watch(() => [props.cacheKey, props.fallback], () => {
      loadCache();
      draft.value = '';
      pasting.value = false;
      showRewrite.value = false;
      copied.value = false;
    }, { immediate: true });
    onUnmounted(stop);

    return {
      text, streaming, error, html, cached, generate, stop,
      hasKey, copied, pasting, showRewrite, isUserSaved, draft,
      fullPrompt, copyPrompt, openClaude, saveDraft, rewrite, restore,
    };
  },
  template: `
    <div>
      <div v-if="error" class="error">{{ error }}</div>

      <!-- 有內容就直接看，這是預設狀態 -->
      <div v-if="text && !showRewrite" class="report" :class="{ cursor: streaming }" v-html="html"></div>

      <div v-if="text && !showRewrite && !streaming" class="toolbar" style="margin-top:1.2rem">
        <button @click="rewrite">想換一份？自己重寫</button>
        <button v-if="hasKey" @click="generate">用 API 重新產生</button>
        <span v-if="isUserSaved" class="hint">這是你自己存的版本</span>
      </div>

      <!-- 沒有預寫內容，或使用者主動要重寫 -->
      <div v-if="(!text || showRewrite) && !streaming" class="steps">
        <div class="toolbar">
          <button class="primary" @click="copyPrompt">{{ copied ? '✓ 已複製！' : '① 複製提示詞' }}</button>
          <button @click="openClaude">② 開啟 Claude</button>
          <button v-if="hasKey" @click="generate">（或）直接產生</button>
          <button v-if="showRewrite" @click="restore">取消</button>
        </div>
        <p class="hint">
          按 <strong>① 複製提示詞</strong> → 按 <strong>② 開啟 Claude</strong> →
          在 Claude 貼上（⌘V）送出 → 把回答複製起來貼回下面存檔。
        </p>
        <textarea id="prompt-fallback" class="prompt-box" readonly :value="fullPrompt"></textarea>
        <template v-if="pasting">
          <label class="hint">把 Claude 的回答貼在這裡：</label>
          <textarea v-model="draft" class="paste-box" placeholder="在這裡貼上 Claude 給你的回答（⌘V）"></textarea>
          <div class="toolbar">
            <button class="primary" :disabled="!draft.trim()" @click="saveDraft">存檔</button>
          </div>
        </template>
      </div>

      <p v-if="streaming" class="hint cursor">生成中</p>
    </div>
  `,
});

/** 命盤總覽表格 */
export const ChartTable = defineComponent({
  name: 'ChartTable',
  props: { person: Object },
  setup(props) {
    const chart = computed(() => buildChart(props.person));
    const starText = (s) => s.name + (s.brightness ? `(${s.brightness})` : '');
    // 生辰欄位：關閉顯示時遮掉但保留欄位，版面不會少一塊
    const meta = computed(() =>
      (S.store.showBirth ? chart.value : { ...chart.value, ...maskChartMeta(chart.value) }));
    return { chart, meta, starText, store: S.store };
  },
  template: `
    <div>
      <div class="meta-grid">
        <div><span>陽曆</span>{{ meta.solarDate }}</div>
        <div><span>農曆</span>{{ meta.lunarDate }}</div>
        <div><span>干支</span>{{ meta.chineseDate }}</div>
        <div><span>時辰</span>{{ meta.time }} {{ meta.timeRange }}</div>
        <div><span>生肖</span>{{ meta.zodiac }}</div>
        <div><span>星座</span>{{ meta.sign }}</div>
        <div><span>命主</span>{{ chart.soul }}</div>
        <div><span>身主</span>{{ chart.body }}</div>
        <div><span>五行局</span>{{ chart.fiveElementsClass }}</div>
      </div>
      <div style="overflow-x:auto">
      <table class="palaces">
        <thead>
          <tr><th>宮位</th><th>干支</th><th>主星</th><th>輔星</th><th>大限</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in chart.palaces" :key="p.index" :class="{ 'is-ming': p.name === '命宮' }">
            <td class="cell-name">{{ p.name }}<span v-if="p.isBody" class="tag body">身</span></td>
            <td data-label="干支">{{ p.stem }}{{ p.branch }}</td>
            <td data-label="主星">
              <template v-for="(s, i) in p.majorStars" :key="s.name">
                <span v-if="i">　</span><span>{{ starText(s) }}</span><span v-if="s.mutagen" :class="'m-' + s.mutagen">化{{ s.mutagen }}</span>
              </template>
              <span v-if="!p.majorStars.length" class="hint">—</span>
            </td>
            <td data-label="輔星">
              <template v-for="(s, i) in p.minorStars" :key="s.name">
                <span v-if="i">　</span><span>{{ s.name }}</span><span v-if="s.mutagen" :class="'m-' + s.mutagen">化{{ s.mutagen }}</span>
              </template>
              <span v-if="!p.minorStars.length" class="hint">—</span>
            </td>
            <td data-label="大限">{{ p.decadalRange.join('–') }}</td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  `,
});

/** 兩人比對 */
export const ComparePanel = defineComponent({
  name: 'ComparePanel',
  components: { ReportPanel },
  setup() {
    // 左邊預設帶入目前在看的人，右邊自動挑另一個，不用每次重選
    const current = S.store.selectedId || (S.store.people[0] && S.store.people[0].id) || '';
    const other = (S.store.people.find((p) => p.id !== current) || {}).id || '';
    const leftId = ref(current);
    const rightId = ref(other);
    const relation = ref('friend');
    const ready = computed(() => leftId.value && rightId.value && leftId.value !== rightId.value);

    const pair = computed(() => {
      if (!ready.value) return null;
      const a = S.store.people.find((p) => p.id === leftId.value);
      const b = S.store.people.find((p) => p.id === rightId.value);
      if (!a || !b) return null;
      const pa = buildPayload(a);
      const pb = buildPayload(b);
      return {
        // 順序不影響結果，key 排序後才不會同一組算兩次
        key: S.cacheKey('compare', `${[a.id, b.id].sort().join('+')}:${relation.value}`),
        system: systemFor(pa.person.isMinor ? pa : pb),
        prompt: comparePrompt(pa, pb),
        // 任兩人都直接算得出來，不需要等任何人
        generated: compareReading(a, b, relation.value),
      };
    });

    return { store: S.store, leftId, rightId, relation, RELATIONS, ready, pair };
  },
  template: `
    <div>
      <div class="toolbar">
        <select v-model="leftId">
          <option v-for="p in store.people" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <span class="hint">和</span>
        <select v-model="rightId">
          <option v-for="p in store.people" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="toolbar">
        <span class="hint">他們的關係是</span>
        <select v-model="relation">
          <option v-for="r in RELATIONS" :key="r.id" :value="r.id">{{ r.label }}</option>
        </select>
      </div>
      <p v-if="!ready" class="hint">請選兩個不同的人。</p>
      <ReportPanel
        v-else-if="pair"
        :key="pair.key"
        :cache-key="pair.key"
        :system="pair.system"
        :prompt="pair.prompt"
        :fallback="pair.generated"
      />
    </div>
  `,
});

/** 新增 / 編輯人 */
export const PersonForm = defineComponent({
  name: 'PersonForm',
  props: { editing: Object },
  emits: ['close'],
  setup(props, { emit }) {
    const e = props.editing;
    const form = ref({
      name: e ? e.name : '',
      gender: e ? e.gender : 'female',
      calendar_type: e ? e.calendar_type : 'solar',
      birth_year: e ? e.birth_year : 1990,
      birth_month: e ? e.birth_month : 1,
      birth_day: e ? e.birth_day : 1,
      birth_hour: e ? e.birth_hour : 12,
      birth_minute: e ? e.birth_minute : 0,
      is_leap_month: e ? e.is_leap_month : false,
    });

    const timeName = computed(() => TIME_NAMES[toTimeIndex(Number(form.value.birth_hour) || 0)]);
    const valid = computed(() => {
      const f = form.value;
      return f.name.trim() !== '' && f.birth_year > 1900 &&
        f.birth_month >= 1 && f.birth_month <= 12 &&
        f.birth_day >= 1 && f.birth_day <= 31 &&
        f.birth_hour >= 0 && f.birth_hour <= 23;
    });

    function save() {
      if (!valid.value) return;
      if (props.editing) {
        S.updatePerson(props.editing.id, { ...form.value });
      } else {
        const p = S.addPerson({ ...form.value });
        S.store.selectedId = p.id;
      }
      emit('close');
    }

    function remove() {
      if (!props.editing) return;
      if (!confirm(`確定要刪除「${props.editing.name}」嗎？連同他的解讀快取都會清掉。`)) return;
      S.removePerson(props.editing.id);
      emit('close');
    }

    return { form, timeName, valid, save, remove };
  },
  template: `
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal">
        <h2>{{ editing ? '編輯' : '新增' }}資料</h2>
        <div class="field">
          <label>姓名</label>
          <input v-model="form.name" placeholder="怎麼稱呼" />
        </div>
        <div class="row">
          <div class="field">
            <label>性別</label>
            <select v-model="form.gender"><option value="female">女</option><option value="male">男</option></select>
          </div>
          <div class="field">
            <label>曆法</label>
            <select v-model="form.calendar_type"><option value="solar">陽曆（國曆）</option><option value="lunar">農曆</option></select>
          </div>
        </div>
        <div class="row">
          <div class="field"><label>年</label><input v-model.number="form.birth_year" type="number" /></div>
          <div class="field"><label>月</label><input v-model.number="form.birth_month" type="number" min="1" max="12" /></div>
          <div class="field"><label>日</label><input v-model.number="form.birth_day" type="number" min="1" max="31" /></div>
        </div>
        <div class="row">
          <div class="field"><label>時（24 小時制）</label><input v-model.number="form.birth_hour" type="number" min="0" max="23" /></div>
          <div class="field"><label>分</label><input v-model.number="form.birth_minute" type="number" min="0" max="59" /></div>
        </div>
        <p class="hint">換算時辰：<strong>{{ timeName }}</strong>（排盤只看時辰，分鐘僅供記錄）</p>
        <div v-if="form.calendar_type === 'lunar'" class="field">
          <label><input v-model="form.is_leap_month" type="checkbox" /> 這個月是閏月</label>
        </div>
        <div class="modal-actions">
          <button v-if="editing" @click="remove">刪除</button>
          <button @click="$emit('close')">取消</button>
          <button class="primary" :disabled="!valid" @click="save">儲存</button>
        </div>
      </div>
    </div>
  `,
});
