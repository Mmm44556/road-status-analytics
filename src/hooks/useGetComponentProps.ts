import { type ComponentType, type ComponentProps, useMemo } from "react";

/**
 * 取得組件的 props
 * @param props 組件的 props
 * @returns 組件的 props
 */
export default function useGetComponentProps<T extends ComponentType<any>>(
  props: Partial<ComponentProps<T>>
): Partial<ComponentProps<T>> {
  return useMemo(() => {
    return {
      ...props,
    };
  }, [props]);
}
