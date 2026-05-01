import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Shield } from "lucide-react";
import { AdminLoginDialog } from "./AdminLoginDialog";

export const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<number | null>(null);

  const handleLogoClick = (e: React.MouseEvent) => {
    // Detect 5 rapid consecutive clicks → open admin login
    clickCountRef.current += 1;
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = window.setTimeout(() => {
      clickCountRef.current = 0;
    }, 1500);

    if (clickCountRef.current >= 5) {
      e.preventDefault();
      clickCountRef.current = 0;
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
      setAdminDialogOpen(true);
    }
  };

  return (
    <>
      <nav className="glass sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2.5 group select-none" onClick={handleLogoClick}>
            <img src="/logo.png" alt="Mon PFE" className="w-10 h-10 object-contain" width={40} height={40} />
            <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>Mon PFE</span>
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                    <Shield className="w-4 h-4 mr-1.5" /> Admin
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="w-4 h-4 mr-1.5" /> Tableau de bord
                </Button>
                <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
                  <LogOut className="w-4 h-4 mr-1.5" /> Quitter
                </Button>
              </>
            ) : (
              <Button size="sm" className="btn-hero" onClick={() => navigate("/auth")}>
                Connexion
              </Button>
            )}
          </div>
        </div>
      </nav>
      <AdminLoginDialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen} />
    </>
  );
};
