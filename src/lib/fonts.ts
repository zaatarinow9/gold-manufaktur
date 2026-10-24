import localFont from "next/font/local";

export const thmanyah = localFont({
  src: [
    {
      path: "../fonts/thmanyah-light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/thmanyah-regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/thmanyah-medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/thmanyah-semibold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/thmanyah-bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-thmanyah",
  display: "swap",
  preload: true,
  fallback: ["Tahoma", "Arial", "sans-serif"],
});
