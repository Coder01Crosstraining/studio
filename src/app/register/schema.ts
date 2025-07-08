import * as z from "zod";

export const registerSchema = z.object({
  name: z.string().min(3, "El nombre completo es requerido."),
  documentId: z.string().min(5, "El número de cédula es requerido."),
  email: z.string().email("Por favor, introduce un correo válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  confirmPassword: z.string().min(6, "La confirmación de contraseña es requerida."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
