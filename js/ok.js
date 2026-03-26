/* 요일 선택 */
document.addEventListener('DOMContentLoaded', () => {
	const buttons = document.querySelectorAll('.week_wrap button');

	buttons.forEach(btn => {
		btn.addEventListener('click', () => {
			btn.classList.toggle('active');
		});
	});
});


/* 모닝콜 */
const ITEM_H = 63;

/* ── 공통 드래그 (관성 + 탄성 포함) ──────────────────────────
   velocity : 마지막 몇 프레임의 속도를 추적해 손을 뗄 때 관성 부여
   rubber   : 유한 드럼에서 끝 범위를 벗어나면 저항감 적용
────────────────────────────────────────────────────────────── */
function attachDrag(col, getIdx, setIdx, redraw, snap, clamp = v => v, rubber = false) {
	let startY = 0,
		startIdx = 0,
		dragging = false;

	/* 속도 추적 (최근 4샘플 평균) */
	let lastY = 0,
		lastT = 0,
		velocity = 0;
	const VEL_SAMPLES = 4;
	const velBuf = [];

	const pushVel = (y, t) => {
		if (lastT) velBuf.push((lastY - y) / (t - lastT) / ITEM_H);
		if (velBuf.length > VEL_SAMPLES) velBuf.shift();
		velocity = velBuf.reduce((a, b) => a + b, 0) / (velBuf.length || 1);
		lastY = y; lastT = t;
	};

	/* 탄성 저항: 범위 밖으로 나갈수록 점점 더 느려짐 */
	const applyRubber = v => {
		const clamped = clamp(v);
		if (!rubber || v === clamped) return v;
		const over = v - clamped;
		return clamped + over * 0.25; // 25% 만 전달
	};

	col.addEventListener('pointerdown', e => {
		startY = e.clientY;
		startIdx = getIdx();
		dragging = true;
		lastY = e.clientY; lastT = e.timeStamp;
		velBuf.length = 0; velocity = 0;
		col.setPointerCapture(e.pointerId);
		cancelMomentum();
	});

	col.addEventListener('pointermove', e => {
		if (!dragging) return;
		pushVel(e.clientY, e.timeStamp);
		const raw = startIdx + (startY - e.clientY) / ITEM_H;
		setIdx(applyRubber(raw));
		redraw();
	});

	col.addEventListener('pointerup', () => {
		if (!dragging) return;
		dragging = false;
		startMomentum(velocity);
	});

	col.addEventListener('wheel', e => {
		e.preventDefault();
		setIdx(clamp(getIdx() + (e.deltaY > 0 ? 1 : -1)));
		snap();
	}, { passive: false });

	/* ── 관성 애니메이션 ──────────────────────────────────────
	   requestAnimationFrame 루프로 속도를 감쇠시키며 흘러가다
	   속도가 충분히 줄면 snap() 호출
	────────────────────────────────────────────────────────── */
	const FRICTION   = 0.88;  // 감쇠율 (낮을수록 빨리 멈춤)
	const MIN_VEL    = 0.005; // 이 이하면 snap
	let rafId = null;

	const cancelMomentum = () => {
		if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
	};

	const startMomentum = initVel => {
		let vel = initVel;

		const tick = () => {
			vel *= FRICTION;
			const next = getIdx() + vel;
			const clamped = clamp(next);

			if (rubber) {
				/* 범위 밖이면 탄성으로 당겨오기 */
				setIdx(applyRubber(next));
			} else {
				setIdx(next);
			}
			redraw();

			/* 범위 벗어난 경우 or 속도 충분히 줄면 snap */
			const outOfBounds = rubber && (next < 0 || next > clamp(Infinity));
			if (Math.abs(vel) < MIN_VEL || outOfBounds) {
				cancelMomentum();
				snapWithAnim();
				return;
			}
			rafId = requestAnimationFrame(tick);
		};

		rafId = requestAnimationFrame(tick);
	};

	/* ── snap 애니메이션 ──────────────────────────────────────
	   현재 idx → 반올림 목표값까지 easeOut으로 부드럽게 이동
	────────────────────────────────────────────────────────── */
	const snapWithAnim = () => {
		const target = clamp(Math.round(getIdx()));
		const start  = getIdx();
		const dist   = target - start;
		if (Math.abs(dist) < 0.001) { snap(); return; }

		const DURATION = 180; // ms
		const t0 = performance.now();

		const animTick = now => {
			const p = Math.min((now - t0) / DURATION, 1);
			const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
			setIdx(start + dist * ease);
			redraw();

			if (p < 1) {
				rafId = requestAnimationFrame(animTick);
			} else {
				setIdx(target);
				snap();
			}
		};
		rafId = requestAnimationFrame(animTick);
	};

	/* 외부에서 취소 가능하도록 노출 */
	col._cancelMomentum = cancelMomentum;
}

