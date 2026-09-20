import React from 'react';
import Svg, { Path } from 'react-native-svg';

// Material Symbols, outlined, 24px. SVG avoids platform-dependent font glyphs.
const paths = {
  timeline:
    'M4 3h16v18H4V3Zm2 2v14h12V5H6Zm2 2h8v2H8V7Zm0 4h8v2H8v-2Zm0 4h5v2H8v-2Z',
  add: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z',
  random:
    'm17 3 4 4-4 4V8h-2.5l-9 12H3L13.5 6H17V3ZM3 4h2.5l4 5.3-1.3 1.8L3 4Zm9.8 8.9 1.7 2.1H17v-3l4 4-4 4v-3h-3.5l-2-2.7 1.3-1.8Z',
  search:
    'M9.5 3a6.5 6.5 0 1 0 4.54 11.15L20 20l1-1-5.85-5.96A6.5 6.5 0 0 0 9.5 3Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z',
  settings:
    'm9 2-.5 3-2 1.2L3.7 5.1l-2 3.5L4 10.5v3l-2.3 1.9 2 3.5 2.8-1.1 2 1.2.5 3h6l.5-3 2-1.2 2.8 1.1 2-3.5-2.3-1.9v-3l2.3-1.9-2-3.5-2.8 1.1-2-1.2L15 2H9Zm1.7 2h2.6l.4 2.3 3.6 2.1 2.1-.8.8 1.4-1.8 1.5v5l1.8 1.5-.8 1.4-2.1-.8-3.6 2.1-.4 2.3h-2.6l-.4-2.3-3.6-2.1-2.1.8-.8-1.4 1.8-1.5v-5L3.8 9l.8-1.4 2.1.8 3.6-2.1.4-2.3ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z',
  image:
    'M3 3h18v18H3V3Zm2 2v14h14V5H5Zm1 12 4-5 3 4 2-3 3 4H6Zm9-10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  audio:
    'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm-1 3a1 1 0 0 1 2 0v7a1 1 0 0 1-2 0V5ZM5 10h2v2a5 5 0 0 0 10 0v-2h2v2a7 7 0 0 1-6 6.93V21h3v2H8v-2h3v-2.07A7 7 0 0 1 5 12v-2Z',
  close:
    'm6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z',
  filter: 'M3 5h18v2H3V5Zm3 6h12v2H6v-2Zm3 6h6v2H9v-2Z',
  chevron: 'm9 5 7 7-7 7-1.4-1.4 5.6-5.6-5.6-5.6L9 5Z',
} as const;

export type IconName = keyof typeof paths;

export default function Icon({
  name,
  color,
  size = 24,
}: {
  name: IconName;
  color: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d={paths[name]} fill={color} fillRule="evenodd" />
    </Svg>
  );
}
