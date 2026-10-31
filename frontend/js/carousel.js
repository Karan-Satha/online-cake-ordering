export class Carousel {
  constructor({
    viewport,
    track,
    prevButton,
    nextButton,
    dotsContainer,
    slidesToShow = 4,
    autoplay = true,
    autoplayDelay = 5000,
  }) {
    this.viewport = viewport;
    this.track = track;
    this.prevButton = prevButton;
    this.nextButton = nextButton;
    this.dotsContainer = dotsContainer;

    this.slidesToShow = slidesToShow;
    this.currentIndex = 0;

    this.autoplay = autoplay;
    this.autoplayDelay = autoplayDelay;
    this.timer = null;

    this.dragStartX = 0;
    this.dragCurrentX = 0;
    this.isDragging = false;

    this.setup();
  }

  // ============================================
  // INITIALISE
  // ============================================

  setup() {
    this.updateSlides();

    if (this.slides.length === 0) {
      return;
    }

    this.createDots();

    this.attachEvents();

    this.goTo(0);

    if (this.autoplay) {
      this.startAutoplay();
    }
  }

  updateSlides() {
    this.slides = [...this.track.children];

    this.totalSlides = this.slides.length;

    this.visibleSlides = this.getVisibleSlides();
  }

  getVisibleSlides() {
    if (window.innerWidth < 768) return 1;

    if (window.innerWidth < 1024) return 2;

    return this.slidesToShow;
  }

  // ============================================
  // NAVIGATION
  // ============================================

  next() {
    if (this.currentIndex >= this.totalSlides - this.visibleSlides) {
      this.currentIndex = 0;
    } else {
      this.currentIndex++;
    }

    this.update();
  }

  previous() {
    if (this.currentIndex <= 0) {
      this.currentIndex = this.totalSlides - this.visibleSlides;
    } else {
      this.currentIndex--;
    }

    this.update();
  }

  goTo(index) {
    this.currentIndex = index;

    this.update();
  }

  update() {
    this.updateSlides();

    if (this.slides.length === 0) {
      return;
    }

    const gap = parseFloat(getComputedStyle(this.track).gap) || 0;

    const slideWidth = this.slides[0].offsetWidth + gap;

    this.track.style.transform = `translateX(-${this.currentIndex * slideWidth}px)`;

    this.updateDots();
  }

  // ============================================
  // DOTS
  // ============================================

  createDots() {
    if (!this.dotsContainer) return;

    this.dotsContainer.innerHTML = "";

    const pages = this.totalSlides - this.visibleSlides + 1;

    for (let i = 0; i < pages; i++) {
      const dot = document.createElement("button");

      dot.className = "carousel__dot";

      dot.type = "button";

      dot.setAttribute("aria-label", `Go to slide ${i + 1}`);

      dot.addEventListener("click", () => {
        this.goTo(i);

        this.restartAutoplay();
      });

      this.dotsContainer.appendChild(dot);
    }

    this.updateDots();
  }

  updateDots() {
    if (!this.dotsContainer) return;

    [...this.dotsContainer.children].forEach((dot, index) => {
      dot.classList.toggle("active", index === this.currentIndex);
    });
  }

  // ============================================
  // AUTOPLAY
  // ============================================

  startAutoplay() {
    if (!this.autoplay || this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.next();
    }, this.autoplayDelay);
  }

  stopAutoplay() {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);

    this.timer = null;
  }

  restartAutoplay() {
    if (!this.autoplay) {
      return;
    }

    this.stopAutoplay();

    this.startAutoplay();
  }

  // ============================================
  // DRAG
  // ============================================

  startDrag(clientX) {
    this.stopAutoplay();

    this.dragStartX = clientX;
    this.dragCurrentX = clientX;

    this.isDragging = true;

    this.viewport.classList.add("dragging");
  }

  moveDrag(clientX) {
    if (!this.isDragging) {
      return;
    }

    this.dragCurrentX = clientX;
  }

  endDrag() {
    if (!this.isDragging) {
      return;
    }

    const distance = this.dragCurrentX - this.dragStartX;

    this.viewport.classList.remove("dragging");

    this.isDragging = false;

    if (distance > 60) {
      this.previous();
    }

    if (distance < -60) {
      this.next();
    }

    this.restartAutoplay();
  }

  // ============================================
  // EVENTS
  // ============================================

  attachEvents() {
    this.nextButton?.addEventListener("click", () => {
      this.next();

      this.restartAutoplay();
    });

    this.prevButton?.addEventListener("click", () => {
      this.previous();

      this.restartAutoplay();
    });

    if (this.autoplay) {
      this.viewport.addEventListener("mouseenter", () => {
        this.stopAutoplay();
      });

      this.viewport.addEventListener("mouseleave", () => {
        this.startAutoplay();
      });
    }

    this.viewport.addEventListener("mousedown", (event) =>
      this.startDrag(event.clientX),
    );

    window.addEventListener("mousemove", (event) =>
      this.moveDrag(event.clientX),
    );

    window.addEventListener("mouseup", () => this.endDrag());

    this.viewport.addEventListener(
      "touchstart",
      (event) => this.startDrag(event.touches[0].clientX),
      {
        passive: true,
      },
    );

    this.viewport.addEventListener(
      "touchmove",
      (event) => this.moveDrag(event.touches[0].clientX),
      {
        passive: true,
      },
    );

    this.viewport.addEventListener("touchend", () => this.endDrag());

    window.addEventListener("resize", () => {
      this.visibleSlides = this.getVisibleSlides();

      this.createDots();

      this.update();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        this.next();
      }

      if (event.key === "ArrowLeft") {
        this.previous();
      }
    });
  }
}
