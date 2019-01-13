require('dotenv').config()
const {
  spawn
} = require('child_process')
const {
  promisify
} = require('util')
const TogglClient = require('toggl-api')
const rofiExecutable = 'rofi'

const objSet = val => key => obj => {
  obj[key] = val
  return obj
}

const objKeys =
  obj => {
    const keys = []
    for(let key in obj) keys.push(key)

    return keys
  }

const objReduce =
  base => reducer => obj =>
  objKeys(obj)
    .reduce((acc, key) => reducer (obj[key], obj) (key) (acc), base)

const promisifyObjMethods =
  objReduce
    ({})
    ((val, base) =>
      typeof val === 'function'
      ? objSet(promisify(val.bind(base)))
      : objSet(val)
    )

Promise.prototype.also = function(fn) { return this.then(() => fn()) }

const t =
    (new TogglClient({apiToken: process.env.TOGGL_TOKEN}))
const toggl =
  promisifyObjMethods(t)
//    (new TogglClient({apiToken: process.env.TOGGL_TOKEN}))

const rofi = ({ title, data = '', args = [] }) => new Promise((resolve, reject) => {
  const rofi = spawn(rofiExecutable, ['-dmenu', '-p', title, ...args])
  rofi.stdin.write(data)
  rofi.stdin.end()
  let result = '';
  let err = ''
  rofi.stdout.on('data', data => { result += data.toString() })
  rofi.stderr.on('data', data => { err += data.toString() })
  rofi.on('close', code => code ? reject({code, err}) : resolve(result))
})

const rofiAlts = async ({ title, alternatives }) => {
  const selected =
    (await rofi({
      title,
      data: alternatives.map(a => a.name).join('\n')
    }))
    .trim()

  return alternatives.find(a => a.name == selected)

};

const stopTimer = timerId => () =>
  toggl.stopTimeEntry(timerId)

const init = async () => {
  const current = await toggl.getCurrentTimeEntry()

  if (!current) return newTimer()

  const currentMins = Math.floor((new Date - new Date(current.at)) / 60e3)
  const sanetizedDesc = current.description.replace(/\n|\0/g, '  ')

  const { action: next } = await rofiAlts(
    { title: 'Toggl'
    , alternatives:
      [ { action: stopTimer(current.id)
        , name: `Stop current: [${currentMins} min] ${sanetizedDesc}`
        }
      , { action: () => newTimer(), name: 'New timer' }
      ]
    }
  )

  return next()
}

const startTimer = ({ projectId, description }) =>
  toggl.startTimeEntry(
    { description: description.trim()
    , pid: projectId
    , created_with: 'rofi'
    }
  )

const newTimer = () =>
  toggl.getClients()
    .then(alternatives => rofiAlts({ title: 'client', alternatives }))
    .then(client => toggl.getClientProjects(client.id, true))
    .then(alternatives => rofiAlts({ title: 'project', alternatives }))
    .then(({ id: projectId }) =>
      rofi({ title: 'Name activity', args: ['-lines', 0] })
      .then(description => startTimer({ projectId, description }))
    )

init()
  .catch(err => console.error(err) || process.exit(1))
