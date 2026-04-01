/* 모닝콜 */
const STEP = 67;
const REPEATS = 50;
const HOURS = Array.from({length:12}, (_,i) => String(i+1));
const MINS  = Array.from({length:60}, (_,i) => String(i).padStart(2,'0'));

function fillCol(el, items) {
  el.innerHTML = '';
  for (let r = 0; r < REPEATS; r++)
    items.forEach(v => {
      const s = document.createElement('span');
      s.textContent = v;
      el.appendChild(s);
    });
}

function scrollToIndex(el, items, idx) {
  el.scrollTop = (Math.floor(REPEATS/2) * items.length + idx) * STEP;
}

function updateActive(el) {
  const center = el.scrollTop + el.clientHeight / 2;
  el.querySelectorAll('span').forEach(s => {
    const sc = s.offsetTop + s.offsetHeight / 2;
    s.classList.toggle('active', Math.abs(center - sc) < STEP / 2);
  });
}

function snapNearest(el) {
  const center = el.scrollTop + el.clientHeight / 2;
  let bestTop = el.scrollTop, bestDiff = Infinity;
  el.querySelectorAll('span').forEach(s => {
    const sc = s.offsetTop + s.offsetHeight / 2;
    const diff = Math.abs(center - sc);
    if (diff < bestDiff) { bestDiff = diff; bestTop = s.offsetTop - (el.clientHeight/2 - s.offsetHeight/2); }
  });
  el.scrollTo({ top: bestTop, behavior: 'smooth' });
}

function bindCol(el) {
  let timer;
  el.addEventListener('scroll', () => {
    updateActive(el);
    clearTimeout(timer);
    timer = setTimeout(() => snapNearest(el), 180);
  });

  let wl = false;
  el.addEventListener('wheel', e => {
    e.preventDefault();
    if (wl) return; wl = true;
    el.scrollTop += e.deltaY > 0 ? STEP : -STEP;
    setTimeout(() => wl = false, 120);
  }, { passive: false });

  let startY = 0, startTop = 0;
  el.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    startTop = el.scrollTop;
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    el.scrollTop = startTop + (startY - e.touches[0].clientY);
  }, { passive: true });
}

const now = new Date();
const h24 = now.getHours();
const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
const isPM = h24 >= 12;

const colAmpm = document.getElementById('col-ampm');
const colHour = document.getElementById('col-hour');
const colMin  = document.getElementById('col-min');

fillCol(colHour, HOURS);
fillCol(colMin, MINS);

setTimeout(() => {
  colAmpm.scrollTo({ top: isPM ? STEP : 0, behavior: 'instant' });
  updateActive(colAmpm);
  scrollToIndex(colHour, HOURS, h12 - 1);
  updateActive(colHour);
  scrollToIndex(colMin, MINS, now.getMinutes());
  updateActive(colMin);
}, 50);

bindCol(colAmpm);
bindCol(colHour);
bindCol(colMin);

/* 요일 선택 */
document.addEventListener('DOMContentLoaded', () => {
	const buttons = document.querySelectorAll('.week_wrap button');

	buttons.forEach(btn => {
		btn.addEventListener('click', () => {
			btn.classList.toggle('active');
		});
	});
});