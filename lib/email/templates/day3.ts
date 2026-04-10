export function day3Email(firstName: string) {
  return `
  <!doctype html>
  <html>
  <body style="margin:0;padding:0;background:#020617;font-family:Arial;color:#eaf4ff;">
    <table width="100%" style="padding:24px;background:#020617;">
      <tr>
        <td align="center">
          <table width="600" style="max-width:600px;background:#04101f;border-radius:20px;padding:32px;">
            <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/AGA_Logo.png" style="height:40px;margin-bottom:20px;display:block;">

            <h1 style="color:#ffffff;font-size:32px;">Why most people lose money investing</h1>

            <p>Hi ${firstName},</p>

            <p>Most investors don’t fail because they’re not smart.</p>
            <p>They fail because they don’t have a system.</p>

            <div style="background:#081428;border-radius:12px;padding:20px;margin:20px 0;">
              • Buying too late<br>
              • Selling too early<br>
              • Chasing hype<br>
              • Ignoring risk
            </div>

            <p>Aurora fixes that.</p>

            <a href="https://app.auroragrowth.co.uk/signup" style="padding:12px 20px;background:#24d7ee;color:#000;border-radius:999px;text-decoration:none;">
              Start With a System
            </a>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}