/* ── 무한 드럼 ────────────────────────────────────────────── */
function buildInfiniteDrum(colId, innerId, items, initIdx, onChange) {
	const col   = document.getElementById(colId);
	const inner = document.getElementById(innerId);
	let idx = initIdx;

	const VISIBLE = 5;
	const nodes = [];
	for (let i = 0; i < VISIBLE; i++) {
		const div = document.createElement('div');
		div.className = 'drum-item';
		div.style.cssText = `height:${ITEM_H}px;will-change:transform;`;
		inner.appendChild(div);
		nodes.push(div);
	}

	let renderedBase = Math.round(idx);

	const updateText = () => {
		const base = Math.round(idx);
		for (let i = 0; i < VISIBLE; i++) {
			const absIdx  = base - 2 + i;
			const realIdx = ((absIdx % items.length) + items.length) % items.length;
			nodes[i].textContent = items[realIdx];
		}
		renderedBase = base;
	};

	const updateClasses = () => {
		const base = Math.round(idx);
		for (let i = 0; i < VISIBLE; i++) {
			const absIdx = base - 2 + i;
			const dist   = Math.abs(absIdx - idx);
			nodes[i].className = 'drum-item' +
				(dist < 0.5 ? ' selected' : dist < 1.5 ? ' near' : '');
		}
	};

	const redraw = () => {
		const base = Math.round(idx);
		if (base !== renderedBase) updateText();
		updateClasses();
		const offset = -ITEM_H - (idx - base) * ITEM_H;
		inner.style.transform = `translateY(${offset}px)`;
	};

	const snap = () => {
		idx = Math.round(idx);
		const real = ((idx % items.length) + items.length) % items.length;
		updateText();
		updateClasses();
		inner.style.transform = `translateY(${-ITEM_H}px)`;
		onChange(real, idx);
	};

	attachDrag(col, () => idx, v => (idx = v), redraw, snap);

	updateText();
	redraw();

	return {
		forceIdx(i) {
			if (col._cancelMomentum) col._cancelMomentum();
			idx = i;
			updateText();
			redraw();
		}
	};
}

/* ── 유한 드럼 (탄성 활성화) ──────────────────────────────── */
function buildFiniteDrum(colId, innerId, items, initIdx, onChange) {
	const col   = document.getElementById(colId);
	const inner = document.getElementById(innerId);
	let idx = initIdx;

	const clamp = v => Math.max(0, Math.min(items.length - 1, v));

	const VISIBLE = 5;
	const nodes = [];
	for (let i = 0; i < VISIBLE; i++) {
		const div = document.createElement('div');
		div.className = 'drum-item';
		div.style.cssText = `height:${ITEM_H}px;will-change:transform;`;
		inner.appendChild(div);
		nodes.push(div);
	}

	let renderedBase = Math.round(clamp(idx));

	const updateText = () => {
		const base = Math.round(clamp(idx));
		for (let i = 0; i < VISIBLE; i++) {
			const absIdx = base - 2 + i;
			nodes[i].textContent = (absIdx >= 0 && absIdx < items.length) ? items[absIdx] : '';
		}
		renderedBase = base;
	};

	const updateClasses = () => {
		const base = Math.round(clamp(idx));
		for (let i = 0; i < VISIBLE; i++) {
			const absIdx = base - 2 + i;
			const dist   = Math.abs(absIdx - idx);
			nodes[i].className = 'drum-item' +
				(dist < 0.5 ? ' selected' : dist < 1.5 ? ' near' : '');
		}
	};

	const redraw = () => {
		const base = Math.round(clamp(idx));
		if (base !== renderedBase) updateText();
		updateClasses();
		const offset = -ITEM_H - (idx - base) * ITEM_H;
		inner.style.transform = `translateY(${offset}px)`;
	};

	const snap = () => {
		idx = clamp(Math.round(idx));
		updateText();
		updateClasses();
		inner.style.transform = `translateY(${-ITEM_H}px)`;
		onChange(idx);
	};

	/* rubber=true 로 탄성 활성화 */
	attachDrag(col, () => idx, v => (idx = v), redraw, snap, clamp, true);

	updateText();
	redraw();

	return {
		forceIdx(i) {
			if (col._cancelMomentum) col._cancelMomentum();
			idx = clamp(i);
			updateText();
			redraw();
		}
	};
}

/* ── 데이터 ────────────────────────────────────────────────── */
const hourItems = Array.from({ length: 12 }, (_, i) => String(i + 1));
const minItems  = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const ampmItems = ['오전', '오후'];

let ampmIdx = 0,
	hourIdx  = 0,
	minIdx   = 0,
	rawHour  = 0;

/* ── 생성 ──────────────────────────────────────────────────── */
const ampmDrum = buildFiniteDrum('drum-ampm', 'inner-ampm', ampmItems, ampmIdx, i => {
	ampmIdx = i;
});

const initCycle = Math.floor(rawHour / 12);
const initAmpm  = ampmIdx;

buildInfiniteDrum('drum-hour', 'inner-hour', hourItems, hourIdx, (real, raw) => {
	rawHour = raw;
	hourIdx = real;

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

