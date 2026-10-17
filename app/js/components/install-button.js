// ══════════════════════════════════════════
// <install-button> — the app's own way to be installed
//
// Chrome's menu (⋮ → Install app) can wrongly say "This app is already installed" on Android
// while the page's own install prompt still works, so each app offers its own button.
// Hidden until the browser offers the prompt (Chrome, Edge, Samsung Internet); hidden again
// once the app is installed or opened as the installed app. Firefox and iPhone Safari never
// offer it: there the button stays hidden and the browser menu is the way.
// No styles of its own: the app styles it. Its text is the element's content.
//
//   <install-button>install</install-button>
//   <script type="module" src="js/components/install-button.js"></script>
// ══════════════════════════════════════════

let offer = null;
const buttons = new Set();
const installed = () => matchMedia('(display-mode: standalone)').matches;
const refresh = () => buttons.forEach(b => { b.hidden = !offer || installed(); });

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();               // keep the offer for the button instead of Chrome's own banner
  offer = e;
  refresh();
});

addEventListener('appinstalled', () => {
  offer = null;
  refresh();
});

class InstallButton extends HTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'button');
    this.tabIndex = 0;
    buttons.add(this);
    refresh();
    this.onclick = (e) => { e.stopPropagation(); this.install(); };
    this.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.install(); } };
  }

  disconnectedCallback() {
    buttons.delete(this);
  }

  async install() {
    if (!offer) return;
    const shown = offer;
    offer = null;                   // an offer can be shown only once
    refresh();
    await shown.prompt();
    const { outcome } = await shown.userChoice;
    this.dispatchEvent(new CustomEvent('install-choice', { detail: { outcome }, bubbles: true }));
  }
}

customElements.define('install-button', InstallButton);
