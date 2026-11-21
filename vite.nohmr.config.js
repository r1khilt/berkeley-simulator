import base from './vite.config.js';
export default { ...base, server: { ...base.server, port: 5174, hmr: false } };
