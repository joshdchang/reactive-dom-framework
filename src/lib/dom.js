// if effects were only to run once mounted to the DOM, could just return array of children from append children and then call recursively (first all effects called in element rendering, then all user created effects?)

import { Effect, Element } from './core.js'

function appendChildren(node, children) {

  const flattenedChildren = children.flat(Infinity)

  for (let child of flattenedChildren) {

    if (child instanceof Element) {
      node.appendChild(toNode(child))
    }
    else if (typeof child === 'function') {

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
          const newNodes = []
          for (const child of flattened) {
            if (child instanceof Element) {
              newNodes.push(toNode(child))
            }
            // function?
            else if (child !== undefined && child !== null) {
              newNodes.push(document.createTextNode(child))
            }
          }
          flattened.map(child => child instanceof Element ? toNode(child) : document.createTextNode(child))
          anchor.replaceWith(anchor, ...newNodes)
          lastArrayNodes = newNodes
        }
        else if (result instanceof Element) {
          anchor.replaceWith(toNode(result))
        }
        else if (result !== undefined && result !== null) {
          // check how this works? should I use innerText? check anchor node type?
          anchor.textContent = result
        } 
        else {
          // same as above
          anchor.textContent = ''
        }
      })
    }
    else if (child !== undefined && child !== null) {
      node.appendChild(document.createTextNode(child))
    }
  }
}

export function toNode(element) {
  if (element.node) {
    return element.node
  }
  element.node = document.createElement(element.tag)
  for (let attribute in element.attributes) {
    element.node[attribute] = element.attributes[attribute]
  }
  appendChildren(element.node, element.children)
  return element.node
}