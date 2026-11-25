const element = id => document.getElementById(id);
const input = element('files');
const create = element('create');
const buy = element('buy');
const video = element('video');
const download = element('download');
const uploadStatus = element('upload-status');
const paymentStatus = element('payment-status');
const drop = element('drop');
const list = element('photos');
const price = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR' });

let photos = [];
let busy = false;
let job;
let config = {};
let settled = false;
let checkingOut = false;

async function api(path, options) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error), { status: response.status });
  return data;
}

function remember(order) {
  try { localStorage.setItem('vidoo-order', JSON.stringify(order)); } catch {}
}

function savedOrder() {
  try { return JSON.parse(localStorage.getItem('vidoo-order')); } catch { return null; }
}

function renderPhotos() {
  list.replaceChildren();
  for (const [index, photo] of photos.entries()) {
    const row = document.createElement('li');
    const image = document.createElement('img');
    image.src = photo.url;
    image.alt = '';
    const name = document.createElement('span');
    name.textContent = photo.file.name;
    const controls = document.createElement('div');
    controls.className = 'photo-actions';
    for (const [icon, label, disabled, action] of [
      ['↑', 'Yukarı taşı', index === 0, () => move(index, index - 1)],
      ['↓', 'Aşağı taşı', index === photos.length - 1, () => move(index, index + 1)],
      ['×', 'Kaldır', false, () => {
        URL.revokeObjectURL(photo.url);
        photos.splice(index, 1);
      }],
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = icon;
      button.setAttribute('aria-label', `${photo.file.name} – ${label}`);
      button.disabled = busy || disabled;
      button.addEventListener('click', () => {
        action();
        renderPhotos();
        list.children[Math.min(index, photos.length - 1)]?.querySelector('button:not(:disabled)')?.focus();
      });
      controls.append(button);
    }
    row.append(image, name, controls);
    list.append(row);
  }
  input.disabled = busy;
  create.disabled = busy || checkingOut || photos.length < 3;
  element('count').textContent = `${photos.length} / 5 fotoğraf`;
}

function move(index, next) {
  [photos[index], photos[next]] = [photos[next], photos[index]];
}

function add(files) {
  if (busy) return;
  uploadStatus.textContent = '';
  if (photos.length + files.length > 5) {
    uploadStatus.textContent = 'En fazla 5 fotoğraf seçebilirsiniz.';
    return;
  }
  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        !file.size || file.size > 8 * 1024 * 1024) {
      uploadStatus.textContent = 'Her fotoğraf JPG, PNG veya WebP biçiminde ve en fazla 8 MB olmalı.';
      return;
    }
  }
  photos.push(...Array.from(files, file => ({ file, url: URL.createObjectURL(file) })));
  renderPhotos();
}

function refreshPayment() {
  const amount = job?.amount ?? config.amount;
  element('price').textContent = Number.isInteger(amount) ? price.format(amount / 100) : '—';
  buy.disabled = !job || !config.checkoutAvailable || checkingOut || busy;
}

function showJob(order) {
  job = order;
  settled = false;
  video.src = `/api/jobs/${job.id}/preview`;
  video.hidden = false;
  element('placeholder').hidden = true;
  download.hidden = true;
  buy.hidden = false;
  paymentStatus.textContent = config.checkoutAvailable ? '' : 'Ödeme şu anda kullanılamıyor.';
  refreshPayment();
}

async function checkPayment() {
  const current = job;
  if (!current.sessionId) return;
  const query = new URLSearchParams({ session: current.sessionId });
  try {
    await api(`/api/jobs/${current.id}/payment?${query}`);
    if (job !== current) return;
    download.href = `/api/jobs/${current.id}/download?${query}`;
    download.hidden = false;
    buy.hidden = true;
    settled = true;
    paymentStatus.textContent = 'Ödeme onaylandı. Videoyu önizlemeyi oluşturduğunuz tarihten itibaren 7 gün içinde indirebilirsiniz.';
  } catch (error) {
    if (job !== current) return;
    paymentStatus.textContent = error.message;
    if (error.status !== 402 && error.status !== 404) {
      const retry = document.createElement('button');
      retry.textContent = 'Ödemeyi tekrar kontrol et';
      retry.addEventListener('click', checkPayment, { once: true });
      paymentStatus.append(' ', retry);
    }
  }
}

input.addEventListener('change', () => {
  add(input.files);
  input.value = '';
});
drop.addEventListener('dragover', event => {
  event.preventDefault();
  if (!busy) drop.classList.add('dragging');
});
drop.addEventListener('dragleave', () => drop.classList.remove('dragging'));
drop.addEventListener('drop', event => {
  event.preventDefault();
  drop.classList.remove('dragging');
  add(event.dataTransfer.files);
});

create.addEventListener('click', async () => {
  busy = true;
  renderPhotos();
  refreshPayment();
  uploadStatus.textContent = 'Fotoğraflar yükleniyor ve video hazırlanıyor…';
  try {
    const body = new FormData();
    for (const photo of photos) body.append('photos', photo.file);
    const data = await api('/api/jobs', { method: 'POST', body });
    config.checkoutAvailable = data.checkoutAvailable;
    const order = { id: data.id, amount: data.amount };
    remember(order);
    history.replaceState(null, '', `/?job=${order.id}`);
    showJob(order);
    uploadStatus.textContent = 'Önizleme hazır.';
    video.scrollIntoView({ block: 'nearest' });
  } catch (error) {
    uploadStatus.textContent = error.message;
  } finally {
    busy = false;
    renderPhotos();
    refreshPayment();
  }
});

buy.addEventListener('click', async () => {
  checkingOut = true;
  renderPhotos();
  refreshPayment();
  paymentStatus.textContent = 'Stripe ödeme sayfası açılıyor…';
  try {
    const data = await api(`/api/jobs/${job.id}/checkout`, { method: 'POST' });
    job.sessionId = data.sessionId;
    remember(job);
    location.assign(data.url);
  } catch (error) {
    paymentStatus.textContent = error.message;
    if (error.status === 409 && job.sessionId) await checkPayment();
  } finally {
    checkingOut = false;
    renderPhotos();
    refreshPayment();
  }
});

video.addEventListener('error', () => {
  if (!settled) paymentStatus.textContent = 'Önizleme açılamadı. Yeni bir video oluşturabilirsiniz.';
});

try {
  config = await api('/api/config');
} catch {
  paymentStatus.textContent = 'Ödeme ayarları yüklenemedi.';
}
refreshPayment();
const params = new URLSearchParams(location.search);
const cached = savedOrder();
const id = params.get('job') ?? cached?.id;
if (/^[a-f0-9]{48}$/.test(id ?? '')) {
  try {
    const order = await api(`/api/jobs/${id}/details`);
    order.sessionId = params.get('session') ?? (cached?.id === id ? cached.sessionId : undefined);
    remember(order);
    showJob(order);
    if (params.has('cancelled')) {
      paymentStatus.textContent = 'Ödeme iptal edildi. Hazır olduğunuzda tekrar deneyebilirsiniz.';
    } else {
      await checkPayment();
    }
  } catch (error) {
    paymentStatus.textContent = error.message;
  }
}
