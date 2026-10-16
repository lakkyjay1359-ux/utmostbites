import chapati from "@/assets/food/chapati.webp";
import mandazi from "@/assets/food/mandazi.webp";
import samosa from "@/assets/food/samosa.webp";
import samosaMeat from "@/assets/food/samosa-meat.webp";
import kebab from "@/assets/food/kebab.webp";
import smokies from "@/assets/food/smokies.webp";
import eggs from "@/assets/food/eggs.webp";
import smocha from "@/assets/food/smocha.webp";
import tea from "@/assets/food/tea.webp";
import chips from "@/assets/food/chips.webp";
import friedChicken from "@/assets/food/fried-chicken.webp";
import rawChicken from "@/assets/food/raw-chicken.webp";
import beans from "@/assets/food/beans.webp";
import smoothie from "@/assets/food/smoothie.webp";
import comboMorning from "@/assets/food/combo-morning.webp";
import comboEvening from "@/assets/food/combo-evening.webp";
import hero from "@/assets/food/hero.webp";
import rolex from "@/assets/food/rolex.webp";

export const IMAGES: Record<string, string> = {
  chapati, mandazi, samosa, "samosa-meat": samosaMeat, kebab, smokies, eggs, smocha,
  tea, chips, "fried-chicken": friedChicken, "raw-chicken": rawChicken, beans, smoothie,
  "combo-morning": comboMorning, "combo-evening": comboEvening, rolex, hero,
};

export const IMAGE_KEYS = Object.keys(IMAGES).filter((k) => k !== "hero");

export const imageFor = (key?: string | null) => (key && IMAGES[key]) || hero;
