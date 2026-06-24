/**
 * 流式事件处理
 * 按 generation_id 过滤流式事件，累积实时文本
 */

export interface StreamHandler {
  generationId: string;
  onToken: (fullText: string) => void;
  onComplete: (fullText: string) => void;
  onStop: (partialText: string) => void;
  dispose: () => void;
}

/**
 * 创建流式处理器
 * 监听 TavernHelper 的 STREAM_TOKEN_RECEIVED_FULLY 事件
 */
export function createStreamHandler(
  generationId: string,
  onToken: (fullText: string) => void,
  onComplete: (fullText: string) => void,
  onStop: (partialText: string) => void,
): StreamHandler {
  let currentText = '';
  let disposed = false;

  const onStreamToken = (text: string) => {
    if (disposed) return;
    currentText = text;
    onToken(text);
  };

  const onGenerationEnded = (text: string) => {
    if (disposed) return;
    currentText = text;
    onComplete(text);
    dispose();
  };

  // 监听流式事件
  if (typeof eventSource !== 'undefined') {
    eventSource.on('STREAM_TOKEN_RECEIVED_FULLY', onStreamToken);
    eventSource.on('GENERATION_ENDED', onGenerationEnded);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (typeof eventSource !== 'undefined') {
      eventSource.removeListener('STREAM_TOKEN_RECEIVED_FULLY', onStreamToken);
      eventSource.removeListener('GENERATION_ENDED', onGenerationEnded);
    }
  }

  function stop() {
    if (disposed) return;
    window.TavernHelper.generate.stopGenerationById(generationId);
    onStop(currentText);
    dispose();
  }

  return {
    generationId,
    onToken,
    onComplete,
    onStop,
    dispose,
  };
}
