document.getElementById("reservationForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const date = document.getElementById("date").value;
    const time_slot = document.getElementById("time").value;
    const reason = document.getElementById("reason").value; 

    // Frontend validation
    if (!name || !email || !date || !time_slot || !reason) {
        document.getElementById("message").textContent = "All fields are required!";
        document.getElementById("message").style.color = "red";
        return;
    }
    console.log({ name, email, date, time_slot, reason });

    try {
        const response = await fetch("http://localhost:3000/reserve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, date, time_slot, reason })  
        });

        const data = await response.json();
        console.log("Server Response:", data);

        if (!response.ok) {
            throw new Error(data.message || "Reservation failed.");
        }

        // Display success message
        document.getElementById("message").textContent = data.message;
        document.getElementById("message").style.color = "green";

        // Optionally, clear form
        document.getElementById("reservationForm").reset();

    } catch (error) {
        console.error("Error:", error);
        document.getElementById("message").textContent = error.message || "Error connecting to server!";
        document.getElementById("message").style.color = "red";
    }
});