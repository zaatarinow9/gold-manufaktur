import { Cormorant_Garamond, Inter } from "next/font/google";
import localFont from "next/font/local";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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
