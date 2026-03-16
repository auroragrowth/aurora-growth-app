import { redirect } from "next/navigation";

export default function CalculatorRedirectPage() {
  redirect("/dashboard/investments/calculator");
}
