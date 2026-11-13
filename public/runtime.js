// Small standalone renderer for the original game's declarative UI.
// Bindings accept property paths only; no dynamic code evaluation is needed.
export class DCLogic {
  constructor() { this.props = {}; this.state = null; }
  setState(next) { this.state = {...this.state, ...next}; this.updateView?.(); }
}
const lookup = (expression, scope) => expression.trim().split('.').reduce((value, key) => value?.[key], scope);
const expression = value => value.match(/^\s*{{\s*(.*?)\s*}}\s*$/)?.[1];
const interpolate = (value, scope) => value.replace(/{{\s*(.*?)\s*}}/g, (_, key) => lookup(key, scope) ?? '');

export function mount(root, game) {
  function compile(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const template = node.textContent;
      return template.includes('{{') ? scope => { node.textContent = interpolate(template, scope); } : () => {};
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return () => {};
    if (node.localName === 'sc-for') {
      const key = expression(node.getAttribute('list'));
      const alias = node.getAttribute('as');
      const template = [...node.childNodes].map(child => child.cloneNode(true));
      node.replaceChildren();
      let rows = [];
      return scope => {
        const values = lookup(key, scope) || [];
        if (rows.length !== values.length) {
          node.replaceChildren();
          rows = values.map(() => {
            const children = template.map(child => child.cloneNode(true));
            node.append(...children);
            return children.map(compile);
          });
        }
        rows.forEach((updates, i) => updates.forEach(update => update({...scope, [alias]: values[i]})));
      };
    }
    const updates = [];
    for (const attr of [...node.attributes]) {
      if (!attr.value.includes('{{')) continue;
      if (attr.name === 'ref' || attr.name.startsWith('hint-')) { node.removeAttribute(attr.name); continue; }
      if (attr.name.startsWith('on')) {
        const key = expression(attr.value);
        node.removeAttribute(attr.name);
        let handler;
        node.addEventListener(attr.name.slice(2), event => handler?.(event));
        updates.push(scope => { handler = lookup(key, scope); });
      } else if (node.localName !== 'sc-if' || attr.name !== 'value') {
        updates.push(scope => node.setAttribute(attr.name, interpolate(attr.value, scope)));
      }
    }
    const children = [...node.childNodes].map(compile);
    const condition = node.localName === 'sc-if' ? expression(node.getAttribute('value')) : null;
    return scope => {
      if (condition) {
        const visible = Boolean(lookup(condition, scope));
        node.hidden = !visible;
        if (!visible) return;
      }
      updates.forEach(update => update(scope));
      children.forEach(update => update(scope));
    };
  }
  const update = compile(root);
  game.updateView = () => update(game.renderVals());
  game.updateView();
  game.componentDidMount();
  return () => game.componentWillUnmount();
}
