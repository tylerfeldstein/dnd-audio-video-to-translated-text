'use client';

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { CheckIcon, XIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface PricingFeature {
  name: string;
  included: boolean;
  tooltip?: string;
}

interface PricingTier {
  name: string;
  description: string;
  price: {
    monthly: number | null;
    annual: number | null;
  };
  credits: {
    included: number;
    costPerAdditional?: number;
  };
  highlighted?: boolean;
  badge?: string;
  features: PricingFeature[];
  ctaText: string;
  ctaHref: string;
}

interface PricingProps {
  title: string;
  subtitle: string;
  tiers: PricingTier[];
}

export function Pricing({ title, subtitle, tiers }: PricingProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <section className="py-20 bg-muted/30" id="pricing">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{title}</h2>
          <p className="text-lg text-muted-foreground">{subtitle}</p>
        </motion.div>
        
        <motion.div 
          className="flex justify-center items-center mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <span className={`mr-3 ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
            Monthly
          </span>
          <Switch
            checked={billingCycle === 'annual'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'annual' : 'monthly')}
          />
          <span className={`ml-3 ${billingCycle === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
            Annual <span className="text-sm text-blue-500 font-medium">Save up to 20%</span>
          </span>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier, i) => {
            const price = billingCycle === 'monthly' ? tier.price.monthly : tier.price.annual;
            
            return (
              <motion.div 
                key={tier.name}
                className={`rounded-xl overflow-hidden border ${tier.highlighted ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-border'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + (i * 0.1) }}
              >
                <div className={`p-6 ${tier.highlighted ? 'bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white' : 'bg-card'}`}>
                  {tier.badge && (
                    <Badge className="mb-2 bg-white text-blue-600 hover:bg-white/90">{tier.badge}</Badge>
                  )}
                  <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                  <p className={`text-sm mb-4 ${tier.highlighted ? 'text-blue-100' : 'text-muted-foreground'}`}>{tier.description}</p>
                  
                  <div className="mb-4">
                    {price !== null ? (
                      <>
                        <span className="text-4xl font-bold">${price}</span>
                        <span className={`${tier.highlighted ? 'text-blue-100' : 'text-muted-foreground'}`}>/{billingCycle === 'monthly' ? 'mo' : 'mo, billed annually'}</span>
                      </>
                    ) : (
                      <span className="text-4xl font-bold">${tier.credits.included}</span>
                    )}
                  </div>

                  <div className={`mb-4 p-3 rounded-lg ${tier.highlighted ? 'bg-white/10' : 'bg-muted/50'}`}>
                    <p className={`text-sm font-medium ${tier.highlighted ? 'text-white' : 'text-foreground'}`}>
                      {tier.credits.included} credits included
                    </p>
                    {tier.credits.costPerAdditional && (
                      <p className={`text-xs mt-1 ${tier.highlighted ? 'text-blue-100' : 'text-muted-foreground'}`}>
                        Additional credits at ${tier.credits.costPerAdditional.toFixed(2)} each
                      </p>
                    )}
                    <p className={`text-xs mt-1 ${tier.highlighted ? 'text-blue-100' : 'text-muted-foreground'}`}>
                      1 credit = 1 minute of transcription
                    </p>
                  </div>

                  <Button 
                    asChild 
                    className={`w-full ${
                      tier.highlighted 
                        ? 'bg-white text-blue-600 hover:bg-white/90' 
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                    }`}
                  >
                    <Link href={tier.ctaHref}>
                      {tier.ctaText}
                    </Link>
                  </Button>
                </div>
                <div className="p-6 space-y-4 bg-card">
                  <p className="text-sm font-medium">Plan includes:</p>
                  <ul className="space-y-3">
                    {tier.features.map((feature, j) => (
                      <li key={j} className="flex items-start">
                        {feature.included ? (
                          <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        ) : (
                          <XIcon className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0" />
                        )}
                        <span className={feature.included ? 'text-sm' : 'text-sm text-muted-foreground'}>
                          {feature.name}
                          {feature.tooltip && (
                            <span className="text-xs block text-muted-foreground mt-0.5">
                              {feature.tooltip}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <h3 className="text-xl font-bold mb-3">Need more credits?</h3>
          <div className="inline-flex gap-4 flex-wrap justify-center">
            <div className="bg-card border border-border rounded-lg p-4 text-center min-w-[200px]">
              <p className="font-medium mb-1">100 Credit Pack</p>
              <p className="text-2xl font-bold">$15</p>
              <p className="text-xs text-muted-foreground mb-3">$0.15 per credit</p>
              <Button size="sm" variant="outline" asChild>
                <Link href="/transcribe">Buy Now</Link>
              </Button>
            </div>
            <div className="bg-card border border-blue-500 shadow-lg shadow-blue-500/10 rounded-lg p-4 text-center min-w-[200px] relative">
              <div className="absolute -top-2 -right-2">
                <Badge className="bg-blue-600">Best Value</Badge>
              </div>
              <p className="font-medium mb-1">500 Credit Pack</p>
              <p className="text-2xl font-bold">$65</p>
              <p className="text-xs text-muted-foreground mb-3">$0.13 per credit</p>
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700" asChild>
                <Link href="/transcribe">Buy Now</Link>
              </Button>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center min-w-[200px]">
              <p className="font-medium mb-1">1000 Credit Pack</p>
              <p className="text-2xl font-bold">$120</p>
              <p className="text-xs text-muted-foreground mb-3">$0.12 per credit</p>
              <Button size="sm" variant="outline" asChild>
                <Link href="/transcribe">Buy Now</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
} 