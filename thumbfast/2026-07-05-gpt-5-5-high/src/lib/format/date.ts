import { dayjs } from "@/lib/dayjs";

export const formatDate = (date: Date) => {
  return dayjs(date).format("MMMM D, YYYY");
};
