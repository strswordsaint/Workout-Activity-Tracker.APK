<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonInput, IonSelect, IonSelectOption, IonTextarea,
  IonButton, IonButtons, IonList, IonLabel, IonItem, IonIcon, IonModal
} from '@ionic/vue';
import { barbellOutline, createOutline, trashOutline, filterOutline } from 'ionicons/icons';
import {
  getWorkouts, addWorkout, updateWorkout, deleteWorkout, type Workout
} from '@/services/workoutService';

// ----------------------------------------------------------------------
// STATE & DATA
// ----------------------------------------------------------------------
// Holds the raw data fetched directly from Firebase
const workouts = ref<Workout[]>([]);

// Manages the state of our popup form (Modal) and whether we are editing
const isEditing = ref(false);
const activeEditId = ref<string | null>(null);
const isModalOpen = ref(false);

// ----------------------------------------------------------------------
// SORTING FEATURE (Newest / Oldest)
// ----------------------------------------------------------------------
// Tracks current sort order ('desc' = newest first, 'asc' = oldest first)
const sortOrder = ref<'desc' | 'asc'>('desc');

// Computed property: automatically updates whenever 'workouts' or 'sortOrder' changes
const sortedWorkouts = computed(() => {
  return [...workouts.value].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    // Sorts chronologically based on the session date/time
    return sortOrder.value === 'desc' ? dateB - dateA : dateA - dateB;
  });
});

// Function tied to the header button to flip the sorting order
const toggleSort = () => {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc';
};

// ----------------------------------------------------------------------
// TEXT VALIDATION LOGIC
// ----------------------------------------------------------------------
// Prevents typing non-numeric characters (like 'e', '.', '-', '+') in number inputs
const preventNonNumeric = (event: KeyboardEvent) => {
  if (!/[0-9]/.test(event.key)) {
    event.preventDefault();
  }
};

// ----------------------------------------------------------------------
// FORM & CRUD LOGIC
// ----------------------------------------------------------------------
// Helper to get exactly right now (Date + Time) for the datetime-local input
const getLocalDatetime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16); 
};

// The reactive object tied directly to our form inputs
const form = ref<Workout>({
  name: '', type: 'Strength', sets: 0, duration: 0, repetitions: 0,
  date: getLocalDatetime(), notes: ''
});

// READ: Pulls the latest list of workouts from the Firebase database
const loadWorkouts = async () => {
  try {
    workouts.value = await getWorkouts();
  } catch (err) {
    console.error("Error loading workouts:", err);
  }
};

// MODAL CONTROL: Opens the form. If 'editing' is true, it knows we are updating.
const openModal = (editing = false) => {
  isEditing.value = editing;
  isModalOpen.value = true;
};

// MODAL CONTROL: Closes form and resets it after a 300ms delay for smooth animation
const closeModal = () => {
  isModalOpen.value = false;
  setTimeout(resetForm, 300);
};

// CREATE / UPDATE: Decides whether to add a new entry or update an existing one
const handleSave = async () => {
  if (!form.value.name.trim()) return; // Prevent saving if name is empty
  try {
    if (isEditing.value && activeEditId.value) {
      // It's an update. We copy the form, remove the local ID, and push to Firebase.
      const payload = { ...form.value };
      delete payload.id;
      await updateWorkout(activeEditId.value, payload);
    } else {
      // It's a new entry.
      const payload = { ...form.value };
      delete payload.id;
      await addWorkout(payload);
    }
    closeModal();      // Hide form
    await loadWorkouts(); // Refresh the feed with new data
  } catch (err) {
    console.error("Failed to save workout:", err);
  }
};

// UPDATE SETUP: Copies the tapped workout's data into the form and opens the modal
const editItem = (item: Workout) => {
  activeEditId.value = item.id || null;
  form.value = { ...item };
  openModal(true);
};

// DELETE: Removes the workout from Firebase and refreshes the feed
const removeItem = async (id: string) => {
  try {
    await deleteWorkout(id);
    await loadWorkouts();
  } catch (err) {
    console.error("Failed to delete workout:", err);
  }
};

// UTILITY: Wipes the form clean back to default values
const resetForm = () => {
  isEditing.value = false;
  activeEditId.value = null;
  form.value = {
    name: '', type: 'Strength', sets: 0, duration: 0, repetitions: 0,
    date: getLocalDatetime(), notes: ''
  };
};

// UTILITY: Formats the raw date string into a clean UI format (e.g. "Sep 15, 5:30 PM")
const formatDateTime = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// LIFECYCLE: Automatically fetches data the moment the app opens
onMounted(() => {
  loadWorkouts();
});
</script>

