// TODO: it probably makes sense to create some sort of generalized function that takes in the template literal and a callback and calls the callback with the full string when updated.

// TODO: unsubscribing (or at least pausing when not rendered) and lifecycle hooks
// TODO: keep on refactoring renderer to be more extensible and efficient (DucumentFragment? promises? )

import { Effect, Element } from './core'

function childrenToNodes(element, children) {

  const flattenedChildren = children.flat(Infinity)
  const nodes = []

  for (let child of flattenedChildren) {
    if (child instanceof Element) {
      nodes.push(renderElement(child))
    }
    else if (typeof child === 'function') {

      const anchor = document.createTextNode('')
      nodes.push(anchor)
      let lastArrayNodes = []

      element.effects.push(new Effect(() => {

        const result = child()

        for (const lastArrayNode of lastArrayNodes) {
          lastArrayNode.remove()
        }
        lastArrayNodes = []

        if (Array.isArray(result)) {
          const newNodes = childrenToNodes(element, result)
          anchor.after(...newNodes)
          lastArrayNodes = newNodes
        }
        else if (result instanceof Element) {
          anchor.replaceWith(renderElement(result))
        }
        else if (result !== undefined && result !== null) {
          anchor.textContent = result
        }
        else {
          anchor.textContent = ''
        }
      }))
    }
    else if (child !== undefined && child !== null) {
      nodes.push(document.createTextNode(child))
    }
  }
  return nodes
}

function renderClass(element, value) {

  // TODO: keep a list of classes with element and only add/remove the ones that changed
  // TODO? support template literals (this will require some way of identifying them from a normal array, which is probably good anyway)
  
  if (Array.isArray(value)) {
    for (const item of value.flat(Infinity)) {
      renderClass(element, item)
    }
  }
  else if (typeof value === 'function') {
    element.effects.push(new Effect(() => {
      renderClass(element, value())
    }))
  }
  else if (typeof value === 'object' && value !== null) {
    for (const className of Object.keys(value)) {
      if (typeof value[className] === 'function') {
        element.effects.push(new Effect(() => {
          if (value[className]()) {
            for (const singleClass of className.toString().split(' ')) {
              element.node.classList.add(singleClass)
            }
          }
          else {
            for (const singleClass of className.toString().split(' ')) {
              element.node.classList.remove(singleClass)
            }
          }
        }))
      }
      else if (value[className]) {
        for (const singleClass of className.toString().split(' ')) {
          element.node.classList.add(singleClass)
        }
      }
      else {
        for (const singleClass of className.toString().split(' ')) {
          element.node.classList.remove(singleClass)
        }
      }
    }
  }
  else {
    for (const singleClass of value.toString().split(' ')) {
      element.node.classList.add(singleClass)
    }
  }
  // TODO? lots of repition here, maybe a helper function?
}

function renderAttribute(element, attribute, value) {

  if (attribute === 'htmlFor') {
    attribute = 'for'
  }
  if (attribute === 'className') {
    attribute = 'class'
  }

  if (attribute.split('_')[0] === 'on') {
    element.node.addEventListener(attribute.split('_')[1], value)
  }
  else if (attribute === 'ref') {
    // TODO: this needs to be tested
    value(element.node)
  }
  else if (typeof value === 'function') {
    element.effects.push(new Effect(() => {
      element.node.removeAttribute(attribute)
      renderAttribute(element, attribute, value())
    }))
  }
  else if (attribute === 'class') {
    renderClass(element, value)
  }
  else if (attribute === 'style' && typeof value === 'object') {

    // TODO: this needs to be tested

    const style = value
    for (let styleAttribute of Object.keys(style)) {
      if (typeof style[styleAttribute] === 'function') {
        element.effects.push(new Effect(() => {
          element.node.style[styleAttribute] = style[styleAttribute]()
        }))
      }
      else {
        element.node.style[styleAttribute] = style[styleAttribute]
      }
    }
  }
  else if (attribute === 'bind' && Array.isArray(value)) {
    const [get, set] = value
    element.effects.push(new Effect(() => {
      element.node.value = get()
    }))
    element.node.addEventListener('input', () => {
      set(element.node.value)
    })
  }
  else if (typeof value === 'boolean') {
    if (value) {
      element.node.setAttribute(attribute, '')
    }
    else {
      element.node.removeAttribute(attribute)
    }
  }
  else if (typeof value === 'undefined' || value === null) {
    element.node.removeAttribute(attribute)
  }
  else {
    if (Array.isArray(value)) {

      // TODO: support template literals (evaluated as arrays) for normal attributes

    } else {
      element.node.setAttribute(attribute, value.toString())
    }
  }
}

export function renderElement(element) {
  // TODO: test if this will this work if element is reused in different places?
  if (element.node) {
    return element.node
  }

  element.node = document.createElement(element.tag)

  for (let attribute of Object.keys(element.attributes)) {
    renderAttribute(element, attribute, element.attributes[attribute])
  }

  const childNodes = childrenToNodes(element, element.children)
  for (const childNode of childNodes) {
    element.node.appendChild(childNode)
  }

  for (let effect of element.effects) {
    effect.activate()
  }
  return element.node
}

export function render(rootElement, mountPoint) {
  const root = renderElement(rootElement)
  mountPoint.replaceWith(root)
  for (const effect of Effect.custom) {
    effect.activate()
  }
  Effect.custom = []
  Effect.mounted = true
}