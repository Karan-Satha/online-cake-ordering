import { login, logout, getCurrentAdmin } from "./api/authApi.js";
import { loadOrders } from "./orders.js";
import { loadProducts } from "./products.js";
import { loadCategories } from "./categories.js";
import { loadDashboard } from "./dashboard.js";
import { loadVouchers } from "./vouchers.js";

const loginView = document.querySelector("#login-view");
const dashboardView = document.querySelector("#dashboard-view");

const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");

const logoutButton = document.querySelector("#logout-button");

async function loadAdminData() {
  await Promise.all([loadOrders(), loadProducts(), loadDashboard(), loadCategories(), loadVouchers()]);
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
}

function showLogin() {
  loginView.hidden = false;
  dashboardView.hidden = true;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginError.textContent = "";

  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;

  try {
    await login(email, password);

    showDashboard();

    await loadAdminData();
  } catch (error) {
    loginError.textContent = error.message;
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await logout();

    showLogin();

    loginForm.reset();
  } catch (error) {
    console.error(error);
  }
});

async function initialiseAdmin() {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      showLogin();
      return;
    }

    showDashboard();

    await loadAdminData();
  } catch (error) {
    console.error(`Failed to initialise admin: ${error}`);

    showLogin();
  }
}

initialiseAdmin();
