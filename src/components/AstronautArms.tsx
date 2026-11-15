import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './AstronautArms.css'

type Finger = {
  mesh: THREE.Group
  joints: THREE.Group[]
  base: number[]
  fist: number[]
  wig: number
  sy?: number
}

type FingerEvent = {
  start: number
  duration: number
  pattern: number
  phase: number
}

type ArmPivot = {
  side: number
  offset: THREE.Vector3
  baseY: number
  pivot: THREE.Group
  hand: THREE.Group
  fingers: Finger[]
  thumb: THREE.Group
  fingerEvent?: FingerEvent
}

type Outfit = 'eva' | 'nomex'

type AstronautRig = {
  group: THREE.Group
  layout: (camera: THREE.PerspectiveCamera) => void
  setThumbsUp: (active: boolean) => void
  setOutfit: (outfit: Outfit) => void
  update: (
    delta: number,
    mouseX: number,
    mouseY: number,
    transitionDelta?: number,
  ) => void
}

type AstronautArmsProps = {
  gestureId: number
  isEarthView: boolean
}

function createAstronautArms(): AstronautRig {
  const group = new THREE.Group()
  group.add(new THREE.AmbientLight(0x8899bb, 0.6))

  const sun = new THREE.DirectionalLight(0xfff2dd, 1.7)
  sun.position.set(-2, 3, 3)
  const rim = new THREE.DirectionalLight(0x4aa3ff, 1)
  rim.position.set(3, -1, -2)
  for (const light of [sun, rim]) {
    light.target.position.set(0, 0, -1)
    group.add(light, light.target)
  }

  const suit = new THREE.MeshStandardMaterial({ color: 0xeeeef1, roughness: 0.8 })
  const suitShade = new THREE.MeshStandardMaterial({ color: 0xc9ccd4, roughness: 0.85 })
  const glove = new THREE.MeshStandardMaterial({ color: 0xe9e9ed, roughness: 0.7 })
  const pad = new THREE.MeshStandardMaterial({ color: 0x3a3d45, roughness: 0.9 })
  const nailMaterial = new THREE.MeshStandardMaterial({ color: 0xe8c2ad, roughness: 0.48 })
  const ring = new THREE.MeshStandardMaterial({ color: 0x9aa3b2, metalness: 0.8, roughness: 0.3 })
  const accent = new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.5 })
  const zipMaterial = new THREE.MeshStandardMaterial({
    color: 0xb9bec6,
    metalness: 0.8,
    roughness: 0.35,
  })
  const evaOnly: THREE.Object3D[] = []
  const nomexOnly: THREE.Object3D[] = []
  const bareHandOnly = new Map<THREE.Object3D, THREE.Vector3>()
  const bareNails = new Map<THREE.Object3D, THREE.Vector3>()
  const exposeHandDetail = (object: THREE.Object3D) => {
    bareHandOnly.set(object, object.scale.clone())
  }
  const exposeNail = (object: THREE.Object3D) => {
    object.visible = false
    bareNails.set(object, object.scale.clone())
  }

  function cylinder(
    topRadius: number,
    bottomRadius: number,
    length: number,
    material: THREE.Material,
    segments = 20,
  ) {
    const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, length, segments)
    geometry.rotateX(Math.PI / 2)
    return new THREE.Mesh(geometry, material)
  }

  function sphere(
    radius: number,
    material: THREE.Material,
    scaleX = 1,
    scaleY = 1,
    scaleZ = 1,
  ) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 16), material)
    mesh.scale.set(scaleX, scaleY, scaleZ)
    return mesh
  }

  function createFinger(length: number, radius: number, material: THREE.Material) {
    const base = new THREE.Group()
    const firstJoint = new THREE.Group()
    base.add(firstJoint)

    const joints = [firstJoint]
    let currentJoint = firstJoint
    let currentRadius = radius
    const lengths = [length * 0.42, length * 0.32, length * 0.26]

    for (const segmentLength of lengths) {
      const nextRadius = currentRadius * 0.92
      const segment = cylinder(currentRadius, nextRadius, segmentLength, material, 12)
      segment.position.z = -segmentLength / 2
      currentJoint.add(segment)

      const joint = new THREE.Group()
      joint.position.z = -segmentLength
      joint.add(sphere(nextRadius, material))
      currentJoint.add(joint)
      joints.push(joint)
      currentJoint = joint
      currentRadius = nextRadius
    }

    const nail = sphere(1, nailMaterial, 0.012, 0.0035, 0.019)
    nail.position.set(0, currentRadius * 0.82, -currentRadius * 0.12)
    currentJoint.add(nail)
    exposeNail(nail)

    return { mesh: base, joints }
  }

  function createThumb(material: THREE.Material) {
    const base = new THREE.Group()
    const firstJoint = new THREE.Group()
    base.add(firstJoint)
    const joints = [firstJoint]
    const mound = sphere(0.058, material, 1, 0.85, 1.25)
    mound.position.set(0, -0.012, 0.025)
    firstJoint.add(mound)
    const thumbWebbing = sphere(0.052, material, 1.12, 0.76, 0.82)
    thumbWebbing.position.set(0.018, -0.008, -0.052)
    firstJoint.add(thumbWebbing)

    let currentJoint = firstJoint
    for (const [length, radius, nextRadius] of [
      [0.05, 0.046, 0.04],
      [0.068, 0.04, 0.034],
      [0.058, 0.034, 0.029],
    ]) {
      const segment = cylinder(radius, nextRadius, length, material, 18)
      segment.position.z = -length / 2
      currentJoint.add(segment)

      const joint = new THREE.Group()
      joint.position.z = -length
      joint.add(sphere(nextRadius * 1.05, material, 1, 1, 1.05))
      currentJoint.add(joint)
      joints.push(joint)
      currentJoint = joint
    }

    const nail = sphere(1, nailMaterial, 0.015, 0.004, 0.021)
    nail.position.set(0, 0.029 * 0.82, -0.029 * 0.12)
    currentJoint.add(nail)
    exposeNail(nail)

    const tipPad = sphere(0.025, pad, 1, 0.55, 1)
    tipPad.position.set(0, -0.013, -0.004)
    currentJoint.add(tipPad)
    exposeHandDetail(tipPad)
    return { mesh: base, joints }
  }

  function createSleeveTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 1000
    canvas.height = 380
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to create the astronaut sleeve patch.')

    const roundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
      context.beginPath()
      context.moveTo(x + radius, y)
      context.arcTo(x + width, y, x + width, y + height, radius)
      context.arcTo(x + width, y + height, x, y + height, radius)
      context.arcTo(x, y + height, x, y, radius)
      context.arcTo(x, y, x + width, y, radius)
      context.closePath()
    }

    roundedRect(6, 6, 988, 368, 54)
    const gradient = context.createLinearGradient(0, 0, 0, 380)
    gradient.addColorStop(0, '#2a477f')
    gradient.addColorStop(1, '#1a3166')
    context.fillStyle = gradient
    context.fill()
    context.save()
    context.clip()
    for (let index = 0; index < 5000; index += 1) {
      context.fillStyle =
        Math.random() < 0.5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.06)'
      context.fillRect(Math.random() * 1000, Math.random() * 380, 2, 2)
    }
    context.restore()

    roundedRect(24, 24, 952, 332, 40)
    context.setLineDash([16, 11])
    context.strokeStyle = 'rgba(235,240,255,.45)'
    context.lineWidth = 4
    context.stroke()
    context.setLineDash([])
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.shadowColor = 'rgba(0,0,0,.35)'
    context.shadowBlur = 8
    context.shadowOffsetY = 3
    for (const [index, [text, fontSize, color]] of [
      [0, ['NASA SPACE APPS', 96, '#e9effc']],
      [1, ['CHALLENGE', 96, '#e9effc']],
      [2, ['LuckyCode team', 80, '#f3bd96']],
    ] as const) {
      let size = fontSize
      context.font = `700 ${size}px system-ui, Arial, sans-serif`
      const textWidth = context.measureText(text).width
      if (textWidth > 820) {
        size *= 820 / textWidth
        context.font = `700 ${size}px system-ui, Arial, sans-serif`
      }
      context.fillStyle = color
      context.fillText(text, 500, 100 + index * 90)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.anisotropy = 8
    return texture
  }

  function createWeaveTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to create the Nomex weave texture.')

    context.fillStyle = '#6f7a55'
    context.fillRect(0, 0, 256, 256)
    for (let index = -256; index < 512; index += 6) {
      context.strokeStyle =
        ((index + 256) / 6) % 2
          ? 'rgba(255,255,225,.10)'
          : 'rgba(0,0,0,.12)'
      context.lineWidth = 2
      context.beginPath()
      context.moveTo(index, 0)
      context.lineTo(index + 256, 256)
      context.stroke()
    }
    for (let index = 0; index < 3000; index += 1) {
      context.fillStyle =
        Math.random() < 0.5 ? 'rgba(255,255,230,.05)' : 'rgba(0,0,0,.07)'
      context.fillRect(Math.random() * 256, Math.random() * 256, 2, 2)
    }
    return canvas
  }

  function createBlendMap(source: HTMLCanvasElement, repeatX: number, repeatY: number) {
    const canvas = document.createElement('canvas')
    canvas.width = source.width
    canvas.height = source.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to create a suit texture transition.')

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(repeatX, repeatY)
    texture.anisotropy = 8
    return { canvas, context, source, texture }
  }

  const weaveMap = createBlendMap(createWeaveTexture(), 8, 12)
  const outfitMaterials = [suit, suitShade, glove, pad, ring, accent, zipMaterial]
  const evaColors = outfitMaterials.map((material) => material.color.clone())
  const nomexColors = [
    new THREE.Color(0xffffff),
    new THREE.Color(0x465139),
    new THREE.Color(0xc58f6b),
    new THREE.Color(0xc58f6b),
    new THREE.Color(0x2f3626),
    new THREE.Color(0x3c472f),
    new THREE.Color(0xb9bec6),
  ]
  suit.map = weaveMap.texture
  suit.bumpMap = weaveMap.texture
  suit.bumpScale = 0.025
  const updateBlendMap = (
    blendMap: ReturnType<typeof createBlendMap>,
    amount: number,
  ) => {
    blendMap.context.clearRect(0, 0, blendMap.canvas.width, blendMap.canvas.height)
    blendMap.context.fillStyle = '#ffffff'
    blendMap.context.fillRect(0, 0, blendMap.canvas.width, blendMap.canvas.height)
    blendMap.context.globalAlpha = amount
    blendMap.context.drawImage(blendMap.source, 0, 0)
    blendMap.context.globalAlpha = 1
    blendMap.texture.needsUpdate = true
  }

  updateBlendMap(weaveMap, 0)

  const sleeveTexture = createSleeveTexture()

  function createArm(side: number) {
    const root = new THREE.Group()
    root.rotation.order = 'YXZ'

    const forearm = cylinder(0.21, 0.098, 1.4, suit, 28)
    forearm.position.z = 0.72
    root.add(forearm)
    for (const z of [0.7, 1.05]) {
      const seam = cylinder(0.12 + z * 0.07, 0.12 + z * 0.07, 0.035, suitShade, 28)
      seam.position.z = z
      root.add(seam)
    }

    if (side < 0) {
      const patch = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.22), accent)
      patch.position.set(0, 0.14, 0.45)
      patch.rotation.x = -0.12
      root.add(patch)
      evaOnly.push(patch)

      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.022, 0.2), suit)
      pocket.position.copy(patch.position)
      pocket.rotation.copy(patch.rotation)
      const pocketFlap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 0.075), suitShade)
      pocketFlap.position.set(0, 0.018, 0.048)
      pocket.add(pocketFlap)
      const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.19), zipMaterial)
      zipper.position.set(0, 0.014, 0)
      pocket.add(zipper)
      const zipperTab = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.008, 0.03),
        zipMaterial,
      )
      zipperTab.position.set(0, 0.019, -0.07)
      pocket.add(zipperTab)
      root.add(pocket)
      pocket.visible = false
      nomexOnly.push(pocket)

      const pocketBadge = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.006, 0.035),
        new THREE.MeshStandardMaterial({ color: 0xc8ad7c, roughness: 1 }),
      )
      pocketBadge.position.set(0, 0.026, -0.035)
      pocket.add(pocketBadge)
    } else {
      const patchGeometry = new THREE.PlaneGeometry(0.45, 0.17, 1, 14)
      const positions = patchGeometry.attributes.position
      const radius = 0.13
      for (let index = 0; index < positions.count; index += 1) {
        const y = positions.getY(index)
        positions.setZ(index, Math.sqrt(radius * radius - y * y) - radius)
      }
      patchGeometry.computeVertexNormals()
      patchGeometry.rotateX(-Math.PI / 2)
      patchGeometry.rotateY(-Math.PI / 2)
      const patch = new THREE.Mesh(
        patchGeometry,
        new THREE.MeshStandardMaterial({
          map: sleeveTexture,
          roughness: 0.95,
          transparent: true,
        }),
      )
      patch.position.set(0, 0.131, 0.33)
      patch.rotation.x = -0.08
      root.add(patch)
      evaOnly.push(patch)
    }

    const cuff = cylinder(0.108, 0.108, 0.09, ring, 28)
    cuff.position.z = 0.06
    root.add(cuff)
    evaOnly.push(cuff)
    exposeHandDetail(cuff)
    const cuffAccent = cylinder(0.112, 0.112, 0.025, accent, 28)
    cuffAccent.position.z = 0.13
    root.add(cuffAccent)
    evaOnly.push(cuffAccent)
    exposeHandDetail(cuffAccent)
    const gloveCuff = cylinder(0.1, 0.09, 0.08, pad, 24)
    gloveCuff.position.z = -0.02
    root.add(gloveCuff)
    evaOnly.push(gloveCuff)
    exposeHandDetail(gloveCuff)

    const hand = new THREE.Group()
    root.add(hand)
    hand.rotation.z = -side * 0.95
    hand.rotation.x = 0.12
    const palm = sphere(0.103, glove, 1.3, 0.58, 1.3)
    palm.position.set(0, 0, -0.125)
    hand.add(palm)
    const backOfHand = sphere(0.09, glove, 1.28, 0.35, 1.1)
    backOfHand.position.set(0, 0.032, -0.125)
    hand.add(backOfHand)
    const knuckleRow = sphere(0.038, glove, 2.45, 0.85, 0.8)
    knuckleRow.position.set(0, 0.022, -0.205)
    hand.add(knuckleRow)
    const palmPad = sphere(0.07, pad, 1.4, 0.25, 1)
    palmPad.position.set(0, -0.045, -0.1)
    hand.add(palmPad)
    exposeHandDetail(palmPad)

    const direction = -side
    const fingerPositions = [0.098, 0.033, -0.033, -0.095]
    const lengths = [0.195, 0.218, 0.198, 0.155]
    const radii = [0.026, 0.027, 0.025, 0.022]
    const baseCurl = [
      [0.2, 0.3, 0.2],
      [0.35, 0.45, 0.3],
      [0.5, 0.6, 0.35],
      [0.65, 0.7, 0.4],
    ]
    const fistCurl = [
      [1.4, 1.65, 1.1],
      [1.45, 1.7, 1.1],
      [1.45, 1.7, 1.1],
      [1.4, 1.65, 1.05],
    ]
    const wiggle = [0.9, 0.35, 0.7, 0.25]
    const fingers: Finger[] = []

    fingerPositions.forEach((x, index) => {
      const finger = createFinger(lengths[index], radii[index], glove)
      finger.mesh.position.set(x * direction, 0, -0.21)
      const sy = -direction * (1.5 - index) * 0.11
      finger.mesh.rotation.y = sy
      hand.add(finger.mesh)
      const fingertipPad = sphere(0.034, pad)
      fingertipPad.position.set(x * direction, 0.03, -0.2)
      fingertipPad.scale.set(1, 0.8, 1)
      hand.add(fingertipPad)
      exposeHandDetail(fingertipPad)
      fingers.push({
        ...finger,
        base: baseCurl[index],
        fist: fistCurl[index],
        wig: wiggle[index],
        sy,
      })
    })

    const thumb = createThumb(glove)
    thumb.mesh.position.set(0.12 * direction, -0.01, -0.06)
    thumb.mesh.rotation.set(-0.1, -direction * 0.6, 0)
    fingers.push({ ...thumb, base: [0.15, 0.3, 0.3], fist: [0, 0.1, 0.1], wig: 0.6 })
    hand.add(thumb.mesh)

    return { root, hand, thumb: thumb.mesh, fingers }
  }

  const rig = new THREE.Group()
  group.add(rig)
  const pivots: ArmPivot[] = []
  for (const side of [-1, 1]) {
    const arm = createArm(side)
    arm.root.scale.setScalar(1.22)
    arm.root.rotation.set(0.3, side * 0.3, 0)
    const offset = new THREE.Vector3(0, 0, 1.45 * 1.15).applyEuler(arm.root.rotation)
    arm.root.position.copy(offset).negate()
    const pivot = new THREE.Group()
    pivot.add(arm.root)
    const pivotData: ArmPivot = {
      side,
      offset,
      baseY: 0,
      pivot,
      hand: arm.hand,
      fingers: arm.fingers,
      thumb: arm.thumb,
    }
    pivot.userData.arm = pivotData
    rig.add(pivot)
    pivots.push(pivotData)
  }

  let curl = 0
  let targetCurl = 0
  let time = 0
  let nextFingerEvent = 1.2
  let activeHand = 0
  let outfitMix = 0
  let outfitStart = 0
  let outfitTarget = 0
  let outfitElapsed = 0
  let lastTextureUpdate = 0
  let outfitTransitionProgress = 1

  return {
    group,
    layout(camera) {
      const halfWidth = 1.15 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect
      const spread = Math.min(1, halfWidth * 0.82)
      for (const pivot of rig.children) {
        const data = (pivot.userData as { arm: ArmPivot }).arm
        data.baseY = -0.5 + data.offset.y
        pivot.position.set(
          data.side * spread + data.offset.x,
          data.baseY,
          -1.15 + data.offset.z,
        )
      }
    },
    setThumbsUp(active) {
      targetCurl = active ? 1 : 0
    },
    setOutfit(outfit) {
      const nextTarget = outfit === 'nomex' ? 1 : 0
      if (nextTarget === outfitTarget) return

      outfitStart = outfitMix
      outfitTarget = nextTarget
      outfitElapsed = 0
      outfitTransitionProgress = 0
    },
    update(delta, mouseX, mouseY, transitionDelta = delta) {
      time += delta
      curl += (targetCurl - curl) * 0.12
      if (outfitTransitionProgress < 1) {
        outfitElapsed += transitionDelta
        outfitTransitionProgress = Math.min(outfitElapsed / 1.15, 1)
        const easedProgress =
          outfitTransitionProgress * outfitTransitionProgress * (3 - 2 * outfitTransitionProgress)
        outfitMix = outfitStart + (outfitTarget - outfitStart) * easedProgress

        outfitMaterials.forEach((material, index) => {
          material.color.lerpColors(evaColors[index], nomexColors[index], outfitMix)
        })
        if (time - lastTextureUpdate >= 1 / 24 || outfitTransitionProgress === 1) {
          updateBlendMap(weaveMap, outfitMix)
          lastTextureUpdate = time
        }
        bareHandOnly.forEach((scale, object) => {
          object.visible = outfitMix < 0.999
          object.scale.set(
            scale.x * (1 - outfitMix),
            scale.y * (1 - outfitMix),
            scale.z * (1 - outfitMix),
          )
        })
        bareNails.forEach((scale, object) => {
          object.visible = outfitMix > 0.001
          object.scale.set(
            scale.x * outfitMix,
            scale.y * outfitMix,
            scale.z * outfitMix,
          )
        })
        if (outfitTransitionProgress === 1) {
          evaOnly.forEach((object) => {
            object.visible = outfitTarget === 0
          })
          nomexOnly.forEach((object) => {
            object.visible = outfitTarget === 1
          })
        }
      }
      rig.scale.setScalar(1 + Math.sin(Math.PI * outfitTransitionProgress) * 0.025)

      if (time >= nextFingerEvent) {
        const duration = 1.5 + Math.random() * 0.7
        pivots[activeHand].fingerEvent = {
          start: time,
          duration,
          pattern: Math.random() < 0.5 ? 0 : 1,
          phase: Math.random() * 6,
        }
        activeHand ^= 1
        nextFingerEvent = time + duration + 1 + Math.random() * 2.2
      }

      pivots.forEach((data, armIndex) => {
        const phase = armIndex * 1.9
        const direction = -data.side
        const pivot = rig.children[armIndex]
        pivot.position.y = data.baseY
        pivot.rotation.set(
          Math.sin(time * 0.8 + phase) * 0.05 +
            Math.sin(time * 0.31 + phase * 2) * 0.03 +
            Math.sin(Math.PI * outfitTransitionProgress) * 0.045,
          Math.sin(time * 0.6 + phase + 1) * 0.06 +
            Math.sin(time * 0.23 + phase) * 0.03,
          Math.sin(time * 0.5 + phase) * 0.03,
        )

        const thumbCurl = data.side > 0 ? curl : 0
        data.hand.rotation.x = 0.12 + Math.sin(time * 0.7 + phase) * 0.02
        data.hand.rotation.z = -data.side * (0.95 + thumbCurl * 0.4)
        data.thumb.rotation.y = -direction * (0.6 + thumbCurl * 0.95)
        data.thumb.rotation.x = -0.1 - thumbCurl * 0.15

        const event = data.fingerEvent
        const progress = event ? (time - event.start) / event.duration : -1
        const envelope =
          progress >= 0 && progress <= 1 ? Math.sin(Math.PI * progress) ** 2 : 0

        data.fingers.forEach((finger, fingerIndex) => {
          let movement = 0
          if (envelope > 0 && event) {
            if (event.pattern === 0) {
              const wave = (progress * 1.5 - fingerIndex * 0.14) / 0.7
              movement = wave > 0 && wave < 1 ? Math.sin(Math.PI * wave) ** 2 : 0
            } else {
              movement =
                envelope * (0.5 + 0.5 * Math.sin(progress * 16 + fingerIndex * 1.9 + event.phase))
            }
          }

          movement *= (1 - thumbCurl) * [1, 0.9, 0.9, 0.8, 0.8][fingerIndex]
          if (finger.sy !== undefined) {
            finger.mesh.rotation.y = finger.sy + envelope * 0.04 * Math.sin(progress * 9 + fingerIndex)
          }
          finger.joints.slice(0, 3).forEach((joint, jointIndex) => {
            const angle =
              finger.base[jointIndex] * (1 - thumbCurl) +
              finger.fist[jointIndex] * thumbCurl +
              movement * [0.55, 0.8, 0.6][jointIndex]
            joint.rotation.x = -angle
          })
        })
      })

      rig.rotation.y += (-mouseX * 0.1 - rig.rotation.y) * 0.05
      rig.rotation.x += (mouseY * 0.05 - rig.rotation.x) * 0.05
    },
  }
}

