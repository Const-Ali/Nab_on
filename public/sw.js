const CACHE = 'nab-v2'
const SHELL = ['./', './index.html', './favicon.svg', './manifest.webmanifest', './icon-192.png', './icon-512.png']
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  // صفحه‌ی اصلی همیشه اول از شبکه خوانده شود تا نسخه‌ی قدیمی به فایل‌های ناموجود لینک ندهد
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(res => {
        const copy = res.clone()
        caches.open(CACHE).then(cache => cache.put('./index.html', copy))
        return res
      }).catch(() => caches.match('./index.html')),
    )
    return
  }
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(hit => hit || fetch(request).then(res => {
      const copy = res.clone()
      caches.open(CACHE).then(cache => cache.put(request, copy))
      return res
    }).catch(() => caches.match('./index.html')))
  )
})
