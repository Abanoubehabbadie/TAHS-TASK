# 🚀 Deployment Guide for Tasky

## Quick Deployment Options

### Option 1: GitHub Pages (Recommended - Free & Easy)
Your repository already has GitHub Pages enabled! Just follow these steps:

#### Step 1: Enable GitHub Pages
1. Go to your repository: https://github.com/Abanoubehabbadie/tasky
2. Click **Settings** → **Pages**
3. Under "Source", select **Deploy from a branch**
4. Select branch: **main**
5. Select folder: **/ (root)**
6. Click **Save**

Your site will be available at: `https://abanoubehabbadie.github.io/tasky/`

#### Step 2: Update Firebase Configuration
Make sure your Firebase config in `app.js` is correct:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDPWhnynPtua1YxgqmIFhIUOH02aTeM2D8",
  authDomain: "tasky-60a47.firebaseapp.com",
  projectId: "tasky-60a47"
};
```

#### Step 3: Update Central Email (If Needed)
In `app.js`, line 22, update the central receiver email:
```javascript
const MAIN_RECEIVER = "abnoob.kolta@bua.edu.eg";
```

---

### Option 2: Firebase Hosting (Full-Featured)

#### Prerequisites
```bash
npm install -g firebase-tools
firebase login
```

#### Setup Steps

1. **Initialize Firebase**
```bash
firebase init hosting
```

2. **Configure firebase.json**
```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      ".git/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

3. **Deploy**
```bash
firebase deploy --only hosting
```

Your site will be available at: `https://tasky-60a47.web.app/`

---

### Option 3: Netlify (Alternative - Very Easy)

#### Deploy via Git
1. Go to https://netlify.com
2. Click "New site from Git"
3. Connect your GitHub account
4. Select `Abanoubehabbadie/tasky`
5. Build settings:
   - Build command: (leave empty - static site)
   - Publish directory: `.`
6. Deploy!

---

## 📋 Pre-Deployment Checklist

- ✅ Firebase project created
- ✅ Firestore database enabled
- ✅ Authentication (Email/Password) enabled
- ✅ Collections created: `users`, `tasks`
- ✅ Firebase config updated in `app.js`
- ✅ Central email configured in `app.js`
- ✅ All files committed to GitHub

---

## 🔧 Firebase Firestore Setup

### Create Collections
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `tasky-60a47`
3. Go to Firestore Database
4. Create collection: `users` (with auto-generated IDs)
5. Create collection: `tasks` (with auto-generated IDs)

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    match /tasks/{taskId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.token.email == resource.data.createdBy 
                            || request.auth.token.email == "abnoob.kolta@bua.edu.eg";
    }
  }
}
```

---

## ✅ Verification

### Test the Deployment

1. **Sign Up as Sender**
   - Email: `employee@example.com`
   - Password: `Test123456!`
   - Phone: `+201234567890`

2. **Test Receiver Account**
   - Email: `abnoob.kolta@bua.edu.eg`
   - Password: (your Firebase password)
   - Should see all tasks

3. **Create a Test Task**
   - Title: "Test Task"
   - Description: "This is a test"
   - Priority: Medium
   - Send task
   - Should appear on Receiver's dashboard

---

## 🔗 URLs After Deployment

### GitHub Pages
- Main App: `https://abanoubehabbadie.github.io/tasky/`

### Firebase Hosting
- Main App: `https://tasky-60a47.web.app/`

### Netlify (if used)
- Main App: `https://your-custom-domain.netlify.app/`

---

## 🐛 Troubleshooting

### Blank Page After Deploy?
- Check browser console for errors (F12)
- Verify Firebase config
- Check Firestore is accessible
- Clear browser cache

### Can't Login?
- Verify Firebase Authentication is enabled
- Check email/password are correct
- Look at Firebase Console for error logs

### Tasks Not Saving?
- Check Firestore security rules
- Verify collections exist: `users`, `tasks`
- Check browser console for errors
- Verify internet connection

---

## 🔄 Update After Deploy

To update your deployed app:

```bash
# Make changes locally
# Commit to GitHub
git add .
git commit -m "Update: Description of changes"
git push origin main

# GitHub Pages will auto-deploy
# (Wait 1-2 minutes for update)
```

---

## 📞 Support

For Firebase issues:
- https://firebase.google.com/support
- https://stackoverflow.com/questions/tagged/firebase

For GitHub Pages issues:
- https://docs.github.com/en/pages

---

**Tasky is now ready to deploy! Choose Option 1 (GitHub Pages) for quickest setup.** 🚀
