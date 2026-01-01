import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail() {
  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: "sam.barrowclough@gmail.com",
    subject: "Hello from ClearAudio",
    html: "<p>This is a test email sent using Resend.</p>",
  });

  if (error) {
    console.error("Failed to send email:", error);
    process.exit(1);
  }

  console.log("Email sent successfully!", data);
}

sendEmail();

