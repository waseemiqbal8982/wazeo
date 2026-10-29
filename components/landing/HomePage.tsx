"use client";

import type { HomeData } from "@/lib/home-data";
import { HomeHeader } from "./HomeHeader";
import { HeroSection } from "./HeroSection";
import { StatsSection, HowSection, ServicesSection, FeaturesSection, WhyGradualSection } from "./HomeSections";
import { DemoSection, ReviewsSection } from "./HomeExtras";
import { TrustSection, FaqSection, TickerBar, HomeFooter } from "./HomeFooter";

export function HomePage({ data }: { data: HomeData }) {
  const c = data.content;
  return (
    <div className="relative flex min-h-screen flex-col">
      <HomeHeader />
      <main className="flex-1">
        {c.showHero && <HeroSection content={c} />}
        {c.showStats && <div className="mt-14"><StatsSection stats={data.stats} thresholds={data.thresholds} /></div>}
        {c.showHow && <HowSection content={c} />}
        <WhyGradualSection />
        {c.showServices && <ServicesSection services={data.services} />}
        {c.showFeatures && <FeaturesSection />}
        {c.showDemo && <DemoSection />}
        {c.showReviews && <ReviewsSection reviews={data.reviews} avg={data.reviewsAvg} />}
        {c.showTrust && <TrustSection support={data.support} />}
        {c.showFaq && <FaqSection faqs={data.faqs} />}
        {c.showTicker && <TickerBar items={data.ticker} />}
      </main>
      <HomeFooter />
    </div>
  );
}
