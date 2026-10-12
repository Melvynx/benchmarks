// Food catalogue. Every stat delta is on a 0-100 scale.
// kind: 'solid' is bitten `bites` times, 'drink' is sipped `bites` times.
export const FOODS = {
  apple: {
    id: 'apple',
    label: 'Apple',
    icon: '🍎',
    kind: 'solid',
    bites: 3,
    color: '#ff4d5e',
    fullness: 16,
    joy: 6,
    energy: 4,
    message: 'Crunch! So juicy!',
  },
  carrot: {
    id: 'carrot',
    label: 'Carrot',
    icon: '🥕',
    kind: 'solid',
    bites: 3,
    color: '#ff9130',
    fullness: 12,
    joy: 4,
    energy: 10,
    message: 'Crunchy! I can almost see in the dark.',
  },
  cookie: {
    id: 'cookie',
    label: 'Cookie',
    icon: '🍪',
    kind: 'solid',
    bites: 3,
    color: '#d9a35c',
    fullness: 8,
    joy: 16,
    energy: -2,
    message: 'Chocolate chips?! Best day ever!',
  },
  milk: {
    id: 'milk',
    label: 'Milk',
    icon: '🥛',
    kind: 'drink',
    bites: 2,
    color: '#ffffff',
    fullness: 14,
    joy: 6,
    energy: 14,
    message: 'Moo-gical! Milk moustache!',
  },
};

export const FOOD_LIST = Object.values(FOODS);
