import { env } from '../../config/env';
import { logger } from '../../config/logger';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: string }>;
  idempotencyKey?: string;
}

export interface IEmailProvider {
  sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId: string }>;
}

export class MockEmailProvider implements IEmailProvider {
  public sentEmails: Array<SendEmailOptions & { messageId: string; timestamp: string }> = [];

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId: string }> {
    const messageId = `mock-msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const record = {
      ...options,
      messageId,
      timestamp: new Date().toISOString()
    };
    this.sentEmails.push(record);
    logger.info({ to: options.to, subject: options.subject, messageId }, '📧 [MOCK EMAIL] Email dispatched in dev mode');
    return { success: true, messageId };
  }
}

export class ResendEmailProvider implements IEmailProvider {
  private apiKey: string;
  private from: string;

  constructor(apiKey: string, from: string) {
    this.apiKey = apiKey;
    this.from = from;
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId: string }> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {})
        },
        body: JSON.stringify({
          from: this.from,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          attachments: options.attachments
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as { id: string };
      return { success: true, messageId: data.id };
    } catch (err: any) {
      logger.error({ err, to: options.to, subject: options.subject }, 'Failed to dispatch email via Resend');
      throw err;
    }
  }
}

export const emailService: IEmailProvider = env.EMAIL_PROVIDER === 'resend'
  ? new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM)
  : new MockEmailProvider();
