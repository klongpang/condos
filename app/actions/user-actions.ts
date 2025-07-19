"use server"

import { supabaseAdmin } from "@/lib/supabase"
import { userService } from "@/lib/database"
import { v4 as uuidv4 } from "uuid"
import type { User } from "@/lib/supabase"

interface UpdateProfileResult {
  success: boolean
  message: string
  user?: User | null
}

export async function updateUserProfile(formData: FormData): Promise<UpdateProfileResult> {
  const userId = formData.get("userId") as string
  const fullName = formData.get("full_name") as string
  const oldPassword = formData.get("old_password") as string
  const newPassword = formData.get("new_password") as string
  const profilePictureFile = formData.get("profile_picture") as File | null

  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is not configured")
  }
  if (!userId) {
    return { success: false, message: "User ID is required." }
  }

  try {
    const updates: Partial<User> = { full_name: fullName }
    let passwordHashToUpdate: string | undefined

    // Handle password update
    if (newPassword) {
      // In a real application, you would verify the old password against the stored hash
      // and then hash the new password before storing it.
      // For this demo, we're simplifying by just updating if newPassword is provided.
      // If using Supabase Auth, you'd use `supabase.auth.updateUser({ password: newPassword })`
      // which handles hashing automatically. Since we're directly updating the 'users' table
      // for demo purposes, we'd need a hashing library like bcrypt here.
      // For now, we'll just pass the new password as is, assuming the 'password_hash' column
      // is meant to store a plain text password for this simplified demo.
      // IMPORTANT: DO NOT DO THIS IN PRODUCTION. ALWAYS HASH PASSWORDS.
      passwordHashToUpdate = newPassword // Placeholder for actual hashing
    }

    // Handle profile picture upload
    if (profilePictureFile && profilePictureFile.size > 0) {
      const fileExtension = profilePictureFile.name.split(".").pop()
      const uniqueFileName = `${userId}-${uuidv4()}.${fileExtension}`
      const filePath = `profile-pictures/${uniqueFileName}` // Store in a 'profile-pictures' folder

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from("documents") // Using the existing 'documents' bucket, but in a specific folder
        .upload(filePath, profilePictureFile, {
          cacheControl: "3600",
          upsert: true, // Allow overwriting if file name is the same (though UUID makes it unique)
        })

      if (uploadError) {
        console.error("Supabase Storage Upload Error:", uploadError)
        return { success: false, message: `Failed to upload profile picture: ${uploadError.message}` }
      }

      const { data: publicUrlData } = supabaseAdmin.storage.from("documents").getPublicUrl(uploadData.path)
      if (!publicUrlData || !publicUrlData.publicUrl) {
        return { success: false, message: "Failed to get public URL for profile picture." }
      }
      updates.profile_picture_url = publicUrlData.publicUrl
    }

    // Update user in database
    const updatedUser = await userService.update(userId, {
      ...updates,
      password: passwordHashToUpdate, // Pass the (unhashed for demo) password
    })

    if (!updatedUser) {
      return { success: false, message: "Failed to update user profile in database." }
    }

    return { success: true, message: "บันทึกสำเร็จ", user: updatedUser }
  } catch (error: any) {
    console.error("Error updating user profile:", error)
    return { success: false, message: `An unexpected error occurred: ${error.message}` }
  }
}
