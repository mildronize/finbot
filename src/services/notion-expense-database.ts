import { NotionDatabase } from "typed-notion-client";
import { Client as NotionClient } from '@notionhq/client';

export class NotionExpenseDatabaseFactory {
	constructor(
		private readonly notionClient: NotionClient,
		private readonly databaseId: string
	) { }

	create() {
		return new NotionDatabase({
			notionClient: this.notionClient,
			databaseId: this.databaseId,
			propTypes: {
				Memo: 'title',
				Category: 'rich_text',
				Date: 'date',
				Amount: 'number',
			},
		});
	}
}
