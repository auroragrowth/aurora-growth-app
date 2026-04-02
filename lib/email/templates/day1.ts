export function day1Email(firstName: string) {
  return `
  <!doctype html>
  <html>
  <body style="margin:0;padding:0;background:#020617;font-family:Arial;color:#eaf4ff;">
    <table width="100%" style="padding:24px;">
      <tr>
        <td align="center">
          <table width="600" style="background:#04101f;border-radius:20px;padding:32px;">
            <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/Aurora_Logo_email.png" style="height:40px;margin-bottom:20px;">
            <h1 style="color:#ffffff;">How Aurora actually works</h1>
            <p>Hi ${firstName},</p>
            <p>Yesterday you saw what Aurora does — today I’ll show you how it actually works.</p>
            <h3>Step 1 — Find opportunities</h3>
            <p>The Market Scanner filters thousands of stocks into high-quality setups.</p>
            <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/scanner-scaled.png" style="width:100%;border-radius:12px;">
            <h3>Step 2 — Plan your entries</h3>
            <p>The calculator shows you where to buy, how much, and your break-even.</p>
            <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/calculator-scaled.png" style="width:100%;border-radius:12px;">
            <h3>Step 3 — Stay disciplined</h3>
            <p>Use alerts and watchlists to stay consistent and remove emotion.</p>
            <a href="https://app.auroragrowth.co.uk/signup?utm_campaign=day1"
              style="display:inline-block;margin-top:20px;padding:14px 24px;background:#24d7ee;color:#04101f;border-radius:999px;text-decoration:none;font-weight:bold;">
              Try Aurora Now
            </a>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}
