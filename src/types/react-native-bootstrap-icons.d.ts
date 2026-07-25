declare module 'react-native-bootstrap-icons' {
  import { ComponentType } from 'react';
  import { ViewStyle } from 'react-native';

  export interface IconProps {
    width?: number;
    height?: number;
    fill?: string;
    color?: string;
    style?: ViewStyle;
  }

  export const Search: ComponentType<IconProps>;
  export const Funnel: ComponentType<IconProps>;
  export const Grid3x3GapFill: ComponentType<IconProps>;
  export const ListUl: ComponentType<IconProps>;
  export const ChevronRight: ComponentType<IconProps>;
  export const XLg: ComponentType<IconProps>;
  export const EyeFill: ComponentType<IconProps>;
  export const PencilFill: ComponentType<IconProps>;
  export const TrashFill: ComponentType<IconProps>;
  export const CheckCircleFill: ComponentType<IconProps>;
  export const XCircleFill: ComponentType<IconProps>;
  export const ClockFill: ComponentType<IconProps>;
  export const CalendarEvent: ComponentType<IconProps>;
  export const PersonFill: ComponentType<IconProps>;
  export const CurrencyDollar: ComponentType<IconProps>;
  export const BoxSeam: ComponentType<IconProps>;
  export const ThreeDotsVertical: ComponentType<IconProps>;
}
