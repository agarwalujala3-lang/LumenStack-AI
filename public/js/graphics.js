export function initNebula(canvasSelector = "#nebula-canvas") {
  const canvas = document.querySelector(canvasSelector);
  if (!canvas) {
    return () => {};
  }

  const context = canvas.getContext("2d");
  const stars = [];
  const pointer = { x: 0.5, y: 0.5 };
  let width = 0;
  let height = 0;
  let frameId = 0;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    stars.length = 0;

    const count = Math.max(120, Math.floor((width * height) / 11000));
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 1.2 + 0.2,
        r: Math.random() * 1.8 + 0.5,
        speed: Math.random() * 0.35 + 0.08,
        drift: (Math.random() - 0.5) * 0.8
      });
    }
  }

  function draw() {
    context.clearRect(0, 0, width, height);

    const focusX = pointer.x * width;
    const focusY = pointer.y * height;
    const gradient = context.createRadialGradient(focusX, focusY, 40, width / 2, height / 2, Math.max(width, height));
    gradient.addColorStop(0, "rgba(122, 169, 255, 0.08)");
    gradient.addColorStop(1, "rgba(110, 240, 223, 0.08)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    stars.forEach((star, index) => {
      star.y += star.speed * star.z;
      star.x += (Math.sin((Date.now() * 0.0002) + index) * 0.03) + star.drift * 0.01;

      if (star.y > height + 14) {
        star.y = -12;
        star.x = Math.random() * width;
      }

      context.beginPath();
      context.fillStyle = index % 3 === 0 ? "rgba(122, 169, 255, 0.55)" : "rgba(110, 240, 223, 0.5)";
      context.arc(star.x, star.y, star.r * star.z, 0, Math.PI * 2);
      context.fill();
    });

    frameId = window.requestAnimationFrame(draw);
  }

  function onMove(event) {
    pointer.x = Math.max(0, Math.min(1, event.clientX / Math.max(1, width)));
    pointer.y = Math.max(0, Math.min(1, event.clientY / Math.max(1, height)));
  }

  resize();
  draw();
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onMove);

  return () => {
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onMove);
    if (frameId) {
      window.cancelAnimationFrame(frameId);
    }
  };
}

export function initTiltCards(selector = ".tilt-card") {
  const cards = Array.from(document.querySelectorAll(selector));
  cards.forEach((card) => {
    const inner = card.querySelector(".tilt-inner");
    if (!inner) {
      return;
    }

    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const offsetX = (event.clientX - rect.left) / rect.width;
      const offsetY = (event.clientY - rect.top) / rect.height;
      const rotateY = (offsetX - 0.5) * 10;
      const rotateX = (0.5 - offsetY) * 10;
      inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener("mouseleave", () => {
      inner.style.transform = "rotateX(0deg) rotateY(0deg)";
    });
  });
}

export function initRevealCards(selector = "[data-reveal]") {
  const elements = Array.from(document.querySelectorAll(selector));
  if (!elements.length || !("IntersectionObserver" in window)) {
    elements.forEach((item) => item.classList.add("revealed"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  elements.forEach((item) => observer.observe(item));
}
