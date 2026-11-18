// 404 for unknown public URLs.
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FlaskConical, Home as HomeIcon, Hospital } from "lucide-react";
import { Button } from "../../components/ui";
import { LogoMark } from "../../components/Logo";

export default function NotFound() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-brand-50 via-white to-transparent" aria-hidden="true" />
      <div className="container-page relative flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 14 }}>
          <LogoMark size={64} />
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 font-display text-7xl font-extrabold tracking-tight text-ink-900 sm:text-8xl">
          4<span className="text-brand-600">0</span>4
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">This page needs a check-up</h1>
          <p className="mx-auto mt-3 max-w-md text-ink-500">We couldn't find the page you were looking for. It may have moved, or the link may be wrong.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button as={Link} to="/" icon={HomeIcon}>
              Go home
            </Button>
            <Button as={Link} to="/hospitals" variant="secondary" icon={Hospital}>
              Find hospitals
            </Button>
            <Button as={Link} to="/labs" variant="secondary" icon={FlaskConical}>
              Find labs
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
