// TODO: improve attributes (e.g. class, style, etc.) and events (e.g. onclick, oninput, etc.) (make into signals? or just allow them to be signals)
// TODO: add functions to dynamic renderer (just pass it back as a one element array)
// TODO: make function that takes in array of strings and returns object with functions for each string
// TODO: separate out the renderer from the framework
// TODO: keep on refactoring renderer to be more extensible and efficient (DucumentFragment? promises? )
// TODO: unsubscribing and lifecycle hooks
// TODO: refs as a way to access DOM nodes in effects
// TODO: router
// TODO: render directly to strings (for SSR)
// TODO: hydration

const effectStack = []

export class Signal {
  constructor(initialValue) {
    this.value = initialValue
    this.listeners = new Set()
  }
  set(newValue) {
    this.value = newValue
    this.listeners.forEach(listener => listener())
  }
  get() {
    if (effectStack.length > 0) {
      effectStack[effectStack.length - 1].addDep(this)
    }
    return this.value
  }
  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener) // unsubscribe
  }
}

export class Effect {
  constructor(fn) {
    effectStack.push(this)
    this.fn = fn
    this.fn()
    effectStack.pop()
  }
  run() {
    this.fn()
  }
  addDep(dep) {
    dep.subscribe(() => this.run())
  }
}

export class Element {
  constructor(tag, attributes, children) {
    this.tag = tag
    this.attributes = attributes
    this.children = children
    this.node = null
  }
}

export function t_(strings, ...values) {
  const collection = []
  for (let i = 0; i < strings.length; i++) {
    collection.push(strings[i])
    if (i < values.length) {
      collection.push(values[i])
    }
  }
  return collection
}

export function elem(tag = 'div', attributes = {}, children = []) {
  return new Element(tag, attributes, children)
}

export function createSignal(value) {
  const signal = new Signal(value)
  return [() => signal.get(), (value) => signal.set(value)]
}

export function createEffect(fn) {
  return new Effect(fn)
}

export function createMemo(fn) {
  let value
  const [get, set] = createSignal()
  createEffect(() => {
    value = fn()
    set()
  })
  return () => {
    get()
    return value
  }
}

const elementNames = ['html', 'base', 'head', 'link', 'meta', 'style', 'title', 'body', 'address', 'article', 'aside', 'footer', 'header', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hgroup', 'main', 'nav', 'section', 'div', 'dd', 'dl', 'dt', 'figcaption', 'figure', 'hr', 'li', 'main', 'ol', 'p', 'pre', 'ul', 'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'mark', 'q', 'rb', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr', 'area', 'audio', 'img', 'map', 'track', 'video', 'embed', 'object', 'param', 'source', 'canvas', 'noscript', 'script', 'del', 'ins', 'caption', 'col', 'colgroup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'button', 'datalist', 'fieldset', 'form', 'input', 'label', 'legend', 'meter', 'optgroup', 'option', 'output', 'progress', 'select', 'textarea', 'details', 'dialog', 'menu', 'menuitem', 'summary', 'content', 'element', 'shadow', 'template', 'blockquote', 'iframe', 'tfoot']
export const elements = {}
for (let elementName of elementNames) {
  elements[elementName] = function (...args) {
    let attributes = {}
    let children = []
    for (let arg of args) {
      if (typeof arg === 'object') {
        if (Array.isArray(arg) || arg instanceof Element) {
          children.push(arg)
        }
        else {
          attributes = arg
        }
      }
      else {
        children.push(arg)
      }
    }
    return elem(elementName, attributes, children)
  }
}
