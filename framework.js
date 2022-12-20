
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
    return this.value
  }

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener) // unsubscribe
  }
}

class Template {
  constructor(template, ...values) {
    this.template = template
    this.values = values
    this.deps = []
    for (let i = 0; i < values.length; i++) {
      if (values[i] instanceof Signal) {
        this.deps.push(values[i])
      }
    }
  }

  render() {
    let str = ''
    for (let i = 0; i < this.values.length; i++) {
      str += this.template[i]
      if (this.values[i] instanceof Signal) {
        str += this.values[i].get()
      } else {
        str += this.values[i]
      }
    }
    return str + this.template[this.template.length - 1]
  }
}

class Effect {
  constructor(fn, deps) {
    this.fn = fn
    for (let dep of deps) {
      dep.subscribe(() => this.run())
    }
  }

  run() {
    this.fn()
  }
}

class Element {
  constructor(tag, props, children) {
    this.tag = tag
    this.props = props
    this.children = children
  }

  mount() {
    const element = document.createElement(this.tag)
    for (let prop in this.props) {
      element[prop] = this.props[prop]
    }
    for (let child of this.children) {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child))
        continue
      }
      if (child instanceof Signal) {
        new Effect(() => {
          element.textContent = child.get()
        }, [child])
        continue
      }
      if (child instanceof Template) {
        new Effect(() => {
          element.textContent = child.render()
        }, child.deps)
        continue
      }
      element.appendChild(child.mount())
    }
    return element
  }
}

function t(strings, ...values) {
  return new Template(strings, ...values)
}

function e(tag, props, ...children) {
  return new Element(tag, props, children)
}

let count = new Signal(0)

let test = t`Hello ${count}`

count.set(1)

console.log(test.render())

count.set(2)

console.log(test.render())