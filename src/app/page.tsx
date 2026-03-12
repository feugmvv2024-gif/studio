
import { redirect } from "next/navigation"

export default function Home() {
  // Normally we would check auth status here
  redirect("/dashboard")
}
