import { NextResponse } from 'next/server'
import axios from 'axios'
import moment from 'moment'

export const runtime = 'edge' // 可选：使用边缘运行时
export const revalidate = 3600 // 可选：设置重验证时间

interface WakaTimeResponse {
  data: Array<{
    range: {
      date: string
    }
    grand_total: {
      total_seconds: number
    }
  }>
}

export async function GET() {
  try {
    const apiKey = process.env.WAKATIME_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is not configured' }, 
        { status: 500 }
      )
    }

    const end = moment().format('YYYY-MM-DD')
    const start = moment().subtract(1, 'year').format('YYYY-MM-DD')

    const response = await axios.get<WakaTimeResponse>(
      'https://wakatime.com/api/v1/users/current/summaries',
      {
        params: {
          start,
          end,
        },
        headers: {
          'Authorization': `Basic ${Buffer.from(apiKey).toString('base64')}`
        }
      }
    )

    console.log(response)

    const formattedData = response.data.data.map(day => ({
      date: day.range.date,
      count: Math.ceil(day.grand_total.total_seconds / 3600) // 使用 Math.ceil 向上取整
    }))
    .filter(day => day.count > 0)

    return NextResponse.json(formattedData, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}