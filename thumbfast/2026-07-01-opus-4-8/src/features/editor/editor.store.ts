import type { Person } from "@/features/person/person.query";
import type { AspectRatio } from "@/lib/ai/aspect-ratio";
import type { InspirationListItem } from "@/features/inspiration/inspiration.query";
import {
  type ImageModel,
  getDefaultModelId,
  resolveModelId,
} from "@/lib/ai/image-models";
import { create } from "zustand";
import { MAX_TOTAL_IMAGES } from "./editor.constants";
import type { UserImageData } from "./editor.schema";

const MODEL_STORAGE_KEY = "thumbfast-selected-model";
const ASPECT_RATIO_STORAGE_KEY = "thumbfast-selected-ratio";

const getSavedModel = (): ImageModel => {
  if (typeof window === "undefined") return getDefaultModelId();
  const saved = localStorage.getItem(MODEL_STORAGE_KEY);
  if (!saved) return getDefaultModelId();
  const resolved = resolveModelId(saved);
  if (resolved !== saved) {
    localStorage.setItem(MODEL_STORAGE_KEY, resolved);
  }
  return resolved;
};

const getSavedAspectRatio = (): AspectRatio => {
  if (typeof window === "undefined") return "16:9";
  const saved = localStorage.getItem(ASPECT_RATIO_STORAGE_KEY);
  if (!saved) return "16:9";
  const validRatios: AspectRatio[] = ["16:9", "9:16", "1:1"];
  if (validRatios.includes(saved as AspectRatio)) {
    return saved as AspectRatio;
  }
  return "16:9";
};

type EditorInitProps = {
  textPrompt?: string;
  personIds?: string[];
  inspirationIds?: string[];
  userImages?: UserImageData[];
  editingImage?: string | null;
  editingThumbnailId?: string | null;
  thumbnailCount?: number;
  model?: ImageModel;
  aspectRatio?: AspectRatio;
};

type EditorState = {
  textPrompt: string;
  personIds: string[];
  inspirationIds: string[];
  userImages: UserImageData[];
  editingImage: string | null;
  editingThumbnailId: string | null;
  thumbnailCount: number;
  model: ImageModel;
  aspectRatio: AspectRatio;
  originalPrompt: string;
  isInitialized: boolean;

  persons: Person[];
  inspirations: InspirationListItem[];
  availableUserImages: UserImageData[];

  initialize: (props: EditorInitProps) => void;
  reset: () => void;

  setTextPrompt: (prompt: string) => void;
  setOriginalPrompt: (prompt: string) => void;
  setThumbnailCount: (count: number) => void;
  setModel: (model: ImageModel) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setEditingImage: (image: string | null) => void;
  setEditingThumbnailId: (id: string | null) => void;

  setPersons: (persons: Person[]) => void;
  setInspirations: (inspirations: InspirationListItem[]) => void;
  setAvailableUserImages: (images: UserImageData[]) => void;

  addPersonId: (personId: string) => boolean;
  removePersonId: (personId: string) => void;
  setPersonIds: (personIds: string[]) => void;

  addInspirationId: (inspirationId: string) => boolean;
  removeInspirationId: (inspirationId: string) => void;
  setInspirationIds: (inspirationIds: string[]) => void;

  addUserImage: (image: UserImageData) => boolean;
  removeUserImage: (imageId: string) => void;
  setUserImages: (images: UserImageData[]) => void;
  updateUserImageName: (imageId: string, name: string) => void;
  getUserImageIds: () => string[];

  getTotalImageCount: () => number;
  getImageCountBreakdown: () => {
    personImages: number;
    inspirationImages: number;
    userImages: number;
    editingImage: number;
    total: number;
  };
  canAddImages: (count: number) => boolean;
  getRemainingImageSlots: () => number;
};

const getDefaultState = () => ({
  textPrompt: "",
  personIds: [] as string[],
  inspirationIds: [] as string[],
  userImages: [] as UserImageData[],
  editingImage: null as string | null,
  editingThumbnailId: null as string | null,
  thumbnailCount: 1,
  model: getDefaultModelId(),
  aspectRatio: "16:9" as AspectRatio,
  originalPrompt: "",
  isInitialized: false,
  persons: [] as Person[],
  inspirations: [] as InspirationListItem[],
  availableUserImages: [] as UserImageData[],
});

