import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const ADMIN_USER = "admin"; // TODO: upravit dle přání
const ADMIN_PASS = "admin123"; // TODO: upravit dle přání

export default function AdminLogin() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  useEffect(() => {
    document.title = "Administrace – přihlášení";
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex, nofollow");
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      sessionStorage.setItem("admin_auth", "1");
      toast({ title: "Přihlášení úspěšné" });
      navigate("/admin", { replace: true });
    } else {
      toast({ title: "Neplatné přihlašovací údaje", variant: "destructive" });
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Administrace</CardTitle>
          <CardDescription>Přihlaste se pomocí domluvených údajů</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="u">Uživatelské jméno</Label>
              <Input id="u" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p">Heslo</Label>
              <Input id="p" type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full">Přihlásit se</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
