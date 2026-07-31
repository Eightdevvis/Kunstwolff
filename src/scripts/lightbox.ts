/**
 * Lightbox – gemeinsame Implementierung für Slideshow und Galerie.
 *
 * Vorher lag der komplette Code (Zoom, Pan, Pinch, Tastatur) im `<script>` von
 * `Slideshow.astro`. Mit der Galerie gibt es einen ZWEITEN Aufrufer, und zwei
 * Kopien derselben ~200 Zeilen wären genau die Doppelrealität, die bei der
 * nächsten Änderung auseinanderläuft: ein Fix in der einen Bühne, unbemerkt
 * fehlend in der anderen.
 *
 * Das DOM wird EINMAL pro Seite in `<body>` injiziert (`#kw-lightbox`) und von
 * beiden Aufrufern genutzt. Die Styles stehen in `src/styles/lightbox.css`
 * (über `global.css` auf jeder Seite geladen) – sie können nicht mehr an einer
 * Komponente hängen, die auf der Galerie-Seite gar nicht vorkommt.
 */

export type LbSlide = { src: string; alt: string; title: string };

let lb: HTMLElement | null = null;
let lbImg: HTMLImageElement | null = null;
let lbCounter: HTMLElement | null = null;
let lbCaption: HTMLElement | null = null;
let lbSlides: LbSlide[] = [];
let lbIdx = 0;

// Zoom + Pan
let lbZoom = 1;
let lbPanX = 0;
let lbPanY = 0;
const LB_MAX_ZOOM = 4;

// Touch tracking
let touchCount = 0;
let swipeStartX = 0;
let swipeStartY = 0;
let lastTouchX = 0;
let lastTouchY = 0;
let pinchStartDist = 0;
let pinchStartZoom = 1;

// Maus-Drag tracking (Pan mit Maus wenn gezoomt)
let mouseDownX = 0;
let mouseDownY = 0;
let mouseIsDragging = false; // true sobald Maus >= 5px bewegt wurde

// =====================================================================
// LIGHTBOX DOM SETUP (einmalig für die gesamte Seite)
// =====================================================================
function createLightbox() {
    if (document.getElementById("kw-lightbox")) {
        lb = document.getElementById("kw-lightbox");
        lbImg = lb!.querySelector(".lb-img");
        lbCounter = lb!.querySelector(".lb-counter");
        lbCaption = lb!.querySelector(".lb-caption");
        return;
    }

    const el = document.createElement("div");
    el.id = "kw-lightbox";
    el.setAttribute("hidden", "");
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Bildvorschau");
    el.innerHTML = `
        <div class="lb-backdrop"></div>
        <div class="lb-wrap">
            <img class="lb-img" src="" alt="" draggable="false" />
        </div>
        <button class="lb-close" aria-label="Schließen">✕</button>
        <button class="lb-prev" aria-label="Vorheriges Bild">&#8249;</button>
        <button class="lb-next" aria-label="Nächstes Bild">&#8250;</button>
        <div class="lb-footer">
            <span class="lb-caption"></span>
            <span class="lb-counter"></span>
        </div>
    `;
    document.body.appendChild(el);

    lb = el;
    lbImg = el.querySelector(".lb-img");
    lbCounter = el.querySelector(".lb-counter");
    lbCaption = el.querySelector(".lb-caption");

    el.querySelector(".lb-backdrop")!.addEventListener("click", closeLightbox);
    el.querySelector(".lb-close")!.addEventListener("click", closeLightbox);
    el.querySelector(".lb-prev")!.addEventListener("click", () => navigate(-1));
    el.querySelector(".lb-next")!.addEventListener("click", () => navigate(1));

    // Keyboard
    document.addEventListener("keydown", onKeydown);

    // Touch (Swipe, Pinch, Pan)
    const wrap = el.querySelector(".lb-wrap") as HTMLElement;
    wrap.addEventListener("touchstart", onTouchStart, { passive: true });
    wrap.addEventListener("touchmove", onTouchMove, { passive: false });
    wrap.addEventListener("touchend", onTouchEnd, { passive: true });

    // Maus-Drag-Panning (Desktop)
    wrap.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Einfacher Klick = Zoom-Toggle (Desktop)
    lbImg!.addEventListener("click", onImgClick);
}

// =====================================================================
// OPEN / CLOSE / NAVIGATE
// =====================================================================
export function openLightbox(slides: LbSlide[], idx: number) {
    if (!lb) createLightbox();
    lbSlides = slides;
    lbIdx = idx;
    resetZoom();
    showSlide();
    lb!.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
}

export function closeLightbox() {
    lb?.setAttribute("hidden", "");
    document.body.style.overflow = "";
    resetZoom();
}

function navigate(dir: number) {
    if (lbSlides.length < 2) return;
    lbIdx = (lbIdx + dir + lbSlides.length) % lbSlides.length;
    resetZoom();
    showSlide();
}

