// Офлайн-режим: при установке кладём в кэш всю игру и записанную озвучку.
const VERSION = 'malysh-1790699799269';
self.G = {};
importScripts('js/voice-files.js');
const CORE = [
  './', 'index.html', 'print.html', 'script.html', 'manifest.webmanifest', 'css/style.css',
  'js/core.js', 'js/audio.js', 'js/voice-files.js', 'js/art.js', 'js/engines.js', 'js/engines2.js', 'js/levels.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'
];
const VOICE = Object.values(self.G.VOICE_FILES || {}).map(f => 'audio/voice/' + f);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.concat(VOICE))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => req.mode === 'navigate' ? caches.match('index.html') : Response.error())));
});
