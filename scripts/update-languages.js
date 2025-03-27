import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URL for the LibreTranslate API
const url = 'http://127.0.0.1:6000/languages';

// Function to make the HTTP request
function fetchLanguages() {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Request failed with status code ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const languages = JSON.parse(data);
          resolve(languages);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });

    req.end();
  });
}

// Function to generate the languages.ts file
function generateLanguagesFile(languages) {
  let content = `export interface Language {
  code: string;
  name: string;
  targets: string[];
}

export const languages: Language[] = [\n`;

  languages.forEach((lang, index) => {
    content += `  { code: "${lang.code}", name: "${lang.name}", targets: ${JSON.stringify(lang.targets)} }`;
    if (index < languages.length - 1) {
      content += ',\n';
    } else {
      content += '\n';
    }
  });

  content += `];

export function getLanguageName(code: string): string {
  return languages.find(lang => lang.code === code)?.name || code;
}

export function isValidTargetLanguage(source: string, target: string): boolean {
  const sourceLanguage = languages.find(lang => lang.code === source);
  return sourceLanguage?.targets.includes(target) || false;
}

export function getAvailableTargetLanguages(sourceCode: string): Language[] {
  const sourceLanguage = languages.find(lang => lang.code === sourceCode);
  if (!sourceLanguage) return [];
  
  return sourceLanguage.targets
    .map(code => languages.find(lang => lang.code === code))
    .filter((lang): lang is Language => lang !== undefined);
} 
`;

  return content;
}

// Main function
async function main() {
  try {
    console.log('Fetching languages from LibreTranslate API...');
    const languages = await fetchLanguages();
    console.log(`Successfully fetched ${languages.length} languages`);

    const fileContent = generateLanguagesFile(languages);
    
    // Resolve the path relative to the current script
    const outputPath = path.resolve(__dirname, '../lib/languages.ts');
    fs.writeFileSync(outputPath, fileContent);
    console.log('Successfully updated lib/languages.ts');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 