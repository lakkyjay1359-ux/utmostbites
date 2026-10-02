import chapati from "@/assets/food/chapati.jpg";
import mandazi from "@/assets/food/mandazi.jpg";
import samosa from "@/assets/food/samosa.jpg";
import samosaMeat from "@/assets/food/samosa-meat.jpg";
import kebab from "@/assets/food/kebab.jpg";
import smokies from "@/assets/food/smokies.jpg";
import eggs from "@/assets/food/eggs.jpg";
import smocha from "@/assets/food/smocha.jpg";
import tea from "@/assets/food/tea.jpg";
import chips from "@/assets/food/chips.jpg";
import friedChicken from "@/assets/food/fried-chicken.jpg";
import rawChicken from "@/assets/food/raw-chicken.jpg";
import beans from "@/assets/food/beans.jpg";
import smoothie from "@/assets/food/smoothie.jpg";
import comboMorning from "@/assets/food/combo-morning.jpg";
import comboEvening from "@/assets/food/combo-evening.jpg";
import hero from "@/assets/food/hero.jpg";

export const IMAGES: Record<string, string> = {
  chapati, mandazi, samosa, "samosa-meat": samosaMeat, kebab, smokies, eggs, smocha,
  tea, chips, "fried-chicken": friedChicken, "raw-chicken": rawChicken, beans, smoothie,
  "combo-morning": comboMorning, "combo-evening": comboEvening, hero,
};

export const IMAGE_KEYS = Object.keys(IMAGES).filter((k) => k !== "hero");

export const imageFor = (key?: string | null) => (key && IMAGES[key]) || hero;
