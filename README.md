
<img src="https://github.com/rbouhal/murmur/blob/main/assets/icon.png" width="200px">

Murmur is a mobile safety application designed to enhance personal security through **voice-activated alerts**. The app allows users to set up **safe words**, which when spoken, trigger **automated SMS alerts** to designated contacts, including location data if enabled. 

## 🚀 Features

- **Voice-Activated Alerts** – Users can record **safe words** for different alert levels.
- **Active Listening** – Continuous monitoring for safe words using **Azure AI Speech services**.
- **Automated SMS Alerts** – Sends messages to emergency contacts via **email-to-SMS gateways**.
- **Location Sharing** – Includes a **Google Maps link** in alerts when enabled.
- **Secure Data Storage** – Uses **Expo-SQLite** to store user preferences and recordings.
- **Seamless Playback & Management** – Users can **re-record, play, and delete** their safe words.

## 📲 How It Works

1. **Set Up Safe Words** – Users record a **Red Flag** and **Emergency** safe word.
2. **Assign Emergency Contacts** – Add trusted contacts and categorize them under:
   - **🚨 Emergency** – Indicates immediate danger.
   - **⚠️ Red Flag** – Signals discomfort but no immediate threat.
3. **Enable Active Listening** – The app listens in the background for safe words.
4. **Trigger an Alert** – When a safe word is detected:
   - The app verifies the user's **voice identity**.
   - It sends an **SMS alert** to emergency contacts.
   - If location sharing is enabled, a **Google Maps link** is included.

## 📡 Technologies Used

- **React Native (Expo)** – Frontend framework.
- **Expo-SQLite** – Local storage for user data.
- **Azure AI Speech Services** – Voice recognition and text conversion.
- **Flask Backend** – Handles SMS alerts and API requests.
- **Email-to-SMS Gateway** – Sends SMS messages via email.
- **AsyncStorage** – Stores contacts and preferences.

