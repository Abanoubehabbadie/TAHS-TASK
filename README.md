# 📋 Tasky - Task Management System

A modern, real-time task management application with **two distinct user roles**: Task Senders and Task Receiver. Built with Firebase, JavaScript, HTML, and CSS.

## 🎯 System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    TASKY SYSTEM                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  TASK SENDERS                  TASK RECEIVER           │
│  (Multiple Users)              (Central Manager)        │
│  👤 Employee 1                 👨‍💼 Main Receiver         │
│  👤 Employee 2                 📧 Central Email        │
│  👤 Employee 3                                         │
│       ↓                                ↑               │
│    Send Tasks ──────────────→ View All Tasks          │
│    View Own Tasks ←────────── Send Notes/Actions     │
│    Track Progress ←────────── Complete Tasks         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## ✨ Features

### For Task Senders (Employees)
- 📝 **Create Tasks**: Send tasks to the central receiver
- 👁️ **View Own Tasks**: See only the tasks they created
- 📊 **Track Progress**: Monitor task status (Pending → In Progress → Completed)
- 💬 **Add Notes**: Send messages/instructions for the receiver
- 📱 **WhatsApp Notifications**: Remind receiver via WhatsApp

### For Task Receiver (Central Manager)
- 👀 **View All Tasks**: See every task from all senders
- ⚡ **Take Action**: Start and complete tasks
- 💬 **Send Notes**: Provide feedback or instructions to senders
- 📈 **Manage All Tasks**: Central dashboard showing all work
- 📊 **Track Completion**: Monitor completed vs pending tasks

## 🔑 Key Differences

| Feature | Sender | Receiver |
|---------|--------|----------|
| Create Tasks | ✅ Yes | ❌ No |
| View Own Tasks | ✅ Yes | ❌ - |
| View All Tasks | ❌ No | ✅ Yes |
| Take Task Action | ❌ No | ✅ Yes |
| Complete Tasks | ❌ No | ✅ Yes |
| Send Notes | ✅ Yes | ✅ Yes |
| Receive Updates | ✅ Real-time | ✅ Real-time |

## 🚀 Workflow Example

### Scenario: Support Ticket Processing

1. **Employee (Sender)**
   - Creates task: "Fix customer login issue"
   - Adds details: Description, priority, due date
   - Click "Send Task to Receiver"
   - Task appears in their dashboard (Pending)

2. **Task Receiver**
   - Sees new task on main dashboard
   - Reads the task details and sender's information
   - Clicks "Start Task" to begin work
   - Task status changes to "In Progress"

3. **Sender** (Real-time)
   - Sees task status updated to "In Progress"
   - Knows receiver is working on it

4. **Receiver** (While Working)
   - Can add notes/updates for the sender if needed
   - Click "Add Note" to send message
   - Sender receives the note in real-time

5. **Receiver** (Completion)
   - Completes the task
   - Adds completion notes (optional)
   - Click "Complete"
   - Task status: "Completed"

6. **Sender** (Final Update)
   - Sees task marked as "Completed"
   - Reads completion notes from receiver
   - Closes task

## 📋 Task Fields

### Task Information
- **Title**: What needs to be done (required)
- **Description**: Detailed explanation
- **Priority**: Low, Medium, or High
- **Due Date**: Deadline for completion
- **Phone**: Sender's contact for notifications

### Task Notes
- **Sender Notes**: Instructions/requests from sender
- **Receiver Notes**: Feedback/updates from receiver
- **Completion Notes**: Final notes when task is done

### Task Status
- 🔵 **Pending**: Waiting for receiver to start
- 🟡 **In Progress**: Receiver is working on it
- 🟢 **Completed**: Task is finished

## 🏗️ Architecture

### Frontend
- **HTML**: Semantic markup with responsive layout
- **CSS**: Modern styling with role-specific sections
- **JavaScript**: Real-time updates and role management

### Backend
- **Firebase Authentication**: Email/Password login for both roles
- **Firestore Database**: Real-time task synchronization
- **Role Detection**: Automatic role assignment based on email

### Automatic Role Assignment
```javascript
// Receiver (Central Manager)
Email: abnoob.kolta@bua.edu.eg → Role: RECEIVER

// All Other Accounts
Email: user@example.com → Role: SENDER
```

## 📊 Database Schema

### Users Collection
```
users/
├── {userId}/
│   ├── email: string
│   ├── phone: string (with country code)
│   ├── role: string (sender/receiver)
│   └── createdAt: timestamp
```

### Tasks Collection
```
tasks/
├── {taskId}/
│   ├── title: string (required)
│   ├── desc: string (description)
│   ├── priority: string (low/medium/high)
│   ├── status: string (pending/in progress/done)
│   ├── phone: string (sender's contact)
│   ├── dueDate: date (optional)
│   │
│   ├── createdBy: email (sender)
│   ├── createdByPhone: string
│   ├── assignedTo: email (MAIN_RECEIVER)
│   │
│   ├── senderNotes: string (notes from sender)
│   ├── receiverNotes: string (notes from receiver)
│   ├── completionNotes: string (notes at completion)
│   │
│   ├── dateCreated: timestamp
│   └── updatedAt: timestamp
```

