export interface Language {
  code: string;
  name: string;
  targets: string[];
}

export const languages: Language[] = [
  { code: "en", name: "English", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "sq", name: "Albanian", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "ar", name: "Arabic", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "az", name: "Azerbaijani", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "eu", name: "Basque", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "bn", name: "Bengali", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "bg", name: "Bulgarian", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "ca", name: "Catalan", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "zh", name: "Chinese", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "zt", name: "Chinese (traditional)", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "cs", name: "Czech", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "da", name: "Danish", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "nl", name: "Dutch", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "eo", name: "Esperanto", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "et", name: "Estonian", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "fi", name: "Finnish", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "fr", name: "French", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "gl", name: "Galician", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "de", name: "German", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "el", name: "Greek", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "he", name: "Hebrew", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "hi", name: "Hindi", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "hu", name: "Hungarian", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "id", name: "Indonesian", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "ga", name: "Irish", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "it", name: "Italian", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "ja", name: "Japanese", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "ko", name: "Korean", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "lv", name: "Latvian", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "lt", name: "Lithuanian", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "ms", name: "Malay", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "nb", name: "Norwegian", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "fa", name: "Persian", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "pl", name: "Polish", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "pt", name: "Portuguese", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "ro", name: "Romanian", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "ru", name: "Russian", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "sk", name: "Slovak", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "sl", name: "Slovenian", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "es", name: "Spanish", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "sv", name: "Swedish", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "tl", name: "Tagalog", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "th", name: "Thai", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "tr", name: "Turkish", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "uk", name: "Ukrainian", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] },
  { code: "ur", name: "Urdu", targets: ["ar","az","bg","bn","ca","cs","da","de","el","en","eo","es","et","eu","fa","fi","fr","ga","gl","he","hi","hu","id","it","ja","ko","lt","lv","ms","nb","nl","pl","pt","ro","ru","sk","sl","sq","sv","th","tl","tr","uk","ur","zh","zt"] }
];

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
