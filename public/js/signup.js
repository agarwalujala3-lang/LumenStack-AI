import { api, setFlash, setToken } from "./common.js";
import { initNebula, initRevealCards } from "./graphics.js";

initNebula();
initRevealCards();

const flashRoot = document.querySelector("#flash-root");
const signupForm = document.querySelector("#signup-form");
const phoneRequestForm = document.querySelector("#phone-request-form");
const phoneVerifyForm = document.querySelector("#phone-verify-form");
const phoneVerifyBlock = document.querySelector("#phone-verify-block");
const codeHint = document.querySelector("#code-hint");

let phoneChallengeId = "";

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(signupForm).entries());
  setFlash(flashRoot, "Creating account...");
  try {
    const response = await api("/api/auth/signup", {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload)
    });
    setToken(response.token);
    window.location.href = "/dashboard.html";
  } catch (error) {
    setFlash(flashRoot, error.message, "error");
  }
});

phoneRequestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(phoneRequestForm).entries());
  setFlash(flashRoot, "Sending phone code...");
  try {
    const response = await api("/api/auth/phone/request", {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload)
    });
    phoneChallengeId = response.challengeId;
    codeHint.textContent = response.delivery === "sms"
      ? "A verification code was sent to your phone."
      : response.testCode
        ? `Test code: ${response.testCode}`
        : "Verification challenge created.";
    phoneVerifyBlock.classList.remove("hidden");
    setFlash(flashRoot, response.message || "Phone code sent. Verify now.");
  } catch (error) {
    setFlash(flashRoot, error.message, "error");
  }
});

phoneVerifyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!phoneChallengeId) {
    setFlash(flashRoot, "Request a phone code first.", "error");
    return;
  }

  const payload = Object.fromEntries(new FormData(phoneVerifyForm).entries());
  payload.challengeId = phoneChallengeId;
  setFlash(flashRoot, "Verifying phone login...");
  try {
    const response = await api("/api/auth/phone/verify", {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload)
    });
    setToken(response.token);
    window.location.href = "/dashboard.html";
  } catch (error) {
    setFlash(flashRoot, error.message, "error");
  }
});
