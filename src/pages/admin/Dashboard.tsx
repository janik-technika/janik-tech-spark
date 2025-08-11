import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { upsertFile, type GitHubConfig } from "@/lib/githubClient";

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
  const [owner, setOwner] = useStoredState("gh_owner", "");
  const [repo, setRepo] = useStoredState("gh_repo", "");
  const [branch, setBranch] = useStoredState("gh_branch", "main");
  const [rememberToken, setRememberToken] = useStoredState("gh_remember", true);
  const [tokenInput, setTokenInput] = useState("");
  const [newsJSON, setNewsJSON] = useState("[]");
  const [promosJSON, setPromosJSON] = useState("[]");

  const token = useMemo(() => {
    const s = sessionStorage.getItem("gh_pat") || "";
    const l = localStorage.getItem("gh_pat") || "";
    return s || l || "";
  }, []);

  const [pat, setPat] = useState(token);

  useEffect(() => {
    document.title = "Administrace – Dashboard";
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex, nofollow");
  }, []);

  useEffect(() => {
    // Load current public JSONs for convenience
    fetch("/content/news.json").then(async (r) => {
      if (r.ok) setNewsJSON(await r.text());
    }).catch(() => {});
    fetch("/content/promotions.json").then(async (r) => {
      if (r.ok) setPromosJSON(await r.text());
    }).catch(() => {});
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
      const raw = which === "news" ? newsJSON : promosJSON;
      // Validate JSON
      const parsed = JSON.parse(raw);
      const pretty = JSON.stringify(parsed, null, 2);
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
              <Input id="owner" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="např. my-org" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repo">Repozitář</Label>
              <Input id="repo" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="např. janik-web" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Větev</Label>
              <Input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aktuality (news.json)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea className="min-h-64" value={newsJSON} onChange={(e) => setNewsJSON(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => saveJSON("news")}>Uložit</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prodejní akce (promotions.json)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea className="min-h-64" value={promosJSON} onChange={(e) => setPromosJSON(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => saveJSON("promos")}>Uložit</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">Tip: JSON by měl být pole objektů. V případě potřeby vám připravím strukturu a napojím ji na veřejný web.</p>
    </main>
  );
}
