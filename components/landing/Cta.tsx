'use client';

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

interface CtaProps {
  title: string;
  description: string;
  buttonText: string;
  buttonHref: string;
}

export function Cta({ title, description, buttonText, buttonHref }: CtaProps) {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div 
          className="max-w-4xl mx-auto bg-gradient-to-br from-blue-600 via-sky-500 to-blue-400 rounded-2xl p-1 shadow-lg shadow-blue-500/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-background dark:bg-slate-900 p-8 sm:p-12 rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center gap-10">
              <div className="flex-1 space-y-6">
                <h2 className="text-3xl sm:text-4xl font-bold">{title}</h2>
                <p className="text-lg text-muted-foreground">{description}</p>
                
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <Sparkles className="h-4 w-4" />
                  <span>Start with our $5 starter pack today—no subscription required</span>
                </div>
                
                <Button 
                  asChild
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white mt-4 rounded-full px-8"
                >
                  <Link href={buttonHref}>
                    {buttonText} <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
              
              <div className="hidden md:block flex-1">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-4">How Credits Work</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400 text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                      <span className="text-sm">Purchase a plan or credit pack</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400 text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                      <span className="text-sm">Upload your audio or video</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400 text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                      <span className="text-sm">Credits are deducted based on duration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400 text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                      <span className="text-sm">Top up anytime with credit packs</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
} 