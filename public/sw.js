const CACHE = 'nab-v8'
const SHELL = ['./', './index.html', './manifest.webmanifest']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  if (!request.url.startsWith('http')) return
  const url = new URL(request.url)
  // External APIs (including GitHub release checks) must go to the network;
  // never serve a stale release check or the local app shell for a third-party URL.
  if (url.origin !== self.location.origin) return
  // Authenticated API responses can contain sensitive records. Never put them
  // in the offline shell cache, even when the URL has a query-string action.
  if (url.pathname.endsWith('/api.php')) return

  // صفحه‌ی اصلی همیشه اول از شبکه خوانده شود تا نسخه‌ی قدیمی به فایل‌های ناموجود لینک ندهد
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone()
          caches.open(CACHE).then(cache => cache.put('./index.html', copy))
        }
        return res
      }).catch(() => caches.match('./index.html')),
    )
    return
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(hit => hit || fetch(request).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone()
        caches.open(CACHE).then(cache => cache.put(request, copy))
      }
      return res
    }).catch(() => caches.match('./index.html')))
  )
})
