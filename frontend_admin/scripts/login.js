// 1. Firebase Configuration & Initialization
const firebaseConfig = {
    apiKey: "AIzaSyAnpeLs7fpfkWIxdlqttvd9N_kQM1fss0E",
    authDomain: "cartpunch-a2267.firebaseapp.com",
    databaseURL: "https://cartpunch-a2267-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cartpunch-a2267",
    storageBucket: "cartpunch-a2267.firebasestorage.app",
    messagingSenderId: "413542821283",
    appId: "1:413542821283:web:3bb97cdb6f8b54e774fe16",
    measurementId: "G-85ZWVTWG67"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 2. Initialize EmailJS
const EMAILJS_PUBLIC_KEY = "IMe8nVqxdPtnxetW0";
const EMAILJS_SERVICE_ID = "service_wvjz4b8";
const EMAILJS_TEMPLATE_ID = "template_5avmab9";
if (typeof emailjs !== "undefined") {
    emailjs.init(EMAILJS_PUBLIC_KEY);
} else {
    console.warn("EmailJS SDK not loaded yet.");
}

// Render Lucide Icons on page load
if (typeof lucide !== "undefined") {
    lucide.createIcons();
}

// Password show/hide toggle
function togglePassword() {
    const passwordInput = document.getElementById("password");
    const eyeIcon = document.getElementById("eye-icon");
    if (!passwordInput) return;

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        if (eyeIcon) eyeIcon.setAttribute("data-lucide", "eye-off");
    } else {
        passwordInput.type = "password";
        if (eyeIcon) eyeIcon.setAttribute("data-lucide", "eye");
    }
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
}

// Clear any previous 2FA session when landing on Login.html
sessionStorage.removeItem("cartpunch_2fa_verified");

const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const loginBtnText = document.getElementById("login-btn-text");
const loginSubtitle = document.getElementById("login-subtitle");

const otpSection = document.getElementById("otp-section");
const otpInfo = document.getElementById("otp-info");
const otpInput = document.getElementById("otp-input");
const verifyOtpBtn = document.getElementById("verify-otp-btn");
const verifyBtnText = document.getElementById("verify-btn-text");
const resendOtpBtn = document.getElementById("resend-otp-btn");
const backToLoginBtn = document.getElementById("back-to-login-btn");

const errorBanner = document.getElementById("error-message");
const errorText = document.getElementById("error-text");

let pendingUser = null;

function showBanner(message, isSuccess = false) {
    errorText.textContent = message;
    errorBanner.classList.remove("hidden", "bg-rose-50", "text-rose-600", "border-rose-100", "bg-emerald-50", "text-emerald-700", "border-emerald-200");
    if (isSuccess) {
        errorBanner.classList.add("bg-emerald-50", "text-emerald-700", "border-emerald-200");
    } else {
        errorBanner.classList.add("bg-rose-50", "text-rose-600", "border-rose-100");
    }
}

function hideBanner() {
    errorBanner.classList.add("hidden");
}

// Generate 6-digit code, store in Firebase RTDB, and email it via EmailJS
async function sendOtpCode(user) {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // 1. Try to save to Firebase RTDB, but catch permission errors
    try {
        await firebase.database().ref(`admin_otp/${user.uid}`).set({
            code: otpCode,
            expiresAt: expiresAt
        });
    } catch (dbErr) {
        console.warn("RTDB write warning (falling back to sessionStorage):", dbErr);
    }
    // Also save in sessionStorage as a dependable fallback
    sessionStorage.setItem("cartpunch_pending_otp", JSON.stringify({
        uid: user.uid,
        code: otpCode,
        expiresAt: expiresAt
    }));

    // 2. Send the email with EmailJS
    if (typeof emailjs === "undefined") {
        throw new Error("EmailJS library could not be loaded. Check your internet connection.");
    }

    const templateParams = {
        email: user.email,
        to_email: user.email,
        user_email: user.email,
        otp_code: otpCode,
        passcode: otpCode,
        code: otpCode
    };

    return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
}

