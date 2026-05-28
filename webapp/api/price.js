export const config = { runtime: 'edge' };

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Module-level cache — persists across warm requests on the same instance
let session = { crumb: null, cookie: '', ts: 0 };
const TTL   = 20 * 3600 * 1000; // 20 h

async function ensureSession() {
  if (session.crumb && Date.now() - session.ts < TTL) return session;

  // Step 1 — fc.yahoo.com sets the A3 session cookie
  const fcRes    = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA } });
  const setCookie = fcRes.headers.get('set-cookie') || '';
  const a3        = setCookie.match(/A3=[^;,\s]+/)?.[0] || '';
  if (!a3) throw new Error('No A3 cookie from fc.yahoo.com');

  // Step 2 — exchange for crumb
  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Cookie: a3 },
  });
  const crumb = (await crumbRes.text()).trim();

  if (!crumb || crumb.length > 60 || crumb.includes(' ') || crumb.startsWith('<'))
    throw new Error('Invalid crumb: ' + crumb.slice(0, 40));

  session = { crumb, cookie: a3, ts: Date.now() };
  return session;
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: CORS });

  const url    = new URL(req.url);
  const ticker = url.searchParams.get('ticker');
  const range  = url.searchParams.get('range') || '1d';
  const mode   = url.searchParams.get('mode') || 'price'; // price | history | profile

  if (!ticker)
    return new Response(JSON.stringify({ error: 'Missing ticker' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });

  try {
    let { crumb, cookie } = await ensureSession();

    // Profile mode: Yahoo's quoteSummary endpoint for sector/geo breakdowns.
    if (mode === 'profile') {
      const modules = 'assetProfile,summaryProfile,topHoldings,fundProfile,price';
      const profileUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;
      let pRes = await fetch(profileUrl, { headers: { 'User-Agent': UA, Cookie: cookie } });
      let pBody = await pRes.text();
      if (pBody.includes('"Unauthorized"') || pBody.includes('"Invalid Cookie"')) {
        session = { crumb: null, cookie: '', ts: 0 };
        ({ crumb, cookie } = await ensureSession());
        const retryUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;
        pRes = await fetch(retryUrl, { headers: { 'User-Agent': UA, Cookie: cookie } });
        pBody = await pRes.text();
      }
      return new Response(pBody, {
        status: pRes.ok ? 200 : 502,
        headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      });
    }

    // Pick a sensible interval for the requested range.
    const HISTORY_INTERVALS = { '1mo': '1d', '3mo': '1d', '6mo': '1d', '1y': '1d', '2y': '1wk', '5y': '1wk', '10y': '1mo', 'max': '1mo' };
    const interval = mode === 'history' ? (HISTORY_INTERVALS[range] || '1d') : '1d';
    const yfRange  = mode === 'history' ? range : '1d';
    const yfUrl    = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${yfRange}&crumb=${encodeURIComponent(crumb)}`;

    let res  = await fetch(yfUrl, { headers: { 'User-Agent': UA, Cookie: cookie } });
    let body = await res.text();

    // Crumb expired — refresh once and retry
    if (body.includes('"Unauthorized"') || body.includes('"Invalid Cookie"')) {
      session = { crumb: null, cookie: '', ts: 0 };
      ({ crumb, cookie } = await ensureSession());
      const yfUrl2 = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${yfRange}&crumb=${encodeURIComponent(crumb)}`;
      res  = await fetch(yfUrl2, { headers: { 'User-Agent': UA, Cookie: cookie } });
      body = await res.text();
    }

    if (body.includes('Too Many Requests'))
      return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { ...CORS, 'Content-Type': 'application/json' } });

    // For price mode, extract just the price (lightweight response)
    if (mode === 'price') {
      const data  = JSON.parse(body);
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      const curr  = data?.chart?.result?.[0]?.meta?.currency;
      if (!price)
        return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ price, currency: curr, ticker }), {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      });
    }

    // For history mode, return the full chart JSON
    return new Response(body, {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    });

  } catch (err) {
    session = { crumb: null, cookie: '', ts: 0 }; // Reset on error
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
}
