'use client';

import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle, Zap, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface HeroProps {
  title: string;
  highlight: string;
  description: string;
  primaryCta: {
    text: string;
    href: string;
  };
  secondaryCta?: {
    text: string;
    href: string;
  };
  image: {
    src: string;
    alt: string;
  };
  badges?: {
    text: string;
    icon: ReactNode;
  }[];
  companies?: {
    src: string;
    alt: string;
  }[];
}

export function Hero({
  title,
  highlight,
  description,
  primaryCta,
  secondaryCta,
  image,
  badges = [],
  companies = []
}: HeroProps) {
  return (
    <section className="relative px-4 pt-20 pb-32 sm:pt-32 sm:pb-40 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-sky-500 to-blue-400 opacity-10 dark:opacity-20" />
      
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <motion.div 
            className="flex-1 space-y-8 text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                {title.split(highlight).map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
                        {highlight}
                      </span>
                    )}
                  </span>
                ))}
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                {description}
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-full mx-auto lg:mx-0">
                <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Start with a $5 credit pack, or subscribe monthly
                </span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-full h-12 px-8">
                <Link href={primaryCta.href}>
                  {primaryCta.text} <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              {secondaryCta && (
                <Button asChild variant="outline" size="lg" className="rounded-full border-blue-200 dark:border-blue-800 h-12 px-6">
                  <a href={secondaryCta.href}>
                    {secondaryCta.text}
                  </a>
                </Button>
              )}
            </div>
            
            {companies.length > 0 && (
              <div className="flex items-center justify-center lg:justify-start gap-6 pt-4">
                <p className="text-sm text-muted-foreground">Trusted by teams at:</p>
                <div className="flex gap-6">
                  {companies.map((company, i) => (
                    <Image 
                      key={i}
                      src={company.src} 
                      alt={company.alt} 
                      width={80} 
                      height={24} 
                      className="opacity-70 dark:invert" 
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
          
          <motion.div 
            className="flex-1 relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="rounded-2xl bg-gradient-to-br from-background to-muted/30 border border-border p-1 shadow-xl">
              <div className="bg-background rounded-xl overflow-hidden">
                <Image 
                  src={image.src}
                  alt={image.alt} 
                  width={600} 
                  height={400}
                  className="w-full h-auto"
                />
              </div>
            </div>
            
            {/* Floating badges */}
            {badges.map((badge, i) => {
              const isLeft = i % 2 === 0;
              return (
                <motion.div 
                  key={i}
                  className={`absolute ${isLeft ? '-bottom-6 -left-6 rotate-3' : '-top-4 -right-4 -rotate-2'} 
                              ${isLeft ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white' : 'bg-white dark:bg-gray-900 border border-border'} 
                              p-4 rounded-lg shadow-lg transform`}
                  initial={{ opacity: 0, y: isLeft ? 20 : -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + (i * 0.1) }}
                >
                  <div className="flex items-center gap-2 text-sm">
                    {badge.icon}
                    <span className="font-medium">{badge.text}</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
} 