import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import * as schema from "./db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: false,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        // Call our API endpoint to send the OTP email
        const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
        const internalSecret = process.env.BETTER_AUTH_SECRET;

        if (!internalSecret) {
          throw new Error("BETTER_AUTH_SECRET not configured");
        }

        const response = await fetch(`${baseUrl}/api/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": internalSecret,
          },
          body: JSON.stringify({ 
            email, 
            otp,
            type: "otp"
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to send OTP email");
        }
      },
      otpLength: 6,
      expiresIn: 600, // 10 minutes
    }),
    nextCookies(), // Must be last plugin
  ],
});
