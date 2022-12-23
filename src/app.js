
import { createSignal, createEffect, createTags, t_ } from './lib/core'
const { div, button } = createTags(['div', 'button'])

export default function App() {

  const [timer, setTimer] = createSignal(0)

  createEffect(() => {
    document.title = `Timer: ${timer()} seconds`
  })

  return (
    div({
      class: 'bg-red-100 p-10 text-gray-800 font-bold text-3xl text-center h-screen grid place-items-center'
    }, [
      timer,
      button({
        class: ['bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4', {
          'opacity-50 cursor-not-allowed': () => timer() % 2 === 0
        }],
        on_click: () => setTimer(timer() + 1)
      }, [
        '+1'
      ])
    ])
  )
}
