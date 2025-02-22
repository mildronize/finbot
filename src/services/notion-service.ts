import { Client as NotionClient } from '@notionhq/client';
import { NotionDatabase } from 'typed-notion-client';

export class NotionService {
	private readonly databaseId: string;

	constructor(private readonly client: NotionClient, databaseId: string) {
		this.databaseId = databaseId;
	}

}
