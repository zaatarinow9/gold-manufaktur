import { z } from "zod";

export const contactInquirySchema = z.object({
  name: z.string().trim().min(2, { message: "name" }).max(80, {
    message: "name",
  }),
  email: z.string().trim().email({ message: "email" }).max(160, {
    message: "email",
  }),
  phone: z.string().trim().min(6, { message: "phone" }).max(40, {
    message: "phone",
  }),
  message: z.string().trim().min(10, { message: "message" }).max(1500, {
    message: "message",
  }),
});

export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;

export const contactInquiryDefaults: ContactInquiryInput = {
  name: "",
  email: "",
  phone: "",
  message: "",
};
