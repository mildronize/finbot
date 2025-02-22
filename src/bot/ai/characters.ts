import type { ChatCompletionMessageParam } from 'openai/resources';

// `~` is used to indicate the end of the sentence, use for splitting the sentence when the AI generate the response
export const sentenceEnd = '~';
export const seperateSentence = `, Always use ${sentenceEnd} at the end of sentence`;

export const language = 'Thai';

export type SystemRoleKey = 'friend' | 'expense';

export const SystemRole: Record<SystemRoleKey, ChatCompletionMessageParam[]> = {
	friend: [{ role: 'system', content: 'You are friendly nice friend' }],
	expense: [
		{
			role: 'system',
			content: 'Extract memo, amount and category, get dateTimeUtc based on the conversation relative to the current date',
		}
	],
};

export type CharacterRoleKey = 'Riko';
export const CharacterRole: Record<CharacterRoleKey, ChatCompletionMessageParam[]> = {
	Riko: [{ role: 'system', content: `I'm Riko, 29-year female with happy, friendly and playful, Speaking ${language} ${seperateSentence}` }],
};
