require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

// ✅ CORS Enable
app.use(cors({
    origin: 'http://127.0.0.1:5500', // Apne frontend ka URL daalein
    methods: 'GET, POST',
    allowedHeaders: 'Content-Type, Authorization'
}));

// ✅ Zoom Credentials (from .env)
const CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_API_BASE = "https://api.zoom.us/v2";

// ✅ Email Configuration (from .env)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ✅ Generate Zoom OAuth Token
async function getZoomToken() {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    try {
        const response = await axios.post(
            `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ACCOUNT_ID}`,
            {},
            { headers: { Authorization: `Basic ${auth}` } }
        );
        return response.data.access_token;
    } catch (error) {
        console.error("❌ Error fetching Zoom Token:", error.response.data);
        return null;
    }
}

let latestMeeting = null;

// ✅ Create a Zoom Meeting
app.post('/create-meeting', async (req, res) => {
    const { patientEmail, scheduledTime } = req.body;
    try {
        const token = await getZoomToken();
        if (!token) return res.status(500).json({ error: 'Failed to get Zoom Token' });

        const response = await axios.post(
            `${ZOOM_API_BASE}/users/me/meetings`,
            {
                topic: "Doctor Consultation",
                type: 2,
                start_time: scheduledTime,
                duration: 30,
                settings: { host_video: true, participant_video: true }
            },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        latestMeeting = response.data;  // Store the latest meeting

        // ✅ Send email notification to patient
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: patientEmail, // Send to patient
            subject: 'Appointment Scheduled - Medi Robot',
            text: `Your video consultation is scheduled.
Join URL: ${latestMeeting.join_url}
Appointment Time: ${scheduledTime}`
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Email sent to:', patientEmail);

        res.json({ meeting_id: latestMeeting.id, join_url: latestMeeting.join_url, start_url: latestMeeting.start_url });
    } catch (error) {
        console.error("❌ Error creating Zoom meeting:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ✅ Start Call Route (Doctor's Link)
app.get('/start-call', (req, res) => {
    if (latestMeeting && latestMeeting.start_url) {
        res.redirect(latestMeeting.start_url);
    } else {
        res.status(404).send('No meeting found. Please schedule a meeting first.');
    }
});

// ✅ Join Call Route (Patient's Link)
app.get('/join-call', (req, res) => {
    if (latestMeeting && latestMeeting.join_url) {
        res.redirect(latestMeeting.join_url);
    } else {
        res.status(404).send('No meeting found. Please schedule a meeting first.');
    }
});

// ✅ Server Start
app.listen(3000, () => {
    console.log("🚀 Medi Robot Backend is Running! Use '/create-meeting' to create a Zoom meeting");
});