<template>
  <ion-page>
    <!-- TOP HEADER -->
    <ion-header class="ion-no-border">
      <ion-toolbar style="--background: #000000; --color: #ffffff;">
        <ion-title style="font-weight: 800; font-size: 1.4rem; letter-spacing: -0.5px;">
          TRAINING LOG
        </ion-title>
        <!-- FILTER BUTTON: Triggers the toggleSort function with white text color -->
        <ion-buttons slot="end">
          <ion-button @click="toggleSort" style="color: #ffffff;">
            <ion-icon :icon="filterOutline" style="margin-right: 4px;"></ion-icon>
            <span style="font-size: 0.8rem; font-weight: 700;">
              {{ sortOrder === 'desc' ? 'NEWEST' : 'OLDEST' }}
            </span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding-horizontal">
      
      <!-- EMPTY STATE: Displays if no workouts exist -->
      <div v-if="sortedWorkouts.length === 0" class="empty-state">
        <ion-icon :icon="barbellOutline" class="empty-icon"></ion-icon>
        <h2 style="font-weight: 700; margin-bottom: 4px;">No History</h2>
        <p style="color: #a1a1aa; font-size: 0.95rem;">Time to hit the iron.</p>
      </div>

      <!-- MAIN FEED: Loops through the computed 'sortedWorkouts' array -->
      <ion-list v-else class="workout-list" lines="none">
        <ion-item v-for="item in sortedWorkouts" :key="item.id" class="workout-item">
          <ion-label class="ion-text-wrap" style="width: 100%;">
            
            <!-- HEADER ROW: Exercise name, date, and edit/delete actions -->
            <div class="workout-header">
              <div>
                <h2 class="exercise-name">{{ item.name }}</h2>
                <span class="exercise-date">{{ formatDateTime(item.date) }}</span>
              </div>
              <div class="action-buttons">
                <!-- Click.stop prevents the item tap from doing anything else -->
                <ion-icon :icon="createOutline" @click.stop="editItem(item)" class="action-icon edit-icon"></ion-icon>
                <ion-icon :icon="trashOutline" @click.stop="removeItem(item.id!)" class="action-icon delete-icon"></ion-icon>
              </div>
            </div>

            <!-- STATS ROW: Displays category badge, sets/reps, and duration -->
            <div class="workout-stats">
              <span class="stat-badge">{{ item.type }}</span>
              <span class="stat-text">
                <!-- Smart display formatting for Sets x Reps -->
                Vol: {{ item.sets ? `${item.sets}x` : '' }}{{ item.repetitions }} Reps
              </span>
              <span class="stat-divider">•</span>
              <span class="stat-text">{{ item.duration }} Mins</span>
            </div>

            <!-- NOTES: Only renders if notes actually exist -->
            <p v-if="item.notes" class="workout-notes">
              "{{ item.notes }}"
            </p>
          </ion-label>
        </ion-item>
      </ion-list>

      <!-- MODAL OVERLAY: Contains the form for adding/editing -->
      <ion-modal :is-open="isModalOpen" @didDismiss="closeModal" class="minimal-modal">
        <ion-header class="ion-no-border">
          <ion-toolbar style="--background: #09090b; text-align: center;">
            <ion-title style="font-weight: 700; font-size: 1.1rem;">
              {{ isEditing ? 'EDIT ENTRY' : 'NEW ENTRY' }}
            </ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding" style="--background: #09090b;">
          <div class="form-container">
            <!-- EXERCISE NAME -->
            <ion-input class="minimal-input huge-input" label="EXERCISE" label-placement="stacked" v-model="form.name" placeholder="e.g. Barbell Squat" />
            
            <!-- CATEGORY DROPDOWN -->
            <ion-select class="minimal-input" label="CATEGORY" label-placement="stacked" v-model="form.type" interface="action-sheet">
              <ion-select-option value="Strength">Strength / Hypertrophy</ion-select-option>
              <ion-select-option value="Cardio">Cardio / Conditioning</ion-select-option>
              <ion-select-option value="Flexibility">Mobility / Recovery</ion-select-option>
              <ion-select-option value="HIIT">HIIT</ion-select-option>
            </ion-select>

            <!-- SETS & REPS: Validated to allow only numbers -->
            <div class="flex-row">
              <ion-input class="minimal-input" type="number" inputmode="numeric" label="SETS" label-placement="stacked" v-model.number="form.sets" placeholder="e.g. 4" @keypress="preventNonNumeric" />
              <ion-input class="minimal-input" type="number" inputmode="numeric" label="REPS (PER SET)" label-placement="stacked" v-model.number="form.repetitions" placeholder="e.g. 7" @keypress="preventNonNumeric" />
            </div>

            <!-- DURATION & SHORTCUTS: Binded to the exact same v-model with numeric validation -->
            <div class="flex-row">
              <ion-input class="minimal-input" type="number" inputmode="numeric" label="DURATION (MINS)" label-placement="stacked" v-model.number="form.duration" placeholder="0" @keypress="preventNonNumeric" />
              <ion-select class="minimal-input" label="TIME SHORTCUTS" label-placement="stacked" v-model.number="form.duration" interface="popover" placeholder="Autofill...">
                <ion-select-option :value="20">20 mins (Quick)</ion-select-option>
                <ion-select-option :value="30">30 mins (Standard)</ion-select-option>
                <ion-select-option :value="40">40 mins (Deep)</ion-select-option>
                <ion-select-option :value="60">1 hour (Full)</ion-select-option>
              </ion-select>
            </div>

            <!-- DATE/TIME SELECTOR -->
            <ion-input class="minimal-input" type="datetime-local" label="SESSION DATE & TIME" label-placement="stacked" v-model="form.date" />
            
            <!-- NOTES -->
            <ion-textarea class="minimal-input" label="TRAINING NOTES" label-placement="stacked" v-model="form.notes" placeholder="How did the weight feel? PRs hit?" :rows="3" />
            
            <!-- MODAL ACTIONS -->
            <div class="flex-row" style="margin-top: 16px;">
              <ion-button expand="block" color="secondary" class="modal-action-btn" @click="closeModal">
                CANCEL
              </ion-button>
              <ion-button expand="block" color="tertiary" class="modal-action-btn" @click="handleSave">
                SAVE
              </ion-button>
            </div>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>

    <!-- PERSISTENT BOTTOM BUTTON: Floating Action for easy logging -->
    <div class="bottom-bar">
      <ion-button expand="block" color="primary" class="log-button" @click="openModal(false)">
        LOG WORKOUT
      </ion-button>
    </div>
  </ion-page>
