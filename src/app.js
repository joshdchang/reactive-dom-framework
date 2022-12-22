
import { createSignal, createEffect, elements, t_ } from './lib/core'
const { div, button } = elements

export default function App() {

  const [timer, setTimer] = createSignal(0)

  setInterval(() => {
    setTimer(timer() + 1)
  }, 1000)

  createEffect(() => {
    document.title = `Timer: ${timer()} seconds`
  })

  return (
    div({
      className: 'bg-red-100 p-10 text-gray-800 font-bold text-3xl text-center h-screen grid place-items-center'
    }, [
      timer,
      button({
        className: 'bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded',
        onclick: () => setTimer(0)
      }, t_`Reset ${timer} seconds`)
    ])
  )
}
