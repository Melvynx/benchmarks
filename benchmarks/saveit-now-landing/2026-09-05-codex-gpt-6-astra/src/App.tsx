import { ArrowDown, ArrowRight, ArrowUpRight, Bookmark, Check, Menu, Plus, Search, Share2, Smartphone, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { BookmarkDemo } from "./components/bookmark-demo";
import { PricingAndFaq } from "./components/pricing-and-faq";

const SIGNUP = "https://saveit.now/signin?intent=signup&step=email";
const imagePath = "/images/landing-v2/";

function Brand() {
  return <a className="brand" href="#top" aria-label="SaveIt.now home"><span className="brand-mark"><Bookmark size={19} strokeWidth={2.6} /></span>SaveIt<span className="brand-suffix">.now</span></a>;
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="header">
    <Brand />
    <nav className={menuOpen ? "navigation is-open" : "navigation"} id="main-navigation" aria-label="Main navigation" onClick={() => setMenuOpen(false)} onKeyDown={(event) => { if (event.key === "Escape") setMenuOpen(false); }}>
      <a href="#how-it-works">How it works</a><a href="#ios">Made for iOS</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a>
    </nav>
    <div className="header-actions"><a className="sign-in" href="https://saveit.now/signin?intent=signin">Log in <ArrowUpRight size={14} /></a><a className="button button-small button-dark" href={SIGNUP}>Start saving <ArrowUpRight size={15} /></a><button className="menu-toggle" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-controls="main-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div>
  </header>;
}

function Hero() {
  return <section className="hero" aria-labelledby="hero-title">
    <div className="hero-intro page-width">
      <div className="hero-identity"><p className="eyebrow"><span className="live-dot" /> YOUR HOME FOR BOOKMARKS</p><h1 id="hero-title">GPT-6 Astra</h1><p className="identity-caption">Less organizing. More living.</p></div>
      <div className="hero-promise"><h2>Save it now.<br />Find it when it matters.</h2><p>All the things you want to come back to, in a home that organizes itself. Just save it. We’ll take it from there.</p><div className="hero-actions"><a className="button button-orange" href={SIGNUP}>Get started free <ArrowUpRight size={18} /></a><a className="text-link" href="#how-it-works">See how it works <ArrowDown size={15} /></a></div><span className="micro-copy">Free to start. No manual filing.</span></div>
    </div>
    <div className="hero-campaign">
      <img src={`${imagePath}portal-ridge.jpg`} alt="A luminous doorway on a coral-lit mountain ridge, with a path leading back to it" fetchPriority="high" width="2048" height="1148" />
      <div className="campaign-copy"><span className="campaign-index">A LITTLE CURIOSITY. A WORLD TO RETURN TO.</span><p>Good things<br />find their way<br /><span>back.</span></p><a href="#promise" className="circle-link" aria-label="Explore the rediscovery promise"><ArrowDown size={22} /></a></div>
      <div className="saved-note"><span className="saved-icon"><Bookmark size={17} fill="currentColor" /></span><div>That thing you loved.<small>Saved. Understood. Ready when you are.</small></div><Check size={17} /></div>
      <span className="campaign-caption">SAVEIT.NOW &nbsp; / &nbsp; OPEN A WORLD WORTH KEEPING</span>
    </div>
    <div className="format-strip page-width"><span>For everything that catches your eye.</span><div><span>Articles</span><Plus /><span>Videos</span><Plus /><span>Ideas</span><Plus /><span>Places</span><Plus /><span>Inspiration</span></div><Bookmark size={18} /></div>
  </section>;
}

function Workflow() {
  return <section className="workflow page-width section-space" id="how-it-works" aria-labelledby="workflow-title">
    <div className="section-heading"><p className="section-label">01 / THE BEAUTY OF DOING LESS</p><div><h2 id="workflow-title">You do the saving.<br /><span className="soft-text">We do the everything else.</span></h2><p>No folder decisions. No tagging sessions. No “where did I put that?” Your bookmarking agent takes care of the busywork.</p></div></div>
    <div className="workflow-grid"><div className="agent-world"><img src={`${imagePath}observatory.jpg`} loading="lazy" width="2048" height="1148" alt="An observatory with a glowing arc overlooking a flower-covered hill" /><div className="agent-world-copy"><Sparkles size={24} /><h3>A little intelligence.<br />A lot less effort.</h3><p>Working quietly behind every save.</p></div><span className="art-caption">YOUR CURIOSITY, UNDERSTOOD.</span></div><BookmarkDemo /></div>
    <div className="workflow-steps"><div><span>01</span><h3>Capture the spark.</h3><p>A link, a video, a new obsession. Save it without interrupting your day.</p></div><div><span>02</span><h3>Leave the filing to us.</h3><p>Your agent understands the content, adds context, and organizes it for you.</p></div><div><span>03</span><h3>Find it in your own words.</h3><p>Remember the idea, not the title. Search for what stuck with you.</p></div></div>
  </section>;
}

function Promise() {
  return <section className="promise" id="promise" aria-labelledby="promise-title"><div className="promise-inner page-width"><div className="promise-copy"><p className="section-label">NOT A BOOKMARK GRAVEYARD.</p><div className="promise-number">100<span>%</span><span className="number-asterisk">*</span></div><h2 id="promise-title">Saved with the intention<br />of being found.</h2><p>Not just a place to put things.<br />A way back to every idea, every rabbit hole,<br className="desktop-break" /> every “I’ll need this someday.”</p><a className="text-link light-link" href={SIGNUP}>Give your bookmarks a home <ArrowUpRight size={18} /></a><small>*Our ambition: confidence in every save. A product promise,<br className="desktop-break" /> not a measured retrieval rate or a guarantee.</small></div><div className="promise-art"><img src={`${imagePath}portal-rocks.jpg`} loading="lazy" width="2048" height="1148" alt="An open, glowing portal framed by sandstone rocks and a garden path" /><div className="promise-art-bottom"><span>LESS SEARCHING.<br />MORE FINDING.</span><ArrowUpRight size={36} /></div></div></div></section>;
}

function Mobile() {
  return <section className="mobile-section page-width section-space" id="ios" aria-labelledby="ios-title"><div className="mobile-art"><img src={`${imagePath}portal-arch.jpg`} loading="lazy" width="2048" height="1148" alt="A glowing arch in a landscape of rocks and flowers, a visual metaphor for your pocket-sized doorway" /><div className="pocket-outline"><Bookmark size={40} /><span>Your whole world.<br />Within reach.</span></div><span className="mobile-art-label">CAMPAIGN ARTWORK. NOT AN APP SCREENSHOT.</span></div><div className="mobile-copy"><span className="ios-label"><Smartphone size={17} /> MADE FOR YOUR IPHONE</span><h2 id="ios-title">Out in the world.<br />Still in your pocket.</h2><p>The best finds don’t wait until you’re at your desk. Save from your iPhone, keep moving, and come back when the moment is right.</p><div className="mobile-feature"><Share2 size={21} /><div><h3>From a spark to a save.</h3><p>Use the iOS share sheet to send a link straight to SaveIt.now.</p></div></div><div className="mobile-feature"><Search size={21} /><div><h3>Back to it, wherever you are.</h3><p>Your collection travels with you. Find the things you saved without retracing your steps.</p></div></div><a className="button button-dark" href="https://saveit.now/ios">Explore SaveIt for iOS <ArrowUpRight size={17} /></a><span className="micro-copy">Your bookmarks. A native iOS experience.</span></div></section>;
}

function Closing() {
  return <><section className="closing" aria-labelledby="closing-title"><img src={`${imagePath}home.jpg`} loading="lazy" width="2048" height="1148" alt="A welcoming, illuminated home at the end of a path on a flower-covered hill" /><div className="closing-content page-width"><p>A HOME FOR EVERYTHING YOU WANT TO COME BACK TO.</p><h2 id="closing-title">More curiosity.<br />Less chaos.<br /><span>Just save it.</span></h2><a className="button button-cream" href={SIGNUP}>Make yourself at home <ArrowUpRight size={19} /></a><span className="closing-free">Start free. Stay curious.</span></div></section><footer className="footer page-width"><div className="footer-top"><div><Brand /><p>Your home for bookmarks.<br />Made for a curious life.</p></div><nav aria-label="Product links"><a href="#how-it-works">How it works</a><a href="#pricing">Pricing</a><a href="https://saveit.now/extensions">Browser extension <ArrowUpRight size={12} /></a><a href="https://saveit.now/ios">iOS app <ArrowUpRight size={12} /></a></nav><nav aria-label="Support links"><a href="#faq">Questions & answers</a><a href="https://saveit.now/docs">Documentation <ArrowUpRight size={12} /></a><a href="mailto:hi@saveit.now">Say hello <ArrowUpRight size={12} /></a></nav><a className="back-top" href="#top">BACK TO TOP <ArrowRight size={19} /></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} SaveIt.now</span><span>Save something good today.</span><a href="https://saveit.now/privacy">Privacy</a></div></footer></>;
}

export function App() {
  return <div id="top"><a className="skip-link" href="#main">Skip to content</a><Header /><main id="main"><Hero /><Workflow /><Promise /><Mobile /><PricingAndFaq /><Closing /></main></div>;
}
