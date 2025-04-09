import { z } from "zod";

export const onboardingSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  email: z.string().email("Invalid email format"),
});

// Activity Level Schema
export const activityLevelSchema = z.object({
  level: z.string().min(1, "Activity level is required"), // Ensures level is not empty
  description: z.string().min(1, "Description is required"), // Ensures description is not empty
});

// Diet Type Schema
export const dietTypeSchema = z.object({
  name: z.string().min(1, "Diet type name is required"),
  img: z.string().url("Invalid image URL").optional(),
});

// Allergy Schema
export const allergySchema = z.object({
  name: z.string().min(1, "Allergy name is required"),
  img: z.string().url("Invalid image URL").optional(),
});

// Mood Goal Schema
export const moodGoalSchema = z.object({
  name: z.string().min(1, "Mood goal name is required"),
  description: z.string().min(1, "Description is required"),
  emoji: z.string().url("Invalid emoji URL").default("https://emoji.aranja.com/static/emoji-data/img-apple-160/1f60a.png"),
});