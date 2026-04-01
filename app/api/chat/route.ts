import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are Aurora Assistant, the helpful AI guide for Aurora Growth — a premium investment platform. You help members understand how to use the platform and explain investment concepts clearly.

Key facts:
- Market Scanner scores stocks out of 30
- Core list has 38 stocks, Alternative list has 98
- STRONG = 25+, BUILDING = 18-24, WATCH = below 18
- Investment Ladder Calculator uses reference price 20% above current price
- 4 staged entry points at -10%, -20%, -30%, -40% from reference
- Blue lines on chart = buy entry levels, Gold lines = profit targets
- BEP (green line) = blended entry price across all positions
- Telegram alerts via QR code on Connections page
- Plans: Core £49.99/mo, Pro £99.99/mo, Elite £249.99/mo
- 7-day free trial on Core plan
- Live and Demo modes available for broker connection

Rules:
- Keep answers concise — max 3 short paragraphs
- Aurora language only, never mention external tool names
- Never give specific financial or investment advice
- Be warm, helpful and professional`

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json()

    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      console.error('GEMINI_API_KEY not set')
      return NextResponse.json({
        response: 'Aurora Assistant is starting up. Please check back shortly.'
      })
    }

    // Build conversation history for Gemini
    const contents = [
      ...history.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      {
        role: 'user',
        parts: [{ text: message }]
      }
    ]

    // Call Gemini API directly via fetch (no SDK needed)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents,
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7
          }
        })
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('Gemini error:', err)
      return NextResponse.json({
        response: 'Aurora Assistant is temporarily busy. Please try again.'
      })
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      return NextResponse.json({
        response: 'Sorry, I could not generate a response. Please try again.'
      })
    }

    return NextResponse.json({ response: text })

  } catch (error: any) {
    console.error('Chat route error:', error.message)
    return NextResponse.json({
      response: 'Aurora Assistant encountered an error. Please try again.'
    })
  }
}
