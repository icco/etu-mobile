import React from 'react';
import Svg, { Path } from 'react-native-svg';

// Navigation icons share a 24px grid, rounded ends, and a consistent stroke.
// SVG keeps their appearance consistent across platforms and display densities.
const outlinePaths = {
  timeline:
    'M5 7v3m0 4v3M7 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm0 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm0 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM11 5h10m-10 7h7m-7 7h10',
  random:
    'M3 7h2c4 0 10 10 14 10h2m-4-4 4 4-4 4M3 17h2c1.6 0 3.6-1.6 5.6-3.6m2.8-2.8C15.6 8.4 17.4 7 19 7h2m-4-4 4 4-4 4',
  search: 'M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Zm-1.9 4.6L21 21',
  settings:
    'M9.5 3h5l.5 2.8 2 1.2 2.7-1 2 3.4-2.2 1.8v1.6l2.2 1.8-2 3.4-2.7-1-2 1.2-.5 2.8h-5L9 18.2 7 17l-2.7 1-2-3.4 2.2-1.8v-1.6L2.3 9.4l2-3.4L7 7l2-1.2L9.5 3ZM15.25 12a3.25 3.25 0 1 1-6.5 0 3.25 3.25 0 0 1 6.5 0Z',
} as const;

const paths = {
  add: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z',
  image:
    'M3 3h18v18H3V3Zm2 2v14h14V5H5Zm1 12 4-5 3 4 2-3 3 4H6Zm9-10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  audio:
    'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm-1 3a1 1 0 0 1 2 0v7a1 1 0 0 1-2 0V5ZM5 10h2v2a5 5 0 0 0 10 0v-2h2v2a7 7 0 0 1-6 6.93V21h3v2H8v-2h3v-2.07A7 7 0 0 1 5 12v-2Z',
  close:
    'm6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z',
  filter: 'M3 5h18v2H3V5Zm3 6h12v2H6v-2Zm3 6h6v2H9v-2Z',
  chevron: 'm9 5 7 7-7 7-1.4-1.4 5.6-5.6-5.6-5.6L9 5Z',
} as const;

export type IconName = keyof typeof paths | keyof typeof outlinePaths;

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
      {name in outlinePaths ? (
        <Path
          d={outlinePaths[name as keyof typeof outlinePaths]}
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <Path
          d={paths[name as keyof typeof paths]}
          fill={color}
          fillRule="evenodd"
        />
      )}
    </Svg>
  );
}
