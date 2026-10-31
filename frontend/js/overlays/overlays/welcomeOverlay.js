import { closeOverlay } from "../overlayRenderer.js";
import { setStorageItem } from "../overlayStorage.js";
import { subscribeToNewsletter } from "../../api.js";
import { storePendingVoucher } from "../../voucher.js";
import { showFieldError, clearFieldError, initAlert } from "../../formValidation.js";
import { icon } from "../../icon.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VOUCHER_CODE = "WELCOME10";

const ICONS = {
  copy: icon("copy", { width: 18, height: 18 }),
  check: icon("check", { width: 18, height: 18 }),
  gift: icon("gift", { width: 36, height: 36 }),
  mail: icon("email", { width: 20, height: 20, className: "hc-overlay-form__icon" }),
};

export function renderWelcomeOverlay() {
  // Persist immediately: a dismissal, navigation, or reload must not offer it again.
  setStorageItem("welcomeVoucherShown", true);
  const existingOverlay = document.querySelector(".hc-overlay");

  if (existingOverlay) {
    existingOverlay.remove();
  }

  document.body.insertAdjacentHTML("beforeend", buildStepMarkup("signup"));

  initialiseSignupEvents();
}

function buildStepMarkup(step) {
  const image =
    step === "signup" ? "/assets/images/welcome-overlay-initial.webp" : "/assets/images/welcome-overlay-code.webp";

  return `
    <div class="hc-overlay" role="dialog" aria-modal="true" aria-labelledby="hc-overlay-title">
      <div class="hc-overlay__backdrop" data-hc-dismiss></div>

      <div class="hc-overlay__modal">
        <div class="hc-overlay__image-panel">
          <img class="hc-overlay__image" src="${image}" alt="" />
        </div>

        <div class="hc-overlay__content-panel">
          <button class="hc-overlay__close" type="button" aria-label="Close" data-hc-dismiss>×</button>

          ${step === "signup" ? buildSignupContent() : buildVoucherContent()}
        </div>
      </div>
      <div class="hc-terms-dialog" id="hc-terms-dialog" hidden>
        <button class="hc-terms-dialog__backdrop" type="button" tabindex="-1" aria-label="Close Terms &amp; Conditions"></button>
        <section class="hc-terms-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="hc-terms-title" tabindex="-1">
          <header class="hc-terms-dialog__header">
            <div>
              <p class="hc-terms-dialog__eyebrow">Home Cake · Welcome offer</p>
              <h2 id="hc-terms-title">Terms &amp; Conditions</h2>
            </div>
            <button class="hc-terms-dialog__close" type="button" aria-label="Close Terms &amp; Conditions">×</button>
          </header>
          <div class="hc-terms-dialog__content" tabindex="0">
            <p class="hc-terms-dialog__intro">This consent is for your email address and the welcome offer and marketing messages described below.</p>
            <h3>Who is responsible?</h3>
            <p>Home Cake, London, UK, is responsible for this newsletter information. Contact <a href="mailto:hello@homecake.co.uk">hello@homecake.co.uk</a> with privacy questions or requests.</p>
            <h3>What we collect</h3>
            <p>We collect the email address you enter. To manage your subscription, our system also records its status, when it was subscribed or unsubscribed, the sign-up source, and a unique unsubscribe token.</p>
            <h3>Why we use it</h3>
            <p>With your consent, Home Cake uses your email address to send the WELCOME10 voucher, the newsletter, product and seasonal updates, promotional offers, and related customer communications. The email is also used to manage your subscription and honour an unsubscribe request. This opt-in is optional; you can close the overlay without submitting your email.</p>
            <h3>Storage and service providers</h3>
            <p>Your subscription record is stored in Home Cake’s server-side database and is not stored directly in this page. Database connections use SSL by default when configured with the production database URL. We use Resend to deliver emails, so your email address and the content needed to send each message are processed by that provider. Access to the subscriber record is through the server-side application. We use technical and organisational safeguards to protect personal data, but no online service can guarantee absolute security. See <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Resend’s Privacy Policy</a>.</p>
            <p>Resend is based in the United States, so email delivery may involve processing your information there or in other locations used by Resend and its subprocessors. Where international data transfers apply, Home Cake and its providers must use safeguards required by applicable data protection law. Current provider details are available in Resend’s <a href="https://resend.com/legal/subprocessors" target="_blank" rel="noopener noreferrer">subprocessor information</a>.</p>
            <h3>Retention and withdrawing consent</h3>
            <p>You can unsubscribe at any time using the link in a marketing email or by contacting <a href="mailto:hello@homecake.co.uk">hello@homecake.co.uk</a>. Unsubscribing stops marketing emails; the subscription record remains marked as unsubscribed so we can respect your choice. You can also contact us to request erasure.</p>
            <h3>Your data protection rights</h3>
            <p>Under the GDPR or UK GDPR where applicable, you can ask to access or correct your personal data, request erasure or restriction, receive data you provided in a portable format, object to processing (including direct marketing), and withdraw consent. Withdrawing consent does not affect processing that took place before withdrawal. You can also complain to your relevant data protection authority.</p>
            <h3>Welcome offer</h3>
            <p>The WELCOME10 code gives 10% off your first order. The discount is shown in the order total when the code is accepted at checkout. Please review the final price and delivery details before placing an order.</p>
            <p class="hc-terms-dialog__source">For the full privacy information, read our <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>. For independent information, see the <a href="https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en" target="_blank" rel="noopener noreferrer">European Commission’s GDPR rights guide</a>.</p>
          </div>
        </section>
      </div>
    </div>
  `;
}

