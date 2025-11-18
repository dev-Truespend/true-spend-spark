/**
 * Request/Response Logging Utility
 * Provides comprehensive logging for debugging and monitoring
 */

export interface LogContext {
  functionName: string;
  requestId: string;
  userId?: string;
  correlationId?: string;
}

export interface RequestLogData {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: string;
}

export interface ResponseLogData {
  status: number;
  headers: Record<string, string>;
  body?: any;
  duration: number;
  timestamp: string;
}

export class RequestLogger {
  private context: LogContext;
  private startTime: number;

  constructor(context: LogContext) {
    this.context = context;
    this.startTime = Date.now();
  }

  logRequest(req: Request, sanitizeBody = true) {
    const logData: RequestLogData = {
      method: req.method,
      url: req.url,
      headers: this.sanitizeHeaders(Object.fromEntries(req.headers.entries())),
      timestamp: new Date().toISOString(),
    };

    console.log(JSON.stringify({
      type: 'REQUEST',
      ...this.context,
      ...logData,
    }));
  }

  async logRequestWithBody(req: Request, sanitizeBody = true) {
    const body = req.method !== 'GET' ? await this.safeParseBody(req) : undefined;
    
    const logData: RequestLogData = {
      method: req.method,
      url: req.url,
      headers: this.sanitizeHeaders(Object.fromEntries(req.headers.entries())),
      body: sanitizeBody ? this.sanitizeBody(body) : body,
      timestamp: new Date().toISOString(),
    };

    console.log(JSON.stringify({
      type: 'REQUEST',
      ...this.context,
      ...logData,
    }));
  }

  logResponse(res: Response, body?: any, sanitizeBody = true) {
    const duration = Date.now() - this.startTime;
    
    const logData: ResponseLogData = {
      status: res.status,
      headers: this.sanitizeHeaders(Object.fromEntries(res.headers.entries())),
      body: sanitizeBody ? this.sanitizeBody(body) : body,
      duration,
      timestamp: new Date().toISOString(),
    };

    console.log(JSON.stringify({
      type: 'RESPONSE',
      ...this.context,
      ...logData,
    }));
  }

  logError(error: Error | unknown, additionalContext?: Record<string, any>) {
    const duration = Date.now() - this.startTime;
    
    console.error(JSON.stringify({
      type: 'ERROR',
      ...this.context,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ...additionalContext,
      },
      duration,
      timestamp: new Date().toISOString(),
    }));
  }

  logInfo(message: string, data?: Record<string, any>) {
    console.log(JSON.stringify({
      type: 'INFO',
      ...this.context,
      message,
      data,
      timestamp: new Date().toISOString(),
    }));
  }

  logWarning(message: string, data?: Record<string, any>) {
    console.warn(JSON.stringify({
      type: 'WARNING',
      ...this.context,
      message,
      data,
      timestamp: new Date().toISOString(),
    }));
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'apikey'];
    const sanitized: Record<string, string> = {};
    
    Object.entries(headers).forEach(([key, value]) => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sensitiveFields = [
      'password', 'token', 'secret', 'apiKey', 'api_key',
      'accessToken', 'refreshToken', 'authorization'
    ];
    
    if (typeof body === 'object') {
      const sanitized = Array.isArray(body) ? [...body] : { ...body };
      
      for (const key in sanitized) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = this.sanitizeBody(sanitized[key]);
        }
      }
      
      return sanitized;
    }
    
    return body;
  }

  private async safeParseBody(req: Request): Promise<any> {
    try {
      const clone = req.clone();
      const text = await clone.text();
      if (!text) return undefined;
      return JSON.parse(text);
    } catch {
      return '[Unable to parse body]';
    }
  }
}

export function createRequestLogger(
  functionName: string,
  req: Request,
  userId?: string
): RequestLogger {
  const requestId = crypto.randomUUID();
  const correlationId = req.headers.get('x-correlation-id') || requestId;
  
  return new RequestLogger({
    functionName,
    requestId,
    userId,
    correlationId,
  });
}
