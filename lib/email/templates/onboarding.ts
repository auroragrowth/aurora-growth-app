import { auroraEmailLayout, section, textBlock, nextStepBox } from './aurora'

const APP = 'https://app.auroragrowth.co.uk'

export function onboardingDay0Email(firstName: string) {
  const safe = firstName || 'there'
  const subject = `Welcome to Aurora Growth Academy, ${safe}`
  const html = auroraEmailLayout(
    'Day 0 &middot; Welcome',
    'Welcome to Aurora Growth Academy',
    'Our onboarding team will guide you step by step over the next few days so you can get the most from your Aurora membership.',
    'Open Your Dashboard',
    `${APP}/dashboard`,
    safe,
    section('What happens next', `
      Over the next 7 days, we will show you exactly how to use Aurora properly &mdash; from finding opportunities, to building a watchlist, to planning entries with structure and confidence.
    `) +
    section('What Aurora helps you do', `
      &bull; Find stronger opportunities with the Market Scanner<br>
      &bull; Plan entries and pullbacks with the Investment Calculator<br>
      &bull; Track live and demo watchlists separately<br>
      &bull; Set alerts and Telegram notifications<br>
      &bull; Understand the market with the Heatmap<br>
      &bull; Learn the platform through the Aurora Assistant
    `) +
    nextStepBox('Tomorrow we will show you how Aurora helps you invest with structure &mdash; not guesswork.'),
    { label: 'Login', url: `${APP}/login` }
  )
  return { subject, html }
}

export function onboardingDay1Email(firstName: string) {
  const safe = firstName || 'there'
  const subject = 'How Aurora helps you invest with more structure'
  const html = auroraEmailLayout(
    'Day 1 &middot; How Aurora Works',
    'Invest with structure, not guesswork.',
    'Aurora is designed to take you from idea to action with a clearer and more repeatable process.',
    'Open Dashboard',
    `${APP}/dashboard`,
    safe,
    section('The Aurora flow', `
      <strong>Scanner &rarr; Watchlist &rarr; Calculator &rarr; Decision</strong><br><br>
      Instead of chasing tips or reacting to news, Aurora helps you:<br>
      1. Identify high-conviction stocks using the scanner<br>
      2. Add them to your watchlist and monitor them<br>
      3. Plan your entry using the investment ladder<br>
      4. Get alerted when your entry price is hit
    `) +
    nextStepBox('Aurora works best when used as a complete process, not as random one-off ideas. Tomorrow we will introduce the Market Scanner.')
  )
  return { subject, html }
}

export function onboardingDay2Email(firstName: string) {
  const safe = firstName || 'there'
  const subject = 'Find stronger opportunities with the Aurora Scanner'
  const html = auroraEmailLayout(
    'Day 2 &middot; Market Scanner',
    'Find stronger opportunities faster.',
    'The Aurora Market Scanner helps you cut through the noise and focus on setups worth your attention.',
    'Open Market Scanner',
    `${APP}/dashboard/market-scanner`,
    safe,
    section('How the scanner works', `
      The scanner scores every stock across 30 criteria covering momentum, fundamentals, and institutional activity. The result is a simple Aurora Score out of 30.<br><br>
      <strong>25+</strong> = STRONG opportunity<br>
      <strong>18&ndash;24</strong> = BUILDING &mdash; worth watching<br>
      <strong>Below 18</strong> = WATCH with caution
    `) +
    section('What to do today', `
      Use the scanner to find 3 to 5 names worth tracking. You do not need to act immediately &mdash; just start building a better shortlist.
    `) +
    nextStepBox('Tip: Sort by score and look for stocks 20&ndash;40% below their 52-week high &mdash; those are classic Aurora ladder opportunities.')
  )
  return { subject, html }
}

export function onboardingDay3Email(firstName: string) {
  const safe = firstName || 'there'
  const subject = 'Build your first Aurora watchlist'
  const html = auroraEmailLayout(
    'Day 3 &middot; Watchlist',
    'Turn ideas into a structured watchlist.',
    'Once you have a few strong names, the next step is to organise them properly inside Aurora.',
    'Open Watchlist',
    `${APP}/dashboard/watchlist`,
    safe,
    section('Two modes', `
      Your watchlist supports <strong>Live</strong> and <strong>Demo</strong> modes separately. Use Demo to practice your strategy without touching your real portfolio.
    `) +
    section('What to do today', `
      Add a few names from the scanner into your watchlist. From there you can set price alerts, open the investment calculator, or view the full Aurora Intelligence analysis for any stock.
    `)
  )
  return { subject, html }
}

