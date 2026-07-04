import Header from "@/components/Header"
import Hero from "@/components/Hero"
import ProblemSection from "@/components/ProblemSection"
import FeaturesSection from "@/components/FeaturesSection"
import HowItWorksSection from "@/components/HowItWorksSection"
import PricingSection from "@/components/PricingSection"
import SocialProofSection from "@/components/SocialProofSection"
import ContactSection from "@/components/ContactSection"
import Footer from "@/components/Footer"

export default function App() {
  return (
    <div className="min-h-screen">
      <div className="grain-overlay" aria-hidden="true" />
      <Header />
      <Hero />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <SocialProofSection />
      <ContactSection />
      <Footer />
    </div>
  )
}
