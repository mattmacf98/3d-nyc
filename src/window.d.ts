export interface AILanguageModel {
    capabilities(): Promise<{
      available: boolean;
      defaultTemperature: number;
      defaultTopK: number;
      maxTopK: number;
    }>;
    create(): Promise<AISession>;
  }
  
  export interface AISession {
    prompt(text: string): Promise<string>;
  }
  
  export interface AI {
    languageModel: AILanguageModel;
  }

  declare global {
    interface Window {
      ai?: AI;
    }
  }
  
  export {};