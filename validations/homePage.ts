import { z } from "zod";

// Ingredient Schema
export const ingredientSchema = z.object({
  ingredientName: z.string().min(1, "Ingredient name is required"),
});

// Instruction Schema
export const instructionSchema = z.object({
  step: z.number().min(1, "Step number is required"),
  description1: z.string().min(1, "Primary description is required"),
  description2: z.string().optional(),
});

// Benefits Schema
export const benefitsSchema = z.object({
  title: z.string().min(1, "Benefit title is required"),
  description: z.string().min(1, "Benefit description is required"),
});

// Review Schema
export const reviewSchema = z.object({
  reviewId: z.number().min(1, "Review ID is required"),
  userName: z.string().min(1, "User name is required"),
  userProfile: z.string().optional(),
  rating: z.number().min(1).max(5, "Rating must be between 1 and 5"),
  review: z.string().min(1, "Review text is required"),
  imgs: z.array(z.string().url("Invalid image URL")).optional(),
});

// Recipe Schema
export const recipeSchema = z.object({
  recipeId: z.number().min(1, "Recipe ID is required"),
  name: z.string().min(1, "Recipe name is required"),
  rating: z.number().min(0).max(5, "Rating must be between 0 and 5"),
  prepTime: z.number().min(0, "Preparation time is required"),
  calories: z.number().min(0, "Calories must be a positive number"),
  mood: z.string().min(1, "Mood type is required"),
  ingredients: z.array(ingredientSchema).nonempty("At least one ingredient is required"),
  instructions: z.array(instructionSchema).nonempty("At least one instruction is required"),
  benefits: z.array(benefitsSchema).nonempty("At least one benefit is required"),
  reviews: z.array(reviewSchema).optional(),
  imageUrl: z.string().url("Invalid image URL"),
});
