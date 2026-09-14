// ✅ FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyDPWhnynPtua1YxgqmIFhIUOH02aTeM2D8",
  authDomain: "tasky-60a47.firebaseapp.com",
  projectId: "tasky-60a47"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let currentUserEmail = null;
let currentUserPhone = null;
let currentSortBy = 'dateCreated';
let currentFilter = 'all';
let allTasks = [];
let isSignupMode = false;

// Define the main receiver email (tasks assigned to this user are visible to all)
const MAIN_RECEIVER = "abnoob.kolta@bua.edu.eg";

// 🔑 TRACK LOGIN STATE
auth.onAuthStateChanged(user => {
  const authSection = document.getElementById("authSection");
  const appSection = document.getElementById("appSection");
  const logoutBtn = document.getElementById("logoutBtn");
  const userInfo = document.getElementById("userInfo");

  if (user) {
    currentUser = user.uid;
    currentUserEmail = user.email;
    
    // Load user's phone from Firestore
    loadUserProfile();
    
    // Show app section
    authSection.style.display = "none";
    appSection.style.display = "block";
    logoutBtn.style.display = "flex";
    
    // Display user info
    userInfo.innerHTML = `<i class="fas fa-user-circle"></i> ${user.email}`;
    
    // Load tasks
    loadTasks();
  } else {
    // Show auth section
    authSection.style.display = "block";
    appSection.style.display = "none";
    logoutBtn.style.display = "none";
    userInfo.innerHTML = "";
    allTasks = [];
    currentUserPhone = null;
    isSignupMode = false;
    resetAuthForm();
  }
});

// ✅ TOGGLE SIGNUP MODE
function toggleSignupMode() {
  isSignupMode = !isSignupMode;
  const phoneGroup = document.getElementById("phoneGroupSignup");
  const signupToggleBtn = document.getElementById("signupToggleBtn");
  const confirmSignupBtn = document.getElementById("confirmSignupBtn");
  const loginBtn = document.querySelector(".btn-primary");

  if (isSignupMode) {
    phoneGroup.style.display = "block";
    confirmSignupBtn.style.display = "block";
    signupToggleBtn.style.display = "none";
    loginBtn.style.display = "none";
  } else {
    phoneGroup.style.display = "none";
    confirmSignupBtn.style.display = "none";
    signupToggleBtn.style.display = "block";
    loginBtn.style.display = "block";
  }
}

// ✅ RESET AUTH FORM
function resetAuthForm() {
  document.getElementById("email").value = "";
  document.getElementById("password").value = "";
  document.getElementById("phoneSignup").value = "";
  isSignupMode = false;
  document.getElementById("phoneGroupSignup").style.display = "none";
  document.getElementById("signupToggleBtn").style.display = "block";
  document.getElementById("confirmSignupBtn").style.display = "none";
  document.querySelector(".btn-primary").style.display = "block";
}

// ✅ LOAD USER PROFILE
function loadUserProfile() {
  db.collection("users").doc(currentUser).get()
    .then(doc => {
      if (doc.exists) {
        currentUserPhone = doc.data().phone || null;
        // Auto-fill phone in task form
        if (currentUserPhone) {
          document.getElementById("phone").value = currentUserPhone;
        }
      }
    })
    .catch(err => {
      console.error("Error loading user profile:", err);
    });
}

// ✅ SIGN UP
function signup() {
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("password").value;
  const phone = document.getElementById("phoneSignup").value.trim();

  if (!email || !pass || !phone) {
    showToast("Please fill in all fields", "error");
    return;
  }

  // Phone validation
  if (!/^\+?[0-9]{10,15}$/.test(phone.replace(/\s/g, ''))) {
    showToast("Please enter a valid phone number with country code (e.g., +201234567890)", "error");
    return;
  }

  auth.createUserWithEmailAndPassword(email, pass)
    .then((userCredential) => {
      // Save phone to Firestore
      db.collection("users").doc(userCredential.user.uid).set({
        email: email,
        phone: phone,
        createdAt: new Date()
      })
      .then(() => {
        showToast("Account created successfully! Please login.", "success");
        resetAuthForm();
      })
      .catch(err => {
        showToast(`Error saving profile: ${err.message}`, "error");
      });
    })
    .catch(err => {
      showToast(`Sign up failed: ${err.message}`, "error");
    });
}

// ✅ LOGIN
function login() {
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("password").value;

  if (!email || !pass) {
    showToast("Please fill in all fields", "error");
    return;
  }

  auth.signInWithEmailAndPassword(email, pass)
    .then(() => {
      showToast("Logged in successfully!", "success");
      resetAuthForm();
    })
    .catch(err => {
      showToast(`Login failed: ${err.message}`, "error");
    });
}

