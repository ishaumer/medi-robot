async function scheduleAppointment() {
    const email = document.getElementById('patientEmail').value;
    const time = document.getElementById('scheduledTime').value;
    if (!email || !time) {
        alert('Please enter all fields!');
        return;
    }
    const response = await fetch('http://localhost:3000/create-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientEmail: email, scheduledTime: time })
    });
    const data = await response.json();
    if (data.join_url) {
        alert('Appointment Scheduled! Check Email.');
        document.getElementById('patientEmail').value = '';
        document.getElementById('scheduledTime').value = '';
    } else {
        alert('Failed to Schedule.');
    }
}

document.getElementById("start-call").addEventListener("click", async function () {
    window.open('http://localhost:3000/start-call', '_blank');
});

document.getElementById("join-call").addEventListener("click", async function () {
    window.open('http://localhost:3000/join-call', '_blank');
});
