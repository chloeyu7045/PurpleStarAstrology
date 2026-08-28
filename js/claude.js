const KEY_STORAGE = 'ziwei:apiKey';
const MODEL_STORAGE = 'ziwei:model';

export const DEFAULT_MODEL = 'claude-sonnet-5';

export const MODEL_OPTIONS = [
  { id: 'claude-sonnet-5', label: 'Sonnet 5（快、便宜，預設）' },
  { id: 'claude-opus-5', label: 'Opus 5（更深入，較貴）' },
];

export const getApiKey = () => localStorage.getItem(KEY_STORAGE) || '';
export const setApiKey = (k) => localStorage.setItem(KEY_STORAGE, k.trim());
export const clearApiKey = () => localStorage.removeItem(KEY_STORAGE);
export const getModel = () => localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL;
export const setModel = (m) => localStorage.setItem(MODEL_STORAGE, m);

/**
 * 串流呼叫 Claude。
 * 因為這個 App 沒有打包步驟，直接用 fetch 打 Messages API 並自己解析 SSE，
 * 比從 CDN 拉整包 SDK 進來可靠。
 * anthropic-dangerous-direct-browser-access 是從瀏覽器直呼所需的標頭；
 * Key 只存在使用者自己的瀏覽器。
 */
export function streamInterpretation(system, userPrompt, onDelta, onDone, onError) {
  const controller = new AbortController();
  const apiKey = getApiKey();

  (async () => {
    if (!apiKey) {
      onError('還沒設定 API Key，請先到右上角「設定」貼上你的 Anthropic API Key。');
      return;
    }
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: getModel(),
          max_tokens: 16000,
          system,
          stream: true,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!res.ok) {
        onError(await httpError(res));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';
      let stopReason = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE 以空行分隔事件
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(5).trim();
            if (!raw || raw === '[DONE]') continue;
            let evt;
            try {
              evt = JSON.parse(raw);
            } catch (e) {
              continue;
            }
            if (evt.type === 'content_block_delta' && evt.delta && evt.delta.type === 'text_delta') {
              full += evt.delta.text;
              onDelta(evt.delta.text);
            } else if (evt.type === 'message_delta' && evt.delta && evt.delta.stop_reason) {
              stopReason = evt.delta.stop_reason;
            } else if (evt.type === 'error') {
              onError(`伺服器回報錯誤：${(evt.error && evt.error.message) || '未知錯誤'}`);
              return;
            }
          }
        }
      }

      if (stopReason === 'refusal') {
        onError('這次生成被安全機制擋下了，可以按重新生成再試一次。');
        return;
      }
      if (stopReason === 'max_tokens') {
        onDone(full + '\n\n（內容太長被截斷了，可以按重新生成再試一次。）');
        return;
      }
      onDone(full);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof TypeError) {
        onError('連不上 Anthropic。請檢查網路連線，或確認 API Key 是否正確。');
        return;
      }
      onError(`發生錯誤：${err.message}`);
    }
  })();

  return { abort: () => controller.abort() };
}

/** 把 HTTP 錯誤翻成人話 */
async function httpError(res) {
  let detail = '';
  try {
    const body = await res.json();
    detail = (body && body.error && body.error.message) || '';
  } catch (e) {
    /* 沒有 JSON 內容就算了 */
  }
  if (res.status === 401) return 'API Key 無效，請到「設定」確認貼上的 Key 是否正確。';
  if (res.status === 403) return '這把 Key 沒有權限使用這個模型，請換一把 Key 或改選其他模型。';
  if (res.status === 404) return `找不到這個模型，請到「設定」換一個模型。${detail}`;
  if (res.status === 429) return '呼叫太頻繁或額度已用盡，請稍等一下再試，或到 Anthropic 後台確認餘額。';
  if (res.status >= 500) return `Anthropic 伺服器忙碌中（${res.status}），請稍後再試。`;
  return `請求被拒絕（${res.status}）：${detail || '請確認設定是否正確。'}`;
}
