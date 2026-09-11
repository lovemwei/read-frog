import type { TestSeriesObject } from "./types"

export const testSeries: TestSeriesObject = {
  "complex-config-from-v020": {
    description: "Adds opacity to selection toolbar",
    config: {
      translationHub: {
        shortcut: "Alt+Shift+H",
      },
      siteRules: {
        userRules: [],
        disabledBuiltInRules: [],
      },
      language: {
        sourceCode: "spa",
        targetCode: "eng",
        level: "advanced",
      },
      providersConfig: [
        {
          id: "jalapenocloud-default",
          name: "Jalapeno Cloud",
          enabled: true,
          provider: "jalapenocloud",
          description: "Enterprise-grade AI used by top teams — now made for you!",
          baseURL: "https://api.jalapeno-cloud.ai/v1",
          model: {
            model: "DeepSeek-V4-Flash",
            isCustomModel: false,
            customModel: null,
          },
          providerOptions: {
            chat_template_kwargs: {
              thinking: false,
            },
          },
        },
        {
          id: "openai-default",
          enabled: true,
          name: "OpenAI",
          provider: "openai",
          description: "Provides models like GPT-4o",
          reasoning: "none",
          apiKey: "sk-custom-prompt-key",
          baseURL: "https://api.openai.com/v1",
          model: {
            model: "gpt-4o-mini",
            isCustomModel: true,
            customModel: "translate-gpt-custom",
          },
        },
        {
          id: "deepseek-default",
          enabled: true,
          name: "DeepSeek",
          provider: "deepseek",
          description: "Recommend to use in China",
          reasoning: "none",
          apiKey: "ds-custom",
          baseURL: "https://api.custom.com/v1",
          model: {
            model: "deepseek-chat",
            isCustomModel: false,
            customModel: "",
          },
        },
        {
          id: "google-default",
          enabled: true,
          name: "Gemini",
          provider: "google",
          description: "Google's flagship AI models with advanced reasoning capabilities",
          reasoning: "none",
          model: {
            model: "gemini-2.5-pro",
            isCustomModel: false,
            customModel: "",
          },
        },
        {
          id: "deeplx-default",
          enabled: true,
          name: "DeepLX",
          provider: "deeplx",
          description: "Unofficial DeepL API",
          baseURL: "https://deeplx.vercel.app/translate",
        },
      ],
      pageTranslation: {
        providerId: "openai-default",
        mode: "translationOnly",
        modeShortcut: "Alt+Shift+M",
        enableAIContentAware: false,
        node: {
          enabled: true,
          hotkey: "alt",
          forceRetranslation: false,
        },
        page: {
          range: "all",
          autoTranslatePatterns: ["spanish-news.com", "elmundo.es"],
          neverAutoTranslatePatterns: [],
          autoTranslateLanguages: [],
          shortcut: "Alt+B",
          preload: {
            margin: 1000,
            threshold: 0,
          },
          minCharactersPerNode: 0,
          minWordsPerNode: 0,
          enableTargetLanguageSkip: true,
          skipLanguages: [],
        },
        customPromptsConfig: {
          promptId: "123e4567-e89b-12d3-a456-426614174000",
          patterns: [
            {
              id: "123e4567-e89b-12d3-a456-426614174000",
              name: "Technical Translation",
              systemPrompt: "",
              prompt:
                "Technical translation from Spanish to {{targetLanguage}}. Preserve technical terms and accuracy:\n{{input}}",
            },
          ],
        },
        requestQueueConfig: {
          capacity: 400,
          rate: 8,
        },
        batchQueueConfig: {
          maxCharactersPerBatch: 1000,
          maxItemsPerBatch: 4,
        },
        translationNodeStyle: {
          preset: "blur",
          isCustom: false,
          customCSS: null,
        },
      },
      floatingButton: {
        enabled: true,
        position: 0.75,
        disabledFloatingButtonPatterns: ["github.com"],
        clickAction: "panel",
        locked: false,
        side: "right",
      },
      sideContent: {
        width: 700,
      },
      selectionToolbar: {
        enabled: false,
        disabledSelectionToolbarPatterns: [],
        opacity: 100,
        customActions: [],
        features: {
          translate: {
            enabled: true,
            providerId: "openai-default",
            shortcut: "Alt+T",
          },
        },
        builtInActions: {
          dictionary: {
            enabled: true,
            providerId: "deepseek-default",
          },
        },
      },
      betaExperience: {
        enabled: false,
      },
      contextMenu: {
        enabled: true,
      },
      videoSubtitles: {
        enabled: false,
        autoStart: false,
        providerId: "openai-default",
        style: {
          displayMode: "bilingual",
          translationPosition: "above",
          main: {
            fontFamily: "system",
            fontScale: 100,
            color: "#FFFFFF",
            fontWeight: 400,
          },
          translation: {
            fontFamily: "system",
            fontScale: 100,
            color: "#FFFFFF",
            fontWeight: 400,
          },
          container: {
            backgroundOpacity: 75,
          },
          customCSS: null,
        },
        aiSegmentation: false,
        requestQueueConfig: {
          capacity: 400,
          rate: 8,
        },
        batchQueueConfig: {
          maxCharactersPerBatch: 1000,
          maxItemsPerBatch: 4,
        },
        customPromptsConfig: {
          promptId: "default",
          patterns: [],
        },
        position: {
          percent: 10,
          anchor: "bottom",
        },
        toggleShortcut: "Alt+C",
      },
      inputTranslation: {
        enabled: true,
        providerId: "openai-default",
        fromLang: "targetCode",
        toLang: "sourceCode",
        enableCycle: false,
        timeThreshold: 300,
      },
      siteControl: {
        mode: "blacklist",
        blacklistPatterns: [],
        whitelistPatterns: [],
      },
      languageDetection: {
        mode: "basic",
        providerId: "openai-default",
      },
      uiLanguage: "auto",
    },
  },
  "config-with-llm-detection-enabled": {
    description:
      "Single provider, LLM detection mode; features get enabled toggles and speak added",
    config: {
      translationHub: {
        shortcut: "Alt+Shift+H",
      },
      siteRules: {
        userRules: [],
        disabledBuiltInRules: [],
      },
      language: {
        sourceCode: "jpn",
        targetCode: "eng",
        level: "beginner",
      },
      providersConfig: [
        {
          id: "jalapenocloud-default",
          name: "Jalapeno Cloud",
          enabled: true,
          provider: "jalapenocloud",
          description: "Enterprise-grade AI used by top teams — now made for you!",
          baseURL: "https://api.jalapeno-cloud.ai/v1",
          model: {
            model: "DeepSeek-V4-Flash",
            isCustomModel: false,
            customModel: null,
          },
          providerOptions: {
            chat_template_kwargs: {
              thinking: false,
            },
          },
        },
        {
          id: "google-default",
          enabled: true,
          name: "Gemini",
          provider: "google",
          description: "Google's flagship AI models with advanced reasoning capabilities",
          reasoning: "none",
          apiKey: "goog-key",
          model: {
            model: "gemini-2.5-pro",
            isCustomModel: false,
            customModel: "",
          },
        },
      ],
      pageTranslation: {
        providerId: "google-default",
        mode: "translationOnly",
        modeShortcut: "Alt+Shift+M",
        enableAIContentAware: false,
        node: {
          enabled: true,
          hotkey: "alt",
          forceRetranslation: false,
        },
        page: {
          range: "all",
          autoTranslatePatterns: [],
          neverAutoTranslatePatterns: [],
          autoTranslateLanguages: [],
          shortcut: "Alt+B",
          preload: {
            margin: 1000,
            threshold: 0,
          },
          minCharactersPerNode: 0,
          minWordsPerNode: 0,
          enableTargetLanguageSkip: true,
          skipLanguages: [],
        },
        customPromptsConfig: {
          promptId: "default",
          patterns: [],
        },
        requestQueueConfig: {
          capacity: 200,
          rate: 2,
        },
        batchQueueConfig: {
          maxCharactersPerBatch: 1000,
          maxItemsPerBatch: 4,
        },
        translationNodeStyle: {
          preset: "default",
          isCustom: false,
          customCSS: null,
        },
      },
      floatingButton: {
        enabled: true,
        position: 0.5,
        disabledFloatingButtonPatterns: [],
        clickAction: "panel",
        locked: false,
        side: "right",
      },
      sideContent: {
        width: 420,
      },
      selectionToolbar: {
        enabled: true,
        disabledSelectionToolbarPatterns: [],
        opacity: 100,
        customActions: [],
        features: {
          translate: {
            enabled: true,
            providerId: "google-default",
            shortcut: "Alt+T",
          },
        },
        builtInActions: {
          dictionary: {
            enabled: true,
            providerId: "google-default",
          },
        },
      },
      betaExperience: {
        enabled: false,
      },
      contextMenu: {
        enabled: true,
      },
      videoSubtitles: {
        enabled: false,
        autoStart: false,
        providerId: "google-default",
        style: {
          displayMode: "bilingual",
          translationPosition: "above",
          main: {
            fontFamily: "system",
            fontScale: 100,
            color: "#FFFFFF",
            fontWeight: 400,
          },
          translation: {
            fontFamily: "system",
            fontScale: 100,
            color: "#FFFFFF",
            fontWeight: 400,
          },
          container: {
            backgroundOpacity: 75,
          },
          customCSS: null,
        },
        aiSegmentation: false,
        requestQueueConfig: {
          capacity: 200,
          rate: 2,
        },
        batchQueueConfig: {
          maxCharactersPerBatch: 1000,
          maxItemsPerBatch: 4,
        },
        customPromptsConfig: {
          promptId: "default",
          patterns: [],
        },
        position: {
          percent: 10,
          anchor: "bottom",
        },
        toggleShortcut: "Alt+C",
      },
      inputTranslation: {
        enabled: true,
        providerId: "google-default",
        fromLang: "targetCode",
        toLang: "sourceCode",
        enableCycle: false,
        timeThreshold: 300,
      },
      siteControl: {
        mode: "blacklist",
        blacklistPatterns: [],
        whitelistPatterns: [],
      },
      languageDetection: {
        mode: "llm",
        providerId: "google-default",
      },
      uiLanguage: "auto",
    },
  },
  "prompt-token-migration-coverage": {
    description:
      "Covers legacy prompt token migration for translate, custom actions, and video subtitles",
    config: {
      translationHub: {
        shortcut: "Alt+Shift+H",
      },
      siteRules: {
        userRules: [],
        disabledBuiltInRules: [],
      },
      language: {
        sourceCode: "eng",
        targetCode: "cmn",
        level: "intermediate",
      },
      providersConfig: [
        {
          id: "jalapenocloud-default",
          name: "Jalapeno Cloud",
          enabled: true,
          provider: "jalapenocloud",
          description: "Enterprise-grade AI used by top teams — now made for you!",
          baseURL: "https://api.jalapeno-cloud.ai/v1",
          model: {
            model: "DeepSeek-V4-Flash",
            isCustomModel: false,
            customModel: null,
          },
          providerOptions: {
            chat_template_kwargs: {
              thinking: false,
            },
          },
        },
        {
          id: "google-default",
          enabled: true,
          name: "Gemini",
          provider: "google",
          description: "Google's flagship AI models with advanced reasoning capabilities",
          reasoning: "none",
          apiKey: "goog-key",
          model: {
            model: "gemini-2.5-pro",
            isCustomModel: false,
            customModel: "",
          },
        },
      ],
      pageTranslation: {
        providerId: "google-default",
        mode: "translationOnly",
        modeShortcut: "Alt+Shift+M",
        enableAIContentAware: false,
        node: {
          enabled: true,
          hotkey: "alt",
          forceRetranslation: false,
        },
        page: {
          range: "all",
          autoTranslatePatterns: [],
          neverAutoTranslatePatterns: [],
          autoTranslateLanguages: [],
          shortcut: "Alt+B",
          preload: {
            margin: 1000,
            threshold: 0,
          },
          minCharactersPerNode: 0,
          minWordsPerNode: 0,
          enableTargetLanguageSkip: true,
          skipLanguages: [],
        },
        customPromptsConfig: {
          promptId: "legacy-translate-prompt",
          patterns: [
            {
              id: "legacy-translate-prompt",
              name: "Legacy Translate Prompt",
              systemPrompt:
                "Translate into {{targetLanguage}} with title {{webTitle}} and summary {{webSummary}}.",
              prompt:
                "Title: {{webTitle}}\nSummary: {{webSummary}}\nTranslate to {{targetLanguage}}:\n{{input}}",
            },
          ],
        },
        requestQueueConfig: {
          capacity: 200,
          rate: 2,
        },
        batchQueueConfig: {
          maxCharactersPerBatch: 1000,
          maxItemsPerBatch: 4,
        },
        translationNodeStyle: {
          preset: "default",
          isCustom: false,
          customCSS: null,
        },
      },
      floatingButton: {
        enabled: true,
        position: 0.5,
        disabledFloatingButtonPatterns: [],
        clickAction: "panel",
        locked: false,
        side: "right",
      },
      sideContent: {
        width: 420,
      },
      selectionToolbar: {
        enabled: true,
        disabledSelectionToolbarPatterns: [],
        opacity: 100,
        customActions: [
          {
            id: "coverage-action",
            name: "Coverage Action",
            enabled: true,
            icon: "tabler:book-2",
            providerId: "google-default",
            systemPrompt: "Answer in {{targetLanguage}} and use {{webTitle}} as metadata.",
            prompt:
              "Selection: {{selection}}\nContext: {{paragraphs}}\nTitle: {{webTitle}}\nTarget language: {{targetLanguage}}",
            outputSchema: [
              {
                id: "coverage-term",
                name: "Term",
                type: "string",
                description: "Focus on {{selection}}.",
              },
              {
                id: "coverage-definition",
                name: "Definition",
                type: "string",
                description: "Explain it in {{targetLanguage}}.",
              },
              {
                id: "coverage-context",
                name: "Context",
                type: "string",
                description: "Reuse {{paragraphs}} exactly.",
              },
              {
                id: "coverage-notes",
                name: "Notes",
                type: "string",
                description: "Mention {{webTitle}} when relevant.",
              },
            ],
          },
        ],
        features: {
          translate: {
            enabled: true,
            providerId: "google-default",
            shortcut: "Alt+T",
          },
        },
        builtInActions: {
          dictionary: {
            enabled: false,
            providerId: "",
          },
        },
      },
      betaExperience: {
        enabled: false,
      },
      contextMenu: {
        enabled: true,
      },
      videoSubtitles: {
        enabled: false,
        autoStart: false,
        providerId: "google-default",
        style: {
          displayMode: "bilingual",
          translationPosition: "above",
          main: {
            fontFamily: "system",
            fontScale: 100,
            color: "#FFFFFF",
            fontWeight: 400,
          },
          translation: {
            fontFamily: "system",
            fontScale: 100,
            color: "#FFFFFF",
            fontWeight: 400,
          },
          container: {
            backgroundOpacity: 75,
          },
          customCSS: null,
        },
        aiSegmentation: false,
        requestQueueConfig: {
          capacity: 200,
          rate: 2,
        },
        batchQueueConfig: {
          maxCharactersPerBatch: 1000,
          maxItemsPerBatch: 4,
        },
        customPromptsConfig: {
          promptId: "legacy-subtitles-prompt",
          patterns: [
            {
              id: "legacy-subtitles-prompt",
              name: "Legacy Subtitles Prompt",
              systemPrompt:
                "Translate subtitles into {{targetLanguage}} with {{webTitle}} and {{videoSummary}} as context.",
              prompt:
                "Title: {{webTitle}}\nSummary: {{videoSummary}}\nTranslate to {{targetLanguage}}:\n{{input}}",
            },
          ],
        },
        position: {
          percent: 10,
          anchor: "bottom",
        },
        toggleShortcut: "Alt+C",
      },
      inputTranslation: {
        enabled: true,
        providerId: "google-default",
        fromLang: "targetCode",
        toLang: "sourceCode",
        enableCycle: false,
        timeThreshold: 300,
      },
      siteControl: {
        mode: "blacklist",
        blacklistPatterns: [],
        whitelistPatterns: [],
      },
      languageDetection: {
        mode: "basic",
        providerId: "google-default",
      },
      uiLanguage: "auto",
    },
  },
  "default-dictionary-wording": {
    description: "Renames dictionary wording from context to paragraphs",
    config: {
      translationHub: {
        shortcut: "Alt+Shift+H",
      },
      siteRules: {
        userRules: [],
        disabledBuiltInRules: [],
      },
      language: {
        sourceCode: "eng",
        targetCode: "cmn",
        level: "intermediate",
      },
      providersConfig: [
        {
          id: "jalapenocloud-default",
          name: "Jalapeno Cloud",
          enabled: true,
          provider: "jalapenocloud",
          description: "Enterprise-grade AI used by top teams — now made for you!",
          baseURL: "https://api.jalapeno-cloud.ai/v1",
          model: {
            model: "DeepSeek-V4-Flash",
            isCustomModel: false,
            customModel: null,
          },
          providerOptions: {
            chat_template_kwargs: {
              thinking: false,
            },
          },
        },
        {
          id: "google-default",
          enabled: true,
          name: "Gemini",
          provider: "google",
          description: "Google's flagship AI models with advanced reasoning capabilities",
          reasoning: "none",
          apiKey: "goog-key",
          model: {
            model: "gemini-2.5-pro",
            isCustomModel: false,
            customModel: "",
          },
        },
      ],
      pageTranslation: {
        providerId: "google-default",
        mode: "translationOnly",
        modeShortcut: "Alt+Shift+M",
        enableAIContentAware: false,
        node: {
          enabled: true,
          hotkey: "alt",
          forceRetranslation: false,
        },
        page: {
          range: "all",
          autoTranslatePatterns: [],
          neverAutoTranslatePatterns: [],
          autoTranslateLanguages: [],
          shortcut: "Alt+B",
          preload: {
            margin: 1000,
            threshold: 0,
          },
          minCharactersPerNode: 0,
          minWordsPerNode: 0,
          enableTargetLanguageSkip: true,
          skipLanguages: [],
        },
        customPromptsConfig: {
          promptId: "default",
          patterns: [],
        },
        requestQueueConfig: {
          capacity: 200,
          rate: 2,
        },
        batchQueueConfig: {
          maxCharactersPerBatch: 1000,
          maxItemsPerBatch: 4,
        },
        translationNodeStyle: {
          preset: "default",
          isCustom: false,
          customCSS: null,
        },
      },
      floatingButton: {
        enabled: true,
        position: 0.5,
        disabledFloatingButtonPatterns: [],
        clickAction: "panel",
        locked: false,
        side: "right",
      },
      sideContent: {
        width: 420,
      },
      selectionToolbar: {
        enabled: true,
        disabledSelectionToolbarPatterns: [],
        opacity: 100,
        customActions: [],
        features: {
          translate: {
            enabled: true,
            providerId: "google-default",
            shortcut: "Alt+T",
          },
        },
        builtInActions: {
          dictionary: {
            enabled: true,
            providerId: "google-default",
          },
        },
      },
      betaExperience: {
        enabled: false,
      },
      contextMenu: {
        enabled: true,
      },
      videoSubtitles: {
        enabled: false,
        autoStart: false,
        providerId: "google-default",
        style: {
          displayMode: "bilingual",
          translationPosition: "above",
          main: {
            fontFamily: "system",
            fontScale: 100,
            color: "#FFFFFF",
            fontWeight: 400,
          },
          translation: {
            fontFamily: "system",
            fontScale: 100,
            color: "#FFFFFF",
            fontWeight: 400,
          },
          container: {
            backgroundOpacity: 75,
          },
          customCSS: null,
        },
        aiSegmentation: false,
        requestQueueConfig: {
          capacity: 200,
          rate: 2,
        },
        batchQueueConfig: {
          maxCharactersPerBatch: 1000,
          maxItemsPerBatch: 4,
        },
        customPromptsConfig: {
          promptId: "default",
          patterns: [],
        },
        position: {
          percent: 10,
          anchor: "bottom",
        },
        toggleShortcut: "Alt+C",
      },
      inputTranslation: {
        enabled: true,
        providerId: "google-default",
        fromLang: "targetCode",
        toLang: "sourceCode",
        enableCycle: false,
        timeThreshold: 300,
      },
      siteControl: {
        mode: "blacklist",
        blacklistPatterns: [],
        whitelistPatterns: [],
      },
      languageDetection: {
        mode: "basic",
        providerId: "google-default",
      },
      uiLanguage: "auto",
    },
  },
}
