export function day2Email(firstName: string) {
  return `
  <!doctype html>
  <html>
  <body style="margin:0;padding:0;background:#020617;font-family:Arial;color:#eaf4ff;">
    <table width="100%" style="padding:24px;">
      <tr>
        <td align="center">
          <table width="600" style="background:#04101f;border-radius:20px;padding:32px;">
            <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/AGA_Logo.png" style="height:40px;margin-bottom:20px;">
            <h1 style="color:#ffffff;">Here’s how this works on a real stock</h1>
            <p>Hi ${firstName},</p>
            <p>Let’s look at a simple example.</p>
            <p>A stock rises 20% and then pulls back.</p>
            <p>Most people guess where to buy.</p>
            <p><strong>Aurora does this differently:</strong></p>
            <ul>
              <li>Identifies the move</li>
              <li>Calculates pullback levels</li>
              <li>Builds your entry ladder</li>
              <li>Shows your break-even price</li>
            </ul>
            <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/calculator-scaled.png" style="width:100%;border-radius:12px;">
            <p>This removes guesswork and gives you a clearer structure.</p>
            <a href="https://app.auroragrowth.co.uk/signup?utm_campaign=day2"
              style="display:inline-block;margin-top:20px;padding:14px 24px;background:#8b5cf6;color:#ffffff;border-radius:999px;text-decoration:none;font-weight:bold;">
              Run Your First Stock
            </a>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}
