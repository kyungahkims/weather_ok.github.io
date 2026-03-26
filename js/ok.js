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

/* 공통 드래그 */
function attachDrag(col, getIdx, setIdx, redraw, snap, clamp = v => v) {
	let startY = 0,
		startIdx = 0,
		dragging = false;

	col.addEventListener('pointerdown', e => {
		startY = e.clientY;
		startIdx = getIdx();
		dragging = true;
		col.setPointerCapture(e.pointerId);
	});

	col.addEventListener('pointermove', e => {
		if (!dragging) return;
		setIdx(clamp(startIdx + (startY - e.clientY) / ITEM_H));
		redraw();
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
	}, {
		passive: false
	});
}

/* 무한 드럼 */
function buildInfiniteDrum(colId, innerId, items, initIdx, onChange) {
	const col = document.getElementById(colId);
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
			const absIdx = base - 2 + i;
			const realIdx = ((absIdx % items.length) + items.length) % items.length;
			nodes[i].textContent = items[realIdx];
		}
		renderedBase = base;
	};

	const updateClasses = () => {
		const base = Math.round(idx);
		for (let i = 0; i < VISIBLE; i++) {
			const absIdx = base - 2 + i;
			const dist = Math.abs(absIdx - idx);
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

	attachDrag(
		col,
		() => idx,
		v => (idx = v),
		redraw,
		snap
	);

	updateText();
	redraw();

	return {
		forceIdx(i) {
			idx = i;
			updateText();
			redraw();
		}
	};
}

/* 유한 드럼 */
function buildFiniteDrum(colId, innerId, items, initIdx, onChange) {
	const col = document.getElementById(colId);
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
			const dist = Math.abs(absIdx - idx);
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

	attachDrag(
		col,
		() => idx,
		v => (idx = v),
		redraw,
		snap,
		clamp
	);

	updateText();
	redraw();

	return {
		forceIdx(i) {
			idx = clamp(i);
			updateText();
			redraw();
		}
	};
}

/* 데이터 */
const hourItems = Array.from({
	length: 12
}, (_, i) => String(i + 1));
const minItems = Array.from({
	length: 60
}, (_, i) => String(i).padStart(2, '0'));
const ampmItems = ['오전', '오후'];

let ampmIdx = 0,
	hourIdx = 0,
	minIdx = 0,
	rawHour = 0;

/* 생성 */
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
