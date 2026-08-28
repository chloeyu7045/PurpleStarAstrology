// 所有外部相依都集中在這裡，方便日後換版本或改成本地檔案。
// 用 CDN 直接載入，所以這個 App 不需要 npm、不需要編譯。
export * from 'https://esm.sh/vue@3.5.13/dist/vue.esm-browser.prod.js';
export { astro } from 'https://esm.sh/iztro@2';
