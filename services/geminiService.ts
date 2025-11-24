import { GoogleGenAI } from "@google/genai";

export const generateTestCases = async (description: string): Promise<string> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found for Gemini");
    return "- [ ] (Mock) Verify happy path\n- [ ] (Mock) Verify error state\n- [ ] (Mock) Check edge cases";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Given the following software issue description, generate a concise checklist of QA test cases in Markdown format (checkboxes). 
      
      Description: ${description}`,
    });
    return response.text || "No test cases generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating test cases. Please try again.";
  }
};
