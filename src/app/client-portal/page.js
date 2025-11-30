// NO "use client" here
import { redirect } from "next/navigation";

export default function ClientPortalIndex() {
  redirect("/client-portal/dashboard");
}