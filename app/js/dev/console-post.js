// Console bridge for shells without DevTools (webdroid's GeckoView prints nothing of the
// page's console). With ?console=post, every console.log / info / warn / error and every
// uncaught error is also POSTed, one line at a time, to /__console on the page's own server.
// webdroid's LocalSiteServer writes them to logcat under the tag WebDroidConsole.
// Without the switch this file does nothing. Classic script, loaded first, so it sees start-up.
(function () {
  if (new URLSearchParams(location.search).get('console') !== 'post') return;
  const url = '/__console';
  const send = (level, args) => {
    let text;
    try {
      text = args.map((a) => {
        if (a instanceof Error) return `${a.name}: ${a.message}`;
        if (typeof a === 'object') { try { return JSON.stringify(a); } catch (_) { return String(a); } }
        return String(a);
      }).join(' ');
    } catch (_) { text = '(unprintable)'; }
    try { fetch(url, { method: 'POST', body: `${level} ${text}`.slice(0, 4000), keepalive: true }).catch(() => {}); } catch (_) {}
  };
  for (const level of ['log', 'info', 'warn', 'error']) {
    const orig = console[level].bind(console);
    console[level] = (...args) => { orig(...args); send(level, args); };
  }
  addEventListener('error', (e) => send('uncaught', [e.message, `${e.filename}:${e.lineno}`]));
  addEventListener('unhandledrejection', (e) => send('unhandled', [e.reason]));
  send('info', ['[console-post] on', location.href, navigator.userAgent]);
})();