// Step A: Verify Email + Password first
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideBanner();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginBtn.disabled = true;
    loginBtnText.textContent = "Signing in...";

    try {
        const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
        pendingUser = cred.user;

        loginBtnText.textContent = "Sending 2FA Code...";
        await sendOtpCode(pendingUser);

        // Switch UI from password form to 6-digit OTP box
        loginForm.classList.add("hidden");
        otpSection.classList.remove("hidden");
        loginSubtitle.textContent = "Two-Factor Authentication";
        otpInfo.textContent = `We sent a 6-digit verification code to ${pendingUser.email}. It expires in 5 minutes.`;
        otpInput.value = "";
        otpInput.focus();

        if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
    } catch (err) {
        console.error("Login / 2FA error:", err);
        showBanner(err.text || err.message || "Login failed. Check your credentials.");
    } finally {
        loginBtn.disabled = false;
        loginBtnText.textContent = "Sign In";
    }
});

// Step B: Verify the 6-digit OTP code
verifyOtpBtn.addEventListener("click", async () => {
    hideBanner();
    const enteredCode = otpInput.value.trim();

    if (!pendingUser || enteredCode.length !== 6) {
        showBanner("Please enter the 6-digit code sent to your email.");
        return;
    }

    verifyOtpBtn.disabled = true;
    verifyBtnText.textContent = "Verifying...";

    try {
        let record = null;

        // Try reading from Firebase RTDB first
        try {
            const otpRef = firebase.database().ref(`admin_otp/${pendingUser.uid}`);
            const snap = await otpRef.once("value");
            record = snap.val();
        } catch (dbErr) {
            console.warn("Could not read from RTDB, checking fallback session:", dbErr);
        }

        // Fallback to local session if RTDB failed
        if (!record) {
            try {
                const sessionRaw = sessionStorage.getItem("cartpunch_pending_otp");
                if (sessionRaw) {
                    const parsed = JSON.parse(sessionRaw);
                    if (parsed.uid === pendingUser.uid) {
                        record = parsed;
                    }
                }
            } catch (e) { }
        }

        if (!record) {
            showBanner("No active code found. Click Resend Code.");
            return;
        }

        if (Date.now() > record.expiresAt) {
            try { await firebase.database().ref(`admin_otp/${pendingUser.uid}`).remove(); } catch (e) { }
            sessionStorage.removeItem("cartpunch_pending_otp");
            showBanner("Code expired. Click Resend Code for a new one.");
            return;
        }

        if (enteredCode !== record.code) {
            showBanner("Incorrect verification code. Try again.");
            return;
        }

        // Success: clean up code, mark 2FA verified in session, and redirect to Admin.html
        try { await firebase.database().ref(`admin_otp/${pendingUser.uid}`).remove(); } catch (e) { }
        sessionStorage.removeItem("cartpunch_pending_otp");
        sessionStorage.setItem("cartpunch_2fa_verified", pendingUser.uid);
        window.location.replace("Admin.html");
    } catch (err) {
        console.error("OTP verification error:", err);
        showBanner("Verification error: " + (err.message || "Please try again."));
    } finally {
        verifyOtpBtn.disabled = false;
        verifyBtnText.textContent = "Verify & Access Dashboard";
    }
});

// Resend OTP button
resendOtpBtn.addEventListener("click", async () => {
    if (!pendingUser) return;
    hideBanner();
    resendOtpBtn.disabled = true;
    resendOtpBtn.textContent = "Sending...";

    try {
        await sendOtpCode(pendingUser);
        showBanner(`A new 6-digit code was sent to ${pendingUser.email}.`, true);
    } catch (err) {
        showBanner("Could not resend code: " + (err.text || err.message));
    } finally {
        resendOtpBtn.disabled = false;
        resendOtpBtn.textContent = "Resend Code";
    }
});

// Back to login button
backToLoginBtn.addEventListener("click", async () => {
    hideBanner();
    sessionStorage.removeItem("cartpunch_2fa_verified");
    await firebase.auth().signOut();
    pendingUser = null;
    otpSection.classList.add("hidden");
    loginForm.classList.remove("hidden");
    loginSubtitle.textContent = "Please sign in to access the dashboard";
});