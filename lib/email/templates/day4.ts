export function day4Email(firstName: string) {
  return `
  <!doctype html>
  <html>
  <body style="margin:0;padding:0;background:#020617;font-family:Arial;color:#eaf4ff;">
    <table width="100%" style="padding:24px;">
      <tr>
        <td align="center">
          <table width="600" style="background:#04101f;border-radius:20px;padding:32px;">
            
            <h1>Live vs Demo</h1>

            <p>Hi ${firstName},</p>

            <img src="https://auroragrowth.co.uk/wp-content/uploads/2026/04/live-demo.png" style="width:100%;border-radius:12px;">

            <p><strong>Demo:</strong> learn safely</p>
            <p><strong>Live:</strong> apply the system</p>

            <a href="https://app.auroragrowth.co.uk/signup" style="padding:12px 20px;background:#8b5cf6;color:#fff;border-radius:999px;text-decoration:none;">
              Start in Demo
            </a>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}
