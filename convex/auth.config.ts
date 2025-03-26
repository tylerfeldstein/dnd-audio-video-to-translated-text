export default {
  providers: [
    {
      // From Clerk JWT setup
      // Create a JWT Template
      // In the JWT Templates section of the Clerk dashboard tap on + New template and choose Convex

      // Copy the Issuer URL from the Issuer input field.

      // Hit Apply Changes.

      // Note: Do NOT rename the JWT token, it must be called
      domain: "https://famous-civet-61.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
