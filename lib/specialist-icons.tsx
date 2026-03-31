import type { LucideProps } from "lucide-react";
import {
  Activity,
  Apple,
  Baby,
  Bone,
  Box,
  Brain,
  BrainCircuit,
  CircleHelp,
  Droplet,
  Droplets,
  Dumbbell,
  Ear,
  Eye,
  FlaskConical,
  Heart,
  HeartPulse,
  LineChart,
  MessageCircle,
  Mic,
  Pill,
  Radio,
  Salad,
  Scan,
  Scissors,
  Smile,
  SmilePlus,
  Sparkles,
  Stethoscope,
  Syringe,
  Thermometer,
  UserRound,
  Users,
  Venus,
  Wind,
  Zap,
} from "lucide-react";

/** Ключ → компонент иконки (для подписей в админке — см. SPECIALIST_ICON_LABELS) */
export const SPECIALIST_ICON_MAP = {
  activity: Activity,
  apple: Apple,
  baby: Baby,
  bone: Bone,
  box: Box,
  brain: Brain,
  brain_circuit: BrainCircuit,
  droplet: Droplet,
  droplets: Droplets,
  dumbbell: Dumbbell,
  ear: Ear,
  eye: Eye,
  flask_conical: FlaskConical,
  heart: Heart,
  heart_pulse: HeartPulse,
  line_chart: LineChart,
  message_circle: MessageCircle,
  mic: Mic,
  pill: Pill,
  radio: Radio,
  salad: Salad,
  scan: Scan,
  scissors: Scissors,
  smile: Smile,
  smile_plus: SmilePlus,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  syringe: Syringe,
  thermometer: Thermometer,
  user_round: UserRound,
  users: Users,
  venus: Venus,
  wind: Wind,
  zap: Zap,
} as const;

export type SpecialistIconKey = keyof typeof SPECIALIST_ICON_MAP;

export const SPECIALIST_ICON_KEYS = Object.keys(
  SPECIALIST_ICON_MAP,
) as SpecialistIconKey[];

export const SPECIALIST_ICON_LABELS: Record<SpecialistIconKey, string> = {
  activity: "Активность / ревматология",
  apple: "Яблоко / ЖКТ",
  baby: "Младенец / неонатология",
  bone: "Кость / ортопедия",
  box: "КТ / томография",
  brain: "Мозг / неврология",
  brain_circuit: "Психиатрия",
  droplet: "Капля / урология",
  droplets: "Почки",
  dumbbell: "ЛФК",
  ear: "Ухо / ЛОР",
  eye: "Глаз",
  flask_conical: "Анализы / эндокринология",
  heart: "Сердце",
  heart_pulse: "Пульс / кардиология",
  line_chart: "Диагностика",
  message_circle: "Консультация / психология",
  mic: "Слух / сурдология",
  pill: "Препараты",
  radio: "УЗИ / волны",
  salad: "Питание / диетология",
  scan: "МРТ / сканирование",
  scissors: "Хирургия",
  smile: "Улыбка / стоматология",
  smile_plus: "Стоматология",
  sparkles: "Косметология",
  stethoscope: "Терапия / фтизиатрия",
  syringe: "Инъекции",
  thermometer: "Температура",
  user_round: "Пациент",
  users: "Педиатрия",
  venus: "Гинекология",
  wind: "Дыхание / аллергология",
  zap: "Физиотерапия",
};

export function SpecialistIcon({
  iconKey,
  className,
  ...rest
}: { iconKey: string } & LucideProps) {
  const key = iconKey as SpecialistIconKey;
  const Cmp =
    key in SPECIALIST_ICON_MAP ? SPECIALIST_ICON_MAP[key] : CircleHelp;
  return <Cmp className={className} {...rest} />;
}

export function isValidSpecialistIconKey(k: string): k is SpecialistIconKey {
  return k in SPECIALIST_ICON_MAP;
}
