import {
  createApp, ref, computed, defineComponent, onMounted, onUnmounted, nextTick,
} from './deps.js';
import * as S from './store.js';
import { buildPayload, buildHoroscopePayload, buildMonthlyPayload } from './payload.js';
import { systemFor, personalityPrompt, blindspotsPrompt, yearlyPrompt } from './prompts.js';
import {
  getApiKey, setApiKey, clearApiKey, getModel, setModel, MODEL_OPTIONS,
} from './claude.js';
import { ReportPanel, ChartTable, ComparePanel, PersonForm } from './components.js';
import { yearlyReading, decades } from './interpret/yearly.js';

const SettingsDialog = defineComponent({
  name: 'SettingsDialog',
  emits: ['close'],
  setup(_, { emit }) {
    const key = ref(getApiKey());
    const model = ref(getModel());
    const showBirth = ref(S.store.showBirth);

    function save() {
      setApiKey(key.value);
      setModel(model.value);
      S.setShowBirth(showBirth.value);
      emit('close');
    }
    function forget() {
      clearApiKey();
      key.value = '';
    }
    function clearReports() {
      if (!confirm('確定清掉所有已快取的解讀嗎？之後重看會重新呼叫 API。')) return;
      S.clearAllReports();
    }
    function resetPeople() {
      if (!confirm('確定把人員名單還原成內建名單嗎？你新增的人會消失。')) return;
      S.resetToPresets();
      emit('close');
    }
    return { key, model, showBirth, MODEL_OPTIONS, save, forget, clearReports, resetPeople };
  },
  template: `
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal">
        <h2>設定</h2>
        <div class="field">
          <label><input v-model="showBirth" type="checkbox" /> 顯示出生年月日</label>
        </div>
        <p class="hint">
          預設隱藏。關閉時，人名底下的生日、以及命盤上的陽曆／農曆／干支／時辰／生肖／星座都不會顯示，
          但命盤本身照常運作。
        </p>
        <hr style="border:none;border-top:1px solid var(--line);margin:1rem 0" />
        <p class="hint">
          預設是<strong>免費模式</strong>：App 幫你把提示詞組好，你複製到 Claude 網頁版問，再把回答貼回來存檔。
          不需要 API Key，也不用付費。
        </p>
        <div class="field">
          <label>Anthropic API Key（選填，想讓 App 自動生成才需要）</label>
          <input v-model="key" type="password" placeholder="留空就用免費模式" autocomplete="off" />
        </div>
        <p class="hint">
          填了才會多出「直接產生」按鈕，由 App 自動呼叫 Anthropic（<strong>要付費</strong>）。
          Key 只存在你這台電腦的瀏覽器裡。
        </p>
        <div v-if="key" class="field">
          <label>模型</label>
          <select v-model="model">
            <option v-for="m in MODEL_OPTIONS" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
        </div>
        <div class="modal-actions">
          <button @click="clearReports">清空解讀快取</button>
          <button @click="resetPeople">還原預設名單</button>
          <button v-if="key" @click="forget">清除 Key</button>
          <button class="primary" @click="save">儲存</button>
        </div>
      </div>
    </div>
  `,
});

const TABS = [
  { id: 'chart', label: '命盤總覽' },
  { id: 'personality', label: '個性剖析' },
  { id: 'blindspots', label: '盲點與課題' },
  { id: 'yearly', label: '流年運勢' },
  { id: 'compare', label: '兩人比對' },
];

