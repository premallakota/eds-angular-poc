import { Component, computed, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { EDS_BLOCK_HTML } from '../../shared/block-tokens';

const DEFAULT_HEADING = 'Angular EDS block';

@Component({
  selector: 'angular-demo-root',
  standalone: true,
  templateUrl: './angular-demo.component.html',
  styleUrl: './angular-demo.component.scss',
})
export class AngularDemoComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly authoredHtml = inject(EDS_BLOCK_HTML, { optional: true });

  /** First `<p>` text in authored markup, or default when missing. */
  readonly authoredHeading = computed(() => {
    const raw = this.authoredHtml?.trim();
    if (!raw) return DEFAULT_HEADING;
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    const text = doc.body.querySelector('p')?.textContent?.trim();
    return text || DEFAULT_HEADING;
  });

  /** Remaining authored markup after the first `<p>` is removed (avoids duplicating the heading). */
  readonly safeAuthoredBody = computed(() => {
    const raw = this.authoredHtml?.trim();
    if (!raw) return null;
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    const firstP = doc.body.querySelector('p');
    if (firstP) {
      firstP.remove();
    }
    const inner = doc.body.innerHTML.trim();
    if (!inner) return null;
    return this.sanitizer.bypassSecurityTrustHtml(inner);
  });
}
