import * as fflate from 'https://ordinals.com/content/f815bd5c566c6e46de5cdb6ccb3a7043c63deeba61f4234baea84b602b0d4440i0'

const b64data = await (await fetch('http://ordinals.com/content/255ce0c5a0d8aca39510da72e604ef8837519028827ba7b7f723b7489f3ec3a4i0')).text()
const code = fflate.strFromU8(
  fflate.decompressSync(
    fflate.strToU8(
      atob(b64data), true
    )
  )
)
const script = document.createElement('script')
script.innerHTML = code
document.head.appendChild(script)

const audioSetup = () => {
  const audioCtx = new AudioContext()
  const analyser = audioCtx.createAnalyser()
  const button = document.querySelector('#button')
  const audioElement = new Audio(audio)
  audioElement.crossOrigin = "anonymous"
  audioElement.type = 'audio/mp3'
  audioElement.loop = true
  const sourceNode = audioCtx.createMediaElementSource(audioElement)
  
  sourceNode.connect(analyser)
  analyser.connect(audioCtx.destination)

  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0.5
  let frequencyData = new Uint8Array(analyser.frequencyBinCount)
  let timeDomainData = new Uint8Array(analyser.frequencyBinCount)
  let bufferLength = analyser.frequencyBinCount
  let frequencyBinWidth = audioCtx.sampleRate / analyser.fftSize

  return [audioElement, audioCtx, analyser, frequencyData, timeDomainData, bufferLength, frequencyBinWidth]
}

let audioElement, audioCtx, analyser, frequencyData, timeDomainData, bufferLength, frequencyBinWidth, amplitude

let particles
let A = 0.02
let minWalk = 0.01

const getN = () => {
  return parseInt(insID[0], 16) % 8 + 1
}

const getA = () => {
  return parseInt(insID[1], 16) % 4 + 1
}

const getB = () => {
  return parseInt(insID[2], 16) % 4 + 1
}

const params = {
  nParticles: 12000,
  canvasSize: [600, 600],
  m0: 0,
  m1: 0,
  m2: 0,
  n: getN,
  a: getA,
  b: getB,
  v: 0.04,
  noiseL: 1.1,
  shapeConstant: 0.006,
  shapeBaseConstant: 0,
  ampFactor: 0.00001,
  colors: [255, 255, 255],
  colorMode: false
}

const colors = [
  'cyan',
  'purple',
  'blue'
]

const pi = Math.PI

const cymatics = (x, y, m, n) => {
  return params.a() * Math.cos(pi*n*(x-.5)) * Math.cos(pi*m*(y+.5)) - params.b() * Math.cos(pi*m*(x-.5)) * Math.cos(pi*n*(y+.5))
}

const bark = (f) => {
  return 13 * Math.atan(0.00076*f) + 3.5 * atan(Math.pow((f/7500), 2))
}

const mel = (f) => {
  return 2595 * Math.log10(1 + f / 700)
}

const centroid = (frequencyData) => {
  const sum = frequencyData.reduce((acc, value) => acc + value, 0)
  const weightedSum = frequencyData.reduce((acc, value, index) => acc + value * index, 0)
  return (sum === 0) ? 0 : weightedSum / sum
}

const barkCentroid = (frequencyData, frequencyBinWidth) => {
  const sum = frequencyData.reduce((acc, value) => acc + value, 0)
  const weightedSum = frequencyData.reduce((acc, value, index) => acc + value * index * bark(index*frequencyBinWidth), 0)
  return (sum === 0) ? 0 : weightedSum / sum
}

const melCentroid = (frequencyData, frequencyBinWidth) => {
  const sum = frequencyData.reduce((acc, value) => acc + value, 0)
  const weightedSum = frequencyData.reduce((acc, value, index) => acc + value * mel(index*frequencyBinWidth), 0)
  return (sum === 0) ? 0 : weightedSum / sum
}

const handleEdge = (n) => {
  if (n>=1) return 1
  if (n<=0) return 0
  return n
}

const initParticles = () => {
  particles = []
  for (let i = 0; i < params.nParticles; i++){
    particles[i] = new Particle()
  }
}

const initDOM = () => {
  let canvas = createCanvas(...params.canvasSize)
  canvas.parent('cymatics')
}

class Particle {

  constructor(){
    this.x = random(0, 1)
    this.y = random(0, 1)
    this.oscillation
    this.type = Math.floor(random(0, 3))

    this.updateOffsets()
  }

  // Use shader code to optimize
  move() {
    let distance = cymatics(this.x, this.y, params[`m${this.type}`], params.n())
    this.oscillation = params.v * Math.abs(distance)
    if (this.oscillation <= minWalk) this.oscillation = minWalk
    this.x += (Math.random() * (this.oscillation*2) - this.oscillation) * params.noiseL
    this.y += (Math.random() * (this.oscillation*2) - this.oscillation) * params.noiseL
    this.updateOffsets()
  }

  updateOffsets(){
    this.x = handleEdge(this.x)
    this.y = handleEdge(this.y)
    this.xScaled = width * this.x
    this.yScaled = height * this.y
  }

  draw(){
    stroke(params.colors[0]*.7+255*.3, params.colors[1]*.7+255*.3, params.colors[2]*.7+255*.3)
    strokeWeight(2)
    point(this.xScaled, this.yScaled)
  }
}

const resonate = () => {
  analyser.getByteFrequencyData(frequencyData)
  analyser.getByteTimeDomainData(timeDomainData)
  amplitude = timeDomainData.reduce((sum, value) => sum + value, 0) / bufferLength
  minWalk = amplitude * params.ampFactor
  let barkConstant = Math.ceil(barkCentroid(frequencyData, frequencyBinWidth)*params.shapeConstant) + params.shapeBaseConstant
  let melConstant = Math.ceil(melCentroid(frequencyData, frequencyBinWidth)*params.shapeConstant) + params.shapeBaseConstant
  let centroidConstant = Math.ceil(centroid(frequencyData)*params.shapeConstant) + params.shapeBaseConstant
  params.m0 = barkConstant
  params.m1 = melConstant
  params.m2 = centroidConstant
  if (params.colorMode) params.colors = [frequencyData[2], frequencyData[25], frequencyData[50]]
  particles.map( p => {
    p.move()
    p.draw()
  })
}

const resetCanvas = () => {
  background('black')
  stroke('white')
}

window.setup = () => {
  [audioElement, audioCtx, analyser, frequencyData, timeDomainData, bufferLength, frequencyBinWidth] = audioSetup()
  initDOM()
  initParticles()
  audioElement.addEventListener('canplaythrough', () => {
    console.log('ready')
  }, false)
}

window.draw = () => {
  resetCanvas()
  resonate()
}

const begin = () => {
  audioCtx.resume()
  audioElement.play()
}

button.addEventListener('click', begin, false)

select.addEventListener('change', (event) => {
  insID = event.target.value
  audio = 'https://ordinals.com/content/' + insID
  audioElement.src = audio
}, false)