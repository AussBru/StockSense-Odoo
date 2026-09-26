import express from 'express'
import cors from 'cors'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

function createTransporter() {
  const service = process.env.SMTP_SERVICE
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const secure = process.env.SMTP_SECURE === 'true'
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!user || !pass) {
    return null
  }

  if (service) {
    return nodemailer.createTransport({
      service,
      auth: { user, pass },
    })
  }

  if (host) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    })
  }

  // Default to gmail service if not specified
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}

app.get('/api/health', (req, res) => {
  const isConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)
  res.json({
    status: 'ok',
    smtpConfigured: isConfigured,
    senderEmail: isConfigured ? process.env.SMTP_USER : null,
  })
})

app.post('/api/send-otp', async (req, res) => {
  try {
    const { email, otp } = req.body

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP are required.' })
    }

    const transporter = createTransporter()

    if (!transporter) {
      return res.status(500).json({
        success: false,
        error: 'Email service not configured. Please add SMTP_USER and SMTP_PASS in the .env file.',
      })
    }

    const fromAddress = process.env.SMTP_FROM || `"StockSense Support" <${process.env.SMTP_USER}>`

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 28px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="display: flex; align-items: center; margin-bottom: 24px;">
          <div style="background-color: #5b4bff; color: #ffffff; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; text-align: center; line-height: 36px;">
            S
          </div>
          <span style="font-size: 18px; font-weight: 700; color: #0f172a; margin-left: 10px;">StockSense</span>
        </div>

        <h2 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 12px 0;">Reset Your Password</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 20px 0;">
          We received a request to reset your password. Use the verification code below to complete the process:
        </p>

        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 20px;">
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #4338ca; font-family: monospace;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #64748b; margin: 8px 0 0 0;">
            This OTP is valid for 10 minutes.
          </p>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.4; margin: 0 0 24px 0;">
          If you did not request a password reset, please ignore this email or contact support if you have security concerns.
        </p>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; margin: 0; text-align: center;">
          StockSense Inventory OS · Automated Notification
        </p>
      </div>
    `

    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: `${otp} is your StockSense password reset OTP`,
      text: `Your StockSense password reset verification code is: ${otp}. It is valid for 10 minutes.`,
      html: htmlContent,
    })

    return res.json({ success: true, message: 'OTP sent to email successfully.' })
  } catch (error) {
    console.error('Error sending OTP email:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send OTP email.',
    })
  }
})

app.listen(PORT, () => {
  console.log(`StockSense API Backend running on http://localhost:${PORT}`)
})
