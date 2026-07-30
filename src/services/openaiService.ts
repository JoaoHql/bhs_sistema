import type { AppModule, CalculatedField } from '../types';
import { getModulePresentationValidationErrors } from '../config/widgetPresentation';
import { apiClient } from './apiClient';

export function validateGeneratedModule(parsedModule: AppModule): AppModule {
  if (!parsedModule.id || !parsedModule.label || !Array.isArray(parsedModule.screens)) {
    throw new Error('GPT response is missing key AppModule properties.');
  }

  const presentationErrors = getModulePresentationValidationErrors(parsedModule);
  if (presentationErrors.length > 0) {
    throw new Error(`GPT response has invalid presentation: ${presentationErrors.join(' ')}`);
  }

  return parsedModule;
}

export async function generateModuleWithOpenAI(userPrompt: string, calculatedFields: CalculatedField[]): Promise<AppModule> {
  const response = await apiClient.post<
    { prompt: string; calculatedFields: CalculatedField[] },
    { module: AppModule }
  >('/api/v1/ai/generate-module', { prompt: userPrompt, calculatedFields });
  return validateGeneratedModule(response.module);
}
