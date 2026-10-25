import LoginClient from "./LoginClient";
import { Suspense } from "react";

export default function LoginPage() {
  <Suspense fallback={<div>Loading...</div>}>
    <LoginClient />
  </Suspense>
}
