import { applyToolCall } from './apply.js'
import { streamRound } from './client.js'
import { buildUserMessage, systemPrompt, trimContext } from './prompt.js'
import { TOOLS } from './tools.js'

function parseArgs(raw) {
  if (!raw) return {}
  const value = JSON.parse(raw)
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Аргументы инструмента должны быть объектом JSON')
  }
  return value
}

function assistantMessage(content, toolCalls) {
  const message = { role: 'assistant', content: content || null }
  if (toolCalls.length) {
    message.tool_calls = toolCalls.map((tool) => ({
      id: tool.id,
      type: 'function',
      function: { name: tool.name, arguments: tool.arguments || '{}' },
    }))
  }
  return message
}

export async function runAgent({ editor, task, history, contextFiles, onEvent, signal }) {
  if (!editor || editor.isDestroyed) throw new Error('Нет открытого документа')
  const contextDocs = trimContext(contextFiles)
  const messages = [
    { role: 'system', content: systemPrompt() },
    ...history,
    { role: 'user', content: buildUserMessage({ editor, task, contextDocs }) },
  ]
  while (true) {
    if (signal?.aborted) throw new DOMException('Остановлено', 'AbortError')
    const queue = []
    let chain = Promise.resolve()
    let round
    try {
      round = await streamRound(
        { messages, tools: TOOLS },
        {
          signal,
          onText: (chunk) => onEvent({ type: 'text', chunk }),
          onTool: (tool) => {
            chain = chain.then(async () => {
              if (signal?.aborted) return
              let args = {}
              try {
                args = parseArgs(tool.arguments)
              } catch (error) {
                const result = { ok: false, error: error.message }
                onEvent({ type: 'tool', id: tool.id, name: tool.name, args, result })
                queue.push({ tool, result })
                return
              }
              onEvent({ type: 'tool-start', id: tool.id, name: tool.name, args })
              const result = await applyToolCall(editor, tool.name, args)
              onEvent({ type: 'tool', id: tool.id, name: tool.name, args, result })
              queue.push({ tool, result })
            })
          },
        },
      )
    } finally {
      await chain
    }
    if (signal?.aborted) throw new DOMException('Остановлено', 'AbortError')

    const calls = round.message?.tool_calls || []
    messages.push(round.message || assistantMessage(round.content, round.toolCalls))
    if (!calls.length) return
    for (const call of calls) {
      const done = queue.find((item) => item.tool.id === call.id)
      const result = done?.result || { ok: false, error: 'Инструмент не выполнился' }
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
    }
    onEvent({ type: 'break' })
  }
}
