export const getBaseUrl = (): string => {
  const { NODE_ENV, SERVER_URL, LOCAL_HOST, STAGING_URL } = process.env;

  if (NODE_ENV === "production" && SERVER_URL) {
      return SERVER_URL; // Production URL
  } 
  
  if (NODE_ENV === "staging" && STAGING_URL) {
      return STAGING_URL; // Staging URL (optional)
  }

  if (LOCAL_HOST) {
      return LOCAL_HOST; // Development URL
  }

  console.warn("⚠️ Warning: No valid base URL found. Using default localhost.");
  return "http://localhost:5000"; // Default fallback
};
