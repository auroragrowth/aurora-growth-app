export function day7Email(firstName: string) {
  return `
  <!doctype html>
  <html>
  <body style="margin:0;padding:0;background:#020617;font-family:Arial;color:#eaf4ff;">
    <table width="100%" style="padding:24px;">
      <tr>
        <td align="center">
          <table width="600" style="background:#04101f;border-radius:20px;padding:32px;">
            
            <h1>Ready to invest with clarity?</h1>

            <p>Hi ${firstName},</p>

            <p>Aurora gives you:</p>

            <div style="background:#081428;padding:20px;border-radius:12px;">
              • Scanner<br>
              • Calculator<br>
              • Alerts<br>
              • Watchlists<br>
              • Live + Demo
            </div>

            <p>All in one place.</p>

            <a href="https://app.auroragrowth.co.uk/signup" style="padding:14px 24px;background:linear-gradient(90deg,#24d7ee,#8b5cf6);color:#000;border-radius:999px;text-decoration:none;font-weight:bold;">
              Create Your Account
            </a>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}
