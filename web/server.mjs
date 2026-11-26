import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { renderVideos } from './render.mjs';

const publicDir = fileURLToPath(new URL('./dist/browser/', import.meta.url));
const maxPhotoBytes = 8 * 1024 * 1024;
const maxBodyBytes = 5 * maxPhotoBytes + 64 * 1024;
const hour = 60 * 60 * 1000;
const lifetime = 7 * 24 * hour;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

async function photos(request) {
  const contentType = request.headers['content-type'] ?? '';
  if (!contentType.startsWith('multipart/form-data;')) {
    throw new HttpError(415, 'Fotoğrafları dosya olarak yükleyin.');
  }
  if (Number(request.headers['content-length']) > maxBodyBytes) {
    request.resume();
    throw new HttpError(413, 'Yükleme boyutu çok büyük.');
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      request.resume();
      throw new HttpError(413, 'Yükleme boyutu çok büyük.');
    }
    chunks.push(chunk);
  }

  let form;
  try {
    form = await new Response(Buffer.concat(chunks), {
      headers: { 'Content-Type': contentType },
    }).formData();
  } catch {
    throw new HttpError(400, 'Yükleme okunamadı.');
  }
  const files = form.getAll('photos');
  if (files.length < 3 || files.length > 5) {
    throw new HttpError(400, '3–5 fotoğraf yükleyin.');
  }

  return Promise.all(files.map(async file => {
    if (!(file instanceof File) || !file.size || file.size > maxPhotoBytes) {
      throw new HttpError(400, 'Her fotoğraf en fazla 8 MB olmalı.');
    }
    const data = Buffer.from(await file.arrayBuffer());
    if (data.subarray(0, 3).toString('hex') === 'ffd8ff') {
      return { data, extension: 'jpg', decoder: 'mjpeg' };
    }
    if (data.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
      return { data, extension: 'png', decoder: 'png' };
    }
    if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
      return { data, extension: 'webp', decoder: 'webp' };
    }
    throw new HttpError(400, 'JPG, PNG veya WebP fotoğraf yükleyin.');
  }));
}

async function streamVideo(request, response, filename, download = false) {
  const { size } = await stat(filename);
  const headers = { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' };
  if (download) headers['Content-Disposition'] = 'attachment; filename="vidoo-arac-ilani.mp4"';
  const range = request.headers.range;
  let start = 0;
  let end = size - 1;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match && (match[1] || match[2])) {
      if (match[1]) {
        start = Number(match[1]);
        if (match[2]) end = Math.min(Number(match[2]), end);
      } else {
        start = Math.max(0, size - Number(match[2]));
      }
    }
    if (!match || (!match[1] && !match[2]) || start > end) {
      response.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
      return;
    }
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  }
  headers['Content-Length'] = end - start + 1;
  response.writeHead(range ? 206 : 200, headers);
  await pipeline(createReadStream(filename, { start, end }), response);
}

