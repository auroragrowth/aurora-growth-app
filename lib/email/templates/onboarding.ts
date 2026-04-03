import { auroraEmailLayout } from './aurora'

const signOff = `
<p style="margin:32px 0 0;padding:24px;background:rgba(87,211,243,0.05);border:1px solid rgba(87,211,243,0.1);border-radius:16px;font-size:14px;line-height:1.6;color:#aebbd6;">
  Best regards,<br>
  <strong style="color:#edf3ff;">The Aurora Growth Academy Onboarding Team</strong><br>
  <span style="color:#57d3f3;">Aurora Growth Academy</span>
</p>`

function h1(t: string) { return `<h1 style="margin:0 0 16px;font-size:26px;font-weight:800;background:linear-gradient(90deg,#57d3f3,#a268ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${t}</h1>` }
function p(t: string) { return `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#aebbd6;">${t}</p>` }
function btn(t: string, u: string) { return `<div style="margin:24px 0;text-align:center;"><a href="${u}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#63d3ff,#6f86ff,#b267ff);color:#fff;text-decoration:none;font-weight:700;font-size:15px;border-radius:999px;">${t}</a></div>` }
const hr = `<hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0;"/>`

export function onboardingDay0Email(firstName: string) {
  const subject = `Welcome to Aurora Growth Academy, ${firstName}`
  const html = auroraEmailLayout(`
${h1(`Welcome to Aurora Growth Academy, ${firstName}`)}
${p(`You're now part of the Aurora Growth Academy. Our onboarding team will guide you step by step over the next few days so you can get the most from your Aurora membership.`)}
${p('Aurora is a premium investment platform built to help you invest with more structure, more clarity, and less noise.')}
${hr}
${p('<strong style="color:#edf3ff;">What to do first:</strong><br>Log in to your dashboard and take a look around. Familiarise yourself with the market scanner, your watchlist, and the investment calculator.')}
${btn('Open Your Dashboard &rarr;', 'https://app.auroragrowth.co.uk/dashboard')}
${p('Tomorrow we\'ll show you how Aurora helps you invest with structure &mdash; not guesswork.')}
${signOff}`, `Welcome to Aurora Growth Academy, ${firstName}!`)
  return { subject, html }
}

export function onboardingDay1Email(firstName: string) {
  const subject = `How Aurora helps you invest with more structure`
  const html = auroraEmailLayout(`
${h1('Day 1 &mdash; Invest with structure, not guesswork')}
${p(`Hi ${firstName}, most investors struggle not because there are no opportunities &mdash; but because there's too much noise.`)}
${p('Aurora is built around a simple principle: when you can see markets more clearly and follow a structured process, you make better decisions.')}
${hr}
${p('<strong style="color:#edf3ff;">The Aurora method:</strong><br>Instead of chasing tips or reacting to news, Aurora helps you:<br>1. Identify high-conviction stocks using the scanner<br>2. Add them to your watchlist and monitor them<br>3. Plan your entry using the investment ladder<br>4. Get alerted when your entry price is hit')}
${btn('See Your Scanner &rarr;', 'https://app.auroragrowth.co.uk/dashboard/market-scanner')}
${signOff}`, 'Day 1 &mdash; How Aurora helps you invest with structure')
  return { subject, html }
}

export function onboardingDay2Email(firstName: string) {
  const subject = `Find stronger opportunities with the Aurora Scanner`
  const html = auroraEmailLayout(`
${h1('Day 2 &mdash; The Aurora Market Scanner')}
${p(`Hi ${firstName}, today we're introducing the Aurora Market Scanner.`)}
${p('The scanner scores every stock across 30 criteria covering momentum, fundamentals, and institutional activity. The result is a simple Aurora Score out of 30.')}
${hr}
${p('<strong style="color:#edf3ff;">Score guide:</strong><br>25+ = STRONG opportunity<br>18&ndash;24 = BUILDING &mdash; worth watching<br>Below 18 = WATCH with caution')}
${p('Aurora Core includes 38 high-conviction stocks. Aurora Pro and Elite unlock the full Alternative list of 98 more.')}
${btn('Open the Scanner &rarr;', 'https://app.auroragrowth.co.uk/dashboard/market-scanner')}
${p('Tip: Sort by score and look for stocks with STRONG momentum that are 20&ndash;40% below their 52-week high &mdash; those are classic Aurora ladder opportunities.')}
${signOff}`, 'Day 2 &mdash; Find stronger opportunities with the Aurora Scanner')
  return { subject, html }
}

export function onboardingDay3Email(firstName: string) {
  const subject = `Build your first Aurora watchlist`
  const html = auroraEmailLayout(`
${h1('Day 3 &mdash; Build your Aurora watchlist')}
${p(`Hi ${firstName}, your watchlist is where Aurora really starts to work for you.`)}
${p('Add stocks from the scanner by clicking the star icon next to any ticker. Aurora will separate your recommended stocks from your personal additions.')}
${hr}
${p('<strong style="color:#edf3ff;">Two modes:</strong><br>Your watchlist supports Live and Demo modes separately. Use Demo to practice your strategy without touching your real portfolio.')}
${p('From your watchlist you can set price alerts, open the investment calculator, or view the full Aurora Intelligence analysis for any stock.')}
${btn('Go to Your Watchlist &rarr;', 'https://app.auroragrowth.co.uk/dashboard/watchlist')}
${signOff}`, 'Day 3 &mdash; Build your first Aurora watchlist')
  return { subject, html }
}

export function onboardingDay4Email(firstName: string) {
  const subject = `Plan entries with the Aurora Investment Calculator`
  const html = auroraEmailLayout(`
${h1('Day 4 &mdash; The Aurora Investment Calculator')}
${p(`Hi ${firstName}, the Aurora Investment Calculator is one of the most powerful tools on the platform.`)}
${p('Instead of guessing when to buy, the calculator builds you a staged entry ladder &mdash; so you deploy capital in steps as the stock falls to your target levels.')}
${hr}
${p('<strong style="color:#edf3ff;">How it works:</strong><br>1. Select a stock from your watchlist<br>2. Enter your total capital to deploy<br>3. Aurora calculates 4&ndash;6 entry levels below the current price<br>4. See your blended entry price (BEP) and profit targets instantly')}
${p('The result is a clear plan: you know exactly when to buy, how much to invest at each step, and what your targets are.')}
${btn('Open the Calculator &rarr;', 'https://app.auroragrowth.co.uk/dashboard/investments/calculator')}
${signOff}`, 'Day 4 &mdash; Plan entries with the Aurora Investment Calculator')
  return { subject, html }
}

export function onboardingDay5Email(firstName: string) {
  const subject = `See the market more clearly with Aurora`
  const html = auroraEmailLayout(`
${h1('Day 5 &mdash; See the market more clearly')}
${p(`Hi ${firstName}, today we want to show you two tools that give you a broader view of the market.`)}
${hr}
${p('<strong style="color:#edf3ff;">Volatility Compass (Elite):</strong><br>The VIX index measures fear in the market. When VIX is high, Aurora ladders activate &mdash; historically the best buying opportunities come during peak fear.')}
${p('<strong style="color:#edf3ff;">Market Heatmap:</strong><br>See at a glance which sectors and stocks are moving today. A quick daily check helps you stay oriented without information overload.')}
${btn('Open the Volatility Compass &rarr;', 'https://app.auroragrowth.co.uk/dashboard/volatility')}
${signOff}`, 'Day 5 &mdash; See the market more clearly with Aurora')
  return { subject, html }
}

export function onboardingDay6Email(firstName: string) {
  const subject = `Your simple Aurora daily routine`
  const html = auroraEmailLayout(`
${h1('Day 6 &mdash; Your Aurora daily routine')}
${p(`Hi ${firstName}, the best investors keep things simple. Here's a 5-minute Aurora routine that keeps you sharp without the noise.`)}
${hr}
${p('<strong style="color:#edf3ff;">Your daily 5 minutes:</strong><br>&#9745; Check the dashboard &mdash; are any alerts triggered?<br>&#9745; Glance at the scanner &mdash; any new STRONG signals?<br>&#9745; Review your watchlist &mdash; any stocks near entry levels?<br>&#9745; Check the VIX &mdash; is volatility rising?')}
${p('That\'s it. Aurora does the heavy lifting. You just need to review what it surfaces and act when it tells you to.')}
${btn('Open Your Dashboard &rarr;', 'https://app.auroragrowth.co.uk/dashboard')}
${signOff}`, 'Day 6 &mdash; Your simple Aurora daily routine')
  return { subject, html }
}

export function onboardingDay7Email(firstName: string) {
  const subject = `Ready to go further with Aurora?`
  const html = auroraEmailLayout(`
${h1(`Day 7 &mdash; You're set up, ${firstName}`)}
${p('You\'ve completed your Aurora onboarding week. You now know how to use every key part of the platform.')}
${p('The most important thing now is consistency. Aurora works best when you check in regularly, follow the scanner signals, and use the ladder calculator before every position.')}
${hr}
${p('<strong style="color:#edf3ff;">Your Aurora checklist:</strong><br>&#10003; Dashboard reviewed<br>&#10003; Scanner explored<br>&#10003; Watchlist built<br>&#10003; Calculator used<br>&#10003; Alerts set up<br>&#10003; Broker connected')}
${p('If you haven\'t done any of those yet &mdash; today is the day. Start with just one stock in the calculator and see what Aurora shows you.')}
${btn('Return to Aurora &rarr;', 'https://app.auroragrowth.co.uk/dashboard')}
${p('Questions? Reply to this email &mdash; the onboarding team reads every message.')}
${signOff}`, 'Day 7 &mdash; Your Aurora onboarding is complete')
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
