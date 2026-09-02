"use client";

import dynamic from "next/dynamic";

const VerifyWidget = dynamic(() => import("./verify-widget"), {
  ssr: false,
  loading: () => <p>Loading verification widget…</p>,
});

export default function VerifyWidgetLoader() {
  return <VerifyWidget />;
}