// ✅ LOGOUT
function logout() {
  auth.signOut()
    .then(() => {
      showToast("Logged out successfully", "success");
    })
    .catch(err => {
      showToast(`Logout failed: ${err.message}`, "error");
    });
}

// ✅ CREATE TASK
function createTask() {
  const title = document.getElementById("title").value.trim();
  const desc = document.getElementById("desc").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const priority = document.getElementById("priority").value;
  const dueDate = document.getElementById("dueDate").value;
  const assignee = document.getElementById("assignee").value.trim();

  // Validation
  if (!title) {
    showToast("Please enter a task title", "error");
    return;
  }

  if (!phone) {
    showToast("Please add your phone number in your profile first", "error");
    return;
  }

  // Basic phone validation
  if (!/^\+?[0-9]{10,15}$/.test(phone.replace(/\s/g, ''))) {
    showToast("Please enter a valid phone number with country code (e.g., +201234567890)", "error");
    return;
  }

  db.collection("tasks").add({
    title: title,
    desc: desc,
    phone: phone,
    priority: priority,
    dueDate: dueDate || null,
    assignee: assignee || null,
    createdBy: currentUserEmail,
    assignedTo: MAIN_RECEIVER, // Automatically assign to main receiver
    status: "pending",
    dateCreated: new Date(),
    updatedAt: new Date()
  })
  .then(() => {
    showToast("Task created successfully and sent to receiver!", "success");
    // Clear form
    document.getElementById("title").value = "";
    document.getElementById("desc").value = "";
    document.getElementById("priority").value = "medium";
    document.getElementById("dueDate").value = "";
    document.getElementById("assignee").value = "";
  })
  .catch(err => {
    showToast(`Error creating task: ${err.message}`, "error");
  });
}

