import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { deviceTier, idle, prefersReducedMotion } from './motion';

const GOLD = 0xd9a441;
const CUBES = 9;
const FRONT_Z = 1.2; // cubes nearer than this are drawn above the words

/**
 * Quality per device. Phones keep the real glass (refraction) but draw fewer pixels, puffs and
 * curve segments; if frames still run slow, the resolution steps down on its own.
 */
const QUALITY = {
    high: { dpr: 1.75, steam: 22, glassSegments: 160, segments: 128, anisotropy: 0.5 },
    mid: { dpr: 1.5, steam: 14, glassSegments: 96, segments: 64, anisotropy: 0 },
};
const MIN_DPR = 1;
const SLOW_FRAME_MS = 26;

/** A turned shape from a side profile of [radius, height] points */
const lathe = (profile, material, segments) => {
    const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, material);
};

/** A soft round shadow drawn on a canvas, laid under the glass */
const contactShadow = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(64, 64, 5, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(0,0,0,0.85)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.01;
    return mesh;
};

/** A soft, slightly uneven puff of steam */
const steamTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(60, 66, 2, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,241,224,0.34)');
    gradient.addColorStop(0.4, 'rgba(255,241,224,0.1)');
    gradient.addColorStop(1, 'rgba(255,241,224,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
};

/** The small studio light map, decoded once and shared by both layers */
let studioImage = null;
const loadStudio = () => {
    studioImage ||= new Promise((resolve) => {
        new THREE.ImageLoader().load('/site/3d/studio.webp', resolve, undefined, () => resolve(null));
    });
    return studioImage;
};

/** Reflections for one renderer: the studio light map, or a procedural room if it can't load */
const environmentFor = async (renderer) => {
    const image = await loadStudio();
    const pmrem = new THREE.PMREMGenerator(renderer);
    let texture;
    if (image) {
        const source = new THREE.Texture(image);
        source.mapping = THREE.EquirectangularReflectionMapping;
        source.colorSpace = THREE.SRGBColorSpace;
        source.needsUpdate = true;
        texture = pmrem.fromEquirectangular(source).texture;
        source.dispose();
    } else {
        texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    }
    pmrem.dispose();
    return texture;
};

/**
 * A glass of chai on a brass saucer, modelled and lit in WebGL: real refraction through the
 * glass, the tea inside with its meniscus, steam curling up slowly, and gold cubes drifting
 * across the whole screen - some behind the words, some in front (a second, front layer).
 * The glass does not spin: it rests, sways very gently and leans towards the pointer.
 *
 * Built a step at a time in idle moments, with shaders compiled off the main thread where the
 * browser allows, so scrolling never stalls while it gets ready; it fades in once it can draw.
 * If WebGL is missing or the GPU drops the context, onFail() lets the page show a still instead.
 */
