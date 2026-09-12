// 把命理術語翻成白話的核心對照表。
// 解讀引擎只用這裡的詞彙造句，確保輸出永遠不會出現術語。

/** 十二宮 → 人生的哪個領域 */
export const PALACE = {
  命宮: { events: '換造型、換心境、想重新定義自己、或是身體狀態明顯有變', short: '你自己', area: '你自己', long: '你整個人的狀態、你想成為什麼樣的人',
    good: '你會比較有主見、比較敢做自己想做的事', bad: '你會對自己特別不滿意、容易鑽牛角尖' },
  兄弟: { events: '跟手足或換帖朋友有往來、有人來找你合作、或是為了平輩的事奔波', short: '兄弟姊妹', area: '兄弟姊妹與換帖的朋友', long: '兄弟姊妹、麻吉、平輩之間的往來',
    good: '跟平輩的關係會變順，有人挺你', bad: '容易跟兄弟姊妹或好友起摩擦、有金錢往來的糾紛' },
  夫妻: { events: '告白、同居、結婚、吵架、冷戰、或是關係定下來', short: '感情', area: '感情與另一半', long: '你的親密關係、伴侶、婚姻',
    good: '感情會加溫，單身的有機會遇到人，有伴的會更靠近', bad: '感情容易起爭執、冷掉，或是為了對方的事煩心' },
  子女: { events: '小孩的事、學生或下屬的事、或是你自己做的作品有進展', short: '小孩與作品', area: '小孩、晚輩，還有你親手做出來的東西', long: '小孩、學生、下屬，以及你親手做出來的作品',
    good: '跟小孩或晚輩的緣分變好，你做的東西會有成果', bad: '為小孩或晚輩操心，或是你努力做的東西受挫' },
  財帛: { events: '加薪、獎金、接到案子、多一條收入、或是一筆預期外的支出', short: '金錢', area: '金錢與收入', long: '你賺多少、怎麼賺、錢怎麼流動',
    good: '收入會變好，或是有意外的進帳', bad: '錢容易卡住、留不住，或是為錢煩心' },
  疾厄: { events: '健檢、舊傷復發、睡眠變差、或是終於開始運動', short: '身體', area: '身體與健康', long: '你的體力、健康、以及情緒累積在身上的樣子',
    good: '體力會恢復，身體狀況比較穩', bad: '要特別注意健康，舊毛病容易冒出來，也容易累到出狀況' },
  遷移: { events: '出差、旅行、搬家、換工作環境、或是跟外地的人打交道', short: '出外運', area: '出遠門與換環境', long: '出遠門、搬家、換工作環境、跟外面的人打交道',
    good: '往外走會有好事，出門、換環境、拓展都順', bad: '在外面容易碰釘子，出遠門或變動要多留心' },
  僕役: { events: '有人介紹機會給你、被拉去合夥、或是跟朋友因為錢鬧不愉快', short: '朋友同事', area: '朋友、同事與合作的人', long: '你的人脈圈、共事的人、合夥人',
    good: '會遇到幫得上忙的人，人脈打得開', bad: '容易被朋友或合作對象拖累，尤其是牽扯到錢的時候' },
  官祿: { events: '升遷、換職務、接新專案、被指派更大的責任、或是動了離職的念頭', short: '工作', area: '工作與事業', long: '你的職涯、工作表現、事業的走向',
    good: '工作會順，有升遷、接手更大的事、或被看見的機會', bad: '工作容易卡關、換來換去，或是壓力特別大' },
  田宅: { events: '搬家、買賣房子、裝修、或是家裡有大事要處理', short: '家裡', area: '家與住的地方', long: '你的家庭、房子、以及你長期累積下來的東西',
    good: '家裡的事會順，也可能有搬家、置產、整修的好時機', bad: '家裡容易有狀況，或是為了房子、家人的事傷神' },
  福德: { events: '心情起伏大、開始追求某個興趣、或是突然想通一件事', short: '心情', area: '你的心情與內在', long: '你快不快樂、想得多不多、生活品質好不好',
    good: '心情會鬆開來，比較享受得到生活', bad: '會想很多、睡不好、心裡不踏實' },
  父母: { events: '長輩的健康、跟上司的關係、或是要處理家族的事', short: '長輩', area: '長輩與上司', long: '你的父母、長輩、主管，以及跟權威的關係',
    good: '長輩或上司會幫你，關係變好', bad: '容易跟長輩或上司有摩擦，或是為長輩的健康操心' },
};

