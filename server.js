const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_BUCKET
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Middleware to verify Firebase token for premium content
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return next(); // allow free content
  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Get chapters for dropdowns
app.get("/api/chapters", async (req, res) => {
  const { board, cls, subject } = req.query;
  const snap = await db.collection("chapters")
   .where("board", "==", board)
   .where("class", "==", parseInt(cls))
   .where("subject", "==", subject)
   .get();
  res.json({ success: true, data: snap.docs.map(d => d.data().name) });
});

// Get resources with filters
app.get("/api/resources", async (req, res) => {
  const { board, cls, subject, chapter, type } = req.query;
  let query = db.collection("resources");

  if (board) query = query.where("board", "==", board);
  if (cls) query = query.where("class", "==", parseInt(cls));
  if (subject) query = query.where("subject", "==", subject);
  if (chapter) query = query.where("chapter", "==", chapter);
  if (type) query = query.where("type", "==", type);

  const snap = await query.limit(50).get();
  res.json({ success: true, data: snap.docs.map(d => ({ id: d.id,...d.data() })) });
});

// Search resources
app.get("/api/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ success: true, data: [] });

  const snap = await db.collection("resources")
   .where("keywords", "array-contains", q.toLowerCase())
   .limit(20)
   .get();
  res.json({ success: true, data: snap.docs.map(d => d.data()) });
});

// Get PDF download link
app.get("/api/download/*", verifyToken, async (req, res) => {
  try {
    const filePath = req.params[0];
    const file = bucket.file(filePath);

    // Check if file is premium
    const [meta] = await file.getMetadata();
    const isPremium = meta.metadata?.isPremium === "true";

    if (isPremium &&!req.user) {
      return res.status(401).json({ error: "Login required for premium content" });
    }

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000
    });
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));