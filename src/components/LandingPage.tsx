import React from 'react';
import { Button } from './ui/button';
import { 
  Zap, 
  CheckCircle2, 
  BookOpen, 
  FileText, 
  LayoutDashboard, 
  Shield, 
  Globe, 
  Smartphone,
  Star
} from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
}

export function LandingPage({ onLoginClick }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#fafbfc] font-sans text-slate-900">
      {/* Navbar */}
      <nav className="flex items-center justify-between p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-xl font-extrabold text-white">₹</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1a2b3b]">RupeeLedger</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onLoginClick} className="text-[#1a2b3b] font-medium hidden sm:flex">
            Sign In
          </Button>
          <Button onClick={onLoginClick} className="bg-primary hover:bg-primary/80 text-white font-medium px-6">
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-24 px-4 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
          <Zap className="h-4 w-4" />
          <span>Built for Indian Businesses</span>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-extrabold text-[#1a2b3b] leading-tight mb-6 tracking-tight">
          Professional Petty Cash <br className="hidden md:block" />
          <span className="text-primary">Management Made Simple</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          Track expenses, generate GST invoices, manage multiple ledgers, and gain
          financial insights. Everything your business needs in one beautiful platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Button onClick={onLoginClick} size="lg" className="bg-primary hover:bg-primary/80 text-white px-8 h-14 rounded-lg font-semibold text-lg w-full sm:w-auto">
            Start Free Trial &rarr;
          </Button>
          <Button onClick={onLoginClick} variant="secondary" size="lg" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-8 h-14 rounded-lg font-semibold text-lg w-full sm:w-auto">
            Request Demo
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Free forever plan</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Setup in 2 minutes</span>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="bg-white py-12 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
            Trusted by 2,000+ Indian Businesses
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 text-slate-300 font-bold text-xl md:text-2xl">
            <span>Manufacturing</span>
            <span>Retail</span>
            <span>Services</span>
            <span>Trading</span>
            <span>Construction</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a2b3b] mb-4">Everything You Need</h2>
          <p className="text-slate-500 text-lg">Powerful features designed specifically for Indian small and medium businesses.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'Multi-Ledger System',
              desc: 'Manage petty cash, weekly expenses, and unlimited custom ledgers in one place.',
              icon: BookOpen
            },
            {
              title: 'GST Invoice Generator',
              desc: 'Create professional GST-compliant invoices with auto-calculations and print support.',
              icon: FileText
            },
            {
              title: 'Smart Dashboard',
              desc: 'Visual charts, category breakdowns, and real-time financial insights at a glance.',
              icon: LayoutDashboard
            },
            {
              title: 'Bank-Grade Security',
              desc: 'Row-level security, encrypted data, role-based access, and complete audit trails.',
              icon: Shield
            },
            {
              title: 'Built for India',
              desc: 'INR formatting, GST support, Indian date formats, and UPI payment tracking.',
              icon: Globe
            },
            {
              title: 'Mobile Ready',
              desc: 'Fully responsive design works perfectly on phones, tablets, and desktops.',
              icon: Smartphone
            }
          ].map((feature, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-[#1a2b3b] mb-3">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a2b3b] mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-500 text-lg">Start free and scale as your business grows.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-xl font-bold text-[#1a2b3b] mb-4">Free</h3>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#1a2b3b]">₹0</span>
                <span className="text-slate-500">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-slate-600">
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> 1 User</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> 1 Ledger</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> 50 Transactions/month</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> Basic Reports</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> Email Support</li>
              </ul>
              <Button onClick={onLoginClick} variant="outline" className="w-full h-12 rounded-xl font-bold text-[#1a2b3b] border-slate-200 hover:bg-slate-50">
                Start Free
              </Button>
            </div>

            {/* Business Tier */}
            <div className="bg-white p-8 rounded-3xl border-2 border-primary shadow-xl relative flex flex-col transform md:-translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-[#1a2b3b] mb-4">Monthly</h3>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#1a2b3b]">₹199</span>
                <span className="text-slate-500">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-slate-600">
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> 5 Users</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> Unlimited Ledgers</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> Unlimited Transactions</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> GST Invoices</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> Receipt Upload</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> Advanced Reports</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> Priority Support</li>
              </ul>
              <Button onClick={onLoginClick} className="w-full h-12 rounded-xl font-bold text-white bg-primary hover:bg-primary/80">
                Start Trial
              </Button>
            </div>

            {/* Enterprise Tier */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-xl font-bold text-[#1a2b3b] mb-4">Yearly</h3>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#1a2b3b]">₹1,999</span>
                <span className="text-slate-500">/year</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-slate-600">
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> Unlimited Users</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> Everything in Monthly</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> Multi-Branch Support</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> API Access</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> WhatsApp Integration</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> Custom Branding</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> Dedicated Account Manager</li>
              </ul>
              <Button onClick={onLoginClick} variant="outline" className="w-full h-12 rounded-xl font-bold text-[#1a2b3b] border-slate-200 hover:bg-slate-50">
                Start Trial
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1a2b3b] mb-4">Loved by Businesses</h2>
          <p className="text-slate-500 text-lg">See what our customers say about RupeeLedger.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              quote: "RupeeLedger simplified our entire petty cash management. The GST invoice feature alone saves us hours every week.",
              name: "Rajesh Kumar",
              role: "CA, Kumar & Associates"
            },
            {
              quote: "Finally an app that understands Indian business needs. The INR formatting and GST calculations are spot-on.",
              name: "Priya Sharma",
              role: "Finance Manager, TechStart Pvt Ltd"
            },
            {
              quote: "We moved from spreadsheets to RupeeLedger and never looked back. Multi-ledger tracking is a game changer.",
              name: "Arjun Patel",
              role: "Owner, Patel Retail Chain"
            }
          ].map((testimonial, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-600 mb-6 italic text-sm leading-relaxed">"{testimonial.quote}"</p>
              <div>
                <h4 className="font-bold text-[#1a2b3b] text-sm">{testimonial.name}</h4>
                <p className="text-xs text-slate-500">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="bg-primary py-20 px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Simplify Your Finances?</h2>
        <p className="text-[#e6f5f0] text-lg mb-10 max-w-2xl mx-auto">
          Join thousands of Indian businesses already using RupeeLedger.
        </p>
        <Button onClick={onLoginClick} size="lg" className="bg-white text-primary hover:bg-slate-50 px-8 h-14 rounded-lg font-bold text-lg">
          Start Your Free Trial &rarr;
        </Button>
      </section>
      
      {/* Small Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-6 w-6 bg-primary rounded flex items-center justify-center">
            <span className="text-xs font-bold text-white">₹</span>
          </div>
          <span className="font-bold text-white">RupeeLedger</span>
        </div>
        <p>&copy; {new Date().getFullYear()} RupeeLedger. All rights reserved.</p>
      </footer>
    </div>
  );
}