/** 四化 → 這一年這個領域會怎樣 */
export const MUTAGEN = {
  祿: { name: '順風', verb: '會順起來',
    desc: '這是今年最不費力的地方，事情推得動，也容易有實質的好處進來' },
  權: { name: '掌控', verb: '你會拿到更多主導權',
    desc: '你在這裡說話會更有份量、能做的決定更多——但責任和壓力也會一起變大' },
  科: { name: '名聲', verb: '會被看見',
    desc: '這裡會有貴人、有好名聲，就算遇到麻煩也容易有人出手幫你化解' },
  忌: { name: '卡關', verb: '會卡住',
    desc: '這是今年最需要留神的地方，容易糾結、耗損、或是事情不如預期。不是不能碰，是要多花心思、別硬來' },
};

/** 十四主星 → 白話的性質，用在描述某個宮位的底色 */
export const STAR = {
  紫微: '想扛責任、想主導',
  天機: '動腦、變化多、想很多',
  太陽: '付出、忙碌、容易曝光',
  武曲: '跟錢和實務綁得很緊、硬碰硬',
  天同: '想放鬆、想過得舒服一點',
  廉貞: '人際糾葛多、也牽動感情',
  天府: '穩、守成、慢慢累積',
  太陰: '細膩、內斂、跟房子和家有關',
  貪狼: '慾望多、機會多、應酬多',
  巨門: '靠一張嘴、也容易招來話',
  天相: '協調、幫人、講究體面',
  天梁: '有長輩緣、講原則、愛照顧人',
  七殺: '衝、辛苦、開疆闢土',
  破軍: '打掉重練、變動大',
};

/** 人生階段：用虛歲判斷，讓語氣跟著年紀走 */
export function lifeStage(age) {
  if (age <= 5) return { key: 'baby', label: '幼兒', voice: 'child' };
  if (age <= 12) return { key: 'child', label: '兒童', voice: 'child' };
  if (age <= 17) return { key: 'teen', label: '青少年', voice: 'child' };
  if (age <= 25) return { key: 'young', label: '青年', voice: 'adult' };
  if (age <= 39) return { key: 'prime', label: '壯年', voice: 'adult' };
  if (age <= 55) return { key: 'mid', label: '中年', voice: 'adult' };
  if (age <= 69) return { key: 'senior', label: '熟年', voice: 'adult' };
  return { key: 'elder', label: '老年', voice: 'elder' };
}

/** 依人生階段調整某個領域的講法（例如小孩的「工作」其實是「學習」） */
export function areaFor(palaceName, stageKey) {
  const child = ['baby', 'child', 'teen'].includes(stageKey);
  const elder = stageKey === 'elder';
  if (child) {
    if (palaceName === '官祿') return '學習與在學校的表現';
    if (palaceName === '財帛') return '零用錢與金錢觀';
    if (palaceName === '夫妻') return '跟同伴的親近關係';
    if (palaceName === '子女') return '玩伴與你做出來的東西';
    if (palaceName === '僕役') return '同學與玩伴';
    if (palaceName === '父母') return '爸媽與老師';
  }
  if (elder) {
    if (palaceName === '官祿') return '你還在忙的事、退休後的正事';
    if (palaceName === '子女') return '子女與晚輩';
  }
  return PALACE[palaceName] ? PALACE[palaceName].area : palaceName;
}

/** 短標籤，用在一句話總結那種需要簡潔的地方 */
export function shortFor(palaceName, stageKey) {
  const child = ['baby', 'child', 'teen'].includes(stageKey);
  if (child) {
    if (palaceName === '官祿') return '課業';
    if (palaceName === '財帛') return '金錢觀';
    if (palaceName === '夫妻') return '跟同伴的關係';
    if (palaceName === '僕役') return '同學與玩伴';
    if (palaceName === '父母') return '爸媽與老師';
  }
  return PALACE[palaceName] ? PALACE[palaceName].short : palaceName;
}