export async function createVidooServer({
  dataDir = resolve(process.env.VIDOO_DATA_DIR ?? 'vidoo-data'),
  baseUrl = process.env.VIDOO_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:3000',
  stripeKey = process.env.STRIPE_SECRET_KEY,
  amount = Number(process.env.VIDOO_PRICE_CENTS ?? 499),
  stripeFetch = fetch,
} = {}) {
  const origin = new URL(baseUrl).origin;
  if (!Number.isSafeInteger(amount) || amount < 50 || amount > 99999999) {
    throw new Error('VIDOO_PRICE_CENTS must be an integer between 50 and 99999999');
  }
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  let rendering = 0;

  async function stripe(path, options = {}) {
    if (!stripeKey) throw new HttpError(503, 'Ödeme şu anda kullanılamıyor.');
    try {
      const result = await stripeFetch(`https://api.stripe.com/v1/checkout/sessions${path}`, {
        ...options,
        headers: { Authorization: `Bearer ${stripeKey}`, ...options.headers },
        signal: AbortSignal.timeout(12_000),
      });
      if (!result.ok) throw new Error(`Stripe HTTP ${result.status}`);
      return await result.json();
    } catch (error) {
      console.error(error.message);
      throw new HttpError(502, 'Ödeme hizmetine ulaşılamadı. Tekrar deneyin.');
    }
  }

  async function sweep() {
    for (const entry of await readdir(dataDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^[a-f0-9]{48}(\.work)?$/.test(entry.name)) continue;
      const directory = resolve(dataDir, entry.name);
      const info = await stat(directory).catch(() => null);
      if (info && Date.now() - info.birthtimeMs > lifetime) {
        await rm(directory, { recursive: true, force: true });
      }
    }
  }
  await sweep();
  const cleanup = setInterval(() => sweep().catch(console.error), hour);
  cleanup.unref();

  const server = createServer({ requestTimeout: 60_000 }, async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const url = new URL(request.url, origin);
      const method = request.method;
      if (method === 'GET' && (url.pathname === '/' || /^\/[a-zA-Z0-9_-]+\.(js|css)$/.test(url.pathname))) {
        const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        const type = file.endsWith('.css') ? 'text/css' :
          file.endsWith('.js') ? 'text/javascript' : 'text/html';
        const content = await readFile(resolve(publicDir, file)).catch(error => {
          if (error.code !== 'ENOENT') throw error;
          if (file === 'index.html') throw new HttpError(503, 'Web arayüzü hazırlanmadı. Önce npm run build çalıştırın.');
          throw new HttpError(404, 'Dosya bulunamadı.');
        });
        response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }).end(content);
        return;
      }
      if (method === 'GET' && url.pathname === '/api/config') {
        return json(response, 200, { amount, checkoutAvailable: Boolean(stripeKey) });
      }
      if (method === 'POST' && request.headers.origin && request.headers.origin !== origin) {
        throw new HttpError(403, 'Bu istek kabul edilmedi.');
      }
      if (method === 'POST' && url.pathname === '/api/jobs') {
        if (rendering >= 2) {
          request.resume();
          throw new HttpError(503, 'Video oluşturucu meşgul. Biraz sonra tekrar deneyin.');
        }
        rendering++;
        const id = randomBytes(24).toString('hex');
        const work = resolve(dataDir, `${id}.work`);
        try {
          const images = await photos(request);
          await mkdir(work, { mode: 0o700 });
          try {
            await renderVideos(work, images);
          } catch (error) {
            console.error('Render:', error.message.slice(-1200));
            if (error.code === 'ENOENT') throw error;
            throw new HttpError(422, 'Video oluşturulamadı. Fotoğrafları veya boyutlarını değiştirip tekrar deneyin.');
          }
          for (const name of await readdir(work)) {
            if (name !== 'video.mp4' && name !== 'preview.mp4') await rm(resolve(work, name));
          }
          await writeFile(resolve(work, 'order.json'), JSON.stringify({ amount, created: Date.now() }));
          await rename(work, resolve(dataDir, id));
          return json(response, 201, { id, amount, checkoutAvailable: Boolean(stripeKey) });
        } finally {
          rendering--;
          await rm(work, { recursive: true, force: true }).catch(console.error);
        }
      }

      const route = /^\/api\/jobs\/([a-f0-9]{48})\/(details|preview|checkout|payment|download)$/.exec(url.pathname);
      if (!route) throw new HttpError(404, 'Sayfa bulunamadı.');
      const [, id, action] = route;
      const directory = resolve(dataDir, id);
      const rawOrder = await readFile(resolve(directory, 'order.json'), 'utf8').catch(error => {
        if (error.code !== 'ENOENT') throw error;
        return null;
      });
      const order = rawOrder && JSON.parse(rawOrder);
      if (!order || Date.now() - order.created >= lifetime) {
        throw new HttpError(404, 'Video bulunamadı veya indirme süresi doldu.');
      }
      if (method === 'GET' && action === 'details') {
        return json(response, 200, { id, amount: order.amount });
      }
      if (method === 'GET' && action === 'preview') {
        return await streamVideo(request, response, resolve(directory, 'preview.mp4'));
      }
      if (method === 'POST' && action === 'checkout') {
        if (Date.now() - order.created >= hour) {
          throw new HttpError(410, 'Ödeme süresi doldu. Yeni bir önizleme oluşturun.');
        }
        const session = await stripe('', {
          method: 'POST',
          headers: { 'Idempotency-Key': `vidoo-${id}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            mode: 'payment',
            'payment_method_types[0]': 'card',
            'line_items[0][quantity]': '1',
            'line_items[0][price_data][currency]': 'eur',
            'line_items[0][price_data][unit_amount]': String(order.amount),
            'line_items[0][price_data][product_data][name]': 'Vidoo – Araç ilan videosu',
            'metadata[vidoo_job]': id,
            success_url: `${origin}/?job=${id}&session={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/?job=${id}&cancelled=1`,
          }),
        });
        if (session.status !== 'open' || !session.url) {
          throw new HttpError(409, 'Ödeme oturumu kapandı. Ödeme sonrası açılan indirme sayfasını kullanın.');
        }
        return json(response, 200, { url: session.url, sessionId: session.id });
      }

      if (method === 'GET' && (action === 'payment' || action === 'download')) {
        const sessionId = url.searchParams.get('session') ?? '';
        if (!/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)) {
          throw new HttpError(402, 'Videoyu indirmek için ödeme gerekli.');
        }
        const session = await stripe(`/${sessionId}`);
        if (session.payment_status !== 'paid' || session.status !== 'complete' ||
            session.mode !== 'payment' || session.currency !== 'eur' ||
            session.amount_total !== order.amount || session.metadata?.vidoo_job !== id ||
            session.livemode !== /^(sk|rk)_live_/.test(stripeKey)) {
          throw new HttpError(402, 'Bu video için ödeme doğrulanamadı.');
        }
        if (action === 'payment') return json(response, 200, { paid: true });
        return await streamVideo(request, response, resolve(directory, 'video.mp4'), true);
      }
      throw new HttpError(405, 'Bu işlem desteklenmiyor.');
    } catch (error) {
      if (response.headersSent || response.destroyed) return;
      if (!(error instanceof HttpError)) console.error(error);
      json(response, error.status ?? 500, {
        error: error.status ? error.message : 'Bir sorun oluştu. Tekrar deneyin.',
      });
    }
  });
  server.on('close', () => clearInterval(cleanup));
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  const server = await createVidooServer();
  server.listen(port, () => console.log(`Vidoo listening on port ${port}`));
}