</template>

<style scoped>
/* ----------------------------------------------------------------------
   CORE LAYOUT
---------------------------------------------------------------------- */
.workout-list {
  background: transparent;
  padding-bottom: 140px; 
}

/* Base styling for the dark block components */
.workout-item {
  --background: #09090b; 
  --padding-start: 16px;
  --padding-end: 16px;
  --border-radius: 12px;
  margin-bottom: 12px;
  border: 1px solid #27272a;
}

/* ----------------------------------------------------------------------
   TYPOGRAPHY & FEED UI
---------------------------------------------------------------------- */
.workout-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 12px;
  margin-bottom: 8px;
}

.exercise-name {
  font-weight: 800;
  font-size: 1.3rem;
  letter-spacing: -0.5px;
  color: #ffffff;
  margin: 0 0 2px 0;
}

.exercise-date {
  font-size: 0.8rem;
  font-weight: 600;
  color: #71717a;
  text-transform: uppercase;
}

/* Explicit Action Buttons layout */
.action-buttons {
  display: flex;
  gap: 16px;
  align-items: center;
}

.action-icon {
  font-size: 1.3rem;
  color: #71717a;
}

.edit-icon:active { color: #ffffff; }
.delete-icon { color: #ef4444; } /* A subtle red to indicate danger/delete */
.delete-icon:active { color: #dc2626; }

/* Stats alignment */
.workout-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

/* Kabi-style category tag */
.stat-badge {
  background: #27272a;
  color: #e4e4e7;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-text {
  font-size: 0.95rem;
  font-weight: 500;
  color: #a1a1aa;
}

.stat-divider {
  color: #3f3f46;
  font-size: 0.8rem;
}

.workout-notes {
  font-size: 0.9rem;
  color: #71717a;
  font-style: italic;
  margin-top: 0px;
  margin-bottom: 12px;
}

/* ----------------------------------------------------------------------
   EMPTY STATE (NO DATA YET)
---------------------------------------------------------------------- */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  color: #27272a;
  margin-bottom: 16px;
}

/* ----------------------------------------------------------------------
   STICKY BOTTOM ACTION BAR
---------------------------------------------------------------------- */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  /* padding: top right bottom left */
  padding: 16px 16px 70px 16px; 
  background: linear-gradient(to top, rgba(0,0,0,1) 50%, rgba(0,0,0,0));
  z-index: 10;
}

.log-button {
  --border-radius: 8px;
  margin: 0;
  font-weight: 800;
  letter-spacing: 1px;
}

/* ----------------------------------------------------------------------
   MODAL FORM UI
---------------------------------------------------------------------- */
.form-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 10px;
}

.flex-row {
  display: flex;
  gap: 12px;
}

/* Forces items in a flex row to take equal width */
.flex-row > * {
  flex: 1;
}

/* Stripped down inputs for the pure dark mode vibe */
.minimal-input {
  --background: #18181b;
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 10px;
  --padding-bottom: 10px;
  --border-radius: 8px;
  --placeholder-color: #52525b;
  --color: #ffffff;
  font-size: 1rem;
  font-weight: 500;
}

.huge-input {
  font-size: 1.5rem;
  font-weight: 800;
  --padding-top: 16px;
  --padding-bottom: 16px;
}

.modal-action-btn {
  --border-radius: 8px;
  font-weight: 800;
  letter-spacing: 1px;
  margin: 0;
}
</style>