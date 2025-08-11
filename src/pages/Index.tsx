import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, ShieldCheck, Award, CheckCircle2, Wrench, Truck, GraduationCap } from "lucide-react";

import heroImage from "@/assets/janik-hero.jpg";
import stihlLogo from "@/assets/brand-stihl.svg";
import stigaLogo from "@/assets/brand-stiga.svg";
import makitaLogo from "@/assets/brand-makita.svg";
import fiskarsLogo from "@/assets/brand-fiskars.svg";
import dakrLogo from "@/assets/logo-dakr.jpg";

import promoStiga from "@/assets/promo-stiga-robot.jpg";
import promoMakita from "@/assets/promo-makita-dlm533.jpg";

import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";
import g5 from "@/assets/gallery-5.jpg";
import g6 from "@/assets/gallery-6.jpg";

const navItems = [
  { href: "#onas", label: "O nás" },
  { href: "#sortiment", label: "Sortiment" },
  { href: "#akce", label: "Prodejní akce" },
  { href: "#sluzby", label: "Služby" },
  { href: "#prodejna", label: "Prodejna" },
  { href: "#kontakt", label: "Kontakt" },
];

const Index = () => {
  const [open, setOpen] = useState(false);
  const gallery = [g1, g2, g3, g4, g5, g6, g1, g2, g3, g4, g5, g6];

  return (
    <div>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50">Přeskočit na obsah</a>

      <header className="fixed top-0 inset-x-0 z-50">
        <div className="glass container mx-auto mt-4 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <a href="#hero" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-primary/20 border border-white/10" />
              <span className="text-lg font-semibold tracking-wide"><span className="text-gradient-primary">JANÍK</span> zahradní a lesní technika</span>
            </a>

            <nav className="hidden md:flex items-center gap-6 text-sm">
              {navItems.map((item) => (
                <a key={item.href} href={item.href} className="text-foreground/80 hover:text-foreground transition-colors story-link">
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="md:hidden">
              <Button variant="glass" size="icon" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
                {open ? <X /> : <Menu />}
              </Button>
            </div>
          </div>

          {open && (
            <div className="md:hidden pt-3 animate-fade-in">
              <div className="grid gap-2">
                {navItems.map((item) => (
                  <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="px-2 py-2 rounded-md hover:bg-accent/50">
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <section id="hero" aria-label="JANÍK – hero" className="relative min-h-[88vh] w-full flex items-center overflow-hidden" style={{ backgroundImage: `url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/60 to-background/30" />
        <div className="container relative z-10 pt-28 pb-16">
          <h1 id="main" className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight max-w-4xl animate-enter">
            <span className="text-gradient-primary">JANÍK</span> – Vaše spolehlivá zahradní a lesní technika od roku 1998
          </h1>
          <p className="mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground animate-fade-in">
            Autorizovaný prodej a servis značek STIHL, STIGA, MAKITA, DAKR, FISKARS a dalších. Profesionální přístup, špičková kvalita, důraz na bezpečnost a spolehlivost.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#kontakt"><Button variant="hero" className="px-6 py-6 text-base">Kontaktujte nás</Button></a>
            <a href="#sortiment"><Button variant="glass" className="px-6 py-6 text-base">Prohlédnout sortiment</Button></a>
          </div>
        </div>
      </section>

      <main id="main-content" className="container relative z-10 space-y-24 py-20">
        {/* O nás */}
        <section id="onas" aria-labelledby="onas-title">
          <header className="mb-8">
            <h2 id="onas-title" className="text-3xl md:text-4xl font-bold tracking-tight">O NÁS</h2>
            <p className="text-muted-foreground">Tradice, odbornost a tisíce spokojených zákazníků od roku 1998.</p>
          </header>
          <div className="grid md:grid-cols-3 gap-6">
            <article className="md:col-span-2 glass rounded-xl p-6 leading-relaxed space-y-4">
              <p>Dobrý den,</p>
              <p>jmenuji se Bronislav Janík a jsem Vaším autorizovaným dodavatelem lesní a zahradní techniky značek STIHL, STIGA, MAKITA, DAKR aj.</p>
              <p>Je mi potěšením poskytovat Vám služby již od roku 1998. Od té doby se prodaly doslova tisíce strojů, které vám, pevně věřím, přinášejí především užitek a spokojenost při práci na zahradách, či ve vašich lesích.</p>
              <p>Od samého začátku Vám nabízíme stroje od největšího světového výrobce této techniky STIHL. Sám osobně jsem skálopevně přesvědčen, že je to v tomto segmentu ta nejkvalitnější značka, kterou si můžete dopřát. Dále si u nás můžete pořídit techniku značek STIGA, MAKITA, DAKR, Fiskars a dalších, u kterých garantujeme prvotřídní kvalitu a spolehlivost.</p>
              <p>Nikdy nebudeme prodávat výrobky pochybné kvality, u kterých by nebyla zajištěna odpovídající servisní podpora a které by byly spíše pro potíže, než pro užitek. Takový segment milerádi přenecháme i nadále trhovcům, hobbymarketům a všem různým „specialistům a expertům na zahrady“. Taky jste si všimli, že podle reklam v médiích, je dnes kdekdo odborníkem na lesní a zahradní techniku? Že je najednou spousta „značek“ o kterých nikdo předtím neslyšel, ale snaží se navodit dojem, že s nimi pracuje celý svět? Tak toho se u nás bát rozhodně nemusíte, protože není celosvětově známější značka, než námi zastupovaný legendární STIHL.</p>
              <p>Ať už potřebujete profesionální pilu pro každodenní mnohahodinou práci, nebo pilu pro občasné použití kolem domu, ať potřebujete sekat trávník, nebo udržovat živé ploty, prostě na všechny práce v lese, či na zahradě, jste u nás na té správné adrese.</p>
            </article>
            <aside className="grid grid-cols-1 gap-4">
              <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2"><Award className="text-primary" /><h3 className="font-semibold">KVALITA</h3></div>
                <p className="text-sm text-muted-foreground">Nejdůležitější kritérium, které oceníte především Vy – koncoví uživatelé. Špičkové materiály, vývoj a moderní technologie.</p>
              </div>
              <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2"><ShieldCheck className="text-primary" /><h3 className="font-semibold">BEZPEČNOST</h3></div>
                <p className="text-sm text-muted-foreground">Ergonomie a bezpečnost na prvním místě. Konstrukce s mimořádnými nároky na ochranu uživatele.</p>
              </div>
              <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2"><CheckCircle2 className="text-primary" /><h3 className="font-semibold">SPOLEHLIVOST</h3></div>
                <p className="text-sm text-muted-foreground">Obrovská obliba po celém světě díky dlouhodobé spolehlivosti. I po desítkách let stroje stále slouží.</p>
              </div>
            </aside>
          </div>
        </section>

        {/* Sortiment */}
        <section id="sortiment" aria-labelledby="sortiment-title">
          <header className="mb-8">
            <h2 id="sortiment-title" className="text-3xl md:text-4xl font-bold tracking-tight">Sortiment</h2>
            <p className="text-muted-foreground">Kliknutím na logo zobrazíte přehled výrobků.</p>
          </header>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { name: 'STIHL', img: stihlLogo },
              { name: 'STIGA', img: stigaLogo },
              { name: 'MAKITA', img: makitaLogo },
              { name: 'FISKARS', img: fiskarsLogo },
              { name: 'DAKR', img: dakrLogo },
            ].map((b) => (
              <a key={b.name} href="#" className="glass rounded-xl p-4 flex flex-col items-center gap-3 hover-scale">
                <img src={b.img} alt={`${b.name} logo`} loading="lazy" decoding="async" className="w-full h-24 object-contain" />
                <div className="text-center">
                  <h3 className="font-semibold">{b.name}</h3>
                  <p className="text-xs text-muted-foreground">PRO PŘEHLED VÝROBKŮ KLIKNI NA LOGO</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Prodejní akce */}
        <section id="akce" aria-labelledby="akce-title">
          <header className="mb-8">
            <h2 id="akce-title" className="text-3xl md:text-4xl font-bold tracking-tight">Prodejní akce</h2>
            <p className="text-muted-foreground">Aktuální zvýhodněné nabídky. Nepropásněte výhodný nákup.</p>
          </header>
          <div className="grid md:grid-cols-2 gap-6">
            <article className="glass rounded-xl overflow-hidden">
              <img src={promoStiga} alt="STIGA robotické sekačky – ilustrační foto" loading="lazy" decoding="async" className="w-full h-56 object-cover" />
              <div className="p-5 space-y-2">
                <h3 className="text-xl font-semibold">STIGA robotické sekačky</h3>
                <p className="text-sm text-muted-foreground">Chytré sečení bez námahy. Tichý provoz, precizní výsledek – ideální pro moderní zahrady.</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-primary font-bold">SLEVA až 15 %</span>
                  <span className="text-xs text-muted-foreground">Platnost: 1. 4. – 30. 6. 2025</span>
                </div>
              </div>
            </article>

            <article className="glass rounded-xl overflow-hidden">
              <img src={promoMakita} alt="MAKITA DLM533ZX2 – ilustrační foto" loading="lazy" decoding="async" className="w-full h-56 object-cover" />
              <div className="p-5 space-y-2">
                <h3 className="text-xl font-semibold">MAKITA DLM533ZX2</h3>
                <p className="text-sm text-muted-foreground">Profesionální aku sekačka s vysokým výkonem a dlouhou výdrží. Ideální pro náročné uživatele.</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-primary font-bold">Akční cena již od 16 990 Kč</span>
                  <span className="text-xs text-muted-foreground">Platnost: do vyprodání zásob</span>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Služby */}
        <section id="sluzby" aria-labelledby="sluzby-title">
          <header className="mb-8">
            <h2 id="sluzby-title" className="text-3xl md:text-4xl font-bold tracking-tight">Služby</h2>
            <p className="text-muted-foreground">Kompletní péče o vás i vaše stroje.</p>
          </header>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2"><Wrench className="text-primary" /><h3 className="font-semibold">SERVIS</h3></div>
              <p className="text-sm text-muted-foreground">Záruční i pozáruční servis, diagnostika a odborné opravy ve vlastním zázemí.</p>
            </div>
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2"><Truck className="text-primary" /><h3 className="font-semibold">DOPRAVA</h3></div>
              <p className="text-sm text-muted-foreground">Bezpečná doprava strojů až k vám domů. Zajištění uvedení do provozu.</p>
            </div>
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2"><GraduationCap className="text-primary" /><h3 className="font-semibold">ODBORNOST</h3></div>
              <p className="text-sm text-muted-foreground">Profesionální poradenství a školení používání techniky pro efektivní a bezpečnou práci.</p>
            </div>
          </div>
        </section>

        {/* Prodejna */}
        <section id="prodejna" aria-labelledby="prodejna-title">
          <header className="mb-8">
            <h2 id="prodejna-title" className="text-3xl md:text-4xl font-bold tracking-tight">Prodejna</h2>
            <p className="text-muted-foreground">Navštivte nás. Rádi vám pomůžeme s výběrem.</p>
          </header>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-6 space-y-4">
              <div>
                <h3 className="font-semibold">Adresa</h3>
                <p className="text-muted-foreground text-sm">(doplnit ulici a číslo), (PSČ) (město)</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Standardní otevírací doba</h4>
                  <table className="w-full text-sm text-muted-foreground">
                    <tbody>
                      <tr><td>Po–Pá</td><td className="text-right">08:00 – 17:00</td></tr>
                      <tr><td>Sobota</td><td className="text-right">09:00 – 12:00</td></tr>
                      <tr><td>Neděle</td><td className="text-right">Zavřeno</td></tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h4 className="font-semibold">Mimosezóna</h4>
                  <table className="w-full text-sm text-muted-foreground">
                    <tbody>
                      <tr><td>Po–Pá</td><td className="text-right">09:00 – 16:00</td></tr>
                      <tr><td>So–Ne</td><td className="text-right">Zavřeno</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <a href="https://maps.google.com" target="_blank" rel="noreferrer"><Button variant="glass">Zobrazit na mapě</Button></a>
                <a href="#galerie"><Button variant="default">Galerie</Button></a>
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="grid grid-cols-3 gap-2">
                {gallery.slice(0,6).map((src, i) => (
                  <img key={i} src={src} alt={`Foto prodejny ${i+1}`} loading="lazy" decoding="async" className="h-28 w-full object-cover rounded" />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Galerie */}
        <section id="galerie" aria-labelledby="galerie-title">
          <header className="mb-8">
            <h2 id="galerie-title" className="text-3xl md:text-4xl font-bold tracking-tight">Galerie</h2>
            <p className="text-muted-foreground">Prodejna a sortiment.</p>
          </header>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {gallery.map((src, i) => (
              <img key={i} src={src} alt={`Galerie ${i+1}`} loading="lazy" decoding="async" className="aspect-video w-full object-cover rounded-lg" />
            ))}
          </div>
        </section>

        {/* Partneři */}
        <section id="partneri" aria-labelledby="partneri-title">
          <header className="mb-8">
            <h2 id="partneri-title" className="text-3xl md:text-4xl font-bold tracking-tight">Naši partneři</h2>
          </header>
          <div className="glass rounded-xl p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 items-center">
            {[stihlLogo, stigaLogo, dakrLogo, fiskarsLogo, makitaLogo].map((src, i) => (
              <img key={i} src={src} alt="Logo partnera" loading="lazy" decoding="async" className="h-12 w-full object-contain opacity-90 hover:opacity-100 transition-opacity" />
            ))}
          </div>
        </section>

        {/* Kontakt */}
        <section id="kontakt" aria-labelledby="kontakt-title">
          <header className="mb-8">
            <h2 id="kontakt-title" className="text-3xl md:text-4xl font-bold tracking-tight">Kontakt</h2>
          </header>
          <div className="glass rounded-xl p-6 grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold">JANÍK zahradní a lesní technika</h3>
              <p className="text-sm text-muted-foreground">(doplnit ulici a číslo)<br/>(PSČ) (město)</p>
              <p className="text-sm text-muted-foreground">Tel.: +420 000 000 000<br/>E-mail: info@janik.cz</p>
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <a href="tel:+420000000000"><Button variant="hero">Zavolat</Button></a>
              <a href="mailto:info@janik.cz"><Button variant="glass">Napsat e‑mail</Button></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-24 border-t border-white/10">
        <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} JANÍK – zahradní a lesní technika</p>
          <nav className="flex items-center gap-4 text-sm">
            <a href="#" className="hover:underline">Facebook</a>
            <a href="#" className="hover:underline">Instagram</a>
            <a href="#kontakt" className="hover:underline">Kontakt</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Index;
