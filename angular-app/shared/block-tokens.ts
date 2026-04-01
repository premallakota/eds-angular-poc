import { InjectionToken } from '@angular/core';

/**
 * HTML string from the EDS block element immediately before Angular replaces its children
 * (same nodes you would read in `decorate(block)` in a vanilla block).
 */
export const EDS_BLOCK_HTML = new InjectionToken<string>('EDS_BLOCK_HTML');