## 🔧 Setup Instructions

### 1. Firebase Project Setup
- Go to [firebase.google.com](https://firebase.google.com)
- Create a new project
- Enable Firestore Database
- Enable Authentication (Email/Password)

### 2. Create Firestore Collections
Create these collections in Firestore:
- `users` - Store user profiles
- `tasks` - Store all tasks

### 3. Update Configuration
Edit `app.js` and set the central receiver email:
```javascript
const MAIN_RECEIVER = "abnoob.kolta@bua.edu.eg"; // Change this to your email
```

### 4. Update Firebase Config
In `app.js`, replace the Firebase configuration:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 5. Deploy to Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 📱 Usage Guide

### For Task Senders

**1. Sign Up**
- Click "Sign Up"
- Enter email, password, and phone number
- Create account

**2. Login**
- Enter email and password
- Dashboard appears with create task section

**3. Create Task**
- Fill in task title (required)
- Add description (optional)
- Select priority level
- Set due date (optional)
- Phone auto-filled from profile
- Click "Send Task to Receiver"

**4. Monitor Progress**
- View all tasks you created
- Filter by status (Pending, In Progress, Completed)
- See real-time updates as receiver works
- Add notes anytime

**5. Add Notes**
- Click "Add Note" button
- Send instructions or messages to receiver
- Notes appear in real-time

### For Task Receiver

**1. Login with Central Email**
- Use email: `abnoob.kolta@bua.edu.eg`
- All tasks automatically appear in dashboard

**2. View All Tasks**
- Dashboard shows every task from all senders
- Filter by status or priority
- Sort by date, priority, or due date

**3. Take Action**
- **Pending Tasks**: Click "Start Task"
  - Task moves to "In Progress"
  - Sender is notified

- **In Progress Tasks**: Click "Complete"
  - Add optional completion notes
  - Task moves to "Completed"

**4. Send Updates**
- Click "Add Note" while working on task
- Senders see notes in real-time
- Keep communication clear

**5. Send Notifications**
- Click "Notify" button
- Opens WhatsApp to contact sender
- Use for urgent updates

## 🔐 Security Features

### Authentication
- Email/Password authentication
- Secure login/logout
- Session management via Firebase

### Authorization
- Role-based access control
- Senders can only see their own tasks
- Receiver sees all tasks automatically
- Users can't modify other's tasks

### Data Protection
- Real-time synchronization
- Automatic timestamps
- Audit trail via Firestore

## 🎨 User Interface

### Sender Dashboard
```
Header: Email + 👤 Task Sender Badge
├── Create Task Section
│   └── Form to send new tasks
├── Filters & Sorting
│   ├── Sort: Recent, Priority, Due Date
│   └── Filter: All, Pending, In Progress, Done
└── Task Cards (Own Tasks Only)
    ├── Task title, priority, status
    ├── Sender notes section
    ├── Receiver notes section
    └── Completion notes section
```

### Receiver Dashboard
```
Header: Email + 👨‍💼 Task Manager Badge
├── (No Create Section)
├── Filters & Sorting
│   ├── Sort: Recent, Priority, Due Date
│   └── Filter: All, Pending, In Progress, Done
└── Task Cards (All Tasks)
    ├── Task from: sender email
    ├── Task details
    ├── Action buttons: Start/Complete
    ├── Add notes button
    ├── WhatsApp notification
    └── All notes visible
```

## 🔄 Real-time Updates

Both senders and receivers see:
- ✅ Task status changes instantly
- 📝 Notes added in real-time
- 🔔 Updates without page refresh
- 📊 Progress tracking live

## 📞 Communication Flow

```
SENDER                          RECEIVER
  │                               │
  ├─ Create Task ────────────→   │
  │                     Notification
  │                               │
  │← Real-time Status Update ─ ←─┤
  │   (In Progress)              │
  │                               │
  │← Real-time Note ───────── ←─┤
  │   (Update message)            │
  │                               │
  │← Completion Update ──────── ←─┤
  │   (Task Done)                 │
  │   (Completion Notes)          │
  │                               │
```

## 🚨 Notifications

- **WhatsApp**: Click "Notify" to send message
- **Real-time**: All updates appear instantly
- **Email**: (Optional) Can be added with Cloud Functions

## 🎓 Troubleshooting

**Tasks not appearing?**
- Check Firestore rules
- Verify Firebase config in app.js
- Clear browser cache

**Can't start task?**
- Verify you're logged in as receiver
- Check central email is correct

**Notes not syncing?**
- Refresh the page
- Check internet connection
- Verify Firestore permissions

## 📄 License

Open source and available under MIT License

## 🤝 Contributing

Contributions welcome! Submit issues and pull requests.

---

**Built for efficient task management and team coordination**
