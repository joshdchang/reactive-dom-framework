
// TODO! unsubscribing - this will be hard to do with the current implementation (lifecycle hooks?) (weakmap?) (unsubscribe function propagation?)
// TODO: test all the functionality of this
// TODO? keep on refactoring renderer to be more extensible and efficient (DucumentFragment? promises? )

import { Effect, Element } from './core'

const renderEffects = []
function addRenderEffect(effect) {
  renderEffects.push(effect)
  if (Effect.mounted) {
    effect.activate()
  }
}

function templateListener(template, callback) {

  const output = []
  let containsFunction = false

  for (const part of template.flat(Infinity)) {
    if (typeof part === 'function') {

      containsFunction = true

      const placeholder = []
      output.push(placeholder)

      addRenderEffect(new Effect(() => {
        const result = part()
        if (Array.isArray(result)) {
          placeholder.splice(0, placeholder.length, ...result)
        }
        else {
          placeholder.length = 0
          placeholder[0] = result
        }
        callback(output.flat(Infinity).join(''))
      }))
    }
    else {
      output.push(part)
    }
  }
  if (!containsFunction) {
    addRenderEffect(new Effect(() => {
      callback(output.flat(Infinity).join(''))
    }))
  }
  return output.flat(Infinity).join('')
}

function classNameListener(value, callback) {

  // TODO: test all the functionality of this

  function flattenExceptTemplates(array) {
    const output = []
    for (const part of array) {
      if (part.isTemplate) {
        output.push(part)
      }
      else if (Array.isArray(part)) {
        output.push(...flattenExceptTemplates(part))
      }
      else {
        output.push(part)
      }
    }
    return output
  }

  const input = flattenExceptTemplates([value])
  const output = []

  let containsFunction = false

  for (const part of input) {
    if (part.isTemplate) {

      containsFunction = true
      const placeholder = []
      output.push(placeholder)

      templateListener(part, (result) => {
        placeholder.splice(0, placeholder.length, result)
        callback(output)
      })
    }
    else if (typeof part === 'function') {
      
      containsFunction = true
      const placeholder = []
      output.push(placeholder)

      addRenderEffect(new Effect(() => {
        const result = part()
        if (result.isTemplate) {
          placeholder.splice(0, placeholder.length, templateListener(result))
        }
        else if (Array.isArray(result)) {
          placeholder.splice(0, placeholder.length, ...result)
        }
        else if (typeof result === 'object' && result !== null) {
          placeholder.splice(0, placeholder.length, ...Object.keys(result).filter(className => result[className]))
        }
        else {
          placeholder.length = 0
          placeholder[0] = result
        }
        callback(output)
      }))
    }
    else if (typeof part === 'object' && part !== null) {
      for (const className of Object.keys(part)) {
        if (typeof part[className] === 'function') {
          containsFunction = true
          const placeholder = []
          output.push(placeholder)

          addRenderEffect(new Effect(() => {
            if (part[className]()) {
              placeholder.splice(0, placeholder.length, className)
            } else {
              placeholder.length = 0
            }
            callback(output)
          }))
        }
        else if (part[className]) {
          output.push(className)
        }
      }
    }
    else if (part) {
      output.push(part)
    }
  }
  if (!containsFunction) {
    addRenderEffect(new Effect(() => {
      callback(output)
    }))
  }
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
  else if (attribute === 'class') {
    classNameListener(value, (result) => {
      element.node.setAttribute(attribute, result.flat(Infinity).join(' '))
    })
  }
  else if (typeof value === 'function') {
    addRenderEffect(new Effect(() => {
      element.node.removeAttribute(attribute)
      renderAttribute(element, attribute, value())
    }))
  }
  else if (attribute === 'style' && typeof value === 'object') {

    // TODO: this needs to be tested

    const style = value
    for (let styleAttribute of Object.keys(style)) {
      if (typeof style[styleAttribute] === 'function') {
        addRenderEffect(new Effect(() => {
          element.node.style[styleAttribute] = style[styleAttribute]()
        }))
      }
      else {
        element.node.style[styleAttribute] = style[styleAttribute]
      }
    }
  }
  else if (attribute === 'bind' && Array.isArray(value)) {

    // TODO: this needs to be tested

    const [get, set] = value
    addRenderEffect(new Effect(() => {
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
      templateListener(value, (result) => {
        element.node.setAttribute(attribute, result)
      })
    } else {
      element.node.setAttribute(attribute, value.toString())
    }
  }
}

function childrenToNodes(children) {

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

      addRenderEffect(new Effect(() => {

        const result = child()

        for (const lastArrayNode of lastArrayNodes) {
          lastArrayNode.remove()
        }
        lastArrayNodes = []

        if (Array.isArray(result)) {
          const newNodes = childrenToNodes(result)
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

function renderElement(element) {
  // TODO: test if this will this work if element is reused in different places?
  if (element.node) {
    return element.node
  }

  element.node = document.createElement(element.tag)

  for (let attribute of Object.keys(element.attributes)) {
    renderAttribute(element, attribute, element.attributes[attribute])
  }

  const childNodes = childrenToNodes(element.children)
  for (const childNode of childNodes) {
    element.node.appendChild(childNode)
  }

  return element.node
}

export function render(rootElement, mountPoint) {
  const root = renderElement(rootElement)
  mountPoint.replaceWith(root)

  for (const effect of renderEffects) {
    effect.activate()
  }
  for (const effect of Effect.custom) {
    effect.activate()
  }
  Effect.mounted = true
}