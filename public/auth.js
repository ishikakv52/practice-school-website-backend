const tabs = document.querySelectorAll(".tab");
const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");
const statusBox = document.querySelector("#status");
const logoutButton = document.querySelector("#logout");

function showStatus(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`;
}

function switchView(view) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  loginForm.classList.toggle("hidden", view !== "login");
  signupForm.classList.toggle("hidden", view !== "signup");
  showStatus();
}

tabs.forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));

async function submitAuth(url, form) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(Object.fromEntries(new FormData(form))),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || "Something went wrong");
  return result.data.user;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showStatus("Signing you in...");
  try {
    const user = await submitAuth("/api/auth/login", loginForm);
    showStatus(`Welcome back, ${user.name}. You are signed in as ${user.role}.`, "success");
    logoutButton.classList.remove("hidden");
  } catch (error) {
    showStatus(error.message, "error");
  }
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showStatus("Creating your account...");
  try {
    const user = await submitAuth("/api/auth/signup", signupForm);
    showStatus(`Account created. Welcome, ${user.name}.`, "success");
    logoutButton.classList.remove("hidden");
    signupForm.reset();
  } catch (error) {
    showStatus(error.message, "error");
  }
});

logoutButton.addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  logoutButton.classList.add("hidden");
  showStatus("You have been logged out.", "success");
});
