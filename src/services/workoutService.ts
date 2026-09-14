import { rtdb } from '@/firebase';
import { ref, push, get, update, remove, child } from 'firebase/database';

export interface Workout {
  id?: string;
  name: string;
  type: string;
  sets: number;
  duration: number;
  repetitions: number;
  date: string;
  notes: string;
}

const dbRef = ref(rtdb);

export const getWorkouts = async (): Promise<Workout[]> => {
  try {
    const snapshot = await get(child(dbRef, 'workouts'));
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map((key) => ({
        id: key,
        ...data[key]
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching workouts:", error);
    return [];
  }
};

export const addWorkout = async (workout: Omit<Workout, 'id'>) => {
  const workoutsRef = ref(rtdb, 'workouts');
  return await push(workoutsRef, workout);
};

export const updateWorkout = async (id: string, workout: Partial<Workout>) => {
  const workoutItemRef = ref(rtdb, `workouts/${id}`);
  return await update(workoutItemRef, workout);
};

export const deleteWorkout = async (id: string) => {
  const workoutItemRef = ref(rtdb, `workouts/${id}`);
  return await remove(workoutItemRef);
};