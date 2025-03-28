'use client';

import { motion } from "framer-motion";

interface Testimonial {
  quote: string;
  author: {
    name: string;
    title: string;
    initials: string;
    color: string;
  };
}

interface TestimonialsProps {
  title: string;
  subtitle: string;
  testimonials: Testimonial[];
}

export function Testimonials({ title, subtitle, testimonials }: TestimonialsProps) {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto max-w-7xl px-4">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">{title}</h2>
          <p className="text-lg text-muted-foreground">
            {subtitle}
          </p>
        </motion.div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div 
              key={index}
              className="bg-gradient-to-br from-background to-muted/30 rounded-xl p-6 border border-border shadow-sm"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-10 w-10 rounded-full bg-${testimonial.author.color}-100 flex items-center justify-center text-${testimonial.author.color}-600 font-bold`}>
                  {testimonial.author.initials}
                </div>
                <div>
                  <h4 className="font-semibold">{testimonial.author.name}</h4>
                  <p className="text-sm text-muted-foreground">{testimonial.author.title}</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                &quot;{testimonial.quote}&quot;
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
} 