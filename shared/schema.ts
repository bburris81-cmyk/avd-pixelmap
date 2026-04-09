import { z } from "zod";

export const pixelMapSchema = z.object({
  tileWidth:           z.number().min(1),
  tileHeight:          z.number().min(1),
  tilesWide:           z.number().min(1),
  tilesTall:           z.number().min(1),
  mediaWidth:          z.number().min(1),
  mediaHeight:         z.number().min(1),
  canvasWidth:         z.number().default(3840),
  canvasHeight:        z.number().default(2160),
  projectName:         z.string().optional(),
  generatePixelMap:    z.boolean().default(true),
  generateTestPattern: z.boolean().default(false),
});

export type PixelMapInput = z.infer<typeof pixelMapSchema>;
