/**
 * Server-Sent Events streaming for render progress.
 * The playground POSTs to /render/stream, which returns an SSE stream
 * with progress events, then the final result.
 */

export type RenderStage =
  | 'parsing'
  | 'resolving'
  | 'installing'
  | 'building'
  | 'tailwind'
  | 'rendering-html'
  | 'rendering-pdf'
  | 'uploading'
  | 'done'
  | 'error';

export interface ProgressEvent {
  stage: RenderStage;
  message: string;
  elapsed?: number;
}

export class RenderProgress {
  private controller: ReadableStreamDefaultController<string> | null = null;
  private startTime = Date.now();

  static create(): { progress: RenderProgress; stream: ReadableStream<Uint8Array> } {
    let ctrl!: ReadableStreamDefaultController<string>;
    const textStream = new ReadableStream<string>({
      start(controller) {
        ctrl = controller;
      },
    });

    const progress = new RenderProgress();
    progress.controller = ctrl;

    const encoder = new TextEncoder();
    const byteStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = textStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(encoder.encode(value));
          }
          controller.close();
        } catch {
          controller.close();
        }
      },
    });

    return { progress, stream: byteStream };
  }

  emit(stage: RenderStage, message: string): void {
    if (!this.controller) return;
    const event: ProgressEvent = {
      stage,
      message,
      elapsed: Date.now() - this.startTime,
    };
    try {
      this.controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      // stream closed
    }
  }

  emitResult(contentType: string, data: string): void {
    if (!this.controller) return;
    try {
      this.controller.enqueue(
        `event: result\ndata: ${JSON.stringify({ contentType, data })}\n\n`,
      );
    } catch {}
  }

  emitError(message: string): void {
    if (!this.controller) return;
    try {
      this.controller.enqueue(
        `event: error\ndata: ${JSON.stringify({ message })}\n\n`,
      );
    } catch {}
  }

  close(): void {
    try {
      this.controller?.close();
    } catch {}
    this.controller = null;
  }
}