// ✅ LOAD TASKS (REAL-TIME) - Modified to show all relevant tasks
function loadTasks() {
  // Get tasks created by user OR assigned to user
  db.collection("tasks")
    .where("createdBy", "==", currentUserEmail)
    .onSnapshot(snapshot => {
      allTasks = [];
      snapshot.forEach(doc => {
        allTasks.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Also get tasks assigned to this user
      loadAssignedTasks();
    }, err => {
      showToast(`Error loading tasks: ${err.message}`, "error");
    });
}

// ✅ LOAD ASSIGNED TASKS
function loadAssignedTasks() {
  db.collection("tasks")
    .where("assignedTo", "==", currentUserEmail)
    .onSnapshot(snapshot => {
      // Add assigned tasks to the list (avoid duplicates)
      snapshot.forEach(doc => {
        const taskId = doc.id;
        const existingTask = allTasks.find(t => t.id === taskId);
        
        if (!existingTask) {
          allTasks.push({
            id: taskId,
            ...doc.data()
          });
        }
      });
      
      applyFilterAndSort();
    }, err => {
      console.error("Error loading assigned tasks:", err);
    });
}

// ✅ APPLY FILTER
function filterTasks(status) {
  currentFilter = status;
  
  // Update button styles
  document.querySelectorAll(".status-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  event.target.classList.add("active");
  
  applyFilterAndSort();
}

// ✅ SORT TASKS
function sortBy(sortType) {
  currentSortBy = sortType;
  
  // Update button styles
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  event.target.classList.add("active");
  
  applyFilterAndSort();
}

// ✅ APPLY FILTER & SORT
function applyFilterAndSort() {
  let filteredTasks = allTasks;

  // Apply filter
  if (currentFilter !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.status === currentFilter);
  }

  // Apply sort
  filteredTasks.sort((a, b) => {
    switch(currentSortBy) {
      case 'priority':
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
      case 'dueDate':
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      case 'dateCreated':
      default:
        return new Date(b.dateCreated) - new Date(a.dateCreated);
    }
  });

  renderTasks(filteredTasks);
}

// ✅ RENDER TASKS
function renderTasks(tasks) {
  const div = document.getElementById("tasks");
  const noTasks = document.getElementById("noTasks");
  
  if (tasks.length === 0) {
    div.innerHTML = "";
    noTasks.style.display = "block";
    return;
  }

  noTasks.style.display = "none";
  div.innerHTML = "";

  tasks.forEach(task => {
    const statusClass = task.status === 'done' ? 'done' : 
                       task.status === 'in progress' ? 'progress' : 'pending';
    
    const priorityClass = `priority-${task.priority || 'low'}`;
    const dueDateText = task.dueDate ? 
      new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
      'No date';

    const isCreatedByMe = task.createdBy === currentUserEmail;
    const isAssignedToMe = task.assignedTo === currentUserEmail;

    const taskCard = document.createElement('div');
    taskCard.className = `task-card ${priorityClass}`;
    taskCard.innerHTML = `
      <div class="task-header">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-badge badge-${statusClass}">
          <i class="fas fa-${getStatusIcon(task.status)}"></i>
          ${task.status}
        </div>
      </div>

      <div class="task-meta">
        ${task.priority ? `<div class="task-meta-item"><i class="fas fa-flag"></i> ${task.priority}</div>` : ''}
        ${task.dueDate ? `<div class="task-meta-item"><i class="fas fa-calendar"></i> ${dueDateText}</div>` : ''}
        ${task.assignedTo ? `<div class="task-meta-item"><i class="fas fa-user"></i> ${task.assignedTo}</div>` : ''}
        ${task.createdBy ? `<div class="task-meta-item"><i class="fas fa-user-check"></i> By: ${task.createdBy}</div>` : ''}
      </div>

      ${task.desc ? `<div class="task-desc">${escapeHtml(task.desc)}</div>` : ''}

      <div class="task-status ${statusClass}">
        <span></span>
        ${task.status === 'pending' ? 'AWAITING' : 
          task.status === 'in progress' ? 'IN PROGRESS' : 'COMPLETED'}
      </div>

      <div class="task-footer">
        ${task.status === 'pending' && isAssignedToMe ? 
          `<button class="task-btn task-btn-take" onclick="takeTask('${task.id}')">
            <i class="fas fa-hand-paper"></i> Take Task
          </button>` : 
          task.status === 'in progress' && isAssignedToMe ? 
          `<button class="task-btn task-btn-done" onclick="finishTask('${task.id}', '${escapeHtml(task.phone)}')">
            <i class="fas fa-check"></i> Mark Done
          </button>` : 
          ''
        }
        <button class="task-btn task-btn-notify" onclick="sendWhatsAppNotification('${escapeHtml(task.phone)}', '${escapeHtml(task.title)}')">
          <i class="fab fa-whatsapp"></i> Notify
        </button>
        ${isCreatedByMe ? 
          `<button class="task-btn task-btn-delete" onclick="deleteTask('${task.id}')">
            <i class="fas fa-trash"></i> Delete
          </button>` : 
          ''
        }
      </div>
    `;

    div.appendChild(taskCard);
  });
}

// ✅ TAKE TASK
function takeTask(id) {
  db.collection("tasks").doc(id).update({
    status: "in progress",
    updatedAt: new Date()
  })
  .then(() => {
    showToast("Task started! You're working on it now.", "success");
  })
  .catch(err => {
    showToast(`Error: ${err.message}`, "error");
  });
}

// ✅ FINISH TASK & SEND WHATSAPP NOTIFICATION
function finishTask(id, phone) {
  db.collection("tasks").doc(id).update({
    status: "done",
    updatedAt: new Date()
  })
  .then(() => {
    showToast("Task marked as done!", "success");
    // Automatically send WhatsApp notification
    sendWhatsAppNotification(phone, "completed");
  })
  .catch(err => {
    showToast(`Error: ${err.message}`, "error");
  });
}

// ✅ SEND WHATSAPP NOTIFICATION
function sendWhatsAppNotification(phone, taskTitle) {
  if (!phone) {
    showToast("Phone number not available", "error");
    return;
  }

  const cleanPhone = phone.replace(/\s/g, '').replace(/\D/g, '');
  let message = "";

  if (taskTitle === "completed") {
    message = "✅ Your task has been completed! Thanks for using Tasky.";
  } else {
    message = `📋 Task Update: "${taskTitle}" has been assigned to you. Check Tasky for more details!`;
  }

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
  showToast("Opening WhatsApp...", "success");
}

// ✅ DELETE TASK
function deleteTask(id) {
  if (confirm('Are you sure you want to delete this task?')) {
    db.collection("tasks").doc(id).delete()
      .then(() => {
        showToast("Task deleted successfully", "success");
      })
      .catch(err => {
        showToast(`Error deleting task: ${err.message}`, "error");
      });
  }
}

// ✅ SHOW TOAST NOTIFICATION
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ✅ HELPER: GET STATUS ICON
function getStatusIcon(status) {
  switch(status) {
    case 'pending': return 'clock';
    case 'in progress': return 'spinner';
    case 'done': return 'check-circle';
    default: return 'circle';
  }
}

// ✅ HELPER: ESCAPE HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ✅ SET DEFAULT SORT BUTTON AS ACTIVE
document.addEventListener('DOMContentLoaded', () => {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const statusButtons = document.querySelectorAll('.status-btn');
  
  if (filterButtons.length > 0) {
    filterButtons[0].classList.add('active');
  }
  
  if (statusButtons.length > 0) {
    statusButtons[0].classList.add('active');
  }
});