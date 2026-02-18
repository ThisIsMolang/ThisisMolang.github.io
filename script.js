const logoContainer = document.getElementById("logoContainer");
const logoHomeLink = document.getElementById("logoHomeLink");
const LETTER_STAGGER_MS = 150;
const LETTER_FADE_DURATION_MS = 400;
const LETTER_READ_DELAY_MS = 500;
const LETTER_PREVIEW_DELAY_MS = (3 * LETTER_STAGGER_MS) + LETTER_FADE_DURATION_MS + LETTER_READ_DELAY_MS;
const LETTER_STACK_DURATION_MS = 1500;
const DEBRIS_RADIUS_SHRINK_MS = 1500;
const DEBRIS_ENTRY_DELAY_MS = 0;
const TEXT_REVEAL_DELAY_MS = LETTER_STACK_DURATION_MS - 500;
const TEXT_LINE_STAGGER_MS = 700;
const DEBRIS_COUNT = 100;
const DEBRIS_DELAY_MS = 2000 / DEBRIS_COUNT;
const DOCK_SCROLL_START_RATIO = 0.16;
const DOCK_SCROLL_END_RATIO = 0.9;
const DOCK_ICON_CENTER_X = 80;
const DOCK_ICON_CENTER_Y = 40;
const DOCK_SCALE = 0.22;
const DOCK_SNAP_ON = 0.6;
const DOCK_SNAP_OFF = 0.4;

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function lerp(start, end, progress) {
	return start + (end - start) * progress;
}

function createDebris(layer) {
	const palette = ["#2a6df4", "#7f9ae3", "#b7c4e9", "#dce3f4", "#9aa6c7"];
	const debrisItems = [];

	for (let index = 0; index < DEBRIS_COUNT; index += 1) {
		const node = document.createElement("span");
		node.className = "debris";

		const size = 8 + Math.random() * 8;
		node.style.width = `${size}px`;
		node.style.height = `${size}px`;
		node.style.background = palette[index % palette.length];

		layer.appendChild(node);

		const targetRadiusX = 300 + Math.random() * 150;
		const targetRadiusY = 300 + Math.random() * 150;
		const initialRadiusFactor = 3 + Math.random() * 1;

		debrisItems.push({
			node,
			index,
			startRadiusX: targetRadiusX * initialRadiusFactor,
			startRadiusY: targetRadiusY * initialRadiusFactor,
			radiusX: targetRadiusX,
			radiusY: targetRadiusY,
			speed: 0.2 + Math.random() * 0.3,
			phase: Math.random() * Math.PI * 2,
			wobble: 2 + Math.random() * 3,
			wobbleSpeed: 0.7 + Math.random() * 0.6,
		});
	}

	return debrisItems;
}

function animateDebris(debrisItems, startTime, revealStartTimeRef, dockProgressRef) {
	const now = performance.now();
	const elapsedSec = (now - startTime) / 1000;
	const dockProgress = dockProgressRef.value;

	debrisItems.forEach((item) => {
		let entryProgress = 0;
		if (typeof revealStartTimeRef.value === "number") {
			const itemDelayMs = item.index * DEBRIS_DELAY_MS;
			const timeSinceReveal = now - revealStartTimeRef.value - itemDelayMs;
			if (timeSinceReveal >= 0) {
				const rawProgress = timeSinceReveal / DEBRIS_RADIUS_SHRINK_MS;
				const clamped = Math.min(Math.max(rawProgress, 0), 1);
				entryProgress = 1 - (1 - clamped) ** 3;
			}
		}

		const orbitAngle = elapsedSec * item.speed + item.phase;
		const jitter = Math.sin(elapsedSec * item.wobbleSpeed + item.phase) * item.wobble;

		const currentRadiusX = item.startRadiusX * (1 - entryProgress) + item.radiusX * entryProgress;
		const currentRadiusY = item.startRadiusY * (1 - entryProgress) + item.radiusY * entryProgress;
		const dockRadiusFactor = 1 - dockProgress * 0.72;

		const x = (Math.cos(orbitAngle) * currentRadiusX + jitter) * dockRadiusFactor;
		const y = (Math.sin(orbitAngle) * currentRadiusY + jitter * 0.35) * dockRadiusFactor;
		const visibleOpacity = entryProgress * (1 - dockProgress) * 0.9;

		item.node.style.opacity = visibleOpacity;
		item.node.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
	});

	requestAnimationFrame(() => animateDebris(debrisItems, startTime, revealStartTimeRef, dockProgressRef));
}