const App = defineComponent({
  components: { ReportPanel, ChartTable, ComparePanel, PersonForm, SettingsDialog },
  setup() {
    const tab = ref('chart');
    const showSettings = ref(false);
    const showForm = ref(false);
    const editing = ref(null);
    const year = ref(new Date().getFullYear());
    const detailed = ref(false);
    const withMonthly = ref(false);

    const person = computed(() => S.selectedPerson());
    const payload = computed(() => (person.value ? buildPayload(person.value) : null));
    const system = computed(() => (payload.value ? systemFor(payload.value) : ''));

    const personalityKey = computed(() => S.cacheKey('personality', S.store.selectedId));
    const blindspotsKey = computed(() => S.cacheKey('blindspots', S.store.selectedId));
    const yearlyKey = computed(() =>
      S.cacheKey('yearly', S.store.selectedId,
        `${year.value}${detailed.value ? ':full' : ''}${withMonthly.value ? ':m' : ''}`));

    const personalityText = computed(() => (payload.value ? personalityPrompt(payload.value) : ''));
    const blindspotsText = computed(() => (payload.value ? blindspotsPrompt(payload.value) : ''));
    const yearlyText = computed(() => {
      if (!person.value || !payload.value) return '';
      const horo = buildHoroscopePayload(person.value, year.value);
      const monthly = withMonthly.value ? buildMonthlyPayload(person.value, year.value) : null;
      return yearlyPrompt(payload.value, horo, detailed.value, monthly);
    });

    /** 一輩子：出生那年到 100 歲，每一年都算得出來 */
    const yearOptions = computed(() => {
      if (!person.value) return [];
      const b = person.value.birth_year;
      const opts = [];
      for (let y = b; y <= b + 100; y++) opts.push({ year: y, age: y - b });
      return opts;
    });

    const decadeList = computed(() => (person.value ? decades(person.value) : []));

    /** 這一年的解讀，程式即時算出來 */
    const yearlyGenerated = computed(() => {
      if (!person.value) return '';
      try {
        return yearlyReading(person.value, year.value);
      } catch (e) {
        return `這一年的資料算不出來（${e.message}），請換一個年份。`;
      }
    });

    const thisYear = new Date().getFullYear();
    function jumpToDecade(d) {
      if (!person.value) return;
      year.value = person.value.birth_year + d.range[0] - 1;
    }

    // ---- 人名列表的左右箭頭（窄螢幕時列表是橫向捲動的） ----
    const peopleEl = ref(null);
    const scrollable = ref(false);
    const canLeft = ref(false);
    const canRight = ref(false);

    function syncNudge() {
      const el = peopleEl.value;
      if (!el) return;
      // 捲動距離用 2px 容差，避免尾端因為小數點永遠到不了
      const max = el.scrollWidth - el.clientWidth;
      scrollable.value = max > 2;
      canLeft.value = el.scrollLeft > 2;
      canRight.value = el.scrollLeft < max - 2;
    }

    function nudge(dir) {
      const el = peopleEl.value;
      if (!el) return;
      el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.7, 120), behavior: 'smooth' });
    }

    let ro = null;
    onMounted(async () => {
      await nextTick();
      syncNudge();
      if (window.ResizeObserver && peopleEl.value) {
        ro = new ResizeObserver(syncNudge);
        ro.observe(peopleEl.value);
      }
      window.addEventListener('resize', syncNudge);
    });
    onUnmounted(() => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', syncNudge);
    });

    function openAdd() {
      editing.value = null;
      showForm.value = true;
    }
    function openEdit() {
      editing.value = person.value || null;
      showForm.value = true;
    }

    return {
      store: S.store, TABS, tab, showSettings, showForm, editing,
      year, detailed, withMonthly, person, payload, system,
      personalityKey, blindspotsKey, yearlyKey,
      personalityText, blindspotsText, yearlyText,
      yearOptions, decadeList, yearlyGenerated, thisYear, jumpToDecade,
      peopleEl, scrollable, canLeft, canRight, syncNudge, nudge,
      openAdd, openEdit,
    };
  },
  template: `
    <div class="app">
      <div class="topbar">
        <h1>紫微斗數 · 命盤解析</h1>
        <span class="spacer"></span>
        <button @click="openAdd">新增人</button>
        <button @click="showSettings = true">設定</button>
      </div>

      <div class="layout">
        <aside class="card">
          <div class="people-wrap">
            <button v-show="scrollable" class="nudge left" :disabled="!canLeft"
              aria-label="上一批" @click="nudge(-1)">‹</button>
            <div class="people-list" ref="peopleEl" @scroll="syncNudge">
              <button v-for="p in store.people" :key="p.id" class="person-btn"
                :class="{ active: p.id === store.selectedId }" @click="store.selectedId = p.id">
                {{ p.name }}<template v-if="store.showBirth"><br /><small>{{ p.birth_year }}/{{ p.birth_month }}/{{ p.birth_day }}</small></template>
              </button>
            </div>
            <button v-show="scrollable" class="nudge right" :disabled="!canRight"
              aria-label="下一批" @click="nudge(1)">›</button>
          </div>
        </aside>

        <main class="card">
          <div class="tabs">
            <button v-for="t in TABS" :key="t.id" :class="{ active: tab === t.id }" @click="tab = t.id">{{ t.label }}</button>
            <span class="spacer"></span>
            <button v-if="person && tab !== 'compare'" @click="openEdit">編輯</button>
          </div>

          <ComparePanel v-if="tab === 'compare'" />

          <template v-else-if="person && payload">
            <p v-if="payload.person.isMinor" class="hint" style="margin-top:0">
              這位還未成年，解讀會自動改用教養與引導的角度。
            </p>

            <ChartTable v-if="tab === 'chart'" :person="person" />

            <ReportPanel v-else-if="tab === 'personality'" :key="personalityKey"
              :cache-key="personalityKey" :system="system" :prompt="personalityText" />

            <ReportPanel v-else-if="tab === 'blindspots'" :key="blindspotsKey"
              :cache-key="blindspotsKey" :system="system" :prompt="blindspotsText" />

            <template v-else-if="tab === 'yearly'">
              <div class="toolbar">
                <button @click="year = year - 1" :disabled="year <= person.birth_year">‹ 前一年</button>
                <select v-model.number="year" style="min-width:11rem">
                  <option v-for="o in yearOptions" :key="o.year" :value="o.year">
                    {{ o.year }} 年（{{ o.age }} 歲）
                  </option>
                </select>
                <button @click="year = year + 1">後一年 ›</button>
                <button @click="year = thisYear">回到今年</button>
              </div>
              <div class="toolbar decades">
                <span class="hint">快速跳到：</span>
                <button v-for="d in decadeList" :key="d.range[0]" class="chip"
                  @click="jumpToDecade(d)">{{ d.range[0] }}–{{ d.range[1] }} 歲</button>
              </div>
              <ReportPanel :key="yearlyKey" :cache-key="yearlyKey" :system="system"
                :prompt="yearlyText" :fallback="yearlyGenerated" />
            </template>
          </template>

          <p v-else class="hint">名單是空的，先新增一個人吧。</p>
        </main>
      </div>

      <PersonForm v-if="showForm" :editing="editing" @close="showForm = false" />
      <SettingsDialog v-if="showSettings" @close="showSettings = false" />
    </div>
  `,
});

createApp(App).mount('#app');
