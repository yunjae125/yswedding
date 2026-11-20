const grid = document.getElementById("photo-grid");
const modal = document.getElementById("lightbox");
const large = document.getElementById("large-photo");
const more = document.getElementById("more");
let current = 0,
  expanded = false,
  opener = null;
function setPhoto(element, photo, thumbnail = false) {
  const suffix = thumbnail ? "-thumb" : "";
  element.style.backgroundImage = `url("photos/${photo.file}${suffix}.webp")`;
  if (!thumbnail) element.setAttribute("aria-label", photo.alt);
}

photos.forEach((photo, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "photo-card";
  button.hidden = index >= 3;
  button.setAttribute("aria-label", `${photo.alt} 크게 보기`);

  const surface = document.createElement("span");
  surface.className = "photo-surface";
  surface.setAttribute("aria-hidden", "true");
  setPhoto(surface, photo, true);
  button.append(surface);
  button.addEventListener("click", () => {
    opener = button;
    show(index);
    modal.showModal();
    document.body.classList.add("modal-open");
  });
  grid.append(button);
});
const swipeSurface = large.parentElement;
let slideVersion = 0,
  slideAnimations = [],
  swipeStart = null,
  sidePhotos = [];
function clearSlide() {
  slideVersion++;
  slideAnimations.forEach((animation) => animation.cancel());
  slideAnimations = [];
  sidePhotos.forEach((element) => element.remove());
  sidePhotos = [];
  swipeStart = null;
  large.style.transform = "";
}
function updateCounter() {
  document.getElementById("counter").textContent =
    `${current + 1} / ${photos.length}`;
}
function prepareSlides() {
  clearSlide();
  const width = swipeSurface.clientWidth;
  const rect = large.getBoundingClientRect(),
    parent = swipeSurface.getBoundingClientRect();
  for (const direction of [-1, 1]) {
    const layer = large.cloneNode(false);
    layer.removeAttribute("id");
    layer.setAttribute("aria-hidden", "true");
    setPhoto(
      layer,
      photos[(current + direction + photos.length) % photos.length],
    );
    Object.assign(layer.style, {
      position: "absolute",
      left: `${rect.left - parent.left}px`,
      top: `${rect.top - parent.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      transform: `translateX(${direction * width}px)`,
      pointerEvents: "none",
    });
    swipeSurface.append(layer);
    sidePhotos.push(layer);
  }
  return width;
}
function positionSlides(dx, width) {
  large.style.transform = `translateX(${dx}px)`;
  sidePhotos.forEach(
    (element, i) =>
      (element.style.transform = `translateX(${dx + (i === 0 ? -width : width)}px)`),
  );
}
function settleSlides(dx, width, direction) {
  swipeStart = null;
  const version = slideVersion;
  const destination = -direction * width;
  const elements = [sidePhotos[0], large, sidePhotos[1]];
  const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : 300;
  slideAnimations = elements.map((element, i) =>
    element.animate(
      [
        { transform: `translateX(${dx + (i - 1) * width}px)` },
        { transform: `translateX(${destination + (i - 1) * width}px)` },
      ],
      {
        duration,
        easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        fill: "forwards",
      },
    ),
  );
  Promise.all(slideAnimations.map((animation) => animation.finished))
    .then(() => {
      if (version !== slideVersion) return;
      current = (current + direction + photos.length) % photos.length;
      setPhoto(large, photos[current]);
      updateCounter();
      clearSlide();
    })
    .catch(() => {});
}
function show(i) {
  const target = (i + photos.length) % photos.length;
  if (modal.open && target !== current) {
    const width = prepareSlides();
    settleSlides(0, width, i < current ? -1 : 1);
  } else {
    clearSlide();
    current = target;
    setPhoto(large, photos[current]);
    updateCounter();
  }
}

more.addEventListener("click", () => {
  expanded = !expanded;
  [...grid.children].forEach((card, index) => {
    card.hidden = !expanded && index >= 3;
  });
  more.setAttribute("aria-expanded", String(expanded));
  more.innerHTML = expanded
    ? '사진 접기 <span aria-hidden="true">−</span>'
    : '사진 더보기 <span aria-hidden="true">+</span>';
  if (!expanded)
    document.getElementById("gallery").scrollIntoView({ block: "start" });
});
document.getElementById("close").onclick = () => modal.close();
document.getElementById("prev").onclick = () => show(current - 1);
document.getElementById("next").onclick = () => show(current + 1);
modal.addEventListener("close", () => {
  slideVersion++;
  clearSlide();
  document.body.classList.remove("modal-open");
  opener?.focus();
});
// The photo surface captures taps and swipes; close using the explicit close button.
modal.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") {
    e.preventDefault();
    show(current + 1);
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    show(current - 1);
  }
});
swipeSurface.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0))
    return;
  const width = prepareSlides();
  swipeStart = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    width,
    dx: 0,
    axis: null,
  };
  swipeSurface.setPointerCapture(event.pointerId);
});
swipeSurface.addEventListener("pointermove", (event) => {
  const drag = swipeStart;
  if (!drag || drag.id !== event.pointerId) return;
  const dx = event.clientX - drag.x,
    dy = event.clientY - drag.y;
  if (!drag.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 6)
    drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
  if (drag.axis !== "x") return;
  drag.dx = Math.max(-drag.width, Math.min(drag.width, dx));
  positionSlides(drag.dx, drag.width);
});
function finishDrag(event, cancelled = false) {
  const drag = swipeStart;
  if (!drag || drag.id !== event.pointerId) return;
  const direction =
    !cancelled && drag.axis === "x" && Math.abs(drag.dx) >= drag.width / 2
      ? drag.dx < 0
        ? 1
        : -1
      : 0;
  settleSlides(drag.dx, drag.width, direction);
}
swipeSurface.addEventListener("pointerup", (event) => finishDrag(event));
swipeSurface.addEventListener("pointercancel", (event) =>
  finishDrag(event, true),
);
swipeSurface.addEventListener("lostpointercapture", (event) =>
  finishDrag(event, true),
);
window.addEventListener("resize", () => {
  if (modal.open) clearSlide();
});

// Progressive enhancement: content remains visible when motion is unsupported.
(() => {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (
    motion.matches ||
    !("IntersectionObserver" in window) ||
    !Element.prototype.animate
  )
    return;
  const pending = new Map();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ target, isIntersecting, boundingClientRect }) => {
        const animation = pending.get(target);
        if (!animation) return;
        if (isIntersecting) {
          if (animation.playState === "paused") animation.play();
        } else if (
          boundingClientRect.top > window.innerHeight / 2 &&
          !target.contains(document.activeElement)
        ) {
          // Re-arm only below the viewport, never hide content as it leaves at the top.
          animation.pause();
          animation.currentTime = 0;
        }
      });
    },
    { threshold: 0, rootMargin: "0px 0px -100px 0px" },
  );
  const selector =
    ".invitation > *, .gallery-heading, .photo-card, .details > .eyebrow, .details > h2, .details-grid > div, .calendar-block, .location-block > *, .guestbook > .eyebrow, .guestbook > h2, .guestbook > .section-note, .share-section > *";
  document.querySelectorAll(selector).forEach((element) => {
    const animation = element.animate(
      [
        { opacity: 0, transform: "translateY(36px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: 1100,
        easing: "cubic-bezier(0.45, 0, 0.35, 1)",
        fill: "both",
      },
    );
    animation.pause();
    pending.set(element, animation);
    observer.observe(element);
  });
  // Keyboard users should never focus an invisible control.
  document.addEventListener("focusin", (event) => {
    pending.forEach((animation, element) => {
      if (element.contains(event.target)) {
        animation.cancel();
        pending.delete(element);
        observer.unobserve(element);
      }
    });
  });
  const revealAll = () => {
    observer.disconnect();
    pending.forEach((animation) => animation.cancel());
    pending.clear();
  };
  motion.addEventListener("change", (event) => {
    if (event.matches) revealAll();
  });
  window.addEventListener("beforeprint", revealAll);
})();

// Background surfaces keep the native image menu from receiving gallery gestures.
const photoSelector = ".hero-photo, .photo-card, .viewer-image";
for (const eventName of ["contextmenu", "dragstart"]) {
  document.addEventListener(eventName, (event) => {
    if (event.target instanceof Element && event.target.closest(photoSelector))
      event.preventDefault();
  });
}
