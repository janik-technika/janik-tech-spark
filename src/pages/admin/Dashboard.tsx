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
  pdfUrl?: string;
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
  pdfUrl?: string;
  link?: string;
};

interface DayHours {
  morning: string;
  afternoon: string;
}

export type OpeningHours = {
  standard: {
    monday: DayHours | string;
    tuesday: DayHours | string;
    wednesday: DayHours | string;
    thursday: DayHours | string;
    friday: DayHours | string;
    saturday: string;
    sunday: string;
  };
  offSeason: {
    monday: DayHours | string;
    tuesday: DayHours | string;
    wednesday: DayHours | string;
    thursday: DayHours | string;
    friday: DayHours | string;
    saturday: string;
    sunday: string;
  };
};

const newsSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Zadejte nadpis"),
  date: z.string().min(1, "Zadejte datum"),
  summary: z.string().optional(),
  body: z.string().optional(),
  imageUrl: z.string().optional().refine((v) => !v || /^https?:\/\//.test(v) || /^\//.test(v), "Musí být platná URL nebo cesta od kořene (/...)") ,
  pdfUrl: z.string().optional().refine((v) => !v || /^https?:\/\//.test(v) || /^\//.test(v), "Musí být platná URL nebo cesta od kořene (/...)") ,
  link: z.string().url("Musí být platná URL").optional().or(z.literal("")),
});

const promoSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Zadejte název"),
  description: z.string().optional(),
  price: z.string().optional(),
  validUntil: z.string().optional(),
  imageUrl: z.string().optional().refine((v) => !v || /^https?:\/\//.test(v) || /^\//.test(v), "Musí být platná URL nebo cesta od kořene (/...)") ,
  pdfUrl: z.string().optional().refine((v) => !v || /^https?:\/\//.test(v) || /^\//.test(v), "Musí být platná URL nebo cesta od kořene (/...)") ,
  link: z.string().url("Musí být platná URL").optional().or(z.literal("")),
  tags: z.string().optional(), // comma-separated in form
});

