// utils/syncUser.ts
import { db } from "@/utils/db/dbConfig"; // your drizzle db instance
import { Users } from "@/utils/db/schema";
import { eq } from "drizzle-orm";

export const syncUserToDB = async (email: string, name: string) => {
  // Check if user already exists
  const existingUsers = await db.select().from(Users).where(eq(Users.email, email));
  if (existingUsers.length === 0) {
    // If not, insert the user
    await db.insert(Users).values({ email, name });
  }
};