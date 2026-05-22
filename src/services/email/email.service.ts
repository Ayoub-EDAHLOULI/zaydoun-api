import nodemailer, { Transporter } from "nodemailer";
import ejs from "ejs";
import path from "path";
import fs from "fs/promises";
import { EmailConfig, EmailOptions } from "./email.types";

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig;

  constructor() {
    this.config = {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
      from: {
        name: process.env.SMTP_FROM_NAME || "Zaydoun",
        email: process.env.SMTP_FROM_EMAIL || "noreply@zaydoun.ai",
      },
    };

    this.initialize();
  }

  private async initialize() {
    try {
      if (!this.config.auth.user || !this.config.auth.pass) return;

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        tls: { rejectUnauthorized: false },
      });

      await this.transporter.verify();
    } catch {
      // SMTP not configured — emails will be skipped
    }
  }

  private async renderTemplate(
    templateName: string,
    context: Record<string, unknown>,
  ): Promise<string> {
    const templatePath = path.join(
      process.cwd(),
      "src",
      "services",
      "email",
      "templates",
      `${templateName}.ejs`,
    );

    try {
      const template = await fs.readFile(templatePath, "utf-8");
      return ejs.render(template, context);
    } catch {
      throw new Error(`Template rendering failed: ${templateName}`);
    }
  }

  private async send(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.warn(
        `[EMAIL] SMTP not configured — skipping: template="${options.template}"`,
      );
      return false;
    }

    try {
      const html = await this.renderTemplate(options.template, options.context);

      await this.transporter.sendMail({
        from: `"${this.config.from.name}" <${this.config.from.email}>`,
        to: Array.isArray(options.to)
          ? options.to.map((r) => r.email).join(", ")
          : options.to.email,
        subject: options.subject,
        html,
      });

      return true;
    } catch (error) {
      console.error(
        `[EMAIL] Failed to send (template="${options.template}"):`,
        error,
      );
      return false;
    }
  }

  // ── Welcome ──────────────────────────────────────────────────────────────

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    return this.send({
      to: { email, name },
      subject: "Welcome to Zaydoun",
      template: "welcome",
      context: {
        NAME: name.split(" ")[0],
        APP_URL: process.env.FRONTEND_URL || "https://zaydoun.ai",
        YEAR: new Date().getFullYear(),
      },
    });
  }

  // ── Password reset ────────────────────────────────────────────────────────

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    return this.send({
      to: { email },
      subject: "Reset your Zaydoun password",
      template: "reset-password",
      context: {
        RESET_URL: resetUrl,
        APP_URL: process.env.FRONTEND_URL || "https://zaydoun.ai",
        YEAR: new Date().getFullYear(),
      },
    });
  }

  // ── Contact / support message (admin notification) ────────────────────────

  async sendContactFormEmail(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<boolean> {
    const notificationEmail =
      process.env.NOTIFICATION_EMAIL || this.config.from.email;

    const receivedAt = new Date().toLocaleString("en-US", {
      timeZone: "UTC",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return this.send({
      to: { email: notificationEmail },
      subject: `[Support] ${data.subject} — ${data.name}`,
      template: "contact-form",
      context: {
        SENDER_NAME: data.name,
        SENDER_EMAIL: data.email,
        SUBJECT: data.subject,
        MESSAGE: data.message,
        RECEIVED_AT: receivedAt,
        APP_URL: process.env.FRONTEND_URL || "https://zaydoun.ai",
        YEAR: new Date().getFullYear(),
      },
    });
  }

  // ── Health check ──────────────────────────────────────────────────────────

  async testConnection(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

export const emailService = new EmailService();
