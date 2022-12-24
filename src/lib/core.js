
// TODO: router
// TODO: render directly to strings (for SSR)
// TODO: hydration

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
    if (Effect.stack.length > 0) {
      this.listeners.add(Effect.stack[Effect.stack.length - 1].run)
    }
    return this.value
  }
  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener) // unsubscribe
  }
}

export class Effect {
  constructor(run) {
    this.run = run
  }
  static stack = []
  static custom = []
  static mounted = false
  activate() {
    Effect.stack.push(this)
    this.run()
    Effect.stack.pop()
  }
}

export class Element {
  constructor(tag, attributes, children) {
    this.tag = tag
    this.attributes = attributes
    this.children = children
    this.node = null
    this.effects = []
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
  collection.isTemplate = true
  return collection
}

export function elem(tag, attributes = {}, children = []) {
  return new Element(tag, attributes, children)
}

export function createSignal(value) {
  const signal = new Signal(value)
  return [() => signal.get(), (value) => signal.set(value)]
}

export function createEffect(fn) {
  const effect = new Effect(fn)
  if (Effect.mounted) {
    effect.activate()
  } else {
    Effect.custom.push(effect)
  }
  return effect
}

// not sure this will render properly with new rendering system or SSR - maybe make into its own Memo class?
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

export function createTags(elementNames) {
  const elements = {}
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
  return elements
}