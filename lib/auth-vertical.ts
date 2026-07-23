import { VERTICAL_IDS, type VerticalId } from "@/lib/types";

export function getAuthReturnVertical(nextPath: string): VerticalId | undefined {
  try {
    const url = new URL(nextPath, "https://haab.local");
    const vertical = url.searchParams.get("vertical");

    return VERTICAL_IDS.find((candidate) => candidate === vertical);
  } catch {
    return undefined;
  }
}
