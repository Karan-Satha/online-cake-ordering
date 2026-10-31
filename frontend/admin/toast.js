const toast = document.querySelector("#toast");

const toastMessage = document.querySelector("#toast-message");

let toastTimer;

export function showToast(message, type = "success") {
  clearTimeout(toastTimer);

  toast.className = `toast ${type}`;

  toastMessage.textContent = message;

  toast.hidden = false;

  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}
