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

const env = getEnv(process.env);

export function bootstrap(): {
  bot: Bot;
  asyncTask: () => Promise<void>;
} {
  const aiClient = new OpenAIClient(env.OPENAI_API_KEY);
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
