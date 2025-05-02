const timeSlots = [
    "8AM-9AM", "9AM-10AM", "10AM-11AM", "11AM-12PM",
    "12PM-1PM", "1PM-2PM", "2PM-3PM", "3PM-4PM", "4PM-5PM",
    "5PM-6PM", "6PM-7PM", "7PM-8PM", "8PM-9PM"
];

document.addEventListener("DOMContentLoaded", () => {
    const timeSlotContainer = document.getElementById("timeSlotButtons");

    timeSlots.forEach(slot => {
        const label = document.createElement("label");
        label.classList.add("btn", "btn-outline-primary", "mb-1");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "time";
        checkbox.value = slot;
        checkbox.classList.add("btn-check");

        const id = `slot-${slot.replace(/[^a-zA-Z0-9]/g, "")}`;
        checkbox.id = id;
        label.setAttribute("for", id);
        label.textContent = slot;

        timeSlotContainer.appendChild(checkbox);
        timeSlotContainer.appendChild(label);
    });

    document.getElementById("reservationForm").addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const date = document.getElementById("date").value;
        const reason = document.getElementById("reason").value;

        const timeSlotCheckboxes = document.querySelectorAll('input[name="time"]:checked');
        const time_slots = Array.from(timeSlotCheckboxes).map(cb => cb.value);

        const message = document.getElementById("message");

        if (!name || !email || !date || time_slots.length === 0 || !reason) {
            message.textContent = "All fields are required and at least one time slot must be selected!";
            message.style.color = "red";
            return;
        }

        try {
            const requests = time_slots.map(slot => {
                return fetch("http://localhost:3000/reserve", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, date, time_slot: slot, reason })
                });
            });

            const responses = await Promise.all(requests);
            const results = await Promise.all(responses.map(r => r.json()));
            const hasError = results.some(res => res.error);

            if (hasError) {
                const errorMsg = results.find(res => res.error)?.error || "One or more reservations failed.";
                throw new Error(errorMsg);
            }

            message.textContent = "Reservation(s) submitted!";
            message.style.color = "green";
            document.getElementById("reservationForm").reset();
            document.querySelectorAll(".btn-check").forEach(cb => cb.checked = false);

        } catch (error) {
            console.error("Reservation error:", error);
            message.textContent = error.message || "Error connecting to server!";
            message.style.color = "red";
        }
    });
});