const openingHoursSchema = z.object({
  // Standard hours
  standardMondayMorning: z.string().min(1, "Zadejte dopolední hodiny"),
  standardMondayAfternoon: z.string().optional(),
  standardTuesdayMorning: z.string().min(1, "Zadejte dopolední hodiny"),
  standardTuesdayAfternoon: z.string().optional(),
  standardWednesdayMorning: z.string().min(1, "Zadejte dopolední hodiny"),
  standardWednesdayAfternoon: z.string().optional(),
  standardThursdayMorning: z.string().min(1, "Zadejte dopolední hodiny"),
  standardThursdayAfternoon: z.string().optional(),
  standardFridayMorning: z.string().min(1, "Zadejte dopolední hodiny"),
  standardFridayAfternoon: z.string().optional(),
  standardSaturday: z.string().min(1, "Zadejte otevírací dobu pro sobotu"),
  standardSunday: z.string().min(1, "Zadejte otevírací dobu pro neděli"),
  
  // Off-season hours
  offSeasonMondayMorning: z.string().min(1, "Zadejte dopolední hodiny"),
  offSeasonMondayAfternoon: z.string().optional(),
  offSeasonTuesdayMorning: z.string().min(1, "Zadejte dopolední hodiny"),
  offSeasonTuesdayAfternoon: z.string().optional(),
  offSeasonWednesdayMorning: z.string().min(1, "Zadejte dopolední hodiny"),
  offSeasonWednesdayAfternoon: z.string().optional(),
  offSeasonThursdayMorning: z.string().min(1, "Zadejte dopolední hodiny"),
  offSeasonThursdayAfternoon: z.string().optional(),
  offSeasonFridayMorning: z.string().min(1, "Zadejte dopolední hodiny"),
  offSeasonFridayAfternoon: z.string().optional(),
  offSeasonSaturday: z.string().min(1, "Zadejte otevírací dobu pro sobotu"),
  offSeasonSunday: z.string().min(1, "Zadejte otevírací dobu pro neděli"),
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
  const [openingHours, setOpeningHours] = useState<OpeningHours>({
    standard: {
      monday: { morning: "08:00-12:00", afternoon: "13:00-17:00" },
      tuesday: { morning: "08:00-12:00", afternoon: "13:00-17:00" },
      wednesday: { morning: "08:00-12:00", afternoon: "13:00-17:00" },
      thursday: { morning: "08:00-12:00", afternoon: "13:00-17:00" },
      friday: { morning: "08:00-12:00", afternoon: "13:00-15:00" },
      saturday: "Zavřeno",
      sunday: "Zavřeno"
    },
    offSeason: {
      monday: { morning: "08:00-12:00", afternoon: "13:00-16:00" },
      tuesday: { morning: "08:00-12:00", afternoon: "13:00-16:00" },
      wednesday: { morning: "08:00-12:00", afternoon: "13:00-16:00" },
      thursday: { morning: "08:00-12:00", afternoon: "13:00-16:00" },
      friday: { morning: "08:00-12:00", afternoon: "" },
      saturday: "Zavřeno",
      sunday: "Zavřeno"
    }
  });

  // Dialog states
  const [newsDialogOpen, setNewsDialogOpen] = useState(false);
  const [editingNewsIndex, setEditingNewsIndex] = useState<number | null>(null);
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPromoIndex, setEditingPromoIndex] = useState<number | null>(null);
  const [openingHoursDialogOpen, setOpeningHoursDialogOpen] = useState(false);

  // File input refs
  const newsFileInputRef = useRef<HTMLInputElement>(null);
  const promoFileInputRef = useRef<HTMLInputElement>(null);
  const newsPdfInputRef = useRef<HTMLInputElement>(null);
  const promoPdfInputRef = useRef<HTMLInputElement>(null);

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

  // Upload file to GitHub and return public raw URL
  const uploadFile = async (file: File, subdir: "news" | "promos"): Promise<string> => {
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
        message: `chore(content): upload file ${file.name}`,
        content: base64,
        branch: cfg.branch,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`GitHub upload failed ${res.status}: ${t}`);
    }

    // Build RAW GitHub URL so images work immediately without redeploy
    const rawUrl = `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/${path}`;
    return rawUrl;
  };

  // Handlers for file selection
  const triggerNewsFile = () => newsFileInputRef.current?.click();
  const triggerPromoFile = () => promoFileInputRef.current?.click();
  const triggerNewsPdf = () => newsPdfInputRef.current?.click();
  const triggerPromoPdf = () => promoPdfInputRef.current?.click();

  const onNewsFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast({ title: "Nahrávám obrázek..." });
      const url = await uploadFile(file, "news");
      newsForm.setValue("imageUrl", url, { shouldValidate: true });
      toast({ title: "Obrázek nahrán", description: "URL vyplněna automaticky." });
    } catch (err: any) {
      toast({ title: "Chyba nahrávání", description: String(err?.message || err), variant: "destructive" });
    } finally {
      e.target.value = "";
    }
  };

  const onNewsPdfChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast({ title: "Nahrávám PDF..." });
      const url = await uploadFile(file, "news");
      newsForm.setValue("pdfUrl", url, { shouldValidate: true });
      toast({ title: "PDF nahráno", description: "URL vyplněna automaticky." });
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
      const url = await uploadFile(file, "promos");
      promoForm.setValue("imageUrl", url, { shouldValidate: true });
      toast({ title: "Obrázek nahrán", description: "URL vyplněna automaticky." });
    } catch (err: any) {
      toast({ title: "Chyba nahrávání", description: String(err?.message || err), variant: "destructive" });
    } finally {
      e.target.value = "";
    }
  };

  const onPromoPdfChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast({ title: "Nahrávám PDF..." });
      const url = await uploadFile(file, "promos");
      promoForm.setValue("pdfUrl", url, { shouldValidate: true });
      toast({ title: "PDF nahráno", description: "URL vyplněna automaticky." });
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
      pdfUrl: "",
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
      pdfUrl: "",
      link: "",
      tags: "",
    },
  });

  const openingHoursForm = useForm<z.infer<typeof openingHoursSchema>>({
    resolver: zodResolver(openingHoursSchema),
    defaultValues: {
      standardMondayMorning: "08:00-12:00",
      standardMondayAfternoon: "13:00-17:00",
      standardTuesdayMorning: "08:00-12:00",
      standardTuesdayAfternoon: "13:00-17:00",
      standardWednesdayMorning: "08:00-12:00",
      standardWednesdayAfternoon: "13:00-17:00",
      standardThursdayMorning: "08:00-12:00",
      standardThursdayAfternoon: "13:00-17:00",
      standardFridayMorning: "08:00-12:00",
      standardFridayAfternoon: "13:00-15:00",
      standardSaturday: "Zavřeno",
      standardSunday: "Zavřeno",
      
      offSeasonMondayMorning: "08:00-12:00",
      offSeasonMondayAfternoon: "13:00-16:00",
      offSeasonTuesdayMorning: "08:00-12:00",
      offSeasonTuesdayAfternoon: "13:00-16:00",
      offSeasonWednesdayMorning: "08:00-12:00",
      offSeasonWednesdayAfternoon: "13:00-16:00",
      offSeasonThursdayMorning: "08:00-12:00",
      offSeasonThursdayAfternoon: "13:00-16:00",
      offSeasonFridayMorning: "08:00-12:00",
      offSeasonFridayAfternoon: "",
      offSeasonSaturday: "Zavřeno",
      offSeasonSunday: "Zavřeno",
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
      pdfUrl: item?.pdfUrl ?? "",
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
      pdfUrl: item?.pdfUrl ?? "",
      link: item?.link ?? "",
      tags: (item?.tags ?? []).join(", "),
    });
  }, [promoDialogOpen, editingPromoIndex]);

  useEffect(() => {
    if (!openingHoursDialogOpen) return;
    // Convert OpeningHours to form values
    const getFormValues = (hours: OpeningHours) => {
      const standard = hours.standard;
      const offSeason = hours.offSeason;
      
      return {
        standardMondayMorning: typeof standard.monday === 'string' ? standard.monday : standard.monday.morning,
        standardMondayAfternoon: typeof standard.monday === 'string' ? "" : standard.monday.afternoon,
        standardTuesdayMorning: typeof standard.tuesday === 'string' ? standard.tuesday : standard.tuesday.morning,  
        standardTuesdayAfternoon: typeof standard.tuesday === 'string' ? "" : standard.tuesday.afternoon,
        standardWednesdayMorning: typeof standard.wednesday === 'string' ? standard.wednesday : standard.wednesday.morning,
        standardWednesdayAfternoon: typeof standard.wednesday === 'string' ? "" : standard.wednesday.afternoon,
        standardThursdayMorning: typeof standard.thursday === 'string' ? standard.thursday : standard.thursday.morning,
        standardThursdayAfternoon: typeof standard.thursday === 'string' ? "" : standard.thursday.afternoon,
        standardFridayMorning: typeof standard.friday === 'string' ? standard.friday : standard.friday.morning,
        standardFridayAfternoon: typeof standard.friday === 'string' ? "" : standard.friday.afternoon,
        standardSaturday: standard.saturday,
        standardSunday: standard.sunday,
        
        offSeasonMondayMorning: typeof offSeason.monday === 'string' ? offSeason.monday : offSeason.monday.morning,
        offSeasonMondayAfternoon: typeof offSeason.monday === 'string' ? "" : offSeason.monday.afternoon,
        offSeasonTuesdayMorning: typeof offSeason.tuesday === 'string' ? offSeason.tuesday : offSeason.tuesday.morning,
        offSeasonTuesdayAfternoon: typeof offSeason.tuesday === 'string' ? "" : offSeason.tuesday.afternoon,
        offSeasonWednesdayMorning: typeof offSeason.wednesday === 'string' ? offSeason.wednesday : offSeason.wednesday.morning,
        offSeasonWednesdayAfternoon: typeof offSeason.wednesday === 'string' ? "" : offSeason.wednesday.afternoon,
        offSeasonThursdayMorning: typeof offSeason.thursday === 'string' ? offSeason.thursday : offSeason.thursday.morning,
        offSeasonThursdayAfternoon: typeof offSeason.thursday === 'string' ? "" : offSeason.thursday.afternoon,
        offSeasonFridayMorning: typeof offSeason.friday === 'string' ? offSeason.friday : offSeason.friday.morning,
        offSeasonFridayAfternoon: typeof offSeason.friday === 'string' ? "" : offSeason.friday.afternoon,
        offSeasonSaturday: offSeason.saturday,
        offSeasonSunday: offSeason.sunday,
      };
    };
    
    openingHoursForm.reset(getFormValues(openingHours));
  }, [openingHoursDialogOpen, openingHours]);

  // Handlers
  const onSubmitNews = (values: z.infer<typeof newsSchema>) => {
    const newItem: NewsItem = {
      id: values.id || genId(),
      title: values.title,
      date: values.date,
      summary: values.summary || undefined,
      body: values.body || undefined,
      imageUrl: values.imageUrl || undefined,
      pdfUrl: values.pdfUrl || undefined,
      link: values.link || undefined,
    };
    const next = (() => {
      const arr = [...news];
      if (editingNewsIndex != null) arr[editingNewsIndex] = newItem;
      else arr.unshift(newItem);
      return arr;
    })();
    setNews(next);
    saveJSON("news", next as any);
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
      pdfUrl: values.pdfUrl || undefined,
      link: values.link || undefined,
      tags: (values.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    const next = (() => {
      const arr = [...promos];
      if (editingPromoIndex != null) arr[editingPromoIndex] = newItem;
      else arr.unshift(newItem);
      return arr;
    })();
    setPromos(next);
    saveJSON("promos", next as any);
    setPromoDialogOpen(false);
    setEditingPromoIndex(null);
    toast({ title: editingPromoIndex != null ? "Akce upravena" : "Akce přidána" });
  };

  const onSubmitOpeningHours = (values: z.infer<typeof openingHoursSchema>) => {
    const openingHoursData: OpeningHours = {
      standard: {
        monday: { morning: values.standardMondayMorning, afternoon: values.standardMondayAfternoon || "" },
        tuesday: { morning: values.standardTuesdayMorning, afternoon: values.standardTuesdayAfternoon || "" },
        wednesday: { morning: values.standardWednesdayMorning, afternoon: values.standardWednesdayAfternoon || "" },
        thursday: { morning: values.standardThursdayMorning, afternoon: values.standardThursdayAfternoon || "" },
        friday: { morning: values.standardFridayMorning, afternoon: values.standardFridayAfternoon || "" },
        saturday: values.standardSaturday,
        sunday: values.standardSunday,
      },
      offSeason: {
        monday: { morning: values.offSeasonMondayMorning, afternoon: values.offSeasonMondayAfternoon || "" },
        tuesday: { morning: values.offSeasonTuesdayMorning, afternoon: values.offSeasonTuesdayAfternoon || "" },
        wednesday: { morning: values.offSeasonWednesdayMorning, afternoon: values.offSeasonWednesdayAfternoon || "" },
        thursday: { morning: values.offSeasonThursdayMorning, afternoon: values.offSeasonThursdayAfternoon || "" },
        friday: { morning: values.offSeasonFridayMorning, afternoon: values.offSeasonFridayAfternoon || "" },
        saturday: values.offSeasonSaturday,
        sunday: values.offSeasonSunday,
      }
    };
    setOpeningHours(openingHoursData);
    saveJSON("opening-hours", openingHoursData);
    setOpeningHoursDialogOpen(false);
    toast({ title: "Otevírací doba upravena" });
  };

  const deleteNews = (idx: number) => {
    if (!confirm("Opravdu smazat tuto aktualitu?")) return;
    const next = news.filter((_, i) => i !== idx);
    setNews(next);
    saveJSON("news", next as any);
  };

  const deletePromo = (idx: number) => {
    if (!confirm("Opravdu smazat tuto akci?")) return;
    const next = promos.filter((_, i) => i !== idx);
    setPromos(next);
    saveJSON("promos", next as any);
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
    fetch("/content/opening-hours.json")
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        if (data && typeof data === 'object') setOpeningHours(data as OpeningHours);
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

  const saveJSON = async (which: "news" | "promos" | "opening-hours", dataOverride?: Array<NewsItem | Promotion> | OpeningHours) => {
    try {
      if (!cfg) {
        toast({ title: "Doplňte nastavení repozitáře a token", variant: "destructive" });
        return;
      }
      const data = (dataOverride as any) ?? (which === "news" ? news : which === "promos" ? promos : openingHours);
      const pretty = JSON.stringify(data, null, 2);
      const path = which === "news" ? "public/content/news.json" : 
                   which === "promos" ? "public/content/promotions.json" : 
                   "public/content/opening-hours.json";
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

      <section className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Otevírací doba</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-start items-center">
              <Button onClick={() => setOpeningHoursDialogOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Upravit otevírací dobu
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm">Standardní</h4>
                <p className="text-xs text-muted-foreground">Pondělí: {typeof openingHours.standard.monday === 'string' ? openingHours.standard.monday : `${openingHours.standard.monday.morning} ${openingHours.standard.monday.afternoon}`.trim()}</p>
                <p className="text-xs text-muted-foreground">Úterý: {typeof openingHours.standard.tuesday === 'string' ? openingHours.standard.tuesday : `${openingHours.standard.tuesday.morning} ${openingHours.standard.tuesday.afternoon}`.trim()}</p>
                <p className="text-xs text-muted-foreground">Středa: {typeof openingHours.standard.wednesday === 'string' ? openingHours.standard.wednesday : `${openingHours.standard.wednesday.morning} ${openingHours.standard.wednesday.afternoon}`.trim()}</p>
                <p className="text-xs text-muted-foreground">Čtvrtek: {typeof openingHours.standard.thursday === 'string' ? openingHours.standard.thursday : `${openingHours.standard.thursday.morning} ${openingHours.standard.thursday.afternoon}`.trim()}</p>
                <p className="text-xs text-muted-foreground">Pátek: {typeof openingHours.standard.friday === 'string' ? openingHours.standard.friday : `${openingHours.standard.friday.morning} ${openingHours.standard.friday.afternoon}`.trim()}</p>
                <p className="text-xs text-muted-foreground">Sobota: {openingHours.standard.saturday}</p>
                <p className="text-xs text-muted-foreground">Neděle: {openingHours.standard.sunday}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm">Mimosezóna</h4>
                <p className="text-xs text-muted-foreground">Pondělí: {typeof openingHours.offSeason.monday === 'string' ? openingHours.offSeason.monday : `${openingHours.offSeason.monday.morning} ${openingHours.offSeason.monday.afternoon}`.trim()}</p>
                <p className="text-xs text-muted-foreground">Úterý: {typeof openingHours.offSeason.tuesday === 'string' ? openingHours.offSeason.tuesday : `${openingHours.offSeason.tuesday.morning} ${openingHours.offSeason.tuesday.afternoon}`.trim()}</p>
                <p className="text-xs text-muted-foreground">Středa: {typeof openingHours.offSeason.wednesday === 'string' ? openingHours.offSeason.wednesday : `${openingHours.offSeason.wednesday.morning} ${openingHours.offSeason.wednesday.afternoon}`.trim()}</p>
                <p className="text-xs text-muted-foreground">Čtvrtek: {typeof openingHours.offSeason.thursday === 'string' ? openingHours.offSeason.thursday : `${openingHours.offSeason.thursday.morning} ${openingHours.offSeason.thursday.afternoon}`.trim()}</p>
                <p className="text-xs text-muted-foreground">Pátek: {typeof openingHours.offSeason.friday === 'string' ? openingHours.offSeason.friday : `${openingHours.offSeason.friday.morning} ${openingHours.offSeason.friday.afternoon}`.trim()}</p>
                <p className="text-xs text-muted-foreground">Sobota: {openingHours.offSeason.saturday}</p>
                <p className="text-xs text-muted-foreground">Neděle: {openingHours.offSeason.sunday}</p>
              </div>
            </div>

            <Dialog open={openingHoursDialogOpen} onOpenChange={setOpeningHoursDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Upravit otevírací dobu</DialogTitle>
                </DialogHeader>
                <Form {...openingHoursForm}>
                  <form onSubmit={openingHoursForm.handleSubmit(onSubmitOpeningHours)} className="space-y-3">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Standardní otevírací doba</h4>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <FormField name="standardMondayMorning" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pondělí dopoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="08:00-12:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField name="standardMondayAfternoon" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pondělí odpoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="13:00-17:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <FormField name="standardTuesdayMorning" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Úterý dopoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="08:00-12:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField name="standardTuesdayAfternoon" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Úterý odpoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="13:00-17:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <FormField name="standardWednesdayMorning" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Středa dopoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="08:00-12:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField name="standardWednesdayAfternoon" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Středa odpoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="13:00-17:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <FormField name="standardThursdayMorning" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Čtvrtek dopoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="08:00-12:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField name="standardThursdayAfternoon" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Čtvrtek odpoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="13:00-17:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <FormField name="standardFridayMorning" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pátek dopoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="08:00-12:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField name="standardFridayAfternoon" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pátek odpoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="13:00-15:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <FormField name="standardSaturday" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sobota</FormLabel>
                            <FormControl>
                              <Input placeholder="Zavřeno" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField name="standardSunday" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Neděle</FormLabel>
                            <FormControl>
                              <Input placeholder="Zavřeno" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold">Mimosezonní otevírací doba</h4>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <FormField name="offSeasonMondayMorning" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pondělí dopoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="08:00-12:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField name="offSeasonMondayAfternoon" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pondělí odpoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="13:00-16:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <FormField name="offSeasonTuesdayMorning" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Úterý dopoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="08:00-12:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField name="offSeasonTuesdayAfternoon" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Úterý odpoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="13:00-16:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <FormField name="offSeasonWednesdayMorning" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Středa dopoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="08:00-12:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField name="offSeasonWednesdayAfternoon" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Středa odpoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="13:00-16:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <FormField name="offSeasonThursdayMorning" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Čtvrtek dopoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="08:00-12:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField name="offSeasonThursdayAfternoon" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Čtvrtek odpoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="13:00-16:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <FormField name="offSeasonFridayMorning" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pátek dopoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="08:00-12:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField name="offSeasonFridayAfternoon" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pátek odpoledne</FormLabel>
                            <FormControl>
                              <Input placeholder="" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <FormField name="offSeasonSaturday" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sobota</FormLabel>
                            <FormControl>
                              <Input placeholder="Zavřeno" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField name="offSeasonSunday" control={openingHoursForm.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Neděle</FormLabel>
                            <FormControl>
                              <Input placeholder="Zavřeno" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="secondary" onClick={() => setOpeningHoursDialogOpen(false)}>Zavřít</Button>
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
            <CardTitle>Aktuality (news.json)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-start items-center">
              <Button onClick={() => { setEditingNewsIndex(null); setNewsDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Přidat aktualitu
              </Button>
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
                     <FormField name="pdfUrl" control={newsForm.control} render={({ field }) => (
                       <FormItem>
                         <FormLabel>PDF soubor</FormLabel>
                         <div className="flex items-center gap-2">
                           <FormControl>
                             <Input type="text" placeholder="https://... nebo /content/..." {...field} />
                           </FormControl>
                           <input ref={newsPdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={onNewsPdfChange} />
                           <Button type="button" variant="secondary" onClick={triggerNewsPdf}>Nahrát PDF</Button>
                         </div>
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
            <div className="flex justify-start items-center">
              <Button onClick={() => { setEditingPromoIndex(null); setPromoDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Přidat akci
              </Button>
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
                     <FormField name="pdfUrl" control={promoForm.control} render={({ field }) => (
                       <FormItem>
                         <FormLabel>PDF soubor</FormLabel>
                         <div className="flex items-center gap-2">
                           <FormControl>
                             <Input type="text" placeholder="https://... nebo /content/..." {...field} />
                           </FormControl>
                           <input ref={promoPdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={onPromoPdfChange} />
                           <Button type="button" variant="secondary" onClick={triggerPromoPdf}>Nahrát PDF</Button>
                         </div>
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
