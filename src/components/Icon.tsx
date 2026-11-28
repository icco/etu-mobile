import React from 'react';
import {
  ChevronRight,
  Image,
  ListFilter,
  ListTree,
  Mic,
  Pencil,
  Plus,
  Search,
  Settings,
  Shuffle,
  Tag,
  X,
  type LucideIcon,
} from 'lucide-react-native';

const icons = {
  timeline: ListTree,
  random: Shuffle,
  search: Search,
  settings: Settings,
  add: Plus,
  edit: Pencil,
  image: Image,
  audio: Mic,
  close: X,
  tag: Tag,
  filter: ListFilter,
  chevron: ChevronRight,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export default function Icon({
  name,
  color,
  size = 24,
}: {
  name: IconName;
  color: string;
  size?: number;
}) {
  const Glyph = icons[name];
  return <Glyph color={color} size={size} accessible={false} />;
}
