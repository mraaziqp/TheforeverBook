# Firebase Setup Guide for Forever Book

## 🚨 Current Issue
If you're seeing "Database '(default)' not found" errors in the console, you need to configure Firebase Firestore.

---

## ✅ Setup Steps

### 1. **Create Firebase Project**
- Go to [Firebase Console](https://console.firebase.google.com)
- Click "Create a new project"
- Enter project name: `TheforeverBook`
- Accept terms and create

### 2. **Create Firestore Database**
- In Firebase Console, go to **Firestore Database**
- Click **Create Database**
- Select **Production Mode** (for security rules)
- Choose a location near your users
- Click **Enable**

### 3. **Enable Authentication**
- Go to **Authentication**
- Click **Get Started**
- Enable these sign-in methods:
  - ✅ Email/Password
  - ✅ Google
- Configure OAuth consent screen if needed

### 4. **Get Firebase Config**
- Go to **Project Settings** (gear icon)
- Copy Web app configuration
- Update `firebase-applet-config.json`:

```json
{
  "apiKey": "YOUR_API_KEY",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "YOUR_SENDER_ID",
  "appId": "YOUR_APP_ID",
  "firestoreDatabaseId": "(default)"
}
```

Or set environment variables:
```env
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
VITE_FIREBASE_FIRESTORE_DATABASE_ID=(default)
```

### 5. **Set Firestore Security Rules**
Go to **Firestore > Rules** and replace with:

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - allow authenticated users
    match /projects/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Allow admin access
    match /{document=**} {
      allow read, write: if request.auth.uid == 'ADMIN_UID';
    }
  }
}
```

### 6. **Create Storage Bucket**
- Go to **Storage**
- Click **Get Started**
- Accept default settings
- Update security rules to allow authenticated uploads

---

## 🧪 Test the Setup

1. Restart dev server: `npm run dev`
2. Try creating a new book
3. Select "The Minimalist" template
4. Enter a book name
5. ✅ Should create successfully!

---

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| "Database not found" | Create Firestore database in Firebase Console |
| "PERMISSION_DENIED" | Check Firestore security rules allow authenticated users |
| "API not enabled" | Enable Firestore API in Google Cloud Console |
| Auth fails | Ensure Email/Password and Google auth are enabled |

---

## 📝 Required Firestore Collections

The app will auto-create these when you use it:
- `projects/` - User's book projects
- `projects/{projectId}/pages/` - Pages in each book
- `projects/{projectId}/templates/` - Custom user templates
- `projects/{projectId}/assets/` - Uploaded images

---

## ✨ Features That Require Firestore

✅ Create new books from templates  
✅ Save custom template styles  
✅ Upload images to gallery  
✅ Export/print books  
✅ Access saved projects  
✅ Real-time sync across devices  

---

## 🔒 Best Practices

1. **Use Production Mode** - Firestore will default-deny everything
2. **Set Proper Rules** - Only allow authenticated users
3. **Enable Backups** - Firebase has automatic backups
4. **Monitor Usage** - Check Firestore billing in Firebase Console
5. **Test Security** - Use Firebase Emulator Suite locally

---

## ❓ Need Help?

- Firebase Docs: https://firebase.google.com/docs
- Firestore Guide: https://firebase.google.com/docs/firestore
- Community: https://stackoverflow.com/questions/tagged/firebase

