import { emailService } from "../../services/email/email.service";

export const contactService = {
  async submit(data: {
    name: string;
    email: string;
    topic: string;
    message: string;
  }): Promise<void> {
    void emailService.sendContactFormEmail({
      name: data.name,
      email: data.email,
      subject: data.topic,
      message: data.message,
    });
  },
};