export function AstronautArms({ gestureId, isEarthView }: AstronautArmsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rigRef = useRef<AstronautRig | null>(null)
  const hasRenderedFrameRef = useRef(false)
  const [hasRenderedFrame, setHasRenderedFrame] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    })
    if (!context) {
      console.error('WebGL 2 is unavailable for the astronaut arms.')
      return
    }

    context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, false)
    context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)

    const renderer = new THREE.WebGLRenderer({
      canvas,
      context,
      antialias: true,
      alpha: true,
    })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(65, 1, 0.03, 100)
    scene.add(camera)

    const arms = createAstronautArms()
    rigRef.current = arms
    camera.add(arms.group)

    let mouseX = 0
    let mouseY = 0
    const timer = new THREE.Timer()
    timer.connect(document)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const resizeObserver = new ResizeObserver(() => {
      const width = window.innerWidth
      const height = window.innerHeight
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.fov = width / height < 1 ? 85 : 65
      camera.updateProjectionMatrix()
      arms.layout(camera)
    })

    const updatePointer = (event: PointerEvent) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1
      mouseY = (event.clientY / window.innerHeight) * 2 - 1
    }
    const animate = (timestamp: number) => {
      timer.update(timestamp)
      const delta = Math.min(timer.getDelta(), 0.05)
      arms.update(reducedMotion.matches ? 0 : delta, mouseX, mouseY, delta)
      renderer.render(scene, camera)
      if (!hasRenderedFrameRef.current) {
        hasRenderedFrameRef.current = true
        setHasRenderedFrame(true)
      }
      frameId = window.requestAnimationFrame(animate)
    }
    let frameId = 0

    resizeObserver.observe(document.documentElement)
    window.addEventListener('pointermove', updatePointer)
    arms.layout(camera)
    frameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('pointermove', updatePointer)
      resizeObserver.disconnect()
      timer.dispose()
      rigRef.current = null
      hasRenderedFrameRef.current = false
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => {
            material.map?.dispose()
            material.dispose()
          })
        }
      })
      renderer.dispose()
    }
  }, [])

  useEffect(() => {
    rigRef.current?.setOutfit(isEarthView ? 'nomex' : 'eva')
  }, [isEarthView])

  useEffect(() => {
    if (gestureId === 0) return

    const arms = rigRef.current
    if (!arms) return

    arms.setThumbsUp(true)
    const timeoutId = window.setTimeout(() => arms.setThumbsUp(false), 1200)
    return () => window.clearTimeout(timeoutId)
  }, [gestureId])

  return (
    <>
      <div
        className={`astronaut-visor${hasRenderedFrame ? ' astronaut-visor--ready' : ''}${isEarthView ? ' astronaut-visor--earth' : ''}`}
        aria-hidden="true"
      />
      <canvas
        ref={canvasRef}
        className={`astronaut-arms${hasRenderedFrame ? ' astronaut-arms--ready' : ''}`}
        aria-hidden="true"
      />
    </>
  )
}
