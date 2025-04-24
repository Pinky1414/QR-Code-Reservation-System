// JavaScript source code
const allTimeSlots = [
    "8AM-9AM", "9AM-10AM", "10AM-11AM", "11AM-12PM",
    "12PM-1PM", "1PM-2PM", "2PM-3PM", "3PM-4PM", "4PM-5PM",
    "5PM-6PM", "6PM-7PM", "7PM-8PM", "8PM-9PM"
];

function closeTimeSlotModal() {
    document.getElementById("timeSlotModal").style.display = "none";
}

function reserveSlot(date, slot) {
    const name = prompt("Enter your full name:");
    const email = prompt("Enter your email:");
    const reason = document.getElementById("reservationReason").value;
    if (!name || !email) return;

    //Make Reservations 
    fetch("http://localhost:3000/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, date, time_slot: slot, reason })
    })
        .then(res => res.json())
        .then(data => {
            alert("Reservation successful!");
            closeTimeSlotModal();
            location.reload();
        })
        .catch(err => {
            alert("Error making reservation: " + err.message);
        });
}

function selectDate(date) {
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
                btn.className = "time-slot-btn";

                if (isReserved || isAdminBlocked) {
                    btn.classList.add("disabled");
                    btn.disabled = true;
                } else {
                    btn.onclick = () => reserveSlot(date, slot);
                }

                container.appendChild(btn);
            });

            document.getElementById("timeSlotModal").style.display = "flex";
        });
}


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

                    const timeOrder = [
                        "8AM-9AM", "9AM-10AM", "10AM-11AM", "11AM-12PM",
                        "12PM-1PM", "1PM-2PM", "2PM-3PM", "3PM-4PM",
                        "4PM-5PM", "5PM-6PM", "6PM-7PM", "7PM-8PM", "8PM-9PM"
                    ];

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
            const selectedDate = info.dateStr;
            const today = new Date().toISOString().split("T")[0];
            if (selectedDate <= today) {
                alert("Same-day and past reservations are not allowed.");
                return;
            }
            selectDate(selectedDate);
        }
    });

    calendar.render();
});