export const useEditorStore = create<EditorState>((set, get) => ({
  ...getDefaultState(),

  initialize: (props) => {
    const model = resolveModelId(props.model ?? getSavedModel());
    if (typeof window !== "undefined") {
      localStorage.setItem(MODEL_STORAGE_KEY, model);
    }

    set({
      textPrompt: props.textPrompt ?? "",
      personIds: props.personIds ?? [],
      inspirationIds: props.inspirationIds ?? [],
      userImages: props.userImages ?? [],
      editingImage: props.editingImage ?? null,
      editingThumbnailId: props.editingThumbnailId ?? null,
      thumbnailCount: props.thumbnailCount ?? 1,
      model,
      aspectRatio: props.aspectRatio ?? getSavedAspectRatio(),
      originalPrompt: props.textPrompt ?? "",
      isInitialized: true,
    });
  },

  reset: () => {
    set(getDefaultState());
  },

  setTextPrompt: (prompt) => set({ textPrompt: prompt }),
  setOriginalPrompt: (prompt) => set({ originalPrompt: prompt }),
  setThumbnailCount: (count) => set({ thumbnailCount: count }),
  setModel: (model) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(MODEL_STORAGE_KEY, model);
    }
    set({ model });
  },
  setAspectRatio: (ratio) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ASPECT_RATIO_STORAGE_KEY, ratio);
    }
    set({ aspectRatio: ratio });
  },
  setEditingImage: (image) => set({ editingImage: image }),
  setEditingThumbnailId: (id) => set({ editingThumbnailId: id }),

  setPersons: (persons) => set({ persons }),
  setInspirations: (inspirations) => set({ inspirations }),
  setAvailableUserImages: (images) => set({ availableUserImages: images }),

  addPersonId: (personId) => {
    const state = get();
    if (state.personIds.includes(personId)) return true;

    const person = state.persons.find((p) => p.id === personId);
    const imageCount = person?.images.length ?? 0;

    if (!state.canAddImages(imageCount)) {
      return false;
    }

    set({ personIds: [...state.personIds, personId] });
    return true;
  },

  removePersonId: (personId) => {
    set((state) => ({
      personIds: state.personIds.filter((id) => id !== personId),
    }));
  },

  setPersonIds: (personIds) => set({ personIds }),

  addInspirationId: (inspirationId) => {
    const state = get();
    if (state.inspirationIds.includes(inspirationId)) return true;

    const inspiration = state.inspirations.find((i) => i.id === inspirationId);
    const imageCount = inspiration?.thumbnailUrls.length ?? 0;

    if (!state.canAddImages(imageCount)) {
      return false;
    }

    set({ inspirationIds: [...state.inspirationIds, inspirationId] });
    return true;
  },

  removeInspirationId: (inspirationId) => {
    set((state) => ({
      inspirationIds: state.inspirationIds.filter((id) => id !== inspirationId),
    }));
  },

  setInspirationIds: (inspirationIds) => set({ inspirationIds }),

  addUserImage: (image) => {
    const state = get();
    if (state.userImages.some((img) => img.id === image.id)) return true;

    if (!state.canAddImages(1)) {
      return false;
    }

    set({ userImages: [...state.userImages, image] });
    return true;
  },

  removeUserImage: (imageId) => {
    set((state) => ({
      userImages: state.userImages.filter((img) => img.id !== imageId),
    }));
  },

  setUserImages: (images) => set({ userImages: images }),

  updateUserImageName: (imageId, name) => {
    set((state) => ({
      userImages: state.userImages.map((img) =>
        img.id === imageId ? { ...img, name } : img,
      ),
      availableUserImages: state.availableUserImages.map((img) =>
        img.id === imageId ? { ...img, name } : img,
      ),
    }));
  },

  getUserImageIds: () => {
    const state = get();
    return state.userImages.map((img) => img.id);
  },

  getTotalImageCount: () => {
    const state = get();
    const breakdown = state.getImageCountBreakdown();
    return breakdown.total;
  },

  getImageCountBreakdown: () => {
    const state = get();

    const personImages = state.personIds.reduce((count, personId) => {
      const person = state.persons.find((p) => p.id === personId);
      return count + (person?.images.length ?? 0);
    }, 0);

    const inspirationImages = state.inspirationIds.reduce(
      (count, inspirationId) => {
        const inspiration = state.inspirations.find(
          (i) => i.id === inspirationId,
        );
        return count + (inspiration?.thumbnailUrls.length ?? 0);
      },
      0,
    );

    const userImagesCount = state.userImages.length;
    const editingImage = state.editingImage ? 1 : 0;

    return {
      personImages,
      inspirationImages,
      userImages: userImagesCount,
      editingImage,
      total: personImages + inspirationImages + userImagesCount + editingImage,
    };
  },

  canAddImages: (count) => {
    const state = get();
    const currentTotal = state.getTotalImageCount();
    return currentTotal + count <= MAX_TOTAL_IMAGES;
  },

  getRemainingImageSlots: () => {
    const state = get();
    return MAX_TOTAL_IMAGES - state.getTotalImageCount();
  },
}));

export const getEditorStore = () => useEditorStore.getState();
