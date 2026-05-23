export interface ImageAnalysis {
  description: string;
  suggestedColors: string[];
  orientation: "landscape" | "portrait" | "square";
}

export interface LayoutSuggestion {
  pageNumber: number;
  layoutType: "masonry" | "single" | "grid";
  objects: {
    url: string;
    left: number;
    top: number;
    width: number;
    height: number;
    angle: number;
  }[];
  backgroundColor: string;
}

export async function analyzeImages(imageUrls: string[]): Promise<LayoutSuggestion[]> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrls })
    });

    if (!response.ok) throw new Error("AI Request failed");
    return await response.json();
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return [];
  }
}
