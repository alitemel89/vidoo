import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { createVidooServer } from './server.mjs';

const exec = promisify(execFile);

test('real MP4 preview and Stripe-verified download', { timeout: 60_000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'vidoo-test-'));
  const dataDir = join(root, 'orders');
  let stripeOrder;
  let paid = false;
  let mismatched = false;
  const sessionId = 'cs_test_video';
  const server = await createVidooServer({
    dataDir,
    stripeKey: 'sk_test_fixture',
    stripeFetch: async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer sk_test_fixture');
      if (options.method === 'POST') {
        const job = options.body.get('metadata[vidoo_job]');
        assert.equal(options.headers['Idempotency-Key'], `vidoo-${job}`);
        assert.equal(options.body.get('line_items[0][price_data][unit_amount]'), '499');
        assert.match(options.body.get('success_url'), /\{CHECKOUT_SESSION_ID\}/);
        stripeOrder = job;
        return Response.json({ id: sessionId, status: 'open', url: 'https://checkout.stripe.com/mock' });
      }
      assert.ok(url.endsWith(`/${sessionId}`));
      return Response.json({
        payment_status: paid ? 'paid' : 'unpaid',
        status: paid ? 'complete' : 'open',
        mode: 'payment', currency: 'eur', amount_total: 499, livemode: false,
        metadata: { vidoo_job: mismatched ? 'other-order' : stripeOrder },
      });
    },
  });

  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const config = await fetch(base + '/api/config');
    assert.deepEqual(await config.json(), { amount: 499, checkoutAvailable: true });

    const form = new FormData();
    for (const [index, extension] of ['jpg', 'png', 'webp'].entries()) {
      const path = join(root, `photo.${extension}`);
      await exec('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i',
        `color=${['red', 'blue', 'green'][index]}:s=400x240`, '-frames:v', '1', '-threads', '1', path]);
      form.append('photos', new Blob([await readFile(path)]), `photo.${extension}`);
    }
    const rejected = await fetch(base + '/api/jobs', { method: 'POST', body: new FormData() });
    assert.equal(rejected.status, 400);
    const upload = await fetch(base + '/api/jobs', { method: 'POST', body: form });
    const job = await upload.json();
    assert.equal(upload.status, 201, job.error);
    const resource = base + '/api/jobs/' + job.id;
    const partial = await fetch(resource + '/preview', { headers: { Range: 'bytes=0-31' } });
    assert.equal(partial.status, 206);
    assert.equal((await partial.arrayBuffer()).byteLength, 32);
    const preview = await fetch(resource + '/preview');
    const previewPath = join(root, 'preview.mp4');
    await writeFile(previewPath, Buffer.from(await preview.arrayBuffer()));

    const downloadUrl = resource + '/download?session=' + sessionId;
    assert.equal((await fetch(resource + '/download')).status, 402);
    const checkout = await fetch(resource + '/checkout', { method: 'POST' });
    assert.equal(checkout.status, 200);
    assert.equal((await checkout.json()).sessionId, sessionId);
    assert.equal((await fetch(downloadUrl)).status, 402);
    paid = true;
    mismatched = true;
    assert.equal((await fetch(downloadUrl)).status, 402);
    mismatched = false;
    assert.equal((await fetch(resource + '/payment?session=' + sessionId)).status, 200);
    const download = await fetch(downloadUrl);
    assert.equal(download.status, 200);
    assert.match(download.headers.get('Content-Disposition'), /^attachment;/);
    const videoPath = join(root, 'download.mp4');
    await writeFile(videoPath, Buffer.from(await download.arrayBuffer()));
    for (const [path, width, height] of [[previewPath, 360, 640], [videoPath, 720, 1280]]) {
      const result = await exec('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', path]);
      const [stream] = JSON.parse(result.stdout).streams;
      assert.equal(stream.codec_name, 'h264');
      assert.equal(stream.width, width);
      assert.equal(stream.height, height);
      assert.equal(Number(stream.duration), 9);
    }
    assert.deepEqual((await readdir(join(dataDir, job.id))).sort(), ['order.json', 'preview.mp4', 'video.mp4']);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
