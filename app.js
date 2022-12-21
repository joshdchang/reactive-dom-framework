
import { createSignal, elements } from './lib/framework'
const { div, button } = elements

const [count, setCount] = createSignal(0)
const [arr, setArr] = createSignal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

function increment() {
  setCount(count() + 1)
  setArr(arr().map(item => item + 1))
}

export default function() {
  return (
    div([
      button({
        onclick: increment,
      }, [
        'Increment ', count
      ]),
      () => count() > 10 ? div('Count is greater than 10') : null,
      () => arr().map(item => div(item)),
    ])
  )
}
