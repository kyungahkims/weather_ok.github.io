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

function attachDrag(col, getIdx, setIdx, redraw, snap, clamp = v => v) {
	let startY = 0, startIdx = 0, dragging = false;
	let lastY = 0, lastTime = 0, velocity = 0;
	let rafId = null;

	const cancelMomentum = () => {
		if (rafId) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	};

	const runMomentum = () => {
		cancelMomentum();
		const snapDir = velocity > 0 ? Math.ceil : Math.floor;
		let vel = velocity / ITEM_H; // index/frame 기준 속도
		const friction = 0.96;
		const minVel = 0.001;

		const step = () => {
			vel *= friction;
			if (Math.abs(vel) < minVel) {
				setIdx(clamp(snapDir(getIdx())));
				snap(snapDir);
				return;
			}
			setIdx(clamp(getIdx() + vel));
			redraw(false);
			rafId = requestAnimationFrame(step);
		};
		rafId = requestAnimationFrame(step);
	};

	col.addEventListener('pointerdown', e => {
		cancelMomentum();
		startY = e.clientY;
		lastY = e.clientY;
		lastTime = e.timeStamp;
		startIdx = getIdx();
		velocity = 0;
		dragging = true;
		col.setPointerCapture(e.pointerId);
	});

	col.addEventListener('pointermove', e => {
		if (!dragging) return;
		const dt = e.timeStamp - lastTime;
		if (dt > 0) velocity = (lastY - e.clientY) / dt * 16; // px/frame 기준
		lastY = e.clientY;
		lastTime = e.timeStamp;
		setIdx(clamp(startIdx + (startY - e.clientY) / ITEM_H));
		redraw(false);
	});

	col.addEventListener('pointerup', () => {
		if (!dragging) return;
		dragging = false;
		if (Math.abs(velocity) > 0.3) runMomentum();
		else snap(Math.round);
	});

	col.addEventListener('wheel', e => {
		e.preventDefault();
		cancelMomentum();
		setIdx(clamp(getIdx() + (e.deltaY > 0 ? 1 : -1)));
		snap(Math.round);
	}, { passive: false });
}

function buildInfiniteDrum(colId, innerId, items, initIdx, onChange) {
	const col = document.getElementById(colId);
	const inner = document.getElementById(innerId);
	let idx = initIdx;
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
		const ch = inner.children;
		const base = renderedBase;
		for (let i = 0; i < ch.length; i++) {
			const dist = Math.abs((base - 2 + i) - idx);
			ch[i].className =
				'drum-item' +
				(dist < 0.5 ? ' selected' : dist < 1.5 ? ' near' : '');
		}
	};

	const applyTranslate = (animated) => {
		const ty = -ITEM_H + (renderedBase - idx) * ITEM_H;
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
		const base = Math.round(idx);
		if (full || renderedBase === null || Math.abs(base - renderedBase) >= 2) {
			buildDOM(base);
		}
		applyTranslate(false);
		updateSelected();
	};

	const snap = (roundFn = Math.round) => {
		idx = roundFn(idx);
		const real = ((idx % items.length) + items.length) % items.length;
		buildDOM(idx);
		applyTranslate(true);
		updateSelected();
		onChange(real, idx);
	};

	attachDrag(col, () => idx, v => (idx = v), redraw, snap);
	buildDOM(Math.round(idx));
	applyTranslate(false);
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

function buildFiniteDrum(colId, innerId, items, initIdx, onChange) {
	const col = document.getElementById(colId);
	const inner = document.getElementById(innerId);
	let idx = initIdx;
	let renderedBase = null;
	const clamp = v => Math.max(0, Math.min(items.length - 1, v));

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

	const snap = (roundFn = Math.round) => {
		idx = clamp(roundFn(idx));
		applyTranslate(true);
		updateSelected();
		onChange(idx);
	};

	attachDrag(col, () => idx, v => (idx = clamp(v)), redraw, snap, clamp);
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

const hourItems = ['12', ...Array.from({
	length: 11
}, (_, i) => String(i + 1))];
const minItems = Array.from({
	length: 60
}, (_, i) => String(i).padStart(2, '0'));
const ampmItems = ['오전', '오후'];

const now = new Date();
const nowHour = now.getHours();
const nowMin = now.getMinutes();
let ampmIdx = nowHour < 12 ? 0 : 1;
const h12 = nowHour % 12;
let hourIdx = h12;
let minIdx = nowMin;
let ampmDrum;

ampmDrum = buildFiniteDrum('drum-ampm', 'inner-ampm', ampmItems, ampmIdx, i => {
	ampmIdx = i;
});

const initRawHour = ampmIdx * 12 + hourIdx;

buildInfiniteDrum('drum-hour', 'inner-hour', hourItems, initRawHour, (real, raw) => {
	hourIdx = real;
	const cycle = Math.floor(raw / 12);
	const newAmpm = ((cycle % 2) + 2) % 2;
	if (newAmpm !== ampmIdx) {
		ampmIdx = newAmpm;
		ampmDrum.forceIdx(ampmIdx);
	}
});

buildInfiniteDrum('drum-min', 'inner-min', minItems, minIdx, i => {
	minIdx = i;
});