const KaapiScene = ({ className = '', wide = false, onFail }) => {
    const backRef = useRef(null);
    const frontRef = useRef(null);
    const failRef = useRef(onFail);
    useEffect(() => {
        failRef.current = onFail;
    });

    useEffect(() => {
        const back = backRef.current;
        const front = frontRef.current;
        if (!back) return undefined;
        const quality = QUALITY[deviceTier() === 'high' ? 'high' : 'mid'];
        let cancelled = false;
        let cleanup = () => {};

        const fail = () => {
            if (!cancelled) failRef.current?.();
        };

        const build = async () => {
            let dpr = Math.min(window.devicePixelRatio || 1, quality.dpr);
            const makeRenderer = (host) => {
                const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
                renderer.setPixelRatio(dpr);
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 1.0;
                renderer.outputColorSpace = THREE.SRGBColorSpace;
                renderer.domElement.addEventListener('webglcontextlost', (event) => {
                    event.preventDefault();
                    fail();
                });
                host.appendChild(renderer.domElement);
                return renderer;
            };

            let renderer;
            let frontRenderer = null;
            try {
                renderer = makeRenderer(back);
                frontRenderer = wide && front ? makeRenderer(front) : null;
            } catch {
                renderer?.dispose();
                fail();
                return;
            }
            const scene = new THREE.Scene();
            const frontScene = new THREE.Scene();

            cleanup = () => {
                for (const target of [scene, frontScene]) {
                    target.traverse((object) => {
                        object.geometry?.dispose();
                        if (object.material) {
                            object.material.map?.dispose();
                            object.material.dispose();
                        }
                    });
                    target.environment?.dispose();
                }
                renderer.dispose();
                renderer.domElement.remove();
                frontRenderer?.dispose();
                frontRenderer?.domElement.remove();
            };

            // Reflections first (the slowest step); the GPU does most of it
            await idle();
            if (cancelled) return;
            const environment = await environmentFor(renderer);
            const frontEnvironment = frontRenderer ? await environmentFor(frontRenderer) : null;
            if (cancelled) {
                environment.dispose();
                frontEnvironment?.dispose();
                return;
            }
            scene.environment = environment;
            frontScene.environment = frontEnvironment;
            await idle();
            if (cancelled) return;

            // On wide screens the glass stands to the right of the words
            const anchorX = wide ? 2.3 : 0;
            const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
            camera.position.set(wide ? 0.4 : 0, 2.0, 9.4);
            camera.lookAt(wide ? 0.4 : 0, 0.75, 0);

            const addLights = (target) => {
                const key = new THREE.DirectionalLight(0xffe2b8, 2.2);
                key.position.set(-3, 6, 4);
                target.add(key);
                const rim = new THREE.DirectionalLight(0xffb45c, 1.6);
                rim.position.set(4, 3, -3);
                target.add(rim);
                const fill = new THREE.PointLight(0xffe6c0, 5, 14);
                fill.position.set(2, 1.5, 4);
                target.add(fill);
            };
            addLights(scene);
            if (frontRenderer) addLights(frontScene);

            const brass = new THREE.MeshPhysicalMaterial({ color: GOLD, metalness: 1, roughness: 0.3, clearcoat: 0.3, clearcoatRoughness: 0.3, anisotropy: quality.anisotropy });
            const glass = new THREE.MeshPhysicalMaterial({
                color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.2, ior: 1.5,
                clearcoat: 1, clearcoatRoughness: 0.04, attenuationColor: new THREE.Color(0xf7f2e8), attenuationDistance: 4, transparent: true, side: THREE.DoubleSide,
            });
            // The tea is opaque and rich; the glass in front of it does the refracting
            const chai = new THREE.MeshPhysicalMaterial({ color: 0x8e4414, roughness: 0.35, clearcoat: 0.9, clearcoatRoughness: 0.25 });
            const chaiTop = new THREE.MeshPhysicalMaterial({ color: 0xb46a2c, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.06 });

            const set = new THREE.Group();
            set.position.set(anchorX, -0.85, 0);

            // Brass saucer
            set.add(lathe([[0, 0], [1.15, 0], [1.25, 0.12], [1.33, 0.5], [1.42, 0.68], [1.46, 0.74], [1.38, 0.74], [1.3, 0.56], [1.18, 0.14], [1.06, 0.1], [0, 0.1]], brass, quality.segments));

            // The chai glass: a classic cutting glass - thick base, gentle flare, a rolled rim
            const glassProfile = [[0, 0.1], [0.5, 0.1], [0.55, 0.22], [0.58, 0.55], [0.62, 1.0], [0.68, 1.45], [0.73, 1.62], [0.76, 1.68], [0.71, 1.68], [0.66, 1.6], [0.62, 1.45], [0.56, 1.0], [0.52, 0.55], [0.48, 0.3], [0, 0.3]];
            const tumbler = lathe(glassProfile, glass, quality.glassSegments);
            tumbler.position.y = 0.1;
            set.add(tumbler);

            // The tea inside, up to three quarters, with a slightly curved surface
            const level = 1.3;
            const tea = lathe([[0, 0.31], [0.47, 0.31], [0.51, 0.55], [0.55, 1.0], [0.6, level], [0, level]], chai, Math.round(quality.segments * 0.75));
            tea.position.y = 0.1;
            set.add(tea);
            const meniscus = new THREE.Mesh(new THREE.CircleGeometry(0.6, Math.round(quality.segments / 2)), chaiTop);
            meniscus.rotation.x = -Math.PI / 2;
            meniscus.position.y = 0.1 + level + 0.002;
            set.add(meniscus);

            // Steam: each puff has its own pace and path, so no two rise alike
            const puff = steamTexture();
            const steam = [];
            for (let index = 0; index < quality.steam; index++) {
                const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, opacity: 0, depthWrite: false }));
                sprite.userData = {
                    seed: Math.random() * 100, offset: Math.random(), pace: 0.09 + Math.random() * 0.06,
                    drift: (Math.random() - 0.5) * 1.1, sway: 0.1 + Math.random() * 0.2, size: 0.4 + Math.random() * 0.4,
                };
                set.add(sprite);
                steam.push(sprite);
            }

            set.add(contactShadow());
            scene.add(set);

            // Gold cubes drifting on wide, slow orbits across the whole screen. Each cube exists
            // in both layers; whichever layer matches its depth draws it.
            const cubeGeometry = new THREE.BoxGeometry(0.26, 0.26, 0.26);
            const cubes = [];
            for (let index = 0; index < CUBES; index++) {
                const data = {
                    angle: (index / CUBES) * Math.PI * 2,
                    rx: wide ? 3.2 + (index % 3) * 1.1 : 2.0 + (index % 3) * 0.45,
                    rz: 1.6 + (index % 2) * 0.8,
                    height: -0.6 + (index % 4) * 0.6,
                    speed: 0.05 + (index % 3) * 0.02,
                    spin: 0.25 + index * 0.06,
                    scale: 0.55 + (index % 3) * 0.3,
                    centerX: wide ? 0.3 : 0,
                };
                const backCube = new THREE.Mesh(cubeGeometry, brass);
                backCube.scale.setScalar(data.scale);
                scene.add(backCube);
                let frontCube = null;
                if (frontRenderer) {
                    frontCube = new THREE.Mesh(cubeGeometry, brass);
                    frontCube.scale.setScalar(data.scale);
                    frontScene.add(frontCube);
                }
                cubes.push({ data, backCube, frontCube });
            }

            const resize = () => {
                const width = back.clientWidth || 1;
                const height = back.clientHeight || 1;
                renderer.setPixelRatio(dpr);
                renderer.setSize(width, height, false);
                frontRenderer?.setPixelRatio(dpr);
                frontRenderer?.setSize(width, height, false);
                camera.aspect = width / height;
                camera.position.z = width / height < 0.9 ? 11 : 9.4;
                camera.updateProjectionMatrix();
            };
            resize();

            // Compile every shader before the first frame - in parallel where the GPU driver allows,
            // so the page keeps scrolling meanwhile
            await idle();
            if (cancelled) return;
            try {
                await renderer.compileAsync(scene, camera);
                if (frontRenderer) await frontRenderer.compileAsync(frontScene, camera);
            } catch {
                // Older browsers: shaders compile on the first frame instead
            }
            if (cancelled) return;

            const observer = new ResizeObserver(resize);
            observer.observe(back);

            const target = { x: 0, y: 0 };
            const onMove = (event) => {
                if (event.pointerType !== 'mouse') return;
                target.x = (event.clientX / window.innerWidth - 0.5) * 2;
                target.y = (event.clientY / window.innerHeight - 0.5) * 2;
            };
            window.addEventListener('pointermove', onMove, { passive: true });

            const still = prefersReducedMotion();
            const clock = new THREE.Clock();
            const lean = { x: 0, y: 0 };
            let frame = 0;
            let lastFrame = 0;
            let slowFrames = 0;
            let sampled = 0;

            const draw = (now) => {
                // If the device can't keep up, draw fewer pixels rather than drop frames
                if (lastFrame) {
                    const delta = now - lastFrame;
                    if (delta < 250) {
                        sampled += 1;
                        if (delta > SLOW_FRAME_MS) slowFrames += 1;
                        if (sampled >= 90) {
                            if (slowFrames > 30 && dpr > MIN_DPR) {
                                dpr = Math.max(MIN_DPR, dpr - 0.25);
                                resize();
                            }
                            sampled = 0;
                            slowFrames = 0;
                        }
                    }
                }
                lastFrame = now;

                const time = clock.getElapsedTime();
                if (!still) {
                    lean.x += (target.x - lean.x) * 0.03;
                    lean.y += (target.y - lean.y) * 0.03;
                    // Resting, not spinning: a slow sway plus the lean towards the pointer
                    set.rotation.y = Math.sin(time * 0.18) * 0.12 + lean.x * 0.35;
                    set.rotation.x = Math.sin(time * 0.23) * 0.03 + lean.y * 0.12;
                    set.position.y = -0.85 + Math.sin(time * 0.5) * 0.03;

                    for (const { data, backCube, frontCube } of cubes) {
                        const angle = data.angle + time * data.speed;
                        const x = data.centerX + Math.cos(angle) * data.rx;
                        const z = Math.sin(angle) * data.rz;
                        const y = data.height + Math.sin(time * 0.6 + data.angle) * 0.2;
                        const inFront = frontCube && z > FRONT_Z;
                        backCube.position.set(x, y, z);
                        backCube.rotation.set(time * data.spin, time * data.spin * 0.7, 0);
                        backCube.visible = !inFront;
                        if (frontCube) {
                            frontCube.position.copy(backCube.position);
                            frontCube.rotation.copy(backCube.rotation);
                            frontCube.visible = inFront;
                        }
                    }

                    // Steam: slow, with each puff on its own schedule
                    for (const sprite of steam) {
                        const { seed, offset, pace, drift, sway, size } = sprite.userData;
                        const life = (time * pace + offset) % 1;
                        const eased = life * life * (3 - 2 * life);
                        const wobble = Math.sin(time * 0.7 + seed) * sway * eased + Math.sin(time * 1.9 + seed * 2) * 0.03;
                        sprite.position.set(drift * eased + wobble, 1.45 + eased * 2.2, Math.cos(time * 0.6 + seed) * 0.08 * eased);
                        const grow = size + eased * 1.8;
                        sprite.scale.set(grow, grow * 1.25, 1);
                        sprite.material.opacity = Math.sin(life * Math.PI) * 0.11 * (1 - eased * 0.5);
                    }
                }
                renderer.render(scene, camera);
                frontRenderer?.render(frontScene, camera);
            };

            // Draw only while on screen and while the tab is in front
            let onScreen = false;
            const loop = (now) => {
                frame = requestAnimationFrame(loop);
                draw(now);
            };
            const sync = () => {
                const run = onScreen && document.visibilityState === 'visible';
                if (run && !frame) {
                    lastFrame = 0;
                    frame = requestAnimationFrame(loop);
                } else if (!run && frame) {
                    cancelAnimationFrame(frame);
                    frame = 0;
                }
            };
            const watcher = new IntersectionObserver(([entry]) => {
                onScreen = entry.isIntersecting;
                sync();
            }, { rootMargin: '10% 0px' });
            watcher.observe(back);
            document.addEventListener('visibilitychange', sync);

            // First frame, then fade the layers in
            draw(performance.now());
            back.classList.add('is-ready');
            front?.classList.add('is-ready');

            const dispose = cleanup;
            cleanup = () => {
                cancelAnimationFrame(frame);
                observer.disconnect();
                watcher.disconnect();
                document.removeEventListener('visibilitychange', sync);
                window.removeEventListener('pointermove', onMove);
                dispose();
            };
        };

        build().catch(fail);

        return () => {
            cancelled = true;
            cleanup();
        };
    }, [wide]);

    return (
        <>
            <div ref={backRef} className={`kaapi-scene kaapi-scene--back ${className}`} aria-hidden="true" />
            {wide && <div ref={frontRef} className="kaapi-scene kaapi-scene--front" aria-hidden="true" />}
        </>
    );
};

KaapiScene.propTypes = { className: PropTypes.string, wide: PropTypes.bool, onFail: PropTypes.func };

export default KaapiScene;
