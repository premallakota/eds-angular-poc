/**
 * Typings for EDS runtime imports (see tsconfig path mapping + webpack alias).
 */
declare module '@eds/scripts/aem' {
  export function getMetadata(name: string, doc?: Document): string;
}

declare module '@eds/blocks/fragment' {
  export function loadFragment(path: string): Promise<HTMLElement | null>;
}
