/* 모닝콜 */
const STEP = 67;

document.querySelectorAll('.morning_call .col').forEach(col => {
	if (!col.classList.contains('ampm')) {
		col.scrollTop = STEP;
	}

	let wheelLock = false;

	col.addEventListener('wheel', e => {
		e.preventDefault();
		if (wheelLock) return;

		wheelLock = true;

		col.scrollTop += e.deltaY > 0 ? STEP : -STEP;

		setTimeout(() => {
			wheelLock = false;
		}, 120);
	}, {
		passive: false
	});

	const updateActive = () => {
		const center = col.scrollTop + col.clientHeight / 2;

		col.querySelectorAll('span').forEach(item => {
			const itemCenter = item.offsetTop + item.offsetHeight / 2;
			const diff = Math.abs(center - itemCenter);

			item.classList.toggle('active', diff < STEP / 2);
		});
	};

	col.addEventListener('scroll', updateActive);

	updateActive();
});

/* 요일 선택 */
document.addEventListener('DOMContentLoaded', () => {
	const buttons = document.querySelectorAll('.week_wrap button');

	buttons.forEach(btn => {
		btn.addEventListener('click', () => {
			btn.classList.toggle('active');
		});
	});
});