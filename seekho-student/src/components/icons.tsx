import React from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, G, ClipPath, Defs } from 'react-native-svg';
import { colors, fonts } from '../theme';

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

// ── Brand logo (raster wordmark from the web build) ─────────────────────
export function Logo({ height = 40 }: { height?: number }) {
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={{ height, width: height * (65 / 54), resizeMode: 'contain' }}
    />
  );
}

// ── Navigation / chrome ────────────────────────────────────────────────
export function BackArrow({ width = 22, height = 22, color = colors.textPrimary }: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 16 16" fill="none">
      <Path d="M3.825 9L9.425 14.6L8 16L0 8L8 0L9.425 1.4L3.825 7H16V9H3.825Z" fill={color} />
    </Svg>
  );
}

export function SettingsGear({ width = 32, height = 32, color = colors.textMuted }: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 32.3333 32.3333" fill="none">
      <Path
        d="M16.1667 20.1667C18.3758 20.1667 20.1667 18.3758 20.1667 16.1667C20.1667 13.9575 18.3758 12.1667 16.1667 12.1667C13.9575 12.1667 12.1667 13.9575 12.1667 16.1667C12.1667 18.3758 13.9575 20.1667 16.1667 20.1667Z"
        stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M26.0333 20.1667C25.8558 20.5688 25.8029 21.0149 25.8813 21.4475C25.9598 21.88 26.166 22.2791 26.4733 22.5933L26.5533 22.6733C26.8013 22.921 26.998 23.2151 27.1322 23.5388C27.2664 23.8626 27.3354 24.2096 27.3354 24.56C27.3354 24.9104 27.2664 25.2574 27.1322 25.5812C26.998 25.9049 26.8013 26.199 26.5533 26.4467C26.3057 26.6946 26.0116 26.8913 25.6878 27.0255C25.3641 27.1597 25.0171 27.2288 24.6667 27.2288C24.3162 27.2288 23.9692 27.1597 23.6455 27.0255C23.3218 26.8913 23.0277 26.6946 22.78 26.4467L22.7 26.3667C22.3858 26.0593 21.9866 25.8531 21.5541 25.7747C21.1216 25.6962 20.6755 25.7492 20.2733 25.9267C19.879 26.0957 19.5426 26.3763 19.3057 26.734C19.0688 27.0918 18.9417 27.511 18.94 27.94V28.1667C18.94 28.8739 18.659 29.5522 18.159 30.0523C17.6589 30.5524 16.9806 30.8333 16.2733 30.8333C15.5661 30.8333 14.8878 30.5524 14.3877 30.0523C13.8876 29.5522 13.6067 28.8739 13.6067 28.1667V28.0467C13.5963 27.6053 13.4535 27.1773 13.1967 26.8183C12.9399 26.4592 12.581 26.1857 12.1667 26.0333C11.7645 25.8558 11.3184 25.8029 10.8859 25.8813C10.4534 25.9598 10.0542 26.166 9.74 26.4733L9.66 26.5533C9.41234 26.8013 9.11824 26.998 8.79451 27.1322C8.47078 27.2664 8.12377 27.3354 7.77333 27.3354C7.42289 27.3354 7.07589 27.2664 6.75216 27.1322C6.42843 26.998 6.13433 26.8013 5.88667 26.5533C5.63873 26.3057 5.44204 26.0116 5.30784 25.6878C5.17364 25.3641 5.10457 25.0171 5.10457 24.6667C5.10457 24.3162 5.17364 23.9692 5.30784 23.6455C5.44204 23.3218 5.63873 23.0277 5.88667 22.78L5.96667 22.7C6.27405 22.3858 6.48025 21.9866 6.55867 21.5541C6.6371 21.1216 6.58415 20.6755 6.40667 20.2733C6.23765 19.879 5.95701 19.5426 5.59929 19.3057C5.24157 19.0688 4.82238 18.9417 4.39333 18.94H4.16667C3.45942 18.94 2.78115 18.659 2.28105 18.159C1.78095 17.6589 1.5 16.9806 1.5 16.2733C1.5 15.5661 1.78095 14.8878 2.28105 14.3877C2.78115 13.8876 3.45942 13.6067 4.16667 13.6067H4.28667C4.72799 13.5963 5.15601 13.4535 5.51507 13.1967C5.87412 12.9399 6.14762 12.581 6.3 12.1667C6.47749 11.7645 6.53043 11.3184 6.45201 10.8859C6.37358 10.4534 6.16738 10.0542 5.86 9.74L5.78 9.66C5.53206 9.41234 5.33537 9.11824 5.20117 8.79451C5.06698 8.47078 4.9979 8.12377 4.9979 7.77333C4.9979 7.42289 5.06698 7.07589 5.20117 6.75216C5.33537 6.42843 5.53206 6.13433 5.78 5.88667C6.02766 5.63873 6.32176 5.44204 6.64549 5.30784C6.96922 5.17364 7.31623 5.10457 7.66667 5.10457C8.01711 5.10457 8.36411 5.17364 8.68784 5.30784C9.01157 5.44204 9.30567 5.63873 9.55333 5.88667L9.63333 5.96667C9.94757 6.27405 10.3467 6.48025 10.7792 6.55867C11.2117 6.6371 11.6578 6.58415 12.06 6.40667H12.1667C12.561 6.23765 12.8974 5.95701 13.1343 5.59929C13.3712 5.24157 13.4983 4.82238 13.5 4.39333V4.16667C13.5 3.45942 13.781 2.78115 14.281 2.28105C14.7811 1.78095 15.4594 1.5 16.1667 1.5C16.8739 1.5 17.5522 1.78095 18.0523 2.28105C18.5524 2.78115 18.8333 3.45942 18.8333 4.16667V4.28667C18.835 4.71572 18.9622 5.1349 19.1991 5.49262C19.436 5.85034 19.7723 6.13098 20.1667 6.3C20.5688 6.47749 21.0149 6.53043 21.4475 6.45201C21.88 6.37358 22.2791 6.16738 22.5933 5.86L22.6733 5.78C22.921 5.53206 23.2151 5.33537 23.5388 5.20117C23.8626 5.06698 24.2096 4.9979 24.56 4.9979C24.9104 4.9979 25.2574 5.06698 25.5812 5.20117C25.9049 5.33537 26.199 5.53206 26.4467 5.78C26.6946 6.02766 26.8913 6.32176 27.0255 6.64549C27.1597 6.96922 27.2288 7.31623 27.2288 7.66667C27.2288 8.01711 27.1597 8.36411 27.0255 8.68784C26.8913 9.01157 26.6946 9.30567 26.4467 9.55333L26.3667 9.63333C26.0593 9.94757 25.8531 10.3467 25.7747 10.7792C25.6962 11.2117 25.7492 11.6578 25.9267 12.06V12.1667C26.0957 12.561 26.3763 12.8974 26.734 13.1343C27.0918 13.3712 27.511 13.4983 27.94 13.5H28.1667C28.8739 13.5 29.5522 13.781 30.0523 14.281C30.5524 14.7811 30.8333 15.4594 30.8333 16.1667C30.8333 16.8739 30.5524 17.5522 30.0523 18.0523C29.5522 18.5524 28.8739 18.8333 28.1667 18.8333H28.0467C27.6176 18.835 27.1984 18.9622 26.8407 19.1991C26.483 19.436 26.2023 19.7723 26.0333 20.1667Z"
        stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SendCircle({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52" fill="none">
      <Path d="M0 26C0 11.6406 11.6406 0 26 0C40.3594 0 52 11.6406 52 26C52 40.3594 40.3594 52 26 52C11.6406 52 0 40.3594 0 26Z" fill={colors.primary} />
      <Path d="M37.6745 13.0176L23.0078 29.5176M37.6745 13.0176L28.3411 43.0176L23.0078 29.5176M37.6745 13.0176L11.0078 23.5176L23.0078 29.5176" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function MicIcon({ width = 31, height = 40, color = colors.textPrimary }: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 31 40" fill="none">
      <Path d="M28.3077 16.3281V19.7827C28.3077 22.9894 26.9218 26.0647 24.455 28.3322C21.9882 30.5997 18.6425 31.8736 15.1538 31.8736M15.1538 31.8736C11.6652 31.8736 8.3195 30.5997 5.85267 28.3322C3.38585 26.0647 2 22.9894 2 19.7827V16.3281M15.1538 31.8736V38.7827M7.63736 38.7827H22.6703M15.1538 0.782654C13.6587 0.782654 12.2248 1.32859 11.1676 2.30037C10.1104 3.27215 9.51648 4.59017 9.51648 5.96447V19.7827C9.51648 21.157 10.1104 22.475 11.1676 23.4468C12.2248 24.4185 13.6587 24.9645 15.1538 24.9645C16.649 24.9645 18.0829 24.4185 19.1401 23.4468C20.1973 22.475 20.7912 21.157 20.7912 19.7827V5.96447C20.7912 4.59017 20.1973 3.27215 19.1401 2.30037C18.0829 1.32859 16.649 0.782654 15.1538 0.782654Z" stroke={color} strokeWidth={1.56532} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CameraIcon({ width = 48, height = 48, color = colors.textPrimary }: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 48 48" fill="none">
      <Path d="M46 38C46 39.0609 45.5786 40.0783 44.8284 40.8284C44.0783 41.5786 43.0609 42 42 42H6C4.93913 42 3.92172 41.5786 3.17157 40.8284C2.42143 40.0783 2 39.0609 2 38V16C2 14.9391 2.42143 13.9217 3.17157 13.1716C3.92172 12.4214 4.93913 12 6 12H14L18 6H30L34 12H42C43.0609 12 44.0783 12.4214 44.8284 13.1716C45.5786 13.9217 46 14.9391 46 16V38Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M24 34C28.4183 34 32 30.4183 32 26C32 21.5817 28.4183 18 24 18C19.5817 18 16 21.5817 16 26C16 30.4183 19.5817 34 24 34Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Ask-a-question mode tiles (blue-tint rounded square + glyph) ─────────
export function TypeSquare({ size = 53 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <Rect width={44} height={44} rx={8} fill={colors.primary} fillOpacity={0.15} />
      <Path d="M14 16.8125V14H29V16.8125M18.6875 29H24.3125M21.5 14V29" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function MicSquare({ size = 53 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 53 53" fill="none">
      <Rect width={52.8} height={52.8} rx={9.6} fill={colors.primary} fillOpacity={0.15} />
      <Path d="M37.1996 25.9629V28.7992C37.1996 31.4321 36.0618 33.9571 34.0364 35.8189C32.011 37.6806 29.2639 38.7265 26.3996 38.7265M26.3996 38.7265C23.5353 38.7265 20.7882 37.6806 18.7629 35.8189C16.7375 33.9571 15.5996 31.4321 15.5996 28.7992V25.9629M26.3996 38.7265V44.3992M20.2282 44.3992H32.571M26.3996 13.1992C25.172 13.1992 23.9947 13.6475 23.1267 14.4453C22.2587 15.2432 21.771 16.3254 21.771 17.4538V28.7992C21.771 29.9276 22.2587 31.0098 23.1267 31.8076C23.9947 32.6055 25.172 33.0538 26.3996 33.0538C27.6272 33.0538 28.8045 32.6055 29.6725 31.8076C30.5405 31.0098 31.0282 29.9276 31.0282 28.7992V17.4538C31.0282 16.3254 30.5405 15.2432 29.6725 14.4453C28.8045 13.6475 27.6272 13.1992 26.3996 13.1992Z" stroke={colors.primary} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CameraSquare({ size = 53 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <Rect width={44} height={44} rx={8} fill={colors.primary} fillOpacity={0.15} />
      <Path d="M33 29C33 29.5304 32.7893 30.0391 32.4142 30.4142C32.0391 30.7893 31.5304 31 31 31H13C12.4696 31 11.9609 30.7893 11.5858 30.4142C11.2107 30.0391 11 29.5304 11 29V18C11 17.4696 11.2107 16.9609 11.5858 16.5858C11.9609 16.2107 12.4696 16 13 16H17L19 13H25L27 16H31C31.5304 16 32.0391 16.2107 32.4142 16.5858C32.7893 16.9609 33 17.4696 33 18V29Z" stroke={colors.primary} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 27C24.2091 27 26 25.2091 26 23C26 20.7909 24.2091 19 22 19C19.7909 19 18 20.7909 18 23C18 25.2091 19.7909 27 22 27Z" stroke={colors.primary} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Eye({ width = 20, height = 20, color = colors.textMuted }: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 20 20" fill="none">
      <Path d="M0.833344 9.99999C0.833344 9.99999 4.16668 3.33333 10 3.33333C15.8333 3.33333 19.1667 9.99999 19.1667 9.99999C19.1667 9.99999 15.8333 16.6667 10 16.6667C4.16668 16.6667 0.833344 9.99999 0.833344 9.99999Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 9.99999C12.5 8.61928 11.3807 7.49999 10 7.49999C8.6193 7.49999 7.50001 8.61928 7.50001 9.99999C7.50001 11.3807 8.6193 12.5 10 12.5Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function EyeOff({ width = 20, height = 20, color = colors.textMuted }: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Pencil({ width = 24, height = 24, color = colors.textMuted }: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <G clipPath="url(#clipPencil)">
        <Path d="M22.94 1.05909C22.2602 0.380283 21.3387 -0.000976562 20.378 -0.000976562C19.4173 -0.000976562 18.4958 0.380283 17.816 1.05909L0 18.8751V23.9991H5.124L22.94 6.18309C23.6186 5.50311 23.9997 4.58172 23.9997 3.62109C23.9997 2.66046 23.6186 1.73906 22.94 1.05909ZM4.3 21.9991H2V19.6991L15.31 6.39909L17.61 8.69909L4.3 21.9991ZM21.526 4.76909L19.019 7.27609L16.724 4.97609L19.23 2.47309C19.535 2.16809 19.9487 1.99674 20.38 1.99674C20.8113 1.99674 21.225 2.16809 21.53 2.47309C21.835 2.77809 22.0063 3.19175 22.0063 3.62309C22.0063 4.05442 21.835 4.46809 21.53 4.77309L21.526 4.76909Z" fill={color} />
      </G>
      <Defs>
        <ClipPath id="clipPencil"><Rect width={24} height={24} fill="white" /></ClipPath>
      </Defs>
    </Svg>
  );
}

export function Zap({ width = 14, height = 15, color = '#FF7B00' }: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 13.3334 14.6667" fill="none">
      <Path d="M7.33334 0.666704L0.666675 8.6667H6.66667L6.00001 14L12.6667 6.00004H6.66667L7.33334 0.666704Z" stroke={color} strokeWidth={1.33333} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Trash({ width = 22, height = 22, color = colors.feedbackRed }: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2M10 11v6M14 11v6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Speaker({ width = 20, height = 20, color = colors.textPrimary }: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path d="M11 5L6 9H2v6h4l5 4V5z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PlayTriangle({ width = 14, height = 16, color = colors.textPrimary }: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 14 16" fill="none">
      <Path d="M1 1L13 8L1 15V1Z" fill={color} />
    </Svg>
  );
}

export function PlayCircle({ size = 30, color = colors.textMuted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <Circle cx={15} cy={15} r={14} stroke={color} strokeWidth={1.4} />
      <Path d="M12 10L20 15L12 20V10Z" fill={color} />
    </Svg>
  );
}

// ── Camera screen controls ──────────────────────────────────────────────
export function GalleryIcon({ size = 26, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={18} height={18} rx={2} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={8.5} cy={8.5} r={1.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 15l-5-5L5 21" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function FlipIcon({ size = 26, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 4v6h-6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M1 20v-6h6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Menu / list icons ───────────────────────────────────────────────────
export function RenameIcon({ size = 24, color = '#3A3A3A' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function DeleteIcon({ size = 24, color = '#3A3A3A' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h2h16" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 11v6M14 11v6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function LogOutIcon({ size = 26, color = '#3A3A3A' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 17l5-5-5-5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 12H9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Subject glyphs (white glyph on coloured rounded square) ──────────────
export function MathIcon({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 31 29" fill="none">
      <Rect width={31} height={29} rx={5} fill="#CE6161" />
      <Path d="M8.01562 14.543H22.0156M17.0156 8.54297C17.0156 9.64754 16.1202 10.543 15.0156 10.543C13.9111 10.543 13.0156 9.64754 13.0156 8.54297C13.0156 7.4384 13.9111 6.54297 15.0156 6.54297C16.1202 6.54297 17.0156 7.4384 17.0156 8.54297ZM17.0156 20.543C17.0156 21.6475 16.1202 22.543 15.0156 22.543C13.9111 22.543 13.0156 21.6475 13.0156 20.543C13.0156 19.4384 13.9111 18.543 15.0156 18.543C16.1202 18.543 17.0156 19.4384 17.0156 20.543Z" stroke="#FFFBF7" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ScienceIcon({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 31 29" fill="none">
      <Rect width={31} height={29} rx={5} fill="#FF5100" />
      <Path d="M16.6823 16.7202V9.21354C16.6823 8.77151 16.5067 8.34759 16.1941 8.03503C15.8816 7.72247 15.4577 7.54688 15.0156 7.54688C14.5736 7.54688 14.1497 7.72247 13.8371 8.03503C13.5246 8.34759 13.349 8.77151 13.349 9.21354V16.7202C12.8138 17.0778 12.4078 17.598 12.191 18.2039C11.9742 18.8099 11.958 19.4696 12.1448 20.0855C12.3316 20.7014 12.7116 21.2409 13.2285 21.6243C13.7455 22.0077 14.372 22.2146 15.0156 22.2146C15.6592 22.2146 16.2858 22.0077 16.8027 21.6243C17.3197 21.2409 17.6996 20.7014 17.8865 20.0855C18.0733 19.4696 18.0571 18.8099 17.8402 18.2039C17.6234 17.598 17.2174 17.0778 16.6823 16.7202Z" stroke="#FFFBF7" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IslamiyatIcon({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 31 29" fill="none">
      <Rect width={31} height={29} rx={5} fill="#4E00BA" />
      <Path d="M15.0156 10.8086C15.0156 9.94457 14.6724 9.11593 14.0614 8.50497C13.4505 7.89401 12.6218 7.55078 11.7578 7.55078H6.87109V19.7676H12.5723C13.2203 19.7676 13.8418 20.025 14.3 20.4832C14.7582 20.9414 15.0156 21.5629 15.0156 22.2109M15.0156 10.8086V22.2109M15.0156 10.8086C15.0156 9.94457 15.3589 9.11593 15.9698 8.50497C16.5808 7.89401 17.4094 7.55078 18.2734 7.55078H23.1602V19.7676H17.459C16.811 19.7676 16.1895 20.025 15.7313 20.4832C15.273 20.9414 15.0156 21.5629 15.0156 22.2109" stroke="#FFFBF7" strokeWidth={1.62891} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SocialIcon({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 31 29" fill="none">
      <Rect width={31} height={29} rx={5} fill="#D6CB01" />
      <Path d="M22.668 14.8809C22.668 18.927 19.3879 22.207 15.3418 22.207M22.668 14.8809C22.668 10.8347 19.3879 7.55469 15.3418 7.55469M22.668 14.8809H8.01562M15.3418 22.207C11.2957 22.207 8.01562 18.927 8.01562 14.8809M15.3418 22.207C17.1743 20.2009 18.2157 17.5974 18.2723 14.8809C18.2157 12.1643 17.1743 9.56085 15.3418 7.55469M15.3418 22.207C13.5093 20.2009 12.4679 17.5974 12.4113 14.8809C12.4679 12.1643 13.5093 9.56085 15.3418 7.55469M8.01562 14.8809C8.01562 10.8347 11.2957 7.55469 15.3418 7.55469" stroke="#FFFBF7" strokeWidth={1.46523} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Read-aloud pill (green pill + speaker + label), rebuilt from the SVG ──
export function ReadAloudPill({ label, active = true }: { label: string; active?: boolean }) {
  return (
    <View style={[pillStyles.pill, !active && pillStyles.pillOff]}>
      <Speaker width={20} height={20} color={colors.textPrimary} />
      <Text style={pillStyles.label}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 39,
    paddingHorizontal: 18,
    borderRadius: 19,
    backgroundColor: 'rgba(42, 242, 139, 0.15)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillOff: {
    backgroundColor: 'rgba(161, 161, 161, 0.12)',
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.textPrimary,
    lineHeight: 24,
  },
});
