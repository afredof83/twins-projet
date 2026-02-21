'use server'
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfile(userId: string, formData: any) {
    try {
        await prisma.profile.update({
            where: { id: userId },
            data: {
                age: parseInt(formData.age),
                gender: formData.gender,
                profession: formData.profession,
                hobbies: formData.hobbies,
                objectives: formData.objectives,
            }
        });
        revalidatePath('/profile');
        return { success: true };
    } catch (error) {
        console.error("Erreur updateProfile:", error);
        return { success: false, error: "Erreur de mise Ã  jour" };
    }
}
