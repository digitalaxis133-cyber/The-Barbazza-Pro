"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Clapperboard,
  DoorOpen,
  Eye,
  Film,
  Handshake,
  Mic2,
  Play,
  Scissors,
  Sparkles,
  Target,
  Users,
  ExternalLink,
  Camera,
  Music2,
  ListChecks,
  MapPin,
} from "lucide-react";
import "./year-one.css";

const chapters = [
  {
    time: "0:00 – 0:35",
    title: "The opening",
    body: "Silence, the door, empty chairs, clippers waking up. A year ago we started with a vision.",
    Icon: DoorOpen,
  },
  {
    time: "0:35 – 1:15",
    title: "The vision",
    body: "Why Barbazza exists in Kigali — craft in black & white, chairs with intention, a house standard.",
    Icon: Target,
  },
  {
    time: "1:15 – 2:00",
    title: "The numbers",
    body: "Services, clients, returns, days open — large quiet typography over real shop footage.",
    Icon: Eye,
  },
  {
    time: "2:00 – 3:05",
    title: "The hard part",
    body: "After close. Decisions. Mistakes. The work people don’t see. Growth that wasn’t comfortable.",
    Icon: Mic2,
  },
  {
    time: "3:05 – 4:05",
    title: "The people",
    body: "Barbers, clients, the team that opens early and stays late. The chairs that give the brand life.",
    Icon: Users,
  },
  {
    time: "4:05 – 5:10",
    title: "Next chapter",
    body: "One year. More than a cut. Gratitude, logo, pull-back — and we’re just getting started.",
    Icon: Sparkles,
  },
];

const inspirations = [
  {
    id: "28OYtRKo1PQ",
    title: "The Belmont Barbershop",
    blurb: "Small Business Revolution — calm craft, community, and the real work behind a classic shop.",
    meta: "YouTube · Documentary short",
  },
  {
    id: "1amOPUn49aM",
    title: "The Barber of Little Rock",
    blurb: "Oscar-nominated New Yorker short — purpose, teaching, and building beyond the chair.",
    meta: "YouTube · The New Yorker",
  },
  {
    id: "G0RbgK1r21Y",
    title: "Schorem Barbers",
    blurb: "Rotterdam documentary energy — identity, brotherhood, and a brand born from the floor.",
    meta: "YouTube · Extended cut",
  },
  {
    id: "1gPmgIt9524",
    title: "Mr. Moore’s Barber Shop",
    blurb: "A neighborhood house of trust — generational craft and community as the real product.",
    meta: "YouTube · Community film",
  },
  {
    id: "OVzhcmGRDL0",
    title: "Miguel’s Riverside Barber Shop",
    blurb: "Small Business Revolution Main Street — a sneak peek at barbershop storytelling on screen.",
    meta: "YouTube · Sneak peek",
  },
];

const collect = [
  { title: "Opening date", detail: "The day Barbazza officially opened the doors." },
  { title: "Real numbers", detail: "Services, unique clients, returns, barbers, days open." },
  { title: "Challenges", detail: "3–5 hard truths you’re willing to say on camera." },
  { title: "Year-two vision", detail: "What the next chapter must protect and grow." },
  { title: "Early footage", detail: "Setup, first clients, branding, empty chairs — archive or honest recreations." },
  { title: "Team moments", detail: "Barbers, manager, cleaner, clients — people who feel seen." },
];

function fadeUp(reduce: boolean | null, delay = 0) {
  return {
    initial: reduce ? false : { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as const },
  };
}

