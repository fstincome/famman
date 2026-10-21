import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock } from "lucide-react";
import logoImg from "@/assets/logo.png";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        setEmail("");
        setPassword("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Bienvenue !",
        description: "Vous êtes connecté avec succès.",
      });
    }

    setAuthLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <img src={logoImg} alt="Logiciel Familial" className="w-10 h-10 rounded-lg object-contain mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen bg-background">
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-md p-8">
            <div className="text-center mb-8">
              <img src={logoImg} alt="Logiciel Familial" className="w-14 h-14 rounded-xl object-contain mx-auto mb-4" />
              <h1 className="text-2xl font-bold">SIGHT FAMILY</h1>
              <p className="text-muted-foreground mt-2">
                Connectez-vous à votre espace familial
              </p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="votre@email.com"
                    className="pl-10"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="pl-10"
                    autoComplete="off"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={authLoading}
              >
                {authLoading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </Card>
        </div>

        <div className="hidden lg:flex flex-1 bg-gradient-primary p-8 items-center justify-center text-primary-foreground">
          <div className="max-w-md text-center">
            <img src={logoImg} alt="Logiciel Familial" className="w-20 h-20 mx-auto mb-8 opacity-90 rounded-xl" />
            <h2 className="text-3xl font-bold mb-4">SIGHT FAMILY</h2>
            <p className="text-lg opacity-90 leading-relaxed">
              Gérez les finances de votre famille, suivez les revenus et dépenses,
              planifiez vos projets et gardez le contrôle de votre budget.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
