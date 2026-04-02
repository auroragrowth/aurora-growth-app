export function day5Email(firstName: string) {
  return `
  <!doctype html>
  <html>
  <body style="margin:0;padding:0;background:#020617;font-family:Arial;color:#eaf4ff;">
    <table width="100%" style="padding:24px;">
      <tr>
        <td align="center">
          <table width="600" style="background:#04101f;border-radius:20px;padding:32px;">
            
            <h1>Never miss a setup</h1>

            <p>Hi ${firstName},</p>

            <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/alerts.png" style="width:100%;border-radius:12px;">

            <p>Aurora alerts tell you when:</p>

            <div style="background:#081428;padding:20px;border-radius:12px;">
              • Price rises<br>
              • Price drops<br>
              • Entry levels hit
            </div>

            <p>Plus Telegram notifications.</p>

            <a href="https://app.auroragrowth.co.uk/signup" style="padding:12px 20px;background:#24d7ee;color:#000;border-radius:999px;text-decoration:none;">
              Activate Alerts
            </a>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}
