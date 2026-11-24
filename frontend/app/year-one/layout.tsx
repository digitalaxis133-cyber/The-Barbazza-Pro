import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Year One — More Than a Cut",
  description:
    "Barbazza Year One documentary brief — a calm cinematic anniversary film about vision, numbers, challenges, and the people behind the chairs in Kigali.",
  alternates: {
    canonical: "https://year.thebarbazza.com",
  },
  openGraph: {
    title: "Barbazza — Year One. More than a cut.",
    description:
      "Documentary brief for Barbazza’s first year in Kigali — craft in black & white.",
    url: "https://year.thebarbazza.com",
    images: [{ url: "/public-art/hero-shop.jpg", width: 1200, height: 800, alt: "Barbazza Year One" }],
  },
  robots: { index: true, follow: true },
};

export default function YearOneLayout({ children }: { children: React.ReactNode }) {
  return children;
}