export function onboardingDay4Email(firstName: string) {
  const safe = firstName || 'there'
  const subject = 'Plan entries with the Aurora Investment Calculator'
  const html = auroraEmailLayout(
    'Day 4 &middot; Calculator',
    'Plan entries with more confidence.',
    'The Aurora Investment Calculator helps you map pullbacks, entries, break-even point, and targets with more structure.',
    'Open Calculator',
    `${APP}/dashboard/investments/calculator`,
    safe,
    section('How it works', `
      1. Select a stock from your watchlist<br>
      2. Enter your total capital to deploy<br>
      3. Aurora calculates 4&ndash;6 entry levels below the current price<br>
      4. See your blended entry price (BEP) and profit targets instantly<br><br>
      The result is a clear plan: you know exactly when to buy, how much to invest at each step, and what your targets are.
    `) +
    section('What to do today', `
      Pick one stock from your watchlist and run it through the calculator. This is where Aurora starts turning ideas into an actual plan.
    `)
  )
  return { subject, html }
}

export function onboardingDay5Email(firstName: string) {
  const safe = firstName || 'there'
  const subject = 'See the market more clearly with Aurora'
  const html = auroraEmailLayout(
    'Day 5 &middot; Market View',
    'See the market more clearly.',
    'Better decisions come from both strong setups and strong context. Aurora helps you see both.',
    'Open Dashboard',
    `${APP}/dashboard`,
    safe,
    section('Volatility Compass', `
      The VIX index measures fear in the market. When VIX is high, Aurora ladders activate &mdash; historically the best buying opportunities come during peak fear.
    `) +
    section('Market Heatmap', `
      See at a glance which sectors and stocks are moving today. A quick daily check helps you stay oriented without information overload.
    `) +
    nextStepBox('A stock setup on its own is only part of the picture. Use Aurora to stay more aware of wider market conditions.')
  )
  return { subject, html }
}

export function onboardingDay6Email(firstName: string) {
  const safe = firstName || 'there'
  const subject = 'Your simple Aurora daily routine'
  const html = auroraEmailLayout(
    'Day 6 &middot; Routine',
    'A better investing routine in minutes.',
    'Aurora works best when it becomes part of a simple, repeatable daily routine.',
    'Open Aurora',
    `${APP}/dashboard`,
    safe,
    section('Your daily 5 minutes', `
      &bull; Check your dashboard &mdash; are any alerts triggered?<br>
      &bull; Glance at the scanner &mdash; any new STRONG signals?<br>
      &bull; Review your watchlist &mdash; any stocks near entry levels?<br>
      &bull; Check the VIX &mdash; is volatility rising?
    `) +
    textBlock('That is it. Aurora does the heavy lifting. You just need to review what it surfaces and act when it tells you to.')
  )
  return { subject, html }
}

export function onboardingDay7Email(firstName: string) {
  const safe = firstName || 'there'
  const subject = 'Ready to go further with Aurora?'
  const html = auroraEmailLayout(
    'Day 7 &middot; Next Steps',
    `You're set up, ${safe}.`,
    'You now have the foundation of a more structured investing process. The next step is continuing to use it consistently.',
    'Continue with Aurora',
    `${APP}/dashboard`,
    safe,
    section('What you should have done by now', `
      &bull; Logged in and explored the dashboard<br>
      &bull; Used the scanner<br>
      &bull; Added names to your watchlist<br>
      &bull; Tested the calculator<br>
      &bull; Started building a routine
    `) +
    section('The key now', `
      Keep using Aurora consistently. Structure is what helps turn information into better decision-making over time.
    `) +
    nextStepBox('Questions? Reply to this email &mdash; the onboarding team reads every message.')
  )
  return { subject, html }
}

export function getOnboardingEmail(day: number, firstName: string) {
  switch (day) {
    case 0: return onboardingDay0Email(firstName)
    case 1: return onboardingDay1Email(firstName)
    case 2: return onboardingDay2Email(firstName)
    case 3: return onboardingDay3Email(firstName)
    case 4: return onboardingDay4Email(firstName)
    case 5: return onboardingDay5Email(firstName)
    case 6: return onboardingDay6Email(firstName)
    case 7: return onboardingDay7Email(firstName)
    default: return null
  }
}
