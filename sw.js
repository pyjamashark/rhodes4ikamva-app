/* Simple offline-first service worker. Bump CACHE when files change. */
var CACHE = "r4i-v7";
var ASSETS = [
  "./",
  "index.html",
  "css/styles.css",
  "js/data.js",
  "js/engine.js",
  "js/app.js",
  "manifest.webmanifest",
  "assets/favicon.svg"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        // cache same-origin GETs as we go
        try {
          var copy = res.clone();
          if (new URL(e.request.url).origin === self.location.origin) {
            caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
          }
        } catch (err) {}
        return res;
      }).catch(function () {
        // navigation fallback when offline
        if (e.request.mode === "navigate") return caches.match("index.html");
      });
    })
  );
});
