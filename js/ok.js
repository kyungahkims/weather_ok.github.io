/* 요일 선택 */
document.addEventListener('DOMContentLoaded', () => {
	const buttons = document.querySelectorAll('.week_wrap button');

	buttons.forEach(btn => {
		btn.addEventListener('click', () => {
			btn.classList.toggle('active');
		});
	});
});


const ITEM_H = 63;

/* ── 드래그 attach ── */
function attachDrag(col, getIdx, setIdx, redraw, snap, clamp = v => v) {
  let startY = 0, startIdx = 0, dragging = false;

  col.addEventListener('pointerdown', e => {
    startY    = e.clientY;
    startIdx  = getIdx();
    dragging  = true;
    col.setPointerCapture(e.pointerId);
  });

  col.addEventListener('pointermove', e => {
    if (!dragging) return;
    setIdx(clamp(startIdx + (startY - e.clientY) / ITEM_H));
    redraw(false);
  });

  col.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    snap();
  });

  col.addEventListener('wheel', e => {
    e.preventDefault();
    setIdx(clamp(getIdx() + (e.deltaY > 0 ? 1 : -1)));
    snap();
  }, { passive: false });
}

/* ── 무한 드럼 ── */
function buildInfiniteDrum(colId, innerId, items, initIdx, onChange) {
  const col   = document.getElementById(colId);
  const inner = document.getElementById(innerId);
  let idx          = initIdx;
  let renderedBase = null;

  const buildDOM = (base) => {
    inner.innerHTML = '';
    renderedBase = base;
    for (let i = base - 2; i <= base + 2; i++) {
      const realIdx = ((i % items.length) + items.length) % items.length;
      const div = document.createElement('div');
      div.className = 'drum-item';
      div.style.height = ITEM_H + 'px';
      div.textContent = items[realIdx];
      inner.appendChild(div);
    }
  };

  const updateSelected = () => {
    const ch   = inner.children;
    const base = renderedBase;
    for (let i = 0; i < ch.length; i++) {
      const dist = Math.abs((base - 2 + i) - idx);
      ch[i].className =
        'drum-item' +
        (dist < 0.5 ? ' selected' : dist < 1.5 ? ' near' : '');
    }
  };

  const applyTranslate = (animated) => {
    const ty = -ITEM_H * 2 + (renderedBase - idx) * ITEM_H;
    if (animated) {
      inner.style.transition = 'transform 0.18s cubic-bezier(0.22,1,0.36,1)';
      // 다음 프레임 후 transition 제거
      const onEnd = () => {
        inner.style.transition = '';
        inner.removeEventListener('transitionend', onEnd);
      };
      inner.addEventListener('transitionend', onEnd);
    } else {
      inner.style.transition = '';
    }
    inner.style.transform = `translateY(${ty}px)`;
  };

  const redraw = (full = true) => {
    const base = Math.round(idx);
    if (full || renderedBase === null || Math.abs(base - renderedBase) >= 2) {
      buildDOM(base);
    }
    applyTranslate(false);
    updateSelected();
  };

  const snap = () => {
    idx = Math.round(idx);
    const real = ((idx % items.length) + items.length) % items.length;
    buildDOM(idx);
    applyTranslate(true);
    updateSelected();
    onChange(real, idx);
  };

  attachDrag(col, () => idx, v => (idx = v), redraw, snap);

  // 초기화
  buildDOM(Math.round(idx));
  inner.style.transform = `translateY(${-ITEM_H * 2}px)`;
  updateSelected();

  return {
    forceIdx(i) {
      idx = i;
      buildDOM(Math.round(idx));
      applyTranslate(true);
      updateSelected();
    }
  };
}

/* ── 유한 드럼 ── */
function buildFiniteDrum(colId, innerId, items, initIdx, onChange) {
  const col   = document.getElementById(colId);
  const inner = document.getElementById(innerId);
  let idx          = initIdx;
  let renderedBase = null;

  const clamp = v => Math.max(0, Math.min(items.length - 1, v));

  // 전체 아이템을 한 번만 렌더, 빈칸 없이
  const buildDOM = (base) => {
    inner.innerHTML = '';
    renderedBase = base;
    for (let i = 0; i < items.length; i++) {
      const div = document.createElement('div');
      div.className = 'drum-item';
      div.style.height = ITEM_H + 'px';
      div.textContent = items[i];
      inner.appendChild(div);
    }
  };

  const updateSelected = () => {
    const ch = inner.children;
    for (let i = 0; i < ch.length; i++) {
      const dist = Math.abs(i - idx);
      ch[i].className =
        'drum-item' +
        (dist < 0.5 ? ' selected' : dist < 1.5 ? ' near' : '');
    }
  };

  // 전체 아이템 렌더 방식: idx번 아이템이 뷰포트 중앙에 오도록
  // col 높이 189 = 3*ITEM_H → 중앙 y = ITEM_H
  // inner top offset = ITEM_H - idx * ITEM_H
  const applyTranslate = (animated) => {
    const ty = ITEM_H - idx * ITEM_H;
    if (animated) {
      inner.style.transition = 'transform 0.18s cubic-bezier(0.22,1,0.36,1)';
      const onEnd = () => {
        inner.style.transition = '';
        inner.removeEventListener('transitionend', onEnd);
      };
      inner.addEventListener('transitionend', onEnd);
    } else {
      inner.style.transition = '';
    }
    inner.style.transform = `translateY(${ty}px)`;
  };

  const redraw = (full = true) => {
    if (full || renderedBase === null) buildDOM(clamp(Math.round(idx)));
    applyTranslate(false);
    updateSelected();
  };

  const snap = () => {
    idx = clamp(Math.round(idx));
    applyTranslate(true);
    updateSelected();
    onChange(idx);
  };

  attachDrag(col, () => idx, v => (idx = clamp(v)), redraw, snap, clamp);

  // 초기화
  buildDOM(clamp(Math.round(idx)));
  applyTranslate(false);
  updateSelected();

  return {
    forceIdx(i) {
      idx = clamp(i);
      applyTranslate(true);
      updateSelected();
    }
  };
}

/* ── 데이터 ── */
const hourItems = Array.from({ length: 12 }, (_, i) => String(i + 1));
const minItems  = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const ampmItems = ['오전', '오후'];

let ampmIdx = 0, hourIdx = 0, minIdx = 0, rawHour = 0;

/* ── 생성 ── */
const ampmDrum = buildFiniteDrum('drum-ampm', 'inner-ampm', ampmItems, ampmIdx, i => {
  ampmIdx = i;
});

const initCycle = 0;
const initAmpm  = ampmIdx;

buildInfiniteDrum('drum-hour', 'inner-hour', hourItems, hourIdx, (real, raw) => {
  rawHour  = raw;
  hourIdx  = real;

  const cycleDiff = Math.floor(raw / 12) - initCycle;
  const newAmpm   = (((initAmpm + cycleDiff) % 2) + 2) % 2;

  if (newAmpm !== ampmIdx) {
    ampmIdx = newAmpm;
    ampmDrum.forceIdx(ampmIdx);
  }
});

buildInfiniteDrum('drum-min', 'inner-min', minItems, minIdx, i => {
  minIdx = i;
});