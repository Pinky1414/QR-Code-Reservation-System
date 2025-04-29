console.log("admin.js loaded");

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Unauthorized! Please log in.");
        window.location.href = "admin-login.html";
    } else {
        showLoading();
        fetchReservations(token);
        renderBlackoutTimeCheckboxes();
        loadBlackoutDates();
    }

    if (localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark-mode");
    }
});

function showLoading() {
    document.getElementById("loadingOverlay").style.display = "flex";
}

function hideLoading() {
    document.getElementById("loadingOverlay").style.display = "none";
}

function openModal(context, message, onConfirm) {
    const modal = document.getElementById("confirmationModal");
    document.getElementById("confirmationMessage").textContent = message;
    const confirmButton = document.getElementById("confirmAction");

    modal.setAttribute("data-context", context);
    confirmButton.onclick = () => {
        onConfirm();
        closeModal();
    };

    modal.style.display = "block";
}

function closeModal() {
    document.getElementById("confirmationModal").style.display = "none";
}

function closeBlackoutModal() {
    document.getElementById("blackoutModal").style.display = "none";
}

function fetchReservations(token) {
    fetch("http://localhost:3000/reservations", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => {
            window.reservationData = data; // Save globally for filtering
            displayReservations(data);
        })
        .catch(err => alert("Error fetching reservations: " + err))
        .finally(() => hideLoading());
}

function displayReservations(reservations) {
    const table = document.getElementById("reservationsTable");
    table.innerHTML = "";

    reservations.forEach(res => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${res.name}</td>
            <td>${res.email}</td>
            <td>${res.date}</td>
            <td>${res.time_slot}</td>
            <td>${res.reason || "NA"}</td>
            <td class="status">${res.status}</td>
            <td>
                <button onclick="showConfirmation(${res.id}, 'approved')">Approve</button>
                <button onclick="showConfirmation(${res.id}, 'denied')">Deny</button>
                <button onclick="confirmDeleteReservation(${res.id})">Delete</button>
            </td>`;
        table.appendChild(row);
    });
}

function showConfirmation(id, status) {
    openModal('reservation', `Are you sure you want to mark this reservation as ${status}?`, () => updateReservation(id, status));
}

function updateReservation(id, status) {
    const token = localStorage.getItem("token");

    fetch(`http://localhost:3000/reservations/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status })
    })
        .then(res => res.json())
        .then(() => fetchReservations(token))
        .catch(err => alert("Error updating reservation: " + err))
        .finally(() => hideLoading());
}

function confirmDeleteReservation(id) {
    openModal('delete', "Are you sure you want to delete this reservation?", () => deleteReservation(id));
}

function deleteReservation(id) {
    const token = localStorage.getItem("token");

    fetch(`http://localhost:3000/delete-reservation/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    })
        .then(() => fetchReservations(token))
        .catch(err => alert("Failed to delete reservation."));
}

function sortReservations() {
    const tableBody = document.getElementById("reservationsTable");
    const rows = Array.from(tableBody.rows);

    rows.sort((a, b) => {
        const dateA = new Date(a.cells[2].textContent);
        const dateB = new Date(b.cells[2].textContent);
        return dateA - dateB;
    });

    tableBody.innerHTML = "";
    rows.forEach(row => tableBody.appendChild(row));
}
function filterReservations() {
    const selectedStatus = document.getElementById("filterStatus").value;
    const selectedReason = document.getElementById("filterReason").value;
    const rows = document.querySelectorAll("#reservationsTable tr");

    rows.forEach(row => {
        const statusCell = row.querySelector(".status");
        const reasonCell = row.cells[4]; // 5th column = reason

        if (!statusCell || !reasonCell) return;

        const status = statusCell.textContent.toLowerCase();
        const reason = reasonCell.textContent.toLowerCase();

        const matchesStatus = selectedStatus === "all" || status === selectedStatus;
        const matchesReason = selectedReason === "all" || reason === selectedReason;

        row.style.display = (matchesStatus && matchesReason) ? "" : "none";
    });
}

const timeSlots = [
    "8AM-9AM", "9AM-10AM", "10AM-11AM", "11AM-12PM",
    "12PM-1PM", "1PM-2PM", "2PM-3PM", "3PM-4PM",
    "4PM-5PM", "5PM-6PM", "6PM-7PM", "7PM-8PM", "8PM-9PM"
];

function renderBlackoutTimeCheckboxes() {
    const container = document.getElementById("blackoutTimeSlotList");
    container.innerHTML = "";
    timeSlots.forEach(slot => {
        const label = document.createElement("label");
        label.className = "time-slot-option";
        label.innerHTML = `<input type="checkbox" value="${slot}"> ${slot}`;
        container.appendChild(label);
    });
}

function openBlackoutModal(date) {
    if (!date) {
        alert("Please select a date first.");
        return;
    }
    renderBlackoutTimeCheckboxes();
    document.getElementById("blackoutModal").style.display = "block";
}

function submitBlackoutSelection() {
    const date = document.getElementById("blackoutDate").value;
    const selectedTimes = Array.from(document.querySelectorAll("#blackoutTimeSlotList input:checked"))
        .map(cb => cb.value);

    if (!date || selectedTimes.length === 0) {
        alert("Please select a date and at least one time slot.");
        return;
    }

    const blackoutReservations = selectedTimes.map(time =>
        fetch("http://localhost:3000/reserve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "admin",
                email: "admin@admin.com",
                date: date,
                time_slot: time,
                reason: "admin"
            })
        })
    );

    Promise.all(blackoutReservations)
        .then(() => {
            alert("Blackout time slots reserved successfully!");
            closeBlackoutModal();
            fetchReservations(localStorage.getItem("token"));
        })
        .catch(err => {
            console.error("Failed to create blackout reservations:", err);
            alert("An error occurred while creating blackout reservations.");
        });
}

function loadBlackoutDates() {
    fetchReservations(localStorage.getItem("token"));
}

document.getElementById("darkModeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
});
