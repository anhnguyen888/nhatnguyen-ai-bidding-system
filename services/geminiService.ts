/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { RagStore, Document, QueryResult, CustomMetadata, UploadedFile } from '../types';

let ai: GoogleGenAI;

export function initialize() {
    ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
}

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createRagStore(displayName: string): Promise<string> {
    if (!ai) throw new Error("Gemini AI not initialized");
    const ragStore = await ai.fileSearchStores.create({ config: { displayName } });
    if (!ragStore.name) {
        throw new Error("Failed to create RAG store: name is missing.");
    }
    return ragStore.name;
}

export async function uploadToRagStore(ragStoreName: string, file: File): Promise<void> {
    if (!ai) throw new Error("Gemini AI not initialized");
    
    let op = await ai.fileSearchStores.uploadToFileSearchStore({
        fileSearchStoreName: ragStoreName,
        file: file
    });

    while (!op.done) {
        await delay(3000);
        op = await ai.operations.get({operation: op});
    }
}

export async function fileSearch(ragStoreName: string, query: string): Promise<QueryResult> {
    if (!ai) throw new Error("Gemini AI not initialized");
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query + "DO NOT ASK THE USER TO READ THE MANUAL, pinpoint the relevant sections in the response itself. ALWAYS ANSWER IN VIETNAMESE.",
        config: {
            tools: [
                    {
                        fileSearch: {
                            fileSearchStoreNames: [ragStoreName],
                        }
                    }
                ]
        }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return {
        text: response.text,
        groundingChunks: groundingChunks,
    };
}

export async function generateExampleQuestions(ragStoreName: string): Promise<string[]> {
    if (!ai) throw new Error("Gemini AI not initialized");
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "You are provided some user manuals for some products. Figure out for what product each manual is for, based on the cover page contents. DO NOT GUESS OR HALLUCINATE THE PRODUCT. Then, for each product, generate 4 short and practical example questions a user might ask about it in Vietnamese. Return the questions as a JSON array of objects. Each object should have a 'product' key with the product name as a string, and a 'questions' key with an array of 4 question strings. For example: ```json[{\"product\": \"Product A\", \"questions\": [\"q1\", \"q2\"]}, {\"product\": \"Product B\", \"questions\": [\"q3\", \"q4\"]}]```",
            config: {
                tools: [
                    {
                        fileSearch: {
                            fileSearchStoreNames: [ragStoreName],
                        }
                    }
                ]
            }
        });
        
        let jsonText = response.text.trim();

        const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonText = jsonMatch[1];
        } else {
            const firstBracket = jsonText.indexOf('[');
            const lastBracket = jsonText.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                jsonText = jsonText.substring(firstBracket, lastBracket + 1);
            }
        }
        
        const parsedData = JSON.parse(jsonText);
        
        if (Array.isArray(parsedData)) {
            if (parsedData.length === 0) {
                return [];
            }
            const firstItem = parsedData[0];

            // Handle new format: array of {product, questions[]}
            if (typeof firstItem === 'object' && firstItem !== null && 'questions' in firstItem && Array.isArray(firstItem.questions)) {
                return parsedData.flatMap(item => (item.questions || [])).filter(q => typeof q === 'string');
            }
            
            // Handle old format: array of strings
            if (typeof firstItem === 'string') {
                return parsedData.filter(q => typeof q === 'string');
            }
        }
        
        console.warn("Received unexpected format for example questions:", parsedData);
        return [];
    } catch (error) {
        console.error("Failed to generate or parse example questions:", error);
        return [];
    }
}


export async function deleteRagStore(ragStoreName: string): Promise<void> {
    if (!ai) throw new Error("Gemini AI not initialized");
    // DO: Remove `(as any)` type assertion.
    await ai.fileSearchStores.delete({
        name: ragStoreName,
        config: { force: true },
    });
}

export async function listFiles(ragStoreName: string): Promise<UploadedFile[]> {
    if (!ai) throw new Error("Gemini AI not initialized");
    
    // Note: The Google GenAI SDK's list method might list all files. 
    // We might need to filter, but the current SDK structure for `files.list` 
    // doesn't always support filtering by store directly in the list call depending on the version.
    // However, for this demo, we will list all files and if possible filter them.
    // Actually, `ai.files.list()` lists all files uploaded to the project.
    // There isn't a direct "list files in this store" method exposed easily in all SDK versions 
    // without iterating. 
    // BUT, `ai.fileSearchStores.get` might return the files or we might have to just list all files.
    // Let's try to list all files and return them. 
    // Ideally we should filter by the ones that are actually IN the store, but the link is via `ai.operations` usually.
    // Wait, `ai.files.list()` is the standard way. 
    
    const response = await ai.files.list({
        config: { pageSize: 100 }
    });
    
    const files: UploadedFile[] = [];
    for await (const f of response) {
        files.push({
            name: f.name || '',
            displayName: f.displayName || '',
            uri: f.uri || '',
            mimeType: f.mimeType || '',
            sizeBytes: f.sizeBytes || '0',
            createTime: f.createTime || ''
        });
    }
    return files;
}