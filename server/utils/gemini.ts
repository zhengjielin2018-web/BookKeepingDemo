// server/utils/gemini.ts
import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclarationsTool,
} from '@google/generative-ai'
import { logger } from './logger'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const tools: FunctionDeclarationsTool[] = [
  {
    functionDeclarations: [
      {
        name: 'addTransaction',
        description: '新增一筆收入或支出記錄',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            amount: { type: SchemaType.INTEGER, description: '金額（正整數）' },
            type: {
              type: SchemaType.STRING,
              format: 'enum',
              enum: ['收入', '支出'],
              description: '交易類型',
            },
            category: { type: SchemaType.STRING, description: '類別（例如：飲食、交通、娛樂）' },
            description: { type: SchemaType.STRING, description: '備註說明' },
            date: { type: SchemaType.STRING, description: '交易日期，格式 YYYY-MM-DD' },
          },
          required: ['amount', 'type', 'category', 'date'],
        },
      },
      {
        name: 'queryTransactions',
        description: '查詢交易記錄，可依日期範圍、類別、類型篩選，可分組統計',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            dateFrom: { type: SchemaType.STRING, description: '起始日期 YYYY-MM-DD' },
            dateTo: { type: SchemaType.STRING, description: '結束日期 YYYY-MM-DD' },
            category: {
              type: SchemaType.STRING,
              description: '篩選類別（可不填）',
              nullable: true,
            },
            type: {
              type: SchemaType.STRING,
              format: 'enum',
              enum: ['收入', '支出'],
              description: '篩選類型（可不填）',
              nullable: true,
            },
            groupBy: {
              type: SchemaType.STRING,
              format: 'enum',
              enum: ['category', 'date', 'type'],
              description: '分組欄位（可不填）',
              nullable: true,
            },
          },
          required: ['dateFrom', 'dateTo'],
        },
      },
      {
        name: 'updateTransaction',
        description: '修改一筆交易記錄',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            transactionId: { type: SchemaType.STRING, description: '交易 ID (UUID)' },
            updates: {
              type: SchemaType.OBJECT,
              properties: {
                amount: { type: SchemaType.INTEGER, description: '新金額' },
                type: {
                  type: SchemaType.STRING,
                  format: 'enum',
                  enum: ['收入', '支出'],
                },
                category: { type: SchemaType.STRING, description: '類別' },
                description: { type: SchemaType.STRING, description: '備註說明' },
                date: { type: SchemaType.STRING, description: 'YYYY-MM-DD' },
              },
            },
          },
          required: ['transactionId', 'updates'],
        },
      },
      {
        name: 'deleteTransaction',
        description: '刪除一筆交易記錄',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            transactionId: { type: SchemaType.STRING, description: '交易 ID (UUID)' },
          },
          required: ['transactionId'],
        },
      },
    ],
  },
]

function buildSystemPrompt(userName?: string): string {
  const now = new Date()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（星期${weekdays[now.getDay()]}）`

  const userGreeting = userName ? `使用者的名稱是「${userName}」，請在對話中以此名稱稱呼使用者。\n\n` : ''

  return `你是一個記帳助手，幫使用者記錄收支和查詢帳目。

${userGreeting}今天是 ${dateStr}。

## 建議類別
飲食、交通、娛樂、購物、居住、醫療、教育、收入、其他。
請盡量將使用者的花費歸類到上述類別。如果確實不屬於任何一個，可以產生新類別，但用簡短一致的詞彙。

## 規則
- 如果使用者沒有提到日期，預設為今天
- type（收入/支出）由語意判斷
- 金額必須為正整數
- 當使用者要求修改或刪除交易時，先用 queryTransactions 查出符合條件的交易，再用對應的 function
- 如果查詢到多筆符合的交易，列出讓使用者確認要操作哪一筆

## 查詢與圖表
- 查詢結果需要視覺化時，在你的文字回覆之外，額外輸出一個 JSON 區塊，格式如下：
\`\`\`chart
{"type":"pie","title":"標題","labels":["A","B"],"datasets":[{"data":[100,200]}]}
\`\`\`
- 支援的圖表類型：pie（圓餅圖）、bar（長條圖）、line（折線圖）
- 使用者指定圖表形式時照做，未指定時由你判斷最適合的

## 非記帳話題
簡短回覆並引導使用者回到記帳功能。`
}

export interface ChatResult {
  reply: string
  chart: {
    type: string
    title: string
    labels: string[]
    datasets: { data: number[] }[]
  } | null
  usage: { promptTokens: number; completionTokens: number }
}

export async function chat(
  userMessage: string,
  userId: string,
  executeFn: (name: string, args: Record<string, unknown>) => Promise<unknown>,
  userName?: string,
): Promise<ChatResult> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite-preview',
    systemInstruction: buildSystemPrompt(userName),
    tools,
  })

  const chatSession = model.startChat()

  logger.log('Gemini', 'Sending user message', { userMessage })

  let response = await chatSession.sendMessage(userMessage)
  let totalPromptTokens = 0
  let totalCompletionTokens = 0

  // Loop to handle multi-step function calling
  while (true) {
    const usage = response.response.usageMetadata
    if (usage) {
      totalPromptTokens += usage.promptTokenCount || 0
      totalCompletionTokens += usage.candidatesTokenCount || 0
    }

    const candidate = response.response.candidates?.[0]
    if (!candidate) break

    const functionCalls = candidate.content.parts.filter(p => p.functionCall)
    if (functionCalls.length === 0) break

    // Execute each function call
    const functionResults = []
    for (const part of functionCalls) {
      const { name, args } = part.functionCall!
      logger.log('Gemini', `Function call: ${name}`, args)

      const result = await executeFn(name, args as Record<string, unknown>)
      logger.log('DB', `Function result: ${name}`, result)

      functionResults.push({
        functionResponse: { name, response: { result } },
      })
    }

    // Send function results back to Gemini
    response = await chatSession.sendMessage(functionResults)
  }

  // Extract text reply and chart
  const textParts = response.response.candidates?.[0]?.content.parts
    .filter(p => p.text)
    .map(p => p.text!)
    .join('') || ''

  let chart: ChatResult['chart'] = null
  const chartMatch = textParts.match(/```chart\s*\n?([\s\S]*?)\n?```/)
  if (chartMatch && chartMatch[1]) {
    try {
      chart = JSON.parse(chartMatch[1])
    }
    catch {
      logger.log('Error', 'Failed to parse chart JSON', chartMatch[1])
    }
  }

  const reply = textParts.replace(/```chart\s*\n?[\s\S]*?\n?```/g, '').trim()

  logger.log('Gemini', 'Final reply', { reply, hasChart: !!chart })

  return {
    reply,
    chart,
    usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens },
  }
}