export default function YearOneDocumentaryPage() {
  const reduce = useReducedMotion();

  return (
    <div className="yo">
      <header className="yo-nav">
        <Link href="/" className="yo-nav-brand" aria-label="Barbazza home">
          <img src="/logo.png" alt="" />
          <span className="yo-nav-mark">Year One</span>
        </Link>
        <nav className="yo-nav-links" aria-label="Sections">
          <a href="#film">Film</a>
          <a href="#look">Look</a>
          <a href="#numbers">Numbers</a>
          <a href="#inspire">Inspiration</a>
          <a href="#produce">Produce</a>
        </nav>
        <a className="yo-nav-cta" href="https://www.thebarbazza.com/book">
          Book a chair
        </a>
      </header>

      <section className="yo-hero">
        <motion.div
          className="yo-hero-media"
          aria-hidden
          initial={reduce ? false : { scale: 1.1 }}
          animate={reduce ? undefined : { scale: 1 }}
          transition={{ duration: 14, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="yo-hero-veil" aria-hidden />
        <div className="yo-hero-grain" aria-hidden />
        <div className="yo-hero-copy">
          <motion.p
            className="yo-kicker"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <Film /> Documentary brief · Barbazza Kigali
          </motion.p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            BARBAZZA
            <em>Year one. More than a cut.</em>
          </motion.h1>
          <motion.p
            className="yo-hero-lede"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.48 }}
          >
            A calm, cinematic anniversary film about building a barbershop in Ubutare — the vision, the numbers,
            the hard days, the chairs, and the people who made year one real.
          </motion.p>
          <motion.div
            className="yo-hero-meta"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <span>~4–5 minutes</span>
            <span>Founder VO + interviews</span>
            <span>Craft in black &amp; white</span>
          </motion.div>
        </div>
        <div className="yo-scroll-hint">Scroll the story</div>
      </section>

      <section className="yo-section" id="concept">
        <motion.p className="yo-eyebrow" {...fadeUp(reduce)}>
          <Clapperboard /> The concept
        </motion.p>
        <motion.h2 {...fadeUp(reduce, 0.05)}>Not an advert. A short documentary.</motion.h2>
        <motion.p className="yo-lede" {...fadeUp(reduce, 0.1)}>
          One year ago we had a vision. Today we have a story — and we are still building. This film should make
          clients proud to belong here, make every barber feel seen, and show the human side of Barbazza beyond the
          fade.
        </motion.p>

        <div className="yo-grid-2">
          <motion.blockquote className="yo-quote" {...fadeUp(reduce, 0.05)}>
            “We started with a vision. One year later, we have a story. Year one. More than a cut. And we’re just
            getting started.”
            <cite>Closing line · Founder VO</cite>
          </motion.blockquote>
          <motion.div className="yo-film-strip" {...fadeUp(reduce, 0.12)}>
            <figure>
              <img src="/year-one/craft-cut.jpg" alt="Precise cut in the chair" />
              <figcaption>Craft</figcaption>
            </figure>
            <figure>
              <img src="/year-one/twin-chairs.jpg" alt="Two barbers working side by side" />
              <figcaption>Chairs</figcaption>
            </figure>
            <figure>
              <img src="/year-one/tools-detail.jpg" alt="Barber tools detail" />
              <figcaption>Tools</figcaption>
            </figure>
            <figure>
              <img src="/year-one/high-five.jpg" alt="Team energy after a cut" />
              <figcaption>Team</figcaption>
            </figure>
          </motion.div>
        </div>
      </section>

      <section className="yo-section--mist" id="film">
        <div className="yo-section-inner">
          <motion.p className="yo-eyebrow" {...fadeUp(reduce)}>
            <Scissors /> Film structure
          </motion.p>
          <motion.h2 {...fadeUp(reduce, 0.05)}>Seven beats. One house story.</motion.h2>
          <motion.p className="yo-lede" {...fadeUp(reduce, 0.1)}>
            Flexible timing. Authenticity over a forced clock. Shop sound is half the soundtrack — clippers, door,
            laughter, footsteps.
          </motion.p>

          <div className="yo-chapters">
            {chapters.map((chapter, i) => (
              <motion.article className="yo-chapter" key={chapter.title} {...fadeUp(reduce, i * 0.04)}>
                <div className="yo-chapter-top">
                  <div className="yo-chapter-icon" aria-hidden>
                    <chapter.Icon strokeWidth={1.6} />
                  </div>
                  <span className="yo-chapter-time">{chapter.time}</span>
                </div>
                <h3>{chapter.title}</h3>
                <p>{chapter.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="yo-section" id="look">
        <motion.p className="yo-eyebrow" {...fadeUp(reduce)}>
          <Camera /> Visual language
        </motion.p>
        <motion.h2 {...fadeUp(reduce, 0.05)}>Black &amp; white. Bold. Straight.</motion.h2>
        <motion.p className="yo-lede" {...fadeUp(reduce, 0.1)}>
          The Barbazza look from the brand work — strict monochrome, strong stripe language for uniforms and cape,
          no sports clutter. The film should feel like craft on paper: ink, grain, quiet luxury.
        </motion.p>

        <motion.div className="yo-brand-board" {...fadeUp(reduce, 0.08)}>
          <div className="yo-brand-main">
            <img src="/year-one/stripe-polo.jpg" alt="Black and white striped barber polo direction" />
            <div className="yo-brand-note">Uniform direction · bold vertical stripes</div>
          </div>
          <div className="yo-brand-side">
            <div>
              <img src="/year-one/stripe-cape.jpg" alt="Matching striped barber cape" />
              <div className="yo-brand-note">Cape · same stripe language</div>
            </div>
            <div>
              <img src="/year-one/firm-shop.jpg" alt="Moody barbershop interior reference" />
              <div className="yo-brand-note">Shop mood · shadow &amp; steel</div>
            </div>
          </div>
        </motion.div>

        <div className="yo-vo">
          <p>Shoot early morning empty chairs and peak-hour energy.</p>
          <p>Detail shots: hands, clippers, cape shake, mirror lines, finish.</p>
          <p>Interviews off-lens. Founder looks into camera only for the close.</p>
        </div>
      </section>

      <section className="yo-section--dark" id="numbers">
        <div className="yo-section-inner">
          <motion.p className="yo-eyebrow" {...fadeUp(reduce)}>
            <Eye /> One year in numbers
          </motion.p>
          <motion.h2 {...fadeUp(reduce, 0.05)}>Proof without flash.</motion.h2>
          <motion.p className="yo-lede" {...fadeUp(reduce, 0.1)}>
            Fill every figure with real Barbazza data before the final VO. One number on screen at a time. No
            invented milestones.
          </motion.p>

          <div className="yo-stats">
            {[
              ["[Services]", "Haircuts & services delivered"],
              ["[Clients]", "People who sat in our chairs"],
              ["[Returns]", "Who came back"],
              ["[Days]", "Days the doors opened"],
            ].map(([value, label]) => (
              <div className="yo-stat" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="yo-vo">
            <p>Behind every number is a conversation, a finish, a reason someone returned.</p>
            <p>The numbers show how far we’ve come. They don’t show what it took.</p>
          </div>
        </div>
      </section>

      <section className="yo-section" id="voice">
        <div className="yo-grid-2">
          <div>
            <motion.p className="yo-eyebrow" {...fadeUp(reduce)}>
              <Mic2 /> Founder voice
            </motion.p>
            <motion.h2 {...fadeUp(reduce, 0.05)}>Carry the vision. Don’t steal the hero role.</motion.h2>
            <motion.p className="yo-lede" {...fadeUp(reduce, 0.1)}>
              You narrate the arc. The barbers, clients, and daily craft carry the emotion. Keep VO short enough for
              silence and shop sound to breathe.
            </motion.p>
          </div>
          <motion.div {...fadeUp(reduce, 0.12)}>
            <img
              src="/year-one/quiet-close.jpg"
              alt="Quiet end-of-day barbershop mood"
              style={{ width: "100%", display: "block", filter: "grayscale(1) contrast(1.05)" }}
            />
          </motion.div>
        </div>

        <div className="yo-vo">
          <p>A year ago, we opened a door on KK 31 Avenue.</p>
          <p>Not just to cut hair — to build a place in Kigali where the chair meant something.</p>
          <p>Confidence. Craft. A team that shows up.</p>
        </div>
      </section>

      <section className="yo-section--mist" id="inspire">
        <div className="yo-section-inner">
          <motion.p className="yo-eyebrow" {...fadeUp(reduce)}>
            <Play /> Watch before you shoot
          </motion.p>
          <motion.h2 {...fadeUp(reduce, 0.05)}>Inspiration reels</motion.h2>
          <motion.p className="yo-lede" {...fadeUp(reduce, 0.1)}>
            Study tone, pacing, and honesty — not to copy, but to aim the Barbazza film at the same level of care.
            Open each on YouTube.
          </motion.p>

          <div className="yo-inspo">
            {inspirations.map((item, i) => (
              <motion.a
                key={item.id}
                className="yo-inspo-card"
                href={`https://www.youtube.com/watch?v=${item.id}`}
                target="_blank"
                rel="noreferrer"
                {...fadeUp(reduce, i * 0.05)}
              >
                <div className="yo-inspo-thumb">
                  <img
                    src={`https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`}
                    alt=""
                    loading="lazy"
                  />
                  <div className="yo-inspo-play" aria-hidden>
                    <span>
                      <Play fill="currentColor" />
                    </span>
                  </div>
                </div>
                <div className="yo-inspo-body">
                  <strong>{item.title}</strong>
                  <p>{item.blurb}</p>
                  <div className="yo-inspo-meta">
                    {item.meta} · Watch <ExternalLink style={{ width: 11, height: 11, display: "inline" }} />
                  </div>
                </div>
              </motion.a>
            ))}

            <motion.a
              className="yo-inspo-card"
              href="https://www.whereweconverge.com/post/more-than-a-cut-j-styles-barber-shops-25-years-as-a-south-seattle-community-hub"
              target="_blank"
              rel="noreferrer"
              {...fadeUp(reduce, 0.2)}
            >
              <div className="yo-inspo-thumb">
                <img src="/year-one/firm-shop.jpg" alt="" />
                <div className="yo-inspo-play" aria-hidden>
                  <span>
                    <ExternalLink />
                  </span>
                </div>
              </div>
              <div className="yo-inspo-body">
                <strong>More Than a Cut — J Styles</strong>
                <p>
                  Converge Media feature on a 25-year community barbershop — the same “more than a cut” spirit as
                  Barbazza’s title.
                </p>
                <div className="yo-inspo-meta">Article · Reading reference</div>
              </div>
            </motion.a>
          </div>
        </div>
      </section>

      <section className="yo-section" id="produce">
        <motion.p className="yo-eyebrow" {...fadeUp(reduce)}>
          <ListChecks /> Produce
        </motion.p>
        <motion.h2 {...fadeUp(reduce, 0.05)}>Collect before the camera rolls.</motion.h2>
        <motion.p className="yo-lede" {...fadeUp(reduce, 0.1)}>
          The real Barbazza story is what makes this film unique. Don’t invent numbers or struggles that weren’t
          lived.
        </motion.p>

        <div className="yo-checklist">
          {collect.map((item, i) => (
            <motion.div className="yo-check" key={item.title} {...fadeUp(reduce, i * 0.04)}>
              <Handshake strokeWidth={1.6} />
              <div>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="yo-grid-2" style={{ marginTop: "3rem" }}>
          <motion.div {...fadeUp(reduce)}>
            <p className="yo-eyebrow">
              <Music2 /> Sound
            </p>
            <h3 style={{ fontFamily: "var(--yo-display)", fontSize: "1.8rem", margin: "0 0 0.75rem", fontWeight: 500 }}>
              Music under. Shop on top.
            </h3>
            <p className="yo-lede" style={{ marginTop: 0 }}>
              Opening almost silent. Challenges restrained. People warm. Closing soft rise then fade under the logo.
              Mute the score in places so clippers and talk can breathe.
            </p>
          </motion.div>
          <motion.div {...fadeUp(reduce, 0.08)}>
            <p className="yo-eyebrow">
              <MapPin /> Place
            </p>
            <h3 style={{ fontFamily: "var(--yo-display)", fontSize: "1.8rem", margin: "0 0 0.75rem", fontWeight: 500 }}>
              186 KK 31 Ave, Ubutare
            </h3>
            <p className="yo-lede" style={{ marginTop: 0 }}>
              End card: BARBAZZA · YEAR ONE · More than a cut · thebarbazza.com · +250 791 345 455
            </p>
          </motion.div>
        </div>
      </section>

      <section className="yo-final">
        <motion.h2 {...fadeUp(reduce)}>This is Barbazza. Year one.</motion.h2>
        <motion.p {...fadeUp(reduce, 0.08)}>
          Craft in black &amp; white. Book a barber — or help us finish the film that tells how we got here.
        </motion.p>
        <motion.div className="yo-final-actions" {...fadeUp(reduce, 0.12)}>
          <a className="yo-btn yo-btn--ink" href="https://www.thebarbazza.com/book">
            Book a barber
          </a>
          <a className="yo-btn yo-btn--ghost" href="https://www.thebarbazza.com/team">
            Meet the chairs
          </a>
          <a className="yo-btn yo-btn--ghost" href="https://www.youtube.com/watch?v=28OYtRKo1PQ" target="_blank" rel="noreferrer">
            Watch a reference
          </a>
        </motion.div>
      </section>

      <footer className="yo-footer">
        <span>Barbazza · Year One documentary brief</span>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <a href="https://www.thebarbazza.com">thebarbazza.com</a>
          <a href="https://year.thebarbazza.com">year.thebarbazza.com</a>
          <a href="tel:+250791345455">+250 791 345 455</a>
        </div>
      </footer>
    </div>
  );
}
