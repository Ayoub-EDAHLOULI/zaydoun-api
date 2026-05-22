export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailOptions {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  template: string;
  context: Record<string, unknown>;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  path?: string;
  content?: Buffer | string;
  contentType?: string;
}
