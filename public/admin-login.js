// JavaScript source code
// Code for Admin Login
async function adminLogin() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const response = await fetch("http://localhost:3000/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
        localStorage.setItem("token", data.token);  // Store the token
        window.location.href = "admin.html";  // Redirect to the admin panel
    } else {
        document.getElementById("errorMsg").textContent = data.error;
    }
}
