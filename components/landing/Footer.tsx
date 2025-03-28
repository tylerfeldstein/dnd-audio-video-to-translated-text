'use client';

import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/logo";
import { motion } from "framer-motion";
import { 
  Twitter, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Mail, 
  Github, 
  Headphones, 
  FileText, 
  Languages, 
  ShieldCheck,
  HelpCircle,
  CreditCard 
} from "lucide-react";

interface FooterProps {
  className?: string;
}

interface FooterColumn {
  title: string;
  links: {
    label: string;
    href: string;
    icon?: React.ReactNode;
    external?: boolean;
  }[];
}

export function Footer({ className = "" }: FooterProps) {
  const columns: FooterColumn[] = [
    {
      title: "Product",
      links: [
        { label: "Transcription", href: "/transcribe", icon: <Headphones className="h-4 w-4" /> },
        { label: "Translation", href: "/translate", icon: <Languages className="h-4 w-4" /> },
        { label: "Document Processing", href: "/pdf", icon: <FileText className="h-4 w-4" /> },
        { label: "Pricing & Credits", href: "/#pricing", icon: <CreditCard className="h-4 w-4" /> },
      ]
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "/about" },
        { label: "Blog", href: "/blog" },
        { label: "Careers", href: "/careers" },
        { label: "Contact", href: "/contact" },
      ]
    },
    {
      title: "Resources",
      links: [
        { label: "Help Center", href: "/help", icon: <HelpCircle className="h-4 w-4" /> },
        { label: "API Documentation", href: "/api-docs" },
        { label: "Privacy Policy", href: "/privacy", icon: <ShieldCheck className="h-4 w-4" /> },
        { label: "Terms of Service", href: "/terms" },
      ]
    }
  ];

  const socialLinks = [
    { icon: <Twitter className="h-5 w-5" />, href: "https://twitter.com", label: "Twitter" },
    { icon: <Linkedin className="h-5 w-5" />, href: "https://linkedin.com", label: "LinkedIn" },
    { icon: <Github className="h-5 w-5" />, href: "https://github.com", label: "GitHub" },
    { icon: <Mail className="h-5 w-5" />, href: "mailto:info@transscribe.com", label: "Email" },
  ];

  return (
    <motion.footer 
      className={`bg-muted/30 dark:bg-muted/10 border-t border-border ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 mb-8 md:mb-0">
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Transscribe helps you transform audio and video content into accurate text with cutting-edge AI technology. Pay only for what you use with our credit-based system, starting at just $5.
            </p>
            
            <div className="flex items-center gap-4 mt-6">
              {socialLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className="h-9 w-9 flex items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>
          
          {columns.map((column, i) => (
            <div key={i} className="col-span-1">
              <h3 className="font-semibold mb-3 text-sm">{column.title}</h3>
              <ul className="space-y-2.5">
                {column.links.map((link, j) => (
                  <li key={j}>
                    <Link 
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5"
                      {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {link.icon}
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground mb-4 md:mb-0">
            © {new Date().getFullYear()} Transscribe. All rights reserved.
          </div>
          
          <div className="flex items-center">
            <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5">
              <span>Powered by</span>
              <Image 
                src="/vercel.svg" 
                alt="Vercel logo" 
                width={60} 
                height={14} 
                className="dark:invert" 
              />
            </a>
          </div>
        </div>
      </div>
    </motion.footer>
  );
} 