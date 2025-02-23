import { Client as NotionClient } from '@notionhq/client';
import { NotionDatabase } from 'typed-notion-client';
import { NotionExpenseDatabaseFactory } from './notion-expense-database';

export interface Expense {
	memo: string;
	date: Date;
	category: string;
	amount: number;
}

export class NotionService {

	constructor(
		private readonly client: NotionClient,
		private readonly databaseId: string) { }

	async saveNewExpense(expense: Expense) {
		const database = new NotionExpenseDatabaseFactory(this.client, this.databaseId).create();
		const page = await database.page.create(prop => ({
			properties: {
				...prop['Memo'].params({
					title: [
						{
							text: {
								content: expense.memo,
							},
						},
					]
				}),
				...prop['Category'].params({
					rich_text: [
						{
							text: {
								content: expense.category,
							},
						},
					],
				}),
				...prop['Date'].params({
					date: {
						start: new Date().toISOString(),
					},
				}),
				...prop['Amount'].params({
					number: expense.amount,
				}),
			},
		}));
		console.log(`Created page: ${page.id}`);
		return page.id;
	}

}


