const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

function absorb(acc, delta) {
  if (!delta) return
  if (typeof delta.content === 'string') acc.content += delta.content
  for (const call of delta.tool_calls || []) {
    const index = call.index ?? 0
    const tool = acc.tools[index] || { index, id: '', name: '', arguments: '' }
    if (call.id) tool.id += call.id
    if (call.function?.name) tool.name += call.function.name
    if (call.function?.arguments) tool.arguments += call.function.arguments
    acc.tools[index] = tool
  }
}

function readyTools(acc, end) {
  const ready = []
  while (acc.next < end) {
    const tool = acc.tools[acc.next]
    if (!tool?.name || !tool.id) break
    try {
      JSON.parse(tool.arguments || '{}')
    } catch {
      break
    }
    ready.push({ id: tool.id, name: tool.name, arguments: tool.arguments || '{}' })
    acc.next += 1
  }
  return ready
}

function latestStarted(acc) {
  let latest = acc.next
  for (let index = acc.next; index < acc.tools.length; index += 1) {
    if (acc.tools[index]?.name) latest = index
  }
  return latest
}

function assistantMessage(acc) {
  const tools = acc.tools.filter(Boolean)
  const message = { role: 'assistant', content: acc.content || null }
  if (tools.length) {
    message.tool_calls = tools.map((tool, index) => ({
      id: tool.id || `call_${index}`,
      type: 'function',
      function: { name: tool.name, arguments: tool.arguments || '{}' },
    }))
  }
  return message
}

function handleChunk(json, acc, send) {
  if (json?.error?.message) throw new Error(json.error.message)
  const choice = json?.choices?.[0]
  if (!choice) return
  absorb(acc, choice.delta)
  if (typeof choice.delta?.content === 'string' && choice.delta.content) {
    send({ type: 'text', content: choice.delta.content })
  }
  // The tool that just started is still streaming. Earlier ones are complete.
  const end = choice.finish_reason ? acc.tools.length : latestStarted(acc)
  for (const tool of readyTools(acc, end)) send({ type: 'tool', tool })
}

export async function streamChat({ apiKey, model, messages, tools, signal, send }) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://local.new-vision',
      'X-Title': 'New Vision',
    },
    body: JSON.stringify({ model, messages, tools, stream: true }),
  })
  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      detail = body?.error?.message || ''
    } catch {
      detail = ''
    }
    throw new Error(detail || `OpenRouter ответил ${response.status}`)
  }
  if (!response.body) throw new Error('Пустой ответ модели')

  const acc = { content: '', tools: [], next: 0 }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split(/\n/)
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (!data || data === '[DONE]') continue
        handleChunk(JSON.parse(data), acc, send)
      }
    }
  } finally {
    reader.releaseLock()
  }

  for (const tool of acc.tools) {
    if (tool && !tool.id) tool.id = `call_${tool.index}`
  }
  for (const tool of readyTools(acc, acc.tools.length)) send({ type: 'tool', tool })
  const pending = acc.tools.filter(Boolean).length
  if (acc.next < pending) throw new Error('Модель прислала неполный вызов инструмента')
  send({ type: 'done', message: assistantMessage(acc) })
}
