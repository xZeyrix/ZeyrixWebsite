"use client";

import { useRouter } from "next/navigation";

type NotFoundScreenProps = {
  title: string;
  description: string;
  button: string;
};

export default function NotFoundScreen({
  title,
  description,
  button,
}: NotFoundScreenProps) {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center">
      <section className="text-center max-w-sm">
        <div className="font-display-en text-display">404</div>
        <h2 className="mt-4 text-h2">{title}</h2>
        <p className="mt-2 text-body text-foreground-secondary">
          {description}
        </p>
        <button
          className="inline-block mt-6 rounded-lg px-5 py-2 bg-primary text-background hover:cursor-pointer"
          onClick={() => router.push("/")}
        >
          {button}
        </button>
      </section>
    </main>
  );
}
