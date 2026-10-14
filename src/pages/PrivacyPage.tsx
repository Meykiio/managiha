import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getLanguage, t } from "../i18n";
import { privacyAr } from "./privacy/content.ar";
import { privacyEn } from "./privacy/content.en";
import { privacyFr } from "./privacy/content.fr";
import type { PrivacyContent } from "./privacy/types";

/**
 * The privacy policy is a document, not interface chrome, so it resolves its own
 * content by locale rather than going through `t()`. See src/pages/privacy/types.ts
 * for why it is not in the i18n dictionary.
 *
 * No `t()` at module scope: the lookup happens during render, which is what lets
 * the policy follow a language switch like everything else.
 */
const CONTENT: Record<string, PrivacyContent> = {
  fr: privacyFr,
  en: privacyEn,
  ar: privacyAr,
};

export default function PrivacyPage() {
  const content = CONTENT[getLanguage()] ?? privacyFr;

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          to="/login"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-body-muted hover:text-body-soft"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {content.backLabel}
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-body">{content.title}</h1>
        <p className="mb-6 text-sm text-body-muted">{content.lastUpdated}</p>

        <p className="mb-8 text-sm leading-relaxed text-body-soft">{content.intro}</p>

        <div className="space-y-8 text-sm leading-relaxed text-body-soft">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-3 text-base font-semibold text-body">{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mb-3">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="list-disc space-y-1.5 ps-5">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <p className="mt-10 border-t border-line pt-6 text-center text-xs text-body-muted">
          {t("settings.links.openSource")}
        </p>
      </div>
    </div>
  );
}
