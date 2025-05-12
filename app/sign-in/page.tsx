"use client"

import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </div>
  )
}
