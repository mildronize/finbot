import {  z } from "zod";

export const expenseAgentResponseSchema = z.object({
	agent: z.union([z.literal('Default'), z.literal('ExpenseTracker')]),
	message: z.string().optional(),
	dateTimeUtc: z.string().optional(),
	amount: z.number().optional(),
	category: z.string().optional(),
	memo: z.string().optional(),
});

