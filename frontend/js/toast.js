export function showToast({
  title = "",
  message = "",
  type = "success",
  duration = 10000,
}) {
  const container = document.querySelector("#toast-container");

  if (!container) {
    return;
  }

  const icons = {
    success: "✓",
    error: "✕",
    warning: "!",
  };

  const toast = document.createElement("div");

  toast.className = `toast toast-${type}`;

  toast.innerHTML = `
    <div class="toast-icon">
      ${icons[type] ?? "•"}
    </div>

    <div class="toast-content">
      <div class="toast-title">
        ${title}
      </div>

      <div class="toast-message">
        ${message}
      </div>
    </div>

    <button
      type="button"
      class="toast-close"
      aria-label="Close"
    >
      ×
    </button>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  const removeToast = () => {
    toast.classList.remove("show");

    setTimeout(() => {
      toast.remove();
    }, 300);
  };

  const closeButton = toast.querySelector(".toast-close");

  closeButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    removeToast();
  });

  const timeoutId = setTimeout(removeToast, duration);

  toast.addEventListener("mouseenter", () => {
    clearTimeout(timeoutId);
  });
}
