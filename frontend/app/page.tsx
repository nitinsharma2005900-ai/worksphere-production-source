import Link from 'next/link';
import { ArrowRight, CheckCircle2, Shield, Zap, BarChart2, Users2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-brand-500 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-brand-500/40">
            WS
          </div>
          <span className="text-xl font-bold tracking-tight">WorkSphere</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold bg-brand-500 hover:bg-brand-600 px-5 py-2.5 rounded-lg shadow-md shadow-brand-500/30 transition"
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-6">
          <Zap className="h-3.5 w-3.5" /> Multi-Tenant SaaS Platform with Concurrency Protection
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl text-slate-100 leading-tight mb-6">
          Project Management & Workflow Automation for Modern Teams
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          Isolated multi-tenant SaaS platform featuring real-time task boards, optimistic locking concurrency control, Python workload analytics, and background job queues.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg shadow-brand-500/30 transition"
          >
            Explore Live Demo <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-8 py-3.5 rounded-xl border border-slate-700 transition"
          >
            Create Organization
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full mt-6">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
            <Shield className="h-8 w-8 text-brand-400 mb-4" />
            <h3 className="font-semibold text-lg text-white mb-2">Multi-Tenant Isolation</h3>
            <p className="text-sm text-slate-400">
              Strict database boundary enforcement prevents cross-tenant data leaks between organizations.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
            <Zap className="h-8 w-8 text-amber-400 mb-4" />
            <h3 className="font-semibold text-lg text-white mb-2">Optimistic Concurrency</h3>
            <p className="text-sm text-slate-400">
              Built-in version control stops silent overwrites when two teammates edit the same task concurrently.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
            <BarChart2 className="h-8 w-8 text-emerald-400 mb-4" />
            <h3 className="font-semibold text-lg text-white mb-2">FastAPI Analytics</h3>
            <p className="text-sm text-slate-400">
              Independent Python microservice computes project health, cycle times, and streams chunked exports.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        WorkSphere SaaS Platform © 2026. Built with Next.js, Express, FastAPI, and PostgreSQL.
      </footer>
    </div>
  );
}
