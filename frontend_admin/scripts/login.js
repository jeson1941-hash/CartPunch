lucide.createIcons();

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
const auth = firebase.auth();

// Check if already logged in
auth.onAuthStateChanged(user => {
    if (user) {
        window.location.href = 'Admin.html';
    }
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');
    const errorDiv = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');

    btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i><span>Signing in...</span>';
    lucide.createIcons();
    errorDiv.classList.add('hidden');

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Success, the onAuthStateChanged will trigger and redirect
        })
        .catch((error) => {
            errorDiv.classList.remove('hidden');
            errorText.textContent = error.message;
            btn.innerHTML = '<span>Sign In</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
            lucide.createIcons();
        });
});

function togglePassword() {
    const pwdInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eye-icon');
    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        eyeIcon.setAttribute('data-lucide', 'eye-off');
    } else {
        pwdInput.type = 'password';
        eyeIcon.setAttribute('data-lucide', 'eye');
    }
    lucide.createIcons();
}
