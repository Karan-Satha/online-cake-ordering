let exitIntentTriggered = false;

export function initialiseExitIntent(callback) {
  const isMobile = window.matchMedia?.("(max-width: 768px)").matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  if (isMobile) {
    let inactivityTimer;
    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(callback, 30_000);
    };
    ["touchstart", "touchmove", "scroll", "click", "keydown"].forEach((eventName) =>
      document.addEventListener(eventName, resetInactivityTimer, { passive: true }),
    );
    resetInactivityTimer();
    return;
  }

  document.addEventListener("mouseout", (event) => {
    if (exitIntentTriggered) {
      return;
    }

    if (event.clientY > 0) {
      return;
    }

    exitIntentTriggered = true;

    callback();
  });
}

export function resetExitIntent() {
  exitIntentTriggered = false;
}
