import * as z from "zod";

export const searchSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  eventType: z.string(),
  city: z.string(),
  vehicleType: z.string(),
});

export type SearchFormType = z.infer<typeof searchSchema>;
