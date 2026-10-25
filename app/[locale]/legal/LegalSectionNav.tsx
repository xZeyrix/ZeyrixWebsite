
"use client";

import { useEffect, useRef, useState } from "react";

interface LegalSection {
  id: string;
  title: string;
}

export default function LegalSectionNav() {
  const [sections, setSections] = useState<LegalSection[]>([]);
  const [activeId, setActiveId] = useState("");

  const navRef = useRef<HTMLDivElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-legal-section]"),
    );

    const nextSections = elements
      .map((element) => ({
        id: element.id,
        title: element.dataset.legalSection ?? "",
      }))
      .filter((section) => section.id && section.title);

    setSections(nextSections);

    if (!nextSections.length) {
      setActiveId("");
      return;
    }

    let frame = 0;

    const updateActiveSection = () => {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const activationLine = 200;
        let currentId = nextSections[0].id;

        for (const element of elements) {
          if (element.getBoundingClientRect().top <= activationLine) {
            currentId = element.id;
          } else {
            break;
          }
        }

        setActiveId(currentId);
      });
    };

    updateActiveSection();

    window.addEventListener("scroll", updateActiveSection, {
      passive: true,
    });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  useEffect(() => {
    const container = navRef.current;
    const link = activeLinkRef.current;

    if (!container || !link) return;

    const containerRect = container.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();

    const padding = 12;

    if (linkRect.left < containerRect.left + padding) {
      container.scrollTo({
        left:
          container.scrollLeft -
          (containerRect.left + padding - linkRect.left),
        behavior: "smooth",
      });
    } else if (linkRect.right > containerRect.right - padding) {
      container.scrollTo({
        left:
          container.scrollLeft +
          (linkRect.right - (containerRect.right - padding)),
        behavior: "smooth",
      });
    }
  }, [activeId]);

  if (!sections.length) return null;

  return (
    <nav
      aria-label="Document sections"
      className="legal-section-nav fixed left-0 right-0 top-14 z-10 bg-background/95 px-6 backdrop-blur"
    >
      <div
        ref={navRef}
        className="mx-auto flex max-w-240 gap-2 overflow-x-auto py-2 legal-scrollbar"
      >
        {sections.map((section) => (
          <a
            key={section.id}
            ref={activeId === section.id ? activeLinkRef : null}
            href={`#${section.id}`}
            aria-current={activeId === section.id ? "location" : undefined}
            className={`legal-section-link whitespace-nowrap rounded-full border px-3 py-1.5 text-caption transition ${
              activeId === section.id
                ? "border-primary bg-primary text-background"
                : "border-border text-foreground-secondary hover:border-foreground-muted"
            }`}
          >
            {section.title}
          </a>
        ))}
      </div>
    </nav>
  );
}