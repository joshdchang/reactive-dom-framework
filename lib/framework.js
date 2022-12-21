// TODO: improve attributes (e.g. class, style, etc.) and events (e.g. onclick, oninput, etc.)
// TODO: built in helper functions for loops, conditionals, etc.
// TODO: keep on refactoring renderer to be more extensible and efficient (allowing unsubscribing to things that are no longer needed, lifecycle hooks, etc.)
// TODO: refs as a way to access DOM nodes in effects
// TODO: render directly to strings (for SSR)
// TODO: hydration

const effectStack = []

class Signal {
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

class Effect {
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

class Element {
  constructor(tag, attributes, children) {
    this.tag = tag
    this.attributes = attributes
    this.children = children
    this.node = null
  }

  static appendChildren(node, children) {
    for (let child of children) {

      if (child instanceof Element) {
        node.appendChild(child.toNode())

      } else if (typeof child === 'function') {

        const anchor = document.createTextNode('')
        node.appendChild(anchor)
        let lastArrayNodes = []

        new Effect(() => {

          const result = child()

          for (const lastArrayNode of lastArrayNodes) {
            lastArrayNode.remove()
          }
          lastArrayNodes = []

          if (Array.isArray(result)) {

            const flattened = result.flat(Infinity)
            const newNodes = flattened.map(child => child instanceof Element ? child.toNode() : document.createTextNode(child))
            anchor.replaceWith(anchor, ...newNodes)
            lastArrayNodes = newNodes

          } else if (result instanceof Element) {
            const newNode = result.toNode()
            anchor.replaceWith(newNode)

          } else if (result !== undefined && result !== null) {
            anchor.textContent = result

          } else {
            anchor.textContent = ''
          }
        })
      } else if (Array.isArray(child)) {
        Element.appendChildren(node, child)

      } else if (child !== undefined && child !== null) {
        node.appendChild(document.createTextNode(child))
      }
    }
  }

  toNode() {
    if (this.node) {
      return this.node
    }
    this.node = document.createElement(this.tag)
    for (let attribute in this.attributes) {
      this.node[attribute] = this.attributes[attribute]
    }
    Element.appendChildren(this.node, this.children)
    return this.node
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
      if (Array.isArray(arg)) {
        children = arg
      } else if (typeof arg === 'object') {
        attributes = arg
      } else if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean' || typeof arg === 'function') {
        children.push(arg)
      }
    }
    if (args.length === 1) {
      if (Array.isArray(args[0])) {
        children = args[0]
      } else {
        attributes = args[0]
      }
    } else if (args.length === 2) {
      attributes = args[0]
      children = args[1]
    }
    return elem(elementName, attributes, children)
  }
}
