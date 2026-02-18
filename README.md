# PillTime - Medication Tracker

PillTime is a web app I built to help people remember to take their medicine and keep their family or caretakers in the loop. It has a clean interface where you can track your medications, see your progress, and set up alerts if you miss a dose.

## User Roles

The app is divided into two main roles, each with its own dashboard:

### 👤 The Patient
This is the person on medication. Their dashboard is built for ease of use:
- **Daily View**: See exactly what pills to take today(or any date) and at what time.
- **Check-off**: Mark dose as "Taken" with a single click.
- **Wellness Center**: Get daily health tips and see their current medication streak.
- **Photo Logs**: Upload a quick photo of their medicine intake if needed for reference.
- **Progress**: A calendar view to see their own history (Green/Red days).

### 👨‍⚕️ The Caretaker
This is the person looking after the patient (family member, nurse, etc.). They have control over the schedule:
- **Manage Schedule**: Add new medications, set dosages, and pick specific dates or daily routines.
- **Monitoring**: See the patient's real-time adherence rate and current streak.
- **Notifications**: Set up their own email to receive "Missed Medication" alerts.
- **Control**: Edit or delete medications if the doctor's advice changes.

## Features

### 💊 Managing Medications
- **Add Medicines**: Quickly add your medications with the dose, timing, and any special instructions.
- **Flexible Scheduling**:
  - Set specific dates for one-off medications.
  - **Multi-Date Picker**: Select several dates at once for a single entry.
  - Leave the date blank if you need to schedule it for today.
- **Add & Delete**: You can easily change or remove entries if your prescription changes.

### 📅 The Calendar
- **Monthly View**: See your whole month's history at a glance.
- **Day-by-Day**: Click on any date to see exactly what you need to take that day.
- **History Tracking**: The calendar marks days in Green (all taken) or Red (missed) so you can see your history.

### 📊 Dashboard & Progress
- **Today's Stats**: See exactly how many doses you've taken today and what's left.
- **Streak Counter**: Keeps track of how many days in a row you've finished all your meds.
- **Adherence Rate**: Shows your percentage of completed doses over the last 30 days.
- **Visual Progress**: Simple progress bars to see where you stand.

### 🔔 Reminders & Alerts
- **Time Alerts**: Reminders pop up based on the specific times you set.
- **Missed Dose Alerts**: The system tracks if you haven't checked off a dose on time.
- **Caretaker Check-ins**: Caretakers can set a daily time to receive alert.

### 📧 Caretaker Notifications
- **Email Setup**: Add a caretaker's email to the profile.
- **Automatic Alerts**: If a patient skips a dose, an email is automatically sent to the caretaker.
- **Daily Summaries**: Optional daily status updates for the caretaker.

### 👤 Profiles
- **Login/Signup**: Simple and secure access for patients and caretakers.

## Tech Stack

I used the following tools to built this:
- **React 19 & TypeScript**: For the core frontend logic.
- **Tailwind CSS**: For all the styling and layout.
- **Supabase**: Handles the database, user logins, and stores the medication logs.
- **Lucide React**: For the simple, clean icons throughout the app.
- **date-fns**: Used for all the calendar math and formatting dates.
- **TanStack Query**: For efficient data fetching and sync.

## Getting Started

### Prerequisites
- You'll need Node.js installed on your machine.
- A Supabase account to host your data.

### Installation

1. Copy the code:
   ```bash
   git clone https://github.com/mahi-manish/pill-time.git
   cd pill-time
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run it locally:
   ```bash
   npm run dev
   ```

## Usage
1. **Log In**: Create an account and set your name.
2. **Add Meds**: Go to the schedule section and list your medications.
3. **Check the Calendar**: Use the dashboard to see what's due today and mark them as "Taken".
4. **Link a Caretaker**: Add an email in settings if you want someone else to get alerts.

## License
Personal. Use it however you want.
