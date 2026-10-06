import { telLink, waLink } from '@/lib/site/contact';
import { content } from './content';

const m = content.mbar;

export default function MobileBar() {
  return (
    <div className="mbar" role="navigation" aria-label="Quick contact">
      <a className="btn btn-wa" href={waLink('Hello, I need a car battery. Please send me a quote.')} target="_blank" rel="noopener">
        <svg className="ic" aria-hidden="true">
          <use href="#i-wa" />
        </svg>
        {m.whatsapp}
      </a>
      <a className="btn btn-solid" href={telLink()}>
        <svg className="ic" aria-hidden="true">
          <use href="#i-phone" />
        </svg>
        {m.call}
      </a>
    </div>
  );
}
