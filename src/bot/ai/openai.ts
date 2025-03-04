import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources';
import { zodResponseFormat } from "openai/helpers/zod";
import { SystemRole, CharacterRole, sentenceEnd } from './characters';
import { expenseAgentResponseSchema } from './expense-agent';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { z } from 'zod';
dayjs.extend(utc);
dayjs.extend(timezone);

const tz = "Asia/Bangkok";
dayjs.tz.setDefault(tz);

export interface PreviousMessage {
	type: 'text' | 'photo';
	content: string;
}

export type ChatAiResponse = z.infer<typeof expenseAgentResponseSchema> & {
	date: Date
}

export function parseExpenseMessage(parsedMessage: ChatAiResponse | null) {
	if (!parsedMessage) {
		return 'ไม่เข้าใจข้อความที่ส่งมา';
	}
	let response = `บันทึกค่าใช้จ่าย: Note ${parsedMessage.memo}, ${parsedMessage?.amount} บาท ประเภท: ${parsedMessage?.category} วันที่: ${dayjs(parsedMessage.date).format('MMMM DD, YYYY HH:mm')}`;
	return response;
}


/**
 * The character role of the agent
 * natural: the agent will answer not too long, not too short
 * default: the agent will answer with the default answer mode
 */
export type ChatMode = 'natural' | 'default';

export class OpenAIClient {
	characterRole: keyof typeof CharacterRole;
	model: string = 'gpt-4o-mini';
	timeout: number = 20 * 1000; // 20 seconds, default is 10 minutes (By OpenAI)
	/**
	 * The limit of previous messages to chat with the AI, this prevent large tokens be sent to the AI
	 * For reducing the cost of the API and prevent the AI to be confused
	 *
	 * @default 10
	 */
	previousMessageLimit: number = 10;
	/**
	 * The answer mode of the AI, this is the default answer mode of the AI
	 * Use this to prevent the AI to generate long answers or to be confused
	 */
	// answerMode = 'The answers are within 4 sentences';
	/**
	 * Split the sentence when the AI generate the response,
	 * Prevent not to generate long answers, reply with multiple chat messages
	 */
	splitSentence: boolean = true;

	constructor(public readonly client: OpenAI) {
		// this.client = new OpenAI({ apiKey, timeout: this.timeout });
		this.characterRole = 'Krati';
	}

	/**
	 * The answer mode of the AI, this is the default answer mode of the AI
	 * Use this to prevent the AI to generate long answers or to be confused
	 */
	private dynamicLimitAnswerSentences(start: number, end: number) {
		const answerMode = `The answers are within XXX sentences`;
		const randomLimit = Math.floor(Math.random() * (end - start + 1)) + start;
		return answerMode.replace('XXX', randomLimit.toString());
	}

	private parseMessage(parsedMessage: z.infer<typeof expenseAgentResponseSchema> | null) {
		if (!parsedMessage) {
			return 'ไม่เข้าใจข้อความที่ส่งมา';
		}
		let response = `บันทึกค่าใช้จ่าย: Note ${parsedMessage.memo}, ${parsedMessage?.amount} บาท ประเภท: ${parsedMessage?.category} วันที่: ${dayjs(parsedMessage?.dateTimeUtc).format('MMMM DD, YYYY HH:mm')}`;
		return response;
	}

	/**
	 * Chat with the AI, the AI API is stateless we need to keep track of the conversation
	 *
	 * @param {AgentCharacterKey} character - The character of the agent
	 * @param {string[]} messages - The messages to chat with the AI
	 * @param {string[]} [previousMessages=[]] - The previous messages to chat with the AI
	 * @returns
	 */
	async chat(
		character: keyof typeof SystemRole,
		chatMode: ChatMode,
		messages: string[],
		previousMessages: PreviousMessage[] = [],
	): Promise<ChatAiResponse> {
		const chatCompletion = await this.client.beta.chat.completions.parse({
			messages: [
				...SystemRole[character],
				...CharacterRole[this.characterRole],
				...this.generateSystemMessages([`Current Date (UTC): ${dayjs().toISOString()}`]),
				...this.generatePreviousMessages(previousMessages),
				...this.generateTextMessages(messages),
			],
			model: this.model,
			response_format: zodResponseFormat(expenseAgentResponseSchema, "expense"),
		});

		const parsedMessage = chatCompletion.choices[0].message.parsed;

		console.log('parsedMessage', parsedMessage);

		return {
			agent: parsedMessage?.agent ?? 'Default',
			message: parsedMessage?.message,
			memo: parsedMessage?.memo,
			date: dayjs(parsedMessage?.dateTimeUtc).toDate(),
			amount: parsedMessage?.amount,
			category: parsedMessage?.category,
			dateTimeUtc: parsedMessage?.dateTimeUtc,
		}
	}

	private generateSystemMessages(messages: string[]) {
		return messages.map((message) => ({ role: 'system', content: message }) satisfies ChatCompletionMessageParam);
	}

	private generatePreviousMessages(messages: PreviousMessage[]) {
		return messages.slice(0, this.previousMessageLimit).map((message) => {
			if (message.type === 'text') {
				return { role: 'assistant', content: message.content } satisfies ChatCompletionMessageParam;
			}
			// TODO: Try to not use previous messages for image, due to cost of the API
			return { role: 'user', content: [{ type: 'image_url', image_url: { url: message.content } }] } satisfies ChatCompletionMessageParam;
		});
	}

	private generateTextMessages(messages: string[]) {
		return messages.map((message) => ({ role: 'user', content: message }) satisfies ChatCompletionMessageParam);
	}

	private generateImageMessage(imageUrl: string) {
		return {
			role: 'user',
			content: [
				{
					type: 'image_url',
					image_url: { url: imageUrl },
				},
			],
		} as ChatCompletionMessageParam;
	}

	async chatWithImage(character: keyof typeof SystemRole, messages: string[], imageUrl: string, previousMessages: PreviousMessage[] = []) {
		const chatCompletion = await this.client.beta.chat.completions.parse({
			messages: [
				...SystemRole[character],
				...this.generateTextMessages(messages),
				...this.generatePreviousMessages(previousMessages),
				this.generateImageMessage(imageUrl),
			],
			model: 'gpt-4o',
			response_format: zodResponseFormat(expenseAgentResponseSchema, "agentType"),
		});

		const parsedMessage = chatCompletion.choices[0].message.parsed;
		// const response = this.parseMessage(parsedMessage);
		return {
			message: parsedMessage?.message,
			agent: parsedMessage?.agent ?? 'Default',
			memo: parsedMessage?.memo,
			date: dayjs(parsedMessage?.dateTimeUtc).toDate(),
			amount: parsedMessage?.amount,
			category: parsedMessage?.category,
			dateTimeUtc: parsedMessage?.dateTimeUtc,
		}
	}
}
