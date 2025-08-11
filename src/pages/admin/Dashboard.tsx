import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { upsertFile, type GitHubConfig } from "@/lib/githubClient";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2, Plus } from "lucide-react";

// Types and schemas
export type Promotion = {
  id: string;
  title: string;
  description?: string;
  price?: string;
  validUntil?: string; // YYYY-MM-DD
  imageUrl?: string;
  link?: string;
  tags?: string[];
};

export type NewsItem = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  summary?: string;
  body?: string;
  imageUrl?: string;
  link?: string;
};

const newsSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Zadejte nadpis"),
  date: z.string().min(1, "Zadejte datum"),
  summary: z.string().optional(),
  body: z.string().optional(),
  imageUrl: z.string().optional().refine((v) => !v || /^https?:\/\//.test(v) || /^\//.test(v), "Musí být platná URL nebo cesta od kořene (/...)") ,
  link: z.string().url("Musí být platná URL").optional().or(z.literal("")),
});

const promoSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Zadejte název"),
  description: z.string().optional(),
  price: z.string().optional(),
  validUntil: z.string().optional(),
  imageUrl: z.string().optional().refine((v) => !v || /^https?:\/\//.test(v) || /^\//.test(v), "Musí být platná URL nebo cesta od kořene (/...)") ,
  link: z.string().url("Musí být platná URL").optional().or(z.literal("")),
  tags: z.string().optional(), // comma-separated in form
});

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function useStoredState<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal] as const;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const owner = "janik-technika";
  const repo = "janik-tech-spark";
  const branch = "main";
  const [rememberToken, setRememberToken] = useStoredState("gh_remember", true);
  const [tokenInput, setTokenInput] = useState("");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [promos, setPromos] = useState<Promotion[]>([]);

  // Dialog states
  const [newsDialogOpen, setNewsDialogOpen] = useState(false);
  const [editingNewsIndex, setEditingNewsIndex] = useState<number | null>(null);
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPromoIndex, setEditingPromoIndex] = useState<number | null>(null);

  // File input refs
  const newsFileInputRef = useRef<HTMLInputElement>(null);
  const promoFileInputRef = useRef<HTMLInputElement>(null);

  // Helper: convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Upload image to GitHub and return public raw URL
  const uploadImage = async (file: File, subdir: "news" | "promos"): Promise<string> => {
    if (!cfg) throw new Error("Nejprve vyplňte GitHub nastavení a token.");
    const ext = file.name.split(".").pop() || "bin";
    const safeNamePart = file.name.replace(/[^a-zA-Z0-9-_]+/g, "").slice(0, 32) || "file";
    const ts = Date.now();
    const path = `public/content/uploads/${subdir}/${ts}-${safeNamePart}.${ext}`;
    const buffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(path)}`;

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `chore(content): upload image ${file.name}`,
        content: base64,
        branch: cfg.branch,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`GitHub upload failed ${res.status}: ${t}`);
    }

    // Build relative URL served from /public
    const relativeUrl = '/' + path.replace(/^public\//, '');
    return relativeUrl;
  };

  // Handlers for file selection
  const triggerNewsFile = () => newsFileInputRef.current?.click();
  const triggerPromoFile = () => promoFileInputRef.current?.click();

  const onNewsFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast({ title: "Nahrávám obrázek..." });
      const url = await uploadImage(file, "news");
      newsForm.setValue("imageUrl", url, { shouldValidate: true });
      toast({ title: "Obrázek nahrán", description: "URL vyplněna automaticky." });
    } catch (err: any) {
      toast({ title: "Chyba nahrávání", description: String(err?.message || err), variant: "destructive" });
    } finally {
      e.target.value = "";
    }
  };

  const onPromoFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast({ title: "Nahrávám obrázek..." });
      const url = await uploadImage(file, "promos");
      promoForm.setValue("imageUrl", url, { shouldValidate: true });
      toast({ title: "Obrázek nahrán", description: "URL vyplněna automaticky." });
    } catch (err: any) {
      toast({ title: "Chyba nahrávání", description: String(err?.message || err), variant: "destructive" });
    } finally {
      e.target.value = "";
    }
  };

  // Forms
  const newsForm = useForm<z.infer<typeof newsSchema>>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      title: "",
      date: new Date().toISOString().slice(0, 10),
      summary: "",
      body: "",
      imageUrl: "",
      link: "",
    },
  });

  const promoForm = useForm<z.infer<typeof promoSchema>>({
    resolver: zodResolver(promoSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "",
      validUntil: "",
      imageUrl: "",
      link: "",
      tags: "",
    },
  });

  // Reset forms when opening dialogs
  useEffect(() => {
    if (!newsDialogOpen) return;
    const item = editingNewsIndex != null ? news[editingNewsIndex] : undefined;
    newsForm.reset({
      title: item?.title ?? "",
      date: item?.date ?? new Date().toISOString().slice(0, 10),
      summary: item?.summary ?? "",
      body: item?.body ?? "",
      imageUrl: item?.imageUrl ?? "",
      link: item?.link ?? "",
    });
  }, [newsDialogOpen, editingNewsIndex]);

  useEffect(() => {
    if (!promoDialogOpen) return;
    const item = editingPromoIndex != null ? promos[editingPromoIndex] : undefined;
    promoForm.reset({
      title: item?.title ?? "",
      description: item?.description ?? "",
      price: item?.price ?? "",
      validUntil: item?.validUntil ?? "",
      imageUrl: item?.imageUrl ?? "",
      link: item?.link ?? "",
      tags: (item?.tags ?? []).join(", "),
    });
  }, [promoDialogOpen, editingPromoIndex]);

  // Handlers
  const onSubmitNews = (values: z.infer<typeof newsSchema>) => {
    const newItem: NewsItem = {
      id: values.id || genId(),
      title: values.title,
      date: values.date,
      summary: values.summary || undefined,
      body: values.body || undefined,
      imageUrl: values.imageUrl || undefined,
      link: values.link || undefined,
    };
    setNews((prev) => {
      const next = [...prev];
      if (editingNewsIndex != null) next[editingNewsIndex] = newItem;
      else next.unshift(newItem);
      return next;
    });
    setNewsDialogOpen(false);
    setEditingNewsIndex(null);
    toast({ title: editingNewsIndex != null ? "Aktualita upravena" : "Aktualita přidána" });
  };

  const onSubmitPromo = (values: z.infer<typeof promoSchema>) => {
    const newItem: Promotion = {
      id: values.id || genId(),
      title: values.title,
      description: values.description || undefined,
      price: values.price || undefined,
      validUntil: values.validUntil || undefined,
      imageUrl: values.imageUrl || undefined,
      link: values.link || undefined,
      tags: (values.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    setPromos((prev) => {
      const next = [...prev];
      if (editingPromoIndex != null) next[editingPromoIndex] = newItem;
      else next.unshift(newItem);
      return next;
    });
    setPromoDialogOpen(false);
    setEditingPromoIndex(null);
    toast({ title: editingPromoIndex != null ? "Akce upravena" : "Akce přidána" });
  };

  const deleteNews = (idx: number) => {
    if (!confirm("Opravdu smazat tuto aktualitu?")) return;
    setNews((prev) => prev.filter((_, i) => i !== idx));
  };

  const deletePromo = (idx: number) => {
    if (!confirm("Opravdu smazat tuto akci?")) return;
    setPromos((prev) => prev.filter((_, i) => i !== idx));
  };

  const token = useMemo(() => {
    const s = sessionStorage.getItem("gh_pat") || "";
    const l = localStorage.getItem("gh_pat") || "";
    return s || l || "";
  }, []);

  const [pat, setPat] = useState(token);

  useEffect(() => {
    document.title = "Administrace – Dashboard";
    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "noindex, nofollow");

    let desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!desc) {
      desc = document.createElement("meta");
      desc.setAttribute("name", "description");
      document.head.appendChild(desc);
    }
    desc.setAttribute("content", "Administrační rozhraní pro úpravu aktualit a prodejních akcí.");

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", window.location.href);
  }, []);

  useEffect(() => {
    // Načíst aktuální veřejné JSONy pro pohodlný start
    fetch("/content/news.json")
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        if (Array.isArray(data)) setNews(data as NewsItem[]);
      })
      .catch(() => {});
    fetch("/content/promotions.json")
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        if (Array.isArray(data)) setPromos(data as Promotion[]);
      })
      .catch(() => {});
  }, []);

  const saveToken = () => {
    try {
      if (!tokenInput) {
        toast({ title: "Vložte token", variant: "destructive" });
        return;
      }
      if (rememberToken) localStorage.setItem("gh_pat", tokenInput);
      else sessionStorage.setItem("gh_pat", tokenInput);
      setPat(tokenInput);
      setTokenInput("");
      toast({ title: "Token uložen" });
    } catch (e) {
      toast({ title: "Nepodařilo se uložit token", variant: "destructive" });
    }
  };

  const cfg: GitHubConfig | null = useMemo(() => {
    if (!owner || !repo || !branch || !pat) return null;
    return { owner, repo, branch, token: pat };
  }, [owner, repo, branch, pat]);

  const saveJSON = async (which: "news" | "promos") => {
    try {
      if (!cfg) {
        toast({ title: "Doplňte nastavení repozitáře a token", variant: "destructive" });
        return;
      }
      const data = which === "news" ? news : promos;
      const pretty = JSON.stringify(data, null, 2);
      const path = which === "news" ? "public/content/news.json" : "public/content/promotions.json";
      await upsertFile(path, pretty + "\n", `chore(content): update ${which}`, cfg);
      toast({ title: "Uloženo do GitHubu" });
    } catch (e: any) {
      toast({ title: "Chyba při ukládání", description: String(e?.message || e), variant: "destructive" });
    }
  };

  return (
    <main className="container py-8 space-y-8">
      <h1 className="text-3xl font-bold">Administrace</h1>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>GitHub token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Po přihlášení vložte osobní přístupový token (PAT) s oprávněním k zápisu do obsahu.</p>
            <div className="space-y-2">
              <Label htmlFor="pat">Token</Label>
              <Input id="pat" type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="ghp_..." />
            </div>
            <div className="flex items-center gap-2">
              <input id="remember" type="checkbox" checked={rememberToken} onChange={(e) => setRememberToken(e.target.checked)} />
              <Label htmlFor="remember">Zapamatovat v tomto prohlížeči</Label>
            </div>
            <Button onClick={saveToken}>Uložit token</Button>
            {pat ? <p className="text-xs text-muted-foreground">Token je uložen.</p> : <p className="text-xs text-destructive">Token zatím není uložen.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nastavení repozitáře</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="owner">Owner (uživatel/organizace)</Label>
              <Input id="owner" value={owner} readOnly disabled aria-readonly placeholder="např. my-org" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repo">Repozitář</Label>
              <Input id="repo" value={repo} readOnly disabled aria-readonly placeholder="např. janik-web" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Větev</Label>
              <Input id="branch" value={branch} readOnly disabled aria-readonly placeholder="main" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aktuality (news.json)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <Button onClick={() => { setEditingNewsIndex(null); setNewsDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Přidat aktualitu
              </Button>
              <Button variant="secondary" onClick={() => saveJSON("news")}>Uložit do GitHubu</Button>
            </div>
            <ul className="divide-y">
              {news.length === 0 && (
                <li className="text-sm text-muted-foreground py-6">Zatím žádné aktuality.</li>
              )}
              {news.map((n, i) => (
                <li key={n.id || i} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => { setEditingNewsIndex(i); setNewsDialogOpen(true); }}>
                      <Pencil className="h-4 w-4 mr-1" /> Upravit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteNews(i)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Smazat
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <Dialog open={newsDialogOpen} onOpenChange={setNewsDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingNewsIndex != null ? "Upravit aktualitu" : "Přidat aktualitu"}</DialogTitle>
                </DialogHeader>
                <Form {...newsForm}>
                  <form onSubmit={newsForm.handleSubmit(onSubmitNews)} className="space-y-4">
                    <FormField name="title" control={newsForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nadpis</FormLabel>
                        <FormControl>
                          <Input placeholder="Např. Nový sortiment" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="date" control={newsForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Datum</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="summary" control={newsForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Perex</FormLabel>
                        <FormControl>
                          <Input placeholder="Krátký popis" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="body" control={newsForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Text</FormLabel>
                        <FormControl>
                          <Textarea className="min-h-32" placeholder="Plný text aktuality" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="imageUrl" control={newsForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Obrázek</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input type="text" placeholder="https://... nebo /content/..." {...field} />
                          </FormControl>
                          <input ref={newsFileInputRef} type="file" accept="image/*" className="hidden" onChange={onNewsFileChange} />
                          <Button type="button" variant="secondary" onClick={triggerNewsFile}>Nahrát z PC</Button>
                        </div>
                        {field.value ? (
                          <img src={field.value} alt="Náhled obrázku" className="mt-2 h-24 w-24 object-cover rounded-md" />
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="link" control={newsForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Odkaz (URL)</FormLabel>
                        <FormControl>
                          <Input type="url" placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <DialogFooter>
                      <Button type="button" variant="secondary" onClick={() => setNewsDialogOpen(false)}>Zavřít</Button>
                      <Button type="submit">Uložit</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prodejní akce (promotions.json)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <Button onClick={() => { setEditingPromoIndex(null); setPromoDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Přidat akci
              </Button>
              <Button variant="secondary" onClick={() => saveJSON("promos")}>Uložit do GitHubu</Button>
            </div>
            <ul className="divide-y">
              {promos.length === 0 && (
                <li className="text-sm text-muted-foreground py-6">Zatím žádné akce.</li>
              )}
              {promos.map((p, i) => (
                <li key={p.id || i} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.price ? `Cena: ${p.price}` : ""} {p.validUntil ? `• Platí do: ${p.validUntil}` : ""}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => { setEditingPromoIndex(i); setPromoDialogOpen(true); }}>
                      <Pencil className="h-4 w-4 mr-1" /> Upravit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deletePromo(i)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Smazat
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPromoIndex != null ? "Upravit akci" : "Přidat akci"}</DialogTitle>
                </DialogHeader>
                <Form {...promoForm}>
                  <form onSubmit={promoForm.handleSubmit(onSubmitPromo)} className="space-y-4">
                    <FormField name="title" control={promoForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Název</FormLabel>
                        <FormControl>
                          <Input placeholder="Např. Sleva 20%" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="description" control={promoForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Popis</FormLabel>
                        <FormControl>
                          <Textarea className="min-h-32" placeholder="Popis akce" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField name="price" control={promoForm.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cena / od</FormLabel>
                          <FormControl>
                            <Input placeholder="např. od 3 990 Kč" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField name="validUntil" control={promoForm.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Platí do</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField name="imageUrl" control={promoForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Obrázek</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input type="text" placeholder="https://... nebo /content/..." {...field} />
                          </FormControl>
                          <input ref={promoFileInputRef} type="file" accept="image/*" className="hidden" onChange={onPromoFileChange} />
                          <Button type="button" variant="secondary" onClick={triggerPromoFile}>Nahrát z PC</Button>
                        </div>
                        {field.value ? (
                          <img src={field.value} alt="Náhled obrázku" className="mt-2 h-24 w-24 object-cover rounded-md" />
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="link" control={promoForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Odkaz (URL)</FormLabel>
                        <FormControl>
                          <Input type="url" placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="tags" control={promoForm.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Štítky (oddělené čárkou)</FormLabel>
                        <FormControl>
                          <Input placeholder="např. robot, sekačka" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="button" variant="secondary" onClick={() => setPromoDialogOpen(false)}>Zavřít</Button>
                      <Button type="submit">Uložit</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">Tip: JSON by měl být pole objektů. V případě potřeby vám připravím strukturu a napojím ji na veřejný web.</p>
    </main>
  );
}