function buildSignupContent() {
  return `
    <img src="/assets/images/overlay-logo.webp" class="welcome-overlay-logo" alt="Home Cake" />

    <p class="hc-overlay__eyebrow">A little something for you</p>
    <h2 id="hc-overlay-title" class="hc-overlay__title">Welcome to Home Cake</h2>

    <p class="hc-overlay__description">Join our community and enjoy <strong>10% off your first order.</strong></p>

    <form class="hc-overlay-form" novalidate>
      <label class="hc-overlay-form__label" for="hc-welcome-email">Your email address</label>
      <div class="hc-overlay-form__field">
        ${ICONS.mail}
        <input
          id="hc-welcome-email"
          type="email"
          class="hc-overlay-form__input"
          placeholder="Enter your email address"
          autocomplete="email"
          aria-label="Email address"
          data-error-anchor=".hc-overlay-form__field"
          required
        />
      </div>
      <div class="hc-overlay-form__alert" aria-hidden="true"></div>

      <div class="hc-overlay-form__terms">
        <input id="hc-welcome-terms" type="checkbox" required data-error-anchor=".hc-overlay-form__terms" />
        <div>
          <label for="hc-welcome-terms">I accept the</label>
          <button class="hc-overlay__terms-link" type="button" aria-haspopup="dialog" aria-controls="hc-terms-dialog">Data Processing Terms</button>
          <span>and <a class="hc-overlay__terms-link" href="/privacy-policy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a></span>    
        </div>    
      </div>

      <button type="submit" class="hc-overlay-form__button">
        <span class="hc-overlay-form__button-label">Claim my 10% discount</span>
        <span aria-hidden="true"><img width="50px" src="/assets/images/button-rght-arrow.webp" alt="" loading="lazy" decoding="async"></span>
      </button>
    </form>

    <p class="hc-overlay__privacy">Freshly baked updates only. Unsubscribe whenever you like.</p>

    <button class="hc-overlay__dismiss" type="button" data-hc-dismiss>No thanks</button>
  `;
}

function buildVoucherContent() {
  return `
    <button class="hc-overlay__close" type="button" aria-label="Close" data-hc-dismiss>×</button>

    <div class="hc-gift-icon" aria-hidden="true">${ICONS.gift}</div>

    <h2 id="hc-overlay-title" class="hc-overlay__title">Your 10% Discount Is Ready!</h2>

    <p class="hc-overlay__description">Use this code at checkout:</p>

    <div class="hc-voucher__welcome">
      <span class="hc-voucher-code__welcome">${VOUCHER_CODE}</span>
      <button type="button" class="hc-voucher__copy">
        ${ICONS.copy}
        <span>Copy</span>
      </button>
    </div>

    <a href="/shop/all" class="hc-success-button">Continue Shopping 
      <span>
        <img width="50px" src="../assets/images/button-rght-arrow.webp" alt="Right arrow">
      </span>
    </a>

    <p class="hc-overlay__privacy">A little something to make your next celebration even sweeter.</p>    

    <button class="hc-overlay__dismiss" type="button" data-hc-dismiss>No thanks</button>
  `;
}