function showSlide() {
    if (!lbImg || !lbCounter) return;
    const slide = lbSlides[lbIdx];
    lbImg.src = slide.src;
    lbImg.alt = slide.alt;
    lbCounter.textContent = `${lbIdx + 1} / ${lbSlides.length}`;
    // NUR der gepflegte Titel, KEIN Rückfall auf den Alt-Text.
    //
    // Der Alt-Text wird aus dem DATEINAMEN abgeleitet (`normalizeAlt` in
    // slideImages.ts: Endung weg, führende Nummer weg, Unterstriche zu
    // Leerzeichen). Als Bildunterschrift stand darunter also so etwas wie
    // „2 kollegen weihnachtsfeier trier" – technischer Dateikram, den niemand
    // lesen soll. Für Screenreader ist derselbe Text weiterhin richtig und
    // bleibt am `alt`-Attribut; sichtbar wird er nicht mehr.
    //
    // Folge: ohne gepflegten Titel gibt es KEINE Unterschrift. Das ist Absicht –
    // gepflegt wird er in der Mediathek pro Bild.
    if (lbCaption) {
        const caption = slide.title || "";
        lbCaption.textContent = caption;
        lbCaption.style.display = caption ? "" : "none";
    }

    const prevBtn = lb?.querySelector(".lb-prev") as HTMLElement | null;
    const nextBtn = lb?.querySelector(".lb-next") as HTMLElement | null;
    const hidden = lbSlides.length <= 1;
    if (prevBtn) prevBtn.style.display = hidden ? "none" : "";
    if (nextBtn) nextBtn.style.display = hidden ? "none" : "";
}

// =====================================================================
// ZOOM + PAN
// =====================================================================
function resetZoom() {
    lbZoom = 1;
    lbPanX = 0;
    lbPanY = 0;
    applyTransform();
}

function applyTransform() {
    if (!lbImg) return;
    // translate vor scale, damit Pan in Bildkoordinaten arbeitet
    lbImg.style.transform = `scale(${lbZoom}) translate(${lbPanX / lbZoom}px, ${lbPanY / lbZoom}px)`;
    lbImg.style.cursor = lbZoom > 1 ? "grab" : "zoom-in"; // "grabbing" wird beim Drag direkt gesetzt
}

// Einfacher Klick: rein- oder rauszoomen.
// Guard: wenn Maus vorher gezogen wurde, ist es kein Zoom-Klick.
function onImgClick(e: MouseEvent) {
    if (mouseIsDragging) return;
    if (lbZoom > 1) {
        resetZoom();
    } else {
        // Zoom zur Klick-Position hin (2.5× reicht für eine gute Detailansicht)
        const rect = lbImg!.getBoundingClientRect();
        const offsetX = e.clientX - (rect.left + rect.width / 2);
        const offsetY = e.clientY - (rect.top + rect.height / 2);
        lbZoom = 2.5;
        lbPanX = -offsetX;
        lbPanY = -offsetY;
        applyTransform();
    }
}

// Maus gedrückt: Startposition merken, Drag noch nicht aktiv
function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return; // nur linke Maustaste
    mouseDownX = e.clientX;
    mouseDownY = e.clientY;
    mouseIsDragging = false;
}

// Maus bewegt: ab 5px Delta → Pan (nur wenn gezoomt)
function onMouseMove(e: MouseEvent) {
    if (e.buttons !== 1) return; // linke Taste muss gehalten sein
    const dx = e.clientX - mouseDownX;
    const dy = e.clientY - mouseDownY;
    if (!mouseIsDragging && Math.hypot(dx, dy) < 5) return;
    if (lbZoom <= 1) return;

    mouseIsDragging = true;
    lbPanX += e.movementX;
    lbPanY += e.movementY;
    applyTransform();
    if (lbImg) lbImg.style.cursor = "grabbing";
}

// Maus losgelassen: Drag beenden, Cursor zurücksetzen
function onMouseUp() {
    if (mouseIsDragging) {
        applyTransform(); // setzt cursor zurück auf "grab"
    }
    // mouseIsDragging erst beim nächsten Frame zurücksetzen,
    // damit der click-Handler es noch lesen kann
    requestAnimationFrame(() => { mouseIsDragging = false; });
}

// =====================================================================
// KEYBOARD
// =====================================================================
function onKeydown(e: KeyboardEvent) {
    if (lb?.hasAttribute("hidden")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") navigate(1);
    if (e.key === "ArrowLeft") navigate(-1);
}

// =====================================================================
// TOUCH: Swipe (zoom=1) | Pan (zoom>1) | Pinch-Zoom
// =====================================================================
function getTouchDist(t: TouchList): number {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function onTouchStart(e: TouchEvent) {
    touchCount = e.touches.length;
    if (touchCount === 1) {
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        lastTouchX = swipeStartX;
        lastTouchY = swipeStartY;
    } else if (touchCount === 2) {
        pinchStartDist = getTouchDist(e.touches);
        pinchStartZoom = lbZoom;
    }
}

function onTouchMove(e: TouchEvent) {
    if (e.touches.length === 2) {
        // Pinch-Zoom
        const dist = getTouchDist(e.touches);
        lbZoom = Math.max(1, Math.min(LB_MAX_ZOOM, pinchStartZoom * (dist / pinchStartDist)));
        applyTransform();
        e.preventDefault();
    } else if (e.touches.length === 1 && lbZoom > 1) {
        // Pan (nur wenn gezoomt)
        const dx = e.touches[0].clientX - lastTouchX;
        const dy = e.touches[0].clientY - lastTouchY;
        lbPanX += dx;
        lbPanY += dy;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
        applyTransform();
        e.preventDefault();
    }
}

function onTouchEnd(e: TouchEvent) {
    // Swipe-Navigation nur wenn nicht gezoomt und single-touch
    if (touchCount === 1 && lbZoom <= 1) {
        const dx = e.changedTouches[0].clientX - swipeStartX;
        const dy = e.changedTouches[0].clientY - swipeStartY;
        // Horizontal-Swipe: Mindest-Delta 50px, mehr horizontal als vertikal
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
            navigate(dx < 0 ? 1 : -1);
        }
    }
    touchCount = e.touches.length;
}
