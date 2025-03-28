import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Cta } from "@/components/landing/Cta";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";
import { FileText, Languages, Pencil, Zap, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Hero 
        title="Transform Your Speech Into Perfect Text" 
        highlight="Transform"
        description="Save hours with our AI-powered platform that transcribes, translates, and enhances audio and video with unmatched accuracy. Pay only for what you need with our flexible credit-based system."
        primaryCta={{
          text: "Start Transcribing Now",
          href: "/transcribe"
        }}
        secondaryCta={{
          text: "See How It Works",
          href: "#how-it-works"
        }}
        image={{
          src: "https://images.unsplash.com/photo-1623039405147-547794f92e9e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2670&q=80",
          alt: "Transcription example"
        }}
        badges={[
          {
            text: "99.8% Accuracy",
            icon: <CheckCircle className="w-5 h-5" />
          },
          {
            text: "5x Faster Workflow",
            icon: <Zap className="w-5 h-5 text-amber-500" />
          }
        ]}
        companies={[
          {
            src: "/next.svg",
            alt: "Company logo"
          },
          {
            src: "/vercel.svg",
            alt: "Company logo"
          }
        ]}
      />
      
      <Features 
        title="Powerful AI Tools for Every Need"
        subtitle="Our all-in-one platform helps you unlock the full potential of your audio and video content."
        features={[
          {
            title: "AI Transcription",
            description: "Convert audio and video to text with state-of-the-art accuracy in minutes, not hours.",
            icon: <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
            benefits: [
              "Ultra-fast processing",
              "Speaker identification",
              "Timestamps and search"
            ]
          },
          {
            title: "Translation",
            description: "Break language barriers instantly by translating your content into 50+ languages.",
            icon: <Languages className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
            benefits: [
              "Preserve context and meaning",
              "Localization support",
              "Subtitle generation"
            ]
          },
          {
            title: "AI Enhancement",
            description: "Polish and perfect your content with AI-powered grammar correction and enhancement.",
            icon: <Pencil className="w-6 h-6 text-sky-600 dark:text-sky-400" />,
            benefits: [
              "Grammar and style fixes",
              "Clarity improvements",
              "Content summarization"
            ]
          }
        ]}
      />
      
      <Pricing 
        title="Simple, Transparent Pricing"
        subtitle="Choose the plan that works best for your needs with our flexible credit-based plans."
        tiers={[
          {
            name: "Pay-as-you-go",
            description: "Perfect for trying our service with no commitment",
            price: { monthly: null, annual: null },
            credits: {
              included: 5,
              costPerAdditional: 0.20
            },
            features: [
              { name: "One-time $5 starter pack (30 credits)", included: true },
              { name: "Basic text translation", included: true },
              { name: "Standard accuracy (95%+)", included: true },
              { name: "Speaker identification", included: false },
              { name: "AI content enhancement", included: false },
              { name: "Subtitle generation", included: false },
              { name: "Priority support", included: false },
            ],
            ctaText: "Get Started",
            ctaHref: "/transcribe"
          },
          {
            name: "Pro",
            description: "For professionals and content creators",
            price: { monthly: 19, annual: 15 },
            credits: {
              included: 300,
              costPerAdditional: 0.15
            },
            highlighted: true,
            badge: "Most Popular",
            features: [
              { name: "300 minutes of transcription per month", included: true, tooltip: "Additional credits available for purchase" },
              { name: "Advanced text translation", included: true },
              { name: "High accuracy (98%+)", included: true },
              { name: "Speaker identification", included: true },
              { name: "AI content enhancement", included: true },
              { name: "Subtitle generation", included: true },
              { name: "Priority support", included: false },
            ],
            ctaText: "Subscribe Now",
            ctaHref: "/transcribe"
          },
          {
            name: "Business",
            description: "For teams and high-volume needs",
            price: { monthly: 49, annual: 39 },
            credits: {
              included: 1000,
              costPerAdditional: 0.12
            },
            features: [
              { name: "1000 minutes of transcription per month", included: true, tooltip: "Additional credits at lowest rates" },
              { name: "Advanced text translation", included: true },
              { name: "Highest accuracy (99.5%+)", included: true },
              { name: "Speaker identification", included: true },
              { name: "AI content enhancement", included: true },
              { name: "Subtitle generation", included: true },
              { name: "Priority support", included: true, tooltip: "24/7 support with 2-hour response time" },
            ],
            ctaText: "Contact Sales",
            ctaHref: "#contact"
          }
        ]}
      />
      
      <Cta 
        title="Ready to transform your content workflow?"
        description="Join thousands of creators and businesses who are saving time and unlocking new possibilities with our flexible credit-based transcription platform."
        buttonText="Get Started for $5"
        buttonHref="/transcribe"
      />
      
      <Testimonials 
        title="What Our Users Say"
        subtitle="Don&apos;t just take our word for it — hear from the people who use our platform every day."
        testimonials={[
          {
            quote: "This platform has completely transformed my workflow. I used to spend hours transcribing interviews, but now I can focus on creating content that matters.",
            author: {
              name: "John Doe",
              title: "Content Creator",
              initials: "JD",
              color: "blue"
            }
          },
          {
            quote: "The accuracy is incredible. I've tried other transcription services, but none come close to the quality and speed I get here. A game-changer for my podcast production.",
            author: {
              name: "Jane Smith",
              title: "Podcast Host",
              initials: "JS",
              color: "indigo"
            }
          },
          {
            quote: "Being able to translate and subtitle our marketing videos in multiple languages has opened up entirely new markets for our business. Worth every penny.",
            author: {
              name: "Mark Brown",
              title: "Marketing Director",
              initials: "MB",
              color: "sky"
            }
          }
        ]}
      />
      
      <Footer />
    </div>
  );
}
