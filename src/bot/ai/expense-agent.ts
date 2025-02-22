import {  z } from "zod";

export const expenseAgentResponseSchema = z.object({
	dateTimeUtc: z.string().optional(),
	amount: z.number().optional(),
	category: z.string().optional(),
	memo: z.string().optional(),
});

