import 'zone.js';
/* Side effect: extracted to blocks/header/header.css (aem loadCSS). */
import './header.component.scss';
import { decorateWithStandaloneComponent } from '../../shared/decorate-with-standalone-component';
import { HeaderComponent } from './header.component';

/**
 * Standard EDS block contract: default export decorate(block).
 */
export default async function decorate(block: HTMLElement) {
  await decorateWithStandaloneComponent(block, undefined, {
    component: HeaderComponent,
    hostClassName: 'header-block-host',
    passAuthoredHtml: false,
  });
}
