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
	let startY = 0,
		startIdx = 0,
		dragging = false;
	let lastY = 0,
		lastTime = 0,
		velocity = 0;
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
		let vel = velocity / ITEM_H;

		const friction = 0.93;
		const minVel = 0.002;

		const step = () => {
			vel *= friction;

			if (Math.abs(vel) < minVel) {
				const target = Math.round(getIdx());
				const diff = target - getIdx();

				if (Math.abs(diff) < 0.01) {
					setIdx(clamp(target));
					snap(Math.round, true)
					return;
				}

				setIdx(getIdx() + diff * 0.2);
			} else {
				setIdx(clamp(getIdx() + vel));
			}

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
		if (dt > 0) velocity = (lastY - e.clientY) / dt * 16;
		lastY = e.clientY;
		lastTime = e.timeStamp;
		setIdx(clamp(startIdx + (startY - e.clientY) / ITEM_H));
		redraw(false);
	});

	col.addEventListener('pointerup', () => {
		if (!dragging) return;
		dragging = false;
		if (Math.abs(velocity) > 0.3) runMomentum();
		else snap(Math.round, true);
	});

	col.addEventListener('wheel', e => {
		e.preventDefault();
		cancelMomentum();
		setIdx(clamp(getIdx() + (e.deltaY > 0 ? 1 : -1)));
		snap(Math.round, true);
	}, {
		passive: false
	});
}

function buildInfiniteDrum(colId, innerId, items, initIdx, onChange, onDrag) {
	const col = document.getElementById(colId);
	const inner = document.getElementById(innerId);
	let idx = initIdx;
	let renderedBase = null;

	const buildDOM = base => {
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

	const applyTranslate = animated => {
		const ty = -ITEM_H + (renderedBase - idx) * ITEM_H;
		if (animated) {
			inner.style.transition = 'transform 0.16s cubic-bezier(0.33, 1, 0.68, 1)';
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

	const snap = (roundFn = Math.round, animated = true) => {
		idx = roundFn(idx);
		const real = ((idx % items.length) + items.length) % items.length;
		buildDOM(idx);
		applyTranslate(animated);
		updateSelected();
		onChange(real, idx);
	};


	attachDrag(
		col,
		() => idx,
		v => {
			idx = v;
			if (onDrag) onDrag(v);
		},
		redraw,
		snap
	);

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
	const clamp = v => Math.max(0, Math.min(items.length - 1, v));

	const buildDOM = () => {
		inner.innerHTML = '';
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

	const applyTranslate = animated => {
		const ty = ITEM_H - idx * ITEM_H;
		inner.style.transition = animated ? 'transform 0.16s cubic-bezier(0.33, 1, 0.68, 1)' : '';
		inner.style.transform = `translateY(${ty}px)`;
	};

	const snap = (roundFn = Math.round, animated = true) => {
		idx = clamp(roundFn(idx));
		applyTranslate(animated);
		updateSelected();
		onChange(idx);
	};

	attachDrag(col, () => idx, v => (idx = clamp(v)), () => {
		applyTranslate(false);
		updateSelected();
	}, snap, clamp);

	buildDOM();
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
let hourIdx = nowHour % 12;
let minIdx = nowMin;

let ampmDrum;
let hourDrum;

ampmDrum = buildFiniteDrum('drum-ampm', 'inner-ampm', ampmItems, ampmIdx, newAmpmIdx => {
	if (newAmpmIdx === ampmIdx) return;
	ampmIdx = newAmpmIdx;
	const newRaw = ampmIdx * 12 + hourIdx;
	hourDrum.forceIdx(newRaw);
});

const initRawHour = ampmIdx * 12 + hourIdx;

hourDrum = buildInfiniteDrum(
	'drum-hour',
	'inner-hour',
	hourItems,
	initRawHour,
	(real, raw) => {
		hourIdx = real;
	},

	raw => {
		const newAmpm = ((Math.floor(raw / 12)) % 2 + 2) % 2;

		if (newAmpm !== ampmIdx) {
			ampmIdx = newAmpm;
			ampmDrum.forceIdx(ampmIdx);
		}
	}
);

buildInfiniteDrum('drum-min', 'inner-min', minItems, minIdx, i => {
	minIdx = i;
});