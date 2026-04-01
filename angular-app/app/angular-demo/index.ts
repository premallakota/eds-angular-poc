import 'zone.js';
/* Side effect: extracted to blocks/angular-demo/angular-demo.css (aem loadCSS). */
import './angular-demo.component.scss';
import { decorateWithStandaloneComponent } from '../../shared/decorate-with-standalone-component';
import { AngularDemoComponent } from './angular-demo.component';

/**
 * Standard EDS block contract: default export decorate(block).
 * aem.js loadBlock imports this module and calls await mod.default(block).
 */
export default async function decorate(block: HTMLElement) {
  await decorateWithStandaloneComponent(block, undefined, {
    component: AngularDemoComponent,
    hostClassName: 'angular-demo-host',
  });
}
