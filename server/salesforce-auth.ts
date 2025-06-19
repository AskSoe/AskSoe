// server/salesforce-auth.ts
import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/oauth/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) return res.status(400).send("Missing code");

  try {
    const response = await axios.post(
      "https://login.salesforce.com/services/oauth2/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        client_id:
          "3MVG9dAEux2v1sLt4OK3rsBoQQKInBO20kFbyOsX1zXZUjGcva5gSqjN.bH3_zBFCxvnkawK_DkS82p95rPG5",
        client_secret:
          "529C61387B532558BC62613AAFF010BEBB8CAA531AEC4D8D9C9BD49BACB75D0A",
        redirect_uri:
          "https://34e57819-84c7-4488-a6b2-9d0b6c674b0f-00-3pm5cjl6msngi.picard.replit.dev/oauth/callback",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    const { access_token, refresh_token, instance_url } = response.data;

    console.log("✅ Salesforce Access Token:", access_token);
    console.log("🌐 Instance URL:", instance_url);

    // TODO: Store securely in your user session or DB
    res.send("✅ Salesforce connected! You can close this tab.");
  } catch (err: any) {
    console.error("OAuth error:", err?.response?.data || err);
    res.status(500).send("OAuth failed.");
  }
});

export default router;
