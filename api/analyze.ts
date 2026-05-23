import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrls } = req.body;

  if (!imageUrls || !Array.isArray(imageUrls)) {
    return res.status(400).json({ error: 'imageUrls array is required' });
  }

  const prompt = `Analyze these engagement photobook assets and suggest a multi-page chronological layout. 
  Cluster complementary photos into beautiful masonry grids.
  For each page, provide:
  1. A background color that complements the images.
  2. The relative positioning (left, top, width, height as percentages 0-100) for each image on a standard 8.5x11 page.
  Return the result as a list of layouts.`;

  try {
    const generativeModel = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await generativeModel.generateContent([
      prompt,
      ...imageUrls.map(url => `Image URL: ${url}`)
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Clean up JSON if model returns markdown
    const cleanedText = text.replace(/```json|```/g, '').trim();
    
    res.status(200).json(JSON.parse(cleanedText));
  } catch (error) {
    console.error("AI Analysis failed:", error);
    res.status(500).json({ error: 'AI Analysis failed' });
  }
}