function getDockProgress() {
	const viewportHeight = window.innerHeight || 1;
	const startY = viewportHeight * DOCK_SCROLL_START_RATIO;
	const endY = viewportHeight * DOCK_SCROLL_END_RATIO;
	const rawProgress = (window.scrollY - startY) / (endY - startY);
	return clamp(rawProgress, 0, 1);
}

function applyDockTransform(progress) {
	if (!logoContainer) {
		return;
	}

	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;
	const centerX = viewportWidth / 2;
	const centerY = viewportHeight / 2;

	const xOffset = lerp(0, DOCK_ICON_CENTER_X - centerX, progress);
	const yOffset = lerp(0, DOCK_ICON_CENTER_Y - centerY, progress);
	const scale = lerp(1, DOCK_SCALE, progress);
	const easedScale = 1 - (1 - scale) * (1 - progress * 0.08);

	logoContainer.style.transform = `translate(calc(-50% + ${xOffset}px), calc(-50% + ${yOffset}px)) scale(${easedScale})`;
}

if (logoContainer) {
	const letters = logoContainer.querySelectorAll(".letter");
	const orbitalLayer = document.getElementById("orbitalLayer");
	const dockProgressRef = { value: 0 };
	let isDocked = false;
	let scrollFramePending = false;

	function updateDockState() {
		const progress = getDockProgress();
		if (progress >= DOCK_SNAP_ON) {
			isDocked = true;
		} else if (progress <= DOCK_SNAP_OFF) {
			isDocked = false;
		}

		const snappedProgress = isDocked ? 1 : 0;
		dockProgressRef.value = snappedProgress;
		document.documentElement.style.setProperty("--dock-progress", snappedProgress.toFixed(2));
		applyDockTransform(snappedProgress);

		document.body.classList.toggle("is-docked", isDocked);

		if (logoHomeLink) {
			logoHomeLink.classList.toggle("active", isDocked);
		}
	}

	function requestDockUpdate() {
		if (scrollFramePending) {
			return;
		}

		scrollFramePending = true;
		requestAnimationFrame(() => {
			scrollFramePending = false;
			updateDockState();
		});
	}

	letters.forEach((letter, index) => {
		const offset = Number(letter.dataset.offset || 0);
		const staggerMs = index * LETTER_STAGGER_MS;
		letter.style.setProperty("--start-x", `${offset}px`);
		letter.style.setProperty("--stagger-delay", `${staggerMs}ms`);
		letter.style.setProperty("--transform-delay", "0ms");
	});

	if (orbitalLayer) {
		const debrisItems = createDebris(orbitalLayer);
		const revealStartTimeRef = { value: null };
		animateDebris(debrisItems, performance.now(), revealStartTimeRef, dockProgressRef);

		logoContainer._debrisRevealStartTimeRef = revealStartTimeRef;
	}

	window.addEventListener("scroll", requestDockUpdate, { passive: true });
	window.addEventListener("resize", requestDockUpdate);
	requestDockUpdate();

	requestAnimationFrame(() => {
		logoContainer.classList.add("ready");

		setTimeout(() => {
			logoContainer.classList.add("merge");

			setTimeout(() => {
				logoContainer.classList.add("show-text");
				setTimeout(() => {
					logoContainer.classList.add("line-2");
				}, TEXT_LINE_STAGGER_MS);
			}, TEXT_REVEAL_DELAY_MS);

			setTimeout(() => {
				if (logoContainer._debrisRevealStartTimeRef) {
					logoContainer._debrisRevealStartTimeRef.value = performance.now();
				}
				logoContainer.classList.add("debris-visible");
			}, DEBRIS_ENTRY_DELAY_MS);
		}, LETTER_PREVIEW_DELAY_MS);
	});
}
