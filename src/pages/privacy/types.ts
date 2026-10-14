/**
 * Privacy policy content, kept per locale as a document rather than as UI strings.
 *
 * Deliberately NOT in `src/i18n/locales/`. That dictionary is for interface
 * strings, it is typed `Record<TranslationKey, string>` so every locale must hold
 * every key, and a legal document is neither short nor a string. Putting it there
 * would also mean the completeness test treated "we have not agreed the Arabic
 * legal wording yet" as a build failure, which is the wrong place to encode a
 * legal decision.
 *
 * The Arabic and English texts are accurate translations, but a privacy policy is
 * a legal instrument: the French text is the reference, and the others need
 * review by someone qualified before this is relied on. See docs/LEGAL.md.
 */

export interface PrivacySection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface PrivacyContent {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: PrivacySection[];
  backLabel: string;
}
