import { z } from "zod";
import demoProfileJson from "../../data/demo-profile.json";

export const BrandProfileSchema = z.object({
  businessName: z.string().min(1).max(100),
  businessType: z.string().min(1).max(100),
  location: z.string().min(1).max(100),
  products: z.array(z.string().min(1).max(100)).min(1).max(30),
  values: z.array(z.string().min(1).max(200)).max(20),
  tone: z.string().min(1).max(300),
  audience: z.array(z.string().min(1).max(200)).min(1).max(20),
  topicsToAvoid: z.array(z.string().min(1).max(100)).max(30),
  postingPlatforms: z.array(z.string().min(1).max(50)).min(1).max(10),
  openingHours: z.string().max(100).optional(),
});

export type BrandProfile = z.infer<typeof BrandProfileSchema>;

/** The fictional demo bakery from data/demo-profile.json (the _note field is dropped). */
export const DEMO_PROFILE: BrandProfile = BrandProfileSchema.parse(demoProfileJson);
