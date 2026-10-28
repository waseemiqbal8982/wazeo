import Link from "next/link";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="text-sm text-[var(--accent)]">← Home</Link>
      <h1 className="mt-4 text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">Last updated: 28 Oct 2026</p>

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--text)]">
        <p>
          Wazeo (“we”, “us”) values your privacy. This policy explains what information we
          collect when you use our SMM panel and how we protect it.
        </p>
        <h2 className="pt-2 text-lg font-semibold">1. Information we collect</h2>
        <p>
          We collect account details you provide (name, email, username), your deposit records,
          order history, and technical data such as IP address, browser and device info.
        </p>
        <h2 className="pt-2 text-lg font-semibold">2. How we use it</h2>
        <p>
          We use your data to provide and improve the service, process orders and payments, ensure
          security, prevent fraud, and send service-related notices.
        </p>
        <h2 className="pt-2 text-lg font-semibold">3. Data sharing</h2>
        <p>
          We do not sell your personal data. We share it only with service providers who process it
          on our behalf (hosting, email, payments) or where required by law.
        </p>
        <h2 className="pt-2 text-lg font-semibold">4. Security</h2>
        <p>
          We apply industry-standard safeguards to protect your data. No method of transmission is
          100% secure, but we work hard to keep your information safe.
        </p>
        <h2 className="pt-2 text-lg font-semibold">5. Your rights</h2>
        <p>
          You may request access, correction, or deletion of your personal data by contacting
          support. We will respond within a reasonable time.
        </p>
        <h2 className="pt-2 text-lg font-semibold">6. Contact</h2>
        <p>Questions about this policy? Contact support from the help section.</p>
      </div>
    </div>
  );
}
