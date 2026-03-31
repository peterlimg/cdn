"use client"

import React from "react"
import { useTransition } from "react"
import { logoutAction } from "../../app/auth/actions"

export function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      className="button-secondary"
      disabled={isPending}
      onClick={() => startTransition(async () => {
        await logoutAction()
      })}
      type="button"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  )
}
