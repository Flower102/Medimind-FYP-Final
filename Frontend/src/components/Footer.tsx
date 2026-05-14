// src/components/Footer.tsx
// Shared public footer.
// Fixes dark-mode contrast for Conditions of Use and Privacy Notice links.

import Link from "next/link";
import { useI18n } from "@/src/i18n/I18nProvider";

export default function Footer() {
  const { t } = useI18n();

  const tt = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  return (
    <footer className="border-t border-slate-200 pt-8 text-sm transition-colors dark:border-slate-800">
      {/* Legal agreement text */}
     <p>
        {tt("footer.agreement.before", "By using MediMind Lite, you agree to our")}{" "}
        <Link href="/ConditionOfUse" className="font-semibold text-blue-400 hover:underline">
          {tt("footer.conditions", "Conditions of Use")}
        </Link>{" "}
        {tt("footer.agreement.and", "and")}{" "}
        <Link href="PrivacyTerms" className="font-semibold text-blue-400 hover:underline">
          {tt("footer.privacy", "Privacy Notice")}
        </Link>
        .
      </p>

      <p className="mt-4">
        {tt(
          "footer.disclaimer",
          "MediMind Lite is for educational support only and does not replace professional medical advice, diagnosis, or treatment."
        )}
      </p>
    </footer>
  );
}