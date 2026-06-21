/**
 * SSE（text/event-stream）の ReadableStream を読み、フレームごとに { event, data } を yield する。
 *
 * POST + `responseType: 'stream'`（ofetch）で受け取ったストリームを逐次パースする用途。
 * data は 1 行 JSON 文字列前提（呼び出し側で JSON.parse する）。`event:` 省略時は 'message'。
 * TextDecoderStream に依存せず TextDecoder で逐次デコードする（環境依存を避ける）。
 */
export type SseFrame = { event: string, data: string }

/** 1 フレーム（空行区切りの塊）を { event, data } に解析する。data 行が無ければ null。 */
const parseFrame = (frame: string): SseFrame | null => {
  let event = 'message'
  const dataLines: string[] = []
  for (const raw of frame.split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }
  if (dataLines.length === 0) return null
  return { event, data: dataLines.join('\n') }
}

export async function* readSseStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<SseFrame> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const boundary = /\r?\n\r?\n/
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let match: RegExpExecArray | null
      while ((match = boundary.exec(buffer)) !== null) {
        const frame = buffer.slice(0, match.index)
        buffer = buffer.slice(match.index + match[0].length)
        const parsed = parseFrame(frame)
        if (parsed) yield parsed
      }
    }
    // 末尾に区切りの無いフレームが残っていれば処理する
    buffer += decoder.decode()
    const tail = parseFrame(buffer)
    if (tail) yield tail
  } finally {
    reader.releaseLock()
  }
}
