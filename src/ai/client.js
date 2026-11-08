export function streamRound(payload, { onText, onTool, signal }) {
  if (!window.ai) return Promise.reject(new Error('Ассистент доступен в окне приложения'))
  return new Promise((resolve, reject) => {
    let requestId = null
    let stop = () => {}
    let settled = false
    const toolCalls = []
    let content = ''

    function cleanup() {
      stop()
      signal?.removeEventListener('abort', abort)
    }

    function finish(error, message) {
      if (settled) return
      settled = true
      cleanup()
      if (error) reject(error)
      else resolve({ content, toolCalls, message })
    }

    function abort() {
      if (requestId) window.ai.abort(requestId)
      finish(new DOMException('Остановлено', 'AbortError'))
    }

    if (signal?.aborted) {
      finish(new DOMException('Остановлено', 'AbortError'))
      return
    }
    signal?.addEventListener('abort', abort)

    window.ai.start(payload).then((started) => {
      if (settled) {
        if (started?.requestId) window.ai.abort(started.requestId)
        return
      }
      if (!started || started.error) {
        finish(new Error(started?.error || 'Не удалось обратиться к модели'))
        return
      }
      requestId = started.requestId
      if (signal?.aborted) {
        abort()
        return
      }
      stop = window.ai.onEvent((event) => {
        if (!event || event.requestId !== requestId || settled) return
        if (event.type === 'text' && event.content) {
          content += event.content
          onText?.(event.content)
        } else if (event.type === 'tool' && event.tool) {
          toolCalls.push(event.tool)
          onTool?.(event.tool)
        } else if (event.type === 'done') {
          finish(null, event.message)
        } else if (event.type === 'error') {
          finish(new Error(event.message || 'Ошибка модели'))
        }
      })
    }).catch((error) => finish(error))
  })
}
