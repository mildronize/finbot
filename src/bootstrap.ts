import 'dotenv/config';
import { BotApp } from './bot/bot';
import { getEnv } from './env';
import { OpenAIClient } from './bot/ai/openai';
import { AzureTable } from './libs/azure-table';
import { IMessageEntity } from './entities/messages';
import { TableClient } from '@azure/data-tables';
import { Bot } from 'grammy';
import { generateUpdateMiddleware } from 'telegraf-middleware-console-time';
import { Client as NotionClient } from '@notionhq/client';
import { NotionService } from './services/notion-service';
import { AzureOpenAI } from 'openai';

const env = getEnv(process.env);

export function bootstrap(): {
  bot: Bot;
  asyncTask: () => Promise<void>;
} {
	// For Demo Purpose Only, Azure Don't Recommend to use the API Key
	// See: https://learn.microsoft.com/en-us/azure/ai-services/openai/chatgpt-quickstart?tabs=command-line%2Capi-key%2Ctypescript-keyless%2Cpython-new&pivots=programming-language-javascript
  const aiClient = new OpenAIClient(new AzureOpenAI({
		endpoint: env.AZURE_OPENAI_ENDPOINT,
		apiKey: env.AZURE_OPENAI_API_KEY,
		apiVersion: '2024-08-01-preview',
		deployment: 'gpt-4o-mini',
		timeout: 20 * 1000,
	}));
	const notionClient = new NotionClient({ auth: env.NOTION_KEY });
	const notionService = new NotionService(notionClient, env.NOTION_DATABASE_ID);
  const azureTableClient = {
    messages: new AzureTable<IMessageEntity>(
      TableClient.fromConnectionString(env.AZURE_TABLE_CONNECTION_STRING, `${env.AZURE_TABLE_PREFIX}Bot`),
    ),
  };
  const botApp = new BotApp({
    botToken: env.BOT_TOKEN,
    botInfo: env.BOT_INFO ? JSON.parse(env.BOT_INFO): undefined,
    allowUserIds: env.ALLOWED_USER_IDS,
		protectedBot: env.PROTECTED_BOT,
    aiClient,
    azureTableClient,
		notionService,
  });
  if (env.NODE_ENV === 'development') {
    botApp.instance.use(generateUpdateMiddleware());
  }
  botApp.init();
  return {
    bot: botApp.instance,
    asyncTask: async () => {
      await azureTableClient.messages.createTable();
    },
  };
}
