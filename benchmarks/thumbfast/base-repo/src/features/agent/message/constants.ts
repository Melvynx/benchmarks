import {
  Clock,
  Edit3,
  Image as ImageIcon,
  Link2,
  Search,
  Users,
  Video,
} from "lucide-react";

export const TOOL_META: Record<
  string,
  { icon: typeof Search; label: string; verb: string }
> = {
  search_inspirations: {
    icon: Search,
    label: "Search Inspirations",
    verb: "Searching inspirations",
  },
  get_persons: {
    icon: Users,
    label: "Get Persons",
    verb: "Finding persons",
  },
  get_user_images: {
    icon: ImageIcon,
    label: "Get Images",
    verb: "Searching images",
  },
  generate_thumbnail: {
    icon: ImageIcon,
    label: "Generate Thumbnail",
    verb: "Generating thumbnail",
  },
  generate_thumbnails: {
    icon: ImageIcon,
    label: "Generate Thumbnails",
    verb: "Generating thumbnails",
  },
  get_prompt_examples: {
    icon: Search,
    label: "Prompt Examples",
    verb: "Loading prompt examples",
  },
  create_video: {
    icon: Video,
    label: "Create Video",
    verb: "Creating video",
  },
  fetch_youtube_transcript: {
    icon: Link2,
    label: "Fetch Transcript",
    verb: "Fetching transcript",
  },
  analyze_youtube_video: {
    icon: Link2,
    label: "Analyze Video",
    verb: "Watching video",
  },
  edit_thumbnail: {
    icon: Edit3,
    label: "Edit Thumbnail",
    verb: "Editing thumbnail",
  },
  get_recent_thumbnails: {
    icon: Clock,
    label: "Recent Thumbnails",
    verb: "Loading recent thumbnails",
  },
};

export const GALLERY_TOOLS = new Set([
  "search_inspirations",
  "get_persons",
  "get_user_images",
  "get_recent_thumbnails",
]);

export const THUMBNAIL_RESULT_TOOLS = new Set([
  "generate_thumbnail",
  "edit_thumbnail",
  "generate_thumbnails",
]);
