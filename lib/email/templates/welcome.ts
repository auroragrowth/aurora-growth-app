export function welcomeEmail(firstName: string): string {
  const safe = firstName || 'there'
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Aurora Growth Academy Email</title>
</head>
<body style="margin:0;padding:0;background:#020617;font-family:Arial,Helvetica,sans-serif;color:#eaf4ff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(180deg,#020617 0%,#04101f 35%,#020617 100%);">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:720px;background:rgba(8,20,42,0.92);border:1px solid rgba(83,175,255,0.18);border-radius:24px;overflow:hidden;">

          <tr>
            <td style="padding:34px 32px 24px 32px;background:
              radial-gradient(circle at top left, rgba(36,215,238,0.18), transparent 30%),
              radial-gradient(circle at top right, rgba(139,92,246,0.18), transparent 30%),
              linear-gradient(180deg,#071123 0%,#04101f 100%);
              border-bottom:1px solid rgba(83,175,255,0.18);">
              <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/Aurora_Logo_email.png" alt="Aurora Growth Academy" style="height:48px;width:auto;display:block;margin-bottom:18px;">
              <div style="display:inline-block;padding:9px 14px;border-radius:999px;border:1px solid rgba(36,215,238,0.24);background:rgba(8,16,35,0.8);color:#70ebff;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;margin-bottom:18px;">
                Aurora Growth Academy
              </div>
              <h1 style="margin:0 0 14px 0;font-size:38px;line-height:1.08;color:#ffffff;">Invest with clarity, not guesswork.</h1>
              <p style="margin:0 0 24px 0;font-size:18px;line-height:1.8;color:#a9bfd8;">
                Aurora Growth Academy gives you a complete investing system to help you find opportunities,
                plan entries, manage risk, and take profit with more structure and confidence.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:12px;padding-bottom:10px;">
                    <a href="https://app.auroragrowth.co.uk/signup" style="display:inline-block;background:linear-gradient(90deg,#24d7ee,#8b5cf6);color:#04101f;text-decoration:none;font-weight:700;border-radius:999px;padding:15px 24px;font-size:15px;">Create Your Account</a>
                  </td>
                  <td style="padding-bottom:10px;">
                    <a href="https://app.auroragrowth.co.uk/login" style="display:inline-block;background:rgba(10,20,39,0.82);color:#eaf4ff;text-decoration:none;font-weight:700;border-radius:999px;padding:14px 24px;font-size:15px;border:1px solid rgba(83,175,255,0.28);">Login</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <p style="margin:0;font-size:17px;line-height:1.85;color:#dbe8f8;">Hi ${safe},</p>
              <p style="margin:14px 0 0 0;font-size:17px;line-height:1.85;color:#a9bfd8;">
                If you are looking for a more structured way to invest, Aurora is built to help you move
                from idea to action with a clearer process.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 0 32px;">
              <div style="background:linear-gradient(180deg,rgba(8,20,42,0.95),rgba(5,12,24,0.94));border:1px solid rgba(83,175,255,0.16);border-radius:22px;padding:24px;">
                <div style="color:#70ebff;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px;">What Aurora helps you do</div>
                <div style="color:#eaf4ff;font-size:16px;line-height:1.9;">
                  &bull; Find stronger opportunities with the Market Scanner<br>
                  &bull; Plan entries and pullbacks with the Investment Calculator<br>
                  &bull; Track live and demo watchlists separately<br>
                  &bull; Set alerts and Telegram notifications<br>
                  &bull; Understand the market with the Heatmap<br>
                  &bull; Learn the platform through the Aurora Assistant
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 0 32px;">
              <div style="color:#70ebff;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px;">Dashboard</div>
              <h2 style="margin:0 0 12px 0;font-size:28px;line-height:1.15;color:#ffffff;">See everything in one place</h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.8;color:#a9bfd8;">
                Your dashboard gives you a clear view of your account, plan, and platform overview.
              </p>
              <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/dashboard-scaled.png" alt="Aurora dashboard" style="width:100%;height:auto;display:block;border-radius:18px;border:1px solid rgba(83,175,255,0.16);">
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 0 32px;">
              <div style="color:#70ebff;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px;">Market Scanner</div>
              <h2 style="margin:0 0 12px 0;font-size:28px;line-height:1.15;color:#ffffff;">Find stronger opportunities faster</h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.8;color:#a9bfd8;">
                Focus on higher quality setups instead of guessing where to start.
              </p>
              <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/scanner-scaled.png" alt="Aurora scanner" style="width:100%;height:auto;display:block;border-radius:18px;border:1px solid rgba(83,175,255,0.16);">
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 0 32px;">
              <div style="color:#70ebff;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px;">Investment Calculator</div>
              <h2 style="margin:0 0 12px 0;font-size:28px;line-height:1.15;color:#ffffff;">Plan before you buy</h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.8;color:#a9bfd8;">
                Aurora helps calculate pullbacks, entries, combined buy logic and break-even price so your decisions have structure from the start.
              </p>
              <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/calculator-scaled.png" alt="Aurora calculator" style="width:100%;height:auto;display:block;border-radius:18px;border:1px solid rgba(83,175,255,0.16);">
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top" width="50%" style="padding-right:8px;">
                    <div style="color:#70ebff;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px;">Live &amp; Demo</div>
                    <h2 style="margin:0 0 12px 0;font-size:24px;line-height:1.15;color:#ffffff;">Practice first or go live</h2>
                    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#a9bfd8;">
                      Learn the system in demo mode before moving into real investing.
                    </p>
                    <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/live-demo.png" alt="Live and demo mode" style="width:100%;height:auto;display:block;border-radius:18px;border:1px solid rgba(83,175,255,0.16);">
                  </td>
                  <td valign="top" width="50%" style="padding-left:8px;">
                    <div style="color:#70ebff;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px;">Watchlists</div>
                    <h2 style="margin:0 0 12px 0;font-size:24px;line-height:1.15;color:#ffffff;">Track ideas clearly</h2>
                    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#a9bfd8;">
                      Keep live and demo opportunities organised with separate watchlists.
                    </p>
                    <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/watchlist1-scaled.png" alt="Aurora watchlist" style="width:100%;height:auto;display:block;border-radius:18px;border:1px solid rgba(83,175,255,0.16);">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top" width="50%" style="padding-right:8px;">
                    <div style="color:#70ebff;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px;">Alerts &amp; Telegram</div>
                    <h2 style="margin:0 0 12px 0;font-size:24px;line-height:1.15;color:#ffffff;">Never miss key moments</h2>
                    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#a9bfd8;">
                      Set rise, fall and entry alerts and stay informed in real time.
                    </p>
                    <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/alerts.png" alt="Aurora alerts" style="width:100%;height:auto;display:block;border-radius:18px;border:1px solid rgba(83,175,255,0.16);">
                  </td>
                  <td valign="top" width="50%" style="padding-left:8px;">
                    <div style="color:#70ebff;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px;">Aurora Assistant</div>
                    <h2 style="margin:0 0 12px 0;font-size:24px;line-height:1.15;color:#ffffff;">Learn as you go</h2>
                    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#a9bfd8;">
                      Ask questions about the platform and how Aurora works.
                    </p>
                    <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/assistant.png" alt="Aurora assistant" style="width:100%;height:auto;display:block;border-radius:18px;border:1px solid rgba(83,175,255,0.16);">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 0 32px;">
              <div style="color:#70ebff;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px;">Heatmap</div>
              <h2 style="margin:0 0 12px 0;font-size:28px;line-height:1.15;color:#ffffff;">Understand the market at a glance</h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.8;color:#a9bfd8;">
                Use the heatmap to quickly see where money is flowing and which parts of the market look stronger or weaker.
              </p>
              <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/heatmap-scaled.png" alt="Aurora heatmap" style="width:100%;height:auto;display:block;border-radius:18px;border:1px solid rgba(83,175,255,0.16);">
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 0 32px;">
              <div style="color:#70ebff;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px;">Simple Sign Up</div>
              <h2 style="margin:0 0 12px 0;font-size:28px;line-height:1.15;color:#ffffff;">Get started in minutes</h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.8;color:#a9bfd8;">
                Create your account, choose your plan, and start exploring the full Aurora system straight away.
              </p>
              <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/signup-1-scaled.png" alt="Aurora signup" style="width:100%;height:auto;display:block;border-radius:18px;border:1px solid rgba(83,175,255,0.16);">
            </td>
          </tr>

          <tr>
            <td style="padding:30px 32px 0 32px;">
              <div style="background:
                radial-gradient(circle at top left, rgba(36,215,238,0.14), transparent 26%),
                radial-gradient(circle at bottom right, rgba(139,92,246,0.16), transparent 24%),
                linear-gradient(180deg, rgba(8,20,42,0.96), rgba(5,12,24,0.96));
                border:1px solid rgba(83,175,255,0.16);
                border-radius:24px;
                padding:32px;
                text-align:center;">
                <h2 style="margin:0 0 14px 0;font-size:32px;line-height:1.1;color:#ffffff;">Start investing with a system today</h2>
                <p style="margin:0 0 22px 0;font-size:17px;line-height:1.85;color:#a9bfd8;">
                  Stop relying on guesswork. Join Aurora Growth Academy and start using a clearer, more structured investing process.
                </p>
                <a href="https://app.auroragrowth.co.uk/signup" style="display:inline-block;background:linear-gradient(90deg,#24d7ee,#8b5cf6);color:#04101f;text-decoration:none;font-weight:700;border-radius:999px;padding:16px 26px;font-size:16px;">Create Your Account</a>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 0 32px;">
              <div style="background:rgba(8,20,42,0.6);border:1px solid rgba(83,175,255,0.12);border-radius:16px;padding:20px;">
                <p style="margin:0;font-size:15px;line-height:1.7;color:#a9bfd8;">
                  Next step: Keep an eye on your inbox &mdash; our onboarding team will continue helping you understand how Aurora works and how to start using it properly.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 34px 32px;text-align:center;font-size:14px;line-height:1.8;color:#88a1bb;">
              Best regards,<br>
              <strong style="color:#eaf4ff;">The Aurora Growth Academy Onboarding Team</strong><br>
              Aurora Growth Academy
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
