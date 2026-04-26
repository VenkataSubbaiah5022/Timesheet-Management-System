import { z } from "zod";

export const profileEditSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  email: z.string().trim().email("Enter a valid email address.").max(120),
  phone: z
    .string()
    .trim()
    .max(32)
    .refine((v) => v === "" || /^[\d\s+().-]{7,32}$/.test(v), "Use digits and common phone symbols, or leave blank."),
});

export type ProfileEditValues = z.infer<typeof profileEditSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/\d/, "Include at least one number."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;
