const allTimeSlots = [
    "8AM-9AM", "9AM-10AM", "10AM-11AM", "11AM-12PM",
    "12PM-1PM", "1PM-2PM", "2PM-3PM", "3PM-4PM", "4PM-5PM",
    "5PM-6PM", "6PM-7PM", "7PM-8PM", "8PM-9PM"
];

let selectedDate = null;
let selectedSlots = [];

function closeTimeSlotModal() {
    document.getElementById("timeSlotModal").style.display = "none";
    selectedSlots = [];
}

function reserveSlotsBatch(date, name, email, reason) {
    const promises = selectedSlots.map(slot => {
        return fetch("http://localhost:3000/reserve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, date, time_slot: slot, reason })
        });
    });

    Promise.all(promises)
        .then(() => {
            alert("Reservation(s) successful!");
            closeTimeSlotModal();
            document.getElementById("userInfoForm").reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById("userInfoModal"));
            modal.hide();
            location.reload();
        })
        .catch(err => {
            alert("Error making reservations: " + err.message);
        });
}

function selectDate(date) {
    selectedDate = date;
    selectedSlots = [];

    fetch(`http://localhost:3000/reservations-by-date?date=${date}`)
        .then(res => res.json())
        .then(data => {
            const reserved = data.map(res => ({
                slot: res.time_slot,
                reason: res.reason,
            }));

            const container = document.getElementById("timeSlotContainer");
            container.innerHTML = "";
            document.getElementById("modalDate").textContent = `Available Time Slots for ${date}`;

            allTimeSlots.forEach(slot => {
                const isReserved = reserved.some(r => r.slot === slot);
                const isAdminBlocked = reserved.some(r => r.slot === slot && r.reason === "admin");

                const btn = document.createElement("button");
                btn.textContent = slot;
                btn.className = "btn btn-outline-primary";

                if (isReserved || isAdminBlocked) {
                    btn.classList.add("disabled", "btn-secondary");
                    btn.disabled = true;
                } else {
                    btn.onclick = () => {
                        if (selectedSlots.includes(slot)) {
                            selectedSlots = selectedSlots.filter(s => s !== slot);
                            btn.classList.remove("active");
                        } else {
                            selectedSlots.push(slot);
                            btn.classList.add("active");
                        }
                    };
                }

                container.appendChild(btn);
            });

            document.getElementById("timeSlotModal").style.display = "flex";
        });
}

document.getElementById("submitTimeSlotsBtn").addEventListener("click", () => {
    if (selectedSlots.length === 0) {
        alert("Please select at least one time slot.");
        return;
    }

    const reason = document.getElementById("reservationReason").value;
    if (reason === "") {
        alert("Please select a reason.");
        return;
    }

    // Show name/email modal
    const modal = new bootstrap.Modal(document.getElementById("userInfoModal"));
    modal.show();
});

document.getElementById("userInfoForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("userName").value.trim();
    const email = document.getElementById("userEmail").value.trim();
    const reason = document.getElementById("reservationReason").value;

    if (!name || !email) {
        alert("Please enter both your name and email.");
        return;
    }

    reserveSlotsBatch(selectedDate, name, email, reason);
});


document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        themeSystem: 'bootstrap5',
        initialView: 'dayGridMonth',
        selectable: true,
        events: function (fetchInfo, successCallback, failureCallback) {
            fetch("http://localhost:3000/public-reservations")
                .then(res => res.json())
                .then(data => {
                    const grouped = {};
                    data.forEach(res => {
                        const key = `${res.date}__${res.name}`;
                        if (!grouped[key]) grouped[key] = [];
                        grouped[key].push(res.time_slot);
                    });

                    const timeOrder = allTimeSlots;

                    const concatEvents = [];
                    for (const key in grouped) {
                        const [date, name] = key.split("__");
                        const slots = grouped[key].sort((a, b) => timeOrder.indexOf(a) - timeOrder.indexOf(b));

                        let block = [];
                        slots.forEach((slot, i) => {
                            const currentIndex = timeOrder.indexOf(slot);
                            const prevIndex = block.length ? timeOrder.indexOf(block[block.length - 1]) : -2;

                            if (currentIndex === prevIndex + 1) {
                                block.push(slot);
                            } else {
                                if (block.length > 0) {
                                    concatEvents.push({
                                        title: `${block[0]} - ${block[block.length - 1]} - ${name}`,
                                        start: date,
                                        allDay: true,
                                        backgroundColor: name === 'admin' ? '#6c757d' : '',
                                        borderColor: name === 'admin' ? '#6c757d' : '',
                                        textColor: name === 'admin' ? 'white' : ''
                                    });
                                }
                                block = [slot];
                            }

                            if (i === slots.length - 1 && block.length > 0) {
                                concatEvents.push({
                                    title: `${block[0]} - ${block[block.length - 1]} - ${name}`,
                                    start: date,
                                    allDay: true,
                                    backgroundColor: name === 'admin' ? '#6c757d' : '',
                                    borderColor: name === 'admin' ? '#6c757d' : '',
                                    textColor: name === 'admin' ? 'white' : ''
                                });
                            }
                        });
                    }
                    successCallback(concatEvents);
                })
                .catch(error => failureCallback(error));
        },
        dateClick: function (info) {
            const dateStr = info.dateStr;
            const todayStr = new Date().toISOString().split("T")[0];
            if (dateStr <= todayStr) {
                alert("Same-day and past reservations are not allowed.");
                return;
            }
            selectDate(dateStr);
        }
    });

    calendar.render();
});
