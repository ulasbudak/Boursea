import type { Locale } from "../locale";
import type { Messages } from "../types";
import { en } from "./en";
import { tr } from "./tr";

export const messages: Record<Locale, Messages> = { en, tr };
