export type City = {
  name: string;
  country: string;
  timezone: string;
};

export type Settings = {
  timeFormat: "12h" | "24h";
  workStart: number;
  workEnd: number;
  wakeStart: number;
  wakeEnd: number;
};

export type SelectedCity = City & {
  id: string;
};
