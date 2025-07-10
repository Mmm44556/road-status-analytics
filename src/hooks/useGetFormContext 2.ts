import { useFormContext } from "react-hook-form";
import type { SearchFormType } from "@/zod";

export function useGetSearchFormContext() {
  return useFormContext<SearchFormType>();
}
