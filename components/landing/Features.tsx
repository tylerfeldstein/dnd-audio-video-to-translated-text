'use client';

import { ReactNode } from "react";
import { CheckCircle, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

interface Feature {
  title: string;
  description: string;
  icon: ReactNode;
  benefits: string[];
}

interface FeaturesProps {
  title: string;
  subtitle: string;
  features: Feature[];
}

export function Features({ title, subtitle, features }: FeaturesProps) {
  return (
    <section className="py-24 bg-muted/30 dark:bg-muted/10" id="how-it-works">
      <div className="container mx-auto max-w-7xl px-4">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">{title}</h2>
          <p className="text-lg text-muted-foreground">{subtitle}</p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mt-8">
            <div className="flex flex-col md:flex-row items-center gap-4 text-left">
              <div className="bg-blue-100 dark:bg-blue-800/30 p-3 rounded-full">
                <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Credit-Based System</h3>
                <p className="text-muted-foreground">Our flexible credit system lets you pay only for what you use. Start with a $5 pack of 30 credits, or subscribe monthly for the best value. One credit equals one minute of audio processing.</p>
              </div>
            </div>
          </div>
        </motion.div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              className="bg-background rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-all hover:translate-y-[-4px]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground mb-4">
                {feature.description}
              </p>
              <ul className="space-y-2">
                {feature.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
} 