function initialiseSignupEvents() {
  const overlay = document.querySelector(".hc-overlay");

  overlay.querySelectorAll("[data-hc-dismiss]").forEach((el) => el.addEventListener("click", dismissOverlay));

  const form = overlay.querySelector(".hc-overlay-form");
  const input = overlay.querySelector(".hc-overlay-form__input");
  const termsCheckbox = overlay.querySelector("#hc-welcome-terms");
  const termsLink = overlay.querySelector(".hc-overlay__terms-link");
  const termsDialog = overlay.querySelector(".hc-terms-dialog");
  const termsContent = overlay.querySelector(".hc-terms-dialog__content");
  const alert = initAlert(overlay.querySelector(".hc-overlay-form__alert"));
  const showAlert = (message) => {
    alert.show(message);
  };

  const closeTerms = () => {
    termsDialog.hidden = true;
    overlay.querySelector(".hc-overlay__modal").removeAttribute("aria-hidden");
    overlay.setAttribute("aria-modal", "true");
    termsLink.focus();
  };

  termsLink.addEventListener("click", () => {
    termsDialog.hidden = false;
    overlay.querySelector(".hc-overlay__modal").setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-modal", "false");
    termsDialog.querySelector(".hc-terms-dialog__close").focus();
    termsContent.scrollTop = 0;
  });
  termsDialog.querySelector(".hc-terms-dialog__close").addEventListener("click", closeTerms);
  termsDialog.querySelector(".hc-terms-dialog__backdrop").addEventListener("click", closeTerms);
  termsDialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeTerms();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [
      ...termsDialog.querySelectorAll('button:not(.hc-terms-dialog__backdrop), a[href], [tabindex="0"]'),
    ].filter((element) => !element.disabled);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  termsCheckbox.addEventListener("change", () => {
    if (termsCheckbox.checked) {
      clearFieldError(termsCheckbox);
    }
  });

  input.addEventListener("input", () => {
    if (isValidEmail(input.value)) {
      clearFieldError(input);
    }
  });

  input.addEventListener("blur", () => {
    if (input.value && !isValidEmail(input.value)) {
      showFieldError(input, "Please enter a valid email address.");
    }
  });

  form.addEventListener("submit", (event) => handleNewsletterSignup(event, input, termsCheckbox, showAlert));
}

function isValidEmail(value) {
  return EMAIL_REGEX.test((value || "").trim());
}

function dismissOverlay() {
  closeOverlay();
}

async function handleNewsletterSignup(event, input, termsCheckbox, showAlert) {
  event.preventDefault();

  if (!termsCheckbox.checked) {
    showFieldError(termsCheckbox, "Please accept the Terms & Conditions to continue.");
    termsCheckbox.focus();
    return;
  }

  const email = input.value.trim();

  if (!isValidEmail(email)) {
    showFieldError(input, "Please enter a valid email address.");
    input.focus();
    return;
  }

  clearFieldError(input);

  const submitButton = event.target.querySelector('button[type="submit"]');
  const buttonLabel = submitButton.querySelector(".hc-overlay-form__button-label");
  const originalLabel = buttonLabel.textContent;

  try {
    submitButton.disabled = true;
    buttonLabel.textContent = "Sending…";

    await subscribeToNewsletter(email);

    showVoucherScreen();
  } catch (error) {
    showAlert(error.message || "Something went wrong. Please try again.");
    submitButton.disabled = false;
    buttonLabel.textContent = originalLabel;
  }
}

function showVoucherScreen() {
  const overlay = document.querySelector(".hc-overlay");
  const modal = overlay.querySelector(".hc-overlay__modal");

  // Stored now so the cart/checkout pages can auto-apply it later, even if
  // the customer never clicks "Copy" or navigates away without shopping
  // right this moment.
  storePendingVoucher(VOUCHER_CODE);

  modal.outerHTML = `
    <div class="hc-overlay__modal">
      <div class="hc-overlay__image-panel">
        <img class="hc-overlay__image" src="/assets/images/welcome-overlay-code.webp" alt="" />
      </div>
      <div class="hc-overlay__content-panel">
        ${buildVoucherContent()}
      </div>
    </div>
  `;

  overlay.querySelectorAll("[data-hc-dismiss]").forEach((el) => el.addEventListener("click", dismissOverlay));

  const copyButton = overlay.querySelector(".hc-voucher__copy");

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(VOUCHER_CODE);
    } catch (error) {
      // Clipboard API can be unavailable (older browsers, insecure context)
      // — the code is still visible and selectable, so this isn't fatal.
    }

    copyButton.innerHTML = `${ICONS.check}<span>Copied</span>`;
    copyButton.classList.add("is-copied");

    setTimeout(() => {
      copyButton.innerHTML = `${ICONS.copy}<span>Copy</span>`;
      copyButton.classList.remove("is-copied");
    }, 2000);
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeOverlay();
  }
});
