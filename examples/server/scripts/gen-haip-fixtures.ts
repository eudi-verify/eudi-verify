/**
 * Generates lab-only HAIP key material: a CA + leaf cert (SAN DNS = hostname)
 * and a signer keypair bound to the leaf's SPKI. Adapted from
 * ~/src/openid4vp/scripts/oidf-ci/fixtures.ts:48-88 (see haip-spike-plan-v2.local.md
 * checkpoint 3). Output is gitignored: never commit these files or paste the
 * private key anywhere but this machine.
 *
 * Usage: node --import tsx scripts/gen-haip-fixtures.ts <hostname>
 * Writes into examples/server/.haip-lab/:
 *   ca.pem              - paste into the suite's Request Object Trust Anchor
 *   leaf-cert.der        - leaf X.509 cert (DER), leaf-first chain element 0
 *   signer-private.jwk.json / signer-public.jwk.json
 */
import "reflect-metadata";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as x509 from "@peculiar/x509";

const hostname = process.argv[2];
if (!hostname) {
  console.error("Usage: gen-haip-fixtures.ts <hostname>");
  process.exit(1);
}

const SIGNING_ALG = { name: "ECDSA", namedCurve: "P-256" } as const;
const HASH = "SHA-256";

async function main() {
  const caKeypair = (await crypto.subtle.generateKey(SIGNING_ALG, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const caCert = await x509.X509CertificateGenerator.create({
    serialNumber: "01",
    subject: "CN=eudi-verify-haip-lab-ca",
    issuer: "CN=eudi-verify-haip-lab-ca",
    notBefore: new Date(Date.now() - 60_000),
    notAfter: new Date(Date.now() + 24 * 3600_000),
    signingAlgorithm: { name: "ECDSA", hash: HASH },
    publicKey: caKeypair.publicKey,
    signingKey: caKeypair.privateKey,
    extensions: [
      new x509.BasicConstraintsExtension(true, undefined, true),
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign,
        true,
      ),
    ],
  });

  const leafKeypair = (await crypto.subtle.generateKey(SIGNING_ALG, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const leafCert = await x509.X509CertificateGenerator.create({
    serialNumber: "02",
    subject: `CN=${hostname}`,
    issuer: caCert.subject,
    notBefore: new Date(Date.now() - 60_000),
    notAfter: new Date(Date.now() + 24 * 3600_000),
    signingAlgorithm: { name: "ECDSA", hash: HASH },
    publicKey: leafKeypair.publicKey,
    signingKey: caKeypair.privateKey,
    extensions: [
      new x509.BasicConstraintsExtension(false, undefined, true),
      new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature, true),
      new x509.SubjectAlternativeNameExtension([
        { type: "dns", value: hostname },
      ]),
    ],
  });

  const [privateJwk, publicJwk] = await Promise.all([
    crypto.subtle.exportKey("jwk", leafKeypair.privateKey),
    crypto.subtle.exportKey("jwk", leafKeypair.publicKey),
  ]);

  const outDir = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    ".haip-lab",
  );
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "leaf-cert.der"), Buffer.from(leafCert.rawData));
  writeFileSync(join(outDir, "ca.pem"), caCert.toString("pem"));
  writeFileSync(
    join(outDir, "signer-private.jwk.json"),
    JSON.stringify(privateJwk),
  );
  writeFileSync(
    join(outDir, "signer-public.jwk.json"),
    JSON.stringify(publicJwk),
  );

  console.log(`Wrote HAIP lab fixtures to ${outDir}`);
  console.log(
    "Paste ca.pem into the suite plan's Request Object Trust Anchor.",
  );
}

main();
