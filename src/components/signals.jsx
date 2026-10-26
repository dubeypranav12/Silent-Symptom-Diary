import { FiMic, FiSmartphone } from "react-icons/fi";
import { LuKeyboard } from "react-icons/lu";
import { METRICS } from "../lib/data.js";

/* One place that ties each signal to its icon, colour and check-in step. */
export const SIGNALS = {
  tremor: { ...METRICS.tremor, Icon: FiSmartphone, step: "motion" },
  speech: { ...METRICS.speech, Icon: FiMic, step: "voice" },
  typing: { ...METRICS.typing, Icon: LuKeyboard, step: "typing" }
};
