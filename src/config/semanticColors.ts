export const uiColors = {
  brand: {
    ink: '#062B5B',
    teal: '#167F76',
    mint: '#70E3C5',
    soft: '#E5F8F3',
  },
  surface: {
    page: '#F3F7FA',
    paper: '#FFFFFF',
    subtle: '#EAF1F6',
  },
  text: {
    primary: '#102A43',
    secondary: '#52697D',
  },
  border: {
    default: '#D7E2EA',
  },
  feedback: {
    loading: {
      surface: '#E5F8F3',
      border: '#A8E8D8',
      text: '#123F3B',
      accent: '#167F76',
    },
    error: {
      surface: '#FBE8EB',
      border: '#EDBBC2',
      text: '#762733',
      accent: '#C33A4A',
    },
  },
  event: {
    accident: { main: "#C33A4A", soft: "#FBE8EB" },
    construction: { main: "#B65D13", soft: "#FCEBDD" },
    congestion: { main: "#B77900", soft: "#FFF2CC" },
    control: { main: "#6657A6", soft: "#EEEAF8" },
    weather: { main: "#277DA1", soft: "#E2F1F7" },
    disaster: { main: "#8C3B72", soft: "#F6E6F0" },
    activity: { main: "#16825D", soft: "#DFF3EA" },
    hazard: { main: "#B54708", soft: "#FDE9DC" },
  },
  metric: {
    total: { main: "#B77900", soft: "#FFF2CC" },
    casualty: { main: "#C33A4A", soft: "#FBE8EB" },
    location: { main: "#0B7C74", soft: "#DDF3EF" },
  },
} as const;
