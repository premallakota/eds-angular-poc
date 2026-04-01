import {
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { getMetadata } from '@eds/scripts/aem';
import { loadFragment } from '@eds/blocks/fragment';

const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e: KeyboardEvent) {
  if (e.code !== 'Escape') return;
  const nav = document.getElementById('nav');
  if (!nav) return;
  const navSections = nav.querySelector('.nav-sections');
  if (!navSections) return;
  const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
  if (navSectionExpanded && isDesktop.matches) {
    toggleAllNavSections(navSections);
    (navSectionExpanded as HTMLElement).focus();
  } else if (!isDesktop.matches) {
    toggleMenu(nav, navSections);
    nav.querySelector('button')?.focus();
  }
}

function closeOnFocusLost(e: FocusEvent) {
  const nav = e.currentTarget as HTMLElement;
  if (nav.contains(e.relatedTarget as Node)) return;
  const navSections = nav.querySelector('.nav-sections');
  if (!navSections) return;
  const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
  if (navSectionExpanded && isDesktop.matches) {
    toggleAllNavSections(navSections, false);
  } else if (!isDesktop.matches) {
    toggleMenu(nav, navSections, false);
  }
}

function openOnKeydown(e: KeyboardEvent) {
  const focused = document.activeElement;
  if (!focused || !focused.classList.contains('nav-drop')) return;
  if (e.code !== 'Enter' && e.code !== 'Space') return;
  const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
  const sections = focused.closest('.nav-sections');
  if (sections) toggleAllNavSections(sections);
  focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
}

function focusNavSection(this: HTMLElement) {
  this.addEventListener('keydown', openOnKeydown);
}

function toggleAllNavSections(sections: Element | null, expanded: boolean | string = false) {
  if (!sections) return;
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', String(expanded));
  });
}

function toggleMenu(nav: HTMLElement, navSections: Element | null, forceExpanded: boolean | null = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, (expanded || isDesktop.matches) ? 'false' : 'true');
  if (button) {
    button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  }
  if (navSections) {
    const navDrops = navSections.querySelectorAll('.nav-drop');
    if (isDesktop.matches) {
      navDrops.forEach((drop) => {
        if (!drop.hasAttribute('tabindex')) {
          drop.setAttribute('tabindex', '0');
          drop.addEventListener('focus', focusNavSection);
        }
      });
    } else {
      navDrops.forEach((drop) => {
        drop.removeAttribute('tabindex');
        drop.removeEventListener('focus', focusNavSection);
      });
    }
  }

  if (!expanded || isDesktop.matches) {
    window.addEventListener('keydown', closeOnEscape);
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

let resizeHandler: (() => void) | undefined;

/** Remove resize listener and clear the host (for re-decorate / teardown). */
export function detachHeaderNav(host: HTMLElement) {
  if (resizeHandler) {
    isDesktop.removeEventListener('change', resizeHandler);
    resizeHandler = undefined;
  }
  host.replaceChildren();
}

/**
 * Port of blocks/header/header.js decorate(): load nav fragment, build DOM, wire menus.
 */
export async function initHeaderNav(host: HTMLElement) {
  detachHeaderNav(host);

  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location.href).pathname : '/nav';
  const fragment = await loadFragment(navPath);
  if (!fragment) return;

  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand?.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    const container = brandLink.closest('.button-container');
    if (container) (container as HTMLElement).className = '';
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const exp = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', exp ? 'false' : 'true');
        }
      });
    });
  }

  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  toggleMenu(nav, navSections, isDesktop.matches);
  resizeHandler = () => toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', resizeHandler);

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  host.append(navWrapper);
}

@Component({
  selector: 'app-header-block',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);

  ngOnInit(): void {
    void initHeaderNav(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    detachHeaderNav(this.el.nativeElement);
  }
}
