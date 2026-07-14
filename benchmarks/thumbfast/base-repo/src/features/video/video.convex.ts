import { z } from "zod";

const ListVideosSchema = z.object({
  orgSlug: z.string().min(1),
  limit: z.number().optional(),
});

const AddThumbnailToVideoSchema = z.object({
  orgSlug: z.string().min(1),
  thumbnailId: z.string().min(1),
  videoId: z.string().min(1).optional(),
});

const RemoveVideoGenerationSchema = z.object({
  orgSlug: z.string().min(1),
  videoGenerationId: z.string().min(1),
});

type ListVideos = (input: z.infer<typeof ListVideosSchema>) => Promise<{
  items: unknown[];
}>;
type CreateVideo = (input: {
  orgSlug: string;
}) => Promise<{ id: string; internalTitle?: string }>;
type AddThumbnailToVideo = (
  input: z.infer<typeof AddThumbnailToVideoSchema>,
) => Promise<{ videoId: string; videoGenerationId: string }>;
type RemoveVideoGeneration = (
  input: z.infer<typeof RemoveVideoGenerationSchema>,
) => Promise<{ success: boolean }>;

export async function listVideos(
  input: z.infer<typeof ListVideosSchema>,
  query: ListVideos,
) {
  const result = await query(ListVideosSchema.parse(input));
  return result.items;
}

export async function createVideo(orgSlug: string, mutation: CreateVideo) {
  return mutation({ orgSlug });
}

export async function addThumbnailToVideo(
  input: z.infer<typeof AddThumbnailToVideoSchema>,
  mutation: AddThumbnailToVideo,
) {
  return mutation(AddThumbnailToVideoSchema.parse(input));
}

export async function removeVideoGeneration(
  input: z.infer<typeof RemoveVideoGenerationSchema>,
  mutation: RemoveVideoGeneration,
) {
  return mutation(RemoveVideoGenerationSchema.parse(input));
}
