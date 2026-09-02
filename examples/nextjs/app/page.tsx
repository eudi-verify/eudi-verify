import Image from "next/image";
import Link from "next/link";
import VerifyWidgetLoader from "./verify-widget-loader";

export default function Page() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="demo-banner" role="status">
        Demo mode: credentials are simulated. Use the demo wallet below (or a
        real wallet only when the API is run with EUDI_MODE=production locally).
      </div>

      <div className="page-shell">
        <header className="site-header">
          <Link href="/" className="site-header__brand">
            <Image
              className="eu-emblem"
              src="/eu-emblem.svg"
              alt=""
              width={37}
              height={25}
              aria-hidden="true"
            />
            <span className="site-header__brand-text">
              <span className="site-header__title">EUDI Verify</span>
              <span className="site-header__subtitle">
                Age verification demo
              </span>
            </span>
          </Link>
        </header>

        <main id="main-content" className="page-main" tabIndex={-1}>
          <div className="page-panel page-panel--flat">
            <span className="page-eyebrow">Captcha-style gate</span>
            <h1>Age Verification Required</h1>
            <p className="lead">
              This content requires age verification. Confirm you are over 18
              with the demo wallet (or a real EUDI Wallet in a local production
              lab setup).
            </p>

            <VerifyWidgetLoader />

            <div className="card card--accent">
              <h3>What happens next?</h3>
              <p>
                After verification, an opaque token is sent to our server which
                validates it before granting access. Your actual identity data
                never reaches the browser.
              </p>
            </div>

            <Link href="/" className="back-link">
              ← Back to home
            </Link>
          </div>
        </main>

        <footer className="site-footer">
          <p>
            Open source under{" "}
            <a href="https://github.com/eudi-verify/eudi-verify">Apache-2.0</a>.
            Designed for EU-sovereign deployment.
          </p>
        </footer>
      </div>
    </>
  );
}
