// src/assets/tokenIcons.js
const modules = import.meta.glob('./tokens/*.svg', { eager: true });

const tokenIcons = {};
for (const path in modules) {
  const mod = modules[path];
  // normalize to a string URL for Vite variations
  const url = (mod && (mod.default || (typeof mod === 'string' ? mod : null))) || null;
  if (!url) continue;
  const file = path.split('/').pop(); // e.g. 'eth.svg'
  const symbol = file.replace('.svg', '').toUpperCase();
  tokenIcons[symbol] = url;
}

tokenIcons.DEFAULT = tokenIcons['USDT'] || Object.values(tokenIcons)[0] || '';
export default tokenIcons;
