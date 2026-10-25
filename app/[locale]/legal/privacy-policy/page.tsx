import { getTranslations } from "next-intl/server";

interface PrivacyPolicySection {
  title: string;
  points: string[];
}

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("privacyPolicy");
  const sections = t.raw("sections") as Record<string, string[]>;
  const documentSections: PrivacyPolicySection[] = Object.entries(sections).map(
    ([title, points]) => ({ title, points }),
  );

  return (
    <article className="mx-auto w-full max-w-240 px-6 pb-24 pt-24 sm:px-10 lg:px-12">
      <header className="legal-hero mb-16 border-b border-border pb-10">
        <p className="mb-4 text-overline uppercase text-primary">/ legal</p>
        <h1 className="max-w-3xl text-display text-foreground">{t("title")}</h1>
        <p className="mt-5 text-body-sm text-foreground-muted">
          {t("lastUpdated")}
        </p>
      </header>

      <div className="legal-document">
        {documentSections.map((section, sectionIndex) => {
          const id = `legal-section-${sectionIndex + 1}`;

          return (
            <section
              key={section.title}
              id={id}
              data-legal-section={section.title}
              className="legal-section scroll-mt-32 border-b border-border py-10 first:pt-0 last:border-b-0"
            >
              <h2 className="text-h3 text-foreground">
                {sectionIndex + 1}. {section.title}
              </h2>
              <div className="mt-7 space-y-5">
                {section.points.map((point, pointIndex) => (
                  <p
                    key={`${section.title}-${pointIndex}`}
                    className="text-body-sm leading-7 text-foreground-secondary"
                  >
                    {sectionIndex + 1}.{pointIndex + 1} {point}
                  </p>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}